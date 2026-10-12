# G-Stock — Prompt maître de conception et de développement

> **Version :** 1.1  
> **Date :** 12 octobre 2026  
> **Produit :** G-Stock — plateforme SaaS universelle de gestion des stocks  
> **Objectif de ce document :** servir de spécification produit, UX/UI, architecture, données, sécurité, développement, tests et déploiement pour une IA de développement ou une équipe technique.

---

## 0. Instructions générales à l'IA de développement

Tu es une équipe senior composée d'un architecte logiciel, d'un ingénieur full-stack, d'un expert PostgreSQL, d'un designer produit SaaS, d'un spécialiste sécurité applicative et d'un ingénieur QA.

Ta mission est de concevoir et développer **G-Stock**, une plateforme SaaS professionnelle de gestion des stocks, universelle et configurable, utilisable par des entreprises de secteurs très différents.

### Règles de travail impératives

1. **Ne construis pas une simple maquette statique.** Construis une application fonctionnelle, avec navigation, formulaires, validations, états de chargement, erreurs, permissions et persistance.
2. Commence par inspecter le dépôt existant, ses fichiers, scripts, dépendances et conventions. Ne remplace pas arbitrairement une architecture existante qui fonctionne.
3. Avant toute implémentation importante, produis ou mets à jour les documents d'architecture et le plan d'exécution.
4. Développe par phases verticales complètes : interface, API, validation, base de données et tests d'une fonctionnalité doivent avancer ensemble.
5. Ne simule jamais une opération de stock comme si elle était persistée. Si un service externe n'est pas configuré, affiche clairement son état non configuré et propose un mode de développement explicite.
6. Ne présente pas de données fictives comme des données réelles. Les données de démonstration doivent être identifiées comme telles et isolées de la production.
7. N'implémente aucune autorisation uniquement dans l'interface. Le serveur doit contrôler les accès.
8. Ne laisse pas de boutons décoratifs sans action. Chaque commande visible doit fonctionner ou être explicitement désactivée avec une explication.
9. Privilégie le code lisible, typé, modulaire, documenté et testable. Évite les abstractions prématurées et les microservices prématurés.
10. N'expose jamais de secrets, mots de passe, tokens ou clés privées dans le frontend, les logs ou le dépôt.
11. N'invente pas les règles métier manquantes : documente les hypothèses, utilise des valeurs configurables lorsque c'est approprié et signale les décisions qui nécessitent une validation.
12. À la fin de chaque phase, lance les vérifications disponibles, corrige les erreurs et résume les fichiers créés, les choix faits, les tests exécutés et les points restant à traiter.

---

# 1. Vision du produit

## 1.1 Nom et positionnement

**Nom : G-Stock**

G-Stock est une plateforme SaaS multi-entreprises de gestion de stocks et de flux de marchandises. Elle doit pouvoir s'adapter à différents secteurs grâce à un noyau commun, des paramètres configurables et des modules métier activables.

Positionnement :
- Universel, sans être générique au point de devenir compliqué.
- Professionnel, fiable, clair et accessible.
- Configurable par entreprise et, lorsque nécessaire, par utilisateur.
- Responsive : ordinateur, tablette et téléphone.
- Évolutif : démarrer par un MVP robuste et ajouter des modules sans réécrire le noyau.

## 1.2 Secteurs à prendre en charge progressivement

Le noyau doit convenir à :
- commerces, boutiques et supermarchés ;
- grossistes et distributeurs ;
- entrepôts et logistique ;
- restaurants et métiers de bouche ;
- pharmacies et secteurs nécessitant une traçabilité renforcée ;
- vêtements, chaussures et accessoires avec tailles/couleurs ;
- pièces automobiles ;
- construction et matériaux ;
- industrie et matières premières ;
- autres activités configurables.

Ne prétends pas qu'un même paramétrage suffit à satisfaire toutes les obligations réglementaires. Les secteurs réglementés doivent utiliser des modules spécifiques et être validés selon le pays.

## 1.3 Principes produit

- Une seule plateforme, plusieurs entreprises totalement isolées.
- Chaque entreprise possède son catalogue, ses équipes, ses entrepôts, ses paramètres, ses modules et son abonnement.
- Le module de ventes est optionnel : le noyau fonctionne sans caisse ni vente.
- Le produit doit pouvoir fonctionner pour une entreprise qui gère uniquement des entrées, sorties, transferts et inventaires.
- Les préférences de marque et d'apparence ne doivent jamais modifier les règles métier.
- La personnalisation visuelle doit être puissante mais contrôlée par des thèmes et des design tokens, pas par du CSS libre arbitraire.
- Les opérations de stock sont traçables, transactionnelles et auditées.

---

# 2. Périmètre fonctionnel

## 2.1 MVP obligatoire

Construire les fonctionnalités suivantes :

1. Inscription, connexion, déconnexion et gestion de session.
2. Création d'une organisation/entreprise.
3. Gestion des membres et invitations, avec rôles et permissions.
4. Sélection d'un profil d'activité au démarrage.
5. Paramètres de l'organisation : nom, logo, pays, devise, fuseau horaire, langue et format régional.
6. Catalogue des produits et catégories.
7. Unités de mesure et conversions simples validées.
8. Entrepôts et emplacements.
9. Entrées de stock, sorties, ajustements et transferts.
10. Journal des mouvements de stock.
11. Inventaires physiques et validation des écarts.
12. Soldes de stock par produit et emplacement.
13. Alertes de seuil bas et de rupture.
14. Tableau de bord avec indicateurs issus des données persistées.
15. Recherche, filtres, tri et pagination côté serveur.
16. Import/export CSV ou Excel lorsque l'import peut être validé proprement.
17. Journal d'audit des actions sensibles.
18. Paramètres d'apparence : couleurs, thèmes, styles, densité et préférences d'affichage.
19. Gestion SaaS des plans, abonnements, quotas et modules, avec prestataire de paiement derrière une abstraction.
20. Interface d'administration de la plateforme, distincte de l'espace client.
21. Tests automatisés des règles de stock et de l'isolation multi-tenant.
22. Documentation de développement, déploiement et exploitation.

## 2.2 Fonctionnalités post-MVP

Ne pas retarder le MVP pour ces fonctionnalités, mais prévoir une architecture qui les accepte :
- achats avancés, fournisseurs et réceptions partielles ;
- ventes, caisse, commandes et retours ;
- suivi des lots, dates d'expiration et numéros de série ;
- variantes complexes de produits ;
- nomenclatures, fabrication et assemblage ;
- recettes et consommation d'ingrédients ;
- lecture de codes-barres par caméra et scanners externes ;
- notifications email, in-app et éventuellement SMS ;
- intégrations comptables et API publique ;
- application mobile native ;
- analyse prédictive et recommandations ;
- multi-devises avancé et opérations inter-sociétés.

---

# 3. Utilisateurs, rôles et permissions

## 3.1 Types d'utilisateurs

- **Administrateur de plateforme G-Stock** : gère le SaaS, les plans, les organisations, les modules globaux et l'état du service.
- **Propriétaire d'entreprise** : contrôle les paramètres de son organisation, l'équipe, les modules et l'abonnement.
- **Administrateur d'entreprise** : administre l'espace dans les limites autorisées par le propriétaire.
- **Responsable de stock** : gère les produits, emplacements, mouvements et inventaires.
- **Magasinier** : exécute les opérations autorisées.
- **Auditeur/lecteur** : consulte les données et historiques sans les modifier.
- **Rôle personnalisé** : permissions configurables selon le plan et les règles de l'entreprise, si cette capacité est activée.

## 3.2 Contrôle d'accès

Mettre en place un RBAC (Role-Based Access Control) :
- permissions explicites par ressource et action ;
- appartenance de l'utilisateur à l'organisation vérifiée côté serveur ;
- permissions éventuellement limitées à certains entrepôts ;
- contrôle du module et du plan d'abonnement ;
- refus par défaut en cas d'absence de permission ;
- audit des opérations sensibles.

Exemples de permissions :
- `products.read`, `products.create`, `products.update`, `products.archive`;
- `stock.read`, `stock.receive`, `stock.issue`, `stock.transfer`, `stock.adjust`;
- `inventory.create`, `inventory.count`, `inventory.validate`;
- `warehouses.manage`, `members.manage`, `settings.manage`;
- `billing.read`, `billing.manage`, `appearance.manage`.

Ne te fie jamais à un `organization_id`, un rôle ou un prix envoyés librement par le client. Résous et vérifie le contexte côté serveur.

---

# 4. Personnalisation visuelle — exigence majeure

La personnalisation visuelle est une fonctionnalité de première classe de G-Stock. Une entreprise doit pouvoir adapter l'apparence de son espace sans modifier le code ni affecter les autres entreprises.

## 4.1 Paramètres d'apparence

Créer une section **Paramètres → Apparence et personnalisation**, avec aperçu en direct et bouton de réinitialisation.

Permettre au minimum :

### Couleurs
- couleur primaire de la marque ;
- couleur secondaire ;
- couleur d'accentuation ;
- couleur de fond de l'application ;
- couleur des surfaces/cartes ;
- couleur du texte principal et secondaire, dérivée autant que possible des thèmes ;
- couleurs des états : succès, avertissement, erreur et information ;
- mode clair, sombre et système ;
- palette prédéfinie et personnalisation avancée.

### Thèmes prédéfinis
Fournir plusieurs thèmes soignés, par exemple :
- G-Stock Classic : neutre, blanc et vert émeraude ;
- Ocean : bleu et cyan ;
- Graphite : gris, noir et accent discret ;
- Violet : violet et lavande ;
- Sand : beige et tons chauds ;
- High Contrast : contraste renforcé.

Ces thèmes sont des suggestions initiales. Les couleurs doivent être centralisées dans des design tokens et non codées en dur dans chaque composant.

### Styles et densité
- style des cartes : standard, bordure discrète ou ombre légère ;
- rayon des angles : compact, standard, arrondi ;
- densité des tableaux : confortable, standard ou compacte ;
- taille de police : petite, standard ou grande, dans des limites accessibles ;
- style de navigation : barre latérale standard ou compacte ;
- barre latérale fixe ou repliable ;
- préférence d'affichage des tableaux : lignes ou cartes sur petits écrans ;
- animations réduites ou normales, respectant la préférence système.

Ne pas offrir un éditeur de CSS arbitraire dans le MVP. Les choix doivent rester sûrs, cohérents, maintenables et compatibles avec l'accessibilité.

## 4.2 Logo et identité de l'entreprise

Permettre selon le plan :
- upload du logo de l'entreprise ;
- affichage du logo dans la navigation et les exports ;
- nom de marque affiché dans l'espace ;
- favicon ou icône d'espace si supporté ;
- image de profil de l'organisation ;
- aperçu du rendu du logo sur fonds clair et sombre.

Valider les formats, dimensions et taille des fichiers. Le stockage doit être privé ou public selon le type de ressource, avec contrôle d'accès. Ne pas enregistrer les images en base sous forme de chaînes base64.

## 4.3 Portée des préférences

Séparer les niveaux :
- **Thème par défaut de l'organisation** : utilisé par les nouveaux membres.
- **Préférence personnelle** : un utilisateur peut choisir clair/sombre et densité, si l'organisation autorise ce choix.
- **Paramètres de marque** : couleurs et logo communs à l'entreprise.
- **Préférences métier** : colonnes visibles, ordre des colonnes, filtres favoris et page d'accueil, par utilisateur.

Une préférence personnelle ne doit pas écraser la marque de l'entreprise. Prévoir une politique d'organisation permettant soit de forcer le thème de marque, soit de laisser certains choix individuels.

## 4.4 Mise en œuvre technique des thèmes

Utiliser des CSS custom properties/design tokens :
- `--color-primary`
- `--color-primary-foreground`
- `--color-secondary`
- `--color-accent`
- `--color-background`
- `--color-surface`
- `--color-surface-muted`
- `--color-text`
- `--color-text-muted`
- `--color-border`
- `--color-success`
- `--color-warning`
- `--color-danger`
- `--color-info`
- `--radius-card`
- `--radius-control`
- `--sidebar-width`
- `--table-density`
- `--font-scale`

Le thème doit être appliqué au niveau du conteneur racine de l'espace connecté ou via une stratégie documentée. Prévenir le flash de thème incorrect au chargement. Valider les valeurs de couleurs côté serveur. Vérifier le contraste WCAG 2.2 AA pour le texte et les contrôles lorsque c'est applicable. Ne pas accepter des valeurs CSS arbitraires ou des URL dans les tokens.

Créer un catalogue central de tokens, avec :
- valeurs de référence ;
- valeurs de chaque thème ;
- règles de contraste ;
- fonction de validation/normalisation ;
- fallback fiable en cas de configuration invalide.

## 4.5 Modèle de données de personnalisation

Prévoir des entités dédiées, par exemple :
- `organization_branding` : logo, nom d'affichage et paramètres de marque ;
- `organization_themes` : thème sélectionné et tokens autorisés ;
- `user_preferences` : thème clair/sombre, densité et préférences d'interface ;
- `saved_views` : filtres et colonnes personnalisés, si retenus.

Ne pas stocker tout le système de personnalisation dans un unique champ JSON opaque. Un JSON validé peut être utilisé pour les tokens complémentaires, mais les paramètres essentiels doivent rester explicites et documentés.

## 4.6 Expérience utilisateur de personnalisation

L'écran doit présenter :
1. Une galerie de thèmes avec aperçu.
2. Des contrôles de couleur accessibles avec champ hexadécimal et sélecteur.
3. Un aperçu live comprenant sidebar, boutons, cartes, tableau et graphiques.
4. Le choix clair/sombre/système.
5. Les options de densité et d'arrondi.
6. La gestion du logo.
7. Les boutons « Enregistrer », « Annuler » et « Réinitialiser ».
8. Un indicateur d'enregistrement réussi ou d'erreur.
9. Un contrôle d'accès selon les permissions.
10. Une confirmation avant de réinitialiser une personnalisation importante.

L'aperçu non enregistré doit être local à la session d'édition. L'enregistrement ne doit affecter que l'organisation concernée. Les changements ne doivent pas être appliqués à toutes les entreprises.

---

# 5. UX/UI et direction artistique

## 5.1 Direction visuelle

Créer une interface professionnelle, moderne, nette et fonctionnelle. L'apparence doit évoquer un outil de gestion fiable, et non une page marketing excessive.

Principes :
- interface claire par défaut ;
- hiérarchie typographique lisible ;
- navigation stable ;
- espacements cohérents ;
- tableaux efficaces ;
- graphiques sobres ;
- formulaires structurés ;
- états vides utiles ;
- couleurs de statut compréhensibles et jamais utilisées comme seul moyen de transmettre une information ;
- icônes cohérentes provenant d'une bibliothèque reconnue ;
- composants réutilisables ;
- pas d'effets décoratifs lourds ou d'animations inutiles.

Ne pas imposer le vert comme seule palette. Le thème initial peut utiliser un accent vert, mais chaque entreprise doit pouvoir changer sa palette selon les limites définies.

## 5.2 Layout desktop

- Sidebar gauche avec logo, sélecteur d'entreprise si l'utilisateur en possède plusieurs, navigation et modules actifs.
- En-tête avec recherche globale, notifications, aide, profil utilisateur et entreprise active.
- Zone centrale avec titre, fil d'Ariane lorsque nécessaire, actions principales, filtres et contenu.
- Cartes KPI sur le tableau de bord.
- Tableaux avec tri, pagination, filtres et actions.
- Barre latérale repliable.
- Largeur de contenu et espacements adaptés aux grands écrans.

## 5.3 Layout mobile et tablette

- Navigation compacte adaptée au tactile.
- Menus accessibles et boutons suffisamment grands.
- Tableaux transformés en cartes ou avec défilement horizontal maîtrisé.
- Formulaires sur une colonne.
- Actions primaires accessibles sans défilement excessif.
- Flux d'inventaire optimisé pour le comptage rapide.
- Scanner de code-barres facultatif si matériel/API disponibles.
- Aucun débordement horizontal global.
- Ne pas simplement réduire le desktop : repenser la hiérarchie des actions.

## 5.4 Pages attendues

### Public et authentification
- page d'accueil/présentation ;
- inscription ;
- connexion ;
- récupération du mot de passe ;
- invitation et acceptation d'invitation ;
- sélection ou création d'entreprise ;
- choix du profil d'activité.

### Espace entreprise
- dashboard ;
- produits ;
- création/modification de produit ;
- catégories ;
- unités de mesure ;
- entrepôts ;
- emplacements ;
- mouvements de stock ;
- nouvelle entrée/sortie/transfert ;
- inventaires ;
- détails et historique ;
- alertes ;
- rapports ;
- équipe et rôles ;
- modules ;
- apparence et marque ;
- paramètres de l'entreprise ;
- abonnement et facturation ;
- profil personnel et préférences.

### Administration G-Stock
- aperçu des organisations ;
- détail d'une organisation ;
- plans et tarifs ;
- modules disponibles ;
- abonnements et statuts de facturation ;
- limites d'usage ;
- événements techniques et erreurs ;
- paramètres globaux ;
- actions administratives auditées.

L'administration de la plateforme doit être séparée de l'espace des clients et protégée par des permissions dédiées.

---

# 6. Tableau de bord et indicateurs

Les KPI doivent provenir des données persistées et être définis précisément.

MVP :
- nombre de produits actifs ;
- nombre de références sous le seuil ;
- nombre de références en rupture ;
- nombre d'entrepôts actifs ;
- mouvements récents ;
- entrées/sorties sur la période ;
- valeur estimée du stock, seulement si les coûts sont suffisamment renseignés ;
- produits nécessitant une attention particulière.

Chaque indicateur doit définir :
- sa formule ;
- sa période ;
- son fuseau horaire ;
- ses filtres ;
- les rôles autorisés à le voir ;
- son comportement en l'absence de données.

Ne pas appeler « bénéfice » la différence entre prix de vente et coût théorique sans tenir compte des retours, frais et règles comptables. Le MVP est un outil de stock, pas un système comptable complet.

Utiliser Recharts ou une bibliothèque comparable, avec légendes, tooltips, états vides, valeurs accessibles et couleurs dérivées du thème.

---

# 7. Architecture technique détaillée

## 7.1 Stack cible

- Monorepo : pnpm workspaces + Turborepo.
- Frontend : Next.js, React, TypeScript.
- UI : Tailwind CSS et bibliothèque de composants accessible, par exemple shadcn/ui si elle convient au dépôt.
- Formulaires : React Hook Form + Zod.
- État partagé UI : Redux Toolkit.
- Cache API : RTK Query.
- Backend : Node.js + Express + TypeScript.
- ORM : Prisma.
- Base : PostgreSQL.
- Graphiques : Recharts.
- Tests unitaires/intégration : Vitest et Supertest.
- Tests end-to-end : Playwright.
- Documentation API : OpenAPI/Swagger.
- Conteneurs : Docker.
- CI : pipeline d'installation, lint, typecheck, tests et build.
- Observabilité : logs structurés, suivi des erreurs et métriques sans secrets.
- Redis/BullMQ : uniquement quand des tâches asynchrones réelles le justifient.
- Stockage objet : pour logos, photos et documents.

Les versions exactes doivent être stables et compatibles au moment de l'installation. Ne pas installer aveuglément les versions les plus récentes sans vérifier les dépendances.

## 7.2 Structure du monorepo

```text
g-stock/
├── apps/
│   ├── web/
│   │   └── src/
│   │       ├── app/
│   │       ├── components/
│   │       ├── features/
│   │       ├── layouts/
│   │       ├── hooks/
│   │       ├── lib/
│   │       ├── store/
│   │       └── styles/
│   └── api/
│       └── src/
│           ├── config/
│           ├── middleware/
│           ├── modules/
│           ├── shared/
│           ├── jobs/
│           ├── app.ts
│           └── server.ts
├── packages/
│   ├── database/
│   ├── validation/
│   ├── types/
│   ├── ui/
│   └── config/
├── docs/
├── infra/
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

## 7.3 Organisation de chaque module backend

```text
products/
├── products.routes.ts
├── products.controller.ts
├── products.service.ts
├── products.repository.ts
├── products.schemas.ts
├── products.permissions.ts
└── products.test.ts
```

Responsabilités :
- routes : méthode HTTP, URL et middleware ;
- contrôleur : adaptation HTTP ;
- service : règles métier et transactions ;
- repository : accès aux données ;
- schémas : validation ;
- permissions : autorisations requises ;
- tests : comportements attendus et cas limites.

Évite de mettre toute la logique métier dans les contrôleurs ou dans des composants React.

---

# 8. Modèle de données détaillé

## 8.1 Conventions

- UUID pour les identifiants principaux.
- `created_at`, `updated_at` en `timestamptz` quand applicable.
- Stocker les dates/heures en UTC et présenter selon le fuseau horaire de l'organisation.
- Utiliser `numeric/decimal` pour les quantités fractionnaires et montants, avec précision définie par le domaine.
- Ne jamais utiliser de `float` pour les montants monétaires.
- Contraintes SQL, clés étrangères, index et contraintes uniques.
- Soft delete uniquement quand il a un sens métier ; ne jamais supprimer l'historique des mouvements validés.
- Les identifiants d'entreprise doivent être vérifiés dans toutes les relations de données propres à une organisation.

## 8.2 Identité et multi-tenant

### `users`
- `id`
- `email` normalisé et unique selon la stratégie d'authentification
- `password_hash` si authentification locale
- `name`
- `status`
- `email_verified_at`
- `created_at`
- `updated_at`

### `organizations`
- `id`
- `name`
- `slug`
- `status`
- `created_at`
- `updated_at`

### `memberships`
- `id`
- `organization_id`
- `user_id`
- `status`
- `joined_at`
- contrainte unique `(organization_id, user_id)`

### `roles`, `permissions`, `role_permissions`, `membership_roles`
Modéliser les rôles et permissions avec des relations explicites. Ne pas se limiter à un champ texte libre pour les permissions.

### `organization_settings`
- `organization_id`
- `industry_profile`
- `country_code`
- `default_currency`
- `timezone`
- `locale`
- `negative_stock_policy`
- `costing_method`
- `created_at`
- `updated_at`

## 8.3 Apparence et préférences

### `organization_branding`
- `organization_id`
- `display_name`
- `logo_asset_id`
- `favicon_asset_id`, si supporté
- `created_at`
- `updated_at`

### `organization_themes`
- `organization_id`
- `theme_preset`
- `color_mode_default` (`light`, `dark`, `system`)
- `design_tokens` JSON validé et limité aux clés autorisées
- `card_style`
- `radius_scale`
- `table_density`
- `font_scale`
- `sidebar_style`
- `force_brand_theme`
- `updated_at`

### `user_preferences`
- `user_id`
- `organization_id` nullable selon le type de préférence
- `color_mode`
- `table_density`
- `sidebar_collapsed`
- `locale`
- `preferences_json` validé
- `updated_at`

### `saved_views` (si retenu)
- `id`
- `organization_id`
- `user_id`
- `resource_type`
- `name`
- `filters_json`
- `columns_json`
- `sort_json`
- `created_at`
- `updated_at`

## 8.4 Catalogue

### `categories`
- `id`, `organization_id`, `parent_id`, `name`, `code`, `is_active`

### `units_of_measure`
- `id`, `organization_id` nullable si unités globales gérées par la plateforme
- `code`, `name`, `dimension`, `precision`

### `unit_conversions`
- `id`, `organization_id`, `from_unit_id`, `to_unit_id`, `factor`
- valider la compatibilité des dimensions et la précision.

### `products`
- `id`, `organization_id`, `category_id`, `sku`, `name`, `description`
- `base_unit_id`, `cost_price`, `reorder_level`
- `tracking_mode`, `is_active`, `created_at`, `updated_at`
- contrainte unique `(organization_id, sku)` si le SKU est obligatoire.

### `product_variants`
- `id`, `organization_id`, `product_id`, `sku`, `attributes`
- prévoir des règles d'unicité et un schéma validé pour les attributs.

### `product_attribute_definitions`, `product_attribute_values`
Définir les attributs spécifiques à un profil métier. Garder les champs essentiels du stock dans des colonnes relationnelles.

## 8.5 Entrepôts et soldes

### `warehouses`
- `id`, `organization_id`, `code`, `name`, `is_active`

### `locations`
- `id`, `organization_id`, `warehouse_id`, `code`, `location_type`, `is_active`

### `inventory_balances`
- `organization_id`, `product_id`, `location_id`
- `on_hand`, `reserved`, `updated_at`
- contrainte unique `(organization_id, product_id, location_id)`
- contrainte `on_hand >= 0` si la politique choisie interdit le stock négatif.

La disponibilité est généralement `on_hand - reserved`, mais cette formule doit être appliquée de manière uniforme et validée.

## 8.6 Mouvements et inventaires

### `stock_movements`
- `id`, `organization_id`, `movement_type`, `status`
- `reference`, `occurred_at`, `created_by`, `validated_by`, `validated_at`
- `reversal_of_movement_id` nullable
- `idempotency_key` ou table d'idempotence dédiée
- `created_at`

### `stock_movement_lines`
- `id`, `organization_id`, `movement_id`, `product_id`
- `from_location_id` nullable, `to_location_id` nullable
- `quantity`, `unit_cost`
- contraintes garantissant le bon sens de l'opération.

### `inventories`
- `id`, `organization_id`, `warehouse_id`, `status`
- `created_by`, `validated_by`, `started_at`, `validated_at`

### `inventory_lines`
- `id`, `organization_id`, `inventory_id`, `product_id`, `location_id`
- `expected_quantity`, `counted_quantity`, `variance`
- ne pas écraser les quantités théoriques sans conserver la trace de l'écart.

## 8.7 SaaS

### `plans`
- `id`, `code`, `name`, `status`, `billing_interval`, `price`, `currency`

### `plan_features`
- `plan_id`, `feature_key`, `enabled`, `limit_value`

### `subscriptions`
- `id`, `organization_id`, `plan_id`, `status`
- `provider`, `provider_customer_id`, `provider_subscription_id`
- `current_period_start`, `current_period_end`, `trial_end`, `cancel_at_period_end`

### `billing_webhook_events`
- identifiant externe unique, type d'événement, date de réception, statut de traitement, erreurs expurgées des données sensibles.

### `usage_counters`
- `organization_id`, `feature_key`, `period_key`, `usage_value`

## 8.8 Audit et sécurité

### `audit_logs`
- `id`, `organization_id` nullable pour les actions de plateforme
- `actor_user_id`, `action`, `resource_type`, `resource_id`
- `occurred_at`, `request_id`, `metadata` filtrée des données sensibles.

### `idempotency_keys`
- `organization_id`, `key`, `request_hash`, `response_reference`, `created_at`
- unique `(organization_id, key)`.

Ne jamais enregistrer mots de passe, tokens d'authentification ou données de paiement sensibles dans les logs.

---

# 9. Règles du moteur de stock

Le moteur de stock est la partie la plus critique de G-Stock.

## 9.1 Types de mouvement

- `receipt` : entrée de marchandises ;
- `issue` : sortie ;
- `transfer` : transfert entre emplacements ;
- `adjustment` : correction validée ;
- `opening_balance` : solde initial au démarrage ;
- `reversal` : opération compensatoire.

Les achats et ventes avancés créeront des mouvements via les services métier, sans modifier directement les soldes.

## 9.2 Invariants

1. Un mouvement validé est conservé et audité.
2. Une correction d'un mouvement validé passe par une compensation, pas par l'édition destructive.
3. Les lignes et les soldes sont modifiés dans la même transaction PostgreSQL.
4. Un transfert débite et crédite les emplacements atomiquement.
5. Les doublons de requêtes ne doivent pas produire des mouvements supplémentaires.
6. La politique de stock négatif est définie et contrôlée côté serveur.
7. Les mises à jour concurrentes utilisent des verrous ou des mises à jour conditionnelles atomiques.
8. Une ligne de mouvement ne peut référencer que des produits et emplacements appartenant à la même organisation.
9. La méthode de valorisation doit être documentée et cohérente.
10. Les soldes doivent pouvoir être rapprochés du journal de mouvements.

## 9.3 Validation transactionnelle

Lors d'une opération :
1. authentifier et autoriser l'utilisateur ;
2. valider le module et les permissions ;
3. valider les données ;
4. vérifier l'idempotence ;
5. ouvrir une transaction ;
6. verrouiller ou modifier atomiquement les soldes concernés ;
7. créer le mouvement et ses lignes ;
8. mettre à jour les soldes ;
9. écrire les événements d'audit ;
10. valider la transaction ;
11. déclencher les notifications après commit, idéalement avec un outbox transactionnel si les événements deviennent critiques.

Ne jamais effectuer une mise à jour de solde avant d'avoir validé les règles du mouvement.

---

# 10. API REST

Préfixe : `/api/v1`

Routes MVP indicatives :
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/refresh` si l'architecture de session le requiert
- `GET /me`
- `POST /organizations`
- `GET /organizations/current`
- `PATCH /organizations/current/settings`
- `GET /organizations/current/modules`
- `GET /products`
- `POST /products`
- `GET /products/:id`
- `PATCH /products/:id`
- `GET /categories`
- `GET /warehouses`
- `POST /warehouses`
- `GET /stock/balances`
- `GET /stock/movements`
- `POST /stock/receipts`
- `POST /stock/issues`
- `POST /stock/transfers`
- `POST /stock/adjustments`
- `POST /inventories`
- `POST /inventories/:id/counts`
- `POST /inventories/:id/validate`
- `GET /reports/overview`
- `GET /reports/stock-value`
- `GET /alerts/stock`
- `GET /settings/appearance`
- `PUT /settings/appearance`
- `POST /settings/branding/logo`
- `GET /billing/subscription`
- `POST /billing/checkout` selon le prestataire
- `POST /billing/webhooks/:provider` avec vérification de signature.

Documenter chaque route dans OpenAPI : paramètres, schémas, erreurs, permissions et exemples.

## 10.1 Conventions HTTP

- pagination serveur ;
- filtres et tris validés par liste blanche ;
- dates ISO 8601 ;
- montants en décimaux exacts et devises explicites ;
- codes HTTP appropriés ;
- format d'erreur commun avec code métier, message compréhensible et `request_id` ;
- protection contre l'énumération de ressources ;
- limites de taille des requêtes ;
- limitation de débit sur les routes sensibles.

---

# 11. Sécurité et isolation multi-tenant

L'isolation est obligatoire dès la première migration.

- Chaque requête de données d'entreprise doit avoir un contexte d'organisation authentifié et vérifié.
- L'utilisateur ne peut pas choisir arbitrairement un `organization_id` pour accéder à une autre entreprise.
- Toutes les relations inter-objets doivent être contrôlées.
- Les requêtes doivent filtrer par organisation côté serveur.
- Utiliser des clés étrangères composites lorsque cela renforce les garanties d'intégrité.
- Envisager PostgreSQL Row-Level Security comme défense supplémentaire, correctement configurée avec le contexte de session et les connexions du pool.
- Le contexte RLS doit être initialisé transactionnellement et ne jamais fuiter entre connexions réutilisées.
- Authentification : préférer une gestion de session robuste ; si cookies, utiliser `HttpOnly`, `Secure`, `SameSite` et protections CSRF adaptées.
- Hash des mots de passe avec un algorithme adapté et une configuration robuste.
- Validation stricte des entrées.
- Protection XSS, CSRF, injection SQL et abus de requêtes.
- Contrôle de type et de taille des fichiers importés.
- Secrets hors du dépôt.
- Logs expurgés.
- Sauvegardes chiffrées et essais de restauration.
- Journal d'audit des actions administratives et opérations de stock.
- Tests automatiques prouvant qu'un utilisateur d'une organisation ne peut pas accéder aux données d'une autre.

Ne prétends pas que la présence de RLS suffit à sécuriser le système. La sécurité doit être défendue à plusieurs niveaux.

---

# 12. Abonnements et limites

Créer un moteur de droits SaaS qui distingue :
1. fonctionnalité disponible dans le produit ;
2. fonctionnalité incluse dans le plan ;
3. fonctionnalité activée pour l'organisation ;
4. permission de l'utilisateur à l'utiliser ;
5. quota disponible.

Les limites possibles :
- nombre de membres ;
- nombre d'entrepôts ;
- nombre de produits ;
- volume de fichiers ;
- modules premium ;
- fréquence d'exports ou autres ressources mesurables.

Les limites doivent être configurables depuis le back-office, pas codées en dur dans les composants.

Créer une abstraction de paiement (`BillingProvider`) afin de ne pas coupler la logique métier à un prestataire unique. Les webhooks doivent être signés, idempotents et audités. Prévoir les statuts `trialing`, `active`, `past_due`, `canceled`, `suspended` selon les besoins du fournisseur.

La politique en cas d'abonnement expiré doit être explicite : accès en lecture, période de grâce, blocage des écritures ou suspension. Ne supprime jamais les données d'une entreprise simplement parce que son abonnement expire.

---

# 13. Recherche, performances et évolutivité

- Indexer les clés étrangères et les colonnes de filtrage fréquentes.
- Ajouter des index uniques sur les références SKU par organisation.
- Paginer les grands tableaux.
- Éviter les requêtes N+1.
- Mesurer les requêtes lentes.
- Calculer les indicateurs coûteux par agrégations adaptées ou vues matérialisées lorsque cela est nécessaire.
- Ne pas ajouter Redis sans besoin mesuré.
- Utiliser une file de tâches pour les exports volumineux, imports, notifications et rapports longs.
- Prévoir une stratégie de rétention et d'archivage des journaux à grande échelle.
- Éviter de charger tout le catalogue dans Redux.
- Ne pas stocker les images directement en base de données.
- Concevoir les opérations critiques pour rester correctes en cas de retry réseau.

---

# 14. Tests et assurance qualité

## 14.1 Tests unitaires

Tester :
- calcul des disponibilités ;
- entrées, sorties et transferts ;
- conversion des unités ;
- validation des quantités ;
- seuils d'alerte ;
- calcul de valorisation ;
- permissions ;
- accès aux modules et quotas ;
- validation des thèmes et contraste ;
- traitement des doublons.

## 14.2 Tests d'intégration

Tester avec PostgreSQL réel ou environnement de test équivalent :
- transactions de stock ;
- rollback en cas d'erreur ;
- conflits concurrents ;
- contraintes de clés étrangères ;
- idempotence ;
- isolation multi-tenant ;
- migrations ;
- événements de facturation et webhooks simulés.

## 14.3 Tests end-to-end

Scénarios prioritaires :
1. créer un compte ;
2. créer une entreprise ;
3. sélectionner le profil métier ;
4. ajouter un produit ;
5. créer un entrepôt ;
6. enregistrer une réception ;
7. vérifier le solde ;
8. effectuer une sortie ;
9. transférer du stock ;
10. réaliser un inventaire ;
11. changer les couleurs et le thème ;
12. enregistrer le thème et vérifier sa persistance après rechargement ;
13. vérifier l'expérience mobile ;
14. vérifier les rôles ;
15. tenter d'accéder aux données d'une autre entreprise ;
16. simuler un abonnement expiré et vérifier la politique d'accès.

---

# 15. Plan de réalisation

## Phase 0 — Découverte et conception
- inspecter le dépôt ;
- valider les conventions ;
- définir les règles de stock ;
- établir les maquettes ;
- documenter les décisions d'architecture ;
- produire le schéma relationnel et le backlog.

**Livrable :** documents d'architecture, maquettes et plan de travail.

## Phase 1 — Fondations
- monorepo ;
- configurations TypeScript et lint ;
- Docker de développement ;
- PostgreSQL et Prisma ;
- authentification ;
- organisations et memberships ;
- permissions et contexte multi-tenant ;
- CI et tests initiaux.

**Livrable :** base sécurisée et déployable.

## Phase 2 — Catalogue et entrepôts
- catégories ;
- unités ;
- produits ;
- variantes simples ;
- entrepôts et emplacements ;
- recherche, filtres et pagination ;
- écrans responsive.

**Livrable :** catalogue fonctionnel.

## Phase 3 — Moteur de stock
- mouvements ;
- soldes ;
- entrées, sorties, transferts ;
- idempotence ;
- inventaires ;
- journal d'audit ;
- tests de concurrence.

**Livrable :** moteur de stock fiable.

## Phase 4 — Dashboard et rapports
- KPI ;
- alertes ;
- graphiques ;
- exports de base ;
- filtres de dates ;
- états vides et erreurs.

**Livrable :** expérience opérationnelle complète.

## Phase 5 — Thèmes et personnalisation
- design tokens ;
- thèmes prédéfinis ;
- personnalisation des couleurs ;
- modes clair/sombre/système ;
- densité, rayons et styles de cartes ;
- logo d'entreprise ;
- préférences utilisateur ;
- aperçu live ;
- persistance et validation des paramètres ;
- tests d'accessibilité et de contraste.

**Livrable :** interface réellement personnalisable.

## Phase 6 — SaaS et administration
- plans ;
- quotas ;
- abonnement ;
- abstraction du fournisseur de paiement ;
- webhooks ;
- administration de la plateforme ;
- journaux et gestion des organisations.

**Livrable :** produit SaaS prêt pour un pilote commercial.

## Phase 7 — Stabilisation et pilote
- tests complets ;
- revue sécurité ;
- sauvegarde/restauration ;
- supervision ;
- documentation ;
- corrections UX ;
- pilote auprès d'entreprises réelles ;
- préparation au lancement.

**Livrable :** version pilote exploitable.

Les durées doivent être estimées après inspection du dépôt et de l'équipe disponible. Ne promets pas une date de livraison sans estimation technique.

---

# 16. Déploiement et exploitation

Prévoir :
- environnements distincts développement, staging et production ;
- configuration par variables d'environnement ;
- secrets gérés hors Git ;
- migrations exécutées de manière contrôlée ;
- health checks pour API et base ;
- logs structurés et `request_id` ;
- alertes sur erreurs et indisponibilité ;
- sauvegardes automatisées et tests de restauration ;
- politique de rétention ;
- procédure de retour arrière ;
- documentation des incidents ;
- supervision des coûts et quotas.

Fournir un `.env.example` sans secret réel, un `docker-compose.yml` de développement et des instructions claires de démarrage.

---

# 17. Fichiers de documentation à produire

Créer ou maintenir dans `docs/` :

- `PRODUCT_SPEC.md` — vision, utilisateurs, périmètre MVP et règles métier.
- `ARCHITECTURE.md` — composants, flux, décisions techniques et diagrammes.
- `DATABASE_SCHEMA.md` — tables, relations, index et contraintes.
- `STOCK_ENGINE.md` — invariants, transactions, valorisation et idempotence.
- `TENANCY_SECURITY.md` — isolation, permissions, RLS et menaces.
- `DESIGN_SYSTEM.md` — tokens, thèmes, composants et règles responsive.
- `API.md` — conventions et lien vers OpenAPI.
- `BILLING.md` — plans, quotas, statuts et intégration de paiement.
- `TEST_PLAN.md` — stratégie et scénarios de tests.
- `DEPLOYMENT.md` — environnements, CI/CD, sauvegardes et restauration.
- `ROADMAP.md` — phases et critères d'acceptation.
- `DECISIONS.md` — journal des décisions d'architecture (ADR).

Ne génère pas des documents qui contredisent le code. Mets-les à jour lorsque les choix changent.

---

# 18. Critères d'acceptation globaux

La version MVP n'est considérée prête que si :

- les parcours principaux fonctionnent de bout en bout ;
- les données sont persistées en PostgreSQL ;
- les règles métier sont appliquées côté serveur ;
- les mouvements et soldes sont cohérents après succès comme après échec ;
- les utilisateurs ne peuvent pas franchir les limites de leur organisation ;
- les rôles et modules contrôlent réellement les opérations ;
- les paramètres d'apparence sont persistés et propres à l'organisation ;
- le thème sélectionné est appliqué sans flash visuel notable ;
- le contraste et le clavier sont pris en compte ;
- les vues sont utilisables sur mobile ;
- les formulaires affichent les erreurs de manière compréhensible ;
- les états chargement, vide, succès et erreur sont présents ;
- les routes API sont documentées ;
- les tests critiques passent ;
- les sauvegardes et la restauration ont été testées ;
- aucun secret n'est commité ;
- les commandes visibles fonctionnent réellement ;
- les limites connues sont documentées.

---

# 19. Ordre d'exécution demandé à l'IA

Travaille dans cet ordre :

1. Inspecte le dépôt et résume son état sans rien casser.
2. Liste les questions métier bloquantes. Si une décision peut être configurée, propose une valeur par défaut documentée plutôt que de bloquer.
3. Crée ou mets à jour les fichiers de documentation de conception.
4. Présente l'architecture et les principales décisions.
5. Implémente le monorepo et la base technique.
6. Implémente l'isolation multi-tenant et les permissions avant les modules sensibles.
7. Implémente le catalogue et les entrepôts.
8. Implémente le moteur de stock avec tests transactionnels.
9. Implémente les écrans et le dashboard.
10. Implémente le système de design et de personnalisation.
11. Implémente l'administration SaaS et la facturation via une abstraction.
12. Exécute les tests, corrige les défauts et documente les résultats.
13. Fournis un récapitulatif final : ce qui fonctionne, ce qui est simulé, les commandes de démarrage, les variables d'environnement requises et les prochaines étapes.

À chaque étape, privilégie une tranche fonctionnelle terminée plutôt qu'une grande quantité de code non vérifié.

---

# 20. Instruction finale

Construis **G-Stock comme un produit SaaS commercialisable**, pas comme un prototype visuel. L'architecture doit être suffisamment simple pour être maintenue par une petite équipe, mais assez rigoureuse pour évoluer.

La priorité absolue est :
1. fiabilité des mouvements de stock ;
2. isolation et sécurité multi-entreprises ;
3. qualité de l'expérience utilisateur ;
4. configuration métier et personnalisation visuelle ;
5. modularité ;
6. modèle SaaS et facturation ;
7. performance et évolutivité.

Le résultat doit être cohérent, accessible, responsive, testable, documenté et exploitable. Toute fonctionnalité non terminée doit être explicitement identifiée ; ne jamais la présenter comme opérationnelle.
