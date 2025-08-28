const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: {
        args: [2, 200],
        msg: 'Le nom du produit doit contenir entre 2 et 200 caractères'
      }
    }
  },
  
  slug: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      is: {
        args: /^[a-z0-9-]+$/,
        msg: 'Le slug ne peut contenir que des lettres minuscules, chiffres et tirets'
      }
    }
  },
  
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  short_description: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  
  sku: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: {
        args: [3, 50],
        msg: 'Le SKU doit contenir entre 3 et 50 caractères'
      }
    }
  },
  
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: {
        args: 0,
        msg: 'Le prix ne peut pas être négatif'
      }
    }
  },
  
  original_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: {
        args: 0,
        msg: 'Le prix original ne peut pas être négatif'
      }
    }
  },
  
  cost_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: {
        args: 0,
        msg: 'Le prix de revient ne peut pas être négatif'
      }
    }
  },
  
  stock_quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: {
        args: 0,
        msg: 'La quantité en stock ne peut pas être négative'
      }
    }
  },
  
  low_stock_threshold: {
    type: DataTypes.INTEGER,
    defaultValue: 5,
    allowNull: false
  },
  
  track_stock: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  
  weight: {
    type: DataTypes.DECIMAL(8, 3),
    allowNull: true,
    comment: 'Poids en kilogrammes'
  },
  
  dimensions: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Dimensions en cm: {length, width, height}'
  },
  
  images: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'Array of image URLs'
  },
  
  featured_image: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  category_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'categories',
      key: 'id'
    }
  },
  
  tags: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'Array of tags for search and filtering'
  },
  
  attributes: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Product attributes like size, color, material, etc.'
  },
  
  variants: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'Product variants with different prices/stock'
  },
  
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  
  is_featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  
  is_digital: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  
  status: {
    type: DataTypes.ENUM('draft', 'published', 'archived'),
    defaultValue: 'draft',
    allowNull: false
  },
  
  published_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  
  meta_title: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  meta_description: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  rating_average: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0,
    allowNull: false,
    validate: {
      min: 0,
      max: 5
    }
  },
  
  rating_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  
  views_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  
  sales_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  }
}, {
  tableName: 'products',
  indexes: [
    {
      unique: true,
      fields: ['slug']
    },
    {
      unique: true,
      fields: ['sku']
    },
    {
      fields: ['category_id']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['is_featured']
    },
    {
      fields: ['status']
    },
    {
      fields: ['price']
    },
    {
      fields: ['stock_quantity']
    },
    {
      fields: ['published_at']
    },
    {
      fields: ['rating_average']
    },
    {
      fields: ['sales_count']
    }
  ]
})

// Instance methods
Product.prototype.generateSlug = function() {
  return this.name
    .toLowerCase()
    .trim()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

Product.prototype.generateSKU = function() {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `BC-${timestamp}-${random}`.toUpperCase()
}

Product.prototype.isInStock = function() {
  if (!this.track_stock) return true
  return this.stock_quantity > 0
}

Product.prototype.isLowStock = function() {
  if (!this.track_stock) return false
  return this.stock_quantity <= this.low_stock_threshold
}

Product.prototype.getDiscountPercentage = function() {
  if (!this.original_price || this.original_price <= this.price) return 0
  return Math.round(((this.original_price - this.price) / this.original_price) * 100)
}

Product.prototype.incrementViews = async function() {
  this.views_count += 1
  await this.save({ fields: ['views_count'] })
}

// Class methods
Product.generateSKU = function() {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `BC-${timestamp}-${random}`.toUpperCase()
}

// Hooks
Product.beforeCreate(async (product) => {
  if (!product.slug && product.name) {
    product.slug = product.generateSlug()
  }
  
  if (!product.sku) {
    product.sku = product.generateSKU()
  }
  
  if (product.status === 'published' && !product.published_at) {
    product.published_at = new Date()
  }
})

Product.beforeUpdate(async (product) => {
  if (product.changed('name') && !product.changed('slug')) {
    product.slug = product.generateSlug()
  }
  
  if (product.changed('status') && product.status === 'published' && !product.published_at) {
    product.published_at = new Date()
  }
})

module.exports = Product
