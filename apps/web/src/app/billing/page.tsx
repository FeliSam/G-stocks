"use client";

import React, { useState } from "react";
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Info,
  Sparkles,
  Users,
  Warehouse,
  Package,
  X,
} from "lucide-react";
import { AppShell } from "@/layouts/AppShell";
import {
  useGetSubscriptionQuery,
  useGetBillingPlansQuery,
  useCheckoutPlanMutation,
} from "@/store/api";

export default function BillingPage() {
  const { data: subRes, isLoading: isLoadingSub } = useGetSubscriptionQuery();
  const { data: plansRes, isLoading: isLoadingPlans } = useGetBillingPlansQuery();
  const [checkoutPlan, { isLoading: isCheckingOut }] = useCheckoutPlanMutation();

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const subscription = subRes?.data?.subscription;
  const usage = subRes?.data?.usage || {
    membersCount: 0,
    warehousesCount: 0,
    productsCount: 0,
  };
  const providerMeta = subRes?.data?.providerMeta || plansRes?.providerMeta;
  const plans: any[] = plansRes?.data || [];

  function getFeatureLimit(plan: any, key: string): number {
    const found = plan?.features?.find((f: any) => f.featureKey === key);
    return found?.limitValue ?? 0;
  }

  function isFeatureEnabled(plan: any, key: string): boolean {
    const found = plan?.features?.find((f: any) => f.featureKey === key);
    return Boolean(found?.enabled);
  }

  const activePlan = subscription?.plan;
  const maxMembers = getFeatureLimit(activePlan, "max_members") || 15;
  const maxWarehouses = getFeatureLimit(activePlan, "max_warehouses") || 5;
  const maxProducts = getFeatureLimit(activePlan, "max_products") || 5000;

  async function handleSelectPlan(planCode: string, planName: string) {
    setFeedback(null);
    try {
      await checkoutPlan({ planCode }).unwrap();
      setFeedback({
        type: "success",
        text: `Votre organisation est désormais souscrite au plan ${planName}. Les nouveaux quotas sont actifs immédiatement.`,
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        text:
          err?.data?.error?.message ||
          "Impossible de modifier le plan d'abonnement (permission billing.manage requise).",
      });
    }
  }

  return (
    <AppShell
      title="Abonnement SaaS, Facturation & Quotas"
      subtitle="Pilotez votre forfait G-Stock, suivez la consommation de vos quotas et débloquez les fonctionnalités multi-entrepôts."
    >
      {/* Bandeau explicite BillingProvider (Règle 5 du Prompt Maître) */}
      <div className="p-4 rounded-card border border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200 flex items-start gap-3">
        <Info size={18} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
        <div className="text-xs space-y-1">
          <div className="font-bold">
            Adaptateur de facturation actif :{" "}
            <code className="px-1.5 py-0.5 rounded bg-amber-500/20 font-mono">
              {providerMeta?.provider || "SimulatedDevBillingProvider"}
            </code>
          </div>
          <p>
            {providerMeta?.modeNotice ||
              "Mode de développement explicite : aucun prestataire bancaire externe n'est requis. Les changements de plan et les webhooks sont persistés de manière transactionnelle dans PostgreSQL."}
          </p>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-control border text-xs font-medium flex items-center justify-between ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
              : "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 size={16} />
            ) : (
              <AlertTriangle size={16} />
            )}
            <span>{feedback.text}</span>
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

      {/* État de l'abonnement & Barres de progression des quotas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-4 gstock-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold flex items-center gap-2">
              <CreditCard size={18} className="text-primary" />
              <span>Forfait Actuel</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
              {subscription?.status || "active"}
            </span>
          </div>

          {isLoadingSub ? (
            <div className="text-xs text-muted">Chargement de l&apos;abonnement...</div>
          ) : (
            <div className="space-y-3">
              <div>
                <div className="text-2xl font-bold">
                  {activePlan?.name || "Business Pro"}
                </div>
                <div className="text-sm text-muted font-medium">
                  {Number(activePlan?.price ?? 79).toLocaleString("fr-FR", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  € / mois HT
                </div>
              </div>
              <div className="text-xs text-muted space-y-1 pt-2 border-t border-border">
                <div>
                  Période en cours :{" "}
                  <strong className="text-foreground">
                    {subscription?.currentPeriodStart
                      ? new Date(subscription.currentPeriodStart).toLocaleDateString(
                          "fr-FR"
                        )
                      : "—"}{" "}
                    au{" "}
                    {subscription?.currentPeriodEnd
                      ? new Date(subscription.currentPeriodEnd).toLocaleDateString(
                          "fr-FR"
                        )
                      : "—"}
                  </strong>
                </div>
                <div>
                  Référence contrat :{" "}
                  <code className="font-mono text-[11px]">
                    {subscription?.providerSubscriptionId || "sub_local"}
                  </code>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Barres de progression des quotas d'usage actuels */}
        <section className="lg:col-span-8 gstock-card p-5 space-y-4">
          <h2 className="text-base font-bold">
            Consommation des Quotas de l&apos;Organisation
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                label: "Membres actifs",
                icon: Users,
                current: usage.membersCount,
                max: maxMembers,
              },
              {
                label: "Entrepôts configurés",
                icon: Warehouse,
                current: usage.warehousesCount,
                max: maxWarehouses,
              },
              {
                label: "Références produits",
                icon: Package,
                current: usage.productsCount,
                max: maxProducts,
              },
            ].map((q) => {
              const Icon = q.icon;
              const pct = Math.min(
                100,
                Math.round((q.current / Math.max(1, q.max)) * 100)
              );
              const isNearLimit = pct >= 85;
              return (
                <div
                  key={q.label}
                  className="p-4 rounded-control border border-border bg-background space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold flex items-center gap-1.5">
                      <Icon size={14} className="text-primary" />
                      <span>{q.label}</span>
                    </span>
                    <span className="text-xs font-mono font-bold">
                      {q.current} / {q.max}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-muted overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className={`h-full rounded-full transition-all ${
                        isNearLimit ? "bg-amber-500" : "bg-primary"
                      }`}
                    />
                  </div>
                  <div className="text-[11px] text-muted flex justify-between">
                    <span>Taux d&apos;utilisation</span>
                    <span className="font-semibold">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Grille comparative des plans SaaS */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Sparkles size={18} className="text-primary" />
            <span>Grille Comparative des Plans G-Stock SaaS</span>
          </h2>
          <p className="text-xs text-muted">
            Changez de forfait à tout moment. Les quotas et fonctionnalités sont mis à jour instantanément.
          </p>
        </div>

        {isLoadingPlans ? (
          <div className="gstock-card p-8 text-center text-xs text-muted">
            Chargement du catalogue des offres...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const isCurrent = activePlan?.code === plan.code;
              const pMembers = getFeatureLimit(plan, "max_members");
              const pWarehouses = getFeatureLimit(plan, "max_warehouses");
              const pProducts = getFeatureLimit(plan, "max_products");
              const hasBranding = isFeatureEnabled(plan, "custom_branding");
              const hasMultiWh = isFeatureEnabled(plan, "multi_warehouse");

              return (
                <div
                  key={plan.id}
                  className={`gstock-card p-6 flex flex-col justify-between space-y-5 ${
                    isCurrent ? "ring-2 ring-primary border-primary" : ""
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold">{plan.name}</h3>
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-bold">
                          PLAN ACTUEL
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold">
                        {Number(plan.price).toLocaleString("fr-FR")} €
                      </span>
                      <span className="text-xs text-muted">/ mois HT</span>
                    </div>

                    <ul className="space-y-2 pt-3 border-t border-border text-xs">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                        <span>
                          Jusqu&apos;à <strong>{pMembers} collaborateurs</strong>
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                        <span>
                          Jusqu&apos;à <strong>{pWarehouses} entrepôt(s)</strong>
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                        <span>
                          Jusqu&apos;à{" "}
                          <strong>
                            {pProducts.toLocaleString("fr-FR")} références produits
                          </strong>
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2
                          size={14}
                          className={
                            hasMultiWh ? "text-emerald-600 shrink-0" : "text-muted opacity-40 shrink-0"
                          }
                        />
                        <span className={hasMultiWh ? "" : "text-muted line-through"}>
                          Transferts inter-entrepôts avancés
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2
                          size={14}
                          className={
                            hasBranding
                              ? "text-emerald-600 shrink-0"
                              : "text-muted opacity-40 shrink-0"
                          }
                        />
                        <span className={hasBranding ? "" : "text-muted line-through"}>
                          Personnalisation complète de marque & logo
                        </span>
                      </li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    disabled={isCurrent || isCheckingOut}
                    onClick={() => handleSelectPlan(plan.code, plan.name)}
                    className={`w-full py-2.5 px-4 rounded-control text-xs font-semibold transition-colors ${
                      isCurrent
                        ? "bg-surface-muted text-muted cursor-default"
                        : "bg-primary text-primary-foreground hover:opacity-95"
                    }`}
                  >
                    {isCurrent
                      ? "Forfait actif"
                      : isCheckingOut
                      ? "Traitement en cours..."
                      : `Passer au plan ${plan.name}`}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}
