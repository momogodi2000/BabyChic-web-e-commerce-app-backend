const axios = require('axios')
const { Payment, Order } = require('../models/associations')

class PaymentService {
  constructor() {
    this.noupaiConfig = {
      baseURL: process.env.NOUPAI_API_URL || 'https://api.noupai.com',
      apiKey: process.env.NOUPAI_API_KEY,
      enabled: process.env.NOUPAI_ENABLED === 'true'
    }
    
    this.campayConfig = {
      baseURL: process.env.CAMPAY_API_URL || 'https://api.campay.net',
      apiKey: process.env.CAMPAY_API_KEY,
      enabled: process.env.CAMPAY_ENABLED === 'true'
    }
  }

  // Initiate payment with Noupai as primary, Campay as fallback
  async initiatePayment(paymentData) {
    const { orderId, amount, currency = 'XAF', phoneNumber, provider, customerInfo } = paymentData
    
    try {
      // Try Noupai first
      if (this.noupaiConfig.enabled && this.noupaiConfig.apiKey) {
        try {
          const noupaiResult = await this.initiateNoupaiPayment({
            orderId, amount, currency, phoneNumber, provider, customerInfo
          })
          
          if (noupaiResult.success) {
            await this.createPaymentRecord({
              order_id: orderId,
              provider: 'noupai',
              transaction_id: noupaiResult.transactionId,
              amount: amount,
              currency: currency,
              phone_number: phoneNumber,
              payment_method: provider,
              status: 'pending',
              payment_data: noupaiResult.data
            })
            
            return {
              success: true,
              provider: 'noupai',
              transactionId: noupaiResult.transactionId,
              paymentUrl: noupaiResult.paymentUrl,
              message: 'Payment initiated with Noupai'
            }
          }
        } catch (noupaiError) {
          console.error('Noupai payment failed:', noupaiError.message)
        }
      }
      
      // Fallback to Campay
      if (this.campayConfig.enabled && this.campayConfig.apiKey) {
        try {
          const campayResult = await this.initiateCampayPayment({
            orderId, amount, currency, phoneNumber, provider, customerInfo
          })
          
          if (campayResult.success) {
            await this.createPaymentRecord({
              order_id: orderId,
              provider: 'campay',
              transaction_id: campayResult.transactionId,
              amount: amount,
              currency: currency,
              phone_number: phoneNumber,
              payment_method: provider,
              status: 'pending',
              payment_data: campayResult.data
            })
            
            return {
              success: true,
              provider: 'campay',
              transactionId: campayResult.transactionId,
              paymentUrl: campayResult.paymentUrl,
              message: 'Payment initiated with Campay (fallback)'
            }
          }
        } catch (campayError) {
          console.error('Campay payment failed:', campayError.message)
        }
      }
      
      throw new Error('All payment providers failed')
      
    } catch (error) {
      console.error('Payment initiation error:', error)
      throw error
    }
  }

  // Noupai payment integration
  async initiateNoupaiPayment(data) {
    const { orderId, amount, currency, phoneNumber, provider, customerInfo } = data
    
    const payload = {
      amount: amount,
      currency: currency,
      phone: phoneNumber,
      operator: this.mapProviderToNoupai(provider),
      external_id: orderId,
      description: `BabyChic Order #${orderId}`,
      return_url: `${process.env.FRONTEND_URL}/payment/success`,
      cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
      webhook_url: `${process.env.API_URL}/api/payments/webhook/noupai`,
      customer: {
        name: customerInfo?.name || 'Customer',
        email: customerInfo?.email || '',
        phone: phoneNumber
      }
    }
    
    const response = await axios.post(`${this.noupaiConfig.baseURL}/v1/payments`, payload, {
      headers: {
        'Authorization': `Bearer ${this.noupaiConfig.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    })
    
    if (response.data && response.data.status === 'success') {
      return {
        success: true,
        transactionId: response.data.transaction_id,
        paymentUrl: response.data.payment_url,
        data: response.data
      }
    }
    
    throw new Error(response.data?.message || 'Noupai payment initialization failed')
  }

  // Campay payment integration
  async initiateCampayPayment(data) {
    const { orderId, amount, currency, phoneNumber, provider, customerInfo } = data
    
    const payload = {
      amount: amount.toString(),
      currency: currency,
      from: phoneNumber,
      description: `BabyChic Order #${orderId}`,
      external_reference: orderId,
      redirect_url: `${process.env.FRONTEND_URL}/payment/success`,
      webhook_url: `${process.env.API_URL}/api/payments/webhook/campay`
    }
    
    const response = await axios.post(`${this.campayConfig.baseURL}/collect`, payload, {
      headers: {
        'Authorization': `Token ${this.campayConfig.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    })
    
    if (response.data && response.data.reference) {
      return {
        success: true,
        transactionId: response.data.reference,
        paymentUrl: response.data.ussd_code ? null : response.data.link,
        data: response.data
      }
    }
    
    throw new Error(response.data?.detail || 'Campay payment initialization failed')
  }

  // Verify payment status
  async verifyPayment(transactionId, provider) {
    try {
      let verificationResult = null
      
      if (provider === 'noupai') {
        verificationResult = await this.verifyNoupaiPayment(transactionId)
      } else if (provider === 'campay') {
        verificationResult = await this.verifyCampayPayment(transactionId)
      } else {
        throw new Error(`Unsupported payment provider: ${provider}`)
      }
      
      // Update payment record
      const payment = await Payment.findOne({ where: { transaction_id: transactionId } })
      if (payment) {
        await payment.update({
          status: verificationResult.status,
          verified_at: verificationResult.status === 'completed' ? new Date() : null,
          payment_data: { ...payment.payment_data, verification: verificationResult.data }
        })
        
        // Update order if payment is successful
        if (verificationResult.status === 'completed') {
          await Order.update(
            { payment_status: 'paid', status: 'confirmed' },
            { where: { order_number: payment.order_id } }
          )
        }
      }
      
      return verificationResult
      
    } catch (error) {
      console.error('Payment verification error:', error)
      throw error
    }
  }

  // Verify Noupai payment
  async verifyNoupaiPayment(transactionId) {
    const response = await axios.get(`${this.noupaiConfig.baseURL}/v1/payments/${transactionId}`, {
      headers: {
        'Authorization': `Bearer ${this.noupaiConfig.apiKey}`
      },
      timeout: 15000
    })
    
    const status = this.mapNoupaiStatus(response.data.status)
    
    return {
      status: status,
      amount: response.data.amount,
      currency: response.data.currency,
      data: response.data
    }
  }

  // Verify Campay payment
  async verifyCampayPayment(transactionId) {
    const response = await axios.get(`${this.campayConfig.baseURL}/transaction/${transactionId}/`, {
      headers: {
        'Authorization': `Token ${this.campayConfig.apiKey}`
      },
      timeout: 15000
    })
    
    const status = this.mapCampayStatus(response.data.status)
    
    return {
      status: status,
      amount: parseFloat(response.data.amount),
      currency: response.data.currency,
      data: response.data
    }
  }

  // Create payment record
  async createPaymentRecord(paymentData) {
    return await Payment.create(paymentData)
  }

  // Handle webhooks
  async handleWebhook(provider, webhookData) {
    try {
      let transactionId = null
      let status = null
      
      if (provider === 'noupai') {
        transactionId = webhookData.transaction_id
        status = this.mapNoupaiStatus(webhookData.status)
      } else if (provider === 'campay') {
        transactionId = webhookData.reference
        status = this.mapCampayStatus(webhookData.status)
      }
      
      if (transactionId && status) {
        const payment = await Payment.findOne({ where: { transaction_id: transactionId } })
        
        if (payment) {
          await payment.update({
            status: status,
            verified_at: status === 'completed' ? new Date() : null,
            payment_data: { ...payment.payment_data, webhook: webhookData }
          })
          
          // Update order status if payment is successful
          if (status === 'completed') {
            await Order.update(
              { payment_status: 'paid', status: 'confirmed' },
              { where: { order_number: payment.order_id } }
            )
          } else if (status === 'failed') {
            await Order.update(
              { payment_status: 'failed' },
              { where: { order_number: payment.order_id } }
            )
          }
          
          return { success: true, message: 'Webhook processed successfully' }
        }
      }
      
      throw new Error('Invalid webhook data or payment not found')
      
    } catch (error) {
      console.error('Webhook processing error:', error)
      throw error
    }
  }

  // Provider mapping helpers
  mapProviderToNoupai(provider) {
    const mapping = {
      'mtn': 'MTN_MOMO',
      'orange': 'ORANGE_MONEY',
      'moov': 'MOOV_MONEY'
    }
    return mapping[provider] || 'MTN_MOMO'
  }

  mapNoupaiStatus(status) {
    const mapping = {
      'pending': 'pending',
      'processing': 'pending',
      'successful': 'completed',
      'completed': 'completed',
      'failed': 'failed',
      'cancelled': 'failed'
    }
    return mapping[status] || 'pending'
  }

  mapCampayStatus(status) {
    const mapping = {
      'PENDING': 'pending',
      'SUCCESSFUL': 'completed',
      'FAILED': 'failed',
      'CANCELLED': 'failed'
    }
    return mapping[status] || 'pending'
  }

  // Manual payment validation (for WhatsApp payments)
  async validateManualPayment(orderId, paymentProof) {
    try {
      const payment = await Payment.create({
        order_id: orderId,
        provider: 'manual',
        transaction_id: `manual-${Date.now()}`,
        amount: paymentProof.amount,
        currency: paymentProof.currency || 'XAF',
        payment_method: 'whatsapp',
        status: 'pending_validation',
        payment_data: paymentProof
      })
      
      return {
        success: true,
        paymentId: payment.id,
        message: 'Manual payment submitted for validation'
      }
    } catch (error) {
      console.error('Manual payment validation error:', error)
      throw error
    }
  }

  // Admin validate manual payment
  async adminValidatePayment(paymentId, isApproved, notes = '') {
    try {
      const payment = await Payment.findByPk(paymentId)
      if (!payment) {
        throw new Error('Payment not found')
      }
      
      const newStatus = isApproved ? 'completed' : 'failed'
      
      await payment.update({
        status: newStatus,
        verified_at: isApproved ? new Date() : null,
        payment_data: { 
          ...payment.payment_data, 
          admin_validation: { approved: isApproved, notes, validated_at: new Date() }
        }
      })
      
      // Update order status
      if (isApproved) {
        await Order.update(
          { payment_status: 'paid', status: 'confirmed' },
          { where: { order_number: payment.order_id } }
        )
      } else {
        await Order.update(
          { payment_status: 'failed' },
          { where: { order_number: payment.order_id } }
        )
      }
      
      return {
        success: true,
        message: isApproved ? 'Payment approved' : 'Payment rejected'
      }
    } catch (error) {
      console.error('Admin payment validation error:', error)
      throw error
    }
  }
}

module.exports = new PaymentService()