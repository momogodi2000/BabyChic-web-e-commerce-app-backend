const { Sequelize } = require('sequelize')

const sequelize = new Sequelize({
  dialect: process.env.NODE_ENV === 'production' ? 'postgres' : 'sqlite',
  host: process.env.NODE_ENV === 'production' ? (process.env.DB_HOST || 'localhost') : undefined,
  port: process.env.NODE_ENV === 'production' ? (parseInt(process.env.DB_PORT) || 5432) : undefined,
  database: process.env.NODE_ENV === 'production' ? (process.env.DB_NAME || 'babychic_db') : undefined,
  username: process.env.NODE_ENV === 'production' ? (process.env.DB_USER || 'postgres') : undefined,
  password: process.env.NODE_ENV === 'production' ? (process.env.DB_PASSWORD || '') : undefined,
  storage: process.env.NODE_ENV === 'production' ? undefined : 'babychic.sqlite',
  
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
  },
  
  // Timezone (only for PostgreSQL)
  ...(process.env.NODE_ENV === 'production' && { timezone: '+01:00' })
})

module.exports = sequelize
