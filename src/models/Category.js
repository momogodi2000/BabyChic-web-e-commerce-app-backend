const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')

const Category = sequelize.define('Category', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: {
        args: [2, 100],
        msg: 'Le nom de la catégorie doit contenir entre 2 et 100 caractères'
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
  
  image: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  parent_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'categories',
      key: 'id'
    }
  },
  
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  
  meta_title: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  meta_description: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'categories',
  indexes: [
    {
      unique: true,
      fields: ['name']
    },
    {
      unique: true,
      fields: ['slug']
    },
    {
      fields: ['parent_id']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['sort_order']
    }
  ]
})

// Instance methods
Category.prototype.generateSlug = function() {
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

// Hooks
Category.beforeCreate(async (category) => {
  if (!category.slug && category.name) {
    category.slug = category.generateSlug()
  }
})

Category.beforeUpdate(async (category) => {
  if (category.changed('name') && !category.changed('slug')) {
    category.slug = category.generateSlug()
  }
})

module.exports = Category
