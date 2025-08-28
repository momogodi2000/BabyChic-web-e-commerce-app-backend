const { QueryTypes } = require('sequelize')
const sequelize = require('../config/database')

class DatabaseOptimizations {
  
  // Create indexes for better query performance
  static async createOptimizedIndexes() {
    try {
      console.log('🔍 Creating optimized database indexes...')
      
      // Products table indexes for e-commerce queries
      const productIndexes = [
        // Composite index for category + status + featured queries
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_category_status_featured ON products(category_id, status, is_featured) WHERE status = \'active\'',
        
        // Index for price range queries
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_price_status ON products(price, status) WHERE status = \'active\'',
        
        // Full-text search index for product search
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_search ON products USING GIN(to_tsvector(\'french\', name || \' \' || COALESCE(description, \'\')))',
        
        // Index for stock management
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_stock ON products(stock_quantity, status) WHERE status = \'active\'',
        
        // Index for product slug (SEO)
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_slug ON products(slug) WHERE status = \'active\'',
      ]

      // Orders table indexes for order management
      const orderIndexes = [
        // Composite index for order status and date queries
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status_date ON orders(status, created_at DESC)',
        
        // Index for customer orders
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_customer_date ON orders(customer_email, created_at DESC)',
        
        // Index for order tracking
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_tracking ON orders(tracking_number) WHERE tracking_number IS NOT NULL',
      ]

      // Newsletter table indexes
      const newsletterIndexes = [
        // Index for active subscribers
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_newsletter_active ON newsletter_subscriptions(status, confirmed_at) WHERE status = \'active\'',
        
        // Index for email lookup
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_newsletter_email ON newsletter_subscriptions(email)',
      ]

      // Contact messages indexes
      const contactIndexes = [
        // Index for unread messages
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contact_unread ON contact_messages(status, created_at DESC) WHERE status = \'unread\'',
        
        // Index for priority messages
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contact_priority ON contact_messages(priority, created_at DESC)',
      ]

      // Execute all indexes
      const allIndexes = [
        ...productIndexes,
        ...orderIndexes,
        ...newsletterIndexes,
        ...contactIndexes
      ]

      for (const index of allIndexes) {
        try {
          await sequelize.query(index, { type: QueryTypes.RAW })
          console.log(`✅ Index created: ${index.substring(0, 50)}...`)
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(`⏭️  Index already exists: ${index.substring(0, 50)}...`)
          } else {
            console.error(`❌ Error creating index: ${error.message}`)
          }
        }
      }

      console.log('✅ Database indexes optimization completed')
    } catch (error) {
      console.error('❌ Error creating database indexes:', error)
    }
  }

  // Create materialized views for complex analytics
  static async createMaterializedViews() {
    try {
      console.log('📊 Creating materialized views for analytics...')

      // Product sales analytics view
      const productAnalyticsView = `
        CREATE MATERIALIZED VIEW IF NOT EXISTS product_sales_analytics AS
        SELECT 
          p.id,
          p.name,
          p.price,
          c.name as category_name,
          COUNT(oi.id) as total_sales,
          COALESCE(SUM(oi.quantity), 0) as total_quantity_sold,
          COALESCE(SUM(oi.price * oi.quantity), 0) as total_revenue,
          AVG(oi.price) as average_selling_price,
          MAX(o.created_at) as last_sale_date
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN order_items oi ON p.id = oi.product_id
        LEFT JOIN orders o ON oi.order_id = o.id AND o.status IN ('completed', 'delivered')
        WHERE p.status = 'active'
        GROUP BY p.id, p.name, p.price, c.name
        ORDER BY total_revenue DESC
      `

      // Monthly sales summary view
      const monthlySalesView = `
        CREATE MATERIALIZED VIEW IF NOT EXISTS monthly_sales_summary AS
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          COUNT(*) as total_orders,
          SUM(total_amount) as total_revenue,
          AVG(total_amount) as average_order_value,
          COUNT(DISTINCT customer_email) as unique_customers
        FROM orders 
        WHERE status IN ('completed', 'delivered')
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month DESC
      `

      // Popular products view
      const popularProductsView = `
        CREATE MATERIALIZED VIEW IF NOT EXISTS popular_products AS
        SELECT 
          p.id,
          p.name,
          p.slug,
          p.price,
          p.images,
          c.name as category_name,
          COUNT(oi.id) as order_count,
          SUM(oi.quantity) as total_sold
        FROM products p
        JOIN categories c ON p.category_id = c.id
        JOIN order_items oi ON p.id = oi.product_id
        JOIN orders o ON oi.order_id = o.id
        WHERE p.status = 'active' 
          AND o.status IN ('completed', 'delivered')
          AND o.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY p.id, p.name, p.slug, p.price, p.images, c.name
        HAVING COUNT(oi.id) >= 2
        ORDER BY total_sold DESC, order_count DESC
        LIMIT 50
      `

      const views = [productAnalyticsView, monthlySalesView, popularProductsView]

      for (const view of views) {
        try {
          await sequelize.query(view, { type: QueryTypes.RAW })
          console.log(`✅ Materialized view created`)
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(`⏭️  Materialized view already exists`)
          } else {
            console.error(`❌ Error creating materialized view: ${error.message}`)
          }
        }
      }

      console.log('✅ Materialized views created successfully')
    } catch (error) {
      console.error('❌ Error creating materialized views:', error)
    }
  }

  // Refresh materialized views (should be done periodically)
  static async refreshMaterializedViews() {
    try {
      const views = [
        'product_sales_analytics',
        'monthly_sales_summary', 
        'popular_products'
      ]

      for (const view of views) {
        try {
          await sequelize.query(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${view}`, {
            type: QueryTypes.RAW
          })
          console.log(`✅ Refreshed materialized view: ${view}`)
        } catch (error) {
          console.error(`❌ Error refreshing ${view}:`, error.message)
        }
      }
    } catch (error) {
      console.error('❌ Error refreshing materialized views:', error)
    }
  }

  // Database maintenance and cleanup
  static async performMaintenance() {
    try {
      console.log('🧹 Performing database maintenance...')

      // Analyze tables for better query planning
      const tables = ['products', 'orders', 'order_items', 'categories', 'users', 'newsletter_subscriptions', 'contact_messages']
      
      for (const table of tables) {
        try {
          await sequelize.query(`ANALYZE ${table}`, { type: QueryTypes.RAW })
          console.log(`✅ Analyzed table: ${table}`)
        } catch (error) {
          console.error(`❌ Error analyzing ${table}:`, error.message)
        }
      }

      // Clean up old sessions and temporary data
      await this.cleanupOldData()

      console.log('✅ Database maintenance completed')
    } catch (error) {
      console.error('❌ Error during database maintenance:', error)
    }
  }

  // Clean up old data
  static async cleanupOldData() {
    try {
      // Clean up old contact messages marked as archived (older than 1 year)
      const oldContactsCleanup = await sequelize.query(`
        DELETE FROM contact_messages 
        WHERE status = 'archived' 
          AND created_at < NOW() - INTERVAL '1 year'
      `, { type: QueryTypes.DELETE })

      console.log(`🗑️  Cleaned up ${oldContactsCleanup[1]} old contact messages`)

      // Clean up unconfirmed newsletter subscriptions (older than 30 days)
      const oldNewsletterCleanup = await sequelize.query(`
        DELETE FROM newsletter_subscriptions 
        WHERE confirmed_at IS NULL 
          AND created_at < NOW() - INTERVAL '30 days'
      `, { type: QueryTypes.DELETE })

      console.log(`🗑️  Cleaned up ${oldNewsletterCleanup[1]} unconfirmed newsletter subscriptions`)

    } catch (error) {
      console.error('❌ Error during cleanup:', error)
    }
  }

  // Get database performance statistics
  static async getPerformanceStats() {
    try {
      const stats = await sequelize.query(`
        SELECT 
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats 
        WHERE schemaname = 'public'
          AND tablename IN ('products', 'orders', 'order_items')
        ORDER BY tablename, attname
      `, { type: QueryTypes.SELECT })

      return stats
    } catch (error) {
      console.error('❌ Error getting performance stats:', error)
      return []
    }
  }

  // Initialize all optimizations
  static async initializeOptimizations() {
    console.log('🚀 Initializing database optimizations...')
    
    await this.createOptimizedIndexes()
    await this.createMaterializedViews()
    await this.performMaintenance()
    
    console.log('✅ Database optimizations completed!')
  }
}

module.exports = DatabaseOptimizations
