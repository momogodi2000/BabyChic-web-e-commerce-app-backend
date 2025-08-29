const { DataTypes } = require('sequelize')
const bcrypt = require('bcryptjs')
const sequelize = require('../config/database')

const User = sequelize.define('User', {
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
  
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: {
        args: [6, 100],
        msg: 'Le mot de passe doit contenir au moins 6 caractères'
      }
    }
  },
  
  first_name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: {
        args: [2, 50],
        msg: 'Le prénom doit contenir entre 2 et 50 caractères'
      }
    }
  },
  
  last_name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: {
        args: [2, 50],
        msg: 'Le nom doit contenir entre 2 et 50 caractères'
      }
    }
  },
  
  role: {
    type: DataTypes.ENUM('admin', 'super_admin', 'customer'),
    defaultValue: 'customer',
    allowNull: false
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
  
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  
  last_login: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  avatar: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  // Security and tracking fields
  last_activity: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  last_ip: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  last_user_agent: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  
  password_changed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  locked_until: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  login_attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'users',
  indexes: [
    {
      unique: true,
      fields: ['email']
    },
    {
      fields: ['role']
    },
    {
      fields: ['is_active']
    }
  ]
})

// Instance methods
User.prototype.toJSON = function() {
  const values = Object.assign({}, this.get())
  delete values.password
  return values
}

User.prototype.validatePassword = async function(password) {
  return await bcrypt.compare(password, this.password)
}

User.prototype.getFullName = function() {
  return `${this.first_name} ${this.last_name}`
}

User.prototype.isAccountLocked = function() {
  return this.locked_until && new Date(this.locked_until) > new Date()
}

User.prototype.incrementLoginAttempts = async function() {
  // If we have a previous lock and it's expired, restart at 1
  if (this.locked_until && this.locked_until <= new Date()) {
    return await this.update({
      login_attempts: 1,
      locked_until: null
    })
  }
  
  const updates = { login_attempts: this.login_attempts + 1 }
  
  // Lock account after 5 failed attempts for 1 hour
  if (updates.login_attempts >= 5) {
    updates.locked_until = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
  }
  
  return await this.update(updates)
}

User.prototype.resetLoginAttempts = async function() {
  return await this.update({
    login_attempts: 0,
    locked_until: null
  })
}

// Class methods
User.hashPassword = async function(password) {
  const saltRounds = 12
  return await bcrypt.hash(password, saltRounds)
}

// Hooks
User.beforeCreate(async (user) => {
  if (user.password) {
    user.password = await User.hashPassword(user.password)
  }
})

User.beforeUpdate(async (user) => {
  if (user.changed('password')) {
    user.password = await User.hashPassword(user.password)
    user.password_changed_at = new Date()
  }
})

module.exports = User
