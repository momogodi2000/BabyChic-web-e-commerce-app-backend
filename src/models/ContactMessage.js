const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')

const ContactMessage = sequelize.define('ContactMessage', {
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
        args: [2, 100],
        msg: 'Le nom doit contenir entre 2 et 100 caractères'
      }
    }
  },
  
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: {
        msg: 'Adresse email invalide'
      }
    }
  },
  
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      is: {
        args: /^(\+237|237)?[6-9][0-9]{8}$/,
        msg: 'Numéro de téléphone camerounais invalide'
      }
    }
  },
  
  subject: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: {
        args: [5, 200],
        msg: 'Le sujet doit contenir entre 5 et 200 caractères'
      }
    }
  },
  
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: {
        args: [10, 2000],
        msg: 'Le message doit contenir entre 10 et 2000 caractères'
      }
    }
  },
  
  status: {
    type: DataTypes.ENUM('unread', 'read', 'replied', 'archived'),
    defaultValue: 'unread',
    allowNull: false
  },
  
  priority: {
    type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
    defaultValue: 'normal',
    allowNull: false
  },
  
  reply_message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  replied_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  
  replied_at: {
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
  },
  
  tags: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'Tags for categorizing messages'
  },
  
  attachments: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'File attachments if any'
  },
  
  admin_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Internal notes for admin use'
  }
}, {
  tableName: 'contact_messages',
  indexes: [
    {
      fields: ['email']
    },
    {
      fields: ['status']
    },
    {
      fields: ['priority']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['replied_by']
    }
  ]
})

// Instance methods
ContactMessage.prototype.markAsRead = async function() {
  this.status = 'read'
  return await this.save()
}

ContactMessage.prototype.markAsReplied = async function(replyMessage, adminUserId) {
  this.status = 'replied'
  this.reply_message = replyMessage
  this.replied_by = adminUserId
  this.replied_at = new Date()
  return await this.save()
}

ContactMessage.prototype.archive = async function() {
  this.status = 'archived'
  return await this.save()
}

ContactMessage.prototype.addTag = async function(tag) {
  if (!this.tags.includes(tag)) {
    this.tags.push(tag)
    return await this.save()
  }
  return this
}

ContactMessage.prototype.removeTag = async function(tag) {
  this.tags = this.tags.filter(t => t !== tag)
  return await this.save()
}

// Class methods
ContactMessage.getUnreadCount = async function() {
  return await this.count({
    where: { status: 'unread' }
  })
}

ContactMessage.getByStatus = async function(status, limit = 50, offset = 0) {
  return await this.findAndCountAll({
    where: { status },
    order: [['created_at', 'DESC']],
    limit,
    offset
  })
}

module.exports = ContactMessage
