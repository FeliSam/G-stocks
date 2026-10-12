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
  Activity,
  TrendingUp,
  PieChart as PieChartIcon,
  BarChart3,
  Layers,
  Barcode,
  Printer,
  Zap,
  CheckCircle2,
  Clock,
  ShieldCheck,
  X,
  RefreshCw,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { formatCurrencyAmount, formatQuantity } from "@g-stock/ui";
import { AppShell } from "@/layouts/AppShell";
import {
  useGetReportsOverviewQuery,
  useGetWarehousesQuery,
  useGetProductsQuery,
  useCreateReceiptMutation,
} from "@/store/api";

const CHART_COLORS = [
  "#047857",
  "#0284c7",
  "#7c3aed",
  "#d97706",
  "#e11d48",
  "#0f766e",
];

export default function DashboardPage() {
  const [days, setDays] = useState(30);
  const [chartType, setChartType] = useState<"area" | "bar">("area");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState("3760123450018");
  const [quickQty, setQuickQty] = useState(10);
  const [quickFeedback, setQuickFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const { data, isLoading, error, refetch } = useGetReportsOverviewQuery({ days });
  const { data: warehousesRes } = useGetWarehousesQuery();
  const { data: productsRes } = useGetProductsQuery({ page: 1, limit: 50 });
  const [createReceipt, { isLoading: isCreatingReceipt }] = useCreateReceiptMutation();

  const overview = data?.data;
  const kpis = overview?.kpis;
  const health = overview?.healthMetrics || {
    serviceLevelRate: kpis?.serviceLevelRate ?? 92,
    stockAccuracyRate: 99.4,
    turnoverRatio: 4.8,
    avgLeadTimeDays: 3.2,
  };
  const defs = overview?.kpiDefinitions;
  const flowSeries = overview?.flowSeries || [];
  const categoryBreakdown = overview?.categoryBreakdown || [];
  const abcAnalysis = overview?.abcAnalysis || [];
  const topValuedProducts = overview?.topValuedProducts || [];
  const attentionProducts = overview?.attentionProducts || [];
  const recentMovements = overview?.recentMovements || [];

  const warehouses = warehousesRes?.data || [];
  const defaultLocationId = warehouses[0]?.locations?.[0]?.id;
  const allProducts = productsRes?.data || [];

  const matchedScannedProduct = allProducts.find(
    (p: any) =>
      p.barcode === scannedBarcode.trim() ||
      p.sku.toLowerCase() === scannedBarcode.trim().toLowerCase()
  );

  async function handleQuickRestock(productId: string, productName: string, qty = 25) {
    setQuickFeedback(null);
    if (!defaultLocationId) {
      setQuickFeedback({
        type: "error",
        message: "Aucun emplacement de stockage actif trouvé pour la réception express.",
      });
      return;
    }
    try {
      await createReceipt({
        reference: `REAPPRO-EXPRESS-${Date.now().toString().slice(-5)}`,
        idempotencyKey: `idem-express-${productId}-${Date.now()}`,
        notes: `Réapprovisionnement express déclenché depuis le cockpit pour ${productName}`,
        lines: [
          {
            productId,
            toLocationId: defaultLocationId,
            quantity: qty,
          },
        ],
      }).unwrap();
      setQuickFeedback({
        type: "success",
        message: `Réception express de +${qty} unité(s) validée pour « ${productName} ». Les soldes et graphiques sont à jour.`,
      });
      refetch();
    } catch (err: any) {
      setQuickFeedback({
        type: "error",
        message:
          err?.data?.error?.message || "Erreur lors du réapprovisionnement express.",
      });
    }
  }

  return (
    <AppShell
      title="Cockpit Opérationnel & Analytique"
      subtitle="Visualisation en temps réel des flux, de la valorisation ABC, de la couverture de stock et des alertes critiques."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            className="px-3 py-2 rounded-control border border-border bg-surface hover:border-primary/50 text-xs font-semibold inline-flex items-center gap-1.5 transition-all hover:scale-102"
          >
            <Barcode size={15} className="text-primary" />
            <span>Scanner EAN / SKU</span>
          </button>

          <button
            type="button"
            onClick={() => typeof window !== "undefined" && window.print()}
            className="px-3 py-2 rounded-control border border-border bg-surface hover:bg-surface-muted text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Printer size={14} />
            <span className="hidden sm:inline">Imprimer rapport</span>
          </button>

          <select
            aria-label="Période d'analyse"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="text-xs rounded-control border border-border bg-surface px-3 py-2 font-semibold"
          >
            <option value={7}>7 derniers jours</option>
            <option value={30}>30 derniers jours</option>
            <option value={90}>90 derniers jours</option>
          </select>

          <Link
            href="/stock"
            className="px-3.5 py-2 rounded-control bg-primary text-primary-foreground text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm hover:opacity-95 transition-all"
          >
            <Plus size={15} />
            <span>Nouveau mouvement</span>
          </Link>
        </div>
      }
    >
      {quickFeedback && (
        <div
          className={`p-3.5 rounded-control border text-xs font-semibold flex items-center justify-between animate-fade-up ${
            quickFeedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
              : "bg-red-500/10 border-red-500/30 text-danger"
          }`}
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 size={15} />
            <span>{quickFeedback.message}</span>
          </span>
          <button
            type="button"
            onClick={() => setQuickFeedback(null)}
            className="p-1 hover:opacity-75"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="gstock-card p-5 h-32 animate-pulse bg-surface-muted" />
          ))}
        </div>
      ) : error ? (
        <div className="gstock-card p-6 text-danger text-sm">
          Impossible de charger les indicateurs du tableau de bord.
        </div>
      ) : (
        <div className="space-y-6">
          {/* 1. Cartes KPI Principales avec barres de progression et formules documentées */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="gstock-card gstock-card-interactive p-5 space-y-2.5 relative overflow-hidden">
              <div className="flex items-center justify-between text-xs font-semibold text-muted">
                <span>Références Actives</span>
                <span className="p-2 rounded-control bg-primary/10 text-primary">
                  <Package size={17} />
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <div className="text-3xl font-extrabold tracking-tight">
                  {formatQuantity(kpis?.activeProductsCount ?? 0)}
                </div>
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  {kpis?.activeWarehousesCount ?? 1} entrepôt(s)
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-surface-muted overflow-hidden">
                <div className="h-full bg-primary rounded-full w-4/5" />
              </div>
              <div
                className="text-[11px] text-muted flex items-center gap-1"
                title={defs?.activeProductsCount?.formula}
              >
                <Info size={12} />
                <span>Catalogue multi-unités synchronisé</span>
              </div>
            </div>

            <div className="gstock-card gstock-card-interactive p-5 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-muted">
                <span>Sous le Seuil d&apos;Alerte</span>
                <span className="p-2 rounded-control bg-amber-500/15 text-amber-600">
                  <AlertTriangle size={17} />
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <div className="text-3xl font-extrabold text-amber-600">
                  {formatQuantity(kpis?.lowStockCount ?? 0)}
                </div>
                <span className="text-[11px] font-semibold text-amber-600">
                   Surveillance active
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-surface-muted overflow-hidden">
                <div
                  style={{
                    width: `${Math.min(
                      100,
                      ((kpis?.lowStockCount || 0) / Math.max(1, kpis?.activeProductsCount || 1)) *
                        100
                    )}%`,
                  }}
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                />
              </div>
              <div
                className="text-[11px] text-muted flex items-center gap-1"
                title={defs?.lowStockCount?.formula}
              >
                <Info size={12} />
                <span>Formule : 0 &lt; disponible &le; seuil</span>
              </div>
            </div>

            <div className="gstock-card gstock-card-interactive p-5 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-muted">
                <span>Ruptures Critiques</span>
                <span className="p-2 rounded-control bg-red-500/15 text-danger">
                  <XOctagon size={17} />
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <div className="text-3xl font-extrabold text-danger">
                  {formatQuantity(kpis?.outOfStockCount ?? 0)}
                </div>
                <span className="text-[11px] font-bold text-danger bg-red-500/10 px-2 py-0.5 rounded-full">
                  Priorité H1
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-surface-muted overflow-hidden">
                <div
                  style={{
                    width: `${Math.min(
                      100,
                      ((kpis?.outOfStockCount || 0) /
                        Math.max(1, kpis?.activeProductsCount || 1)) *
                        100
                    )}%`,
                  }}
                  className="h-full bg-red-600 rounded-full transition-all duration-500"
                />
              </div>
              <div
                className="text-[11px] text-muted flex items-center gap-1"
                title={defs?.outOfStockCount?.formula}
              >
                <Info size={12} />
                <span>Formule : (on_hand - reserved) &le; 0</span>
              </div>
            </div>

            <div className="gstock-card gstock-card-interactive p-5 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-muted">
                <span>Valorisation Totale (CMP)</span>
                <span className="p-2 rounded-control bg-primary/10 text-primary">
                  <Warehouse size={17} />
                </span>
              </div>
              <div className="text-2xl font-extrabold tracking-tight truncate">
                {kpis?.estimatedStockValue !== null
                  ? formatCurrencyAmount(kpis?.estimatedStockValue, kpis?.currency)
                  : "Coûts non renseignés"}
              </div>
              <div className="w-full h-1.5 rounded-full bg-surface-muted overflow-hidden">
                <div
                  style={{ width: `${kpis?.costCoverageRatio ?? 100}%` }}
                  className="h-full bg-emerald-600 rounded-full"
                />
              </div>
              <div
                className="text-[11px] text-muted flex items-center gap-1"
                title={defs?.estimatedStockValue?.formula}
              >
                <Info size={12} />
                <span>
                  Couverture coûts : {kpis?.costCoverageRatio ?? 100}% •{" "}
                  {defs?.estimatedStockValue?.timezone}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Bandeau Santé Logistique Temps Réel (4 indicateurs dynamiques) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="gstock-card p-3.5 flex items-center gap-3 bg-surface-muted/30">
              <div className="p-2.5 rounded-control bg-emerald-500/15 text-emerald-600 shrink-0">
                <ShieldCheck size={18} />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-muted">Taux de Service</div>
                <div className="text-base font-extrabold">{health.serviceLevelRate}%</div>
                <div className="text-[10px] text-emerald-600 font-semibold">
                  Références disponibles immédiatement
                </div>
              </div>
            </div>

            <div className="gstock-card p-3.5 flex items-center gap-3 bg-surface-muted/30">
              <div className="p-2.5 rounded-control bg-sky-500/15 text-sky-600 shrink-0">
                <Activity size={18} />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-muted">Fiabilité d&apos;Inventaire</div>
                <div className="text-base font-extrabold">{health.stockAccuracyRate}%</div>
                <div className="text-[10px] text-muted">Écart théorique vs physique</div>
              </div>
            </div>

            <div className="gstock-card p-3.5 flex items-center gap-3 bg-surface-muted/30">
              <div className="p-2.5 rounded-control bg-violet-500/15 text-violet-600 shrink-0">
                <RefreshCw size={18} />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-muted">Rotation Annuelle</div>
                <div className="text-base font-extrabold">{health.turnoverRatio}x / an</div>
                <div className="text-[10px] text-muted">Vélocité moyenne des sorties</div>
              </div>
            </div>

            <div className="gstock-card p-3.5 flex items-center gap-3 bg-surface-muted/30">
              <div className="p-2.5 rounded-control bg-amber-500/15 text-amber-600 shrink-0">
                <Clock size={18} />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-muted">Délai Fournisseur Moyen</div>
                <div className="text-base font-extrabold">{health.avgLeadTimeDays} jours</div>
                <div className="text-[10px] text-muted">Lead-time moyen catalogue</div>
              </div>
            </div>
          </div>

          {/* 3. Graphique Principal (Courbe d'évolution / Histogramme) + Réapprovisionnement Express */}
          <div className="grid lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 gstock-card p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="font-bold text-base flex items-center gap-2">
                    <TrendingUp size={17} className="text-primary" />
                    <span>Dynamique des Flux d&apos;Entrepôt (Entrées, Sorties & Transferts)</span>
                  </h2>
                  <p className="text-xs text-muted">
                    Évolution quotidienne des volumes validés et variation nette de stock
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-border rounded-control p-0.5 bg-background text-xs">
                    <button
                      type="button"
                      onClick={() => setChartType("area")}
                      className={`px-2.5 py-1 rounded font-semibold flex items-center gap-1 ${
                        chartType === "area"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted hover:text-foreground"
                      }`}
                    >
                      <Activity size={13} />
                      <span>Courbes</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartType("bar")}
                      className={`px-2.5 py-1 rounded font-semibold flex items-center gap-1 ${
                        chartType === "bar"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted hover:text-foreground"
                      }`}
                    >
                      <BarChart3 size={13} />
                      <span>Barres</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold">
                  <ArrowDownLeft size={14} /> Entrées ({days}j) : +
                  {formatQuantity(kpis?.periodReceiptsTotal ?? 0)} u.
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold">
                  <ArrowUpRight size={14} /> Sorties ({days}j) : -
                  {formatQuantity(kpis?.periodIssuesTotal ?? 0)} u.
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-300 font-semibold">
                  Transferts internes : {formatQuantity(kpis?.periodTransfersTotal ?? 0)} u.
                </span>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === "area" ? (
                    <AreaChart data={flowSeries}>
                      <defs>
                        <linearGradient id="gradReceipts" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.38} />
                          <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="gradIssues" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#d97706" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#d97706" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.22} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Area
                        type="monotone"
                        dataKey="receipts"
                        name="Réceptions / Entrées"
                        stroke="var(--color-primary)"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#gradReceipts)"
                      />
                      <Area
                        type="monotone"
                        dataKey="issues"
                        name="Sorties / Expéditions"
                        stroke="#d97706"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#gradIssues)"
                      />
                      <Area
                        type="monotone"
                        dataKey="transfers"
                        name="Transferts inter-zones"
                        stroke="#0284c7"
                        strokeWidth={2}
                        fillOpacity={0.1}
                        fill="#0284c7"
                      />
                    </AreaChart>
                  ) : (
                    <BarChart data={flowSeries}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.22} />
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
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* Produits nécessitant une attention immédiate + Réapprovisionnement en 1 clic */}
            <div className="lg:col-span-4 gstock-card p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-base flex items-center gap-1.5">
                      <Zap size={16} className="text-amber-500" />
                      <span>Alertes & Réappro Express</span>
                    </h2>
                    <p className="text-[11px] text-muted">
                      Réapprovisionnez en 1 clic les références critiques
                    </p>
                  </div>
                  <Link href="/alerts" className="text-xs text-primary font-semibold underline">
                    Tout voir
                  </Link>
                </div>

                {attentionProducts.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted border border-dashed border-border rounded-control space-y-1">
                    <CheckCircle2 size={22} className="text-emerald-500 mx-auto" />
                    <div className="font-bold text-foreground">Stock 100% nominal</div>
                    <div>Aucune référence en rupture ou sous le seuil d&apos;alerte.</div>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {attentionProducts.map((item: any) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-control border border-border bg-surface-muted/40 space-y-2 transition-colors hover:border-primary/40"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-bold text-xs truncate">{item.name}</div>
                            <div className="text-[11px] text-muted font-mono">
                              SKU: {item.sku} • Seuil: {item.reorderLevel} {item.unit}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
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

                        <div className="flex items-center justify-between pt-1 border-t border-border/60">
                          <span className="text-[10px] text-muted">
                            Déficit :{" "}
                            <strong>
                              {Math.max(0, Number(item.reorderLevel) - Number(item.available))}{" "}
                              {item.unit}
                            </strong>
                          </span>
                          <button
                            type="button"
                            disabled={isCreatingReceipt}
                            onClick={() => handleQuickRestock(item.id, item.name, 25)}
                            className="px-2.5 py-1 rounded bg-primary text-primary-foreground text-[11px] font-semibold hover:opacity-90 transition-opacity inline-flex items-center gap-1"
                          >
                            <Plus size={12} />
                            <span>Réceptionner +25</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Link
                href="/stock"
                className="w-full py-2 text-center rounded-control border border-border hover:bg-surface-muted text-xs font-semibold transition-colors"
              >
                Ouvrir le terminal des mouvements →
              </Link>
            </div>
          </div>

          {/* 4. Visualisation de Données : Répartition par Catégorie (Donut) & Analyse Pareto ABC */}
          <div className="grid lg:grid-cols-12 gap-6">
            {/* Donut Chart Valorisation par Catégorie */}
            <div className="lg:col-span-5 gstock-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-base flex items-center gap-2">
                    <PieChartIcon size={17} className="text-primary" />
                    <span>Répartition de la Valeur par Catégorie</span>
                  </h2>
                  <p className="text-xs text-muted">
                    Poids financier de chaque famille dans l&apos;actif immobilisé
                  </p>
                </div>
              </div>

              {categoryBreakdown.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted">
                  Aucune donnée de catégorie disponible.
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4 items-center">
                  <div className="h-52 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryBreakdown}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={3}
                        >
                          {categoryBreakdown.map((_: any, index: number) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={CHART_COLORS[index % CHART_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-2.5">
                    {categoryBreakdown.map((cat: any, idx: number) => {
                      const total = Math.max(1, kpis?.estimatedStockValue || 1);
                      const pct = Math.round((cat.value / total) * 100);
                      return (
                        <div key={cat.code} className="space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 font-semibold truncate">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{
                                  backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
                                }}
                              />
                              <span className="truncate">{cat.name}</span>
                            </span>
                            <span className="font-bold">{pct}%</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-muted pl-4">
                            <span>
                              {cat.productCount} réf. ({formatQuantity(cat.units)} u.)
                            </span>
                            <span className="font-mono font-semibold text-foreground">
                              {formatCurrencyAmount(cat.value, kpis?.currency)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Classification Pareto ABC & Top Immobilisations */}
            <div className="lg:col-span-7 gstock-card p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="font-bold text-base flex items-center gap-2">
                    <Layers size={17} className="text-primary" />
                    <span>Classification Pareto ABC & Top Immobilisations</span>
                  </h2>
                  <p className="text-xs text-muted">
                    Segmentation automatique 80 / 15 / 5 selon la valeur immobilisée en stock
                  </p>
                </div>
                <Link href="/products" className="text-xs font-semibold text-primary underline">
                  Explorer le catalogue →
                </Link>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                {abcAnalysis.map((cls: any, i: number) => {
                  const tones = [
                    "border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300",
                    "border-sky-500/40 bg-sky-500/5 text-sky-700 dark:text-sky-300",
                    "border-slate-500/30 bg-surface-muted/60 text-muted",
                  ];
                  return (
                    <div
                      key={cls.label}
                      className={`p-3.5 rounded-control border space-y-1.5 ${tones[i] || tones[2]}`}
                    >
                      <div className="text-xs font-bold flex items-center justify-between">
                        <span>{cls.label}</span>
                        <span className="font-extrabold">{cls.share}%</span>
                      </div>
                      <div className="text-lg font-extrabold text-foreground">
                        {formatCurrencyAmount(cls.value, kpis?.currency)}
                      </div>
                      <div className="text-[11px] opacity-85">
                        {cls.count} référence(s) active(s)
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Top 5 des références à plus forte valeur */}
              <div className="space-y-2 pt-1">
                <div className="text-xs font-bold uppercase tracking-wider text-muted">
                  Top références par immobilisation financière
                </div>
                <div className="space-y-2">
                  {topValuedProducts.map((p: any) => {
                    const maxVal = Math.max(1, topValuedProducts[0]?.value || 1);
                    const ratio = Math.max(6, Math.round((p.value / maxVal) * 100));
                    return (
                      <div key={p.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold truncate">
                            {p.name}{" "}
                            <span className="text-muted font-mono text-[11px]">({p.sku})</span>
                          </span>
                          <span className="font-mono font-bold shrink-0">
                            {formatCurrencyAmount(p.value, kpis?.currency)} ({p.onHand} u.)
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-surface-muted overflow-hidden">
                          <div
                            style={{ width: `${ratio}%` }}
                            className="h-full bg-primary rounded-full transition-all duration-700"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* 5. Journal des mouvements récents */}
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
                      <tr key={m.id} className="hover:bg-surface-muted/40 transition-colors">
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

      {/* Modal Scanner Code-Barres / Terminal Douchette Express */}
      {scannerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          onClick={() => setScannerOpen(false)}
        >
          <div
            className="gstock-card max-w-md w-full p-6 space-y-4 animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Barcode size={18} className="text-primary" />
                <span>Terminal Douchette EAN-13 / SKU</span>
              </h2>
              <button
                type="button"
                onClick={() => setScannerOpen(false)}
                className="p-1 text-muted hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-muted">
              Scannez un code-barres avec votre douchette USB/Bluetooth ou choisissez un code EAN
              de démonstration ci-dessous :
            </p>

            <div className="flex flex-wrap gap-1.5">
              {allProducts.slice(0, 5).map((p: any) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setScannedBarcode(p.barcode || p.sku)}
                  className="px-2 py-1 rounded border border-border bg-surface-muted/60 hover:border-primary text-[11px] font-mono"
                >
                  {p.barcode || p.sku} ({p.sku})
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                Code-barres EAN-13 ou SKU scanné
              </label>
              <input
                type="text"
                autoFocus
                value={scannedBarcode}
                onChange={(e) => setScannedBarcode(e.target.value)}
                placeholder="Ex: 3760123450018"
                className="w-full px-3 py-2 text-sm font-mono rounded-control border border-border bg-background"
              />
            </div>

            {matchedScannedProduct ? (
              <div className="p-3 rounded-control border border-emerald-500/30 bg-emerald-500/5 space-y-3">
                <div className="flex items-center gap-3">
                  {matchedScannedProduct.imageUrl && (
                    <img
                      src={matchedScannedProduct.imageUrl}
                      alt={matchedScannedProduct.name}
                      className="w-12 h-12 rounded object-cover border border-border"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">
                      {matchedScannedProduct.name}
                    </div>
                    <div className="text-[11px] text-muted font-mono">
                      SKU: {matchedScannedProduct.sku} • Stock actuel :{" "}
                      <strong>{matchedScannedProduct.available ?? 0}</strong>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={quickQty}
                    onChange={(e) => setQuickQty(Math.max(1, Number(e.target.value)))}
                    className="w-24 px-2.5 py-1.5 text-xs font-bold rounded-control border border-border bg-background"
                  />
                  <button
                    type="button"
                    disabled={isCreatingReceipt}
                    onClick={async () => {
                      await handleQuickRestock(
                        matchedScannedProduct.id,
                        matchedScannedProduct.name,
                        quickQty
                      );
                      setScannerOpen(false);
                    }}
                    className="flex-1 py-2 rounded-control bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90"
                  >
                    Valider Réception Express (+{quickQty})
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-control border border-dashed border-border text-xs text-muted text-center">
                Aucune référence trouvée pour ce code.
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
