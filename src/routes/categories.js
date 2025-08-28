const express = require('express')
const { authMiddleware, adminMiddleware } = require('../middleware/auth')

const router = express.Router()

// Apply auth middleware to all routes
router.use(authMiddleware)
router.use(adminMiddleware)

// @route   GET /api/categories
// @desc    Get all categories (admin)
// @access  Private (Admin)
router.get('/', async (req, res) => {
  res.json({ message: 'Admin categories endpoint - To be implemented' })
})

// @route   POST /api/categories
// @desc    Create new category
// @access  Private (Admin)
router.post('/', async (req, res) => {
  res.json({ message: 'Create category endpoint - To be implemented' })
})

module.exports = router
