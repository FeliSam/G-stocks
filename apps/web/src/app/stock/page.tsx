"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowLeftRight,
  Layers,
  History,
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight,
  Sliders,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Search,
  X,
} from "lucide-react";
import { formatCurrencyAmount, formatQuantity } from "@g-stock/ui";
import { AppShell } from "@/layouts/AppShell";
import {
  useGetBalancesQuery,
  useGetMovementsQuery,
  useCreateReceiptMutation,
  useCreateIssueMutation,
  useCreateTransferMutation,
  useCreateAdjustmentMutation,
  useReverseMovementMutation,
  useGetProductsQuery,
  useGetWarehousesQuery,
} from "@/store/api";

type StockTab = "operation" | "balances" | "journal";
type OperationType = "receipt" | "issue" | "transfer" | "adjustment";

function generateIdempotencyKey(prefix = "op") {
  const rand = Math.random().toString(36).substring(2, 10);
  return `${prefix}-${Date.now()}-${rand}`;
}

function generateReference(type: OperationType) {
  const prefixMap: Record<OperationType, string> = {
    receipt: "REC",
    issue: "ISS",
    transfer: "TRF",
    adjustment: "ADJ",
  };
  const suffix = String(Date.now()).slice(-6);
  return `${prefixMap[type]}-${suffix}`;
}

export default function StockPage() {
  const [activeTab, setActiveTab] = useState<StockTab>("operation");

  // Filtres Soldes par emplacement
  const [balanceWarehouseId, setBalanceWarehouseId] = useState("");
  const [balanceSearch, setBalanceSearch] = useState("");

  // Filtres Journal des mouvements
  const [journalPage, setJournalPage] = useState(1);
  const [journalLimit] = useState(15);
  const [journalType, setJournalType] = useState("");
  const [journalSearch, setJournalSearch] = useState("");

  // Queries RTK Query
  const { data: productsRes } = useGetProductsQuery({ page: 1, limit: 100 });
  const { data: warehousesRes } = useGetWarehousesQuery();
  const { data: balancesRes, isLoading: isLoadingBalances } = useGetBalancesQuery({
    warehouseId: balanceWarehouseId || undefined,
    search: balanceSearch.trim() || undefined,
  });
  const { data: movementsRes, isLoading: isLoadingMovements } =
    useGetMovementsQuery({
      page: journalPage,
      limit: journalLimit,
      movementType: journalType || undefined,
      search: journalSearch.trim() || undefined,
    });

  // Mutations RTK Query
  const [createReceipt, { isLoading: isReceiving }] = useCreateReceiptMutation();
  const [createIssue, { isLoading: isIssuing }] = useCreateIssueMutation();
  const [createTransfer, { isLoading: isTransferring }] =
    useCreateTransferMutation();
  const [createAdjustment, { isLoading: isAdjusting }] =
    useCreateAdjustmentMutation();
  const [reverseMovement, { isLoading: isReversing }] =
    useReverseMovementMutation();

  const products = productsRes?.data || [];
  const warehouses = warehousesRes?.data || [];
  const balances = balancesRes?.data || [];
  const movements = movementsRes?.data || [];
  const movementsMeta = movementsRes?.meta || {
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  };

  // Liste aplatie de tous les emplacements avec le nom de leur entrepôt
  const allLocations = useMemo(() => {
    const list: Array<{
      id: string;
      code: string;
      locationType: string;
      warehouseName: string;
      warehouseCode: string;
    }> = [];
    for (const w of warehouses) {
      for (const loc of w.locations || []) {
        list.push({
          id: loc.id,
          code: loc.code,
          locationType: loc.locationType,
          warehouseName: w.name,
          warehouseCode: w.code,
        });
      }
    }
    return list;
  }, [warehouses]);

  // États du formulaire Nouvelle Opération
  const [opType, setOpType] = useState<OperationType>("receipt");
  const [reference, setReference] = useState(() => generateReference("receipt"));
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    generateIdempotencyKey("receipt")
  );
  const [productId, setProductId] = useState("");
  const [fromLocationId, setFromLocationId] = useState("");
  const [toLocationId, setToLocationId] = useState("");
  const [quantity, setQuantity] = useState("10");
  const [unitCost, setUnitCost] = useState("");
  const [reasonOrNotes, setReasonOrNotes] = useState("");

  // Retour serveur (succès ou erreur ex: stock négatif interdit)
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    code?: string;
    message: string;
  } | null>(null);

  // Modal de contrepassation (Reversal)
  const [reversalModalMovement, setReversalModalMovement] = useState<any | null>(
    null
  );
  const [reversalReason, setReversalReason] = useState("");

  useEffect(() => {
    if (products.length > 0 && !productId) {
      setProductId(products[0].id);
      setUnitCost(String(products[0].costPrice ?? 0));
    }
  }, [products, productId]);

  useEffect(() => {
    if (allLocations.length > 0) {
      if (!fromLocationId) setFromLocationId(allLocations[0].id);
      if (!toLocationId) {
        setToLocationId(allLocations[1]?.id || allLocations[0].id);
      }
    }
  }, [allLocations, fromLocationId, toLocationId]);

  function handleSelectOperationType(nextType: OperationType) {
    setOpType(nextType);
    setReference(generateReference(nextType));
    setIdempotencyKey(generateIdempotencyKey(nextType));
    setFeedback(null);
  }

  function handleRenewIdempotencyKey() {
    setIdempotencyKey(generateIdempotencyKey(opType));
  }

  async function handleSubmitOperation(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);

    try {
      let res: any;
      if (opType === "receipt") {
        res = await createReceipt({
          reference: reference.trim(),
          idempotencyKey: idempotencyKey.trim(),
          notes: reasonOrNotes.trim() || undefined,
          lines: [
            {
              productId,
              toLocationId,
              quantity: Number(quantity),
              ...(unitCost !== "" ? { unitCost: Number(unitCost) } : {}),
            },
          ],
        }).unwrap();
      } else if (opType === "issue") {
        res = await createIssue({
          reference: reference.trim(),
          idempotencyKey: idempotencyKey.trim(),
          notes: reasonOrNotes.trim() || undefined,
          lines: [
            {
              productId,
              fromLocationId,
              quantity: Number(quantity),
            },
          ],
        }).unwrap();
      } else if (opType === "transfer") {
        res = await createTransfer({
          reference: reference.trim(),
          idempotencyKey: idempotencyKey.trim(),
          notes: reasonOrNotes.trim() || undefined,
          lines: [
            {
              productId,
              fromLocationId,
              toLocationId,
              quantity: Number(quantity),
            },
          ],
        }).unwrap();
      } else {
        res = await createAdjustment({
          reference: reference.trim(),
          idempotencyKey: idempotencyKey.trim(),
          reason:
            reasonOrNotes.trim() ||
            "Ajustement manuel validé par le gestionnaire",
          lines: [
            {
              productId,
              locationId: toLocationId || fromLocationId,
              quantityDelta: Number(quantity),
              ...(unitCost !== "" ? { unitCost: Number(unitCost) } : {}),
            },
          ],
        }).unwrap();
      }

      const replayNotice = res?.idempotentReplay
        ? " (Rejeu idempotent détecté : aucun doublon créé)"
        : "";

      setFeedback({
        type: "success",
        message: `Mouvement ${res?.data?.reference || reference} validé et journalisé avec succès${replayNotice}.`,
      });
      setReference(generateReference(opType));
      setIdempotencyKey(generateIdempotencyKey(opType));
    } catch (err: any) {
      const apiError = err?.data?.error;
      setFeedback({
        type: "error",
        code: apiError?.code,
        message:
          apiError?.message ||
          "L'opération de stock a été refusée par le moteur transactionnel.",
      });
    }
  }

  async function handleConfirmReversal(e: React.FormEvent) {
    e.preventDefault();
    if (!reversalModalMovement || !reversalReason.trim()) return;
    setFeedback(null);

    try {
      const res = await reverseMovement({
        id: reversalModalMovement.id,
        idempotencyKey: generateIdempotencyKey("rev"),
        reason: reversalReason.trim(),
      }).unwrap();

      setFeedback({
        type: "success",
        message: `Contrepassation enregistrée avec succès (Mouvement inverse : ${res?.data?.reference}).`,
      });
      setReversalModalMovement(null);
      setReversalReason("");
    } catch (err: any) {
      const apiError = err?.data?.error;
      setFeedback({
        type: "error",
        code: apiError?.code,
        message:
          apiError?.message ||
          "Impossible de contrepasser ce mouvement (stock insuffisant ou déjà contrepassé).",
      });
      setReversalModalMovement(null);
    }
  }

  const isSubmittingOp =
    isReceiving || isIssuing || isTransferring || isAdjusting;

  return (
    <AppShell
      title="Mouvements Transactionnels & Soldes"
      subtitle="Exécutez vos réceptions, sorties, transferts et ajustements avec garantie d'idempotence et journalisation immuable."
    >
      <div className="space-y-6">
        {/* Affichage clair du succès ou de l'erreur serveur */}
        {feedback && (
          <div
            className={`p-4 rounded-control border text-xs flex items-start justify-between gap-3 ${
              feedback.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                : "bg-red-500/10 border-red-500/30 text-danger"
            }`}
          >
            <div className="flex items-start gap-2.5">
              {feedback.type === "success" ? (
                <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                {feedback.code && (
                  <div className="font-mono font-bold uppercase text-[11px]">
                    Code : {feedback.code}
                  </div>
                )}
                <div className="font-medium">{feedback.message}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="p-1 hover:opacity-75"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Onglets */}
        <div className="flex flex-wrap border-b border-border gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("operation")}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors inline-flex items-center gap-2 ${
              activeTab === "operation"
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <ArrowLeftRight size={15} />
            <span>Nouvelle Opération de Stock</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("balances")}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors inline-flex items-center gap-2 ${
              activeTab === "balances"
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <Layers size={15} />
            <span>Soldes par Emplacement ({balances.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("journal")}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors inline-flex items-center gap-2 ${
              activeTab === "journal"
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <History size={15} />
            <span>Journal Immuable des Mouvements ({movementsMeta.total})</span>
          </button>
        </div>

        {/* ONGLET 1 : NOUVELLE OPÉRATION DE STOCK */}
        {activeTab === "operation" && (
          <div className="grid lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 gstock-card p-6 space-y-5">
              <div>
                <h2 className="font-bold text-base">
                  Sélectionnez le type d&apos;opération transactionnelle
                </h2>
                <p className="text-xs text-muted">
                  Chaque validation met à jour les soldes de manière atomique en base PostgreSQL
                </p>
              </div>

              {/* Sélecteur des 4 types d'opération */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleSelectOperationType("receipt")}
                  className={`p-3 rounded-control border text-left transition-all space-y-1 ${
                    opType === "receipt"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background hover:bg-surface-muted"
                  }`}
                >
                  <ArrowDownLeft size={16} />
                  <div className="font-bold text-xs">Réception</div>
                  <div className="text-[10px] text-muted">Entrée fournisseur</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectOperationType("issue")}
                  className={`p-3 rounded-control border text-left transition-all space-y-1 ${
                    opType === "issue"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background hover:bg-surface-muted"
                  }`}
                >
                  <ArrowUpRight size={16} />
                  <div className="font-bold text-xs">Sortie</div>
                  <div className="text-[10px] text-muted">Consommation / Vente</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectOperationType("transfer")}
                  className={`p-3 rounded-control border text-left transition-all space-y-1 ${
                    opType === "transfer"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background hover:bg-surface-muted"
                  }`}
                >
                  <ArrowLeftRight size={16} />
                  <div className="font-bold text-xs">Transfert</div>
                  <div className="text-[10px] text-muted">Inter-emplacements</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectOperationType("adjustment")}
                  className={`p-3 rounded-control border text-left transition-all space-y-1 ${
                    opType === "adjustment"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background hover:bg-surface-muted"
                  }`}
                >
                  <Sliders size={16} />
                  <div className="font-bold text-xs">Ajustement</div>
                  <div className="text-[10px] text-muted">Correction motivée</div>
                </button>
              </div>

              <form onSubmit={handleSubmitOperation} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      Référence du document *
                    </label>
                    <input
                      type="text"
                      required
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      Clé d&apos;idempotence anti-doublon *
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        required
                        value={idempotencyKey}
                        onChange={(e) => setIdempotencyKey(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs rounded-control border border-border bg-surface-muted font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleRenewIdempotencyKey}
                        title="Générer une nouvelle clé d'idempotence"
                        className="px-2.5 py-2 rounded-control border border-border bg-background hover:bg-surface-muted text-xs inline-flex items-center gap-1"
                      >
                        <RefreshCw size={13} />
                        <span>Renouveler</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Produit concerné *
                  </label>
                  <select
                    required
                    value={productId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setProductId(nextId);
                      const found = products.find((p: any) => p.id === nextId);
                      if (found) {
                        setUnitCost(String(found.costPrice ?? 0));
                      }
                    }}
                    className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
                  >
                    {products.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        [{p.sku}] {p.name} — Dispo globale : {p.available}{" "}
                        {p.baseUnit?.code}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Emplacement(s) selon le type d'opération */}
                <div className="grid sm:grid-cols-2 gap-4">
                  {(opType === "issue" || opType === "transfer") && (
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Emplacement source (Origine) *
                      </label>
                      <select
                        required
                        value={fromLocationId}
                        onChange={(e) => setFromLocationId(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
                      >
                        {allLocations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.warehouseCode} / {loc.code} ({loc.locationType})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {(opType === "receipt" ||
                    opType === "transfer" ||
                    opType === "adjustment") && (
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        {opType === "adjustment"
                          ? "Emplacement à ajuster *"
                          : "Emplacement de destination *"}
                      </label>
                      <select
                        required
                        value={toLocationId}
                        onChange={(e) => setToLocationId(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
                      >
                        {allLocations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.warehouseCode} / {loc.code} ({loc.locationType})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      {opType === "adjustment"
                        ? "Variation de quantité (+ ou - non nul) *"
                        : "Quantité (> 0) *"}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background font-bold"
                    />
                  </div>

                  {(opType === "receipt" || opType === "adjustment") && (
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Coût unitaire d&apos;acquisition (optionnel)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={unitCost}
                        onChange={(e) => setUnitCost(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    {opType === "adjustment"
                      ? "Motif obligatoire de l'ajustement *"
                      : "Notes / Bon de livraison / Commentaire"}
                  </label>
                  <input
                    type="text"
                    required={opType === "adjustment"}
                    value={reasonOrNotes}
                    onChange={(e) => setReasonOrNotes(e.target.value)}
                    placeholder={
                      opType === "adjustment"
                        ? "Ex: Casse constatée en zone de réception"
                        : "Ex: BL Fournisseur #84920"
                    }
                    className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingOp}
                  className="w-full py-2.5 rounded-control bg-primary text-primary-foreground text-xs font-semibold"
                >
                  {isSubmittingOp
                    ? "Validation transactionnelle en cours..."
                    : "Valider et sceller le mouvement de stock"}
                </button>
              </form>
            </div>

            {/* Encart explicatif des garanties transactionnelles */}
            <div className="lg:col-span-4 gstock-card p-5 space-y-4 h-fit">
              <h3 className="font-bold text-sm">
                Garanties du moteur de stock G-Stock
              </h3>
              <ul className="space-y-2.5 text-xs text-muted">
                <li>
                  • <strong>Protection anti-stock négatif :</strong> toute sortie
                  ou transfert dépassant le solde disponible est rejeté avec le
                  code <code className="font-mono">NEGATIVE_STOCK_FORBIDDEN</code>.
                </li>
                <li>
                  • <strong>Idempotence stricte :</strong> la clé{" "}
                  <code className="font-mono">idempotencyKey</code> empêche toute
                  double exécution en cas de clic multiple ou de coupure réseau.
                </li>
                <li>
                  • <strong>Immuabilité comptable :</strong> un mouvement validé
                  ne peut jamais être supprimé ; seule une contrepassation
                  (reversal) inverse ses effets.
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* ONGLET 2 : SOLDES PAR EMPLACEMENT */}
        {activeTab === "balances" && (
          <div className="space-y-4">
            <div className="gstock-card p-4 grid sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 relative">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                  type="text"
                  value={balanceSearch}
                  onChange={(e) => setBalanceSearch(e.target.value)}
                  placeholder="Filtrer par SKU, nom de produit ou code d'emplacement..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-control border border-border bg-background"
                />
              </div>
              <div>
                <select
                  aria-label="Filtrer par entrepôt"
                  value={balanceWarehouseId}
                  onChange={(e) => setBalanceWarehouseId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
                >
                  <option value="">Tous les entrepôts</option>
                  {warehouses.map((w: any) => (
                    <option key={w.id} value={w.id}>
                      {w.code} — {w.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="gstock-card overflow-hidden">
              {isLoadingBalances ? (
                <div className="p-8 text-center text-xs text-muted">
                  Chargement des soldes par emplacement...
                </div>
              ) : balances.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted">
                  Aucun solde trouvé pour ces critères.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs gstock-table">
                    <thead className="bg-surface-muted text-muted uppercase text-[11px]">
                      <tr>
                        <th>Entrepôt / Emplacement</th>
                        <th>SKU</th>
                        <th>Produit</th>
                        <th>Physique (onHand)</th>
                        <th>Réservé (reserved)</th>
                        <th>Disponible (available)</th>
                        <th>Valorisation (valuation)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {balances.map((b: any) => (
                        <tr key={b.id} className="hover:bg-surface-muted/40">
                          <td>
                            <div className="font-semibold">
                              {b.location?.warehouse?.name}
                            </div>
                            <div className="text-[11px] font-mono text-muted">
                              {b.location?.warehouse?.code} / {b.location?.code}
                            </div>
                          </td>
                          <td className="font-mono font-bold text-primary">
                            {b.product?.sku}
                          </td>
                          <td className="font-semibold">{b.product?.name}</td>
                          <td>
                            {formatQuantity(b.onHand)}{" "}
                            {b.product?.baseUnit?.code}
                          </td>
                          <td className="text-amber-600">
                            {formatQuantity(b.reserved)}
                          </td>
                          <td className="font-bold">
                            {formatQuantity(b.available)}{" "}
                            {b.product?.baseUnit?.code}
                          </td>
                          <td className="font-semibold">
                            {formatCurrencyAmount(b.valuation)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ONGLET 3 : JOURNAL IMMUABLE DES MOUVEMENTS */}
        {activeTab === "journal" && (
          <div className="space-y-4">
            <div className="gstock-card p-4 grid sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 relative">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                  type="text"
                  value={journalSearch}
                  onChange={(e) => {
                    setJournalSearch(e.target.value);
                    setJournalPage(1);
                  }}
                  placeholder="Rechercher par référence ou motif..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-control border border-border bg-background"
                />
              </div>

              <div>
                <select
                  aria-label="Filtrer par type de mouvement"
                  value={journalType}
                  onChange={(e) => {
                    setJournalType(e.target.value);
                    setJournalPage(1);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
                >
                  <option value="">Tous les types de mouvements</option>
                  <option value="receipt">Réception (receipt)</option>
                  <option value="issue">Sortie (issue)</option>
                  <option value="transfer">Transfert (transfer)</option>
                  <option value="adjustment">Ajustement (adjustment)</option>
                  <option value="reversal">Contrepassation (reversal)</option>
                  <option value="opening_balance">Solde initial (opening_balance)</option>
                </select>
              </div>
            </div>

            <div className="gstock-card overflow-hidden">
              {isLoadingMovements ? (
                <div className="p-8 text-center text-xs text-muted">
                  Chargement du journal des mouvements...
                </div>
              ) : movements.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted">
                  Aucun mouvement enregistré pour ces filtres.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs gstock-table">
                    <thead className="bg-surface-muted text-muted uppercase text-[11px]">
                      <tr>
                        <th>Référence</th>
                        <th>Type</th>
                        <th>Statut</th>
                        <th>Détail des lignes</th>
                        <th>Notes / Motif</th>
                        <th>Date</th>
                        <th className="text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {movements.map((m: any) => (
                        <tr key={m.id} className="hover:bg-surface-muted/40">
                          <td className="font-mono font-bold text-primary">
                            {m.reference}
                          </td>
                          <td className="uppercase font-semibold">
                            {m.movementType}
                          </td>
                          <td>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                m.status === "REVERSED"
                                  ? "bg-amber-500/15 text-amber-600"
                                  : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              }`}
                            >
                              {m.status}
                            </span>
                          </td>
                          <td>
                            <div className="space-y-1">
                              {(m.lines || []).map((line: any) => (
                                <div key={line.id} className="text-[11px]">
                                  <span className="font-mono font-semibold">
                                    {line.product?.sku}
                                  </span>{" "}
                                  :{" "}
                                  <strong>
                                    {formatQuantity(line.quantity)}{" "}
                                    {line.product?.baseUnit?.code}
                                  </strong>{" "}
                                  <span className="text-muted">
                                    ({line.fromLocation?.code || "EXT"} →{" "}
                                    {line.toLocation?.code || "EXT"})
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="text-muted max-w-xs truncate">
                            {m.notes || "—"}
                          </td>
                          <td className="text-muted whitespace-nowrap">
                            {new Date(m.occurredAt).toLocaleString("fr-FR")}
                          </td>
                          <td className="text-right">
                            {m.status === "VALIDATED" ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setReversalModalMovement(m);
                                  setReversalReason("");
                                }}
                                className="px-2.5 py-1 rounded-control border border-border hover:bg-surface-muted text-xs font-semibold inline-flex items-center gap-1 text-amber-600"
                              >
                                <RotateCcw size={12} />
                                <span>Contrepasser (Reversal)</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-muted italic">
                                Contrepassé
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination du journal */}
              <div className="p-3.5 border-t border-border flex items-center justify-between text-xs">
                <span className="text-muted">
                  Page <strong>{movementsMeta.page}</strong> sur{" "}
                  <strong>{movementsMeta.totalPages}</strong> (
                  {movementsMeta.total} mouvements)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={journalPage <= 1}
                    onClick={() => setJournalPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-control border border-border disabled:opacity-40 hover:bg-surface-muted font-medium"
                  >
                    Précédent
                  </button>
                  <button
                    type="button"
                    disabled={journalPage >= movementsMeta.totalPages}
                    onClick={() =>
                      setJournalPage((p) =>
                        Math.min(movementsMeta.totalPages, p + 1)
                      )
                    }
                    className="px-3 py-1.5 rounded-control border border-border disabled:opacity-40 hover:bg-surface-muted font-medium"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE CONTREPASSATION (REVERSAL) */}
      {reversalModalMovement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="gstock-card p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold flex items-center gap-2">
                <RotateCcw size={16} className="text-amber-600" />
                <span>
                  Contrepasser {reversalModalMovement.reference}
                </span>
              </h2>
              <button
                type="button"
                onClick={() => setReversalModalMovement(null)}
                className="p-1 text-muted hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-muted">
              Cette action génère une écriture inverse immuable (`reversal`) et
              marque le mouvement d&apos;origine comme `REVERSED`.
            </p>

            <form onSubmit={handleConfirmReversal} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Motif d&apos;audit de la contrepassation *
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="Ex: Erreur de saisie sur la quantité réceptionnée"
                  className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReversalModalMovement(null)}
                  className="px-4 py-2 text-xs font-medium rounded-control border border-border"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isReversing}
                  className="px-4 py-2 text-xs font-semibold rounded-control bg-amber-600 text-white"
                >
                  {isReversing
                    ? "Contrepassation..."
                    : "Confirmer la contrepassation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
