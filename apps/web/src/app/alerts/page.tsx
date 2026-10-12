"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  AlertOctagon,
  ArrowRight,
  BarChart3,
  Layers,
  Warehouse,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { AppShell } from "@/layouts/AppShell";
import {
  useGetStockAlertsQuery,
  useGetStockValueReportQuery,
} from "@/store/api";

export default function AlertsAndReportsPage() {
  const {
    data: alertsRes,
    isLoading: isLoadingAlerts,
    refetch: refetchAlerts,
  } = useGetStockAlertsQuery();
  const {
    data: valueReportRes,
    isLoading: isLoadingReport,
    refetch: refetchReport,
  } = useGetStockValueReportQuery();

  const [severityFilter, setSeverityFilter] = useState<
    "ALL" | "CRITICAL_OUT_OF_STOCK" | "WARNING_LOW_STOCK"
  >("ALL");

  const alerts: any[] = alertsRes?.data || [];
  const byWarehouse: any[] = valueReportRes?.data?.byWarehouse || [];
  const byCategory: any[] = valueReportRes?.data?.byCategory || [];

  const filteredAlerts = useMemo(() => {
    if (severityFilter === "ALL") return alerts;
    return alerts.filter((a) => a.severity === severityFilter);
  }, [alerts, severityFilter]);

  const criticalCount = useMemo(
    () => alerts.filter((a) => a.severity === "CRITICAL_OUT_OF_STOCK").length,
    [alerts]
  );
  const warningCount = useMemo(
    () => alerts.filter((a) => a.severity === "WARNING_LOW_STOCK").length,
    [alerts]
  );
  const totalValue = useMemo(
    () => byWarehouse.reduce((acc, w) => acc + Number(w.totalValue || 0), 0),
    [byWarehouse]
  );

  function handleRefreshAll() {
    refetchAlerts();
    refetchReport();
  }

  return (
    <AppShell
      title="Alertes de Stock & Valorisation"
      subtitle="Surveillance en temps réel des ruptures, seuils de réapprovisionnement et répartition de la valeur comptable."
      actions={
        <>
          <button
            type="button"
            onClick={handleRefreshAll}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-control border border-border bg-surface text-xs font-semibold hover:bg-surface-muted"
          >
            <RefreshCw size={14} />
            <span>Actualiser les calculs</span>
          </button>
          <Link
            href="/stock"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-control bg-primary text-primary-foreground text-xs font-semibold"
          >
            <span>Enregistrer un réapprovisionnement</span>
            <ArrowRight size={14} />
          </Link>
        </>
      }
    >
      {/* Synthèse KPI Alertes & Valorisation */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="gstock-card p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-muted">
              Ruptures Critiques (Dispo &le; 0)
            </span>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
              {criticalCount}
            </div>
            <p className="text-[11px] text-muted mt-0.5">
              Action immédiate requise
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center">
            <AlertOctagon size={20} />
          </div>
        </div>

        <div className="gstock-card p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-muted">
              Sous le Seuil d&apos;Alerte
            </span>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              {warningCount}
            </div>
            <p className="text-[11px] text-muted mt-0.5">
              Disponible &le; seuil de réapprovisionnement
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <AlertTriangle size={20} />
          </div>
        </div>

        <div className="gstock-card p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-muted">
              Valorisation Totale Consolidée
            </span>
            <div className="text-2xl font-bold mt-1">
              {totalValue.toLocaleString("fr-FR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              €
            </div>
            <p className="text-[11px] text-muted mt-0.5">
              Cumul multi-entrepôts (Quantité &times; Coût unitaire)
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center">
            <BarChart3 size={20} />
          </div>
        </div>
      </div>

      {/* Liste des Alertes de Rupture et Seuil Bas */}
      <section className="gstock-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold">
              Références en Rupture ou Sous le Seuil de Réapprovisionnement
            </h2>
            <p className="text-xs text-muted">
              Calcul du déficit : max(0, Seuil de réapprovisionnement - Stock disponible).
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {[
              { id: "ALL" as const, label: `Toutes (${alerts.length})` },
              {
                id: "CRITICAL_OUT_OF_STOCK" as const,
                label: `Ruptures (${criticalCount})`,
              },
              {
                id: "WARNING_LOW_STOCK" as const,
                label: `Seuils bas (${warningCount})`,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSeverityFilter(tab.id)}
                className={`px-3 py-1.5 rounded-control text-xs font-semibold transition-colors ${
                  severityFilter === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-background hover:bg-surface-muted"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {isLoadingAlerts ? (
          <div className="p-6 text-center text-xs text-muted">
            Analyse des seuils de stock en cours...
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="p-8 rounded-control border border-dashed border-border text-center space-y-2">
            <CheckCircle2 size={28} className="mx-auto text-emerald-600" />
            <div className="text-sm font-semibold">
              Aucune alerte de stock dans cette catégorie
            </div>
            <p className="text-xs text-muted">
              Tous vos articles actifs disposent d&apos;un stock disponible supérieur à leur seuil d&apos;alerte.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs gstock-table">
              <thead>
                <tr className="border-b border-border bg-surface-muted/60">
                  <th className=" font-semibold">Gravité</th>
                  <th className=" font-semibold">SKU / Produit</th>
                  <th className=" font-semibold">Catégorie</th>
                  <th className=" font-semibold text-right">Physique</th>
                  <th className=" font-semibold text-right">Réservé</th>
                  <th className=" font-semibold text-right">Disponible</th>
                  <th className=" font-semibold text-right">Seuil Alerte</th>
                  <th className=" font-semibold text-right">Déficit à commander</th>
                  <th className=" font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredAlerts.map((alert) => {
                  const isCritical = alert.severity === "CRITICAL_OUT_OF_STOCK";
                  return (
                    <tr key={alert.productId} className="hover:bg-surface-muted/40">
                      <td>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            isCritical
                              ? "bg-red-500/15 text-red-700 dark:text-red-300"
                              : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                          }`}
                        >
                          {isCritical ? "RUPTURE CRITIQUE" : "SEUIL BAS"}
                        </span>
                      </td>
                      <td>
                        <div className="font-bold">{alert.name}</div>
                        <div className="text-[11px] font-mono text-muted">
                          {alert.sku}
                        </div>
                      </td>
                      <td>{alert.categoryName}</td>
                      <td className="text-right font-mono">
                        {alert.onHand} {alert.unitCode}
                      </td>
                      <td className="text-right font-mono text-muted">
                        {alert.reserved} {alert.unitCode}
                      </td>
                      <td className="text-right font-mono font-bold">
                        {alert.available} {alert.unitCode}
                      </td>
                      <td className="text-right font-mono">
                        {alert.reorderLevel} {alert.unitCode}
                      </td>
                      <td className="text-right font-mono font-bold text-primary">
                        +{alert.deficit} {alert.unitCode}
                      </td>
                      <td className="text-right">
                        <Link
                          href="/stock"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-control bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground font-semibold text-[11px] transition-colors"
                        >
                          <span>Réapprovisionner</span>
                          <ArrowRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Rapports de Valorisation par Entrepôt et par Catégorie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Valorisation par Entrepôt */}
        <section className="gstock-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <Warehouse size={18} className="text-primary" />
                <span>Valorisation par Entrepôt</span>
              </h2>
              <p className="text-xs text-muted">
                Répartition de la valeur financière et des quantités par site de stockage.
              </p>
            </div>
          </div>

          {isLoadingReport ? (
            <div className="h-64 flex items-center justify-center text-xs text-muted">
              Chargement du rapport par entrepôt...
            </div>
          ) : byWarehouse.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted border border-dashed border-border rounded-control">
              Aucun solde valorisé disponible dans les entrepôts.
            </div>
          ) : (
            <>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byWarehouse}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="warehouseName" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val: any) => [
                        `${Number(val).toLocaleString("fr-FR", {
                          minimumFractionDigits: 2,
                        })} €`,
                        "Valeur du stock",
                      ]}
                    />
                    <Bar
                      dataKey="totalValue"
                      name="Valeur (€)"
                      fill="var(--color-primary)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="overflow-x-auto border-t border-border pt-3">
                <table className="w-full text-left text-xs gstock-table">
                  <thead>
                    <tr className="border-b border-border text-muted">
                      <th className="font-semibold">Entrepôt</th>
                      <th className="font-semibold text-right">Unités totales</th>
                      <th className="font-semibold text-right">Valeur estimée</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {byWarehouse.map((w) => (
                      <tr key={w.warehouseName}>
                        <td className="font-semibold">{w.warehouseName}</td>
                        <td className="text-right font-mono">{w.totalUnits}</td>
                        <td className="text-right font-mono font-bold">
                          {Number(w.totalValue).toLocaleString("fr-FR", {
                            minimumFractionDigits: 2,
                          })}{" "}
                          €
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        {/* Valorisation par Catégorie */}
        <section className="gstock-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <Layers size={18} className="text-primary" />
                <span>Valorisation par Catégorie de Produits</span>
              </h2>
              <p className="text-xs text-muted">
                Immobilisation financière par famille d&apos;articles.
              </p>
            </div>
          </div>

          {isLoadingReport ? (
            <div className="h-64 flex items-center justify-center text-xs text-muted">
              Chargement du rapport par catégorie...
            </div>
          ) : byCategory.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted border border-dashed border-border rounded-control">
              Aucune donnée de catégorie valorisée disponible.
            </div>
          ) : (
            <>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byCategory}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="categoryName" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val: any) => [
                        `${Number(val).toLocaleString("fr-FR", {
                          minimumFractionDigits: 2,
                        })} €`,
                        "Valeur catégorie",
                      ]}
                    />
                    <Bar
                      dataKey="totalValue"
                      name="Valeur (€)"
                      fill="var(--color-accent)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="overflow-x-auto border-t border-border pt-3">
                <table className="w-full text-left text-xs gstock-table">
                  <thead>
                    <tr className="border-b border-border text-muted">
                      <th className="font-semibold">Catégorie</th>
                      <th className="font-semibold text-right">Unités totales</th>
                      <th className="font-semibold text-right">Valeur estimée</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {byCategory.map((c) => (
                      <tr key={c.categoryName}>
                        <td className="font-semibold">{c.categoryName}</td>
                        <td className="text-right font-mono">{c.totalUnits}</td>
                        <td className="text-right font-mono font-bold">
                          {Number(c.totalValue).toLocaleString("fr-FR", {
                            minimumFractionDigits: 2,
                          })}{" "}
                          €
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}
