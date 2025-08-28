const { Category, Product } = require('../models/associations')

class SeedData {
  static async seedCategories() {
    console.log('📂 Création des catégories...')

    const categories = [
      {
        name: 'Layette 0-2 ans',
        slug: 'layette-0-2-ans',
        description: 'Vêtements et accessoires pour bébés de 0 à 2 ans',
        sort_order: 1,
        is_active: true
      },
      {
        name: 'Enfants 3-10 ans',
        slug: 'enfants-3-10-ans',
        description: 'Mode pour enfants de 3 à 10 ans',
        sort_order: 2,
        is_active: true
      },
      {
        name: 'Mode Féminine',
        slug: 'mode-feminine',
        description: 'Vêtements tendance pour femmes',
        sort_order: 3,
        is_active: true
      },
      {
        name: 'Chaussures',
        slug: 'chaussures',
        description: 'Chaussures pour toute la famille',
        sort_order: 4,
        is_active: true
      },
      {
        name: 'Accessoires',
        slug: 'accessoires',
        description: 'Accessoires et bijoux de mode',
        sort_order: 5,
        is_active: true
      }
    ]

    const createdCategories = {}
    
    for (const categoryData of categories) {
      const [category, created] = await Category.findOrCreate({
        where: { slug: categoryData.slug },
        defaults: categoryData
      })
      
      createdCategories[category.slug] = category.id
      
      if (created) {
        console.log(`✅ Catégorie créée: ${category.name}`)
      } else {
        console.log(`ℹ️  Catégorie existe: ${category.name}`)
      }
    }

    return createdCategories
  }

  static async seedProducts(categoryIds) {
    console.log('🛍️ Création des produits...')

    const products = [
      // Layette 0-2 ans
      {
        name: 'Ensemble Bébé Rose Pastel',
        slug: 'ensemble-bebe-rose-pastel',
        sku: 'BC-BABY-001',
        description: 'Adorable ensemble pour bébé en coton doux, comprenant un body, un pantalon et un bonnet. Parfait pour les sorties ou les photos souvenirs.',
        short_description: 'Ensemble 3 pièces en coton doux pour bébé',
        category_id: categoryIds['layette-0-2-ans'],
        price: 15000,
        original_price: 20000,
        stock_quantity: 25,
        track_stock: true,
        is_featured: true,
        status: 'published',
        published_at: new Date(),
        attributes: {
          couleur: 'Rose',
          matiere: 'Coton',
          tailles: ['0-3M', '3-6M', '6-12M'],
          lavage: 'Machine 30°'
        }
      },
      {
        name: 'Body Bébé Unisexe Blanc',
        slug: 'body-bebe-unisexe-blanc',
        sku: 'BC-BABY-002',
        description: 'Body basique en coton bio, doux et confortable. Idéal pour habiller bébé au quotidien.',
        short_description: 'Body en coton bio pour bébé',
        category_id: categoryIds['layette-0-2-ans'],
        price: 8000,
        stock_quantity: 40,
        track_stock: true,
        is_featured: false,
        status: 'published',
        published_at: new Date(),
        attributes: {
          couleur: 'Blanc',
          matiere: 'Coton bio',
          tailles: ['0-3M', '3-6M', '6-12M', '12-18M']
        }
      },

      // Enfants 3-10 ans
      {
        name: 'Robe Fillette Bleu Marine',
        slug: 'robe-fillette-bleu-marine',
        sku: 'BC-KIDS-001',
        description: 'Magnifique robe pour fillette avec des détails brodés. Parfaite pour les occasions spéciales et le quotidien.',
        short_description: 'Robe élégante avec broderies pour fillette',
        category_id: categoryIds['enfants-3-10-ans'],
        price: 22000,
        original_price: 28000,
        stock_quantity: 18,
        track_stock: true,
        is_featured: true,
        status: 'published',
        published_at: new Date(),
        attributes: {
          couleur: 'Bleu marine',
          matiere: 'Coton/Polyester',
          tailles: ['3A', '4A', '5A', '6A', '8A', '10A']
        }
      },
      {
        name: 'T-shirt Garçon Super Héros',
        slug: 'tshirt-garcon-super-heros',
        sku: 'BC-KIDS-002',
        description: 'T-shirt amusant avec imprimé super héros. Matière douce et résistante pour les aventures quotidiennes.',
        short_description: 'T-shirt imprimé super héros',
        category_id: categoryIds['enfants-3-10-ans'],
        price: 12000,
        stock_quantity: 30,
        track_stock: true,
        is_featured: false,
        status: 'published',
        published_at: new Date(),
        attributes: {
          couleur: 'Multi',
          matiere: 'Coton',
          tailles: ['3A', '4A', '5A', '6A', '8A', '10A']
        }
      },

      // Mode Féminine
      {
        name: 'Top Femme Élégant Blanc',
        slug: 'top-femme-elegant-blanc',
        sku: 'BC-WOMEN-001',
        description: 'Top élégant en soie naturelle, parfait pour les occasions professionnelles ou les sorties chic.',
        short_description: 'Top en soie pour femme',
        category_id: categoryIds['mode-feminine'],
        price: 35000,
        original_price: 45000,
        stock_quantity: 12,
        track_stock: true,
        is_featured: true,
        status: 'published',
        published_at: new Date(),
        attributes: {
          couleur: 'Blanc',
          matiere: 'Soie',
          tailles: ['S', 'M', 'L', 'XL']
        }
      },
      {
        name: 'Robe Africaine Moderne',
        slug: 'robe-africaine-moderne',
        sku: 'BC-WOMEN-002',
        description: 'Belle robe inspirée des motifs africains traditionnels avec une coupe moderne. Idéale pour les événements culturels.',
        short_description: 'Robe aux motifs africains modernes',
        category_id: categoryIds['mode-feminine'],
        price: 45000,
        stock_quantity: 8,
        track_stock: true,
        is_featured: true,
        status: 'published',
        published_at: new Date(),
        attributes: {
          couleur: 'Wax multicolore',
          matiere: 'Coton/Wax',
          tailles: ['S', 'M', 'L', 'XL']
        }
      },

      // Chaussures
      {
        name: 'Chaussures Enfant Confort',
        slug: 'chaussures-enfant-confort',
        sku: 'BC-SHOES-001',
        description: 'Chaussures confortables pour enfants avec semelle antidérapante. Parfaites pour l\'école et les activités.',
        short_description: 'Chaussures confort pour enfant',
        category_id: categoryIds['chaussures'],
        price: 18000,
        original_price: 25000,
        stock_quantity: 20,
        track_stock: true,
        is_featured: true,
        status: 'published',
        published_at: new Date(),
        attributes: {
          couleur: 'Noir',
          matiere: 'Cuir synthétique',
          pointures: ['28', '29', '30', '31', '32', '33', '34', '35']
        }
      },
      {
        name: 'Sandales Femme Été',
        slug: 'sandales-femme-ete',
        sku: 'BC-SHOES-002',
        description: 'Sandales élégantes pour femme, parfaites pour la saison chaude. Confort et style assurés.',
        short_description: 'Sandales d\'été pour femme',
        category_id: categoryIds['chaussures'],
        price: 25000,
        stock_quantity: 15,
        track_stock: true,
        is_featured: false,
        status: 'published',
        published_at: new Date(),
        attributes: {
          couleur: 'Marron',
          matiere: 'Cuir',
          pointures: ['36', '37', '38', '39', '40', '41']
        }
      },

      // Accessoires
      {
        name: 'Sac à Main Tendance',
        slug: 'sac-main-tendance',
        sku: 'BC-ACC-001',
        description: 'Sac à main moderne et pratique avec plusieurs compartiments. Idéal pour le quotidien.',
        short_description: 'Sac à main moderne',
        category_id: categoryIds['accessoires'],
        price: 30000,
        stock_quantity: 10,
        track_stock: true,
        is_featured: true,
        status: 'published',
        published_at: new Date(),
        attributes: {
          couleur: 'Noir',
          matiere: 'Simili cuir',
          dimensions: '30x25x10 cm'
        }
      },
      {
        name: 'Collier Perles Africaines',
        slug: 'collier-perles-africaines',
        sku: 'BC-ACC-002',
        description: 'Magnifique collier en perles traditionnelles africaines. Pièce unique pour compléter votre style.',
        short_description: 'Collier en perles africaines',
        category_id: categoryIds['accessoires'],
        price: 15000,
        stock_quantity: 12,
        track_stock: true,
        is_featured: false,
        status: 'published',
        published_at: new Date(),
        attributes: {
          couleur: 'Multicolore',
          matiere: 'Perles naturelles',
          longueur: '50 cm'
        }
      }
    ]

    for (const productData of products) {
      const [product, created] = await Product.findOrCreate({
        where: { sku: productData.sku },
        defaults: productData
      })
      
      if (created) {
        console.log(`✅ Produit créé: ${product.name} - ${product.price} CFA`)
      } else {
        console.log(`ℹ️  Produit existe: ${product.name}`)
      }
    }
  }

  static async seedAll() {
    try {
      console.log('🌱 Démarrage du seeding des données...')
      
      // Seed categories first
      const categoryIds = await this.seedCategories()
      
      // Then seed products with category references
      await this.seedProducts(categoryIds)
      
      console.log('✅ Seeding terminé avec succès!')
      
      return {
        success: true,
        categories: Object.keys(categoryIds).length,
        products: 10
      }
    } catch (error) {
      console.error('❌ Erreur lors du seeding:', error)
      throw error
    }
  }
}

module.exports = SeedData