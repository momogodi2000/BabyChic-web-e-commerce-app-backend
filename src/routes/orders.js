const express = require('express')
const { authMiddleware, adminMiddleware } = require('../middleware/auth')

const router = express.Router()

// Apply auth middleware to all routes
router.use(authMiddleware)
router.use(adminMiddleware)

// @route   GET /api/orders
// @desc    Get all orders (admin)
// @access  Private (Admin)
router.get('/', async (req, res) => {
  res.json({ message: 'Admin orders endpoint - To be implemented' })
})

// @route   GET /api/orders/:id
// @desc    Get order by ID
// @access  Private (Admin)
router.get('/:id', async (req, res) => {
  res.json({ message: 'Get order by ID endpoint - To be implemented' })
})

// @route   PATCH /api/orders/:id/status
// @desc    Update order status
// @access  Private (Admin)
router.patch('/:id/status', async (req, res) => {
  res.json({ message: 'Update order status endpoint - To be implemented' })
})

module.exports = router
