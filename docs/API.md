# Documentation de l'API REST G-Stock

> **Version :** 1.1  
> **Préfixe de base :** `/api/v1`  
> **Spécification OpenAPI 3.1 :** Exposée dynamiquement sur [`GET /api/v1/openapi.json`](/api/v1/openapi.json) et interface interactive Swagger UI sur `/api/v1/docs` (en développement/staging).

---

## 1. Conventions HTTP REST

### 1.1 Principes Généraux
- **Format d'échange :** JSON (`Content-Type: application/json; charset=utf-8`), à l'exception de l'upload de fichiers (`multipart/form-data`) et des webhooks bruts.
- **Horodatage :** Toutes les dates et heures sont échangées en **ISO 8601 UTC** (ex. `2026-10-12T15:30:00.000Z`). La présentation selon le fuseau horaire de l'organisation (`organization_settings.timezone`) est effectuée par le client ou lors de la génération de rapports.
- **Nombres décimaux et montants :** Les quantités fractionnaires et montants monétaires sont sérialisés sous forme de chaînes décimales exactes (ex. `"125.5000"`, `"19.99"`) accompagnées du code devise ISO 4217 explicite (`"EUR"`, `"XOF"`, `"USD"`) afin d'éviter toute perte de précision liée aux flottants IEEE 754.
- **Validation stricte :** Tous les paramètres d'URL (`params`), de requête (`query`) et de corps (`body`) sont validés par des schémas **Zod** partagés (`@gstock/validation`). Tout tri (`sortBy`, `sortOrder`) ou filtre est contrôlé par liste blanche côté serveur.

### 1.2 Format de Réponse Standard et Paginée

#### Ressource unique (`200 OK` / `201 Created`)
```json
{
  "data": {
    "id": "b7e6d9a2-3f1c-4e8b-9a0d-123456789abc",
    "sku": "PRD-001",
    "name": "Huile Moteur Synthétique 5W30 - 5L"
  }
}
```

#### Collection paginée (`200 OK`)
Toutes les routes de liste acceptent `?page=1&limit=25&search=...&sortBy=created_at&sortOrder=desc` (`limit` borné à `100` maximum).
```json
{
  "data": [
    {
      "id": "b7e6d9a2-3f1c-4e8b-9a0d-123456789abc",
      "sku": "PRD-001",
      "name": "Huile Moteur Synthétique 5W30 - 5L"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 25,
    "total": 142,
    "totalPages": 6
  }
}
```

### 1.3 Format d'Erreur Normalisé

Toute erreur HTTP (`4xx`, `5xx`) retourne invariablement la structure suivante :
```json
{
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Stock disponible insuffisant sur l'emplacement sélectionné pour effectuer cette sortie.",
    "details": {
      "productId": "b7e6d9a2-3f1c-4e8b-9a0d-123456789abc",
      "locationId": "c1a2b3d4-5e6f-4a7b-8c9d-0123456789ab",
      "available": "4.0000",
      "requested": "10.0000"
    },
    "requestId": "req_01J9Z8K4M2N6P8Q0R2S4T6V8W0"
  }
}
```

#### Principaux codes HTTP et codes métier
| Code HTTP | Code Métier (`error.code`) | Signification |
| :--- | :--- | :--- |
| `400` | `VALIDATION_ERROR` | Données d'entrée invalides (`details` contient la liste des champs en erreur Zod). |
| `401` | `UNAUTHENTICATED` | Jeton absent, expiré ou session révoquée. |
| `402` | `SUBSCRIPTION_READ_ONLY` | Abonnement expiré ou suspendu : opérations d'écriture bloquées. |
| `403` | `FORBIDDEN` / `QUOTA_EXCEEDED` | Permission RBAC manquante, module désactivé, quota atteint ou accès inter-organisation refusé. |
| `404` | `RESOURCE_NOT_FOUND` | Ressource introuvable dans le périmètre de l'organisation active (anti-énumération). |
| `409` | `IDEMPOTENCY_CONFLICT` / `DUPLICATE_SKU` / `INSUFFICIENT_STOCK` | Conflit d'état métier, clé d'idempotence réutilisée avec un payload différent ou stock négatif interdit. |
| `422` | `WCAG_CONTRAST_VIOLATION` / `UNIT_DIMENSION_MISMATCH` | Règle métier ou d'accessibilité non respectée. |
| `429` | `RATE_LIMIT_EXCEEDED` | Trop de requêtes sur une fenêtre de temps donnée. |
| `500` | `INTERNAL_SERVER_ERROR` | Erreur serveur inattendue (aucune trace interne n'est exposée au client). |

---

## 2. Authentification et En-têtes HTTP

### 2.1 Mécanismes d'Authentification
L'API supporte deux modes d'authentification complémentaires vérifiés par le middleware `authenticate` :
1. **Cookie de session sécurisé (recommandé pour le frontend Web) :** Cookie `gstock_session` configuré avec `HttpOnly`, `Secure` (en staging/prod), `SameSite=Lax` et protection CSRF par en-tête/jeton.
2. **Jeton Bearer JWT :** En-tête `Authorization: Bearer <access_token>` signé pour les appels API directs ou clients de test.

### 2.2 En-têtes Standards Requis ou Supportés

| En-tête HTTP | Obligatoire | Rôle et validation serveur |
| :--- | :--- | :--- |
| `Authorization` | Oui (si pas de cookie `HttpOnly`) | `Bearer <token>` identifiant l'utilisateur authentifié. |
| `X-Organization-Id` | Oui (routes d'entreprise) | UUID de l'organisation active. **Toujours vérifié côté serveur** contre la table `memberships` (`status = 'ACTIVE'`). Si l'utilisateur n'est pas membre actif, l'API rejette l'appel avec `403 FORBIDDEN`. |
| `Idempotency-Key` | Oui (mutations critiques de stock) | Chaîne unique (UUID v4 recommandé, max 128 car.) garantissant qu'un retry réseau sur `POST /stock/*` ou `POST /inventories/:id/validate` n'exécute jamais deux fois l'opération. |
| `X-Request-Id` | Optionnel (généré sinon) | Identifiant de corrélation propagé dans les logs structurés, les `audit_logs` et la réponse HTTP. |

---

## 3. Catalogue Complet des Routes du MVP (`/api/v1`)

### 3.1 Authentification & Session (`/auth` & `/me`)

| Méthode & Route | Permission | Description | Corps de requête (Body) / Query | Réponse Succès |
| :--- | :--- | :--- | :--- | :--- |
| `POST /api/v1/auth/register` | Public (Rate-limited) | Crée un nouveau compte utilisateur et initialise sa session. | `{ email, password, name }` | `201 Created` — `{ data: { user, accessToken } }` + Cookie `HttpOnly` |
| `POST /api/v1/auth/login` | Public (Rate-limited) | Authentifie un utilisateur existant par email et mot de passe. | `{ email, password }` | `200 OK` — `{ data: { user, memberships, accessToken } }` + Cookie `HttpOnly` |
| `POST /api/v1/auth/logout` | Authentifié | Révoque la session active et efface le cookie `HttpOnly`. | *(aucun)* | `200 OK` — `{ data: { loggedOut: true } }` |
| `GET /api/v1/me` | Authentifié | Retourne le profil de l'utilisateur connecté, ses organisations (`memberships`), ses rôles et ses préférences dans l'organisation courante. | En-tête optionnel `X-Organization-Id` | `200 OK` — `{ data: { user, currentMembership, permissions, preferences } }` |

---

### 3.2 Organisations, Paramètres, Modules & Membres (`/organizations`)

| Méthode & Route | Permission | Description | Corps de requête (Body) / Query | Réponse Succès |
| :--- | :--- | :--- | :--- | :--- |
| `GET /api/v1/organizations` | Authentifié | Liste toutes les organisations auxquelles appartient l'utilisateur connecté. | *(aucun)* | `200 OK` — `{ data: OrganizationSummary[] }` |
| `POST /api/v1/organizations` | Authentifié | Crée une nouvelle organisation, assigne le créateur comme `OWNER`, initialise le profil métier, l'entrepôt par défaut, le thème `gstock-classic` et l'abonnement initial. | `{ name, slug?, industryProfile, countryCode, defaultCurrency, timezone, locale }` | `201 Created` — `{ data: { organization, settings, subscription } }` |
| `GET /api/v1/organizations/current` | Membre actif | Récupère les détails complets de l'organisation active (`X-Organization-Id`), ses paramètres, son thème et le résumé de son abonnement. | *(aucun)* | `200 OK` — `{ data: { organization, settings, branding, theme, subscription } }` |
| `PATCH /api/v1/organizations/current/settings` | `settings.manage` | Met à jour les paramètres opérationnels et régionaux de l'entreprise. | `{ name?, industryProfile?, countryCode?, defaultCurrency?, timezone?, locale?, negativeStockPolicy?, costingMethod? }` | `200 OK` — `{ data: OrganizationSettings }` |
| `GET /api/v1/organizations/current/modules` | Membre actif | Liste les modules métier disponibles, leur inclusion dans le plan actuel et leur état d'activation pour l'organisation. | *(aucun)* | `200 OK` — `{ data: OrganizationModuleStatus[] }` |
| `PATCH /api/v1/organizations/current/modules` | `settings.manage` | Active ou désactive un module métier autorisé par le plan d'abonnement de l'organisation. | `{ moduleKey, enabled }` | `200 OK` — `{ data: OrganizationModuleStatus }` |
| `GET /api/v1/organizations/current/members` | `members.read` / `members.manage` | Liste paginée des membres et invitations de l'organisation avec leurs rôles. | `?page=1&limit=25&status=ACTIVE` | `200 OK` — Liste paginée de `MemberWithRoles` |
| `POST /api/v1/organizations/current/members` | `members.manage` (Sous réserve du quota `max_users`) | Ajoute ou invite un collaborateur dans l'organisation avec un rôle défini (`OWNER`, `ADMIN`, `STOCK_MANAGER`, `WAREHOUSE_OPERATOR`, `AUDITOR`). | `{ email, name?, roleCode, warehouseIds? }` | `201 Created` — `{ data: MemberWithRoles }` |
| `PATCH /api/v1/organizations/current/members/:memberId` | `members.manage` | Modifie le rôle, le périmètre d'entrepôts ou le statut (`ACTIVE`, `SUSPENDED`) d'un membre. Interdit de retirer le dernier `OWNER`. | `{ roleCode?, status?, warehouseIds? }` | `200 OK` — `{ data: MemberWithRoles }` |

---

### 3.3 Catalogue : Catégories, Unités & Produits (`/categories`, `/units`, `/products`)

| Méthode & Route | Permission | Description | Corps de requête (Body) / Query | Réponse Succès |
| :--- | :--- | :--- | :--- | :--- |
| `GET /api/v1/categories` | `products.read` | Liste les catégories de produits de l'organisation (arborescence et statut). | `?search=&parentId=&isActive=true` | `200 OK` — Liste paginée de `Category` |
| `POST /api/v1/categories` | `products.create` | Crée une nouvelle catégorie de produits dans l'organisation. | `{ name, code, parentId?, isActive? }` | `201 Created` — `{ data: Category }` |
| `PATCH /api/v1/categories/:id` | `products.update` | Met à jour une catégorie existante. | `{ name?, code?, parentId?, isActive? }` | `200 OK` — `{ data: Category }` |
| `GET /api/v1/units` | `products.read` | Liste les unités de mesure (globales et propres à l'organisation) ainsi que les conversions configurées. | `?dimension=VOLUME\|MASS\|COUNT\|LENGTH` | `200 OK` — `{ data: { units: UnitOfMeasure[], conversions: UnitConversion[] } }` |
| `POST /api/v1/units` | `products.create` | Crée une unité de mesure personnalisée ou une règle de conversion validée entre deux unités de même dimension. | `{ code, name, dimension, precision }` ou `{ fromUnitId, toUnitId, factor }` | `201 Created` — `{ data: UnitOfMeasure \| UnitConversion }` |
| `GET /api/v1/products` | `products.read` | Liste paginée des produits avec filtres par catégorie, statut, état de stock (`LOW_STOCK`, `OUT_OF_STOCK`), recherche plein texte (`sku`, `name`) et stock total agrégé. | `?page=1&limit=25&search=&categoryId=&isActive=true&stockStatus=&sortBy=name&sortOrder=asc` | `200 OK` — Liste paginée de `ProductWithStockSummary` |
| `POST /api/v1/products` | `products.create` (Sous réserve du quota `max_products`) | Crée un produit dans le catalogue avec son SKU unique par organisation, son unité de base et ses seuils d'alerte. | `{ sku, name, description?, categoryId?, baseUnitId, costPrice?, reorderLevel?, trackingMode?, isActive?, variants?, attributes? }` | `201 Created` — `{ data: ProductDetail }` |
| `GET /api/v1/products/:id` | `products.read` | Retourne la fiche détaillée d'un produit, ses variantes, ses soldes par entrepôt/emplacement et ses derniers mouvements. | *(aucun)* | `200 OK` — `{ data: ProductDetail }` |
| `PATCH /api/v1/products/:id` | `products.update` / `products.archive` | Met à jour un produit ou l'archive (`isActive: false`). Le changement d'unité de base est bloqué si des mouvements existent déjà. | `{ sku?, name?, description?, categoryId?, costPrice?, reorderLevel?, isActive? }` | `200 OK` — `{ data: ProductDetail }` |

---

### 3.4 Entrepôts & Emplacements (`/warehouses`)

| Méthode & Route | Permission | Description | Corps de requête (Body) / Query | Réponse Succès |
| :--- | :--- | :--- | :--- | :--- |
| `GET /api/v1/warehouses` | `stock.read` | Liste les entrepôts de l'organisation avec le nombre d'emplacements et le résumé des stocks. | `?isActive=true&search=` | `200 OK` — Liste paginée de `WarehouseSummary` |
| `POST /api/v1/warehouses` | `warehouses.manage` (Sous réserve du quota `max_warehouses`) | Crée un nouvel entrepôt et initialise automatiquement son emplacement de stockage principal par défaut (`MAIN`). | `{ code, name, address?, isActive? }` | `201 Created` — `{ data: WarehouseWithLocations }` |
| `PATCH /api/v1/warehouses/:id` | `warehouses.manage` | Modifie un entrepôt (désactivation refusée si du stock non nul y réside). | `{ code?, name?, address?, isActive? }` | `200 OK` — `{ data: Warehouse }` |
| `GET /api/v1/warehouses/:id/locations` | `stock.read` | Liste tous les emplacements (`STORAGE`, `RECEIVING`, `SHIPPING`, `QUARANTINE`) d'un entrepôt donné. | `?isActive=true&locationType=` | `200 OK` — `{ data: Location[] }` |
| `POST /api/v1/warehouses/:id/locations` | `warehouses.manage` | Crée un nouvel emplacement au sein de l'entrepôt `:id`. | `{ code, name?, locationType, isActive? }` | `201 Created` — `{ data: Location }` |

---

### 3.5 Moteur de Stock : Soldes & Mouvements (`/stock`)

> **Important :** Toutes les routes `POST /api/v1/stock/*` s'exécutent dans une transaction PostgreSQL stricte avec verrouillage des lignes de solde (`SELECT ... FOR UPDATE`), contrôle de la politique de stock négatif (`negative_stock_policy`), enregistrement dans `audit_logs` et prise en charge de l'en-tête `Idempotency-Key`.

| Méthode & Route | Permission | Description | Corps de requête (Body) / Query | Réponse Succès |
| :--- | :--- | :--- | :--- | :--- |
| `GET /api/v1/stock/balances` | `stock.read` | Liste paginée des soldes de stock (`on_hand`, `reserved`, `available = on_hand - reserved`) par produit, entrepôt et emplacement. | `?page=1&limit=50&productId=&warehouseId=&locationId=&belowReorder=true` | `200 OK` — Liste paginée de `InventoryBalanceRow` |
| `GET /api/v1/stock/movements` | `stock.read` | Journal immuable et paginé des mouvements de stock avec leurs lignes, opérateur, horodatage et référence. | `?page=1&limit=25&movementType=&productId=&warehouseId=&locationId=&dateFrom=&dateTo=` | `200 OK` — Liste paginée de `StockMovementWithLines` |
| `POST /api/v1/stock/receipts` | `stock.receive` | Enregistre et valide une **entrée de marchandise (`receipt`)** créditant un ou plusieurs emplacements de destination. | Header `Idempotency-Key`<br>`{ reference?, occurredAt?, notes?, lines: [{ productId, toLocationId, quantity, unitId?, unitCost? }] }` | `201 Created` — `{ data: StockMovementWithLines }` |
| `POST /api/v1/stock/issues` | `stock.issue` | Enregistre et valide une **sortie de stock (`issue`)** débitant un ou plusieurs emplacements sources (vérifie la disponibilité). | Header `Idempotency-Key`<br>`{ reference?, occurredAt?, reason?, lines: [{ productId, fromLocationId, quantity, unitId? }] }` | `201 Created` — `{ data: StockMovementWithLines }` |
| `POST /api/v1/stock/transfers` | `stock.transfer` | Exécute un **transfert atomique (`transfer`)** entre un emplacement source et un emplacement destination de la même organisation. | Header `Idempotency-Key`<br>`{ reference?, occurredAt?, notes?, lines: [{ productId, fromLocationId, toLocationId, quantity, unitId? }] }` | `201 Created` — `{ data: StockMovementWithLines }` |
| `POST /api/v1/stock/adjustments` | `stock.adjust` | Enregistre un **ajustement de stock (`adjustment`)** positif ou négatif motivé (casse, perte, régularisation, solde initial `opening_balance`). | Header `Idempotency-Key`<br>`{ reference?, reason, movementType?: "adjustment"\|"opening_balance", lines: [{ productId, locationId, quantityDelta, unitCost? }] }` | `201 Created` — `{ data: StockMovementWithLines }` |
| `POST /api/v1/stock/movements/:id/reverse` | `stock.adjust` | Crée un **mouvement compensatoire (`reversal`)** annulant exactement les effets d'un mouvement validé `:id`, sans jamais supprimer ni modifier l'original. | Header `Idempotency-Key`<br>`{ reason }` | `201 Created` — `{ data: StockMovementWithLines }` |

---

### 3.6 Inventaires Physiques (`/inventories`)

| Méthode & Route | Permission | Description | Corps de requête (Body) / Query | Réponse Succès |
| :--- | :--- | :--- | :--- | :--- |
| `GET /api/v1/inventories` | `stock.read` | Liste les sessions d'inventaire physique de l'organisation (`DRAFT`, `IN_PROGRESS`, `VALIDATED`, `CANCELED`). | `?page=1&limit=20&warehouseId=&status=` | `200 OK` — Liste paginée de `InventorySessionSummary` |
| `POST /api/v1/inventories` | `inventory.create` | Ouvre une nouvelle session d'inventaire sur un entrepôt (ou sous-ensemble d'emplacements) et fige un instantané des quantités théoriques attendues (`expected_quantity`). | `{ warehouseId, locationIds?, reference?, notes? }` | `201 Created` — `{ data: InventorySessionDetail }` |
| `GET /api/v1/inventories/:id` | `stock.read` | Retourne le détail d'un inventaire avec toutes ses lignes (`expected_quantity`, `counted_quantity`, `variance`). | `?locationId=&onlyVariances=false&search=` | `200 OK` — `{ data: InventorySessionDetail }` |
| `POST /api/v1/inventories/:id/counts` | `inventory.count` | Enregistre ou met à jour les quantités comptées (`counted_quantity`) pour une ou plusieurs lignes et recalcule `variance = counted_quantity - expected_quantity`. | `{ lines: [{ productId, locationId, countedQuantity }] }` | `200 OK` — `{ data: { updatedLines: InventoryLine[] } }` |
| `POST /api/v1/inventories/:id/validate` | `inventory.validate` | Clôture et valide l'inventaire : génère atomiquement un mouvement `adjustment` pour toutes les lignes présentant un écart (`variance != 0`), met à jour les soldes et journalise l'audit. | Header `Idempotency-Key`<br>`{ notes? }` | `200 OK` — `{ data: { inventory: InventorySessionDetail, adjustmentMovement: StockMovementWithLines \| null } }` |

---

### 3.7 Tableau de Bord, Alertes, Rapports & Audit (`/reports`, `/alerts`, `/audit-logs`)

| Méthode & Route | Permission | Description | Paramètres Query | Réponse Succès |
| :--- | :--- | :--- | :--- | :--- |
| `GET /api/v1/reports/overview` | `stock.read` | Retourne les KPI du tableau de bord calculés sur les données persistées : produits actifs, références sous le seuil, références en rupture, entrepôts actifs, flux entrées/sorties sur la période et derniers mouvements. | `?period=7d\|30d\|90d&warehouseId=` | `200 OK` — `{ data: DashboardOverviewReport }` |
| `GET /api/v1/reports/stock-value` | `stock.read` | Calcule la valorisation estimée du stock par entrepôt et catégorie selon `cost_price` et signale le taux de couverture des coûts renseignés. | `?warehouseId=&categoryId=` | `200 OK` — `{ data: { totalValue, currency, coveragePercent, breakdown } }` |
| `GET /api/v1/alerts/stock` | `stock.read` | Liste les produits en **rupture (`OUT_OF_STOCK` : `available <= 0`)** ou **sous le seuil de réapprovisionnement (`LOW_STOCK` : `0 < available <= reorder_level`)**. | `?page=1&limit=25&severity=OUT_OF_STOCK\|LOW_STOCK&warehouseId=` | `200 OK` — Liste paginée de `StockAlertItem` |
| `GET /api/v1/audit-logs` | `settings.manage` ou `AUDITOR` | Consulte le journal d'audit de l'organisation active (mouvements, validations d'inventaire, changements de rôles, modifications de paramètres). | `?page=1&limit=50&action=&resourceType=&actorUserId=&dateFrom=&dateTo=` | `200 OK` — Liste paginée de `AuditLogEntry` |

---

### 3.8 Apparence, Marque & Préférences (`/settings`)

| Méthode & Route | Permission | Description | Corps de requête (Body) | Réponse Succès |
| :--- | :--- | :--- | :--- | :--- |
| `GET /api/v1/settings/appearance` | Membre actif | Récupère la configuration d'apparence complète de l'organisation (`organization_branding`, `organization_themes`), les préférences de l'utilisateur et le catalogue des 6 thèmes prédéfinis. | *(aucun)* | `200 OK` — `{ data: { branding, organizationTheme, userPreferences, resolvedTheme, presets } }` |
| `PUT /api/v1/settings/appearance` | `appearance.manage` | Met à jour le thème de l'organisation, les couleurs personnalisées (avec validation de contraste WCAG 2.2 AA), les styles de cartes, rayons, densité, échelle de police et `force_brand_theme`. | `{ displayName?, themePreset, colorModeDefault, designTokens?, cardStyle, radiusScale, tableDensity, fontScale, sidebarStyle, forceBrandTheme }` | `200 OK` — `{ data: { branding, organizationTheme, contrastReport } }` |
| `POST /api/v1/settings/branding/logo` | `appearance.manage` (Requiert `custom_branding` dans le plan) | Téléverse ou met à jour le logo de l'entreprise (`multipart/form-data` ou métadonnées d'asset validées : PNG, SVG sécurisé ou WebP, max 2 Mo). | `file` (image) + `type: "logo" \| "favicon"` | `200 OK` — `{ data: { logoUrl, assetId } }` |
| `PUT /api/v1/settings/preferences` | Membre actif | Enregistre les préférences personnelles de l'utilisateur (`color_mode`, `table_density`, `sidebar_collapsed`, `locale`, préférences de colonnes/vues). | `{ colorMode?, tableDensity?, sidebarCollapsed?, locale?, preferencesJson? }` | `200 OK` — `{ data: UserPreferences }` |

---

### 3.9 Facturation, Plans & Quotas (`/billing`)

| Méthode & Route | Permission | Description | Corps de requête (Body) | Réponse Succès |
| :--- | :--- | :--- | :--- | :--- |
| `GET /api/v1/billing/plans` | Authentifié | Liste les plans d'abonnement publics (`starter`, `pro`, `enterprise`), leurs tarifs et leurs quotas/fonctionnalités (`plan_features`). | *(aucun)* | `200 OK` — `{ data: PlanWithFeatures[] }` |
| `GET /api/v1/billing/subscription` | `billing.read` | Retourne l'abonnement actif de l'organisation, son statut (`trialing`, `active`, `past_due`, `canceled`, `suspended`), le mode du provider (`stripe` ou `dev_simulated`) et la jauge d'utilisation actuelle face aux quotas (`usage_counters`). | *(aucun)* | `200 OK` — `{ data: { subscription, plan, entitlements, usage, providerMode } }` |
| `POST /api/v1/billing/checkout` | `billing.manage` | Initie un changement de plan ou une session de paiement via l'abstraction `BillingProvider` (ou bascule immédiate documentée si `DevSimulatedBillingProvider` est actif en développement). | `{ planCode, billingInterval?: "MONTHLY"\|"YEARLY", successUrl?, cancelUrl? }` | `200 OK` — `{ data: { checkoutUrl, simulated: boolean, subscription } }` |
| `POST /api/v1/billing/webhooks/:provider` | Signature HMAC du provider | Point d'entrée idempotent des webhooks de facturation (`stripe`, `dev_simulated`). Vérifie la signature cryptographique et journalise dans `billing_webhook_events`. | Payload brut signé (`Stripe-Signature` ou `X-Dev-Webhook-Signature`) | `200 OK` — `{ data: { received: true, eventId } }` |

---

### 3.10 Administration de la Plateforme G-Stock (`/admin`)

> **Sécurité :** Toutes les routes sous `/api/v1/admin/*` sont strictement réservées aux administrateurs globaux de la plateforme (`user.is_platform_admin === true` / permission `platform.admin`). Un propriétaire d'entreprise standard reçoit systématiquement `403 FORBIDDEN`.

| Méthode & Route | Permission | Description | Corps de requête (Body) / Query | Réponse Succès |
| :--- | :--- | :--- | :--- | :--- |
| `GET /api/v1/admin/overview` | `platform.admin` | Vue globale SaaS : nombre total d'organisations, répartition par plan et statut d'abonnement, utilisateurs actifs, volume de mouvements et santé du service. | *(aucun)* | `200 OK` — `{ data: PlatformAdminOverview }` |
| `GET /api/v1/admin/organizations` | `platform.admin` | Liste paginée de toutes les entreprises clientes inscrites sur G-Stock avec leur plan, statut, quotas consommés et date de création. | `?page=1&limit=25&search=&status=&planCode=` | `200 OK` — Liste paginée de `AdminOrganizationItem` |
| `PATCH /api/v1/admin/organizations/:id` | `platform.admin` | Permet à un administrateur plateforme de suspendre/réactiver une organisation ou d'ajuster son plan/statut d'abonnement (action auditée). | `{ status?, planCode?, subscriptionStatus?, reason }` | `200 OK` — `{ data: AdminOrganizationItem }` |
| `GET /api/v1/admin/plans` | `platform.admin` | Liste tous les plans et la matrice complète de leurs `plan_features` et quotas configurables. | *(aucun)* | `200 OK` — `{ data: PlanWithFeatures[] }` |
| `PATCH /api/v1/admin/plans/:id` | `platform.admin` | Met à jour les tarifs, le statut ou les limites de quotas (`max_users`, `max_warehouses`, `max_products`, etc.) d'un plan sans redéploiement de code. | `{ name?, price?, status?, features: [{ featureKey, enabled, limitValue }] }` | `200 OK` — `{ data: PlanWithFeatures }` |
| `GET /api/v1/admin/modules` | `platform.admin` | Liste le catalogue global des modules métier de la plateforme et leur disponibilité par défaut. | *(aucun)* | `200 OK` — `{ data: PlatformModuleDefinition[] }` |
| `GET /api/v1/admin/audit-logs` | `platform.admin` | Journal d'audit transversal de la plateforme (actions administratives globales et événements de sécurité). | `?page=1&limit=50&organizationId=&action=` | `200 OK` — Liste paginée de `AuditLogEntry` |

---

## 4. Spécification OpenAPI et Santé du Service

- **Schéma OpenAPI 3.1 JSON :** Accessible sur [`GET /api/v1/openapi.json`](/api/v1/openapi.json). Ce document généré à partir des schémas de validation décrit l'intégralité des routes, paramètres, corps de requêtes, réponses et codes d'erreur.
- **Healthcheck :** Accessible sur [`GET /api/v1/health`](/api/v1/health) — Vérifie la disponibilité du serveur HTTP et la connectivité active à PostgreSQL (`SELECT 1`).
