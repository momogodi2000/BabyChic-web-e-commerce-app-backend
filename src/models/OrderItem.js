const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')

const OrderItem = sequelize.define('OrderItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  order_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'orders',
      key: 'id'
    }
  },
  
  product_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'products',
      key: 'id'
    }
  },
  
  // Product information at time of order (for historical purposes)
  product_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  
  product_sku: {
    type: DataTypes.STRING,
    allowNull: false
  },
  
  product_image: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  // Variant information if applicable
  variant_info: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Variant details like size, color, etc.'
  },
  
  // Pricing and quantity
  unit_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: {
        args: 0,
        msg: 'Le prix unitaire ne peut pas être négatif'
      }
    }
  },
  
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: {
        args: 1,
        msg: 'La quantité doit être au moins 1'
      }
    }
  },
  
  total_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: {
        args: 0,
        msg: 'Le prix total ne peut pas être négatif'
      }
    }
  },
  
  // Discount information
  discount_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    allowNull: false
  },
  
  discount_type: {
    type: DataTypes.ENUM('percentage', 'fixed'),
    allowNull: true
  },
  
  discount_value: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  
  // Status tracking
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned'),
    defaultValue: 'pending',
    allowNull: false
  },
  
  // Additional information
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'order_items',
  indexes: [
    {
      fields: ['order_id']
    },
    {
      fields: ['product_id']
    },
    {
      fields: ['status']
    }
  ]
})

// Instance methods
OrderItem.prototype.calculateTotal = function() {
  return (this.unit_price * this.quantity) - this.discount_amount
}

OrderItem.prototype.getVariantDisplay = function() {
  if (!this.variant_info) return ''
  
  const variants = []
  if (this.variant_info.size) variants.push(`Taille: ${this.variant_info.size}`)
  if (this.variant_info.color) variants.push(`Couleur: ${this.variant_info.color}`)
  if (this.variant_info.material) variants.push(`Matière: ${this.variant_info.material}`)
  
  return variants.join(', ')
}

// Hooks
OrderItem.beforeSave(async (orderItem) => {
  // Recalculate total price
  orderItem.total_price = orderItem.calculateTotal()
})

module.exports = OrderItem
