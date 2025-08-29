const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');
const { Order, User, Product, sequelize } = require('../models/associations');
const { Op } = require('sequelize');

// Export orders as CSV or PDF
const exportOrders = async (req, res) => {
  try {
    const {
      format = 'csv',
      dateRange = 'all',
      startDate,
      endDate,
      status = 'all',
      includeCustomerInfo = true,
      includeProductInfo = true,
      includeShippingInfo = true,
      includePaymentInfo = true
    } = req.body;

    // Build where clause based on filters
    let whereClause = {};

    // Date range filter
    if (dateRange === 'custom' && startDate && endDate) {
      whereClause.created_at = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // Status filter
    if (status !== 'all') {
      whereClause.status = status;
    }

    // Fetch orders with related data
    const orders = await Order.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'customer',
          attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No orders found matching the criteria'
      });
    }

    // Process orders data for export
    const exportData = [];
    
    for (const order of orders) {
      let orderItems = [];
      try {
        orderItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || [];
      } catch (e) {
        orderItems = [];
      }

      const baseOrderData = {
        order_id: order.id,
        order_number: order.order_number,
        status: order.status,
        total_amount: order.total_amount,
        currency: order.currency || 'XAF',
        created_at: order.created_at.toISOString().split('T')[0],
        updated_at: order.updated_at.toISOString().split('T')[0]
      };

      // Add customer information
      if (includeCustomerInfo && order.customer) {
        baseOrderData.customer_name = `${order.customer.first_name} ${order.customer.last_name}`;
        baseOrderData.customer_email = order.customer.email;
        baseOrderData.customer_phone = order.customer.phone;
      }

      // Add shipping information
      if (includeShippingInfo) {
        let shippingAddress = {};
        try {
          shippingAddress = typeof order.shipping_address === 'string' 
            ? JSON.parse(order.shipping_address) 
            : order.shipping_address || {};
        } catch (e) {
          shippingAddress = {};
        }

        baseOrderData.shipping_name = shippingAddress.full_name || '';
        baseOrderData.shipping_phone = shippingAddress.phone || '';
        baseOrderData.shipping_address = `${shippingAddress.address || ''}, ${shippingAddress.city || ''}, ${shippingAddress.country || ''}`.replace(/^,\s*|,\s*$/g, '');
        baseOrderData.shipping_method = order.shipping_method || '';
        baseOrderData.shipping_cost = order.shipping_cost || 0;
      }

      // Add payment information
      if (includePaymentInfo) {
        baseOrderData.payment_method = order.payment_method || '';
        baseOrderData.payment_status = order.payment_status || '';
        baseOrderData.payment_reference = order.payment_reference || '';
      }

      // Add product information
      if (includeProductInfo && orderItems.length > 0) {
        // Create one row per product in the order
        for (const item of orderItems) {
          const productData = {
            ...baseOrderData,
            product_name: item.name || '',
            product_sku: item.sku || '',
            product_price: item.price || 0,
            product_quantity: item.quantity || 0,
            product_total: (item.price || 0) * (item.quantity || 0)
          };

          if (item.variant) {
            productData.product_variant = JSON.stringify(item.variant);
          }

          exportData.push(productData);
        }
      } else {
        // Single row per order without product details
        exportData.push(baseOrderData);
      }
    }

    // Generate export based on format
    if (format === 'csv') {
      const fields = Object.keys(exportData[0] || {});
      const parser = new Parser({ fields });
      const csv = parser.parse(exportData);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="orders_export.csv"');
      res.send(csv);

    } else if (format === 'pdf') {
      // Create PDF
      const doc = new PDFDocument({ margin: 50 });
      
      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="orders_export.pdf"');
      
      // Pipe PDF to response
      doc.pipe(res);

      // Add title
      doc.fontSize(16).font('Helvetica-Bold').text('Orders Export Report', { align: 'center' });
      doc.moveDown();

      // Add summary info
      const today = new Date().toISOString().split('T')[0];
      doc.fontSize(10).font('Helvetica')
         .text(`Export Date: ${today}`)
         .text(`Total Orders: ${orders.length}`)
         .text(`Date Range: ${dateRange === 'custom' ? `${startDate} to ${endDate}` : 'All Time'}`)
         .text(`Status Filter: ${status === 'all' ? 'All Statuses' : status}`);
      
      doc.moveDown();

      // Add orders table
      let yPosition = doc.y;
      const pageHeight = doc.page.height;
      const margin = 50;

      // Table headers
      const headers = ['Order #', 'Customer', 'Status', 'Amount', 'Date'];
      const columnWidth = (doc.page.width - 2 * margin) / headers.length;

      // Draw headers
      doc.font('Helvetica-Bold').fontSize(9);
      headers.forEach((header, i) => {
        doc.text(header, margin + (i * columnWidth), yPosition, { width: columnWidth, align: 'left' });
      });
      yPosition += 20;

      // Draw orders
      doc.font('Helvetica').fontSize(8);
      for (const order of orders.slice(0, 50)) { // Limit to 50 orders for PDF
        // Check if we need a new page
        if (yPosition > pageHeight - 100) {
          doc.addPage();
          yPosition = margin;
        }

        const customerName = order.customer 
          ? `${order.customer.first_name} ${order.customer.last_name}` 
          : 'N/A';

        const rowData = [
          order.order_number,
          customerName,
          order.status,
          `${order.total_amount} ${order.currency || 'XAF'}`,
          order.created_at.toISOString().split('T')[0]
        ];

        rowData.forEach((data, i) => {
          doc.text(String(data), margin + (i * columnWidth), yPosition, { 
            width: columnWidth, 
            align: 'left',
            ellipsis: true
          });
        });
        yPosition += 15;
      }

      if (orders.length > 50) {
        doc.text(`... and ${orders.length - 50} more orders`, margin, yPosition);
      }

      doc.end();
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid export format. Supported formats: csv, pdf'
      });
    }

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during export',
      error: error.message
    });
  }
};

// Get export statistics
const getExportStats = async (req, res) => {
  try {
    const totalOrders = await Order.count();
    const ordersThisMonth = await Order.count({
      where: {
        created_at: {
          [Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      }
    });

    const statusCounts = await Order.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('status')), 'count']
      ],
      group: ['status']
    });

    res.json({
      success: true,
      data: {
        totalOrders,
        ordersThisMonth,
        statusCounts: statusCounts.reduce((acc, item) => {
          acc[item.status] = parseInt(item.dataValues.count);
          return acc;
        }, {})
      }
    });

  } catch (error) {
    console.error('Error fetching export stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching export statistics'
    });
  }
};

module.exports = {
  exportOrders,
  getExportStats
};