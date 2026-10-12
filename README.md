# G-Stock — Plateforme SaaS Universelle de Gestion des Stocks

> **Version :** 1.1.0  
> **Architecture :** Monorepo `pnpm` + `Turborepo` • Next.js (App Router, React 18, TypeScript, Tailwind CSS, Redux Toolkit / RTK Query, Recharts) • Node.js + Express + TypeScript • Prisma ORM • PostgreSQL.

**G-Stock** est une plateforme SaaS multi-entreprises professionnelle, configurable et sécurisée permettant de gérer des catalogues produits multi-secteurs, des unités de mesure et conversions, des entrepôts et emplacements, des mouvements de stock transactionnels immuables (`receipt`, `issue`, `transfer`, `adjustment`, `opening_balance`, `reversal`), des campagnes d'inventaire physique, des alertes de seuil, une personnalisation visuelle complète par Design Tokens (validée WCAG 2.2 AA) et une administration SaaS multi-tenant.

---

## 1. Démarrage rapide (Développement local)

### Prérequis
- **Node.js** `>= 20` (avec `corepack` pour `pnpm`)
- **PostgreSQL** `>= 15` (via l'instance locale automatique `pnpm db:local:start` utilisant PostgreSQL 18 ou via `docker-compose.yml`)

### Commandes d'initialisation

```powershell
# 1. Installer les dépendances du monorepo
corepack pnpm install

# 2. Démarrer le cluster PostgreSQL local (écoute sur 127.0.0.1:5433)
corepack pnpm db:local:start

# 3. Synchroniser le schéma Prisma et générer le client
corepack pnpm db:push

# 4. Initialiser les permissions RBAC, plans SaaS, unités et données [DÉMO] isolées
corepack pnpm db:seed

# 5. Lancer l'API (port 4000) et l'application Web (port 3000)
corepack pnpm dev
```

- **Application Web Frontend :** `http://localhost:3000`
- **Serveur API REST :** `http://localhost:4000/api/v1`
- **Healthcheck API & PostgreSQL :** `http://localhost:4000/api/v1/health`
- **Spécification OpenAPI 3.1 :** `http://localhost:4000/api/v1/openapi.json`

---

## 2. Comptes de démonstration pré-configurés (isolés et identifiés `[DÉMO]`)

Conformément aux règles d'ingénierie du projet, les données de démonstration sont explicitement identifiées par le drapeau `isDemo = true` et le préfixe `[DÉMO]` :

| Rôle | Email | Mot de passe | Périmètre |
| :--- | :--- | :--- | :--- |
| **Propriétaire & Admin Plateforme** | `admin@g-stock.local` | `GStockAdmin2026!` | Accès complet à `[DÉMO] Distribution Horizon SAS` + Back-office `/admin` |
| **Responsable de Stock** | `responsable@horizon-demo.local` | `GStockDemo2026!` | Catalogue, entrepôts, mouvements et inventaires de `[DÉMO] Distribution Horizon SAS` |

---

## 3. Structure du Monorepo

```text
g-stock/
├── apps/
│   ├── api/                 # Serveur REST Express + TypeScript (/api/v1)
│   └── web/                 # Application Next.js App Router + Redux Toolkit + Tailwind CSS
├── packages/
│   ├── config/              # Thèmes, Design Tokens WCAG 2.2 AA, profils métiers, RBAC, plans SaaS
│   ├── database/            # Schéma Prisma, client PostgreSQL et script de seed
│   ├── types/               # Contrats TypeScript partagés
│   ├── ui/                  # Utilitaires d'affichage, devises et variables CSS
│   └── validation/          # Schémas Zod partagés client/serveur
├── docs/                    # 12 documents d'architecture, sécurité et spécifications
├── infra/
│   └── scripts/             # Scripts PostgreSQL local et sauvegarde/restauration chiffrée AES-256-GCM
├── docker-compose.yml       # Conteneur PostgreSQL de développement
├── pnpm-workspace.yaml
└── turbo.json
```

---

## 4. Documentation complète (`docs/`)

- [`docs/PRODUCT_SPEC.md`](./docs/PRODUCT_SPEC.md) — Vision produit, profils utilisateurs, périmètre MVP et règles métier.
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — Composants, flux et diagrammes d'architecture.
- [`docs/DATABASE_SCHEMA.md`](./docs/DATABASE_SCHEMA.md) — Dictionnaire des tables, relations, index et contraintes SQL.
- [`docs/STOCK_ENGINE.md`](./docs/STOCK_ENGINE.md) — Invariants du moteur de stock, transactions ACID, valorisation et idempotence.
- [`docs/TENANCY_SECURITY.md`](./docs/TENANCY_SECURITY.md) — Isolation multi-tenant, RBAC et sécurité applicative.
- [`docs/DESIGN_SYSTEM.md`](./docs/DESIGN_SYSTEM.md) — Catalogue des 19 Design Tokens, 6 thèmes, contraste WCAG 2.2 AA et responsive.
- [`docs/API.md`](./docs/API.md) — Conventions HTTP REST, pagination, erreurs et catalogue des routes `/api/v1`.
- [`docs/BILLING.md`](./docs/BILLING.md) — Plans SaaS, quotas, abstraction `BillingProvider` et webhooks signés.
- [`docs/TEST_PLAN.md`](./docs/TEST_PLAN.md) — Stratégie d'assurance qualité et couverture des cas critiques.
- [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) — Environnements, CI/CD, sauvegardes chiffrées et restauration.
- [`docs/ROADMAP.md`](./docs/ROADMAP.md) — Découpage par phases et évolutions post-MVP.
- [`docs/DECISIONS.md`](./docs/DECISIONS.md) — Journal des décisions d'architecture (ADR).

---

## 5. Tests, Qualité et Sauvegarde

```powershell
# Vérification du typage TypeScript sur tout le monorepo
corepack pnpm typecheck

# Exécution des tests d'intégration et unitaires (Vitest + Supertest + PostgreSQL)
corepack pnpm test

# Test de sauvegarde chiffrée AES-256-GCM et restauration complète sur base isolée
node infra/scripts/backup-restore.mjs
```
