const { User } = require('../models/associations')

async function createDefaultAdmin() {
  try {
    const adminUsers = [
      {
        email: 'admin@babychic.cm',
        password: 'admin123456',
        first_name: 'Admin',
        last_name: 'Principal',
        phone: '+237600000001'
      },
      {
        email: 'manager@babychic.cm',
        password: 'manager123456',
        first_name: 'Manager',
        last_name: 'Commercial',
        phone: '+237600000002'
      },
      {
        email: 'superuser@babychic.cm',
        password: 'super123456',
        first_name: 'Super',
        last_name: 'Administrateur',
        phone: '+237600000003'
      }
    ]

    const createdAdmins = []

    for (const userData of adminUsers) {
      // Check if admin already exists
      const existingAdmin = await User.findOne({
        where: { email: userData.email }
      })
      
      if (existingAdmin) {
        console.log(`✅ Administrateur ${userData.email} déjà existant`)
        createdAdmins.push(existingAdmin)
        continue
      }
      
      // Create admin
      const admin = await User.create({
        ...userData,
        role: 'admin',
        is_active: true
      })
      
      console.log(`✅ Administrateur créé: ${admin.email}`)
      console.log(`🔑 Mot de passe: ${userData.password}`)
      createdAdmins.push(admin)
    }

    console.log(`\n📋 ${createdAdmins.length} administrateurs disponibles pour les tests`)
    return createdAdmins
    
  } catch (error) {
    console.error('❌ Erreur lors de la création des administrateurs:', error)
    throw error
  }
}

module.exports = createDefaultAdmin
