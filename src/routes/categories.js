const express = require('express')
const { authMiddleware, adminMiddleware } = require('../middleware/auth')
const CategoriesController = require('../controllers/categoriesController')

const router = express.Router()

// Apply auth middleware to all routes
router.use(authMiddleware)
router.use(adminMiddleware)

// @route   GET /api/categories
// @desc    Get all categories (admin)
// @access  Private (Admin)
router.get('/', CategoriesController.getAllCategories)

// @route   GET /api/categories/tree
// @desc    Get category tree (admin)
// @access  Private (Admin)
router.get('/tree', CategoriesController.getCategoryTree)

// @route   POST /api/categories
// @desc    Create new category
// @access  Private (Admin)
router.post('/', CategoriesController.getValidationRules(), CategoriesController.createCategory)

// @route   GET /api/categories/:id
// @desc    Get category by ID
// @access  Private (Admin)
router.get('/:id', CategoriesController.getCategoryById)

// @route   PUT /api/categories/:id
// @desc    Update category
// @access  Private (Admin)
router.put('/:id', CategoriesController.getValidationRules(), CategoriesController.updateCategory)

// @route   DELETE /api/categories/:id
// @desc    Delete category
// @access  Private (Admin)
router.delete('/:id', CategoriesController.deleteCategory)

module.exports = router
