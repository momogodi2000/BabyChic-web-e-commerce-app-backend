const express = require('express')
const { authMiddleware, adminMiddleware } = require('../middleware/auth')
const paymentService = require('../utils/paymentService')
const { body, validationResult } = require('express-validator')

const router = express.Router()

// @route   POST /api/payments/initiate
// @desc    Initiate payment
// @access  Public
router.post('/initiate', [
  body('orderId').notEmpty().withMessage('Order ID is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount is required'),
  body('phoneNumber').isMobilePhone().withMessage('Valid phone number is required'),
  body('provider').isIn(['mtn', 'orange', 'moov']).withMessage('Valid provider is required')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      })
    }

    const { orderId, amount, currency, phoneNumber, provider, customerInfo } = req.body
    
    const result = await paymentService.initiatePayment({
      orderId,
      amount,
      currency: currency || 'XAF',
      phoneNumber,
      provider,
      customerInfo
    })
    
    res.json(result)
  } catch (error) {
    console.error('Payment initiation error:', error)
    res.status(500).json({
      error: 'Payment initiation failed',
      message: error.message
    })
  }
})

// @route   POST /api/payments/verify
// @desc    Verify payment
// @access  Public
router.post('/verify', [
  body('transactionId').notEmpty().withMessage('Transaction ID is required'),
  body('provider').isIn(['noupai', 'campay']).withMessage('Valid provider is required')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      })
    }

    const { transactionId, provider } = req.body
    
    const result = await paymentService.verifyPayment(transactionId, provider)
    
    res.json({
      success: true,
      status: result.status,
      amount: result.amount,
      currency: result.currency
    })
  } catch (error) {
    console.error('Payment verification error:', error)
    res.status(500).json({
      error: 'Payment verification failed',
      message: error.message
    })
  }
})

// @route   POST /api/payments/webhook/noupai
// @desc    Handle Noupai webhooks
// @access  Public
router.post('/webhook/noupai', async (req, res) => {
  try {
    const result = await paymentService.handleWebhook('noupai', req.body)
    res.json(result)
  } catch (error) {
    console.error('Noupai webhook error:', error)
    res.status(500).json({
      error: 'Webhook processing failed',
      message: error.message
    })
  }
})

// @route   POST /api/payments/webhook/campay
// @desc    Handle Campay webhooks
// @access  Public
router.post('/webhook/campay', async (req, res) => {
  try {
    const result = await paymentService.handleWebhook('campay', req.body)
    res.json(result)
  } catch (error) {
    console.error('Campay webhook error:', error)
    res.status(500).json({
      error: 'Webhook processing failed',
      message: error.message
    })
  }
})

// @route   POST /api/payments/manual
// @desc    Submit manual payment proof
// @access  Public
router.post('/manual', [
  body('orderId').notEmpty().withMessage('Order ID is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount is required'),
  body('paymentProof').notEmpty().withMessage('Payment proof is required')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      })
    }

    const { orderId, paymentProof } = req.body
    
    const result = await paymentService.validateManualPayment(orderId, paymentProof)
    
    res.json(result)
  } catch (error) {
    console.error('Manual payment error:', error)
    res.status(500).json({
      error: 'Manual payment submission failed',
      message: error.message
    })
  }
})

// @route   PATCH /api/payments/:id/validate
// @desc    Admin validate manual payment
// @access  Private (Admin)
router.patch('/:id/validate', authMiddleware, adminMiddleware, [
  body('approved').isBoolean().withMessage('Approval status is required'),
  body('notes').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      })
    }

    const { id } = req.params
    const { approved, notes } = req.body
    
    const result = await paymentService.adminValidatePayment(id, approved, notes)
    
    res.json(result)
  } catch (error) {
    console.error('Payment validation error:', error)
    res.status(500).json({
      error: 'Payment validation failed',
      message: error.message
    })
  }
})

module.exports = router
