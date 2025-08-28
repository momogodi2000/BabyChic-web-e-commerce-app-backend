const express = require('express')
const { authMiddleware, adminMiddleware } = require('../middleware/auth')
const ProductsController = require('../controllers/productsController')

const router = express.Router()

// Apply auth middleware to all routes
router.use(authMiddleware)
router.use(adminMiddleware)

// @route   GET /api/products
// @desc    Get all products (admin)
// @access  Private (Admin)
router.get('/', ProductsController.getAllProducts)

// @route   POST /api/products
// @desc    Create new product
// @access  Private (Admin)
router.post('/', ProductsController.getValidationRules(), ProductsController.createProduct)

// @route   GET /api/products/:id
// @desc    Get product by ID
// @access  Private (Admin)
router.get('/:id', ProductsController.getProductById)

// @route   PUT /api/products/:id
// @desc    Update product
// @access  Private (Admin)
router.put('/:id', ProductsController.getValidationRules(), ProductsController.updateProduct)

// @route   DELETE /api/products/:id
// @desc    Delete product
// @access  Private (Admin)
router.delete('/:id', ProductsController.deleteProduct)

// @route   POST /api/products/:id/images
// @desc    Upload product images
// @access  Private (Admin)
router.post('/:id/images', ProductsController.uploadImages, ProductsController.handleImageUpload)

module.exports = router
