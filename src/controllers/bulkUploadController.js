const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { Product, Category } = require('../models/associations');
const { validationResult } = require('express-validator');

// Configure multer for CSV file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/csv';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `bulk-upload-${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || path.extname(file.originalname).toLowerCase() === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Process CSV data and create products
const processBulkUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No CSV file uploaded'
      });
    }

    const results = {
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    const filePath = req.file.path;
    const products = [];

    // Read and parse CSV file
    await new Promise((resolve, reject) => {
      const stream = fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
          products.push(data);
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Process each product
    for (let i = 0; i < products.length; i++) {
      const row = i + 2; // Add 2 for header row and 0-based index
      const productData = products[i];

      try {
        // Validate required fields
        const requiredFields = ['name', 'price', 'category'];
        const missingFields = requiredFields.filter(field => !productData[field] || productData[field].trim() === '');
        
        if (missingFields.length > 0) {
          results.errors.push({
            row,
            message: `Missing required fields: ${missingFields.join(', ')}`
          });
          results.failed++;
          continue;
        }

        // Check if product with same SKU already exists
        if (productData.sku) {
          const existingProduct = await Product.findOne({ where: { sku: productData.sku } });
          if (existingProduct) {
            results.errors.push({
              row,
              message: `Product with SKU ${productData.sku} already exists`
            });
            results.skipped++;
            continue;
          }
        }

        // Find or create category
        let category = await Category.findOne({
          where: { name: productData.category.trim() }
        });

        if (!category) {
          category = await Category.create({
            name: productData.category.trim(),
            description: `Auto-created category for ${productData.category.trim()}`,
            is_active: true
          });
        }

        // Find or create subcategory if provided
        let subcategory = null;
        if (productData.subcategory && productData.subcategory.trim()) {
          subcategory = await Category.findOne({
            where: { 
              name: productData.subcategory.trim(),
              parent_id: category.id
            }
          });

          if (!subcategory) {
            subcategory = await Category.create({
              name: productData.subcategory.trim(),
              description: `Auto-created subcategory for ${productData.subcategory.trim()}`,
              parent_id: category.id,
              is_active: true
            });
          }
        }

        // Process colors and sizes
        const colors = productData.colors ? 
          productData.colors.split(';').map(c => c.trim()).filter(c => c) : [];
        const sizes = productData.sizes ? 
          productData.sizes.split(';').map(s => s.trim()).filter(s => s) : [];

        // Process images
        const images = productData.images ? 
          productData.images.split(';').map(img => img.trim()).filter(img => img) : [];

        // Parse numeric values
        const price = parseFloat(productData.price) || 0;
        const stock_quantity = parseInt(productData.stock_quantity) || 0;
        const weight = parseFloat(productData.weight) || null;

        // Create product
        const newProduct = await Product.create({
          name: productData.name.trim(),
          description: productData.description ? productData.description.trim() : '',
          price: price,
          category_id: category.id,
          brand: productData.brand ? productData.brand.trim() : '',
          stock_quantity: stock_quantity,
          sku: productData.sku ? productData.sku.trim() : null,
          weight: weight,
          dimensions: productData.dimensions ? productData.dimensions.trim() : null,
          colors: colors.length > 0 ? JSON.stringify(colors) : null,
          sizes: sizes.length > 0 ? JSON.stringify(sizes) : null,
          images: images.length > 0 ? JSON.stringify(images) : null,
          is_featured: productData.is_featured === 'true' || productData.is_featured === '1',
          is_active: productData.is_active !== 'false' && productData.is_active !== '0'
        });

        results.successful++;

      } catch (error) {
        console.error(`Error processing row ${row}:`, error);
        results.errors.push({
          row,
          message: error.message || 'Unknown error occurred'
        });
        results.failed++;
      }
    }

    // Clean up uploaded file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({
      success: true,
      message: `Bulk upload completed. ${results.successful} products created successfully.`,
      stats: results
    });

  } catch (error) {
    console.error('Bulk upload error:', error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error during bulk upload',
      error: error.message
    });
  }
};

// Get bulk upload history
const getUploadHistory = async (req, res) => {
  try {
    // This would typically come from a BulkUpload model/table
    // For now, return empty array as placeholder
    res.json({
      success: true,
      data: []
    });
  } catch (error) {
    console.error('Error fetching upload history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching upload history'
    });
  }
};

// Export product data as CSV template
const downloadTemplate = async (req, res) => {
  try {
    const csvTemplate = `name,description,price,category,subcategory,brand,stock_quantity,sku,weight,dimensions,colors,sizes,images,is_featured,is_active
"Robe d'été pour bébé","Belle robe d'été en coton bio",15000,"Bébé","Vêtements","BabyChic",25,"RC001",0.2,"30x20x2","Rose;Bleu;Blanc","6M;12M;18M","image1.jpg;image2.jpg",false,true
"T-shirt enfant unisexe","T-shirt confortable pour enfants",8000,"Enfant","Vêtements","BabyChic",50,"TC002",0.15,"35x25x1","Rouge;Vert;Jaune","2A;3A;4A;5A","tshirt1.jpg",true,true`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="product_template.csv"');
    res.send(csvTemplate);

  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating CSV template'
    });
  }
};

module.exports = {
  upload,
  processBulkUpload,
  getUploadHistory,
  downloadTemplate
};