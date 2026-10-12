# Journal des Décisions d'Architecture (ADR) — G-Stock

Ce document consigne les décisions d'architecture structurantes (**Architecture Decision Records — ADR-001 à ADR-008**) retenues pour la conception et l'implémentation de la plateforme SaaS **G-Stock**.

---

## ADR-001 : Monorepo `pnpm` + `Turborepo` avec API Express Modulaire et Next.js

- **Statut** : Accepté
- **Date** : 2026-10-12
- **Contexte** :
  G-Stock comprend une interface web riche (tableaux de bord, listes denses filtrables, formulaires complexes de mouvements multi-lignes, éditeur de thème) et un backend transactionnel critique. Séparer le code en dépôts multiples entraînerait une désynchronisation entre les types TypeScript, les règles de validation des formulaires et les contrats d'API. Inversement, coupler toute la logique métier dans des Server Actions Next.js nuirait à la testabilité unitaire, à la séparation des responsabilités et à l'ouverture future d'une API publique pour scanners mobiles et ERP tiers.
- **Décision** :
  Adopter un **monorepo `pnpm` workspaces + `Turborepo`** séparant clairement :
  - `apps/web` : Frontend **Next.js (App Router)** utilisant **Redux Toolkit + RTK Query**, **React Hook Form + Zod**, **Tailwind CSS** et **Recharts**.
  - `apps/api` : Serveur **Express + TypeScript** structuré en modules métiers (`routes`, `controller`, `service`, `repository`, `schemas`, `permissions`, `test`).
  - `packages/*` : `@g-stock/database`, `@g-stock/validation`, `@g-stock/types`, `@g-stock/ui`, `@g-stock/config`.
- **Conséquences** :
  - **Positives** : Partage instantané des schémas Zod et des types TypeScript entre client et serveur ; architecture backend découplée, testable et prête pour des clients mobiles/tiers ; builds incrémentaux rapides grâce au cache Turborepo.
  - **Négatives / Compromis** : Nécessite le lancement coordonné de `apps/web` et `apps/api` en développement (automatisé via `pnpm dev` à la racine avec Turborepo).

---

## ADR-002 : Modèle Multi-Tenant à Base de Données Partagée avec `organization_id` Obligatoire et Défense en Profondeur

- **Statut** : Accepté
- **Date** : 2026-10-12
- **Contexte** :
  En tant que plateforme SaaS B2B accueillant des PME comme des réseaux multi-entrepôts, G-Stock doit isoler hermétiquement les données de chaque entreprise cliente tout en conservant un coût d'infrastructure maîtrisé, des migrations de schéma atomiques et la possibilité pour un même utilisateur (ex: auditeur, comptable, dirigeant multi-sociétés) de basculer d'une organisation à une autre sans se reconnecter.
- **Décision** :
  Retenir un modèle **Shared Database, Shared Schema (Pool Model)** sur **PostgreSQL 18** où chaque table métier porte une colonne obligatoire indexée `organization_id UUID NOT NULL`, protégé par trois couches :
  1. Résolution serveur du tenant via `X-Organization-Id` vérifié contre un enregistrement `memberships` actif.
  2. Obligation d'inclure `organizationId` dans toutes les signatures des repositories et toutes les contraintes d'unicité composites (`UNIQUE (organization_id, sku)`).
  3. Support optionnel de politiques PostgreSQL RLS via `SET LOCAL app.current_organization_id`.
- **Conséquences** :
  - **Positives** : Provisionnement instantané d'une nouvelle organisation en une simple transaction SQL ; gestion native des utilisateurs multi-organisations ; maintenance et migrations Prisma unifiées.
  - **Négatives / Compromis** : Exige une discipline stricte dans l'écriture des repositories et des tests d'intégration vérifiant systématiquement l'absence de fuite inter-tenant.

---

## ADR-003 : Journal Immuable des Mouvements de Stock + Table `inventory_balances` Maintenue Transactionnellement

- **Statut** : Accepté
- **Date** : 2026-10-12
- **Contexte** :
  Deux approches extrêmes existent pour gérer les stocks :
  1. *Modifier directement un champ `stock_quantity` sur la fiche produit* : rapide en lecture, mais détruit toute traçabilité comptable et rend impossible l'explication des écarts.
  2. *Recalculer le stock à la volée par `SUM()` sur tout l'historique des mouvements à chaque lecture* : traçable, mais les performances s'effondrent dès que l'organisation dépasse quelques centaines de milliers de lignes de mouvements, et le verrouillage concurrent contre les stocks négatifs devient complexe.
- **Décision** :
  Combiner le meilleur des deux approches dans une transaction ACID unique :
  - Un **journal immuable (`stock_movements` + `stock_movement_lines`)** qui fait foi pour l'audit et la comptabilité. Une fois `VALIDATED`, un mouvement ne peut plus être modifié ni supprimé (toute correction passe par un mouvement compensatoire `reversal`).
  - Une **projection transactionnelle synchronisée (`inventory_balances`)** verrouillée par `SELECT ... FOR UPDATE` (dans un ordre canonique) et mise à jour dans la même transaction que la validation du mouvement.
- **Conséquences** :
  - **Positives** : Lectures des soldes et alertes de stock en $\mathcal{O}(1)$ ultra-rapides ; traçabilité totale de chaque variation avec snapshots `balance_before` / `balance_after` ; protection fiable contre les conditions de course (race conditions) et les stocks négatifs.
  - **Négatives / Compromis** : Toute modification de stock doit impérativement passer par le `StockMovementService` (interdiction d'éditer `inventory_balances` directement).

---

## ADR-004 : Système de Personnalisation par CSS Custom Properties (Design Tokens) Validés et Contraste WCAG 2.2 AA

- **Statut** : Accepté
- **Date** : 2026-10-12
- **Contexte** :
  Les entreprises clientes souhaitent adapter G-Stock à leur identité visuelle (marque blanche : couleurs primaires, secondaires, d'accent, rayons de bordure, typographies, logo), tandis que chaque opérateur souhaite choisir son mode d'affichage (`light`, `dark`, `system`) et sa densité de table (`compact`, `comfortable`). Cependant, laisser les clients saisir n'importe quelle couleur peut rendre l'interface illisible (ex: texte blanc sur bouton jaune pâle) ou introduire des failles d'injection CSS.
- **Décision** :
  Piloter l'ensemble du système de design (`@g-stock/ui` et `apps/web`) par des **CSS Custom Properties (Design Tokens)** injectées sur la racine du document à partir de `organization_themes` et `user_preferences`, couplées à un validateur de contraste **WCAG 2.2 AA** (ratio minimal de `4.5:1` pour le texte normal et `3.0:1` pour les grands textes et composants UI) et un calcul automatique de la couleur de texte de premier plan (`--color-primary-foreground`).
- **Conséquences** :
  - **Positives** : Changement de thème instantané sans recompilation CSS ; lisibilité garantie en environnement d'entrepôt fortement ou faiblement éclairé ; sécurité garantie contre l'injection CSS grâce à la validation stricte des formats de couleurs.
  - **Négatives / Compromis** : Les couleurs soumises qui violent les seuils de contraste minimal sont soit ajustées automatiquement, soit signalées à l'administrateur lors de la sauvegarde du thème.

---

## ADR-005 : Abstraction `BillingProvider` avec Mode `MockDevelopmentBillingProvider` Explicite

- **Statut** : Accepté
- **Date** : 2026-10-12
- **Contexte** :
  G-Stock intègre une gestion complète des plans SaaS (`FREE`, `STARTER`, `PRO`, `ENTERPRISE`), des quotas (`usage_counters`) et des abonnements (`subscriptions`). Toutefois, en environnement de développement local, de CI/CD ou de démonstration hors-ligne, les clés API secrètes Stripe (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) ne sont pas toujours configurées.
- **Décision** :
  Définir une interface de domaine stricte `BillingProvider` implémentée par deux adaptateurs :
  1. `StripeBillingProvider` : utilisé automatiquement lorsque les clés Stripe sont présentes dans l'environnement.
  2. `MockDevelopmentBillingProvider` : utilisé par défaut en développement lorsque Stripe n'est pas configuré, permettant de tester de bout en bout le changement de plan, la simulation de webhooks (`billing_webhook_events`) et l'application immédiate des nouveaux quotas (`plan_features`), tout en affichant un bandeau explicite indiquant le mode simulation.
- **Conséquences** :
  - **Positives** : Zéro blocage au démarrage local (`pnpm dev`) sans compte Stripe ; couverture de test complète sur les règles de quotas et de facturation ; passage en production Stripe transparent par simple configuration des variables d'environnement.
  - **Négatives / Compromis** : Maintien de deux implémentations derrière l'interface `BillingProvider`.

---

## ADR-006 : Décimaux Exacts (`Decimal(18,4)`) pour Toutes les Quantités et Valeurs Monétaires

- **Statut** : Accepté
- **Date** : 2026-10-12
- **Contexte** :
  G-Stock est universel : s'il gère des pièces entières dans le prêt-à-porter, il gère aussi des kilogrammes, des litres, des mètres cubes ou des dosages au dixième de gramme dans la restauration, l'industrie, la chimie ou le BTP, ainsi que des calculs de Coût Moyen Pondéré (`WAC`) et des conversions d'unités. L'arithmétique binaire flottante standard (`Number` JavaScript / `DOUBLE PRECISION` SQL, où `0.1 + 0.2 === 0.30000000000000004`) génère des dérives d'arrondi cumulatives inacceptables en comptabilité matières.
- **Décision** :
  Imposer le type **`NUMERIC(18, 4)` (`@db.Decimal(18, 4)`)** sur toutes les colonnes de quantités, facteurs de conversion, seuils, coûts unitaires et valorisations dans PostgreSQL, et effectuer tous les calculs applicatifs via `Prisma.Decimal` (`decimal.js`) avant sérialisation sous forme de chaînes décimales normalisées ou nombres formatés.
- **Conséquences** :
  - **Positives** : Exactitude mathématique absolue sur les soldes, les conversions d'unités, les écarts d'inventaire et le calcul du CMUP (`WAC`).
  - **Négatives / Compromis** : Verbosité légèrement supérieure dans les services TypeScript (utilisation des méthodes `.plus()`, `.minus()`, `.mul()`, `.div()`, `.toFixed(4)` au lieu des opérateurs natifs `+`, `-`, `*`, `/`).

---

## ADR-007 : Idempotence Obligatoire sur les Écritures de Mouvements de Stock

- **Statut** : Accepté
- **Date** : 2026-10-12
- **Contexte** :
  Les opérations logistiques s'effectuent souvent dans des zones d'entrepôt où la couverture réseau est fluctuante. Un opérateur validant une réception ou une sortie de stock peut cliquer deux fois ou subir une reconnexion automatique du client HTTP. Sans mécanisme de déduplication, un même mouvement pourrait être créé ou validé deux fois, faussant immédiatement les stocks physiques et la valorisation.
- **Décision** :
  Intégrer une table dédiée `idempotency_keys` scopée par `organization_id` et imposer la prise en charge de l'en-tête `Idempotency-Key` sur toutes les mutations critiques du moteur de stock et d'inventaire. La vérification et l'enregistrement de la clé d'idempotence s'exécutent à l'intérieur même de la transaction SQL du mouvement.
- **Conséquences** :
  - **Positives** : Garantie d'exécution *At-Most-Once* même en cas de latence réseau, de double clic utilisateur ou de retry automatique ; renvoi déterministe de la réponse initiale en cas de rejeu avec le même payload.
  - **Négatives / Compromis** : Ajout d'une écriture par transaction dans `idempotency_keys` et nécessité de purger périodiquement les clés expirées (`expires_at < NOW()`).

---

## ADR-008 : Gestion des Rôles RBAC Relationnels par Organisation + Rôle Super-Admin Plateforme

- **Statut** : Accepté
- **Date** : 2026-10-12
- **Contexte** :
  Les besoins d'autorisation varient fortement selon la taille du client : une TPE se contente de rôles standards (`OWNER`, `ADMIN`, `WAREHOUSE_OPERATOR`), tandis qu'une PME industrielle ou pharmaceutique souhaite créer ses propres rôles sur mesure (ex: *Contrôleur Qualité Réception*, *Préparateur de Commandes*, *Auditeur Externe*) avec un sous-ensemble précis de permissions. Par ailleurs, l'équipe opérant le SaaS G-Stock a besoin d'administrer les plans et de superviser la plateforme sans être membre de chaque entreprise cliente.
- **Décision** :
  Séparer le modèle d'autorisation en deux niveaux :
  1. **Niveau Plateforme** : Booléen `users.is_platform_admin` accordant la permission `platform.admin` pour la console d'administration globale du SaaS.
  2. **Niveau Organisation (RBAC Relationnel)** : Modèle relationnel complet (`roles`, `permissions`, `role_permissions`, `membership_roles`). Lors de la création d'une organisation, les 5 rôles systèmes (`is_system = true`) sont automatiquement instanciés pour ce tenant, et l'administrateur peut créer des rôles personnalisés (`is_system = false`) en cochant les permissions unitaires souhaitées.
- **Conséquences** :
  - **Positives** : Flexibilité maximale pour les clients B2B ; séparation nette entre l'administration technique du SaaS et la gouvernance interne de chaque entreprise cliente.
  - **Négatives / Compromis** : Requiert une jointure (ou mise en cache par requête dans `req.tenantContext.permissions`) lors de la résolution du contexte tenant.
