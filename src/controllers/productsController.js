const { Op } = require('sequelize')
const { Product, Category, OrderItem } = require('../models/associations')
const { body, validationResult } = require('express-validator')
const multer = require('multer')
const path = require('path')

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/products/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)
    
    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error('Seuls les fichiers images (JPEG, PNG, WebP) sont autorisés'))
    }
  }
})

class ProductsController {
  // Get all products (admin)
  static async getAllProducts(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        category,
        status,
        sortBy = 'created_at',
        order = 'DESC'
      } = req.query

      const offset = (parseInt(page) - 1) * parseInt(limit)
      
      // Build where clause
      const where = {}
      
      if (search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { sku: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } }
        ]
      }
      
      if (category) {
        where.category_id = category
      }
      
      if (status) {
        where.status = status
      }

      const { count, rows: products } = await Product.findAndCountAll({
        where,
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name', 'slug']
          }
        ],
        order: [[sortBy, order.toUpperCase()]],
        limit: parseInt(limit),
        offset
      })

      res.json({
        products,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / parseInt(limit)),
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      })
    } catch (error) {
      console.error('Get products error:', error)
      res.status(500).json({
        error: 'Erreur lors de la récupération des produits'
      })
    }
  }

  // Get product by ID (admin)
  static async getProductById(req, res) {
    try {
      const { id } = req.params
      
      const product = await Product.findByPk(id, {
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name', 'slug']
          }
        ]
      })

      if (!product) {
        return res.status(404).json({
          error: 'Produit non trouvé'
        })
      }

      res.json(product)
    } catch (error) {
      console.error('Get product error:', error)
      res.status(500).json({
        error: 'Erreur lors de la récupération du produit'
      })
    }
  }

  // Create new product (admin)
  static async createProduct(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Données invalides',
          details: errors.array()
        })
      }

      const {
        name,
        slug,
        sku,
        description,
        short_description,
        category_id,
        price,
        original_price,
        stock_quantity,
        track_stock,
        weight,
        dimensions,
        attributes,
        variants,
        is_featured,
        status,
        published_at
      } = req.body

      // Generate slug if not provided
      const productSlug = slug || name.toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')

      // Generate SKU if not provided
      const productSKU = sku || `BC-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`

      const product = await Product.create({
        name,
        slug: productSlug,
        sku: productSKU,
        description,
        short_description,
        category_id,
        price: parseFloat(price),
        original_price: original_price ? parseFloat(original_price) : null,
        stock_quantity: parseInt(stock_quantity) || 0,
        track_stock: track_stock === 'true',
        weight: weight ? parseFloat(weight) : null,
        dimensions: dimensions ? JSON.parse(dimensions) : null,
        attributes: attributes ? JSON.parse(attributes) : {},
        variants: variants ? JSON.parse(variants) : [],
        is_featured: is_featured === 'true',
        status: status || 'draft',
        published_at: status === 'published' ? (published_at || new Date()) : null,
        images: [],
        featured_image: null,
        rating_average: 0,
        rating_count: 0,
        views_count: 0,
        sales_count: 0
      })

      // Load product with category
      const createdProduct = await Product.findByPk(product.id, {
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name', 'slug']
          }
        ]
      })

      res.status(201).json({
        message: 'Produit créé avec succès',
        product: createdProduct
      })
    } catch (error) {
      console.error('Create product error:', error)
      res.status(500).json({
        error: 'Erreur lors de la création du produit'
      })
    }
  }

  // Update product (admin)
  static async updateProduct(req, res) {
    try {
      const { id } = req.params
      const errors = validationResult(req)
      
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Données invalides',
          details: errors.array()
        })
      }

      const product = await Product.findByPk(id)
      
      if (!product) {
        return res.status(404).json({
          error: 'Produit non trouvé'
        })
      }

      const updateData = { ...req.body }
      
      // Parse JSON fields
      if (updateData.dimensions && typeof updateData.dimensions === 'string') {
        updateData.dimensions = JSON.parse(updateData.dimensions)
      }
      if (updateData.attributes && typeof updateData.attributes === 'string') {
        updateData.attributes = JSON.parse(updateData.attributes)
      }
      if (updateData.variants && typeof updateData.variants === 'string') {
        updateData.variants = JSON.parse(updateData.variants)
      }

      // Convert string booleans
      if (updateData.track_stock) {
        updateData.track_stock = updateData.track_stock === 'true'
      }
      if (updateData.is_featured) {
        updateData.is_featured = updateData.is_featured === 'true'
      }

      // Set published_at when status changes to published
      if (updateData.status === 'published' && product.status !== 'published') {
        updateData.published_at = new Date()
      }

      await product.update(updateData)

      // Reload with category
      const updatedProduct = await Product.findByPk(id, {
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name', 'slug']
          }
        ]
      })

      res.json({
        message: 'Produit mis à jour avec succès',
        product: updatedProduct
      })
    } catch (error) {
      console.error('Update product error:', error)
      res.status(500).json({
        error: 'Erreur lors de la mise à jour du produit'
      })
    }
  }

  // Delete product (admin)
  static async deleteProduct(req, res) {
    try {
      const { id } = req.params
      
      const product = await Product.findByPk(id)
      
      if (!product) {
        return res.status(404).json({
          error: 'Produit non trouvé'
        })
      }

      // Check if product has orders
      const orderCount = await OrderItem.count({
        where: { product_id: id }
      })

      if (orderCount > 0) {
        // Don't delete, just deactivate
        await product.update({ is_active: false, status: 'archived' })
        
        res.json({
          message: 'Produit archivé (des commandes existent pour ce produit)'
        })
      } else {
        await product.destroy()
        
        res.json({
          message: 'Produit supprimé avec succès'
        })
      }
    } catch (error) {
      console.error('Delete product error:', error)
      res.status(500).json({
        error: 'Erreur lors de la suppression du produit'
      })
    }
  }

  // Upload product images
  static uploadImages = upload.array('images', 5)

  static async handleImageUpload(req, res) {
    try {
      const { id } = req.params
      
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          error: 'Aucune image fournie'
        })
      }

      const product = await Product.findByPk(id)
      
      if (!product) {
        return res.status(404).json({
          error: 'Produit non trouvé'
        })
      }

      // Generate image URLs
      const newImages = req.files.map(file => `/uploads/products/${file.filename}`)
      
      // Update product images
      const currentImages = product.images || []
      const updatedImages = [...currentImages, ...newImages]
      
      await product.update({
        images: updatedImages,
        featured_image: product.featured_image || newImages[0]
      })

      res.json({
        message: 'Images téléchargées avec succès',
        images: newImages,
        allImages: updatedImages
      })
    } catch (error) {
      console.error('Upload images error:', error)
      res.status(500).json({
        error: 'Erreur lors du téléchargement des images'
      })
    }
  }

  // Product validation rules
  static getValidationRules() {
    return [
      body('name')
        .trim()
        .isLength({ min: 2, max: 255 })
        .withMessage('Le nom du produit doit contenir entre 2 et 255 caractères'),
      body('description')
        .trim()
        .isLength({ min: 10, max: 5000 })
        .withMessage('La description doit contenir entre 10 et 5000 caractères'),
      body('short_description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('La description courte ne peut dépasser 500 caractères'),
      body('category_id')
        .isUUID()
        .withMessage('ID de catégorie invalide'),
      body('price')
        .isFloat({ min: 0 })
        .withMessage('Le prix doit être un nombre positif'),
      body('original_price')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Le prix original doit être un nombre positif'),
      body('stock_quantity')
        .optional()
        .isInt({ min: 0 })
        .withMessage('La quantité en stock doit être un entier positif'),
      body('weight')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Le poids doit être un nombre positif')
    ]
  }
}

module.exports = ProductsController