const nodemailer = require('nodemailer')

class EmailService {
  constructor() {
    this.transporter = null
    this.initializeTransporter()
  }

  initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_AUTH_USER,
          pass: process.env.SMTP_AUTH_PASS
        }
      })

      console.log('✅ Service email initialisé avec succès')
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation du service email:', error)
    }
  }

  async sendEmail(to, subject, htmlContent, textContent = '') {
    try {
      if (!this.transporter) {
        throw new Error('Service email non initialisé')
      }

      const mailOptions = {
        from: `${process.env.EMAIL_FROM_NAME || 'BabyChic Cameroun'} <${process.env.EMAIL_FROM || process.env.SMTP_AUTH_USER}>`,
        to,
        subject,
        text: textContent,
        html: htmlContent
      }

      const info = await this.transporter.sendMail(mailOptions)
      console.log(`✅ Email envoyé avec succès: ${info.messageId}`)
      return { success: true, messageId: info.messageId }
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi de l\'email:', error)
      return { success: false, error: error.message }
    }
  }

  // Template for order confirmation
  generateOrderConfirmationEmail(order, orderItems) {
    const subject = `Confirmation de commande #${order.order_number}`
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <header style="background-color: #ff6b9d; color: white; padding: 20px; text-align: center;">
          <h1>BabyChic Cameroun</h1>
          <h2>Confirmation de Commande</h2>
        </header>
        
        <main style="padding: 20px;">
          <p>Bonjour ${order.customer_first_name} ${order.customer_last_name},</p>
          
          <p>Merci pour votre commande ! Voici les détails :</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h3>Commande #${order.order_number}</h3>
            <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleDateString('fr-FR')}</p>
            <p><strong>Statut:</strong> ${order.status}</p>
            <p><strong>Montant total:</strong> ${order.total_amount.toLocaleString()} CFA</p>
          </div>
          
          <h3>Articles commandés:</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background-color: #e9ecef;">
                <th style="padding: 10px; text-align: left; border: 1px solid #dee2e6;">Article</th>
                <th style="padding: 10px; text-align: center; border: 1px solid #dee2e6;">Quantité</th>
                <th style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">Prix</th>
              </tr>
            </thead>
            <tbody>
              ${orderItems.map(item => `
                <tr>
                  <td style="padding: 10px; border: 1px solid #dee2e6;">${item.product_name}</td>
                  <td style="padding: 10px; text-align: center; border: 1px solid #dee2e6;">${item.quantity}</td>
                  <td style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">${item.total_price.toLocaleString()} CFA</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div style="background-color: #d4edda; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #28a745;">
            <h3>Adresse de livraison:</h3>
            <p>${order.shipping_address.address}<br>
            ${order.shipping_address.city}<br>
            ${order.shipping_address.quarter}<br>
            ${order.shipping_address.landmark || ''}</p>
          </div>
          
          <p>Nous vous contacterons bientôt pour confirmer les détails de livraison.</p>
          
          <p>Merci de votre confiance !</p>
        </main>
        
        <footer style="background-color: #6c757d; color: white; padding: 20px; text-align: center;">
          <p>BabyChic Cameroun - Mode & Layette</p>
          <p>Tél: ${process.env.STORE_PHONE || '+237600000000'}</p>
          <p>Email: ${process.env.STORE_EMAIL || 'contact@babychic.cm'}</p>
        </footer>
      </div>
    `
    
    return { subject, html }
  }

  // Template for admin order notification
  generateAdminOrderNotification(order, orderItems) {
    const subject = `Nouvelle commande #${order.order_number} reçue`
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <header style="background-color: #28a745; color: white; padding: 20px; text-align: center;">
          <h1>BabyChic Admin</h1>
          <h2>Nouvelle Commande Reçue</h2>
        </header>
        
        <main style="padding: 20px;">
          <h3>Commande #${order.order_number}</h3>
          
          <div style="background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h4>Informations client:</h4>
            <p><strong>Nom:</strong> ${order.customer_first_name} ${order.customer_last_name}</p>
            <p><strong>Email:</strong> ${order.customer_email}</p>
            <p><strong>Téléphone:</strong> ${order.customer_phone}</p>
          </div>
          
          <div style="background-color: #fff3cd; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h4>Détails de la commande:</h4>
            <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleDateString('fr-FR')}</p>
            <p><strong>Montant:</strong> ${order.total_amount.toLocaleString()} CFA</p>
            <p><strong>Méthode de paiement:</strong> ${order.payment_method}</p>
          </div>
          
          <h4>Articles:</h4>
          <ul>
            ${orderItems.map(item => `
              <li>${item.product_name} - Quantité: ${item.quantity} - ${item.total_price.toLocaleString()} CFA</li>
            `).join('')}
          </ul>
          
          <div style="background-color: #d1ecf1; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h4>Adresse de livraison:</h4>
            <p>${order.shipping_address.address}<br>
            ${order.shipping_address.city}<br>
            ${order.shipping_address.quarter}<br>
            ${order.shipping_address.landmark || ''}</p>
          </div>
        </main>
      </div>
    `
    
    return { subject, html }
  }

  // Send order confirmation to customer
  async sendOrderConfirmation(order, orderItems) {
    const { subject, html } = this.generateOrderConfirmationEmail(order, orderItems)
    return await this.sendEmail(order.customer_email, subject, html)
  }

  // Send order notification to admin
  async sendAdminOrderNotification(order, orderItems) {
    const { subject, html } = this.generateAdminOrderNotification(order, orderItems)
    const adminEmails = [
      'admin@babychic.cm',
      'manager@babychic.cm',
      process.env.STORE_EMAIL || 'contact@babychic.cm'
    ]
    
    const results = []
    for (const email of adminEmails) {
      const result = await this.sendEmail(email, subject, html)
      results.push({ email, ...result })
    }
    
    return results
  }

  // Send contact form notification
  async sendContactNotification(contactData) {
    const subject = `Nouveau message de contact de ${contactData.name}`
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <header style="background-color: #17a2b8; color: white; padding: 20px; text-align: center;">
          <h1>BabyChic Contact</h1>
          <h2>Nouveau Message Reçu</h2>
        </header>
        
        <main style="padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <p><strong>Nom:</strong> ${contactData.name}</p>
            <p><strong>Email:</strong> ${contactData.email}</p>
            <p><strong>Téléphone:</strong> ${contactData.phone || 'Non fourni'}</p>
            <p><strong>Sujet:</strong> ${contactData.subject}</p>
          </div>
          
          <div style="background-color: #e2e3e5; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h4>Message:</h4>
            <p>${contactData.message}</p>
          </div>
          
          <p><small>Message reçu le ${new Date().toLocaleString('fr-FR')}</small></p>
        </main>
      </div>
    `
    
    return await this.sendEmail(process.env.STORE_EMAIL || 'contact@babychic.cm', subject, html)
  }
}

module.exports = new EmailService()