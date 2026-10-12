# Moteur Transactionnel de Stock — G-Stock

Le moteur de stock est le cœur critique de **G-Stock**. Il repose sur une architecture à double niveau :
1. **Un Grand Livre immuable (`stock_movements` + `stock_movement_lines`)** qui conserve l'historique exhaustif et auditable de chaque flux.
2. **Une table de soldes temps réel (`inventory_balances`)** maintenue **exclusivement** au sein de la même transaction ACID que la validation des mouvements.

---

## 1. Les 6 Types de Mouvements de Stock

Chaque mouvement dans `stock_movements` possède un type (`type`) qui détermine ses contraintes d'emplacements, le signe mathématique appliqué aux soldes et son impact sur la valorisation :

| Type de mouvement | Code (`type`) | Emplacement Source (`source_location_id`) | Emplacement Destination (`destination_location_id`) | Impact sur `on_hand_quantity` | Impact sur la Valorisation (`WAC` / `LAST_COST`) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Réception / Entrée** | `receipt` | `NULL` (Interdit) | **Obligatoire** | $+\text{base\_quantity}$ sur la destination | Recalcule le `WAC` (CMUP) et met à jour `last_purchase_cost` avec le `unit_cost` entrant. |
| **Sortie / Consommation** | `issue` | **Obligatoire** | `NULL` (Interdit) | $-\text{base\_quantity}$ sur la source | Sortie valorisée au coût courant (`WAC` ou `LAST_COST`). Le coût unitaire moyen des unités restantes ne change pas. |
| **Transfert interne / inter-dépôts** | `transfer` | **Obligatoire** | **Obligatoire** ($\neq$ source) | $-\text{base\_quantity}$ sur la source ET $+\text{base\_quantity}$ sur la destination | Neutre sur la quantité globale de l'organisation. Conserve le coût unitaire du produit. |
| **Ajustement d'écart** | `adjustment` | Renseigné si perte ($\Delta < 0$) | Renseigné si gain ($\Delta > 0$) | $+\Delta$ ou $-\Delta$ selon le signe de l'ajustement | Motif (`reason_code`) obligatoire (casse, péremption, écart d'inventaire). Valorisé au coût courant. |
| **Solde d'ouverture** | `opening_balance` | `NULL` (Interdit) | **Obligatoire** | $+\text{base\_quantity}$ sur la destination | Initialise le stock initial et définit le premier `WAC` et `last_purchase_cost` à partir du `unit_cost` d'ouverture. |
| **Contre-passation (Annulation)** | `reversal` | Inverse exact du mouvement d'origine | Inverse exact du mouvement d'origine | Inverse exactement les deltas de chaque ligne du mouvement annulé | Lie `reversed_movement_id` au mouvement d'origine et restaure les soldes de façon traçable. |

---

## 2. Les 10 Invariants Critiques du Moteur de Stock

Aucune route API, aucun script ni aucun service ne peut contourner les **10 invariants** suivants :

1. **Invariant I1 — Aucune modification directe des soldes** : La table `inventory_balances` ne peut **jamais** être modifiée par un endpoint CRUD direct. Toute variation de `on_hand_quantity` résulte exclusivement de la validation transactionnelle d'un enregistrement dans `stock_movements`.
2. **Invariant I2 — Immuabilité absolue des mouvements validés** : Dès que `stock_movements.status = 'VALIDATED'`, l'en-tête et ses lignes (`stock_movement_lines`) deviennent immuables. Toute tentative d'édition (`UPDATE` hors `reversed_by_movement_id`) ou de suppression (`DELETE`) est bloquée.
3. **Invariant I3 — Égalité fondamentale de disponibilité** : Pour chaque ligne de `inventory_balances`, l'égalité mathématique suivante est garantie en permanence :
   $$\text{available\_quantity} = \text{on\_hand\_quantity} - \text{reserved\_quantity}$$
   avec $\text{reserved\_quantity} \ge 0.0000$.
4. **Invariant I4 — Respect strict de la politique de stock négatif** : Si `organization_settings.negative_stock_policy = 'FORBID'`, aucune validation de mouvement ne peut aboutir si elle conduit à $\text{available\_quantity} < 0.0000$ sur un emplacement source.
5. **Invariant I5 — Arithmétique décimale exacte `Decimal(18,4)`** : Tous les calculs de quantités, conversions d'unités, écarts d'inventaire et valorisations sont exécutés via `Decimal` (`decimal.js` / `NUMERIC(18,4)` PostgreSQL) avec arrondi bancaire contrôlé (`ROUND_HALF_UP`). Aucun `Number` flottant IEEE 754 n'est utilisé dans la chaîne de calcul.
6. **Invariant I6 — Cloisonnement Multi-Tenant Homogène** : Dans un mouvement ou un inventaire appartenant à `organization_id = O`, l'intégralité des entités référencées (produits, variantes, unités, entrepôts source/destination, emplacements source/destination) doivent appartenir à la même organisation `O`.
7. **Invariant I7 — Cohérence Produit / Variante** : Si un produit a `has_variants = true`, tout mouvement de stock le concernant doit obligatoirement spécifier un `variant_id` valide rattaché à ce `product_id`. Si `has_variants = false`, `variant_id` doit être `NULL`.
8. **Invariant I8 — Non-réflexivité des transferts** : Un mouvement de type `transfer` doit toujours avoir un couple `(source_warehouse_id, source_location_id)` strictement distinct du couple `(destination_warehouse_id, destination_location_id)`.
9. **Invariant I9 — Unicité de contre-passation** : Un mouvement `VALIDATED` ne peut être annulé par `reversal` qu'**une seule fois** (`reversed_by_movement_id IS NULL`). Un mouvement au statut `DRAFT` ou `CANCELLED` ne peut pas faire l'objet d'un `reversal` (un brouillon est simplement passé à `CANCELLED`).
10. **Invariant I10 — Prévention des interblocages (Deadlock-Free Locking)** : Lorsqu'un mouvement comporte plusieurs lignes touchant plusieurs soldes `inventory_balances`, les verrous `SELECT ... FOR UPDATE` sont systématiquement acquis dans un **ordre canonique déterministe** trié par `(warehouse_id, location_id, product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'))`.

---

## 3. Algorithme de Validation Transactionnelle en 11 Étapes

Lorsqu'un utilisateur autorisé appelle la validation d'un mouvement (ou crée un mouvement avec validation immédiate), `StockMovementService.validateMovement()` exécute l'algorithme suivant en **11 étapes atomiques** dans `prisma.$transaction()` :

### Étape 1 : Vérification et verrouillage de la clé d'idempotence
- Lecture/insertion dans `idempotency_keys` pour le couple `(organization_id, key)`.
- Si la clé existe avec `status = 'COMPLETED'` et le même `request_hash`, retourne immédiatement la réponse stockée sans ré-exécuter le mouvement.
- Si la clé existe avec un `request_hash` différent, rejette avec `409 Conflict (IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD)`.
- Si la clé est `IN_PROGRESS` (requête concurrente en vol), rejette avec `409 Conflict (OPERATION_ALREADY_IN_PROGRESS)`.

### Étape 2 : Verrouillage du mouvement et vérification du statut
- Exécute `SELECT ... FOR UPDATE` sur la ligne `stock_movements` filtrée par `(id, organization_id)`.
- Vérifie que le mouvement existe et que `status = 'DRAFT'`. S'il est déjà `VALIDATED`, lève `409 Conflict (MOVEMENT_ALREADY_VALIDATED)`. S'il est `CANCELLED`, lève `422 Unprocessable Entity (MOVEMENT_IS_CANCELLED)`.
- Vérifie que le mouvement comporte au moins une ligne dans `stock_movement_lines`.

### Étape 3 : Vérification de sécurité RBAC spécifique au type de mouvement
- Vérifie que l'acteur possède la permission exacte correspondant à `movement.type` :
  - `receipt` / `opening_balance` $\rightarrow$ `stock.receive`
  - `issue` $\rightarrow$ `stock.issue`
  - `transfer` $\rightarrow$ `stock.transfer`
  - `adjustment` / `reversal` $\rightarrow$ `stock.adjust`

### Étape 4 : Validation d'appartenance Multi-Tenant et d'activité des référentiels
- Vérifie en une passe que tous les `product_id`, `variant_id`, `unit_id`, `warehouse_id` et `location_id` des lignes appartiennent à `organization_id`, sont actifs (`status = 'ACTIVE'` / `is_active = true`), que chaque `location_id` appartient bien au `warehouse_id` attendu, et que l'invariant **I7** (`has_variants`) est respecté.

### Étape 5 : Chargement des paramètres de l'organisation (`organization_settings`)
- Récupère `negative_stock_policy` (`FORBID`, `WARN`, `ALLOW`), `valuation_method` (`WAC`, `LAST_COST`) et `require_movement_reason_on_adjust`.
- Si `type = 'adjustment'` et `require_movement_reason_on_adjust = true`, vérifie que `reason_code` est non vide.

### Étape 6 : Normalisation des quantités en unité de base (`base_quantity`)
- Pour chaque ligne :
  - Si `line.unit_id == product.base_unit_id`, alors `base_quantity = line.quantity`.
  - Sinon, recherche le facteur de conversion dans `unit_conversions` (spécifique au produit d'abord, puis global à l'organisation) et calcule :
    $$\text{base\_quantity} = \text{round\_4}(\text{line.quantity} \times \text{conversion\_factor})$$
  - Si aucune conversion n'existe, interrompt la transaction (`422 UNIT_CONVERSION_NOT_FOUND`).

### Étape 7 : Tri canonique et acquisition des verrous sur `inventory_balances`
- Identifie tous les tuples `(warehouse_id, location_id, product_id, variant_id)` impactés (sources et destinations).
- Trie ces tuples par ordre lexicographique strict (Invariant **I10**).
- Pour chaque tuple, s'assure que la ligne `inventory_balances` existe (upsert initial à `0.0000` si absente) puis acquiert un verrou exclusif `SELECT ... FOR UPDATE`.

### Étape 8 : Calcul des nouveaux soldes et contrôle de la politique de stock négatif
- Pour chaque ligne du mouvement :
  - Capture `balance_before_src` et/ou `balance_before_dst`.
  - Applique le delta $-\text{base\_quantity}$ sur la source (`issue`, `transfer`, `adjustment < 0`) et/ou $+\text{base\_quantity}$ sur la destination (`receipt`, `transfer`, `opening_balance`, `adjustment > 0`).
  - Recalcule $\text{available\_quantity} = \text{on\_hand\_quantity} - \text{reserved\_quantity}$.
  - Si une source présente $\text{available\_quantity} < 0.0000$ :
    - Si `negative_stock_policy == 'FORBID'` : **`ROLLBACK`** immédiat et retour `422 Unprocessable Entity (INSUFFICIENT_STOCK)` avec le détail du SKU, de l'emplacement, du disponible actuel et de la quantité demandée.
    - Si `negative_stock_policy == 'WARN'` : positionne le drapeau `warning_negative_stock = true` sur le mouvement.
    - Si `negative_stock_policy == 'ALLOW'` : poursuit normalement.
  - Enregistre `balance_after_src` et/ou `balance_after_dst` sur la ligne de mouvement.

### Étape 9 : Recalcul de la valorisation (`WAC` / `LAST_COST`)
- Lors d'une entrée valorisée (`receipt`, `opening_balance`) avec $\text{base\_quantity} > 0$ et $\text{unit\_cost} \ge 0$ :
  - Calcule le stock total `on_hand` positif de l'article avant l'entrée ($Q_{\text{old}}$) et son CMUP actuel ($\text{WAC}_{\text{old}}$).
  - Si $Q_{\text{old}} \le 0$, alors $\text{WAC}_{\text{new}} = \text{unit\_cost}$.
  - Sinon :
    $$\text{WAC}_{\text{new}} = \text{round\_4}\left(\frac{(Q_{\text{old}} \times \text{WAC}_{\text{old}}) + (\text{base\_quantity} \times \text{unit\_cost})}{Q_{\text{old}} + \text{base\_quantity}}\right)$$
  - Met à jour `weighted_average_cost = WAC_new` et `last_purchase_cost = unit_cost` sur `products` (ou `product_variants`).
- Met à jour `unit_cost_snapshot`, `total_valuation = on_hand_quantity * unit_cost_snapshot`, `last_movement_at = NOW()` et incrémente `version` sur chaque ligne `inventory_balances` touchée.

### Étape 10 : Scellement du mouvement et journalisation d'audit
- Met à jour `stock_movements` : `status = 'VALIDATED'`, `validated_by_user_id = userId`, `validated_at = NOW()`.
- Si `type = 'reversal'`, met à jour le mouvement d'origine (`reversed_by_movement_id = movement.id`).
- Insère une entrée immuable dans `audit_logs` (`action = 'STOCK_MOVEMENT_VALIDATED'`) contenant les snapshots avant/après des soldes impactés.

### Étape 11 : Finalisation de la clé d'idempotence et `COMMIT`
- Met à jour `idempotency_keys` avec `status = 'COMPLETED'`, `response_status_code = 200` et le corps JSON du mouvement validé.
- Exécute le `COMMIT` PostgreSQL.

---

## 4. Gestion des Inventaires Physiques (`inventories`)

Une campagne d'inventaire physique permet de réconcilier le stock physique réel d'un entrepôt avec le stock théorique informatique sans jamais violer l'invariant **I1**.

### Cycle de vie d'un inventaire
1. **Ouverture (`DRAFT` $\rightarrow$ `IN_PROGRESS`)** :
   - L'utilisateur sélectionne un entrepôt (`warehouse_id`) et un périmètre (`FULL`, `PARTIAL_CATEGORY`, `PARTIAL_LOCATION`).
   - Le système génère les lignes `inventory_lines` en copiant la valeur courante de `inventory_balances.on_hand_quantity` dans `expected_quantity` et le coût courant dans `unit_cost_snapshot`.
2. **Comptage terrain (`IN_PROGRESS`)** :
   - Les opérateurs saisissent `counted_quantity` pour chaque ligne.
   - À chaque saisie, l'écart est calculé en `Decimal(18,4)` :
     $$\text{variance} = \text{counted\_quantity} - \text{expected\_quantity}$$
     $$\text{variance\_valuation} = \text{variance} \times \text{unit\_cost\_snapshot}$$
3. **Validation atomique (`IN_PROGRESS` $\rightarrow$ `VALIDATED`)** :
   - Vérifie que toutes les lignes du périmètre ont été comptées (`counted_quantity IS NOT NULL`).
   - Dans une unique transaction PostgreSQL :
     1. Relit avec verrou `FOR UPDATE` les soldes actuels `inventory_balances.on_hand_quantity` pour recalculer l'écart exact par rapport au solde réel à l'instant de la validation :
        $$\Delta = \text{counted\_quantity} - \text{on\_hand\_quantity}_{\text{actuel}}$$
     2. Filtre toutes les lignes présentant un écart non nul ($\Delta \neq 0.0000$).
     3. Si au moins une ligne présente $\Delta \neq 0.0000$, **crée et valide automatiquement un mouvement de stock de type `adjustment`** (`reason_code = 'CYCLE_COUNT'`, `external_reference_type = 'INVENTORY_COUNT'`, `external_reference_id = inventory.id`) via le moteur de stock standard (étapes 7 à 10 ci-dessus).
     4. Lie `inventories.generated_movement_id` à ce mouvement d'ajustement.
     5. Passe `inventories.status = 'VALIDATED'`, `validated_at = NOW()`, `validated_by_user_id = userId` et écrit dans `audit_logs`.

---

## 5. Idempotence & Annulation par Mouvement Compensatoire (`reversal`)

### 5.1. Idempotence des écritures
Les réseaux mobiles en entrepôt (Wi-Fi instable entre les racks, terminaux code-barres) provoquent fréquemment des doubles envois HTTP.
- Tout appel `POST /api/v1/stock-movements`, `POST /api/v1/stock-movements/:id/validate`, `POST /api/v1/stock-movements/:id/reverse` ou `POST /api/v1/inventories/:id/validate` accepte (et exige en production depuis le client web) l'en-tête HTTP `Idempotency-Key: <UUIDv4>`.
- La table `idempotency_keys` garantit la sémantique **At-Most-Once Execution** par organisation.

### 5.2. Contre-passation (`reversal`)
Puisqu'un mouvement validé est immuable (Invariant **I2**), l'annulation d'une opération validée par erreur s'effectue via `POST /api/v1/stock-movements/:id/reverse` :
1. Le moteur vérifie que le mouvement d'origine `M` est au statut `VALIDATED`, qu'il n'est pas déjà lui-même annulé (`M.reversed_by_movement_id IS NULL`), et que le motif d'annulation est fourni.
2. Il construit un nouveau mouvement `R` de type `reversal` (`reversed_movement_id = M.id`) dont chaque ligne inverse exactement les flux de `M` :
   - Une entrée (`receipt` ou `opening_balance`) vers `L_dst` devient un retrait depuis `L_dst`.
   - Une sortie (`issue`) depuis `L_src` devient une réintégration vers `L_src`.
   - Un transfert de `L_src` vers `L_dst` devient un transfert inverse de `L_dst` vers `L_src`.
   - Un ajustement de $+\Delta$ devient un ajustement de $-\Delta$ (et réciproquement).
3. Le mouvement `R` est immédiatement validé dans la même transaction en respectant la politique de stock négatif (par exemple, on ne peut pas contre-passer une réception si la marchandise reçue a déjà été consommée et que la politique `FORBID` interdit de rendre le stock négatif).
