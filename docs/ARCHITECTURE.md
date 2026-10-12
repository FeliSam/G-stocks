# Architecture Technique — G-Stock

## 1. Vue d'Ensemble & Organisation du Monorepo

Le projet **G-Stock** est structuré en **monorepo** géré par **`pnpm` workspaces** et orchestré par **`Turborepo`**. Ce choix garantit un partage strict des types TypeScript, des schémas de validation Zod, de la couche d'accès aux données Prisma et du système de composants UI entre le frontend et le backend, tout en optimisant les temps de compilation et de test grâce au cache intelligent de Turborepo.

### Arborescence du Monorepo

```text
g-stocks/
├── apps/
│   ├── web/                        # Application Frontend Next.js (App Router)
│   └── api/                        # Serveur API REST modulaire Express + TypeScript
├── packages/
│   ├── database/                   # @g-stock/database   (Schéma Prisma, client, migrations, seeds)
│   ├── validation/                 # @g-stock/validation (Schémas Zod partagés client/serveur)
│   ├── types/                      # @g-stock/types      (Interfaces, DTOs, enums métiers, contrats API)
│   ├── ui/                         # @g-stock/ui         (Design System, composants React + Tailwind)
│   └── config/                     # @g-stock/config     (Configs TS, ESLint, Prettier, constantes)
├── docs/                           # Documentation technique et fonctionnelle de référence
├── package.json                    # Scripts racines et moteurs (Node >= 20, pnpm >= 9)
├── pnpm-workspace.yaml             # Déclaration des espaces de travail apps/* et packages/*
└── turbo.json                      # Pipeline Turborepo (build, dev, lint, typecheck, test)
```

---

## 2. Stack Technique Détaillée

### 2.1. Frontend (`apps/web`)
- **Framework** : **Next.js** (App Router) avec **React** et **TypeScript** en mode `strict`.
- **Stylisation & Thématisation** : **Tailwind CSS** couplé à un moteur de **CSS Custom Properties (Design Tokens)** injectés dynamiquement selon la configuration de l'organisation (`organization_themes`) et les préférences de l'utilisateur (`user_preferences`).
- **Gestion d'État & Cache Réseau** : **Redux Toolkit (RTK)** pour l'état global applicatif (session active, organisation courante `activeOrganizationId`, préférences UI, notifications) et **RTK Query** pour les appels API, l'invalidation automatique par tags (`Products`, `StockBalances`, `Movements`, `Inventories`, `Members`, `Theme`) et la mise à jour optimiste.
- **Formulaires & Validation** : **React Hook Form** connecté aux schémas **Zod** issus de `@g-stock/validation` via `@hookform/resolvers/zod`.
- **Visualisation de Données** : **Recharts** pour les graphiques d'évolution de valorisation, les flux d'entrées/sorties et la répartition des stocks par entrepôt/catégorie.

### 2.2. Backend API (`apps/api`)
- **Serveur HTTP** : **Express.js** avec **TypeScript**, structuré selon une architecture modulaire par domaine métier (Clean / Layered Modular Architecture).
- **Sécurité & Middlewares** : `helmet` (en-têtes HTTP sécurisés), `cors` strict, `cookie-parser`, limitation de débit (`rate-limiting`), middleware de corrélation (`X-Request-Id`), résolution du contexte d'authentification et du tenant (`X-Organization-Id`), et gestionnaire d'erreurs centralisé normalisé.
- **Structure standardisée d'un module métier (`apps/api/src/modules/<domaine>/`)** :
  Chaque domaine fonctionnel (`auth`, `organizations`, `members`, `roles`, `products`, `categories`, `warehouses`, `stock-movements`, `inventories`, `appearance`, `billing`, `audit`, `platform`) respecte rigoureusement le découpage en 7 fichiers/couches :
  1. `*.routes.ts` : Déclaration des routes Express, attachement des middlewares d'authentification, de contexte tenant, de validation Zod et de vérification de permissions.
  2. `*.controller.ts` : Extraction des paramètres HTTP (`req.params`, `req.query`, `req.body`), appel au service métier et formatage de la réponse HTTP standardisée. Aucune logique métier ni requête Prisma directe.
  3. `*.service.ts` : Logique métier pure, orchestration des règles de gestion, coordination des transactions, appels au journal d'audit et vérification des quotas du plan SaaS.
  4. `*.repository.ts` : Encapsulation des requêtes Prisma avec **filtrage obligatoire par `organization_id`**.
  5. `*.schemas.ts` : Ré-export ou spécialisation des schémas Zod (`params`, `query`, `body`) depuis `@g-stock/validation`.
  6. `*.permissions.ts` : Définition des constantes de permissions requises par action du module et prédicats d'autorisation contextuels.
  7. `*.test.ts` : Tests unitaires et d'intégration du module (cas nominaux, erreurs de validation, isolation inter-tenant, invariants de stock).

### 2.3. Persistance & Base de Données
- **SGBD** : **PostgreSQL 18** (support natif UUIDv7/UUIDv4, performances accrues sur les index B-Tree/GIN, isolation transactionnelle robuste, types `NUMERIC(18,4)` et `TIMESTAMPTZ`).
- **ORM** : **Prisma ORM** centralisé dans `@g-stock/database`, utilisant `Prisma.Decimal` (`decimal.js`) pour garantir l'exactitude arithmétique.

---

## 3. Packages Partagés (`packages/*`)

| Package | Rôle & Responsabilités | Consommateurs |
| :--- | :--- | :--- |
| **`@g-stock/database`** | Contient `schema.prisma`, les migrations SQL, le client Prisma typé, les helpers de transaction et les scripts de seed multi-secteurs. | `apps/api` |
| **`@g-stock/validation`** | Schémas **Zod** pour toutes les entités (produits, mouvements, inventaires, thèmes, authentification, filtres de pagination). Garantit la validation symétrique front/back. | `apps/web`, `apps/api` |
| **`@g-stock/types`** | Types TypeScript partagés, énumérations métiers (`MovementType`, `MovementStatus`, `NegativeStockPolicy`, `ValuationMethod`, `PermissionCode`), enveloppes de réponse API (`ApiResponse<T>`, `PaginatedResponse<T>`). | `apps/web`, `apps/api`, `@g-stock/ui`, `@g-stock/validation` |
| **`@g-stock/ui`** | Bibliothèque de composants React accessibles (WCAG 2.2 AA) basés sur Tailwind CSS et pilotés par CSS Custom Properties (boutons, tables de données denses, badges de statut, modales, cartes KPI). | `apps/web` |
| **`@g-stock/config`** | Configurations partagées TypeScript (`tsconfig.base.json`), ESLint, Prettier et constantes globales de la plateforme. | Tous les packages et applications |

---

## 4. Diagrammes d'Architecture

### 4.1. Architecture Globale du Système

```mermaid
flowchart TD
    subgraph Client["Navigateur Client"]
        NextApp["apps/web (Next.js App Router)"]
        RTK["Redux Toolkit + RTK Query"]
        RHF["React Hook Form + Zod"]
        ThemeEngine["Moteur de Thème (CSS Variables)"]
        NextApp --> RTK
        NextApp --> RHF
        NextApp --> ThemeEngine
    end

    subgraph Shared["Packages Partagés (Monorepo pnpm + Turborepo)"]
        PkgUI["@g-stock/ui"]
        PkgVal["@g-stock/validation"]
        PkgTypes["@g-stock/types"]
        PkgDB["@g-stock/database (Prisma)"]
        PkgCfg["@g-stock/config"]
    end

    subgraph Backend["Serveur API (apps/api - Express + TypeScript)"]
        MW["Pipeline Middlewares (Auth JWT, Tenant Context, RBAC, Zod, RateLimit)"]
        Routes["Routes (*.routes.ts)"]
        Ctrl["Controllers (*.controller.ts)"]
        Svc["Services Métier (*.service.ts)"]
        StockEng["Moteur Transactionnel de Stock"]
        BillingProv["Abstraction BillingProvider (Stripe / Mock)"]
        Repo["Repositories (*.repository.ts)"]

        MW --> Routes --> Ctrl --> Svc
        Svc --> StockEng
        Svc --> BillingProv
        Svc --> Repo
        StockEng --> Repo
    end

    subgraph Data["Couche de Persistance"]
        PG[("PostgreSQL 18 (ACID, Decimal 18,4)")]
    end

    RTK -- "HTTPS REST JSON + X-Organization-Id + Idempotency-Key" --> MW
    NextApp -.-> PkgUI
    NextApp -.-> PkgVal
    NextApp -.-> PkgTypes
    Ctrl -.-> PkgVal
    Svc -.-> PkgTypes
    Repo --> PkgDB
    PkgDB -- "Pool de Connexions & Transactions" --> PG
```

---

### 4.2. Flux d'Authentification, Résolution du Tenant et Autorisation RBAC

Chaque requête ciblant une route protégée d'organisation franchit une chaîne de vérification stricte avant d'atteindre le contrôleur :

```mermaid
sequenceDiagram
    autonumber
    actor User as Utilisateur (apps/web)
    participant API as Express Pipeline (apps/api)
    participant AuthMW as AuthMiddleware
    participant TenantMW as TenantContextMiddleware
    participant RbacMW as PermissionGuard (RBAC)
    participant DB as PostgreSQL 18 (@g-stock/database)
    participant Ctrl as Module Controller & Service

    User->>API: Requête HTTP + Cookie/Bearer JWT + Header X-Organization-Id
    API->>AuthMW: Vérification de la signature et expiration du JWT
    alt JWT invalide ou expiré
        AuthMW-->>User: 401 Unauthorized (AUTH_TOKEN_INVALID)
    end
    AuthMW->>TenantMW: Attache req.user (userId, isPlatformAdmin)
    TenantMW->>DB: Recherche Membership actif (user_id, organization_id) + Rôles & Permissions
    alt Membership inexistant ou suspendu / Organisation archivée
        TenantMW-->>User: 403 Forbidden (TENANT_ACCESS_DENIED)
    end
    DB-->>TenantMW: Membership valide + Set<PermissionCode> + OrganizationSettings
    TenantMW->>RbacMW: Attache req.tenantContext (organizationId, permissions, settings)
    RbacMW->>RbacMW: Vérifie que la permission requise (ex: "stock.receive") est présente
    alt Permission manquante
        RbacMW-->>User: 403 Forbidden (INSUFFICIENT_PERMISSIONS)
    end
    RbacMW->>Ctrl: Exécute la requête scopée à req.tenantContext.organizationId
    Ctrl->>DB: Requêtes filtrées par organization_id
    DB-->>Ctrl: Résultat isolé
    Ctrl-->>User: 200 OK / 201 Created (Enveloppe JSON standardisée)
```

---

### 4.3. Flux Transactionnel d'un Mouvement de Stock

La validation d'un mouvement de stock (`receipt`, `issue`, `transfer`, `adjustment`) s'exécute intégralement dans une transaction PostgreSQL atomique gérant l'idempotence, le verrouillage des soldes, la politique de stock négatif et le journal d'audit :

```mermaid
sequenceDiagram
    autonumber
    actor Op as Magasinier / Responsable
    participant Ctrl as StockMovementController
    participant Svc as StockMovementService
    participant DB as PostgreSQL 18 (Transaction ACID)

    Op->>Ctrl: POST /api/v1/stock-movements/:id/validate (Header: Idempotency-Key)
    Ctrl->>Svc: validateMovement(organizationId, movementId, userId, idempotencyKey)
    Svc->>DB: BEGIN TRANSACTION
    Svc->>DB: 1. Vérifier/Insérer idempotency_keys (organization_id, key)
    alt Clé déjà traitée avec même payload
        DB-->>Svc: Retourne la réponse mise en cache
        Svc-->>Ctrl: Résultat idempotent (200 OK)
    end
    Svc->>DB: 2. Charger stock_movements + lignes (SELECT ... FOR UPDATE)
    Svc->>DB: 3. Vérifier appartenance tenant des produits, variantes, entrepôts et emplacements
    Svc->>DB: 4. Charger organization_settings (negative_stock_policy, valuation_method)
    loop Pour chaque ligne du mouvement (triée par clé canonique pour éviter tout deadlock)
        Svc->>DB: 5. Verrouiller/Lire inventory_balances (SELECT ... FOR UPDATE)
        Svc->>Svc: 6. Calculer nouveaux soldes (on_hand, available) en Decimal(18,4)
        alt available < 0 ET negative_stock_policy == FORBID
            Svc->>DB: ROLLBACK TRANSACTION
            Svc-->>Op: 422 Unprocessable Entity (INSUFFICIENT_STOCK)
        end
        Svc->>DB: 7. Mettre à jour inventory_balances + recalculer coût moyen (WAC) si entrée
    end
    Svc->>DB: 8. Passer stock_movements.status = VALIDATED, validated_at = NOW(), validated_by = userId
    Svc->>DB: 9. Insérer entrée dans audit_logs (action: STOCK_MOVEMENT_VALIDATED)
    Svc->>DB: 10. Sauvegarder le corps de réponse dans idempotency_keys
    Svc->>DB: COMMIT TRANSACTION
    DB-->>Svc: Transaction validée
    Svc-->>Ctrl: Mouvement validé + nouveaux soldes
    Ctrl-->>Op: 200 OK (Mouvement immuable scellé)
```
