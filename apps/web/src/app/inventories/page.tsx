"use client";

import React, { useState, useEffect } from "react";
import {
  ClipboardCheck,
  Plus,
  Save,
  CheckCircle2,
  AlertCircle,
  Minus,
  X,
  Warehouse,
} from "lucide-react";
import { formatQuantity } from "@g-stock/ui";
import { AppShell } from "@/layouts/AppShell";
import {
  useGetInventoriesQuery,
  useCreateInventoryMutation,
  useSubmitInventoryCountsMutation,
  useValidateInventoryMutation,
  useGetWarehousesQuery,
} from "@/store/api";

export default function InventoriesPage() {
  const { data: inventoriesRes, isLoading: isLoadingInventories } =
    useGetInventoriesQuery();
  const { data: warehousesRes } = useGetWarehousesQuery();

  const [createInventory, { isLoading: isCreatingInventory }] =
    useCreateInventoryMutation();
  const [submitInventoryCounts, { isLoading: isSavingCounts }] =
    useSubmitInventoryCountsMutation();
  const [validateInventory, { isLoading: isValidatingInventory }] =
    useValidateInventoryMutation();

  const inventories = inventoriesRes?.data || [];
  const warehouses = warehousesRes?.data || [];

  // Formulaire de création d'une campagne d'inventaire
  const [warehouseId, setWarehouseId] = useState("");
  const [notes, setNotes] = useState("");

  // Session d'inventaire sélectionnée et comptages locaux en direct
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>("");
  const [localCounts, setLocalCounts] = useState<Record<string, number>>({});

  // Retour utilisateur
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (warehouses.length > 0 && !warehouseId) {
      setWarehouseId(warehouses[0].id);
    }
  }, [warehouses, warehouseId]);

  useEffect(() => {
    if (inventories.length > 0 && !selectedInventoryId) {
      setSelectedInventoryId(inventories[0].id);
    }
  }, [inventories, selectedInventoryId]);

  const activeInventory = inventories.find(
    (inv: any) => inv.id === selectedInventoryId
  );

  // Synchroniser les comptages locaux quand l'inventaire sélectionné change
  useEffect(() => {
    if (!activeInventory) return;
    const map: Record<string, number> = {};
    for (const line of activeInventory.lines || []) {
      const key = `${line.productId}:${line.locationId}`;
      map[key] = Number(line.countedQuantity);
    }
    setLocalCounts(map);
  }, [activeInventory]);

  async function handleCreateInventory(e: React.FormEvent) {
    e.preventDefault();
    if (!warehouseId) return;
    setFeedback(null);
    try {
      const res = await createInventory({
        warehouseId,
        notes: notes.trim() || undefined,
      }).unwrap();

      setNotes("");
      if (res?.data?.id) {
        setSelectedInventoryId(res.data.id);
      }
      setFeedback({
        type: "success",
        message: "Campagne d'inventaire physique initialisée avec succès.",
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        message:
          err?.data?.error?.message ||
          "Impossible de créer la campagne d'inventaire.",
      });
    }
  }

  function updateCount(productId: string, locationId: string, nextValue: number) {
    const key = `${productId}:${locationId}`;
    const safeVal = Math.max(0, Number(nextValue.toFixed(4)));
    setLocalCounts((prev) => ({
      ...prev,
      [key]: safeVal,
    }));
  }

  async function handleSaveCounts() {
    if (!activeInventory) return;
    setFeedback(null);
    try {
      const linesPayload = (activeInventory.lines || []).map((line: any) => {
        const key = `${line.productId}:${line.locationId}`;
        const counted =
          localCounts[key] !== undefined
            ? localCounts[key]
            : Number(line.countedQuantity);
        return {
          productId: line.productId,
          locationId: line.locationId,
          countedQuantity: counted,
        };
      });

      await submitInventoryCounts({
        id: activeInventory.id,
        lines: linesPayload,
      }).unwrap();

      setFeedback({
        type: "success",
        message: "Les quantités comptées et les écarts ont été enregistrés.",
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        message:
          err?.data?.error?.message ||
          "Erreur lors de l'enregistrement des comptages.",
      });
    }
  }

  async function handleValidateAndAdjust() {
    if (!activeInventory) return;
    setFeedback(null);
    try {
      // Sauvegarder d'abord les comptages saisis à l'écran avant de sceller l'inventaire
      const linesPayload = (activeInventory.lines || []).map((line: any) => {
        const key = `${line.productId}:${line.locationId}`;
        const counted =
          localCounts[key] !== undefined
            ? localCounts[key]
            : Number(line.countedQuantity);
        return {
          productId: line.productId,
          locationId: line.locationId,
          countedQuantity: counted,
        };
      });

      if (linesPayload.length > 0) {
        await submitInventoryCounts({
          id: activeInventory.id,
          lines: linesPayload,
        }).unwrap();
      }

      const res = await validateInventory({ id: activeInventory.id }).unwrap();
      const movNotice = res?.generatedMovementId
        ? " Un mouvement d'ajustement automatique a été généré."
        : " Aucun écart constaté (aucun ajustement requis).";

      setFeedback({
        type: "success",
        message: `Inventaire validé et verrouillé avec succès.${movNotice}`,
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        message:
          err?.data?.error?.message ||
          "Erreur lors de la validation de l'inventaire.",
      });
    }
  }

  const isLocked =
    activeInventory?.status === "VALIDATED" ||
    activeInventory?.status === "CANCELED";

  return (
    <AppShell
      title="Campagnes d'Inventaires Physiques"
      subtitle="Figez les soldes théoriques d'un entrepôt, saisissez vos comptages sur ordinateur ou mobile, et validez les écarts."
    >
      <div className="space-y-6">
        {feedback && (
          <div
            className={`p-4 rounded-control border text-xs flex items-center justify-between gap-2 ${
              feedback.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                : "bg-red-500/10 border-red-500/30 text-danger"
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === "success" ? (
                <CheckCircle2 size={16} />
              ) : (
                <AlertCircle size={16} />
              )}
              <span className="font-medium">{feedback.message}</span>
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

        {/* Création d'une nouvelle campagne d'inventaire */}
        <div className="gstock-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ClipboardCheck size={18} className="text-primary" />
            <div>
              <h2 className="font-bold text-base">
                Ouvrir une nouvelle campagne d&apos;inventaire
              </h2>
              <p className="text-xs text-muted">
                Capture instantanément les quantités théoriques (`expectedQuantity`) des emplacements de l&apos;entrepôt choisi
              </p>
            </div>
          </div>

          <form
            onSubmit={handleCreateInventory}
            className="grid sm:grid-cols-12 gap-3 items-end"
          >
            <div className="sm:col-span-4">
              <label className="block text-xs font-semibold mb-1">
                Entrepôt à inventorier *
              </label>
              <select
                required
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
              >
                {warehouses.map((w: any) => (
                  <option key={w.id} value={w.id}>
                    {w.code} — {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-5">
              <label className="block text-xs font-semibold mb-1">
                Notes / Libellé de campagne
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Inventaire tournant fin de trimestre"
                className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
              />
            </div>

            <div className="sm:col-span-3">
              <button
                type="submit"
                disabled={isCreatingInventory || warehouses.length === 0}
                className="w-full py-2 px-4 rounded-control bg-primary text-primary-foreground text-xs font-semibold inline-flex items-center justify-center gap-1.5"
              >
                <Plus size={14} />
                <span>
                  {isCreatingInventory
                    ? "Création..."
                    : "Démarrer l'inventaire"}
                </span>
              </button>
            </div>
          </form>
        </div>

        {/* Liste des campagnes & Feuille de comptage */}
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Colonne gauche : Sélection de la campagne */}
          <div className="lg:col-span-4 space-y-3">
            <h3 className="font-bold text-sm">
              Sessions d&apos;inventaire ({inventories.length})
            </h3>
            {isLoadingInventories ? (
              <div className="gstock-card p-6 text-xs text-muted">
                Chargement des sessions...
              </div>
            ) : inventories.length === 0 ? (
              <div className="gstock-card p-6 text-xs text-muted text-center">
                Aucune campagne d&apos;inventaire enregistrée.
              </div>
            ) : (
              <div className="space-y-2.5">
                {inventories.map((inv: any) => {
                  const isSelected = inv.id === selectedInventoryId;
                  return (
                    <button
                      key={inv.id}
                      type="button"
                      onClick={() => setSelectedInventoryId(inv.id)}
                      className={`w-full text-left gstock-card p-4 transition-all space-y-2 ${
                        isSelected
                          ? "ring-2 ring-primary border-primary"
                          : "hover:bg-surface-muted/50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs flex items-center gap-1.5">
                          <Warehouse size={13} className="text-primary" />
                          <span>{inv.warehouse?.name}</span>
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            inv.status === "VALIDATED"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : "bg-amber-500/15 text-amber-600"
                          }`}
                        >
                          {inv.status === "VALIDATED" ? "Validé" : "En comptage"}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted">
                        {inv.notes || `Session #${inv.id.slice(0, 8)}`}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted pt-1 border-t border-border">
                        <span>{(inv.lines || []).length} ligne(s)</span>
                        <span>
                          {new Date(inv.startedAt).toLocaleDateString("fr-FR")}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Colonne droite : Interface de comptage rapide (Desktop & Mobile) */}
          <div className="lg:col-span-8">
            {!activeInventory ? (
              <div className="gstock-card p-8 text-center text-xs text-muted">
                Sélectionnez ou démarrez une campagne d&apos;inventaire pour afficher la feuille de comptage.
              </div>
            ) : (
              <div className="gstock-card overflow-hidden">
                <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-surface-muted/30">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-base">
                        Feuille de comptage — {activeInventory.warehouse?.name}
                      </h2>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isLocked
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            : "bg-amber-500/15 text-amber-600"
                        }`}
                      >
                        {activeInventory.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted">
                      Ajustez les quantités comptées avec les boutons -1 / +1 ou au clavier
                    </p>
                  </div>

                  {!isLocked && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={isSavingCounts}
                        onClick={handleSaveCounts}
                        className="px-3 py-2 rounded-control border border-border bg-surface hover:bg-surface-muted text-xs font-semibold inline-flex items-center gap-1.5"
                      >
                        <Save size={14} />
                        <span>
                          {isSavingCounts
                            ? "Enregistrement..."
                            : "Enregistrer les comptages"}
                        </span>
                      </button>

                      <button
                        type="button"
                        disabled={isValidatingInventory}
                        onClick={handleValidateAndAdjust}
                        className="px-3.5 py-2 rounded-control bg-primary text-primary-foreground text-xs font-semibold inline-flex items-center gap-1.5"
                      >
                        <CheckCircle2 size={14} />
                        <span>
                          {isValidatingInventory
                            ? "Validation..."
                            : "Valider l'inventaire et générer l'ajustement"}
                        </span>
                      </button>
                    </div>
                  )}
                </div>

                {(activeInventory.lines || []).length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted">
                    Aucun solde n&apos;était présent dans cet entrepôt lors de l&apos;ouverture de l&apos;inventaire.
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {(activeInventory.lines || []).map((line: any) => {
                      const key = `${line.productId}:${line.locationId}`;
                      const expected = Number(line.expectedQuantity);
                      const counted =
                        localCounts[key] !== undefined
                          ? localCounts[key]
                          : Number(line.countedQuantity);
                      const variance = Number((counted - expected).toFixed(4));
                      const unitCode = line.product?.baseUnit?.code || "UN";

                      return (
                        <div
                          key={line.id}
                          className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-surface-muted/30"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-primary">
                                {line.product?.sku}
                              </span>
                              <span className="font-semibold text-sm truncate">
                                {line.product?.name}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                              <span>
                                Emplacement :{" "}
                                <strong className="font-mono text-foreground">
                                  {line.location?.code}
                                </strong>
                              </span>
                              <span>•</span>
                              <span>
                                Théorique figé :{" "}
                                <strong className="text-foreground">
                                  {formatQuantity(expected)} {unitCode}
                                </strong>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                            {/* Contrôles tactiles Mobile & Desktop (-1 / Input / +1) */}
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={isLocked}
                                onClick={() =>
                                  updateCount(
                                    line.productId,
                                    line.locationId,
                                    counted - 1
                                  )
                                }
                                aria-label="Diminuer de 1"
                                className="w-8 h-8 rounded-control border border-border bg-surface hover:bg-surface-muted flex items-center justify-center disabled:opacity-40"
                              >
                                <Minus size={14} />
                              </button>

                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                disabled={isLocked}
                                value={counted}
                                onChange={(e) =>
                                  updateCount(
                                    line.productId,
                                    line.locationId,
                                    Number(e.target.value)
                                  )
                                }
                                aria-label={`Quantité comptée pour ${line.product?.name}`}
                                className="w-24 px-2.5 py-1.5 text-center font-bold text-xs rounded-control border border-border bg-background"
                              />

                              <button
                                type="button"
                                disabled={isLocked}
                                onClick={() =>
                                  updateCount(
                                    line.productId,
                                    line.locationId,
                                    counted + 1
                                  )
                                }
                                aria-label="Augmenter de 1"
                                className="w-8 h-8 rounded-control border border-border bg-surface hover:bg-surface-muted flex items-center justify-center disabled:opacity-40"
                              >
                                <Plus size={14} />
                              </button>
                            </div>

                            {/* Écart calculé en direct */}
                            <div className="w-28 text-right">
                              <div className="text-[10px] uppercase text-muted font-semibold">
                                Écart (variance)
                              </div>
                              <div
                                className={`text-xs font-extrabold font-mono ${
                                  variance === 0
                                    ? "text-muted"
                                    : variance > 0
                                    ? "text-emerald-600"
                                    : "text-danger"
                                }`}
                              >
                                {variance > 0 ? `+${variance}` : variance}{" "}
                                {unitCode}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
