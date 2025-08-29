const { Op } = require('sequelize')
const { Order, OrderItem, Product, Payment } = require('../models/associations')
const emailService = require('../utils/emailService')
const smsService = require('../utils/smsService')
const sequelize = require('../config/database')

class OrdersController {
  // Get all orders (admin)
  static async getAllOrders(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        payment_status,
        search,
        date_from,
        date_to,
        sortBy = 'created_at',
        order = 'DESC'
      } = req.query

      const offset = (parseInt(page) - 1) * parseInt(limit)
      
      // Build where clause
      const where = {}
      
      if (status) {
        where.status = status
      }
      
      if (payment_status) {
        where.payment_status = payment_status
      }
      
      if (search) {
        where[Op.or] = [
          { order_number: { [Op.iLike]: `%${search}%` } },
          { customer_email: { [Op.iLike]: `%${search}%` } },
          { customer_phone: { [Op.iLike]: `%${search}%` } },
          { customer_first_name: { [Op.iLike]: `%${search}%` } },
          { customer_last_name: { [Op.iLike]: `%${search}%` } }
        ]
      }

      if (date_from && date_to) {
        where.created_at = {
          [Op.between]: [new Date(date_from), new Date(date_to)]
        }
      }

      const { count, rows: orders } = await Order.findAndCountAll({
        where,
        include: [
          {
            model: OrderItem,
            as: 'items',
            include: [
              {
                model: Product,
                as: 'product',
                attributes: ['id', 'name', 'featured_image', 'price']
              }
            ]
          },
          {
            model: Payment,
            as: 'payments',
            attributes: ['id', 'transaction_id', 'status', 'amount', 'payment_method']
          }
        ],
        order: [[sortBy, order.toUpperCase()]],
        limit: parseInt(limit),
        offset
      })

      res.json({
        orders,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / parseInt(limit)),
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      })
    } catch (error) {
      console.error('Get orders error:', error)
      res.status(500).json({
        error: 'Erreur lors de la récupération des commandes'
      })
    }
  }

  // Get order by ID (admin)
  static async getOrderById(req, res) {
    try {
      const { id } = req.params
      
      const order = await Order.findByPk(id, {
        include: [
          {
            model: OrderItem,
            as: 'items',
            include: [
              {
                model: Product,
                as: 'product',
                attributes: ['id', 'name', 'featured_image', 'price', 'sku']
              }
            ]
          },
          {
            model: Payment,
            as: 'payments'
          }
        ]
      })

      if (!order) {
        return res.status(404).json({
          error: 'Commande non trouvée'
        })
      }

      res.json(order)
    } catch (error) {
      console.error('Get order error:', error)
      res.status(500).json({
        error: 'Erreur lors de la récupération de la commande'
      })
    }
  }

  // Update order status (admin)
  static async updateOrderStatus(req, res) {
    try {
      const { id } = req.params
      const { status, notes, estimated_delivery } = req.body

      const order = await Order.findByPk(id, {
        include: [
          {
            model: OrderItem,
            as: 'items',
            include: [
              {
                model: Product,
                as: 'product'
              }
            ]
          }
        ]
      })

      if (!order) {
        return res.status(404).json({
          error: 'Commande non trouvée'
        })
      }

      const previousStatus = order.status
      const updateData = { status }

      if (notes) {
        updateData.notes = notes
      }

      if (estimated_delivery) {
        updateData.estimated_delivery = new Date(estimated_delivery)
      }

      // Set completion date when marking as delivered
      if (status === 'delivered' && previousStatus !== 'delivered') {
        updateData.completed_at = new Date()
      }

      await order.update(updateData)

      // Send notifications based on status change
      if (previousStatus !== status) {
        await OrdersController.sendStatusChangeNotifications(order, status, estimated_delivery)
      }

      const updatedOrder = await Order.findByPk(id, {
        include: [
          {
            model: OrderItem,
            as: 'items',
            include: [
              {
                model: Product,
                as: 'product',
                attributes: ['id', 'name', 'featured_image', 'price']
              }
            ]
          },
          {
            model: Payment,
            as: 'payments'
          }
        ]
      })

      res.json({
        message: 'Statut de la commande mis à jour avec succès',
        order: updatedOrder
      })
    } catch (error) {
      console.error('Update order status error:', error)
      res.status(500).json({
        error: 'Erreur lors de la mise à jour du statut'
      })
    }
  }

  // Create order with payment options (public endpoint handled in public routes)
  static async createOrder(orderData, transaction) {
    const {
      items,
      customer,
      delivery,
      payment,
      deliveryOnly = false // Option to pay only delivery fees
    } = orderData

    // Calculate totals
    let subtotal = 0
    const orderItems = []

    for (const item of items) {
      const product = await Product.findByPk(item.id, { transaction })
      
      if (!product || !product.isInStock()) {
        throw new Error(`Produit non disponible: ${product?.name || item.id}`)
      }

      const quantity = parseInt(item.quantity) || 1
      const unitPrice = parseFloat(product.price)
      const totalPrice = unitPrice * quantity

      subtotal += totalPrice

      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        product_sku: product.sku,
        product_image: product.featured_image,
        variant_info: item.selectedSize ? { size: item.selectedSize } : null,
        unit_price: unitPrice,
        quantity: quantity,
        total_price: totalPrice
      })
    }

    // Calculate shipping cost
    const deliveryFee = 2000 // Fixed delivery fee as requested
    const shippingCost = subtotal >= 25000 ? 0 : deliveryFee

    // Calculate payment amounts based on payment option
    let paymentAmount = 0
    let remainingBalance = 0

    if (deliveryOnly) {
      // Customer chooses to pay only delivery fees now
      paymentAmount = deliveryFee
      remainingBalance = subtotal
    } else {
      // Customer pays full amount including delivery
      paymentAmount = subtotal + shippingCost
      remainingBalance = 0
    }

    const totalAmount = subtotal + shippingCost

    // Create order
    const order = await Order.create({
      customer_email: customer.email,
      customer_phone: customer.phone,
      customer_first_name: customer.firstName,
      customer_last_name: customer.lastName,
      billing_address: delivery,
      shipping_address: delivery,
      subtotal: subtotal,
      shipping_cost: shippingCost,
      total_amount: totalAmount,
      payment_method: payment.method,
      remaining_balance: remainingBalance,
      payment_status: deliveryOnly ? 'partial' : 'pending',
      delivery_option: deliveryOnly ? 'pay_on_delivery' : 'full_payment'
    }, { transaction })

    // Create order items
    for (const itemData of orderItems) {
      await OrderItem.create({
        ...itemData,
        order_id: order.id
      }, { transaction })
    }

    // Create payment record
    const paymentRecord = await Payment.create({
      order_id: order.id,
      payment_method: payment.method,
      amount: paymentAmount,
      status: 'pending',
      customer_phone: customer.phone,
      customer_name: `${customer.firstName} ${customer.lastName}`,
      description: `Paiement ${deliveryOnly ? 'frais de livraison' : 'commande complète'} #${order.order_number}`
    }, { transaction })

    return { order, orderItems, paymentRecord }
  }

  // Send status change notifications
  static async sendStatusChangeNotifications(order, newStatus, estimatedDelivery = null) {
    try {
      let message = ''
      
      switch (newStatus) {
        case 'confirmed':
          message = `Votre commande #${order.order_number} a été confirmée et est en préparation.`
          break
        case 'processing':
          message = `Votre commande #${order.order_number} est en cours de préparation.`
          break
        case 'shipped':
          message = `Votre commande #${order.order_number} a été expédiée.`
          if (estimatedDelivery) {
            await smsService.sendDeliveryNotificationSMS(order, estimatedDelivery)
          }
          break
        case 'delivered':
          message = `Votre commande #${order.order_number} a été livrée avec succès. Merci pour votre achat !`
          break
        case 'cancelled':
          message = `Votre commande #${order.order_number} a été annulée.`
          break
      }

      if (message) {
        await smsService.sendSMS(order.customer_phone, `BabyChic: ${message}`)
      }
    } catch (error) {
      console.error('Error sending status notifications:', error)
    }
  }

  // Validate payment (admin)
  static async validatePayment(req, res) {
    try {
      const { id } = req.params
      const { approved = true, notes = '' } = req.body

      const order = await Order.findByPk(id, {
        include: [
          {
            model: Payment,
            as: 'payments'
          }
        ]
      })

      if (!order) {
        return res.status(404).json({
          error: 'Commande non trouvée'
        })
      }

      // Update payment status
      const newPaymentStatus = approved ? 'paid' : 'failed'
      const newOrderStatus = approved ? 'confirmed' : order.status

      await order.update({
        payment_status: newPaymentStatus,
        status: newOrderStatus,
        notes: notes ? (order.notes ? `${order.notes}\n${notes}` : notes) : order.notes
      })

      // Update associated payment records
      if (order.payments && order.payments.length > 0) {
        for (const payment of order.payments) {
          await payment.update({
            status: approved ? 'completed' : 'failed',
            verified_at: new Date(),
            payment_data: {
              ...payment.payment_data,
              admin_validation: {
                approved,
                notes,
                validated_by: req.user.id,
                validated_at: new Date()
              }
            }
          })
        }
      }

      // Send notification if payment was approved
      if (approved) {
        await OrdersController.sendStatusChangeNotifications(order, 'confirmed')
      }

      res.json({
        message: approved ? 'Paiement validé avec succès' : 'Paiement rejeté',
        order: await Order.findByPk(id, {
          include: [
            {
              model: OrderItem,
              as: 'items',
              include: [
                {
                  model: Product,
                  as: 'product',
                  attributes: ['id', 'name', 'featured_image', 'price']
                }
              ]
            },
            {
              model: Payment,
              as: 'payments'
            }
          ]
        })
      })
    } catch (error) {
      console.error('Validate payment error:', error)
      res.status(500).json({
        error: 'Erreur lors de la validation du paiement'
      })
    }
  }

  // Get order statistics (admin dashboard)
  static async getOrderStats(req, res) {
    try {
      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const startOfYear = new Date(today.getFullYear(), 0, 1)

      // Get counts and totals
      const [
        totalOrders,
        pendingOrders,
        processingOrders,
        deliveredOrders,
        todayOrders,
        monthOrders,
        yearOrders,
        totalRevenue,
        monthRevenue,
        todayRevenue
      ] = await Promise.all([
        Order.count(),
        Order.count({ where: { status: 'pending' } }),
        Order.count({ where: { status: { [Op.in]: ['confirmed', 'processing', 'shipped'] } } }),
        Order.count({ where: { status: 'delivered' } }),
        Order.count({ where: { created_at: { [Op.gte]: startOfDay } } }),
        Order.count({ where: { created_at: { [Op.gte]: startOfMonth } } }),
        Order.count({ where: { created_at: { [Op.gte]: startOfYear } } }),
        Order.sum('total_amount', { where: { payment_status: 'completed' } }),
        Order.sum('total_amount', { 
          where: { 
            payment_status: 'completed',
            created_at: { [Op.gte]: startOfMonth }
          }
        }),
        Order.sum('total_amount', { 
          where: { 
            payment_status: 'completed',
            created_at: { [Op.gte]: startOfDay }
          }
        })
      ])

      // Get recent orders
      const recentOrders = await Order.findAll({
        limit: 10,
        order: [['created_at', 'DESC']],
        include: [
          {
            model: OrderItem,
            as: 'items',
            limit: 3
          }
        ]
      })

      res.json({
        stats: {
          orders: {
            total: totalOrders,
            pending: pendingOrders,
            processing: processingOrders,
            delivered: deliveredOrders,
            today: todayOrders,
            this_month: monthOrders,
            this_year: yearOrders
          },
          revenue: {
            total: totalRevenue || 0,
            this_month: monthRevenue || 0,
            today: todayRevenue || 0
          }
        },
        recent_orders: recentOrders
      })
    } catch (error) {
      console.error('Get order stats error:', error)
      res.status(500).json({
        error: 'Erreur lors de la récupération des statistiques'
      })
    }
  }

  // Generate and send receipt
  static async generateReceipt(order, orderItems) {
    try {
      // This would integrate with a PDF library like puppeteer or pdfkit
      // For now, we'll return receipt data that can be used by frontend
      const receiptData = {
        order_number: order.order_number,
        date: order.created_at,
        customer: {
          name: `${order.customer_first_name} ${order.customer_last_name}`,
          email: order.customer_email,
          phone: order.customer_phone
        },
        items: orderItems.map(item => ({
          name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price
        })),
        subtotal: order.subtotal,
        shipping_cost: order.shipping_cost,
        total_amount: order.total_amount,
        payment_method: order.payment_method,
        payment_status: order.payment_status,
        delivery_address: order.shipping_address
      }

      return receiptData
    } catch (error) {
      console.error('Generate receipt error:', error)
      throw error
    }
  }
}

module.exports = OrdersController