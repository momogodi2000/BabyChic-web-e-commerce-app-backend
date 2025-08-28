const { Category, Product } = require('../models/associations')
const { body, validationResult } = require('express-validator')
const { Op } = require('sequelize')

class CategoriesController {
  // Get all categories (admin)
  static async getAllCategories(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        parent_id,
        is_active,
        sortBy = 'sort_order',
        order = 'ASC'
      } = req.query

      const offset = (parseInt(page) - 1) * parseInt(limit)
      
      // Build where clause
      const where = {}
      
      if (search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } }
        ]
      }
      
      if (parent_id !== undefined) {
        where.parent_id = parent_id === 'null' || parent_id === '' ? null : parent_id
      }
      
      if (is_active !== undefined) {
        where.is_active = is_active === 'true'
      }

      const { count, rows: categories } = await Category.findAndCountAll({
        where,
        include: [
          {
            model: Category,
            as: 'parent',
            attributes: ['id', 'name', 'slug']
          },
          {
            model: Category,
            as: 'children',
            attributes: ['id', 'name', 'slug', 'sort_order']
          }
        ],
        order: [[sortBy, order.toUpperCase()]],
        limit: parseInt(limit),
        offset
      })

      res.json({
        categories,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / parseInt(limit)),
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      })
    } catch (error) {
      console.error('Get categories error:', error)
      res.status(500).json({
        error: 'Erreur lors de la récupération des catégories'
      })
    }
  }

  // Get category by ID (admin)
  static async getCategoryById(req, res) {
    try {
      const { id } = req.params
      
      const category = await Category.findByPk(id, {
        include: [
          {
            model: Category,
            as: 'parent',
            attributes: ['id', 'name', 'slug']
          },
          {
            model: Category,
            as: 'children',
            attributes: ['id', 'name', 'slug', 'sort_order']
          }
        ]
      })

      if (!category) {
        return res.status(404).json({
          error: 'Catégorie non trouvée'
        })
      }

      // Count products in this category
      const productCount = await Product.count({
        where: { 
          category_id: id,
          is_active: true 
        }
      })

      res.json({
        ...category.toJSON(),
        product_count: productCount
      })
    } catch (error) {
      console.error('Get category error:', error)
      res.status(500).json({
        error: 'Erreur lors de la récupération de la catégorie'
      })
    }
  }

  // Create new category (admin)
  static async createCategory(req, res) {
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
        description,
        parent_id,
        image,
        sort_order,
        is_active = true
      } = req.body

      // Generate slug if not provided
      const categorySlug = slug || name.toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')

      // Check if slug already exists
      const existingCategory = await Category.findOne({
        where: { slug: categorySlug }
      })

      if (existingCategory) {
        return res.status(409).json({
          error: 'Une catégorie avec ce slug existe déjà'
        })
      }

      // Validate parent category exists if provided
      if (parent_id) {
        const parentCategory = await Category.findByPk(parent_id)
        if (!parentCategory) {
          return res.status(400).json({
            error: 'Catégorie parent non trouvée'
          })
        }
      }

      const category = await Category.create({
        name,
        slug: categorySlug,
        description,
        parent_id: parent_id || null,
        image,
        sort_order: parseInt(sort_order) || 0,
        is_active
      })

      // Load category with relationships
      const createdCategory = await Category.findByPk(category.id, {
        include: [
          {
            model: Category,
            as: 'parent',
            attributes: ['id', 'name', 'slug']
          }
        ]
      })

      res.status(201).json({
        message: 'Catégorie créée avec succès',
        category: createdCategory
      })
    } catch (error) {
      console.error('Create category error:', error)
      res.status(500).json({
        error: 'Erreur lors de la création de la catégorie'
      })
    }
  }

  // Update category (admin)
  static async updateCategory(req, res) {
    try {
      const { id } = req.params
      const errors = validationResult(req)
      
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Données invalides',
          details: errors.array()
        })
      }

      const category = await Category.findByPk(id)
      
      if (!category) {
        return res.status(404).json({
          error: 'Catégorie non trouvée'
        })
      }

      const updateData = { ...req.body }

      // Check slug uniqueness if changing
      if (updateData.slug && updateData.slug !== category.slug) {
        const existingCategory = await Category.findOne({
          where: { 
            slug: updateData.slug,
            id: { [Op.ne]: id }
          }
        })

        if (existingCategory) {
          return res.status(409).json({
            error: 'Une catégorie avec ce slug existe déjà'
          })
        }
      }

      // Validate parent category
      if (updateData.parent_id) {
        // Can't be parent of itself
        if (updateData.parent_id === id) {
          return res.status(400).json({
            error: 'Une catégorie ne peut pas être parent d\'elle-même'
          })
        }

        const parentCategory = await Category.findByPk(updateData.parent_id)
        if (!parentCategory) {
          return res.status(400).json({
            error: 'Catégorie parent non trouvée'
          })
        }
      }

      await category.update(updateData)

      // Reload with relationships
      const updatedCategory = await Category.findByPk(id, {
        include: [
          {
            model: Category,
            as: 'parent',
            attributes: ['id', 'name', 'slug']
          },
          {
            model: Category,
            as: 'children',
            attributes: ['id', 'name', 'slug', 'sort_order']
          }
        ]
      })

      res.json({
        message: 'Catégorie mise à jour avec succès',
        category: updatedCategory
      })
    } catch (error) {
      console.error('Update category error:', error)
      res.status(500).json({
        error: 'Erreur lors de la mise à jour de la catégorie'
      })
    }
  }

  // Delete category (admin)
  static async deleteCategory(req, res) {
    try {
      const { id } = req.params
      
      const category = await Category.findByPk(id)
      
      if (!category) {
        return res.status(404).json({
          error: 'Catégorie non trouvée'
        })
      }

      // Check if category has products
      const productCount = await Product.count({
        where: { category_id: id }
      })

      if (productCount > 0) {
        return res.status(400).json({
          error: 'Impossible de supprimer une catégorie contenant des produits'
        })
      }

      // Check if category has subcategories
      const subcategoryCount = await Category.count({
        where: { parent_id: id }
      })

      if (subcategoryCount > 0) {
        return res.status(400).json({
          error: 'Impossible de supprimer une catégorie ayant des sous-catégories'
        })
      }

      await category.destroy()
      
      res.json({
        message: 'Catégorie supprimée avec succès'
      })
    } catch (error) {
      console.error('Delete category error:', error)
      res.status(500).json({
        error: 'Erreur lors de la suppression de la catégorie'
      })
    }
  }

  // Get category tree (admin)
  static async getCategoryTree(req, res) {
    try {
      const categories = await Category.findAll({
        where: { is_active: true },
        order: [['sort_order', 'ASC'], ['name', 'ASC']],
        include: [
          {
            model: Category,
            as: 'children',
            where: { is_active: true },
            required: false,
            order: [['sort_order', 'ASC'], ['name', 'ASC']]
          }
        ]
      })

      // Build tree structure
      const tree = categories.filter(cat => !cat.parent_id)

      res.json({
        categories: tree
      })
    } catch (error) {
      console.error('Get category tree error:', error)
      res.status(500).json({
        error: 'Erreur lors de la récupération de l\'arbre des catégories'
      })
    }
  }

  // Category validation rules
  static getValidationRules() {
    return [
      body('name')
        .trim()
        .isLength({ min: 2, max: 255 })
        .withMessage('Le nom de la catégorie doit contenir entre 2 et 255 caractères'),
      body('slug')
        .optional()
        .trim()
        .matches(/^[a-z0-9-]+$/)
        .withMessage('Le slug ne peut contenir que des lettres minuscules, chiffres et tirets'),
      body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('La description ne peut dépasser 1000 caractères'),
      body('parent_id')
        .optional()
        .isUUID()
        .withMessage('ID de catégorie parent invalide'),
      body('sort_order')
        .optional()
        .isInt({ min: 0 })
        .withMessage('L\'ordre de tri doit être un entier positif')
    ]
  }
}

module.exports = CategoriesController