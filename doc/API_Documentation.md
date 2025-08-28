# 🛍️ BabyChic Cameroun - API Documentation

> **Documentation complète de l'API REST** - Guide technique détaillé pour les développeurs

---

## 📋 Table des Matières

1. [Introduction](#introduction)
2. [Base URL et Authentification](#base-url-et-authentification)
3. [Codes de Réponse HTTP](#codes-de-réponse-http)
4. [Structure des Réponses](#structure-des-réponses)
5. [Authentification](#authentification)
6. [Endpoints API](#endpoints-api)
   - [Authentification](#auth-endpoints)
   - [Produits](#produits-endpoints)
   - [Catégories](#catégories-endpoints)
   - [Commandes](#commandes-endpoints)
   - [Paiements](#paiements-endpoints)
   - [Public](#public-endpoints)
7. [Modèles de Données](#modèles-de-données)
8. [Gestion des Erreurs](#gestion-des-erreurs)
9. [Rate Limiting](#rate-limiting)
10. [Pagination](#pagination)
11. [Filtrage et Tri](#filtrage-et-tri)

---

## 🌐 Introduction

L'API BabyChic Cameroun est une API RESTful qui permet l'interaction avec la plateforme e-commerce. Elle fournit des endpoints pour la gestion des produits, commandes, paiements, et l'administration de la boutique.

### Caractéristiques Principales

- **API RESTful** avec support JSON
- **Authentification JWT** sécurisée
- **Rate limiting** pour la protection
- **Validation** complète des données
- **Documentation** interactive Swagger
- **Support multilingue** (FR/EN)
- **Gestion d'erreurs** standardisée

---

## 🔗 Base URL et Authentification

### Base URL

```
Production:  https://api.babychic.cm/api
Development: http://localhost:5000/api
```

### Headers Requis

```http
Content-Type: application/json
Authorization: Bearer <jwt_token>  # Pour les routes protégées
Accept: application/json
```

---

## 📊 Codes de Réponse HTTP

| Code | Status | Description |
|------|--------|-------------|
| 200 | OK | Requête réussie |
| 201 | Created | Ressource créée avec succès |
| 400 | Bad Request | Données invalides |
| 401 | Unauthorized | Authentification requise |
| 403 | Forbidden | Permissions insuffisantes |
| 404 | Not Found | Ressource non trouvée |
| 409 | Conflict | Conflit (ressource existe déjà) |
| 422 | Unprocessable Entity | Erreur de validation |
| 429 | Too Many Requests | Rate limit dépassé |
| 500 | Internal Server Error | Erreur serveur |

---

## 📋 Structure des Réponses

### Réponse de Succès

```json
{
  "success": true,
  "data": {
    // Données de la réponse
  },
  "message": "Opération réussie",
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0.0"
  }
}
```

### Réponse d'Erreur

```json
{
  "success": false,
  "error": "Message d'erreur principal",
  "details": [
    {
      "field": "email",
      "message": "Format d'email invalide"
    }
  ],
  "code": "VALIDATION_ERROR",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Réponse avec Pagination

```json
{
  "success": true,
  "data": [
    // Array d'éléments
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "per_page": 10,
    "total_items": 50,
    "has_next": true,
    "has_prev": false
  }
}
```

---

## 🔐 Authentification

L'API utilise JWT (JSON Web Tokens) pour l'authentification.

### Workflow d'Authentification

1. **Login** avec email/password → Récupération du JWT
2. **Inclusion** du token dans l'header `Authorization: Bearer <token>`
3. **Validation** automatique sur chaque requête protégée

### Token JWT Structure

```json
{
  "userId": "uuid-user-id",
  "email": "user@example.com",
  "role": "admin|customer",
  "iat": 1642248000,
  "exp": 1642334400
}
```

---

## 🚀 Endpoints API

## <a id="auth-endpoints"></a>🔑 Authentification

### POST /auth/login

Connexion utilisateur avec email et mot de passe.

**Request:**
```json
{
  "email": "admin@babychic.cm",
  "password": "motdepasse123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid-user-id",
      "email": "admin@babychic.cm",
      "first_name": "Admin",
      "last_name": "BabyChic",
      "role": "admin",
      "is_active": true,
      "last_login": "2024-01-15T10:30:00Z"
    },
    "expires_in": "24h"
  },
  "message": "Connexion réussie"
}
```

**Validation Rules:**
- `email`: Required, valid email format
- `password`: Required, minimum 6 characters

**Error Responses:**
- `400`: Données invalides
- `401`: Email ou mot de passe incorrect
- `403`: Compte désactivé

### POST /auth/logout

Déconnexion utilisateur (invalide le token côté client).

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Déconnexion réussie"
}
```

### GET /auth/me

Récupération des informations utilisateur connecté.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-user-id",
    "email": "admin@babychic.cm",
    "first_name": "Admin",
    "last_name": "BabyChic",
    "role": "admin",
    "phone": "+237600000000",
    "is_active": true,
    "avatar": "https://example.com/avatar.jpg",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

---

## <a id="produits-endpoints"></a>🛍️ Produits (Admin)

### GET /products

Récupération de tous les produits (admin uniquement).

**Headers:** `Authorization: Bearer <admin_token>`

**Query Parameters:**
- `page` (number): Page courante (défaut: 1)
- `limit` (number): Éléments par page (défaut: 10, max: 100)
- `search` (string): Recherche textuelle
- `category` (uuid): ID de catégorie
- `status` (enum): `draft|published|archived`
- `sort` (string): Tri (`name`, `price`, `created_at`, `sales_count`)
- `order` (string): Ordre (`asc|desc`)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-product-id",
      "name": "Robe Bébé Fille Rose",
      "slug": "robe-bebe-fille-rose",
      "description": "Description complète du produit...",
      "short_description": "Description courte",
      "sku": "BC-ROB-001",
      "price": 15000.00,
      "original_price": 18000.00,
      "stock_quantity": 25,
      "low_stock_threshold": 5,
      "track_stock": true,
      "weight": 0.250,
      "dimensions": {
        "length": 30,
        "width": 25,
        "height": 2
      },
      "images": [
        "https://example.com/product1.jpg",
        "https://example.com/product2.jpg"
      ],
      "featured_image": "https://example.com/product1.jpg",
      "category": {
        "id": "uuid-category-id",
        "name": "Robes Bébé",
        "slug": "robes-bebe"
      },
      "tags": ["bébé", "fille", "robe", "rose"],
      "attributes": {
        "size": ["0-3M", "3-6M", "6-12M"],
        "color": "Rose",
        "material": "Coton 100%",
        "brand": "BabyChic"
      },
      "variants": [
        {
          "id": "variant-1",
          "size": "0-3M",
          "price": 15000.00,
          "stock": 10
        }
      ],
      "is_active": true,
      "is_featured": false,
      "is_digital": false,
      "status": "published",
      "published_at": "2024-01-01T00:00:00Z",
      "sort_order": 0,
      "meta_title": "Robe Bébé Fille Rose - BabyChic",
      "meta_description": "Magnifique robe pour bébé fille...",
      "rating_average": 4.50,
      "rating_count": 12,
      "views_count": 256,
      "sales_count": 8,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 3,
    "per_page": 10,
    "total_items": 25
  }
}
```

### POST /products

Création d'un nouveau produit (admin uniquement).

**Headers:** `Authorization: Bearer <admin_token>`

**Request:**
```json
{
  "name": "Nouveau Produit",
  "description": "Description complète du produit",
  "short_description": "Description courte",
  "price": 25000.00,
  "original_price": 30000.00,
  "stock_quantity": 50,
  "category_id": "uuid-category-id",
  "tags": ["nouveau", "tendance"],
  "attributes": {
    "size": ["S", "M", "L"],
    "color": "Bleu",
    "material": "Coton"
  },
  "is_featured": true,
  "status": "published"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    // Objet produit créé complet
  },
  "message": "Produit créé avec succès"
}
```

**Validation Rules:**
- `name`: Required, 2-200 characters
- `price`: Required, positive number
- `category_id`: Required, valid UUID
- `stock_quantity`: Required, non-negative integer
- `status`: Optional, enum: `draft|published|archived`

### GET /products/:id

Récupération d'un produit spécifique par ID.

**Headers:** `Authorization: Bearer <admin_token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    // Objet produit complet (voir structure GET /products)
  }
}
```

### PUT /products/:id

Mise à jour d'un produit existant.

**Headers:** `Authorization: Bearer <admin_token>`

**Request:** Mêmes champs que POST, tous optionnels

**Response (200):**
```json
{
  "success": true,
  "data": {
    // Objet produit mis à jour
  },
  "message": "Produit mis à jour avec succès"
}
```

### DELETE /products/:id

Suppression d'un produit.

**Headers:** `Authorization: Bearer <admin_token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Produit supprimé avec succès"
}
```

---

## <a id="catégories-endpoints"></a>📂 Catégories (Admin)

### GET /categories

Récupération de toutes les catégories.

**Headers:** `Authorization: Bearer <admin_token>`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-category-id",
      "name": "Vêtements Bébé",
      "slug": "vetements-bebe",
      "description": "Tous les vêtements pour bébé",
      "parent_id": null,
      "image": "https://example.com/category.jpg",
      "is_active": true,
      "sort_order": 1,
      "products_count": 45,
      "children": [
        {
          "id": "uuid-child-id",
          "name": "Robes Bébé",
          "slug": "robes-bebe",
          "products_count": 12
        }
      ],
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

## <a id="commandes-endpoints"></a>📦 Commandes (Admin)

### GET /orders

Récupération de toutes les commandes.

**Headers:** `Authorization: Bearer <admin_token>`

**Query Parameters:**
- `status` (enum): Filtrer par statut
- `payment_status` (enum): Filtrer par statut de paiement
- `date_from` (date): Date de début
- `date_to` (date): Date de fin

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-order-id",
      "order_number": "BC20240115001234",
      "status": "confirmed",
      "payment_status": "completed",
      "customer_email": "client@example.com",
      "customer_phone": "+237600000000",
      "customer_first_name": "Jean",
      "customer_last_name": "Dupont",
      "billing_address": {
        "street": "123 Rue Example",
        "city": "Yaoundé",
        "region": "Centre",
        "postal_code": "12345",
        "country": "Cameroun"
      },
      "shipping_address": {
        "street": "123 Rue Example",
        "city": "Yaoundé",
        "region": "Centre",
        "postal_code": "12345",
        "country": "Cameroun"
      },
      "subtotal": 45000.00,
      "shipping_cost": 2000.00,
      "tax_amount": 0.00,
      "discount_amount": 0.00,
      "total_amount": 47000.00,
      "currency": "XAF",
      "payment_method": "orange-money",
      "payment_reference": "OM123456789",
      "shipping_method": "standard",
      "tracking_number": null,
      "items": [
        {
          "id": "uuid-item-id",
          "product_id": "uuid-product-id",
          "product_name": "Robe Bébé Fille Rose",
          "product_sku": "BC-ROB-001",
          "quantity": 2,
          "unit_price": 15000.00,
          "total_price": 30000.00,
          "product_snapshot": {
            // Snapshot complet du produit au moment de la commande
          }
        }
      ],
      "notes": "Livraison rapide souhaitée",
      "admin_notes": null,
      "confirmed_at": "2024-01-15T10:30:00Z",
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "per_page": 20,
    "total_items": 95
  }
}
```

### GET /orders/:id

Récupération d'une commande spécifique.

**Headers:** `Authorization: Bearer <admin_token>`

**Response (200):** Structure complète comme GET /orders

### PATCH /orders/:id/status

Mise à jour du statut d'une commande.

**Headers:** `Authorization: Bearer <admin_token>`

**Request:**
```json
{
  "status": "shipped",
  "tracking_number": "BC-TRACK-123456",
  "admin_notes": "Expédié via DHL"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    // Commande mise à jour
  },
  "message": "Statut de commande mis à jour"
}
```

**Statuts Valides:**
- `pending` → `confirmed`, `cancelled`
- `confirmed` → `processing`, `cancelled`
- `processing` → `shipped`, `cancelled`
- `shipped` → `delivered`
- `delivered` → Final
- `cancelled` → Final

---

## <a id="paiements-endpoints"></a>💳 Paiements (Admin)

### GET /payments

Récupération de tous les paiements.

**Headers:** `Authorization: Bearer <admin_token>`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-payment-id",
      "order_id": "uuid-order-id",
      "amount": 47000.00,
      "currency": "XAF",
      "method": "orange-money",
      "status": "completed",
      "reference": "OM123456789",
      "transaction_id": "TXN-789456123",
      "provider_response": {
        // Réponse complète du fournisseur
      },
      "processed_at": "2024-01-15T10:30:00Z",
      "created_at": "2024-01-15T10:00:00Z"
    }
  ]
}
```

---

## <a id="public-endpoints"></a>🌐 Public (Sans Authentification)

### GET /public/products

Catalogue produits public avec filtres.

**Query Parameters:**
- `page`, `limit`: Pagination
- `category`: Filtre par catégorie
- `search`: Recherche textuelle
- `min_price`, `max_price`: Fourchette de prix
- `sort`: Tri (popularity, price_asc, price_desc, newest)
- `featured`: Produits vedettes uniquement

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-product-id",
      "name": "Robe Bébé Fille Rose",
      "slug": "robe-bebe-fille-rose",
      "short_description": "Magnifique robe...",
      "price": 15000.00,
      "original_price": 18000.00,
      "featured_image": "https://example.com/product1.jpg",
      "images": ["url1", "url2"],
      "category": {
        "id": "uuid",
        "name": "Robes Bébé",
        "slug": "robes-bebe"
      },
      "rating_average": 4.5,
      "rating_count": 12,
      "is_in_stock": true,
      "discount_percentage": 17
    }
  ]
}
```

### GET /public/products/:slug

Détail d'un produit public par slug.

**Response (200):**
```json
{
  "success": true,
  "data": {
    // Structure complète du produit (sans données admin)
    "related_products": [
      // 4 produits similaires
    ]
  }
}
```

### GET /public/categories

Récupération des catégories publiques actives.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Vêtements Bébé",
      "slug": "vetements-bebe",
      "description": "Description...",
      "image": "https://example.com/cat.jpg",
      "products_count": 45,
      "children": [
        // Sous-catégories
      ]
    }
  ]
}
```

### POST /public/orders

Création d'une commande publique (sans compte).

**Request:**
```json
{
  "customer": {
    "email": "client@example.com",
    "phone": "+237600000000",
    "first_name": "Jean",
    "last_name": "Dupont"
  },
  "billing_address": {
    "street": "123 Rue Example",
    "city": "Yaoundé",
    "region": "Centre",
    "postal_code": "12345",
    "country": "Cameroun"
  },
  "shipping_address": {
    // Même structure ou null si identique
  },
  "items": [
    {
      "product_id": "uuid-product-id",
      "quantity": 2,
      "variant_id": "variant-1" // Optionnel
    }
  ],
  "payment_method": "orange-money",
  "shipping_method": "standard",
  "notes": "Instructions spéciales..."
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "order": {
      // Commande créée avec order_number
    },
    "payment_url": "https://payment.provider.com/pay?token=xxx",
    "expires_at": "2024-01-15T11:00:00Z"
  },
  "message": "Commande créée avec succès"
}
```

### POST /public/contact

Formulaire de contact public.

**Request:**
```json
{
  "name": "Jean Dupont",
  "email": "jean@example.com",
  "phone": "+237600000000",
  "subject": "Question produit",
  "message": "Bonjour, j'aimerais savoir..."
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Message envoyé avec succès. Nous vous répondrons rapidement."
}
```

### POST /public/newsletter

Inscription à la newsletter.

**Request:**
```json
{
  "email": "client@example.com",
  "first_name": "Jean",
  "preferences": {
    "new_products": true,
    "promotions": true,
    "tips": false
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Inscription à la newsletter réussie"
}
```

---

## 📊 Modèles de Données

### User (Utilisateur)

```typescript
interface User {
  id: string;                    // UUID
  email: string;                 // Email unique
  password: string;              // Hash bcrypt
  first_name: string;            // 2-50 chars
  last_name: string;             // 2-50 chars  
  role: 'admin' | 'customer';    // Rôle
  phone?: string;                // Format camerounais
  is_active: boolean;            // Compte actif
  last_login?: Date;             // Dernière connexion
  avatar?: string;               // URL avatar
  created_at: Date;
  updated_at: Date;
}
```

### Product (Produit)

```typescript
interface Product {
  id: string;                    // UUID
  name: string;                  // 2-200 chars
  slug: string;                  // URL-friendly, unique
  description?: string;          // Description complète
  short_description?: string;    // Max 500 chars
  sku: string;                   // Code produit unique
  price: number;                 // Prix actuel
  original_price?: number;       // Prix barré
  cost_price?: number;           // Prix de revient
  stock_quantity: number;        // Quantité en stock
  low_stock_threshold: number;   // Seuil stock bas
  track_stock: boolean;          // Suivi du stock
  weight?: number;               // Poids en kg
  dimensions?: {                 // Dimensions en cm
    length: number;
    width: number;
    height: number;
  };
  images: string[];              // URLs des images
  featured_image?: string;       // Image principale
  category_id: string;           // UUID catégorie
  tags: string[];                // Tags de recherche
  attributes: {                  // Attributs personnalisés
    [key: string]: any;
  };
  variants: ProductVariant[];    // Variantes du produit
  is_active: boolean;            // Produit actif
  is_featured: boolean;          // Produit vedette
  is_digital: boolean;           // Produit numérique
  status: 'draft' | 'published' | 'archived';
  published_at?: Date;           // Date de publication
  sort_order: number;            // Ordre de tri
  meta_title?: string;           // SEO title
  meta_description?: string;     // SEO description
  rating_average: number;        // Note moyenne (0-5)
  rating_count: number;          // Nombre d'avis
  views_count: number;           // Nombre de vues
  sales_count: number;           // Nombre de ventes
  created_at: Date;
  updated_at: Date;
}

interface ProductVariant {
  id: string;
  attributes: { [key: string]: string };
  price: number;
  stock: number;
  sku?: string;
}
```

### Category (Catégorie)

```typescript
interface Category {
  id: string;                    // UUID
  name: string;                  // Nom unique
  slug: string;                  // URL-friendly
  description?: string;          // Description
  parent_id?: string;            // Catégorie parent
  image?: string;                // Image de catégorie
  is_active: boolean;            // Catégorie active
  sort_order: number;            // Ordre d'affichage
  created_at: Date;
  updated_at: Date;
}
```

### Order (Commande)

```typescript
interface Order {
  id: string;                    // UUID
  order_number: string;          // Numéro unique
  status: OrderStatus;           // Statut commande
  
  // Client
  customer_email: string;
  customer_phone: string;
  customer_first_name: string;
  customer_last_name: string;
  
  // Adresses
  billing_address: Address;
  shipping_address: Address;
  
  // Totaux
  subtotal: number;
  shipping_cost: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  currency: string;              // XAF
  
  // Paiement
  payment_status: PaymentStatus;
  payment_method?: PaymentMethod;
  payment_reference?: string;
  
  // Livraison
  shipping_method: string;
  tracking_number?: string;
  
  // Timestamps
  confirmed_at?: Date;
  shipped_at?: Date;
  delivered_at?: Date;
  cancelled_at?: Date;
  
  // Notes
  notes?: string;                // Notes client
  admin_notes?: string;          // Notes admin
  cancellation_reason?: string;
  
  created_at: Date;
  updated_at: Date;
}

type OrderStatus = 
  | 'pending'
  | 'confirmed' 
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded';

type PaymentMethod = 
  | 'orange-money'
  | 'mtn-momo'
  | 'cash'
  | 'bank-transfer';

interface Address {
  street: string;
  city: string;
  region: string;
  postal_code?: string;
  country: string;
}
```

### OrderItem (Article Commande)

```typescript
interface OrderItem {
  id: string;                    // UUID
  order_id: string;              // UUID commande
  product_id: string;            // UUID produit
  product_name: string;          // Nom au moment de commande
  product_sku: string;           // SKU au moment de commande
  variant_id?: string;           // Variante sélectionnée
  quantity: number;              // Quantité commandée
  unit_price: number;            // Prix unitaire
  total_price: number;           // Prix total ligne
  product_snapshot: any;         // Snapshot complet produit
  created_at: Date;
  updated_at: Date;
}
```

### ContactMessage (Message Contact)

```typescript
interface ContactMessage {
  id: string;                    // UUID
  name: string;                  // Nom expéditeur
  email: string;                 // Email expéditeur
  phone?: string;                // Téléphone optionnel
  subject: string;               // Sujet du message
  message: string;               // Contenu du message
  is_read: boolean;              // Lu par admin
  admin_reply?: string;          // Réponse admin
  replied_at?: Date;             // Date de réponse
  created_at: Date;
  updated_at: Date;
}
```

### Newsletter (Abonnement)

```typescript
interface Newsletter {
  id: string;                    // UUID
  email: string;                 // Email unique
  first_name?: string;           // Prénom optionnel
  is_active: boolean;            // Abonnement actif
  preferences: {                 // Préférences
    new_products: boolean;
    promotions: boolean;
    tips: boolean;
  };
  confirmed_at?: Date;           // Date de confirmation
  unsubscribed_at?: Date;        // Date de désabonnement
  created_at: Date;
  updated_at: Date;
}
```

---

## 🚨 Gestion des Erreurs

### Codes d'Erreur Personnalisés

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Erreur de validation des données |
| `AUTHENTICATION_FAILED` | Échec d'authentification |
| `AUTHORIZATION_FAILED` | Permissions insuffisantes |
| `RESOURCE_NOT_FOUND` | Ressource non trouvée |
| `RESOURCE_CONFLICT` | Conflit de ressource |
| `RATE_LIMIT_EXCEEDED` | Limite de taux dépassée |
| `PAYMENT_FAILED` | Échec de paiement |
| `STOCK_INSUFFICIENT` | Stock insuffisant |
| `ORDER_PROCESSING_ERROR` | Erreur traitement commande |

### Exemple de Gestion d'Erreur

```javascript
try {
  const response = await fetch('/api/products', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error);
  }
  
  return data;
} catch (error) {
  console.error('API Error:', error.message);
  // Gérer l'erreur selon le code
}
```

---

## 🔒 Rate Limiting

### Limites par Défaut

- **API publique**: 100 requêtes / 15 minutes
- **API admin**: 500 requêtes / 15 minutes
- **Création commande**: 5 requêtes / minute
- **Upload fichiers**: 10 requêtes / minute

### Headers de Rate Limiting

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248900
Retry-After: 900
```

---

## 📄 Pagination

### Paramètres Standards

- `page`: Numéro de page (défaut: 1)
- `limit`: Éléments par page (défaut: 10, max: 100)

### Réponse Paginée

```json
{
  "data": [...],
  "pagination": {
    "current_page": 2,
    "total_pages": 10,
    "per_page": 20,
    "total_items": 195,
    "has_next": true,
    "has_prev": true,
    "next_page": 3,
    "prev_page": 1
  }
}
```

---

## 🔍 Filtrage et Tri

### Filtres Communs

**Produits:**
- `search`: Recherche textuelle (nom, description, tags)
- `category`: UUID de catégorie
- `min_price` / `max_price`: Fourchette de prix
- `in_stock`: Produits en stock uniquement
- `featured`: Produits vedettes uniquement
- `status`: Statut de publication

**Commandes:**
- `status`: Statut de commande
- `payment_status`: Statut de paiement
- `date_from` / `date_to`: Période de création
- `customer_email`: Email client
- `min_amount` / `max_amount`: Montant total

### Options de Tri

**Produits:**
- `name_asc` / `name_desc`: Nom alphabétique
- `price_asc` / `price_desc`: Prix croissant/décroissant
- `created_asc` / `created_desc`: Date de création
- `popularity`: Popularité (vues + ventes)
- `rating`: Note moyenne

**Commandes:**
- `created_desc`: Plus récentes en premier
- `amount_desc`: Montant décroissant
- `status_asc`: Statut alphabétique

### Exemple de Requête Filtrée

```http
GET /api/public/products?search=robe&category=uuid-baby&min_price=10000&max_price=50000&sort=popularity&page=1&limit=12
```

---

## 📚 Ressources Supplémentaires

### Documentation Interactive

- **Swagger UI**: `/api-docs` (développement uniquement)
- **Postman Collection**: [Télécharger](./postman_collection.json)

### Codes d'Exemple

Voir le dossier `/examples/` pour des exemples d'intégration dans différents langages :

- JavaScript/Node.js
- Python
- PHP
- cURL

### Support Technique

- **Email**: dev@babychic.cm
- **Documentation**: https://docs.babychic.cm
- **Status API**: https://status.babychic.cm

---

**© 2024 BabyChic Cameroun - Documentation API v1.0**

*Cette documentation est maintenue à jour avec chaque release de l'API*