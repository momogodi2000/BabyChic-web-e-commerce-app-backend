const axios = require('axios')

class SMSService {
  constructor() {
    this.apiKey = process.env.SMS_API_KEY
    this.senderName = process.env.SMS_SENDER_NAME || 'BabyChic'
    this.apiUrl = process.env.SMS_API_URL || 'https://api.sms.cameroun.com/send' // Generic SMS API
  }

  // Format phone number for Cameroon
  formatPhoneNumber(phone) {
    if (!phone) return null
    
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '')
    
    // Handle different formats
    if (cleaned.startsWith('237')) {
      return cleaned
    } else if (cleaned.startsWith('0')) {
      return '237' + cleaned.substring(1)
    } else if (cleaned.length === 9) {
      return '237' + cleaned
    } else if (cleaned.startsWith('6') || cleaned.startsWith('7')) {
      return '237' + cleaned
    }
    
    return cleaned
  }

  async sendSMS(to, message) {
    try {
      const formattedPhone = this.formatPhoneNumber(to)
      
      if (!formattedPhone) {
        throw new Error('Numéro de téléphone invalide')
      }

      // For development/testing, log the SMS instead of sending
      if (process.env.NODE_ENV === 'development') {
        console.log('📱 SMS (Mode Développement):')
        console.log(`   À: +${formattedPhone}`)
        console.log(`   Message: ${message}`)
        console.log(`   Expéditeur: ${this.senderName}`)
        return { success: true, messageId: `dev_${Date.now()}`, development: true }
      }

      // In production, this would make the actual API call
      const response = await axios.post(this.apiUrl, {
        to: formattedPhone,
        message: message,
        from: this.senderName,
        apiKey: this.apiKey
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      })

      if (response.data && response.data.success) {
        console.log(`✅ SMS envoyé avec succès: ${response.data.messageId}`)
        return { 
          success: true, 
          messageId: response.data.messageId,
          cost: response.data.cost || 0
        }
      } else {
        throw new Error(response.data?.message || 'Erreur lors de l\'envoi du SMS')
      }

    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi du SMS:', error.message)
      
      // For development, still return success to not break the flow
      if (process.env.NODE_ENV === 'development') {
        console.log('📱 SMS simulé en mode développement')
        return { success: true, messageId: `dev_error_${Date.now()}`, development: true }
      }
      
      return { success: false, error: error.message }
    }
  }

  // Send order confirmation SMS to customer
  async sendOrderConfirmationSMS(order) {
    const message = `BabyChic: Votre commande #${order.order_number} de ${order.total_amount.toLocaleString()} CFA a été confirmée. Nous vous contacterons pour la livraison. Merci !`
    
    return await this.sendSMS(order.customer_phone, message)
  }

  // Send admin notification SMS
  async sendAdminOrderNotificationSMS(order) {
    const adminNumbers = [
      '+237600000001', // Admin principal
      '+237600000002', // Manager commercial
      '+237600000003'  // Super administrateur
    ]

    const message = `Nouvelle commande #${order.order_number}: ${order.customer_first_name} ${order.customer_last_name} - ${order.total_amount.toLocaleString()} CFA. Vérifiez l'admin panel.`
    
    const results = []
    for (const number of adminNumbers) {
      try {
        const result = await this.sendSMS(number, message)
        results.push({ phone: number, ...result })
      } catch (error) {
        results.push({ phone: number, success: false, error: error.message })
      }
    }
    
    return results
  }

  // Send delivery notification SMS
  async sendDeliveryNotificationSMS(order, estimatedTime) {
    const message = `BabyChic: Votre commande #${order.order_number} est en cours de livraison. Temps estimé: ${estimatedTime}. Préparez ${order.total_amount.toLocaleString()} CFA si paiement à la livraison.`
    
    return await this.sendSMS(order.customer_phone, message)
  }

  // Send payment reminder SMS
  async sendPaymentReminderSMS(order) {
    const message = `BabyChic: Rappel - Commande #${order.order_number} en attente de paiement (${order.total_amount.toLocaleString()} CFA). Contactez-nous: ${process.env.STORE_PHONE || '+237600000000'}`
    
    return await this.sendSMS(order.customer_phone, message)
  }

  // Send promotional SMS
  async sendPromotionalSMS(phone, promoMessage) {
    const message = `BabyChic: ${promoMessage} Visitez notre boutique ou appelez ${process.env.STORE_PHONE || '+237600000000'}. STOP pour se désabonner.`
    
    return await this.sendSMS(phone, message)
  }
}

module.exports = new SMSService()