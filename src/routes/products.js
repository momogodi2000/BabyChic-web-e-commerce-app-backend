const express = require('express')
const { authMiddleware, adminMiddleware } = require('../middleware/auth')
const ProductsController = require('../controllers/productsController')
const BulkUploadController = require('../controllers/bulkUploadController')

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

// @route   POST /api/products/bulk-upload
// @desc    Bulk upload products from CSV
// @access  Private (Admin)
router.post('/bulk-upload', BulkUploadController.upload.single('csvFile'), BulkUploadController.processBulkUpload)

// @route   GET /api/products/bulk-upload/template
// @desc    Download CSV template for bulk upload
// @access  Private (Admin)
router.get('/bulk-upload/template', BulkUploadController.downloadTemplate)

// @route   GET /api/products/bulk-upload/history
// @desc    Get bulk upload history
// @access  Private (Admin)
router.get('/bulk-upload/history', BulkUploadController.getUploadHistory)

module.exports = router
