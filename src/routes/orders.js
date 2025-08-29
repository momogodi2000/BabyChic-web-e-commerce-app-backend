const express = require('express')
const { authMiddleware, adminMiddleware } = require('../middleware/auth')
const OrdersController = require('../controllers/ordersController')
const ExportController = require('../controllers/exportController')

const router = express.Router()

// Apply auth middleware to all routes
router.use(authMiddleware)
router.use(adminMiddleware)

// @route   GET /api/orders/stats
// @desc    Get order statistics (admin dashboard)
// @access  Private (Admin)
router.get('/stats', OrdersController.getOrderStats)

// @route   GET /api/orders
// @desc    Get all orders (admin)
// @access  Private (Admin)
router.get('/', OrdersController.getAllOrders)

// @route   GET /api/orders/:id
// @desc    Get order by ID
// @access  Private (Admin)
router.get('/:id', OrdersController.getOrderById)

// @route   PATCH /api/orders/:id/status
// @desc    Update order status
// @access  Private (Admin)
router.patch('/:id/status', OrdersController.updateOrderStatus)

// @route   PATCH /api/orders/:id/payment/validate
// @desc    Validate payment (admin)
// @access  Private (Admin)
router.patch('/:id/payment/validate', OrdersController.validatePayment)

// @route   POST /api/orders/export
// @desc    Export orders as CSV or PDF
// @access  Private (Admin)
router.post('/export', ExportController.exportOrders)

// @route   GET /api/orders/export/stats
// @desc    Get export statistics
// @access  Private (Admin)
router.get('/export/stats', ExportController.getExportStats)

module.exports = router
