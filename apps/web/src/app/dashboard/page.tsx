"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Package,
  AlertTriangle,
  XOctagon,
  Warehouse,
  ArrowDownLeft,
  ArrowUpRight,
  Info,
  Plus,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { formatCurrencyAmount, formatQuantity } from "@g-stock/ui";
import { AppShell } from "@/layouts/AppShell";
import { useGetReportsOverviewQuery } from "@/store/api";

export default function DashboardPage() {
  const [days, setDays] = useState(30);
  const { data, isLoading, error } = useGetReportsOverviewQuery({ days });

  const overview = data?.data;
  const kpis = overview?.kpis;
  const defs = overview?.kpiDefinitions;
  const flowSeries = overview?.flowSeries || [];
  const attentionProducts = overview?.attentionProducts || [];
  const recentMovements = overview?.recentMovements || [];

  return (
    <AppShell
      title="Tableau de bord opérationnel"
      subtitle="Indicateurs calculés en temps réel depuis les soldes et mouvements persistés en PostgreSQL."
      actions={
        <div className="flex items-center gap-2">
          <select
            aria-label="Période d'analyse"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="text-xs rounded-control border border-border bg-surface px-3 py-2 font-medium"
          >
            <option value={7}>7 derniers jours</option>
            <option value={30}>30 derniers jours</option>
            <option value={90}>90 derniers jours</option>
          </select>
          <Link
            href="/stock"
            className="px-3.5 py-2 rounded-control bg-primary text-primary-foreground text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Plus size={15} />
            <span>Nouveau mouvement</span>
          </Link>
        </div>
      }
    >
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="gstock-card p-5 h-28 animate-pulse bg-surface-muted" />
          ))}
        </div>
      ) : error ? (
        <div className="gstock-card p-6 text-danger text-sm">
          Impossible de charger les indicateurs du tableau de bord.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Cartes KPI avec formules et fuseau horaire documentés */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="gstock-card p-5 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-muted">
                <span>Produits actifs</span>
                <Package size={18} className="text-primary" />
              </div>
              <div className="text-3xl font-extrabold">
                {formatQuantity(kpis?.activeProductsCount ?? 0)}
              </div>
              <div className="text-[11px] text-muted flex items-center gap-1" title={defs?.activeProductsCount?.formula}>
                <Info size={12} />
                <span>{kpis?.activeWarehousesCount ?? 0} entrepôt(s) actif(s)</span>
              </div>
            </div>

            <div className="gstock-card p-5 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-muted">
                <span>Sous le seuil d&apos;alerte</span>
                <AlertTriangle size={18} className="text-amber-600" />
              </div>
              <div className="text-3xl font-extrabold text-amber-600">
                {formatQuantity(kpis?.lowStockCount ?? 0)}
              </div>
              <div className="text-[11px] text-muted flex items-center gap-1" title={defs?.lowStockCount?.formula}>
                <Info size={12} />
                <span>Formule : 0 &lt; disponible &le; seuil</span>
              </div>
            </div>

            <div className="gstock-card p-5 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-muted">
                <span>Références en rupture</span>
                <XOctagon size={18} className="text-danger" />
              </div>
              <div className="text-3xl font-extrabold text-danger">
                {formatQuantity(kpis?.outOfStockCount ?? 0)}
              </div>
              <div className="text-[11px] text-muted flex items-center gap-1" title={defs?.outOfStockCount?.formula}>
                <Info size={12} />
                <span>Formule : (on_hand - reserved) &le; 0</span>
              </div>
            </div>

            <div className="gstock-card p-5 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-muted">
                <span>Valeur estimée du stock</span>
                <Warehouse size={18} className="text-primary" />
              </div>
              <div className="text-2xl font-extrabold">
                {kpis?.estimatedStockValue !== null
                  ? formatCurrencyAmount(kpis?.estimatedStockValue, kpis?.currency)
                  : "Coûts non renseignés"}
              </div>
              <div className="text-[11px] text-muted flex items-center gap-1" title={defs?.estimatedStockValue?.formula}>
                <Info size={12} />
                <span>
                  Couverture coûts : {kpis?.costCoverageRatio ?? 0}% • Fuseau{" "}
                  {defs?.estimatedStockValue?.timezone}
                </span>
              </div>
            </div>
          </div>

          {/* Graphique de flux Entrées / Sorties & Récapitulatif période */}
          <div className="grid lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 gstock-card p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="font-bold text-base">
                    Flux quotidiens (7 derniers jours)
                  </h2>
                  <p className="text-xs text-muted">
                    Quantités cumulées par type d&apos;opération validée
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                    <ArrowDownLeft size={14} /> Entrées ({days}j) :{" "}
                    {formatQuantity(kpis?.periodReceiptsTotal ?? 0)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
                    <ArrowUpRight size={14} /> Sorties ({days}j) :{" "}
                    {formatQuantity(kpis?.periodIssuesTotal ?? 0)}
                  </span>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={flowSeries}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar
                      dataKey="receipts"
                      name="Réceptions / Entrées"
                      fill="var(--color-primary)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="issues"
                      name="Sorties"
                      fill="var(--color-warning)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="transfers"
                      name="Transferts"
                      fill="var(--color-info)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Produits nécessitant une attention immédiate */}
            <div className="lg:col-span-4 gstock-card p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-base">Attention requise</h2>
                  <Link href="/alerts" className="text-xs text-primary font-semibold underline">
                    Voir tout
                  </Link>
                </div>

                {attentionProducts.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted border border-dashed border-border rounded-control">
                    Aucune référence en rupture ou sous le seuil d&apos;alerte.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-60 overflow-y-auto">
                    {attentionProducts.map((item: any) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-control border border-border bg-surface-muted/50 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-xs truncate">{item.name}</div>
                          <div className="text-[11px] text-muted font-mono">
                            SKU: {item.sku} • Seuil: {item.reorderLevel} {item.unit}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-[11px] font-bold shrink-0 ${
                            item.status === "OUT_OF_STOCK"
                              ? "bg-red-500/15 text-danger"
                              : "bg-amber-500/15 text-amber-600"
                          }`}
                        >
                          {item.status === "OUT_OF_STOCK"
                            ? `Rupture (${item.available})`
                            : `Bas (${item.available} ${item.unit})`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Link
                href="/stock"
                className="w-full py-2 text-center rounded-control border border-border hover:bg-surface-muted text-xs font-semibold"
              >
                Enregistrer un réapprovisionnement →
              </Link>
            </div>
          </div>

          {/* Journal des mouvements récents */}
          <div className="gstock-card overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="font-bold text-base">Derniers mouvements validés</h2>
                <p className="text-xs text-muted">
                  Historique transactionnel immuable des opérations de stock
                </p>
              </div>
              <Link href="/stock" className="text-xs font-semibold text-primary underline">
                Journal complet →
              </Link>
            </div>

            {recentMovements.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted">
                Aucun mouvement enregistré pour le moment.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs gstock-table">
                  <thead className="bg-surface-muted text-muted uppercase text-[11px]">
                    <tr>
                      <th>Référence</th>
                      <th>Type</th>
                      <th>Statut</th>
                      <th>Lignes</th>
                      <th>Quantité totale</th>
                      <th>Opérateur</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentMovements.map((m: any) => (
                      <tr key={m.id} className="hover:bg-surface-muted/40">
                        <td className="font-mono font-semibold">{m.reference}</td>
                        <td className="uppercase font-medium">{m.movementType}</td>
                        <td>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              m.status === "REVERSED"
                                ? "bg-amber-500/15 text-amber-600"
                                : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            }`}
                          >
                            {m.status}
                          </span>
                        </td>
                        <td>{m.lineCount}</td>
                        <td className="font-semibold">{formatQuantity(m.totalQuantity)}</td>
                        <td>{m.creatorName}</td>
                        <td className="text-muted">
                          {new Date(m.occurredAt).toLocaleString("fr-FR")}
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
    </AppShell>
  );
}
