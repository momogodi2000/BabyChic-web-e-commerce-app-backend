const { Sequelize } = require('sequelize')

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.DB_STORAGE || 'babychic.sqlite',
  
  // Connection pool configuration
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  
  // Logging configuration
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  
  // Other options
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true
  }
})

module.exports = sequelize
