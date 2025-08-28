const express = require('express')
const { authMiddleware, adminMiddleware } = require('../middleware/auth')
const OrdersController = require('../controllers/ordersController')

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

module.exports = router
