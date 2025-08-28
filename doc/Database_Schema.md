# 🗄️ BabyChic Cameroun - Schema de Base de Données

> **Documentation complète du schéma PostgreSQL** - Structure, relations et optimisations

---

## 📋 Table des Matières

1. [Vue d'Ensemble](#vue-densemble)
2. [Tables Principales](#tables-principales)
3. [Relations et Associations](#relations-et-associations)
4. [Index et Optimisations](#index-et-optimisations)
5. [Vues Matérialisées](#vues-matérialisées)
6. [Triggers et Fonctions](#triggers-et-fonctions)
7. [Types de Données Personnalisés](#types-de-données-personnalisés)
8. [Contraintes et Validations](#contraintes-et-validations)
9. [Stratégie de Sauvegarde](#stratégie-de-sauvegarde)

---

## 🌐 Vue d'Ensemble

La base de données BabyChic utilise **PostgreSQL 12+** avec les fonctionnalités avancées :

- **JSONB** pour les données flexibles
- **UUIDs** pour les identifiants uniques
- **Index optimisés** pour les performances
- **Vues matérialisées** pour l'analytics
- **Contraintes métier** pour l'intégrité
- **Audit trail** pour le suivi des modifications

### Architecture Générale

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     USERS       │    │   CATEGORIES    │    │    PRODUCTS     │
│                 │    │                 │    │                 │
│ - Admins        │    │ - Hierarchique  │    │ - Catalogue     │
│ - Customers     │    │ - Nested        │    │ - Variants      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       └───────────┬───────────┘
         │                                   │
         │              ┌─────────────────┐  │
         │              │     ORDERS      │  │
         │              │                 │  │
         └──────────────│ - E-commerce    │──┘
                        │ - Checkout      │
                        │ - Tracking      │
                        └─────────────────┘
                                 │
                        ┌─────────────────┐
                        │   ORDER_ITEMS   │
                        │                 │
                        │ - Line items    │
                        │ - Product snap  │
                        └─────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    PAYMENTS     │    │   NEWSLETTER    │    │ CONTACT_MSGS    │
│                 │    │                 │    │                 │
│ - Transactions  │    │ - Subscriptions │    │ - Support       │
│ - Gateways      │    │ - Campaigns     │    │ - Feedback      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 🗃️ Tables Principales

### 👤 Users (Utilisateurs)

Gestion des comptes utilisateurs (admin et clients).

```sql
CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  role user_role DEFAULT 'customer' NOT NULL,
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true NOT NULL,
  last_login TIMESTAMP,
  avatar VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Type énuméré pour les rôles
CREATE TYPE user_role AS ENUM ('admin', 'customer');

-- Index pour les performances
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

-- Contraintes
ALTER TABLE users ADD CONSTRAINT email_format 
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE users ADD CONSTRAINT phone_format 
  CHECK (phone ~* '^(\+237|237)?[6-9][0-9]{8}$');

-- Trigger pour updated_at
CREATE TRIGGER users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
```

### 📂 Categories (Catégories)

Structure hiérarchique pour l'organisation des produits.

```sql
CREATE TABLE categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(120) NOT NULL UNIQUE,
  description TEXT,
  parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  image VARCHAR(500),
  is_active BOOLEAN DEFAULT true NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  meta_title VARCHAR(200),
  meta_description VARCHAR(300),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Index pour la hiérarchie et performances
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_is_active ON categories(is_active);
CREATE INDEX idx_categories_sort_order ON categories(sort_order);

-- Contrainte pour éviter les références circulaires
ALTER TABLE categories ADD CONSTRAINT no_self_reference 
  CHECK (id != parent_id);

-- Index composite pour les catégories actives triées
CREATE INDEX idx_categories_active_sorted ON categories(is_active, sort_order) 
  WHERE is_active = true;
```

### 🛍️ Products (Produits)

Catalogue complet des produits avec variantes et métadonnées.

```sql
CREATE TABLE products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(250) NOT NULL UNIQUE,
  description TEXT,
  short_description VARCHAR(500),
  sku VARCHAR(50) NOT NULL UNIQUE,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  original_price DECIMAL(10,2) CHECK (original_price >= 0),
  cost_price DECIMAL(10,2) CHECK (cost_price >= 0),
  stock_quantity INTEGER DEFAULT 0 NOT NULL CHECK (stock_quantity >= 0),
  low_stock_threshold INTEGER DEFAULT 5 NOT NULL,
  track_stock BOOLEAN DEFAULT true NOT NULL,
  weight DECIMAL(8,3) CHECK (weight >= 0),
  dimensions JSONB, -- {length, width, height} en cm
  images JSONB DEFAULT '[]'::jsonb NOT NULL,
  featured_image VARCHAR(500),
  category_id UUID NOT NULL REFERENCES categories(id),
  tags JSONB DEFAULT '[]'::jsonb NOT NULL,
  attributes JSONB DEFAULT '{}'::jsonb NOT NULL,
  variants JSONB DEFAULT '[]'::jsonb NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  is_featured BOOLEAN DEFAULT false NOT NULL,
  is_digital BOOLEAN DEFAULT false NOT NULL,
  status product_status DEFAULT 'draft' NOT NULL,
  published_at TIMESTAMP,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  meta_title VARCHAR(200),
  meta_description VARCHAR(300),
  rating_average DECIMAL(3,2) DEFAULT 0 CHECK (rating_average >= 0 AND rating_average <= 5),
  rating_count INTEGER DEFAULT 0 NOT NULL CHECK (rating_count >= 0),
  views_count INTEGER DEFAULT 0 NOT NULL CHECK (views_count >= 0),
  sales_count INTEGER DEFAULT 0 NOT NULL CHECK (sales_count >= 0),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Type énuméré pour le statut
CREATE TYPE product_status AS ENUM ('draft', 'published', 'archived');

-- Index principaux
CREATE UNIQUE INDEX idx_products_slug ON products(slug);
CREATE UNIQUE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_products_is_featured ON products(is_featured);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_stock_quantity ON products(stock_quantity);
CREATE INDEX idx_products_published_at ON products(published_at);
CREATE INDEX idx_products_rating_average ON products(rating_average);
CREATE INDEX idx_products_sales_count ON products(sales_count);

-- Index composites pour les requêtes fréquentes
CREATE INDEX idx_products_active_published ON products(is_active, status, published_at) 
  WHERE is_active = true AND status = 'published';

CREATE INDEX idx_products_category_active ON products(category_id, is_active, sort_order) 
  WHERE is_active = true;

-- Index GIN pour les recherches dans JSONB
CREATE INDEX idx_products_tags_gin ON products USING GIN (tags);
CREATE INDEX idx_products_attributes_gin ON products USING GIN (attributes);

-- Index de recherche textuelle
CREATE INDEX idx_products_search ON products USING GIN (
  to_tsvector('french', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(short_description, ''))
);

-- Contraintes métier
ALTER TABLE products ADD CONSTRAINT valid_price_relationship 
  CHECK (original_price IS NULL OR original_price >= price);

-- Trigger pour auto-générer le slug
CREATE OR REPLACE FUNCTION generate_product_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := lower(regexp_replace(
      regexp_replace(NEW.name, '[àáâãäå]', 'a', 'gi'),
      '[^a-z0-9\s-]', '', 'gi'
    ));
    NEW.slug := regexp_replace(NEW.slug, '\s+', '-', 'g');
  END IF;
  
  IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
    NEW.published_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_generate_slug 
  BEFORE INSERT OR UPDATE ON products 
  FOR EACH ROW 
  EXECUTE FUNCTION generate_product_slug();
```

### 📦 Orders (Commandes)

Gestion complète des commandes e-commerce.

```sql
CREATE TABLE orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_number VARCHAR(20) NOT NULL UNIQUE,
  status order_status DEFAULT 'pending' NOT NULL,
  
  -- Informations client
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  customer_first_name VARCHAR(50) NOT NULL,
  customer_last_name VARCHAR(50) NOT NULL,
  
  -- Adresses (JSONB pour flexibilité)
  billing_address JSONB NOT NULL,
  shipping_address JSONB NOT NULL,
  
  -- Totaux
  subtotal DECIMAL(10,2) DEFAULT 0 NOT NULL CHECK (subtotal >= 0),
  shipping_cost DECIMAL(10,2) DEFAULT 0 NOT NULL CHECK (shipping_cost >= 0),
  tax_amount DECIMAL(10,2) DEFAULT 0 NOT NULL CHECK (tax_amount >= 0),
  discount_amount DECIMAL(10,2) DEFAULT 0 NOT NULL CHECK (discount_amount >= 0),
  total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
  currency VARCHAR(3) DEFAULT 'XAF' NOT NULL,
  
  -- Paiement
  payment_status payment_status DEFAULT 'pending' NOT NULL,
  payment_method payment_method,
  payment_reference VARCHAR(100),
  
  -- Livraison
  shipping_method VARCHAR(50) DEFAULT 'standard' NOT NULL,
  tracking_number VARCHAR(50),
  
  -- Timestamps métier
  confirmed_at TIMESTAMP,
  shipped_at TIMESTAMP,
  delivered_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  
  -- Notes
  notes TEXT,
  admin_notes TEXT,
  cancellation_reason VARCHAR(200),
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Types énumérés
CREATE TYPE order_status AS ENUM (
  'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'
);

CREATE TYPE payment_status AS ENUM (
  'pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'
);

CREATE TYPE payment_method AS ENUM (
  'orange-money', 'mtn-momo', 'cash', 'bank-transfer'
);

-- Index principaux
CREATE UNIQUE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_customer_email ON orders(customer_email);
CREATE INDEX idx_orders_customer_phone ON orders(customer_phone);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_total_amount ON orders(total_amount);

-- Index composites pour analytics
CREATE INDEX idx_orders_status_date ON orders(status, created_at);
CREATE INDEX idx_orders_payment_date ON orders(payment_status, created_at);

-- Index GIN pour recherche dans adresses
CREATE INDEX idx_orders_billing_address ON orders USING GIN (billing_address);
CREATE INDEX idx_orders_shipping_address ON orders USING GIN (shipping_address);

-- Function pour générer le numéro de commande
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := 'BC' || TO_CHAR(NOW(), 'YYYYMMDD') || 
                        LPAD(EXTRACT(EPOCH FROM NOW())::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_generate_number 
  BEFORE INSERT ON orders 
  FOR EACH ROW 
  EXECUTE FUNCTION generate_order_number();

-- Trigger pour mise à jour des timestamps métier
CREATE OR REPLACE FUNCTION update_order_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- Mettre à jour les timestamps selon le changement de statut
  IF NEW.status != OLD.status THEN
    CASE NEW.status
      WHEN 'confirmed' THEN 
        NEW.confirmed_at := COALESCE(NEW.confirmed_at, NOW());
      WHEN 'shipped' THEN 
        NEW.shipped_at := COALESCE(NEW.shipped_at, NOW());
        -- Générer un numéro de suivi si pas fourni
        IF NEW.tracking_number IS NULL THEN
          NEW.tracking_number := 'BC-' || UPPER(SUBSTRING(MD5(NEW.id::TEXT), 1, 10));
        END IF;
      WHEN 'delivered' THEN 
        NEW.delivered_at := COALESCE(NEW.delivered_at, NOW());
      WHEN 'cancelled' THEN 
        NEW.cancelled_at := COALESCE(NEW.cancelled_at, NOW());
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_update_timestamps 
  BEFORE UPDATE ON orders 
  FOR EACH ROW 
  EXECUTE FUNCTION update_order_timestamps();
```

### 🛒 Order Items (Articles de Commande)

Détail des articles dans chaque commande avec snapshot du produit.

```sql
CREATE TABLE order_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  product_name VARCHAR(200) NOT NULL,
  product_sku VARCHAR(50) NOT NULL,
  variant_id VARCHAR(50), -- ID de la variante choisie
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
  product_snapshot JSONB NOT NULL, -- Snapshot complet du produit
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Index principaux
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_order_items_product_sku ON order_items(product_sku);

-- Index GIN pour recherche dans le snapshot
CREATE INDEX idx_order_items_snapshot ON order_items USING GIN (product_snapshot);

-- Contrainte pour cohérence prix
ALTER TABLE order_items ADD CONSTRAINT consistent_total_price 
  CHECK (total_price = unit_price * quantity);

-- Trigger pour calculer automatiquement le prix total
CREATE OR REPLACE FUNCTION calculate_order_item_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_price := NEW.unit_price * NEW.quantity;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER order_items_calculate_total 
  BEFORE INSERT OR UPDATE ON order_items 
  FOR EACH ROW 
  EXECUTE FUNCTION calculate_order_item_total();
```

### 💳 Payments (Paiements)

Suivi des transactions de paiement avec les fournisseurs.

```sql
CREATE TABLE payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) DEFAULT 'XAF' NOT NULL,
  method payment_method NOT NULL,
  status payment_status NOT NULL,
  reference VARCHAR(100), -- Référence externe
  transaction_id VARCHAR(100), -- ID transaction fournisseur
  provider_response JSONB, -- Réponse complète du fournisseur
  failure_reason VARCHAR(200),
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Index principaux
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_reference ON payments(reference);
CREATE INDEX idx_payments_transaction_id ON payments(transaction_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_method ON payments(method);
CREATE INDEX idx_payments_processed_at ON payments(processed_at);

-- Index composite pour analytics
CREATE INDEX idx_payments_status_date ON payments(status, created_at);
CREATE INDEX idx_payments_method_date ON payments(method, created_at);
```

### 📧 Newsletter (Abonnements Newsletter)

Gestion des abonnements à la newsletter avec préférences.

```sql
CREATE TABLE newsletter (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  first_name VARCHAR(50),
  is_active BOOLEAN DEFAULT true NOT NULL,
  preferences JSONB DEFAULT '{
    "new_products": true,
    "promotions": true,
    "tips": false
  }'::jsonb NOT NULL,
  confirmed_at TIMESTAMP,
  unsubscribed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Index principaux
CREATE UNIQUE INDEX idx_newsletter_email ON newsletter(email);
CREATE INDEX idx_newsletter_is_active ON newsletter(is_active);
CREATE INDEX idx_newsletter_confirmed_at ON newsletter(confirmed_at);

-- Index GIN pour recherche dans préférences
CREATE INDEX idx_newsletter_preferences ON newsletter USING GIN (preferences);
```

### 📞 Contact Messages (Messages de Contact)

Gestion des messages du formulaire de contact.

```sql
CREATE TABLE contact_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  subject VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false NOT NULL,
  admin_reply TEXT,
  replied_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Index principaux
CREATE INDEX idx_contact_messages_email ON contact_messages(email);
CREATE INDEX idx_contact_messages_is_read ON contact_messages(is_read);
CREATE INDEX idx_contact_messages_created_at ON contact_messages(created_at);
CREATE INDEX idx_contact_messages_replied_at ON contact_messages(replied_at);

-- Index de recherche textuelle
CREATE INDEX idx_contact_messages_search ON contact_messages USING GIN (
  to_tsvector('french', coalesce(name, '') || ' ' || coalesce(subject, '') || ' ' || coalesce(message, ''))
);
```

### 📨 Email Campaigns (Campagnes Email)

Gestion des campagnes email marketing.

```sql
CREATE TABLE email_campaigns (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  subject VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  template VARCHAR(50),
  status campaign_status DEFAULT 'draft' NOT NULL,
  target_audience JSONB DEFAULT '{}'::jsonb NOT NULL,
  scheduled_at TIMESTAMP,
  sent_at TIMESTAMP,
  total_recipients INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  bounced_count INTEGER DEFAULT 0,
  unsubscribed_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Type énuméré pour le statut de campagne
CREATE TYPE campaign_status AS ENUM ('draft', 'scheduled', 'sending', 'sent', 'cancelled');

-- Index principaux
CREATE INDEX idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX idx_email_campaigns_scheduled_at ON email_campaigns(scheduled_at);
CREATE INDEX idx_email_campaigns_sent_at ON email_campaigns(sent_at);

-- Index GIN pour recherche dans audience cible
CREATE INDEX idx_email_campaigns_target_audience ON email_campaigns USING GIN (target_audience);
```

---

## 🔗 Relations et Associations

### Diagramme des Relations

```sql
-- Relations principales
ALTER TABLE products ADD FOREIGN KEY (category_id) REFERENCES categories(id);
ALTER TABLE categories ADD FOREIGN KEY (parent_id) REFERENCES categories(id);
ALTER TABLE order_items ADD FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
ALTER TABLE order_items ADD FOREIGN KEY (product_id) REFERENCES products(id);
ALTER TABLE payments ADD FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
```

### Associations Sequelize

```javascript
// Dans models/associations.js
const User = require('./User');
const Product = require('./Product');
const Category = require('./Category');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const Payment = require('./Payment');
const Newsletter = require('./Newsletter');
const ContactMessage = require('./ContactMessage');
const EmailCampaign = require('./EmailCampaign');

// Product - Category (N:1)
Product.belongsTo(Category, {
  foreignKey: 'category_id',
  as: 'category'
});
Category.hasMany(Product, {
  foreignKey: 'category_id',
  as: 'products'
});

// Category - Category (Self-referential)
Category.belongsTo(Category, {
  foreignKey: 'parent_id',
  as: 'parent'
});
Category.hasMany(Category, {
  foreignKey: 'parent_id',
  as: 'children'
});

// Order - OrderItem (1:N)
Order.hasMany(OrderItem, {
  foreignKey: 'order_id',
  as: 'items'
});
OrderItem.belongsTo(Order, {
  foreignKey: 'order_id',
  as: 'order'
});

// Product - OrderItem (1:N)
Product.hasMany(OrderItem, {
  foreignKey: 'product_id',
  as: 'order_items'
});
OrderItem.belongsTo(Product, {
  foreignKey: 'product_id',
  as: 'product'
});

// Order - Payment (1:N)
Order.hasMany(Payment, {
  foreignKey: 'order_id',
  as: 'payments'
});
Payment.belongsTo(Order, {
  foreignKey: 'order_id',
  as: 'order'
});
```

---

## ⚡ Index et Optimisations

### Index de Performance Critiques

```sql
-- Index pour les requêtes de catalogue public
CREATE INDEX CONCURRENTLY idx_products_public_catalog ON products(
  category_id, is_active, status, price, published_at
) WHERE is_active = true AND status = 'published';

-- Index pour recherche produits avec stock
CREATE INDEX CONCURRENTLY idx_products_in_stock ON products(
  is_active, stock_quantity, price
) WHERE is_active = true AND (track_stock = false OR stock_quantity > 0);

-- Index pour dashboard admin - commandes récentes
CREATE INDEX CONCURRENTLY idx_orders_admin_dashboard ON orders(
  status, created_at DESC, total_amount
) WHERE created_at > NOW() - INTERVAL '30 days';

-- Index pour analytics - ventes par période
CREATE INDEX CONCURRENTLY idx_orders_sales_analytics ON orders(
  DATE_TRUNC('day', created_at), status, total_amount
) WHERE status IN ('delivered', 'completed');

-- Index partiel pour low stock alerts
CREATE INDEX CONCURRENTLY idx_products_low_stock ON products(
  category_id, stock_quantity, low_stock_threshold
) WHERE track_stock = true AND stock_quantity <= low_stock_threshold;
```

### Statistiques de Tables

```sql
-- Fonction pour mettre à jour les statistiques
CREATE OR REPLACE FUNCTION update_table_statistics()
RETURNS void AS $$
BEGIN
  ANALYZE users;
  ANALYZE products;
  ANALYZE categories;
  ANALYZE orders;
  ANALYZE order_items;
  ANALYZE payments;
  ANALYZE newsletter;
  ANALYZE contact_messages;
  ANALYZE email_campaigns;
END;
$$ LANGUAGE plpgsql;

-- Scheduler pour mise à jour quotidienne des statistiques
-- (À configurer avec pg_cron ou système externe)
```

---

## 📊 Vues Matérialisées

### Vue Analytics des Produits

```sql
CREATE MATERIALIZED VIEW mv_product_sales_analytics AS
SELECT 
  p.id as product_id,
  p.name as product_name,
  p.sku as product_sku,
  c.name as category_name,
  c.id as category_id,
  p.price as current_price,
  p.stock_quantity,
  
  -- Statistiques de vente
  COALESCE(SUM(oi.quantity), 0) as total_sold,
  COALESCE(SUM(oi.total_price), 0) as total_revenue,
  COALESCE(AVG(oi.unit_price), p.price) as avg_selling_price,
  
  -- Statistiques temporelles
  COUNT(DISTINCT o.id) as order_count,
  MIN(o.created_at) as first_sale_date,
  MAX(o.created_at) as last_sale_date,
  
  -- Métriques de performance
  p.views_count,
  CASE 
    WHEN p.views_count > 0 THEN 
      ROUND((COALESCE(SUM(oi.quantity), 0)::decimal / p.views_count) * 100, 2)
    ELSE 0 
  END as conversion_rate,
  
  -- Rentabilité
  CASE 
    WHEN p.cost_price IS NOT NULL AND p.cost_price > 0 THEN
      ROUND(((p.price - p.cost_price) / p.price) * 100, 2)
    ELSE NULL
  END as margin_percentage,
  
  -- Statut et flags
  p.is_active,
  p.is_featured,
  p.status,
  
  -- Timestamp de création de la vue
  NOW() as refreshed_at

FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN order_items oi ON p.id = oi.product_id
LEFT JOIN orders o ON oi.order_id = o.id AND o.status IN ('delivered', 'completed')
GROUP BY 
  p.id, p.name, p.sku, p.price, p.stock_quantity, p.cost_price,
  p.views_count, p.is_active, p.is_featured, p.status,
  c.id, c.name;

-- Index pour la vue matérialisée
CREATE UNIQUE INDEX idx_mv_product_sales_product_id 
  ON mv_product_sales_analytics(product_id);
CREATE INDEX idx_mv_product_sales_category 
  ON mv_product_sales_analytics(category_id);
CREATE INDEX idx_mv_product_sales_revenue 
  ON mv_product_sales_analytics(total_revenue DESC);
CREATE INDEX idx_mv_product_sales_conversion 
  ON mv_product_sales_analytics(conversion_rate DESC);
```

### Vue Résumé des Ventes Mensuelles

```sql
CREATE MATERIALIZED VIEW mv_monthly_sales_summary AS
SELECT 
  DATE_TRUNC('month', o.created_at) as month,
  EXTRACT(YEAR FROM o.created_at) as year,
  EXTRACT(MONTH FROM o.created_at) as month_number,
  
  -- Statistiques des commandes
  COUNT(*) as total_orders,
  COUNT(*) FILTER (WHERE o.status = 'delivered') as completed_orders,
  COUNT(*) FILTER (WHERE o.status = 'cancelled') as cancelled_orders,
  
  -- Métriques financières
  SUM(o.total_amount) as total_revenue,
  SUM(o.total_amount) FILTER (WHERE o.status = 'delivered') as completed_revenue,
  AVG(o.total_amount) as average_order_value,
  
  -- Métriques clients
  COUNT(DISTINCT o.customer_email) as unique_customers,
  
  -- Métriques produits
  SUM(oi.quantity) as total_items_sold,
  AVG(oi.quantity) as avg_items_per_order,
  
  -- Métriques de paiement
  COUNT(*) FILTER (WHERE o.payment_method = 'orange-money') as orange_money_orders,
  COUNT(*) FILTER (WHERE o.payment_method = 'mtn-momo') as mtn_momo_orders,
  COUNT(*) FILTER (WHERE o.payment_method = 'cash') as cash_orders,
  
  -- Performance temporelle
  AVG(EXTRACT(EPOCH FROM (o.confirmed_at - o.created_at))/3600) as avg_confirmation_time_hours,
  AVG(EXTRACT(EPOCH FROM (o.shipped_at - o.confirmed_at))/86400) as avg_shipping_time_days,
  
  -- Timestamp de création
  NOW() as refreshed_at

FROM orders o
JOIN order_items oi ON o.id = oi.order_id
WHERE o.created_at >= DATE_TRUNC('month', NOW() - INTERVAL '24 months')
GROUP BY DATE_TRUNC('month', o.created_at)
ORDER BY month DESC;

-- Index pour la vue mensuelle
CREATE UNIQUE INDEX idx_mv_monthly_sales_month 
  ON mv_monthly_sales_summary(month);
CREATE INDEX idx_mv_monthly_sales_year 
  ON mv_monthly_sales_summary(year, month_number);
```

### Vue Produits Populaires

```sql
CREATE MATERIALIZED VIEW mv_popular_products AS
SELECT 
  p.id,
  p.name,
  p.slug,
  p.price,
  p.featured_image,
  c.name as category_name,
  c.slug as category_slug,
  
  -- Métriques de popularité (30 derniers jours)
  COALESCE(recent_sales.quantity_sold, 0) as recent_sales_count,
  COALESCE(recent_sales.revenue, 0) as recent_revenue,
  p.views_count as total_views,
  p.rating_average,
  p.rating_count,
  
  -- Score de popularité pondéré
  (
    (COALESCE(recent_sales.quantity_sold, 0) * 0.4) +
    (LEAST(p.views_count / 100.0, 10) * 0.3) +
    (p.rating_average * p.rating_count * 0.2) +
    (CASE WHEN p.is_featured THEN 5 ELSE 0 END * 0.1)
  ) as popularity_score,
  
  NOW() as refreshed_at

FROM products p
JOIN categories c ON p.category_id = c.id
LEFT JOIN (
  SELECT 
    oi.product_id,
    SUM(oi.quantity) as quantity_sold,
    SUM(oi.total_price) as revenue
  FROM order_items oi
  JOIN orders o ON oi.order_id = o.id
  WHERE o.created_at >= NOW() - INTERVAL '30 days'
    AND o.status IN ('delivered', 'completed')
  GROUP BY oi.product_id
) recent_sales ON p.id = recent_sales.product_id

WHERE p.is_active = true AND p.status = 'published'
ORDER BY popularity_score DESC
LIMIT 100;

-- Index pour produits populaires
CREATE UNIQUE INDEX idx_mv_popular_products_id 
  ON mv_popular_products(id);
CREATE INDEX idx_mv_popular_products_score 
  ON mv_popular_products(popularity_score DESC);
CREATE INDEX idx_mv_popular_products_category 
  ON mv_popular_products(category_name);
```

### Fonction de Rafraîchissement des Vues

```sql
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_product_sales_analytics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_sales_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_popular_products;
  
  -- Log du rafraîchissement
  INSERT INTO system_logs(event_type, message, created_at) 
  VALUES ('materialized_views_refresh', 'All materialized views refreshed', NOW());
END;
$$ LANGUAGE plpgsql;
```

---

## 🔧 Triggers et Fonctions

### Fonction de Mise à Jour `updated_at`

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Application sur toutes les tables nécessaires
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER products_updated_at BEFORE UPDATE ON products 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER categories_updated_at BEFORE UPDATE ON categories 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Trigger de Mise à Jour des Compteurs

```sql
-- Fonction pour mettre à jour sales_count sur les produits
CREATE OR REPLACE FUNCTION update_product_sales_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Nouvelle vente
    IF EXISTS (
      SELECT 1 FROM orders o 
      WHERE o.id = NEW.order_id AND o.status IN ('delivered', 'completed')
    ) THEN
      UPDATE products 
      SET sales_count = sales_count + NEW.quantity
      WHERE id = NEW.product_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Mise à jour statut commande
    IF OLD.status != NEW.status THEN
      IF NEW.status IN ('delivered', 'completed') AND 
         OLD.status NOT IN ('delivered', 'completed') THEN
        -- Commande devient complétée
        UPDATE products p
        SET sales_count = sales_count + oi.quantity
        FROM order_items oi
        WHERE oi.order_id = NEW.id AND oi.product_id = p.id;
      ELSIF OLD.status IN ('delivered', 'completed') AND 
            NEW.status NOT IN ('delivered', 'completed') THEN
        -- Commande n'est plus complétée
        UPDATE products p
        SET sales_count = sales_count - oi.quantity
        FROM order_items oi
        WHERE oi.order_id = NEW.id AND oi.product_id = p.id;
      END IF;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_sales_count_trigger
  AFTER INSERT ON order_items
  FOR EACH ROW EXECUTE FUNCTION update_product_sales_count();

CREATE TRIGGER update_product_sales_count_on_order_status
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_product_sales_count();
```

### Trigger de Gestion des Stocks

```sql
CREATE OR REPLACE FUNCTION manage_product_stock()
RETURNS TRIGGER AS $$
DECLARE
  order_status VARCHAR(20);
BEGIN
  -- Récupérer le statut de la commande
  SELECT status INTO order_status FROM orders WHERE id = NEW.order_id;
  
  IF TG_OP = 'INSERT' AND order_status = 'confirmed' THEN
    -- Réserver le stock lors de la confirmation
    UPDATE products 
    SET stock_quantity = stock_quantity - NEW.quantity
    WHERE id = NEW.product_id AND track_stock = true;
    
    -- Vérifier si le stock est suffisant
    IF EXISTS (
      SELECT 1 FROM products 
      WHERE id = NEW.product_id AND stock_quantity < 0
    ) THEN
      RAISE EXCEPTION 'Stock insuffisant pour le produit %', NEW.product_name;
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Libérer le stock lors de l'annulation
    SELECT status INTO order_status FROM orders WHERE id = OLD.order_id;
    IF order_status = 'cancelled' THEN
      UPDATE products 
      SET stock_quantity = stock_quantity + OLD.quantity
      WHERE id = OLD.product_id AND track_stock = true;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER manage_product_stock_trigger
  AFTER INSERT OR DELETE ON order_items
  FOR EACH ROW EXECUTE FUNCTION manage_product_stock();
```

---

## 📝 Types de Données Personnalisés

### Types ENUM Utilisés

```sql
-- Rôles utilisateurs
CREATE TYPE user_role AS ENUM ('admin', 'customer');

-- Statuts de produits
CREATE TYPE product_status AS ENUM ('draft', 'published', 'archived');

-- Statuts de commandes
CREATE TYPE order_status AS ENUM (
  'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'
);

-- Statuts de paiements
CREATE TYPE payment_status AS ENUM (
  'pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'
);

-- Méthodes de paiement
CREATE TYPE payment_method AS ENUM (
  'orange-money', 'mtn-momo', 'cash', 'bank-transfer'
);

-- Statuts de campagnes email
CREATE TYPE campaign_status AS ENUM (
  'draft', 'scheduled', 'sending', 'sent', 'cancelled'
);
```

### Structures JSONB Standardisées

```sql
-- Structure d'adresse standardisée
COMMENT ON COLUMN orders.billing_address IS 
'Structure: {
  "street": "string",
  "city": "string", 
  "region": "string",
  "postal_code": "string",
  "country": "string",
  "additional_info": "string"
}';

-- Structure d'attributs produit
COMMENT ON COLUMN products.attributes IS 
'Structure: {
  "size": ["S", "M", "L"],
  "color": "string",
  "material": "string",
  "brand": "string",
  "age_range": "string",
  "gender": "string",
  "season": "string"
}';

-- Structure de variantes produit
COMMENT ON COLUMN products.variants IS 
'Structure: [
  {
    "id": "variant-1",
    "attributes": {"size": "S", "color": "Rouge"},
    "price": 25000.00,
    "stock": 10,
    "sku": "BC-VAR-001"
  }
]';

-- Structure de préférences newsletter
COMMENT ON COLUMN newsletter.preferences IS 
'Structure: {
  "new_products": boolean,
  "promotions": boolean, 
  "tips": boolean,
  "categories": ["category-id1", "category-id2"]
}';
```

---

## ✅ Contraintes et Validations

### Contraintes de Domaine

```sql
-- Validation des emails
CREATE DOMAIN email_type AS VARCHAR(255)
  CHECK (VALUE ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Validation des téléphones camerounais
CREATE DOMAIN phone_cm_type AS VARCHAR(20)
  CHECK (VALUE IS NULL OR VALUE ~* '^(\+237|237)?[6-9][0-9]{8}$');

-- Validation des prix
CREATE DOMAIN price_type AS DECIMAL(10,2)
  CHECK (VALUE >= 0);

-- Validation des quantités
CREATE DOMAIN quantity_type AS INTEGER
  CHECK (VALUE >= 0);

-- Utilisation des domaines
ALTER TABLE users ALTER COLUMN email TYPE email_type;
ALTER TABLE users ALTER COLUMN phone TYPE phone_cm_type;
ALTER TABLE products ALTER COLUMN price TYPE price_type;
ALTER TABLE products ALTER COLUMN stock_quantity TYPE quantity_type;
```

### Contraintes Métier Complexes

```sql
-- Contrainte sur les dates de commande
ALTER TABLE orders ADD CONSTRAINT valid_order_dates
  CHECK (
    (confirmed_at IS NULL OR confirmed_at >= created_at) AND
    (shipped_at IS NULL OR shipped_at >= COALESCE(confirmed_at, created_at)) AND
    (delivered_at IS NULL OR delivered_at >= COALESCE(shipped_at, confirmed_at, created_at)) AND
    (cancelled_at IS NULL OR cancelled_at >= created_at)
  );

-- Contrainte sur la cohérence prix original vs prix de vente
ALTER TABLE products ADD CONSTRAINT valid_pricing
  CHECK (
    (original_price IS NULL OR original_price >= price) AND
    (cost_price IS NULL OR cost_price <= price)
  );

-- Contrainte sur les notes (1-5)
ALTER TABLE products ADD CONSTRAINT valid_rating
  CHECK (rating_average >= 0 AND rating_average <= 5);

-- Contrainte sur les variants JSONB
ALTER TABLE products ADD CONSTRAINT valid_variants_structure
  CHECK (
    jsonb_typeof(variants) = 'array' AND
    (
      variants = '[]'::jsonb OR
      (variants->0) ? 'id' AND
      (variants->0) ? 'attributes' AND
      (variants->0) ? 'price'
    )
  );
```

---

## 🗄️ Stratégie de Sauvegarde

### Configuration de Sauvegarde

```sql
-- Vue pour monitoring des tailles de tables
CREATE VIEW db_table_sizes AS
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename))) as size,
  pg_total_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename)) as size_bytes
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY size_bytes DESC;

-- Fonction de sauvegarde sélective
CREATE OR REPLACE FUNCTION backup_critical_tables()
RETURNS void AS $$
BEGIN
  -- Cette fonction serait utilisée par un script externe
  -- pour sauvegarder les tables critiques
  RAISE NOTICE 'Backup should be performed by external tool';
  RAISE NOTICE 'Critical tables: users, products, orders, order_items, payments';
END;
$$ LANGUAGE plpgsql;
```

### Stratégie de Rétention

```sql
-- Table de logs système pour audit
CREATE TABLE system_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Index pour les logs
CREATE INDEX idx_system_logs_event_type ON system_logs(event_type);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at);

-- Fonction de nettoyage des logs anciens
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM system_logs 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  INSERT INTO system_logs(event_type, message, metadata) 
  VALUES (
    'log_cleanup', 
    'Cleaned up old system logs',
    jsonb_build_object('deleted_count', deleted_count)
  );
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
```

---

## 🔍 Requêtes d'Optimisation

### Surveillance des Performances

```sql
-- Vue pour identifier les requêtes lentes
CREATE VIEW slow_queries AS
SELECT 
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  rows,
  100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
WHERE total_exec_time > 1000  -- Plus de 1 seconde au total
ORDER BY total_exec_time DESC;

-- Vue pour surveiller les index non utilisés
CREATE VIEW unused_indexes AS
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes 
WHERE idx_scan < 10
  AND pg_relation_size(indexrelid) > 65536  -- Plus de 64KB
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Maintenance Automatique

```sql
-- Fonction de maintenance hebdomadaire
CREATE OR REPLACE FUNCTION weekly_maintenance()
RETURNS void AS $$
BEGIN
  -- Réindexation des tables principales
  REINDEX TABLE products;
  REINDEX TABLE orders;
  REINDEX TABLE order_items;
  
  -- Mise à jour des statistiques
  ANALYZE;
  
  -- Rafraîchissement des vues matérialisées
  PERFORM refresh_materialized_views();
  
  -- Nettoyage des logs
  PERFORM cleanup_old_logs();
  
  -- Log de la maintenance
  INSERT INTO system_logs(event_type, message) 
  VALUES ('weekly_maintenance', 'Weekly maintenance completed');
END;
$$ LANGUAGE plpgsql;
```

---

**© 2024 BabyChic Cameroun - Documentation Base de Données v1.0**

*Cette documentation est maintenue avec chaque évolution du schéma*