const express = require('express')
const jwt = require('jsonwebtoken')
const { body, validationResult } = require('express-validator')
const { User } = require('../models/associations')
const { authMiddleware } = require('../middleware/auth')

const router = express.Router()

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      userId: user.id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '24h' 
    }
  )
}

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Adresse email valide requise'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Mot de passe requis (minimum 6 caractères)')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      })
    }

    const { email, password } = req.body

    // Find user by email
    const user = await User.findOne({
      where: { email: email.toLowerCase() }
    })

    if (!user) {
      return res.status(401).json({
        error: 'Email ou mot de passe incorrect'
      })
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({
        error: 'Compte utilisateur désactivé'
      })
    }

    // Validate password
    const isValidPassword = await user.validatePassword(password)
    
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Email ou mot de passe incorrect'
      })
    }

    // Update last login
    await user.update({ last_login: new Date() })

    // Generate token
    const token = generateToken(user)

    // Return user and token
    res.json({
      message: 'Connexion réussie',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
        lastLogin: user.last_login
      },
      token
    })

  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({
      error: 'Erreur lors de la connexion'
    })
  }
})

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Adresse email valide requise'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Le mot de passe doit contenir au moins 6 caractères'),
  body('firstName')
    .isLength({ min: 2 })
    .withMessage('Le prénom doit contenir au moins 2 caractères'),
  body('lastName')
    .isLength({ min: 2 })
    .withMessage('Le nom doit contenir au moins 2 caractères'),
  body('phone')
    .optional()
    .matches(/^(\+237|237)?[6-9][0-9]{8}$/)
    .withMessage('Numéro de téléphone camerounais invalide')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      })
    }

    const { email, password, firstName, lastName, phone } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({
      where: { email: email.toLowerCase() }
    })

    if (existingUser) {
      return res.status(409).json({
        error: 'Un compte avec cette adresse email existe déjà'
      })
    }

    // Create new user
    const user = await User.create({
      email: email.toLowerCase(),
      password,
      first_name: firstName,
      last_name: lastName,
      phone,
      role: 'customer'
    })

    // Generate token
    const token = generateToken(user)

    // Return user and token
    res.status(201).json({
      message: 'Compte créé avec succès',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        phone: user.phone
      },
      token
    })

  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({
      error: 'Erreur lors de la création du compte'
    })
  }
})

// @route   POST /api/auth/verify
// @desc    Verify JWT token
// @access  Public
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body

    if (!token) {
      return res.status(400).json({
        error: 'Token requis'
      })
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Get user from database
    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password'] }
    })

    if (!user || !user.is_active) {
      return res.status(401).json({
        valid: false,
        error: 'Token invalide ou utilisateur inactif'
      })
    }

    res.json({
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
        lastLogin: user.last_login
      }
    })

  } catch (error) {
    console.error('Token verification error:', error)
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        valid: false,
        error: 'Token invalide ou expiré'
      })
    }

    res.status(500).json({
      valid: false,
      error: 'Erreur lors de la vérification du token'
    })
  }
})

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authMiddleware, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        firstName: req.user.first_name,
        lastName: req.user.last_name,
        role: req.user.role,
        phone: req.user.phone,
        avatar: req.user.avatar,
        lastLogin: req.user.last_login,
        createdAt: req.user.created_at
      }
    })
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({
      error: 'Erreur lors de la récupération des informations utilisateur'
    })
  }
})

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    // In a more advanced implementation, you could blacklist the token
    res.json({
      message: 'Déconnexion réussie'
    })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({
      error: 'Erreur lors de la déconnexion'
    })
  }
})

module.exports = router
