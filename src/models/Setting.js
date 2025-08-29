const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Setting = sequelize.define('Setting', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  category: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Setting category: general, appearance, notifications, payments, security, etc.'
  },
  
  key: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Setting key within the category'
  },
  
  value: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Setting value (can be JSON string for complex values)'
  },
  
  type: {
    type: DataTypes.ENUM('string', 'number', 'boolean', 'json', 'file'),
    defaultValue: 'string',
    comment: 'Data type for proper parsing'
  },
  
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Human-readable description of the setting'
  },
  
  is_public: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether this setting can be accessed by public APIs'
  },
  
  updated_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'settings',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['category', 'key']
    }
  ]
});

module.exports = Setting;