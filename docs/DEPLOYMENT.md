# Guide de Déploiement, d'Exploitation et deContinuité d'Activité

> **Version :** 1.1  
> **Produit :** G-Stock  
> **Portée :** Environnements (`development`, `staging`, `production`), variables d'environnement, Docker Compose, migrations Prisma, observabilité JSON, sauvegardes chiffrées PostgreSQL, restauration et rollback.

---

## 1. Architecture des Environnements

G-Stock applique une séparation stricte entre trois environnements d'exécution afin qu'aucune donnée de test ou de démonstration ne pollue jamais la production.

| Environnement | `NODE_ENV` / `APP_ENV` | Base de Données | Fournisseur de Paiement | Objectif et Règles |
| :--- | :--- | :--- | :--- | :--- |
| **Développement (`development`)** | `development` | PostgreSQL local (Docker Compose) avec jeu de données de démo identifié | `dev_simulated` (`DevSimulatedBillingProvider`) ou Stripe Test | Développement local, exécution des suites Vitest / Playwright, aperçu des thèmes. |
| **Pré-production (`staging`)** | `staging` | Instance PostgreSQL managée isolée (SSL/TLS requis) | Stripe Mode Test (`sk_test_...`) | Validation des migrations Prisma, tests E2E de pré-livraison, essais de restauration et recette fonctionnelle. |
| **Production (`production`)** | `production` | Cluster PostgreSQL Haute Disponibilité (Multi-AZ, SSL/TLS strict, sauvegardes chiffrées) | Stripe Mode Live (`sk_live_...`) | Exploitation commerciale réelle. Aucune donnée fictive, aucun outil de debug public, cookies `Secure` forcés. |

---

## 2. Configuration et Variables d'Environnement (`.env.example`)

Aucun secret, mot de passe ou clé privée ne doit jamais être commité dans Git. Au démarrage, l'API et le serveur Web valident l'ensemble des variables d'environnement via un schéma **Zod** strict (`fail-fast`).

```dotenv
# =============================================================================
# G-STOCK — MODÈLE DE VARIABLES D'ENVIRONNEMENT (.env.example)
# =============================================================================

# --- Environnement global ---
NODE_ENV=development
APP_ENV=development
LOG_LEVEL=info

# --- Serveur API & Frontend ---
API_PORT=4000
API_BASE_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
WEB_ORIGIN=http://localhost:3000

# --- Base de données PostgreSQL (Prisma) ---
DATABASE_URL="postgresql://gstock:gstock_dev_password@localhost:5432/gstock_db?schema=public"

# --- Sécurité & Authentification ---
# Générer avec : openssl rand -base64 48
JWT_ACCESS_SECRET="change_me_in_production_min_32_chars_long_secret_key"
SESSION_COOKIE_SECRET="change_me_in_production_cookie_signing_secret_key"
JWT_EXPIRES_IN="8h"
BCRYPT_ROUNDS=12

# --- Facturation & Quotas SaaS ---
# Valeurs supportées : "dev_simulated" | "stripe"
BILLING_PROVIDER=dev_simulated
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
DEV_WEBHOOK_SECRET="dev_webhook_hmac_secret_for_local_testing"

# --- Stockage Objet (Logos & Exports) ---
STORAGE_DRIVER=local
STORAGE_LOCAL_DIR="./uploads"
MAX_UPLOAD_SIZE_BYTES=2097152

# --- Chiffrement des Sauvegardes (Exploitation) ---
BACKUP_ENCRYPTION_PASSPHRASE=""
```

---

## 3. Infrastructure Conteneurisée (`docker-compose.yml`)

En développement local comme en intégration continue, l'infrastructure de base est orchestrée via Docker Compose :
- **Service `postgres` :** Image officielle `postgres:16-alpine`, volume persistant `gstock_pgdata`, sonde de santé native `pg_isready -U gstock -d gstock_db`.
- **Service `api` (en profil conteneurisé) :** Build multi-stage TypeScript, exécution sous un utilisateur Linux non-root (`node`), sonde de santé HTTP sur `/api/v1/health`.
- **Service `web` (en profil conteneurisé) :** Build Next.js standalone optimisé.

### Commandes de démarrage rapide (Développement)
```bash
# 1. Démarrer PostgreSQL en arrière-plan
docker compose up -d postgres

# 2. Installer les dépendances du monorepo
pnpm install

# 3. Générer le client Prisma et appliquer les migrations
pnpm db:migrate:dev

# 4. Charger les référentiels (unités, plans SaaS, thèmes et compte démo identifié)
pnpm db:seed

# 5. Lancer le backend API et le frontend Web en parallèle
pnpm dev
```

---

## 4. Exécution Contrôlée des Migrations Prisma

Les schémas et contraintes SQL (notamment sur `inventory_balances` et `stock_movements`) sont critiques.

### 4.1 Règles de gestion des migrations
1. **Interdiction absolue de `prisma db push` en staging et production :** Seules les migrations versionnées et relues dans `packages/database/prisma/migrations/` sont autorisées.
2. **Étape dédiée de pré-déploiement :** Dans le pipeline CI/CD, la migration s'exécute dans un job isolé **avant** le basculement du trafic vers les nouvelles instances de l'API :
   ```bash
   pnpm --filter @gstock/database prisma migrate deploy
   ```
3. **Verrou de migration (Advisory Lock) :** Prisma utilise un verrou PostgreSQL garantissant que deux conteneurs démarrant simultanément n'exécutent jamais une migration en parallèle.
4. **Compatibilité ascendante (Expand and Contract) :** Toute modification destructive d'une colonne existante s'effectue en deux déploiements successifs afin de permettre un rollback applicatif sans perte de données.

---

## 5. Healthchecks et Observabilité (Logs Structurés JSON)

### 5.1 Point de Contrôle de Santé (`GET /api/v1/health`)
Utilisé par les orchestrateurs de conteneurs (Docker, Kubernetes, Cloud Run, Load Balancers) pour vérifier l'état de l'application :
```json
{
  "status": "ok",
  "service": "gstock-api",
  "version": "1.1.0",
  "timestamp": "2026-10-12T16:00:00.000Z",
  "checks": {
    "database": "up",
    "latencyMs": 3
  }
}
```
Si la connexion PostgreSQL échoue (`SELECT 1` en timeout), la route répond `503 Service Unavailable` avec `"status": "degraded"`.

### 5.2 Logs Structurés JSON, `request_id` et Expurgation des Secrets
Chaque requête HTTP entrante reçoit un identifiant unique `request_id` (issu de `X-Request-Id` ou généré en UUID/ULID) retourné dans l'en-tête de réponse `X-Request-Id` et injecté dans chaque ligne de log et d'audit :
```json
{
  "level": "info",
  "timestamp": "2026-10-12T16:02:11.410Z",
  "requestId": "req_01J9Z8K4M2N6P8Q0R2S4T6V8W0",
  "organizationId": "8f14e45f-ceea-467a-a83c-123456789000",
  "actorUserId": "2c918082-1a2b-4c3d-8e9f-000000000001",
  "method": "POST",
  "path": "/api/v1/stock/transfers",
  "statusCode": 201,
  "durationMs": 18
}
```
**Politique stricte d'expurgation (Redaction) :**
Le logger filtre et remplace automatiquement par `"[REDACTED]"` les clés suivantes à toutes les profondeurs d'objet :
`password`, `passwordHash`, `password_hash`, `token`, `accessToken`, `refreshToken`, `authorization`, `cookie`, `set-cookie`, `stripeSignature`, `secret`, `creditCard`, `cvv`.

---

## 6. Stratégie de Sauvegarde Chiffrée, Restauration et Rollback

### 6.1 Sauvegardes Automatisées et Chiffrées (`pg_dump`)
Outre les snapshots continus (PITR — Point-In-Time Recovery) du fournisseur cloud PostgreSQL, un job planifié quotidien exécute un dump logique complet compressé et chiffré en **AES-256** avant transfert vers un stockage objet immuable :

```bash
#!/usr/bin/env bash
set -euo pipefail

TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
BACKUP_FILE="gstock_backup_${TIMESTAMP}.dump.enc"

# 1. Extraction cohérente (--serializable-deferrable) au format custom compressé (-Fc)
# 2. Chiffrement à la volée AES-256-CBC avec PBKDF2 avant écriture disque
pg_dump --format=custom --no-owner --no-privileges --serializable-deferrable "$DATABASE_URL" \
  | openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 -pass env:BACKUP_ENCRYPTION_PASSPHRASE \
  > "/backups/${BACKUP_FILE}"

# 3. Empreinte d'intégrité SHA-256
sha256sum "/backups/${BACKUP_FILE}" > "/backups/${BACKUP_FILE}.sha256"
```

**Politique de rétention :**
- Sauvegardes quotidiennes conservées **30 jours**.
- Sauvegardes hebdomadaires conservées **12 semaines**.
- Sauvegardes mensuelles conservées **12 mois** (conformité audit et inventaire annuel).

### 6.2 Procédure de Test de Restauration (Vérification Mensuelle Obligatoire)
Une sauvegarde non testée n'existe pas. Chaque mois (et avant chaque mise en production majeure), l'équipe exécute la procédure de restauration sur une base éphémère isolée `gstock_restore_verify` :

```bash
# 1. Vérifier l'empreinte SHA-256 de l'archive chiffrée
sha256sum -c "/backups/${BACKUP_FILE}.sha256"

# 2. Créer la base temporaire de vérification
createdb "$VERIFY_DB_URL"

# 3. Déchiffrer et restaurer via pg_restore
openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 -pass env:BACKUP_ENCRYPTION_PASSPHRASE \
  -in "/backups/${BACKUP_FILE}" \
  | pg_restore --no-owner --no-privileges --clean --if-exists -d "$VERIFY_DB_URL"

# 4. Vérifier l'intégrité comptable des stocks (somme des mouvements == soldes)
psql "$VERIFY_DB_URL" -c "SELECT COUNT(*) FROM organizations; SELECT COUNT(*) FROM stock_movements;"
```

### 6.3 Procédure de Retour Arrière (Rollback en cas d'Incident)
En cas d'anomalie critique détectée après un déploiement en production :
1. **Bascule applicative immédiate (< 2 minutes) :** Redéployer l'image Docker taguée de la version stable précédente (`vN-1`) sur les services `api` et `web`.
2. **Vérification du statut des migrations :**
   - Si la release `vN` ne comportait que des ajouts non cassants (nouvelles tables/colonnes nullables), aucune action destructive sur la base n'est requise.
   - Si une migration SQL bloquante est en état échoué, marquer son état avec `prisma migrate resolve --rolled-back <nom_migration>` et appliquer le script SQL inverse validé, ou restaurer le snapshot pré-déploiement si le trafic d'écriture a été maintenu en maintenance.
3. **Post-mortem et Audit :** Documenter l'incident, l'horodatage, les `request_id` concernés et ajouter un test de non-régression dans `TEST_PLAN.md`.
