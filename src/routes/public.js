const express = require('express')
const { Op } = require('sequelize')
const { body, validationResult } = require('express-validator')
const { Product, Category, Order, OrderItem, Payment, ContactMessage, Newsletter } = require('../models/associations')

const router = express.Router()

// @route   GET /api/public/products
// @desc    Get all products (public access)
// @access  Public
router.get('/products', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      search,
      minPrice,
      maxPrice,
      sortBy = 'newest',
      featured
    } = req.query

    const offset = (parseInt(page) - 1) * parseInt(limit)
    
    // Build where clause
    const where = {
      status: 'published',
      is_active: true
    }

    if (category) {
      // Find category by slug
      const categoryRecord = await Category.findOne({
        where: { slug: category }
      })
      if (categoryRecord) {
        where.category_id = categoryRecord.id
      }
    }

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { short_description: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ]
    }

    if (minPrice || maxPrice) {
      where.price = {}
      if (minPrice) where.price[Op.gte] = parseFloat(minPrice)
      if (maxPrice) where.price[Op.lte] = parseFloat(maxPrice)
    }

    if (featured === 'true') {
      where.is_featured = true
    }

    // Build order clause
    let order = []
    switch (sortBy) {
      case 'price-asc':
        order = [['price', 'ASC']]
        break
      case 'price-desc':
        order = [['price', 'DESC']]
        break
      case 'rating':
        order = [['rating_average', 'DESC']]
        break
      case 'popularity':
        order = [['sales_count', 'DESC']]
        break
      case 'newest':
      default:
        order = [['published_at', 'DESC']]
        break
    }

    // Fetch products
    const { count, rows: products } = await Product.findAndCountAll({
      where,
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'slug']
        }
      ],
      order,
      limit: parseInt(limit),
      offset,
      attributes: [
        'id', 'name', 'slug', 'short_description', 'price', 'original_price',
        'featured_image', 'images', 'rating_average', 'rating_count',
        'stock_quantity', 'track_stock', 'is_featured', 'published_at'
      ]
    })

    // Format products for frontend
    const formattedProducts = products.map(product => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.short_description,
      price: parseFloat(product.price),
      originalPrice: product.original_price ? parseFloat(product.original_price) : null,
      image: product.featured_image || (product.images && product.images[0]) || '/api/placeholder/300/300',
      images: product.images || ['/api/placeholder/300/300'],
      category: product.category ? product.category.name : '',
      categorySlug: product.category ? product.category.slug : '',
      rating: parseFloat(product.rating_average),
      reviewCount: product.rating_count,
      inStock: product.track_stock ? product.stock_quantity > 0 : true,
      isFeatured: product.is_featured,
      publishedAt: product.published_at
    }))

    res.json({
      products: formattedProducts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / parseInt(limit)),
        totalItems: count,
        itemsPerPage: parseInt(limit),
        hasNextPage: parseInt(page) < Math.ceil(count / parseInt(limit)),
        hasPrevPage: parseInt(page) > 1
      }
    })

  } catch (error) {
    console.error('Get products error:', error)
    res.status(500).json({
      error: 'Erreur lors de la récupération des produits'
    })
  }
})

// @route   GET /api/public/products/:id
// @desc    Get single product
// @access  Public
router.get('/products/:id', async (req, res) => {
  try {
    const { id } = req.params

    const product = await Product.findOne({
      where: {
        [Op.or]: [
          { id: id },
          { slug: id }
        ],
        status: 'published',
        is_active: true
      },
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

    // Increment view count
    await product.incrementViews()

    // Format product for frontend
    const formattedProduct = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      shortDescription: product.short_description,
      price: parseFloat(product.price),
      originalPrice: product.original_price ? parseFloat(product.original_price) : null,
      sku: product.sku,
      images: product.images || ['/api/placeholder/600/600'],
      featuredImage: product.featured_image,
      category: product.category ? product.category.name : '',
      categorySlug: product.category ? product.category.slug : '',
      attributes: product.attributes || {},
      variants: product.variants || [],
      rating: parseFloat(product.rating_average),
      reviewCount: product.rating_count,
      inStock: product.track_stock ? product.stock_quantity > 0 : true,
      stockQuantity: product.track_stock ? product.stock_quantity : null,
      weight: product.weight ? parseFloat(product.weight) : null,
      dimensions: product.dimensions,
      isFeatured: product.is_featured,
      viewsCount: product.views_count,
      salesCount: product.sales_count,
      publishedAt: product.published_at
    }

    res.json(formattedProduct)

  } catch (error) {
    console.error('Get product error:', error)
    res.status(500).json({
      error: 'Erreur lors de la récupération du produit'
    })
  }
})

// @route   GET /api/public/categories
// @desc    Get all categories
// @access  Public
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.findAll({
      where: {
        is_active: true
      },
      order: [['sort_order', 'ASC'], ['name', 'ASC']],
      attributes: ['id', 'name', 'slug', 'description', 'image', 'parent_id']
    })

    // Build category tree
    const categoryMap = new Map()
    const rootCategories = []

    // First pass: create all categories
    categories.forEach(category => {
      categoryMap.set(category.id, {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        image: category.image,
        children: []
      })
    })

    // Second pass: build tree structure
    categories.forEach(category => {
      const categoryData = categoryMap.get(category.id)
      
      if (category.parent_id) {
        const parent = categoryMap.get(category.parent_id)
        if (parent) {
          parent.children.push(categoryData)
        }
      } else {
        rootCategories.push(categoryData)
      }
    })

    res.json({
      categories: rootCategories
    })

  } catch (error) {
    console.error('Get categories error:', error)
    res.status(500).json({
      error: 'Erreur lors de la récupération des catégories'
    })
  }
})

// @route   POST /api/public/orders
// @desc    Create new order
// @access  Public
router.post('/orders', async (req, res) => {
  try {
    const {
      items,
      customer,
      delivery,
      payment
    } = req.body

    // Validate required fields
    if (!items || !items.length) {
      return res.status(400).json({
        error: 'Articles requis'
      })
    }

    if (!customer || !customer.firstName || !customer.lastName || !customer.email || !customer.phone) {
      return res.status(400).json({
        error: 'Informations client incomplètes'
      })
    }

    if (!delivery || !delivery.address || !delivery.city) {
      return res.status(400).json({
        error: 'Informations de livraison incomplètes'
      })
    }

    // Calculate totals
    let subtotal = 0
    const orderItems = []

    for (const item of items) {
      const product = await Product.findByPk(item.id)
      
      if (!product) {
        return res.status(400).json({
          error: `Produit non trouvé: ${item.id}`
        })
      }

      if (!product.isInStock() && product.track_stock) {
        return res.status(400).json({
          error: `Produit en rupture de stock: ${product.name}`
        })
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

    // Calculate shipping cost (free shipping for orders >= 25000 FCFA)
    const shippingCost = subtotal >= 25000 ? 0 : 2500
    const totalAmount = subtotal + shippingCost

    // Create order
    const order = await Order.create({
      customer_email: customer.email,
      customer_phone: customer.phone,
      customer_first_name: customer.firstName,
      customer_last_name: customer.lastName,
      billing_address: {
        address: delivery.address,
        city: delivery.city,
        quarter: delivery.quarter,
        landmark: delivery.landmark
      },
      shipping_address: {
        address: delivery.address,
        city: delivery.city,
        quarter: delivery.quarter,
        landmark: delivery.landmark
      },
      subtotal: subtotal,
      shipping_cost: shippingCost,
      total_amount: totalAmount,
      payment_method: payment.method
    })

    // Create order items
    for (const itemData of orderItems) {
      await OrderItem.create({
        ...itemData,
        order_id: order.id
      })
    }

    // Create payment record
    const paymentRecord = await Payment.create({
      order_id: order.id,
      payment_method: payment.method,
      amount: totalAmount,
      status: 'pending',
      customer_phone: customer.phone,
      customer_name: `${customer.firstName} ${customer.lastName}`,
      description: `Payment for order ${order.order_number}`
    })

    res.status(201).json({
      message: 'Commande créée avec succès',
      order: {
        id: order.id,
        orderNumber: order.order_number,
        status: order.status,
        total: parseFloat(order.total_amount),
        paymentStatus: order.payment_status,
        paymentMethod: order.payment_method,
        createdAt: order.created_at
      },
      payment: {
        transactionId: paymentRecord.transaction_id,
        status: paymentRecord.status,
        method: paymentRecord.payment_method
      }
    })

  } catch (error) {
    console.error('Create order error:', error)
    res.status(500).json({
      error: 'Erreur lors de la création de la commande'
    })
  }
})

// @route   POST /api/public/contact
// @desc    Submit contact form
// @access  Public
router.post('/contact', [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Le nom doit contenir entre 2 et 100 caractères'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Adresse email valide requise'),
  body('phone')
    .optional()
    .matches(/^(\+237|237)?[6-9][0-9]{8}$/)
    .withMessage('Numéro de téléphone camerounais invalide'),
  body('subject')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Le sujet doit contenir entre 5 et 200 caractères'),
  body('message')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Le message doit contenir entre 10 et 2000 caractères')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      })
    }

    const { name, email, phone, subject, message } = req.body

    // Get client IP and user agent
    const ipAddress = req.ip || req.connection.remoteAddress
    const userAgent = req.get('User-Agent')

    // Create contact message
    const contactMessage = await ContactMessage.create({
      name: name.trim(),
      email: email.toLowerCase(),
      phone: phone || null,
      subject: subject.trim(),
      message: message.trim(),
      ip_address: ipAddress,
      user_agent: userAgent
    })

    res.status(201).json({
      message: 'Votre message a été envoyé avec succès. Nous vous répondrons dans les plus brefs délais.',
      id: contactMessage.id
    })

  } catch (error) {
    console.error('Contact form error:', error)
    res.status(500).json({
      error: 'Erreur lors de l\'envoi du message'
    })
  }
})

// @route   POST /api/public/newsletter/subscribe
// @desc    Subscribe to newsletter
// @access  Public
router.post('/newsletter/subscribe', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Adresse email valide requise')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Adresse email invalide'
      })
    }

    const { email } = req.body

    // Check if already subscribed
    const existingSubscription = await Newsletter.findOne({
      where: { email: email.toLowerCase() }
    })

    if (existingSubscription) {
      if (existingSubscription.status === 'active') {
        return res.status(409).json({
          error: 'Cette adresse email est déjà abonnée à notre newsletter'
        })
      } else if (existingSubscription.status === 'unsubscribed') {
        // Resubscribe
        await existingSubscription.resubscribe()
        return res.json({
          message: 'Votre abonnement a été réactivé avec succès'
        })
      }
    }

    // Get client IP and user agent
    const ipAddress = req.ip || req.connection.remoteAddress
    const userAgent = req.get('User-Agent')

    // Create new subscription
    const subscription = await Newsletter.create({
      email: email.toLowerCase(),
      source: 'website',
      ip_address: ipAddress,
      user_agent: userAgent,
      confirmed_at: new Date() // Auto-confirm for simplicity in MVP
    })

    res.status(201).json({
      message: 'Merci de vous être abonné à notre newsletter ! Vous recevrez bientôt nos dernières actualités.',
      id: subscription.id
    })

  } catch (error) {
    console.error('Newsletter subscription error:', error)
    res.status(500).json({
      error: 'Erreur lors de l\'abonnement à la newsletter'
    })
  }
})

// @route   POST /api/public/newsletter/unsubscribe
// @desc    Unsubscribe from newsletter
// @access  Public
router.post('/newsletter/unsubscribe', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Adresse email valide requise'),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('La raison ne peut dépasser 500 caractères')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides'
      })
    }

    const { email, reason } = req.body

    // Find subscription
    const subscription = await Newsletter.findOne({
      where: { email: email.toLowerCase() }
    })

    if (!subscription || subscription.status !== 'active') {
      return res.status(404).json({
        error: 'Aucun abonnement actif trouvé pour cette adresse email'
      })
    }

    // Unsubscribe
    await subscription.unsubscribe(reason)

    res.json({
      message: 'Vous avez été désabonné avec succès de notre newsletter'
    })

  } catch (error) {
    console.error('Newsletter unsubscribe error:', error)
    res.status(500).json({
      error: 'Erreur lors du désabonnement'
    })
  }
})

module.exports = router
