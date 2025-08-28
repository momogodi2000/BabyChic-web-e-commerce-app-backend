const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')

const Newsletter = sequelize.define('Newsletter', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: {
        msg: 'Adresse email invalide'
      }
    }
  },
  
  status: {
    type: DataTypes.ENUM('active', 'unsubscribed', 'bounced', 'spam'),
    defaultValue: 'active',
    allowNull: false
  },
  
  source: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Source of subscription (website, admin, import, etc.)'
  },
  
  preferences: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {
      product_updates: true,
      promotions: true,
      news: true,
      frequency: 'weekly'
    },
    comment: 'Subscription preferences'
  },
  
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Additional metadata (name, interests, demographics, etc.)'
  },
  
  confirmation_token: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Token for email confirmation'
  },
  
  confirmed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  unsubscribed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  unsubscribe_reason: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  bounce_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  
  last_email_sent: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  ip_address: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'newsletter_subscriptions',
  indexes: [
    {
      unique: true,
      fields: ['email']
    },
    {
      fields: ['status']
    },
    {
      fields: ['confirmed_at']
    },
    {
      fields: ['created_at']
    }
  ]
})

// Instance methods
Newsletter.prototype.confirm = async function() {
  this.confirmed_at = new Date()
  this.confirmation_token = null
  return await this.save()
}

Newsletter.prototype.unsubscribe = async function(reason = null) {
  this.status = 'unsubscribed'
  this.unsubscribed_at = new Date()
  this.unsubscribe_reason = reason
  return await this.save()
}

Newsletter.prototype.resubscribe = async function() {
  this.status = 'active'
  this.unsubscribed_at = null
  this.unsubscribe_reason = null
  return await this.save()
}

Newsletter.prototype.incrementBounce = async function() {
  this.bounce_count += 1
  if (this.bounce_count >= 3) {
    this.status = 'bounced'
  }
  return await this.save()
}

Newsletter.prototype.updateLastEmailSent = async function() {
  this.last_email_sent = new Date()
  return await this.save()
}

Newsletter.prototype.updatePreferences = async function(preferences) {
  this.preferences = { ...this.preferences, ...preferences }
  return await this.save()
}

// Class methods
Newsletter.getActiveSubscribers = async function(limit = null, offset = 0) {
  const options = {
    where: { 
      status: 'active',
      confirmed_at: { [sequelize.Sequelize.Op.not]: null }
    },
    order: [['created_at', 'DESC']],
    offset
  }
  
  if (limit) {
    options.limit = limit
  }
  
  return await this.findAndCountAll(options)
}

Newsletter.getSubscribersByPreference = async function(preferenceKey, preferenceValue = true) {
  return await this.findAll({
    where: {
      status: 'active',
      confirmed_at: { [sequelize.Sequelize.Op.not]: null },
      [`preferences.${preferenceKey}`]: preferenceValue
    }
  })
}

Newsletter.getSubscriptionStats = async function() {
  const [active, unsubscribed, bounced, total] = await Promise.all([
    this.count({ where: { status: 'active' } }),
    this.count({ where: { status: 'unsubscribed' } }),
    this.count({ where: { status: 'bounced' } }),
    this.count()
  ])
  
  return {
    active,
    unsubscribed,
    bounced,
    total,
    growth_rate: 0 // To be calculated based on time period
  }
}

Newsletter.generateConfirmationToken = function() {
  return require('crypto').randomBytes(32).toString('hex')
}

// Hooks
Newsletter.beforeCreate(async (newsletter) => {
  if (!newsletter.confirmation_token) {
    newsletter.confirmation_token = Newsletter.generateConfirmationToken()
  }
  newsletter.source = newsletter.source || 'website'
})

module.exports = Newsletter
