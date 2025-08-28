# 🚀 BabyChic Cameroun - Guide de Déploiement

> **Guide complet de déploiement en production** - Configuration et mise en ligne sécurisée

---

## 📋 Table des Matières

1. [Prérequis](#prérequis)
2. [Environnements](#environnements)
3. [Configuration de la Base de Données](#configuration-base-données)
4. [Déploiement Backend (Render.com)](#déploiement-backend)
5. [Déploiement Frontend (Netlify)](#déploiement-frontend)
6. [Configuration DNS](#configuration-dns)
7. [Monitoring et Alertes](#monitoring)
8. [Sécurité](#sécurité)
9. [Maintenance](#maintenance)
10. [Troubleshooting](#troubleshooting)

---

## 🔧 Prérequis

### Comptes et Services Requis

- **Render.com** : Hébergement backend
- **Netlify** : Hébergement frontend  
- **PostgreSQL Database** : Base de données (Render PostgreSQL)
- **Domaine personnalisé** : babychic.cm
- **Certificats SSL** : Automatiques (Let's Encrypt)

### Outils de Développement

```bash
# Versions minimales requises
Node.js >= 18.0.0
npm >= 8.0.0
PostgreSQL >= 12.0
Git >= 2.30.0
```

### Environnements de Déploiement

| Environnement | Backend URL | Frontend URL | Base de Données |
|---------------|-------------|--------------|-----------------|
| **Development** | http://localhost:5000 | http://localhost:3000 | Local PostgreSQL |
| **Staging** | https://babychic-api-staging.onrender.com | https://staging--babychic-cameroun.netlify.app | Render PostgreSQL |
| **Production** | https://api.babychic.cm | https://babychic.cm | Render PostgreSQL |

---

## 💾 Configuration Base de Données

### 1. Création de la Base de Données Production

#### Sur Render.com

1. **Créer un service PostgreSQL** :
   ```bash
   # Dans le dashboard Render
   New > PostgreSQL
   - Name: babychic-db-production
   - Plan: Starter ($7/month) ou Pro ($20/month)
   - Region: Frankfurt (proche de l'Afrique)
   ```

2. **Récupérer les informations de connexion** :
   ```env
   # Variables automatiquement générées
   DATABASE_URL=postgresql://username:password@host:5432/database_name
   POSTGRES_DB=database_name
   POSTGRES_USER=username
   POSTGRES_PASSWORD=password
   POSTGRES_HOST=host
   POSTGRES_PORT=5432
   ```

### 2. Migration et Configuration Initiale

#### Script de Migration Production

```bash
#!/bin/bash
# scripts/deploy-db.sh

set -e

echo "🗄️ Déploiement de la base de données BabyChic..."

# Vérifier les variables d'environnement
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL manquant"
    exit 1
fi

echo "📦 Installation des extensions PostgreSQL..."
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS \"pg_trgm\";"

echo "🏗️ Création des tables et index..."
# Sequelize va gérer la synchronisation
npm run db:sync

echo "📊 Création des vues matérialisées..."
npm run db:create-views

echo "👤 Création de l'utilisateur admin par défaut..."
npm run db:seed:admin

echo "✅ Base de données configurée avec succès!"
```

#### Configuration des Variables d'Environnement DB

```env
# Production Database (.env.production)
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/dbname
DB_SSL=true
DB_POOL_MAX=20
DB_POOL_MIN=2
DB_POOL_IDLE=10000

# Backup Configuration
DB_BACKUP_ENABLED=true
DB_BACKUP_SCHEDULE=0 2 * * *
DB_BACKUP_RETENTION_DAYS=30
```

---

## 🔧 Déploiement Backend

### 1. Configuration Render.com

#### Création du Service Web

1. **Nouveau service Web sur Render** :
   ```yaml
   # render.yaml (déjà présent dans le projet)
   services:
     - type: web
       name: babychic-api
       env: node
       buildCommand: npm install && npm run build
       startCommand: npm start
       plan: starter # $7/month
       region: frankfurt
       envVars:
         - key: NODE_ENV
           value: production
         - key: PORT  
           value: 10000
   ```

2. **Configuration des variables d'environnement** :
   ```env
   # Variables sur Render Dashboard
   NODE_ENV=production
   PORT=10000
   
   # Base de données
   DATABASE_URL=[Render PostgreSQL URL]
   DB_SSL=true
   
   # JWT et sécurité  
   JWT_SECRET=[Générer une clé forte de 64 caractères]
   JWT_EXPIRES_IN=24h
   BCRYPT_SALT_ROUNDS=12
   
   # CORS
   CORS_ORIGIN=https://babychic.cm,https://www.babychic.cm
   
   # Rate limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   
   # Email (Gmail SMTP)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_AUTH_USER=[email@gmail.com]
   SMTP_AUTH_PASS=[app_password]
   EMAIL_FROM=noreply@babychic.cm
   EMAIL_FROM_NAME=BabyChic Cameroun
   
   # Paiements
   ORANGE_MONEY_CLIENT_ID=[Orange Money API]
   ORANGE_MONEY_CLIENT_SECRET=[Orange Money Secret]
   MTN_MOMO_SUBSCRIPTION_KEY=[MTN MoMo Key]
   MTN_MOMO_API_KEY=[MTN MoMo API]
   
   # Monitoring
   SENTRY_DSN=[Sentry DSN pour error tracking]
   
   # Admin par défaut
   ADMIN_EMAIL=admin@babychic.cm
   ADMIN_PASSWORD=[Mot de passe fort]
   ADMIN_FIRST_NAME=Admin
   ADMIN_LAST_NAME=BabyChic
   ```

### 2. Configuration du Domaine Personnalisé

#### DNS Configuration

1. **Configurer les enregistrements DNS** :
   ```dns
   # Chez votre fournisseur DNS (ex: Cloudflare, OVH)
   CNAME api.babychic.cm -> babychic-api.onrender.com
   ```

2. **Ajouter le domaine sur Render** :
   ```bash
   # Dashboard Render > Service > Settings > Custom Domains
   Domain: api.babychic.cm
   # SSL sera automatiquement configuré (Let's Encrypt)
   ```

### 3. Déploiement Automatique

#### Configuration GitHub

```yaml
# .github/workflows/deploy-backend.yml
name: Deploy Backend to Render

on:
  push:
    branches: [main]
    paths: ['babychic-backend/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: |
          cd babychic-backend
          npm ci
          
      - name: Run tests
        run: |
          cd babychic-backend
          npm test
          
      - name: Deploy to Render
        uses: JorgeLNJunior/render-deploy@v1.4.4
        with:
          service_id: ${{ secrets.RENDER_SERVICE_ID }}
          api_key: ${{ secrets.RENDER_API_KEY }}
          wait_deploy: true
```

---

## 🎨 Déploiement Frontend

### 1. Configuration Netlify

#### Fichier de Configuration

```toml
# netlify.toml (déjà présent)
[build]
  base = "babychic-frontend/"
  publish = "dist"
  command = "npm run build"

[build.environment]
  NODE_VERSION = "18"
  NPM_VERSION = "8"

[[redirects]]
  from = "/api/*"
  to = "https://api.babychic.cm/api/:splat"
  status = 200
  force = true

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[context.production]
  environment = { VITE_API_URL = "https://api.babychic.cm/api" }

[context.deploy-preview]
  environment = { VITE_API_URL = "https://babychic-api-staging.onrender.com/api" }

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

### 2. Configuration des Variables d'Environnement

```bash
# Variables Netlify (Dashboard > Site Settings > Environment Variables)

# Production
VITE_API_URL=https://api.babychic.cm/api

# Analytics (optionnel)
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Sentry Frontend (optionnel)
VITE_SENTRY_DSN=https://your-frontend-dsn@sentry.io/project

# Feature flags
VITE_ENABLE_VOICE_SEARCH=true
VITE_ENABLE_PWA=true
```

### 3. Configuration du Domaine Principal

#### DNS et Domaine

```dns
# Configuration DNS
A     babychic.cm -> 75.2.60.5 (Netlify Load Balancer)
AAAA  babychic.cm -> 2600:1f18:3e5b:8b00:8bb9:b5eb:8a2d:3e65
CNAME www.babychic.cm -> babychic.cm
```

```bash
# Sur Netlify Dashboard
Domain management > Add custom domain
- Primary domain: babychic.cm  
- Redirect www.babychic.cm to babychic.cm
- SSL Certificate: Auto-generated (Let's Encrypt)
```

### 4. Configuration PWA et Performance

#### Manifest et Service Worker

```json
// public/manifest.json (déjà configuré)
{
  "name": "BabyChic Cameroun",
  "short_name": "BabyChic",
  "description": "Mode & Tendance pour toute la famille",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#ec5858",
  "icons": [
    {
      "src": "/logo-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/logo-512.png", 
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

## 🛡️ Sécurité

### 1. Configuration SSL/TLS

#### Backend (Render)
```javascript
// server.js - Configuration HTTPS automatique
app.use(helmet({
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.babychic.cm"]
    }
  }
}));
```

#### Frontend (Netlify)
```toml
# netlify.toml - Headers de sécurité
[[headers]]
  for = "/*"
  [headers.values]
    Strict-Transport-Security = "max-age=31536000; includeSubDomains; preload"
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:"
```

### 2. Variables Sensibles

#### Génération de Secrets Forts

```bash
# JWT Secret (64 caractères)
openssl rand -hex 32

# Session Secret
openssl rand -base64 32

# Admin Password (Fort)
# Utiliser un gestionnaire de mots de passe
```

### 3. Sauvegarde et Récupération

#### Script de Sauvegarde Automatique

```bash
#!/bin/bash
# scripts/backup-db.sh

BACKUP_DIR="/tmp/babychic-backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="babychic_backup_$DATE.sql"

mkdir -p $BACKUP_DIR

echo "📦 Création de la sauvegarde..."
pg_dump $DATABASE_URL > "$BACKUP_DIR/$BACKUP_FILE"

echo "☁️ Upload vers stockage cloud..."
# aws s3 cp "$BACKUP_DIR/$BACKUP_FILE" s3://babychic-backups/

echo "🗑️ Nettoyage des anciennes sauvegardes locales..."
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete

echo "✅ Sauvegarde terminée: $BACKUP_FILE"
```

---

## 📊 Monitoring et Alertes

### 1. Health Checks

#### Endpoint de Santé Backend

```javascript
// Déjà implémenté dans server.js
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'BabyChic API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database: 'Connected', // À améliorer avec vraie vérification DB
    uptime: process.uptime()
  });
});
```

#### Configuration Render Health Check

```yaml
# render.yaml
services:
  - type: web
    name: babychic-api
    healthCheckPath: /health
    autoDeploy: true
```

### 2. Error Tracking avec Sentry

#### Configuration Backend

```javascript
// src/config/sentry.js
const Sentry = require('@sentry/node');

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
}

module.exports = Sentry;
```

#### Configuration Frontend

```javascript
// src/utils/sentry.js
import * as Sentry from '@sentry/browser';

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
  });
}
```

### 3. Métriques et Logs

#### Logging Structure

```javascript
// src/utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    // En production, ajouter transport vers service de logs
  ],
});

module.exports = logger;
```

---

## 🔧 Maintenance

### 1. Mise à Jour de Production

#### Checklist de Déploiement

```bash
# scripts/deploy-checklist.sh

echo "📋 Checklist de déploiement BabyChic"
echo "=================================="

echo "✅ 1. Tests passent en local"
echo "✅ 2. Variables d'environnement configurées"
echo "✅ 3. Migrations de base de données prêtes"
echo "✅ 4. Sauvegarde de la base existante"

echo "🚀 Déploiement en cours..."

# Vérifications automatiques
npm test || exit 1
npm run build || exit 1

echo "✅ Déploiement prêt!"
```

### 2. Monitoring des Performances

#### Métriques Importantes

```bash
# À surveiller régulièrement
- Response time API < 500ms
- Uptime > 99.5%
- Database connections < 80% pool
- Memory usage < 80%
- CPU usage < 70%
- Error rate < 1%
```

### 3. Tâches de Maintenance Régulières

#### Hebdomadaire

```sql
-- Nettoyage et optimisation DB (à automatiser)
VACUUM ANALYZE products;
VACUUM ANALYZE orders;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_product_sales_analytics;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_sales_summary;
```

#### Mensuel

```bash
# Vérification sécurité
npm audit
npm audit fix

# Mise à jour dépendances mineures
npm update

# Vérification certificats SSL
curl -I https://api.babychic.cm
curl -I https://babychic.cm
```

---

## 🚨 Troubleshooting

### Problèmes Courants

#### 1. Erreur de Connexion Base de Données

```bash
# Diagnostic
echo $DATABASE_URL
psql $DATABASE_URL -c "SELECT version();"

# Solutions
- Vérifier les variables d'environnement
- Vérifier les autorisations réseau Render
- Redémarrer le service PostgreSQL
```

#### 2. Erreur CORS Frontend

```javascript
// Vérifier la configuration CORS backend
const corsOptions = {
  origin: [
    'https://babychic.cm',
    'https://www.babychic.cm',
    // Ajouter tous les domaines autorisés
  ],
  credentials: true
};
```

#### 3. Erreur de Build Frontend

```bash
# Vérifier les variables d'environnement
echo $VITE_API_URL

# Nettoyer et rebuilder
rm -rf node_modules dist
npm install
npm run build
```

#### 4. Erreur 502/504 Backend

```bash
# Vérifier les logs Render
# Dashboard > Service > Logs

# Vérifications communes
- Memory usage
- CPU usage  
- Database connections
- Port configuration (10000)
```

### Scripts de Diagnostic

```bash
#!/bin/bash
# scripts/diagnose.sh

echo "🔍 Diagnostic BabyChic Production"
echo "================================"

echo "📡 Test API Health Check:"
curl -s https://api.babychic.cm/health | jq .

echo "🌐 Test Frontend:"
curl -I https://babychic.cm

echo "🗄️ Test Database Connection:"
# (Nécessite accès DB)
psql $DATABASE_URL -c "SELECT COUNT(*) as products FROM products;" 2>/dev/null || echo "❌ DB Error"

echo "🔒 Test SSL Certificates:"
echo | openssl s_client -connect api.babychic.cm:443 2>/dev/null | openssl x509 -noout -dates

echo "📊 Test Response Times:"
curl -w "@curl-format.txt" -o /dev/null -s https://api.babychic.cm/health
```

### Contacts de Support

- **Render Support**: support@render.com
- **Netlify Support**: support@netlify.com  
- **Développement**: dev@babychic.cm
- **Urgences**: +237 XXX XXX XXX

---

## 📈 Optimisations Post-Déploiement

### 1. CDN et Cache

```bash
# Configuration Cloudflare (optionnel)
- Cache static assets (images, CSS, JS)
- Minification automatique
- Compression Brotli/Gzip
- Protection DDoS
```

### 2. Database Scaling

```sql
-- Monitoring des requêtes lentes
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;

-- Optimisation des index selon l'usage
```

### 3. Performance Frontend

```javascript
// Code splitting par routes
const Home = lazy(() => import('./pages/Home'));
const Catalog = lazy(() => import('./pages/Catalog'));

// Image lazy loading
<img loading="lazy" src={imageUrl} alt="Product" />
```

---

## 📋 Checklist Finale

### ✅ Pre-Launch

- [ ] Tests E2E passent
- [ ] Variables d'environnement configurées
- [ ] SSL certificats actifs
- [ ] DNS propagé
- [ ] Monitoring configuré
- [ ] Sauvegardes actives
- [ ] Error tracking actif
- [ ] Performance baselines établies

### ✅ Post-Launch

- [ ] Health checks validés
- [ ] Logs monitored pendant 24h
- [ ] Performance response times < 500ms
- [ ] Pas d'erreurs critiques
- [ ] Fonctionnalités métier testées
- [ ] Paiements testés
- [ ] Emails testés
- [ ] Analytics configurés

---

**🎉 BabyChic Cameroun est maintenant en ligne !**

**URLs de production** :
- **Frontend** : https://babychic.cm
- **API** : https://api.babychic.cm
- **API Docs** : https://api.babychic.cm/api-docs
- **Health Check** : https://api.babychic.cm/health

---

**© 2024 BabyChic Cameroun - Guide de Déploiement v1.0**

*Ce guide est mis à jour avec chaque évolution de l'infrastructure*