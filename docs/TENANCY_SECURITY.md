# Isolation Multi-Tenant & Sécurité — G-Stock

La sécurité de **G-Stock** repose sur un principe de **Défense en Profondeur (Defense-in-Depth)**. Dans une architecture SaaS multi-tenant manipulant des stocks physiques et des valorisations financières, l'isolation entre les organisations clientes ne dépend jamais de la confiance accordée au client web : chaque requête est authentifiée, contextualisée, autorisée et filtrée côté serveur.

---

## 1. Isolation Multi-Tenant Stricte Côté Serveur

### 1.1. Résolution et Vérification du Contexte d'Organisation
1. **Interdiction de faire confiance au payload client** : Le corps (`req.body`) ou les paramètres d'URL (`req.query`) ne servent jamais à déterminer les droits d'appartenance d'un utilisateur à une organisation.
2. **Résolution via `X-Organization-Id` ou session active** :
   - Le client Next.js transmet l'identifiant de l'organisation active dans l'en-tête HTTP `X-Organization-Id: <uuid>`.
   - Le middleware serveur `tenantContextMiddleware` extrait le `userId` depuis le jeton JWT vérifié, puis interroge la base de données pour charger l'adhésion correspondante :
     ```sql
     SELECT m.id, m.status, o.status AS org_status
     FROM memberships m
     JOIN organizations o ON o.id = m.organization_id
     WHERE m.user_id = $1 AND m.organization_id = $2
     ```
   - Si aucun `membership` n'existe, si `membership.status != 'ACTIVE'`, ou si `organization.status != 'ACTIVE'`, la requête est immédiatement rejetée avec `403 Forbidden (TENANT_ACCESS_DENIED)` et journalisée.
3. **Propagation du contexte (`req.tenantContext`)** :
   - Une fois validé, le middleware attache un objet immuable `req.tenantContext` contenant :
     - `organizationId: string`
     - `membershipId: string`
     - `userId: string`
     - `permissions: ReadonlySet<PermissionCode>`
     - `settings: OrganizationSettings`

---

## 2. Contrôle d'Accès Basé sur les Rôles et Permissions (RBAC Granulaire)

Les autorisations dans G-Stock ne sont jamais codées en dur sur le nom du rôle (`if (role === 'ADMIN')`), mais évaluées sur des **permissions atomiques** agrégées depuis les rôles du membre (`memberships` $\rightarrow$ `membership_roles` $\rightarrow$ `roles` $\rightarrow$ `role_permissions` $\rightarrow$ `permissions`).

### 2.1. Référentiel des Permissions Officielles

| Permission (`code`) | Domaine | Action autorisée | OWNER | ADMIN | STOCK_MANAGER | WAREHOUSE_OPERATOR | AUDITOR |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **`products.read`** | Catalogue | Consulter les produits, variantes, catégories, unités et soldes de stock. | ✅ | ✅ | ✅ | ✅ | ✅ |
| **`products.create`** | Catalogue | Créer et modifier des produits, variantes, catégories, unités et attributs. | ✅ | ✅ | ✅ | ❌ | ❌ |
| **`stock.receive`** | Mouvements | Enregistrer et valider des réceptions (`receipt`) et soldes d'ouverture (`opening_balance`). | ✅ | ✅ | ✅ | ✅ | ❌ |
| **`stock.issue`** | Mouvements | Enregistrer et valider des sorties de stock (`issue`). | ✅ | ✅ | ✅ | ✅ | ❌ |
| **`stock.transfer`** | Mouvements | Enregistrer et valider des transferts (`transfer`) entre emplacements ou entrepôts. | ✅ | ✅ | ✅ | ✅ | ❌ |
| **`stock.adjust`** | Mouvements | Valider des ajustements d'écart (`adjustment`) et opérer des contre-passations (`reversal`). | ✅ | ✅ | ✅ | ❌ | ❌ |
| **`inventory.create`** | Inventaires | Ouvrir une campagne d'inventaire physique et saisir les quantités comptées (`counted_quantity`). | ✅ | ✅ | ✅ | ✅ | ❌ |
| **`inventory.validate`** | Inventaires | Clôturer et valider définitivement un inventaire physique (génère l'ajustement comptable). | ✅ | ✅ | ✅ | ❌ | ❌ |
| **`warehouses.manage`** | Logistique | Créer, modifier ou désactiver des entrepôts (`warehouses`) et emplacements (`locations`). | ✅ | ✅ | ✅ | ❌ | ❌ |
| **`members.manage`** | Organisation | Inviter des membres, attribuer des rôles, créer des rôles personnalisés et suspendre des accès. | ✅ | ✅ | ❌ | ❌ | ❌ |
| **`settings.manage`** | Organisation | Modifier `organization_settings` (politique stock négatif, valorisation, devise, seuils). | ✅ | ✅ | ❌ | ❌ | ❌ |
| **`appearance.manage`** | Marque & UI | Modifier `organization_branding` (logos, nom) et `organization_themes` (couleurs, tokens CSS). | ✅ | ✅ | ❌ | ❌ | ❌ |
| **`billing.manage`** | SaaS | Gérer l'abonnement (`subscriptions`), changer de plan et consulter la facturation. | ✅ | ❌ | ❌ | ❌ | ❌ |
| **`platform.admin`** | Plateforme | Administrer l'ensemble du SaaS (plans globaux, supervision des tenants). Réservé `is_platform_admin`. | 🌐 | ❌ | ❌ | ❌ | ❌ |

---

## 3. Défense en Profondeur (Defense-in-Depth)

Pour prévenir toute vulnérabilité de type **IDOR (Insecure Direct Object Reference)** ou fuite de données inter-tenant, G-Stock applique trois barrières cumulatives :

### Barrière 1 : Filtrage systématique par `organization_id` dans les Repositories
Chaque méthode de `*.repository.ts` exige `organizationId: string` comme premier paramètre obligatoire.
- Aucune lecture ne fait `prisma.product.findUnique({ where: { id } })` seule.
- Toutes les lectures, mises à jour et suppressions utilisent des clauses composites :
  ```ts
  await prisma.product.findFirst({
    where: {
      id: productId,
      organizationId: tenantContext.organizationId,
    },
  });
  ```

### Barrière 2 : Vérification d'appartenance croisée des entités liées (Cross-Entity Tenant Check)
Lorsqu'une opération manipule des clés étrangères multiples (ex: création d'une ligne de mouvement associant `product_id`, `variant_id`, `source_location_id`, `destination_location_id`), le service vérifie explicitement que **toutes** ces entités appartiennent à `tenantContext.organizationId` avant d'insérer ou de modifier quoi que ce soit. Si un identifiant appartient à une autre organisation, l'API renvoie `404 Not Found` (pour ne pas révéler l'existence de la ressource chez un autre client).

### Barrière 3 : Configuration Optionnelle PostgreSQL Row-Level Security (RLS)
En complément du filtrage applicatif dans les repositories, la couche base de données supporte l'activation de politiques **PostgreSQL RLS** comme filet de sécurité ultime :
- Au début d'une transaction scopée à un tenant, le helper de base de données peut définir la variable de session locale PostgreSQL :
  ```sql
  SELECT set_config('app.current_organization_id', $1::text, true);
  ```
  (équivalent paramétré et sécurisé de `SET LOCAL app.current_organization_id = '...'`, actif uniquement pour la durée de la transaction en cours).
- Politique RLS type sur les tables multi-tenant :
  ```sql
  ALTER TABLE inventory_balances ENABLE ROW LEVEL SECURITY;

  CREATE POLICY tenant_isolation_policy ON inventory_balances
    USING (organization_id = current_setting('app.current_organization_id', true)::uuid)
    WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);
  ```

---

## 4. Sécurité Applicative & Conformité

### 4.1. Hachage des Mots de Passe
- Les mots de passe en clair ne sont jamais stockés ni journalisés.
- Le hachage utilise **Scrypt** (natif Node.js `crypto.scrypt` avec sel cryptographique aléatoire de 16 octets et paramètres renforcés `N=16384, r=8, p=1`, comparaison en temps constant via `crypto.timingSafeEqual`) ou **Argon2id / Bcrypt**.

### 4.2. Sessions, JWT & Cookies Sécurisés
- Authentification par **Access Token JWT** signé (`HS256` / `RS256`, durée de vie courte : 15 min à 1h) et **Refresh Token** rotatif.
- Prise en charge du transport par cookie `HttpOnly`, `Secure` (en production HTTPS), `SameSite=Lax` ainsi que par en-tête `Authorization: Bearer <token>` pour les appels API explicites.
- Le payload JWT reste minimal (`sub: userId`, `isPlatformAdmin`, `iat`, `exp`) afin d'obliger la vérification en temps réel des droits de `membership` à chaque requête.

### 4.3. Validation Stricte des Entrées (Zod)
- Toutes les entrées (`req.body`, `req.query`, `req.params`, en-têtes personnalisés) sont validées par les schémas **Zod** de `@g-stock/validation` avec `.strict()` ou nettoyage des champs inconnus pour empêcher les attaques par *Mass Assignment* (ex: un utilisateur tentant d'envoyer `is_platform_admin: true` ou `organization_id` dans un payload de mise à jour).
- Les couleurs et variables de thème (`organization_themes`) sont validées par expressions régulières strictes (codes HEX/RGB/HSL valides uniquement) afin d'interdire toute injection CSS ou script via les Custom Properties.

### 4.4. Protection XSS, CSRF, En-têtes HTTP & Rate-Limiting
- **Helmet** activé sur Express (`Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`).
- **Rate Limiting** différencié :
  - Routes publiques d'authentification (`/auth/login`, `/auth/register`, `/invitations/accept`) : limite stricte par IP (ex: 10 tentatives / 15 minutes) contre le brute-force.
  - Routes API authentifiées : limite par utilisateur/tenant (ex: 300 requêtes / minute).
- **CORS** restreint aux origines explicitement déclarées dans la configuration (`ALLOWED_ORIGINS`).

### 4.5. Journal d'Audit Expurgé des Secrets (`audit_logs`)
- Chaque mutation critique (création/validation/annulation de mouvement, validation d'inventaire, modification de rôle, changement de politique de stock négatif, changement de thème ou de plan) génère un enregistrement dans `audit_logs`.
- Un utilitaire de nettoyage récursif (`redactSensitiveFields`) expurge systématiquement des colonnes `before_state_json` et `after_state_json` toute clé sensible (`password`, `password_hash`, `token`, `token_hash`, `secret`, `authorization`, `cookie`, `stripe_secret`) en la remplaçant par `"[REDACTED]"`.
