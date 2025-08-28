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
    type: DataTypes.ENUM('admin', 'customer'),
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
  }
})

module.exports = User
