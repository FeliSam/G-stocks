# Spécification Produit — G-Stock

## 1. Vision Produit & Positionnement Universel

**G-Stock** est une plateforme SaaS multi-tenant de gestion de stock universelle, conçue pour offrir la rigueur d'un ERP industriel avec la simplicité et la réactivité d'une application SaaS moderne. Contrairement aux solutions verticales figées, G-Stock repose sur un moteur d'inventaire agnostique et hautement configurable via des attributs dynamiques, des unités de mesure convertibles et des règles de gestion adaptables par organisation.

### Positionnement Multi-Secteurs

Grâce à son modèle de données flexible (produits, variantes, attributs personnalisés typés, emplacements hiérarchiques et règles de valorisation), G-Stock s'adapte nativement aux contraintes de 9 grands secteurs d'activité :

| Secteur | Cas d'usage clés & Besoins spécifiques couverts | Configuration type dans G-Stock |
| :--- | :--- | :--- |
| **Commerce de détail (Retail)** | Gestion multi-boutiques, variantes taille/couleur, codes-barres EAN, réapprovisionnement rapide. | Politique stock négatif `WARN` ou `FORBID`, variantes activées, alertes de seuil bas par magasin. |
| **Grossiste & Négoce** | Volumes importants, conditionnements multiples (palette, carton, unité), suivi de la marge et du coût d'achat. | Conversions d'unités (`unit_conversions`), valorisation `WAC` (Coût Moyen Pondéré), réservations de stock. |
| **Logistique & 3PL** | Gestion multi-entrepôts, adressage fin (allée, travée, niveau, bac), transferts inter-dépôts. | Hiérarchie complète des `locations`, mouvements de `transfer` atomiques, traçabilité stricte par opérateur. |
| **Restauration & Hôtellerie (CHR)** | Denrées périssables, unités de poids/volume (kg, L, portion), contrôle des pertes et démarques. | Attributs personnalisés (DLC/DDM, température de stockage), motifs d'ajustement (`damage`, `shrinkage`). |
| **Pharmacie & Parapharmacie** | Traçabilité sanitaire, numéros de lot, dates de péremption, interdiction absolue de stock négatif. | Politique stock négatif `FORBID`, attributs obligatoires (`lot_number`, `expiry_date`), audit log exhaustif. |
| **Mode & Textile** | Matrices complexes de déclinaisons (Taille, Couleur, Matière, Saison), collections. | `product_variants` + `product_attribute_definitions`, vues sauvegardées (`saved_views`) par collection. |
| **Automobile & Pièces détachées** | Références constructeurs (OEM), compatibilités véhicules, emplacements d'atelier vs magasin. | Attributs indexés (`oem_ref`, `compatibility`), sorties sur ordre de réparation (`reference_type = work_order`). |
| **BTP & Matériaux** | Gestion par chantier (entrepôt virtuel ou mobile), matériaux en vrac (m², m³, tonne) et outillage. | Entrepôts par chantier, transferts dépôt ↔ chantier, unités décimales haute précision `Decimal(18,4)`. |
| **Industrie & Assemblage** | Stockage matières premières, produits semi-finis et finis, consommation sur ordre de fabrication. | Catégorisation multi-niveaux, sorties vers production, valorisation précise des encours et stocks. |

---

## 2. Profils d'Utilisateurs & Rôles (RBAC)

G-Stock distingue deux niveaux d'accès : le niveau **Plateforme** (opérateur du SaaS) et le niveau **Organisation / Tenant** (entreprise cliente). Un même utilisateur (`users`) peut appartenir à plusieurs organisations via des adhésions (`memberships`) distinctes.

### 2.1. Rôle Plateforme
1. **Administrateur Plateforme G-Stock (`is_platform_admin = true`)**
   - Supervise l'ensemble de l'instance SaaS.
   - Gère le catalogue des plans d'abonnement (`plans`, `plan_features`), consulte les métriques globales, inspecte l'état des tenants et intervient en support de niveau 3.
   - Ne modifie pas les stocks métiers d'un client sans mandat d'audit explicite tracé dans `audit_logs`.

### 2.2. Rôles par Organisation (Tenant)
2. **Propriétaire (`OWNER`)**
   - Créateur ou détenteur légal de l'espace organisationnel.
   - Dispose de l'intégralité des permissions, y compris la gestion de l'abonnement (`billing.manage`), la suppression ou l'archivage de l'organisation et la nomination d'administrateurs.
3. **Administrateur Entreprise (`ADMIN`)**
   - Configure l'organisation au quotidien : paramètres métiers (`settings.manage`), charte graphique et thèmes (`appearance.manage`), création d'entrepôts (`warehouses.manage`), invitation des collaborateurs et attribution des rôles (`members.manage`).
   - Accès complet au catalogue, aux mouvements de stock et aux inventaires.
4. **Responsable de Stock (`STOCK_MANAGER`)**
   - Pilote le catalogue produits (`products.create`, `products.update`), supervise les niveaux de stock multi-entrepôts et valide les opérations sensibles.
   - Autorisé à créer et **valider** les mouvements d'ajustement (`stock.adjust`) ainsi que les campagnes d'inventaire physique (`inventory.create`, `inventory.validate`), et à opérer des contre-passations (`reversal`).
5. **Magasinier / Opérateur Logistique (`WAREHOUSE_OPERATOR`)**
   - Exécute les opérations quotidiennes de terrain : réceptions fournisseurs (`stock.receive`), sorties de stock (`stock.issue`) et transferts entre emplacements ou entrepôts (`stock.transfer`).
   - Participe au comptage lors des inventaires physiques (saisie des `counted_quantity`), sans pouvoir valider seul un écart financier majeur si la politique de l'entreprise exige une validation manager.
6. **Auditeur / Lecteur (`AUDITOR` / `VIEWER`)**
   - Accès strictement en lecture seule (`products.read`, consultation des soldes `inventory_balances`, de l'historique immuable des mouvements `stock_movements` et du journal d'audit `audit_logs`).
   - Idéal pour les experts-comptables, contrôleurs de gestion, commissaires aux comptes ou dirigeants souhaitant consulter les tableaux de bord et exporter des rapports.
7. **Rôles Personnalisés (`Custom Roles`)**
   - Chaque organisation (selon son plan SaaS) peut créer ses propres rôles dans la table `roles` (`is_system = false`) en assemblant finement les permissions unitaires (`role_permissions`), par exemple : *Acheteur Catalogue*, *Chef d'Atelier*, ou *Responsable Boutique Paris*.

---

## 3. Périmètre Fonctionnel

### 3.1. Périmètre MVP (22 Exigences Obligatoires)

Le MVP de G-Stock couvre l'intégralité du cycle de vie d'un SaaS B2B de gestion de stock prêt pour la production :

1. **Authentification & Sécurité des Sessions** : Inscription, connexion par email/mot de passe haché, jetons JWT signés avec rafraîchissement, déconnexion et protection des routes.
2. **Architecture Multi-Tenant Stricte** : Appartenance multi-organisations (`memberships`), création d'organisation lors de l'onboarding et sélecteur d'organisation actif dans l'interface.
3. **Système RBAC Granulaire** : Rôles prédéfinis (`OWNER`, `ADMIN`, `STOCK_MANAGER`, `WAREHOUSE_OPERATOR`, `AUDITOR`) et rôles personnalisés associés à une matrice de permissions vérifiée côté serveur.
4. **Gestion des Membres & Invitations** : Invitation de collaborateurs par email avec jeton sécurisé expirant, attribution de rôles, suspension ou révocation d'accès.
5. **Paramétrage Métier par Organisation (`organization_settings`)** : Configuration de la devise par défaut, du fuseau horaire, de la politique de stock négatif (`FORBID`, `WARN`, `ALLOW`), de la méthode de valorisation (`WAC`, `LAST_COST`) et des règles de validation des mouvements.
6. **Personnalisation Visuelle & Thèmes (`organization_branding`, `organization_themes`)** : Marque blanche (logo, favicon, nom d'affichage) et éditeur de thème par variables CSS (Design Tokens) avec vérification automatique du contraste d'accessibilité WCAG 2.2 AA.
7. **Préférences Utilisateur & Vues Sauvegardées (`user_preferences`, `saved_views`)** : Choix du mode clair/sombre/système, densité d'affichage des tables (compacte, confortable), langue, et sauvegarde de filtres personnalisés sur les listes.
8. **Arborescence de Catégories (`categories`)** : Classification hiérarchique parent/enfant des produits avec chemins matérialisés ou récursifs par organisation.
9. **Unités de Mesure & Conversions (`units_of_measure`, `unit_conversions`)** : Gestion des unités (pièce, carton, palette, kg, litre) et facteurs de conversion décimaux exacts.
10. **Catalogue Produits Complet (`products`)** : Gestion des SKU uniques par tenant, codes-barres, prix d'achat, prix de vente indicatif, seuils d'alerte (`reorder_point`, `safety_stock`), statut actif/archivé.
11. **Déclinaisons & Variantes (`product_variants`)** : Prise en charge des produits à variantes (ex: Taille/Couleur) avec SKU et code-barres propres à chaque variante.
12. **Attributs Dynamiques Typés (`product_attribute_definitions`, `product_attribute_values`)** : Champs personnalisés définis par l'organisation (texte, nombre, booléen, date, liste déroulante) pour adapter le catalogue au secteur métier.
13. **Gestion Multi-Entrepôts (`warehouses`)** : Création et administration de plusieurs dépôts physiques ou logiques (boutiques, entrepôts centraux, chantiers, camions).
14. **Emplacements Internes Hiérarchiques (`locations`)** : Découpage d'un entrepôt en zones, allées, racks, étagères et bacs (bins) avec statut de capacité et d'activité.
15. **Moteur de Soldes de Stock en Temps Réel (`inventory_balances`)** : Suivi exact par produit/variante, entrepôt et emplacement des quantités `on_hand` (physique), `reserved` (réservée) et `available` (`on_hand - reserved`).
16. **Mouvements de Stock Transactionnels (`stock_movements`, `stock_movement_lines`)** : Prise en charge des 6 types de flux (`receipt`, `issue`, `transfer`, `adjustment`, `opening_balance`, `reversal`) avec cycle de vie (`DRAFT`, `VALIDATED`, `CANCELLED`).
17. **Idempotence & Intégrité Financière** : Protection contre les doubles soumissions réseau via `idempotency_keys` et calculs exclusivement en `Decimal(18,4)`.
18. **Campagnes d'Inventaire Physique (`inventories`, `inventory_lines`)** : Ouverture d'inventaire (complet ou tournant), gel/capture du stock théorique (`expected_quantity`), saisie des comptages (`counted_quantity`), calcul d'écart (`variance`) et génération automatique du mouvement d'ajustement à la validation.
19. **Alertes de Stock Bas & Ruptures** : Détection temps réel des articles sous le point de commande (`reorder_point`) ou le stock de sécurité (`safety_stock`).
20. **Tableaux de Bord & Analytique** : Indicateurs clés (valeur totale du stock, rotation, top produits, flux d'entrées/sorties sur 30 jours, répartition par catégorie/entrepôt) visualisés avec Recharts.
21. **Abonnements SaaS, Quotas & Facturation (`plans`, `subscriptions`, `usage_counters`)** : Gestion des plans (Free, Pro, Enterprise), suivi des quotas (nombre max d'utilisateurs, d'entrepôts, de produits) et abstraction de paiement (`Stripe` + `MockDevelopmentBillingProvider`).
22. **Journal d'Audit Immuable (`audit_logs`) & Administration Plateforme** : Traçabilité complète de toutes les mutations critiques (qui, quand, quoi, état avant/après expurgé des secrets, IP, User-Agent) et console Super-Admin.

### 3.2. Fonctionnalités Post-MVP (Feuille de route d'évolution)

- **Gestion avancée des Achats & Fournisseurs** : Bons de commande fournisseurs (PO), réceptions partielles sur reliquats, facturation tripartite (3-way matching).
- **Gestion des Commandes Clients & Préparation (Picking/Packing/Shipping)** : Allocation automatique FIFO/FEFO, bons de préparation par vague, intégration transporteurs.
- **Méthodes de Valorisation FIFO / LIFO / Coût Standard par Lot** : Extension du moteur de coût au-delà de `WAC` et `LAST_COST` par suivi de couches de lots individuelles.
- **Nomenclatures Industrielles (BOM - Bill of Materials) & Ordres d'Assemblage** : Transformation automatique de composants en produits finis.
- **Application Mobile & Mode Hors-Ligne (PWA / Scanner Laser)** : Mode déconnecté sur terminaux code-barres Zebra/Honeywell avec synchronisation différée.
- **API Publique & Webhooks Sortants** : Connecteurs natifs Shopify, WooCommerce, PrestaShop, Pennylane, Sage et webhooks sur événements de stock.
- **Prévisions de Réapprovisionnement par IA** : Analyse de saisonnalité et suggestion automatique des quantités à commander.

---

## 4. Hypothèses Métier Configurables par Défaut

Chaque nouvelle organisation créée sur G-Stock reçoit automatiquement un enregistrement `organization_settings` initialisé avec des valeurs par défaut sûres et éprouvées, modifiables à tout moment par un administrateur disposant de la permission `settings.manage` :

### 4.1. Politique de Stock Négatif (`negative_stock_policy`)
- **Valeur par défaut : `FORBID`** (Interdiction stricte).
- **Comportement** :
  - `FORBID` : Toute validation d'un mouvement (`issue`, `transfer`, `adjustment` négatif) qui entraînerait une quantité disponible (`available = on_hand - reserved`) inférieure à `0.0000` sur l'emplacement source est immédiatement rejetée avec une erreur métier explicite (`INSUFFICIENT_STOCK`).
  - `WARN` : L'opération est autorisée si l'utilisateur confirme le forçage ou possède la permission adéquate, mais le mouvement et l'audit log sont marqués d'un avertissement (`warning_negative_stock = true`) et une alerte critique est levée sur le tableau de bord.
  - `ALLOW` : Les soldes négatifs sont autorisés de manière transparente (cas des commerces saisissant les ventes en caisse avant d'avoir enregistré informatiquement la livraison fournisseur du matin).

### 4.2. Méthode de Valorisation des Stocks (`valuation_method`)
- **Valeur par défaut : `WAC` (Weighted Average Cost / Coût Moyen Unitaire Pondéré - CMUP)**.
- **Comportement** :
  - `WAC` : À chaque entrée en stock valorisée (`receipt`, `opening_balance`), le nouveau coût unitaire moyen pondéré du produit est recalculé selon la formule :
    $$\text{Nouveau CMUP} = \frac{(\text{Quantité Actuelle} \times \text{CMUP Actuel}) + (\text{Quantité Entrante} \times \text{Coût Unitaire Entrant})}{\text{Quantité Actuelle} + \text{Quantité Entrante}}$$
    Les sorties (`issue`) et transferts (`transfer`) sont valorisés au CMUP courant au moment de la validation.
  - `LAST_COST` (Dernier Coût d'Achat) : Le stock est valorisé sur la base du dernier coût unitaire d'entrée validé (`unit_cost` du dernier `receipt`).

### 4.3. Cycle de Vie des Mouvements : Brouillon vs Validation Immédiate (`default_movement_status`)
- **Valeur par défaut : `DRAFT` (Brouillon) pour les inventaires et opérations multi-lignes ; Validation directe disponible en 1 clic (`auto_validate_simple_movements = false` par défaut)**.
- **Comportement** :
  - Tant qu'un mouvement est au statut `DRAFT`, **aucun solde (`inventory_balances`) n'est modifié**. Le brouillon peut être édité, complété ou supprimé/annulé sans impact comptable.
  - Le passage au statut `VALIDATED` exécute la transaction atomique du moteur de stock, scelle définitivement le mouvement (immuabilité) et met à jour les soldes.
  - Une fois `VALIDATED`, un mouvement ne peut plus être modifié ni supprimé : toute correction passe obligatoirement par la génération d'un mouvement compensatoire de type `reversal`.

### 4.4. Seuils d'Alerte et Réapprovisionnement (`reorder_point`, `safety_stock`)
- **Valeurs par défaut** :
  - Au niveau produit/variante : `reorder_point = 0.0000`, `safety_stock = 0.0000` (aucune alerte intempestive tant que l'utilisateur n'a pas défini de seuil, ou héritage du seuil global de l'organisation si activé : `default_low_stock_threshold = 5.0000`).
- **Règles de déclenchement** :
  - **Rupture de stock (`OUT_OF_STOCK`)** : $\text{available} \le 0$.
  - **Critique / Sous stock de sécurité (`CRITICAL_LOW`)** : $0 < \text{available} \le \text{safety\_stock}$.
  - **À réapprovisionner (`REORDER_NEEDED`)** : $\text{safety\_stock} < \text{available} \le \text{reorder\_point}$.
  - **Stock sain (`OK`)** : $\text{available} > \text{reorder\_point}$.
