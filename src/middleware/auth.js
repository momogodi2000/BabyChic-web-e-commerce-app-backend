const jwt = require('jsonwebtoken')
const { User } = require('../models/associations')

const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Token d\'authentification requis'
      })
    }
    
    const token = authHeader.substring(7) // Remove "Bearer " prefix
    
    if (!token) {
      return res.status(401).json({
        error: 'Token d\'authentification requis'
      })
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    
    // Get user from database
    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password'] }
    })
    
    if (!user) {
      return res.status(401).json({
        error: 'Utilisateur non trouvé'
      })
    }
    
    if (!user.is_active) {
      return res.status(401).json({
        error: 'Compte utilisateur désactivé'
      })
    }
    
    // Add user to request object
    req.user = user
    next()
    
  } catch (error) {
    console.error('Auth middleware error:', error)
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Token invalide'
      })
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expiré'
      })
    }
    
    return res.status(500).json({
      error: 'Erreur d\'authentification'
    })
  }
}

const adminMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentification requise'
    })
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Accès réservé aux administrateurs'
    })
  }
  
  next()
}

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const user = await User.findByPk(decoded.userId, {
          attributes: { exclude: ['password'] }
        })
        
        if (user && user.is_active) {
          req.user = user
        }
      }
    }
    
    next()
  } catch (error) {
    // If token is invalid, just continue without user
    next()
  }
}

module.exports = {
  authMiddleware,
  adminMiddleware,
  optionalAuth
}
