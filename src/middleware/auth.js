const jwt = require('jsonwebtoken')
const { User } = require('../models/associations')
const rateLimit = require('express-rate-limit')
const crypto = require('crypto')

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
    
    // Check token expiration with buffer
    const now = Math.floor(Date.now() / 1000)
    if (decoded.exp && decoded.exp < now + 300) { // 5 minutes buffer
      return res.status(401).json({
        error: 'Token expirant bientôt, veuillez vous reconnecter'
      })
    }
    
    // Get user from database with additional security checks
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
    
    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(423).json({
        error: 'Compte temporairement verrouillé'
      })
    }
    
    // Optional: Check if user's password was changed after token was issued
    if (user.password_changed_at && decoded.iat < Math.floor(user.password_changed_at.getTime() / 1000)) {
      return res.status(401).json({
        error: 'Token invalide suite à changement de mot de passe'
      })
    }
    
    // Update last activity
    await user.update({ 
      last_activity: new Date(),
      last_ip: req.ip,
      last_user_agent: req.get('User-Agent')?.substring(0, 255)
    })
    
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
  
  const allowedRoles = ['admin', 'super_admin']
  if (!allowedRoles.includes(req.user.role)) {
    // Log unauthorized access attempt
    console.warn('Unauthorized admin access attempt:', {
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      ip: req.ip,
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    })
    
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

// Super admin middleware (highest level access)
const superAdminMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentification requise'
    })
  }
  
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({
      error: 'Accès réservé aux super administrateurs'
    })
  }
  
  next()
}

// Role-based middleware factory
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentification requise'
      })
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Permissions insuffisantes'
      })
    }
    
    next()
  }
}

// Check if user owns resource or is admin
const ownerOrAdmin = (resourceIdField = 'id') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentification requise'
      })
    }
    
    const resourceUserId = req.params[resourceIdField] || req.body[resourceIdField]
    const isOwner = req.user.id === resourceUserId
    const isAdmin = ['admin', 'super_admin'].includes(req.user.role)
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        error: 'Accès non autorisé à cette ressource'
      })
    }
    
    next()
  }
}

// API key middleware for third-party integrations
const apiKeyMiddleware = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.api_key
  
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({
      error: 'Clé API invalide ou manquante'
    })
  }
  
  next()
}

module.exports = {
  authMiddleware,
  adminMiddleware,
  superAdminMiddleware,
  optionalAuth,
  requireRole,
  ownerOrAdmin,
  apiKeyMiddleware
}
