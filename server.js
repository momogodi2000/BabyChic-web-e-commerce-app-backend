require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')
const path = require('path')

// Import routes
const authRoutes = require('./src/routes/auth')
const productRoutes = require('./src/routes/products')
const categoryRoutes = require('./src/routes/categories')
const orderRoutes = require('./src/routes/orders')
const paymentRoutes = require('./src/routes/payments')
const publicRoutes = require('./src/routes/public')

// Import database
const sequelize = require('./src/config/database')

// Import models to establish associations
require('./src/models/associations')

// Import database optimizations
const DatabaseOptimizations = require('./src/utils/databaseOptimizations')

const app = express()

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.babychic.cm"]
    }
  }
}))

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
      : ['http://localhost:3000']
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true)
    } else {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.'
      return callback(new Error(msg), false)
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}
app.use(cors(corsOptions))

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Trop de requêtes depuis cette adresse IP, veuillez réessayer plus tard.'
  },
  standardHeaders: true,
  legacyHeaders: false
})
app.use('/api/', limiter)

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('combined'))
} else {
  app.use(morgan('combined'))
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'BabyChic API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/public', publicRoutes)

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error details:', err)

  // Sequelize validation error
  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map(e => ({
      field: e.path,
      message: e.message
    }))
    return res.status(400).json({
      error: 'Données invalides',
      details: errors
    })
  }

  // Sequelize unique constraint error
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      error: 'Cette ressource existe déjà',
      details: err.errors.map(e => ({
        field: e.path,
        message: e.message
      }))
    })
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Token invalide'
    })
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expiré'
    })
  }

  // Multer errors (file upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: 'Fichier trop volumineux'
    })
  }

  // Default error
  const statusCode = err.statusCode || 500
  res.status(statusCode).json({
    error: process.env.NODE_ENV === 'development' ? err.message : 'Erreur interne du serveur',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint non trouvé',
    message: `La route ${req.method} ${req.originalUrl} n'existe pas`
  })
})

// Database connection and server startup
const PORT = process.env.PORT || 5000

async function startServer() {
  try {
    // Test database connection
    await sequelize.authenticate()
    console.log('✅ Connexion à la base de données établie avec succès.')

    // Sync database models
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ force: false })
      console.log('✅ Synchronisation des modèles de base de données terminée.')

      // Create default admin users
      await require('./src/utils/createDefaultAdmin')()
      
      // Seed initial data (categories and products) - temporarily disabled
      // const SeedData = require('./src/utils/seedData')
      // await SeedData.seedAll()
    }

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Serveur BabyChic API démarré sur le port ${PORT}`)
      console.log(`📱 Mode: ${process.env.NODE_ENV}`)
      console.log(`🌐 CORS autorisé pour: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`)
      console.log(`📊 Health check: http://localhost:${PORT}/health`)
    })
  } catch (error) {
    console.error('❌ Erreur lors du démarrage du serveur:', error)
    process.exit(1)
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err)
  process.exit(1)
})

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err)
  process.exit(1)
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM reçu, fermeture du serveur...')
  await sequelize.close()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('SIGINT reçu, fermeture du serveur...')
  await sequelize.close()
  process.exit(0)
})

startServer()
