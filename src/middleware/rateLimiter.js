const rateLimit = require('express-rate-limit')
const slowDown = require('express-slow-down')

// General API rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    error: 'Trop de requêtes de cette IP, réessayez dans 15 minutes.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: (req) => {
    // Use IP + User-Agent for better tracking with proper IPv6 handling
    const ip = req.ip || req.connection.remoteAddress || 'unknown'
    const userAgent = req.get('User-Agent') || 'unknown'
    return `${ip}:${userAgent}`
  }
})

// Strict rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  skipSuccessfulRequests: true, // Don't count successful requests
  message: {
    error: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
})

// Rate limiting for contact form
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 contact submissions per hour
  message: {
    error: 'Limite de messages de contact atteinte. Réessayez dans une heure.'
  },
  standardHeaders: true,
  legacyHeaders: false
})

// Rate limiting for newsletter subscription
const newsletterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 newsletter subscriptions per hour
  message: {
    error: 'Limite d\'inscriptions newsletter atteinte. Réessayez dans une heure.'
  },
  standardHeaders: true,
  legacyHeaders: false
})

// Rate limiting for payment endpoints
const paymentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // limit each IP to 10 payment attempts per 10 minutes
  message: {
    error: 'Trop de tentatives de paiement. Réessayez dans 10 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
})

// Slow down requests progressively
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 100, // allow 100 requests per windowMs without delay
  delayMs: () => 500, // add 500ms of delay per request after delayAfter is reached
  maxDelayMs: 20000, // maximum delay of 20 seconds
  validate: {
    delayMs: false // Disable validation warning
  }
})

// Admin-specific rate limiting (more permissive for legitimate admin actions)
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit admin users to 500 requests per windowMs
  message: {
    error: 'Limite d\'administration atteinte. Réessayez dans 15 minutes.'
  },
  skip: (req) => {
    // Skip rate limiting for super admin or if in development
    return req.user?.role === 'super_admin' || process.env.NODE_ENV === 'development'
  },
  keyGenerator: (req) => {
    // Use user ID for authenticated admin requests
    return req.user?.id || req.ip
  }
})

// File upload rate limiting
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // limit each user to 50 uploads per hour
  message: {
    error: 'Limite de téléchargement atteinte. Réessayez dans une heure.'
  },
  keyGenerator: (req) => {
    return req.user?.id || req.ip
  }
})

// Dynamic rate limiting based on endpoint sensitivity
const createDynamicLimiter = (config) => {
  return rateLimit({
    windowMs: config.windowMs || 15 * 60 * 1000,
    max: config.max || 100,
    message: {
      error: config.message || 'Limite de requêtes atteinte.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: config.keyGenerator || ((req) => req.ip),
    skip: config.skip || (() => false)
  })
}

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  
  // Don't reveal server information
  res.removeHeader('X-Powered-By')
  
  next()
}

// Request size limiter
const requestSizeLimiter = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = parseInt(req.get('Content-Length') || '0', 10)
    const maxSizeBytes = parseFloat(maxSize) * 1024 * 1024 // Convert MB to bytes
    
    if (contentLength > maxSizeBytes) {
      return res.status(413).json({
        error: `Requête trop volumineuse. Taille maximale: ${maxSize}`
      })
    }
    
    next()
  }
}

// Suspicious activity detector
const suspiciousActivityDetector = (req, res, next) => {
  const userAgent = req.get('User-Agent') || ''
  const referer = req.get('Referer') || ''
  
  // Basic bot detection
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i,
    /curl/i, /wget/i, /python/i, /php/i
  ]
  
  const isSuspiciousBot = botPatterns.some(pattern => pattern.test(userAgent))
  
  if (isSuspiciousBot && !req.url.startsWith('/api/public/')) {
    console.warn('Suspicious bot activity detected:', {
      ip: req.ip,
      userAgent: userAgent,
      url: req.url,
      timestamp: new Date().toISOString()
    })
    
    return res.status(403).json({
      error: 'Accès non autorisé'
    })
  }
  
  next()
}

module.exports = {
  generalLimiter,
  authLimiter,
  contactLimiter,
  newsletterLimiter,
  paymentLimiter,
  speedLimiter,
  adminLimiter,
  uploadLimiter,
  createDynamicLimiter,
  securityHeaders,
  requestSizeLimiter,
  suspiciousActivityDetector
}