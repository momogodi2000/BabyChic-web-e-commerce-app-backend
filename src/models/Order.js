const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  order_number: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  
  status: {
    type: DataTypes.ENUM(
      'pending',
      'confirmed', 
      'processing',
      'shipped',
      'delivered',
      'cancelled',
      'refunded'
    ),
    defaultValue: 'pending',
    allowNull: false
  },
  
  // Customer Information
  customer_email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  
  customer_phone: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      is: {
        args: /^(\+237|237)?[6-9][0-9]{8}$/,
        msg: 'Numéro de téléphone camerounais invalide'
      }
    }
  },
  
  customer_first_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  
  customer_last_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  
  // Billing Address
  billing_address: {
    type: DataTypes.JSONB,
    allowNull: false,
    comment: 'Complete billing address object'
  },
  
  // Shipping Address
  shipping_address: {
    type: DataTypes.JSONB,
    allowNull: false,
    comment: 'Complete shipping address object'
  },
  
  // Order Totals
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  
  shipping_cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  
  tax_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  
  discount_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'XAF',
    allowNull: false
  },
  
  // Payment Information
  payment_status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'partial', 'failed', 'cancelled', 'refunded'),
    defaultValue: 'pending',
    allowNull: false
  },
  
  payment_method: {
    type: DataTypes.ENUM('orange-money', 'mtn-momo', 'cash', 'bank-transfer'),
    allowNull: true
  },
  
  payment_reference: {
    type: DataTypes.STRING,
    allowNull: true
  },

  // Delivery payment options
  delivery_option: {
    type: DataTypes.ENUM('full_payment', 'pay_on_delivery'),
    defaultValue: 'full_payment',
    allowNull: false,
    comment: 'Payment option: full payment or pay only delivery fee now'
  },

  remaining_balance: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Amount remaining to be paid on delivery'
  },
  
  // Shipping Information
  shipping_method: {
    type: DataTypes.STRING,
    defaultValue: 'standard',
    allowNull: false
  },
  
  tracking_number: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  // Timestamps
  confirmed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  shipped_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  delivered_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  cancelled_at: {
    type: DataTypes.DATE,
    allowNull: true
  },

  completed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When order was completed/delivered'
  },

  estimated_delivery: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Estimated delivery date'
  },
  
  // Additional Information
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  admin_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  cancellation_reason: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'orders',
  indexes: [
    {
      unique: true,
      fields: ['order_number']
    },
    {
      fields: ['status']
    },
    {
      fields: ['payment_status']
    },
    {
      fields: ['customer_email']
    },
    {
      fields: ['customer_phone']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['total_amount']
    }
  ]
})

// Instance methods
Order.prototype.getCustomerFullName = function() {
  return `${this.customer_first_name} ${this.customer_last_name}`
}

Order.prototype.canBeCancelled = function() {
  return ['pending', 'confirmed'].includes(this.status)
}

Order.prototype.canBeShipped = function() {
  return this.status === 'processing' && this.payment_status === 'completed'
}

Order.prototype.generateTrackingNumber = function() {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `BC-${timestamp}-${random}`.toUpperCase()
}

// Class methods
Order.generateOrderNumber = function() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const timestamp = now.getTime().toString().slice(-6)
  
  return `BC${year}${month}${day}${timestamp}`
}

// Hooks
Order.beforeCreate(async (order) => {
  if (!order.order_number) {
    order.order_number = Order.generateOrderNumber()
  }
})

Order.beforeUpdate(async (order) => {
  const now = new Date()
  
  if (order.changed('status')) {
    switch (order.status) {
      case 'confirmed':
        if (!order.confirmed_at) {
          order.confirmed_at = now
        }
        break
      case 'shipped':
        if (!order.shipped_at) {
          order.shipped_at = now
        }
        if (!order.tracking_number) {
          order.tracking_number = order.generateTrackingNumber()
        }
        break
      case 'delivered':
        if (!order.delivered_at) {
          order.delivered_at = now
        }
        break
      case 'cancelled':
        if (!order.cancelled_at) {
          order.cancelled_at = now
        }
        break
    }
  }
})

module.exports = Order
