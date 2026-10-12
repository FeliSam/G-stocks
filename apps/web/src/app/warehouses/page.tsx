"use client";

import React, { useState, useEffect } from "react";
import {
  Warehouse as WarehouseIcon,
  MapPin,
  Plus,
  Package,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";
import { formatQuantity } from "@g-stock/ui";
import { AppShell } from "@/layouts/AppShell";
import {
  useGetWarehousesQuery,
  useCreateWarehouseMutation,
  useCreateLocationMutation,
} from "@/store/api";

const LOCATION_TYPE_LABELS: Record<string, string> = {
  STORAGE: "Stockage (STORAGE)",
  RECEIVING: "Réception (RECEIVING)",
  SHIPPING: "Expédition (SHIPPING)",
  QUARANTINE: "Quarantaine (QUARANTINE)",
};

export default function WarehousesPage() {
  const { data: warehousesRes, isLoading, error } = useGetWarehousesQuery();
  const [createWarehouse, { isLoading: isCreatingWarehouse }] =
    useCreateWarehouseMutation();
  const [createLocation, { isLoading: isCreatingLocation }] =
    useCreateLocationMutation();

  const warehouses = warehousesRes?.data || [];

  // Formulaire Nouvel Entrepôt
  const [whCode, setWhCode] = useState("");
  const [whName, setWhName] = useState("");

  // Formulaire Nouvel Emplacement
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [locCode, setLocCode] = useState("");
  const [locType, setLocType] = useState<
    "STORAGE" | "RECEIVING" | "SHIPPING" | "QUARANTINE"
  >("STORAGE");

  // Messages d'état et erreurs (ex: quota d'entrepôts dépassé)
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    code?: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (warehouses.length > 0 && !selectedWarehouseId) {
      setSelectedWarehouseId(warehouses[0].id);
    }
  }, [warehouses, selectedWarehouseId]);

  async function handleCreateWarehouse(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    try {
      const created = await createWarehouse({
        code: whCode.trim().toUpperCase(),
        name: whName.trim(),
        isActive: true,
      }).unwrap();

      setWhCode("");
      setWhName("");
      if (created?.data?.id) {
        setSelectedWarehouseId(created.data.id);
      }
      setFeedback({
        type: "success",
        message: `L'entrepôt « ${created?.data?.name || whName} » et ses emplacements par défaut ont été créés avec succès.`,
      });
    } catch (err: any) {
      const apiError = err?.data?.error;
      setFeedback({
        type: "error",
        code: apiError?.code,
        message:
          apiError?.message ||
          "Impossible de créer l'entrepôt. Vérifiez le code ou votre quota d'abonnement.",
      });
    }
  }

  async function handleCreateLocation(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    if (!selectedWarehouseId) return;
    try {
      await createLocation({
        warehouseId: selectedWarehouseId,
        code: locCode.trim().toUpperCase(),
        locationType: locType,
      }).unwrap();

      setLocCode("");
      setFeedback({
        type: "success",
        message: `L'emplacement « ${locCode.toUpperCase()} » (${locType}) a été ajouté à l'entrepôt.`,
      });
    } catch (err: any) {
      const apiError = err?.data?.error;
      setFeedback({
        type: "error",
        code: apiError?.code,
        message:
          apiError?.message ||
          "Impossible de créer cet emplacement dans l'entrepôt sélectionné.",
      });
    }
  }

  return (
    <AppShell
      title="Entrepôts & Zones de Stockage"
      subtitle="Configurez vos sites logistiques, vos emplacements typés (Stockage, Réception, Expédition, Quarantaine) et visualisez leurs soldes."
    >
      <div className="space-y-6">
        {/* Alerte claire en cas de succès ou d'erreur (quota plan, doublon, etc.) */}
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

        {/* Formulaires de création d'entrepôt et d'emplacement */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Formulaire Nouvel Entrepôt */}
          <div className="gstock-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <WarehouseIcon size={18} className="text-primary" />
              <div>
                <h2 className="font-bold text-base">Créer un nouvel entrepôt</h2>
                <p className="text-xs text-muted">
                  Initialise automatiquement une zone principale et un quai de réception
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateWarehouse} className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Code entrepôt *
                  </label>
                  <input
                    type="text"
                    required
                    value={whCode}
                    onChange={(e) => setWhCode(e.target.value.toUpperCase())}
                    placeholder="Ex: WH-LYON-01"
                    className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Nom de l&apos;entrepôt *
                  </label>
                  <input
                    type="text"
                    required
                    value={whName}
                    onChange={(e) => setWhName(e.target.value)}
                    placeholder="Ex: Plateforme Logistique Lyon Sud"
                    className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isCreatingWarehouse}
                className="w-full py-2 rounded-control bg-primary text-primary-foreground text-xs font-semibold inline-flex items-center justify-center gap-1.5"
              >
                <Plus size={14} />
                <span>
                  {isCreatingWarehouse
                    ? "Création de l'entrepôt..."
                    : "Créer l'entrepôt"}
                </span>
              </button>
            </form>
          </div>

          {/* Formulaire Nouvel Emplacement */}
          <div className="gstock-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-primary" />
              <div>
                <h2 className="font-bold text-base">
                  Ajouter un emplacement dans un entrepôt
                </h2>
                <p className="text-xs text-muted">
                  Subdivisez votre entrepôt en allées, quais ou zones de quarantaine
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateLocation} className="space-y-3">
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Entrepôt *
                  </label>
                  <select
                    required
                    value={selectedWarehouseId}
                    onChange={(e) => setSelectedWarehouseId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
                  >
                    {warehouses.length === 0 && (
                      <option value="">Aucun entrepôt</option>
                    )}
                    {warehouses.map((w: any) => (
                      <option key={w.id} value={w.id}>
                        {w.code} — {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Code emplacement *
                  </label>
                  <input
                    type="text"
                    required
                    value={locCode}
                    onChange={(e) => setLocCode(e.target.value.toUpperCase())}
                    placeholder="Ex: ALLEE-B-02"
                    className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Type de zone *
                  </label>
                  <select
                    value={locType}
                    onChange={(e) => setLocType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
                  >
                    <option value="STORAGE">STORAGE (Stockage)</option>
                    <option value="RECEIVING">RECEIVING (Réception)</option>
                    <option value="SHIPPING">SHIPPING (Expédition)</option>
                    <option value="QUARANTINE">QUARANTINE (Quarantaine)</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={isCreatingLocation || warehouses.length === 0}
                className="w-full py-2 rounded-control bg-primary text-primary-foreground text-xs font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Plus size={14} />
                <span>
                  {isCreatingLocation
                    ? "Ajout en cours..."
                    : "Ajouter l'emplacement"}
                </span>
              </button>
            </form>
          </div>
        </div>

        {/* Liste des entrepôts avec leurs emplacements et les soldes présents */}
        {isLoading ? (
          <div className="gstock-card p-8 text-center text-xs text-muted">
            Chargement de la topologie des entrepôts et des soldes par emplacement...
          </div>
        ) : error ? (
          <div className="gstock-card p-6 text-center text-xs text-danger">
            Erreur lors de la récupération des entrepôts.
          </div>
        ) : warehouses.length === 0 ? (
          <div className="gstock-card p-8 text-center text-xs text-muted">
            Aucun entrepôt n&apos;est encore configuré pour cette organisation.
          </div>
        ) : (
          <div className="space-y-6">
            {warehouses.map((wh: any) => {
              const locations = wh.locations || [];
              return (
                <div key={wh.id} className="gstock-card overflow-hidden">
                  <div className="p-4 border-b border-border bg-surface-muted/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-control bg-primary/15 text-primary flex items-center justify-center font-bold text-xs">
                        <WarehouseIcon size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">{wh.name}</span>
                          <span className="px-2 py-0.5 rounded bg-surface border border-border font-mono text-[11px] font-bold text-primary">
                            {wh.code}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              wh.isActive
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                : "bg-surface-muted text-muted"
                            }`}
                          >
                            {wh.isActive ? "Actif" : "Inactif"}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted">
                          {locations.length} emplacement(s) configuré(s)
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedWarehouseId(wh.id)}
                      className="px-3 py-1.5 rounded-control border border-border bg-surface hover:bg-surface-muted text-xs font-medium self-start sm:self-auto"
                    >
                      Sélectionner pour nouveau sous-emplacement
                    </button>
                  </div>

                  <div className="p-4 grid md:grid-cols-2 gap-4">
                    {locations.map((loc: any) => {
                      const balances = (loc.inventoryBalances || []).filter(
                        (b: any) => Number(b.onHand) !== 0 || Number(b.reserved) !== 0
                      );
                      return (
                        <div
                          key={loc.id}
                          className="rounded-control border border-border p-3.5 space-y-3 bg-background"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <MapPin size={14} className="text-primary" />
                              <span className="font-mono font-bold text-xs">
                                {loc.code}
                              </span>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                loc.locationType === "QUARANTINE"
                                  ? "bg-red-500/15 text-danger"
                                  : loc.locationType === "RECEIVING"
                                  ? "bg-amber-500/15 text-amber-600"
                                  : loc.locationType === "SHIPPING"
                                  ? "bg-blue-500/15 text-blue-600"
                                  : "bg-surface-muted text-foreground"
                              }`}
                            >
                              {LOCATION_TYPE_LABELS[loc.locationType] ||
                                loc.locationType}
                            </span>
                          </div>

                          {balances.length === 0 ? (
                            <div className="text-[11px] text-muted italic py-2 border-t border-dashed border-border">
                              Aucun article stocké actuellement dans cet emplacement.
                            </div>
                          ) : (
                            <div className="border-t border-border pt-2 space-y-1.5">
                              <div className="text-[11px] font-semibold text-muted uppercase">
                                Soldes présents ({balances.length})
                              </div>
                              <div className="divide-y divide-border/60">
                                {balances.map((bal: any) => {
                                  const onHand = Number(bal.onHand);
                                  const reserved = Number(bal.reserved);
                                  const available = onHand - reserved;
                                  return (
                                    <div
                                      key={bal.id}
                                      className="py-1.5 flex items-center justify-between text-xs gap-2"
                                    >
                                      <div className="min-w-0 flex items-center gap-1.5">
                                        <Package
                                          size={12}
                                          className="text-muted shrink-0"
                                        />
                                        <span className="font-mono font-semibold text-[11px] text-primary">
                                          {bal.product?.sku}
                                        </span>
                                        <span className="truncate">
                                          {bal.product?.name}
                                        </span>
                                      </div>
                                      <div className="shrink-0 font-semibold text-right">
                                        <span>
                                          Dispo : {formatQuantity(available)}
                                        </span>
                                        {reserved > 0 && (
                                          <span className="ml-1.5 text-[10px] text-amber-600">
                                            (Réservé : {formatQuantity(reserved)})
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
