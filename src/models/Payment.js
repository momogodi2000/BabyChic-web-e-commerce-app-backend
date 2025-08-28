const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')

const Payment = sequelize.define('Payment', {
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
  
  transaction_id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  
  external_transaction_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Transaction ID from payment provider (CamPay, etc.)'
  },
  
  payment_method: {
    type: DataTypes.ENUM('orange-money', 'mtn-momo', 'cash', 'bank-transfer'),
    allowNull: false
  },
  
  provider: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Payment provider (CamPay, direct, etc.)'
  },
  
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: {
        args: 0,
        msg: 'Le montant ne peut pas être négatif'
      }
    }
  },
  
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'XAF',
    allowNull: false
  },
  
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'),
    defaultValue: 'pending',
    allowNull: false
  },
  
  // Customer payment information
  customer_phone: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Phone number used for mobile money payment'
  },
  
  customer_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  // Provider specific data
  provider_data: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Provider specific response data'
  },
  
  // Payment timestamps
  initiated_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  failed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  cancelled_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Error information
  failure_reason: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  error_code: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Additional information
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Webhook/callback information
  webhook_data: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Data received from payment provider webhooks'
  },
  
  // Retry information
  retry_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  
  max_retries: {
    type: DataTypes.INTEGER,
    defaultValue: 3,
    allowNull: false
  }
}, {
  tableName: 'payments',
  indexes: [
    {
      unique: true,
      fields: ['transaction_id']
    },
    {
      fields: ['order_id']
    },
    {
      fields: ['external_transaction_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['payment_method']
    },
    {
      fields: ['customer_phone']
    },
    {
      fields: ['created_at']
    }
  ]
})

// Instance methods
Payment.prototype.canBeRetried = function() {
  return this.status === 'failed' && this.retry_count < this.max_retries
}

Payment.prototype.isCompleted = function() {
  return this.status === 'completed'
}

Payment.prototype.isFailed = function() {
  return this.status === 'failed'
}

Payment.prototype.isPending = function() {
  return ['pending', 'processing'].includes(this.status)
}

// Class methods
Payment.generateTransactionId = function() {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 10)
  return `PAY-${timestamp}-${random}`.toUpperCase()
}

// Hooks
Payment.beforeCreate(async (payment) => {
  if (!payment.transaction_id) {
    payment.transaction_id = Payment.generateTransactionId()
  }
  
  if (!payment.initiated_at) {
    payment.initiated_at = new Date()
  }
})

Payment.beforeUpdate(async (payment) => {
  const now = new Date()
  
  if (payment.changed('status')) {
    switch (payment.status) {
      case 'completed':
        if (!payment.completed_at) {
          payment.completed_at = now
        }
        break
      case 'failed':
        if (!payment.failed_at) {
          payment.failed_at = now
        }
        break
      case 'cancelled':
        if (!payment.cancelled_at) {
          payment.cancelled_at = now
        }
        break
    }
  }
})

module.exports = Payment
