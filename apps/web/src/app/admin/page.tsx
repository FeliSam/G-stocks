"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  Building2,
  Users,
  ArrowLeftRight,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  X,
  Save,
  Activity,
} from "lucide-react";
import { AppShell } from "@/layouts/AppShell";
import {
  useGetAdminOverviewQuery,
  useAdminUpdateOrgStatusMutation,
  useAdminUpdatePlanMutation,
} from "@/store/api";

export default function PlatformAdminPage() {
  const { data: adminRes, isLoading, error } = useGetAdminOverviewQuery();
  const [adminUpdateOrgStatus, { isLoading: isUpdatingOrg }] =
    useAdminUpdateOrgStatusMutation();
  const [adminUpdatePlan, { isLoading: isUpdatingPlan }] =
    useAdminUpdatePlanMutation();

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [planEdits, setPlanEdits] = useState<
    Record<
      string,
      {
        price: number;
        maxMembers: number;
        maxWarehouses: number;
        maxProducts: number;
      }
    >
  >({});

  const overview = adminRes?.data;
  const metrics = overview?.metrics;
  const organizations: any[] = overview?.organizations || [];
  const plans: any[] = overview?.plans || [];
  const recentAuditLogs: any[] = overview?.recentAuditLogs || [];

  function getPlanLimit(plan: any, key: string): number {
    return plan.features?.find((f: any) => f.featureKey === key)?.limitValue ?? 1;
  }

  async function handleOrgStatusChange(
    orgId: string,
    payload: {
      status?: "ACTIVE" | "SUSPENDED";
      subscriptionStatus?: string;
    }
  ) {
    setFeedback(null);
    try {
      await adminUpdateOrgStatus({ id: orgId, ...payload }).unwrap();
      setFeedback({
        type: "success",
        text: "Statut de l'organisation cliente ou de son abonnement mis à jour avec succès.",
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        text:
          err?.data?.error?.message ||
          "Erreur lors de la mise à jour du tenant.",
      });
    }
  }

  async function handleSavePlan(plan: any) {
    setFeedback(null);
    const edit = planEdits[plan.id] || {
      price: Number(plan.price),
      maxMembers: getPlanLimit(plan, "max_members"),
      maxWarehouses: getPlanLimit(plan, "max_warehouses"),
      maxProducts: getPlanLimit(plan, "max_products"),
    };

    try {
      await adminUpdatePlan({
        id: plan.id,
        price: Number(edit.price),
        maxMembers: Number(edit.maxMembers),
        maxWarehouses: Number(edit.maxWarehouses),
        maxProducts: Number(edit.maxProducts),
      }).unwrap();
      setFeedback({
        type: "success",
        text: `Tarification et quotas du plan ${plan.name} mis à jour.`,
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        text:
          err?.data?.error?.message ||
          "Impossible de mettre à jour ce plan SaaS.",
      });
    }
  }

  return (
    <AppShell
      title="Administration Globale de la Plateforme SaaS"
      subtitle="Espace opérateur réservé aux administrateurs plateforme (isPlatformAdmin) : supervision multi-tenant, plans et audit global."
    >
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

      {error ? (
        <div className="gstock-card p-8 text-center space-y-2 border-red-500/40">
          <ShieldAlert size={28} className="mx-auto text-red-600" />
          <div className="text-base font-bold">Accès Restreint</div>
          <p className="text-xs text-muted">
            Cet espace d&apos;administration globale est strictement réservé aux comptes disposant du privilège `isPlatformAdmin`.
          </p>
        </div>
      ) : isLoading ? (
        <div className="gstock-card p-8 text-center text-xs text-muted">
          Chargement de la télémétrie globale de la plateforme G-Stock...
        </div>
      ) : (
        <>
          {/* KPI Globaux de la Plateforme */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="gstock-card p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-muted">Organisations Clientes</span>
                <div className="text-2xl font-bold mt-1">
                  {metrics?.totalOrganizations ?? 0}
                </div>
                <span className="text-[11px] text-emerald-600 font-semibold">
                  {metrics?.activeOrganizations ?? 0} actives
                </span>
              </div>
              <Building2 size={22} className="text-primary" />
            </div>

            <div className="gstock-card p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-muted">Utilisateurs Inscrits</span>
                <div className="text-2xl font-bold mt-1">
                  {metrics?.totalUsers ?? 0}
                </div>
                <span className="text-[11px] text-muted">Comptes globaux</span>
              </div>
              <Users size={22} className="text-primary" />
            </div>

            <div className="gstock-card p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-muted">Mouvements de Stock</span>
                <div className="text-2xl font-bold mt-1">
                  {metrics?.totalMovements ?? 0}
                </div>
                <span className="text-[11px] text-muted">Transactions validées</span>
              </div>
              <ArrowLeftRight size={22} className="text-primary" />
            </div>

            <div className="gstock-card p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-muted">Plans SaaS Configurés</span>
                <div className="text-2xl font-bold mt-1">{plans.length}</div>
                <span className="text-[11px] text-muted">Catalogue actif</span>
              </div>
              <Sliders size={22} className="text-primary" />
            </div>
          </div>

          {/* Liste des Organisations Clientes & Contrôle des Abonnements */}
          <section className="gstock-card p-5 space-y-4">
            <div>
              <h2 className="text-base font-bold">
                Gouvernance des Organisations Clientes (Multi-Tenant)
              </h2>
              <p className="text-xs text-muted">
                Suspendez/réactivez un tenant ou simulez un état d&apos;abonnement (`trialing`, `active`, `past_due`, `suspended`, `canceled`).
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs gstock-table">
                <thead>
                  <tr className="border-b border-border bg-surface-muted/60">
                    <th className="font-semibold">Organisation</th>
                    <th className="font-semibold">Profil / Devise</th>
                    <th className="font-semibold">Volumétrie</th>
                    <th className="font-semibold">Statut Tenant</th>
                    <th className="font-semibold">Statut Abonnement</th>
                    <th className="font-semibold text-right">Actions Opérateur</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {organizations.map((org) => {
                    const isSuspended = org.status === "SUSPENDED";
                    const subStatus = org.subscription?.status || "active";
                    return (
                      <tr key={org.id} className="hover:bg-surface-muted/30">
                        <td>
                          <div className="font-bold flex items-center gap-1.5">
                            <span>{org.name}</span>
                            {org.isDemo && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px]">
                                DÉMO
                              </span>
                            )}
                          </div>
                          <code className="text-[10px] text-muted">{org.slug}</code>
                        </td>
                        <td>
                          <div className="font-medium">
                            {org.settings?.industryProfile || "general"}
                          </div>
                          <div className="text-[10px] text-muted">
                            {org.settings?.defaultCurrency || "EUR"} •{" "}
                            {org.settings?.costingMethod || "WAC"}
                          </div>
                        </td>
                        <td className="font-mono text-[11px]">
                          {org._count?.memberships ?? 0} mbr •{" "}
                          {org._count?.warehouses ?? 0} ent •{" "}
                          {org._count?.products ?? 0} prod
                        </td>
                        <td>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isSuspended
                                ? "bg-red-500/15 text-red-700 dark:text-red-300"
                                : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            }`}
                          >
                            {org.status}
                          </span>
                        </td>
                        <td>
                          <select
                            aria-label={`Statut d'abonnement pour ${org.name}`}
                            disabled={isUpdatingOrg}
                            value={subStatus}
                            onChange={(e) =>
                              handleOrgStatusChange(org.id, {
                                subscriptionStatus: e.target.value,
                              })
                            }
                            className="px-2 py-1 rounded-control border border-border bg-background text-xs font-medium"
                          >
                            <option value="trialing">trialing (Essai)</option>
                            <option value="active">active (Actif)</option>
                            <option value="past_due">past_due (Impayé)</option>
                            <option value="suspended">
                              suspended (Suspendu - Lecture seule)
                            </option>
                            <option value="canceled">
                              canceled (Expiré - Lecture seule)
                            </option>
                          </select>
                        </td>
                        <td className="text-right">
                          <button
                            type="button"
                            disabled={isUpdatingOrg}
                            onClick={() =>
                              handleOrgStatusChange(org.id, {
                                status: isSuspended ? "ACTIVE" : "SUSPENDED",
                              })
                            }
                            className={`px-2.5 py-1 rounded-control text-[11px] font-semibold border ${
                              isSuspended
                                ? "border-emerald-600 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
                                : "border-red-600 text-red-700 dark:text-red-300 hover:bg-red-500/10"
                            }`}
                          >
                            {isSuspended ? "Réactiver Tenant" : "Suspendre Tenant"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Éditeur des Tarifs et Quotas des Plans SaaS */}
          <section className="gstock-card p-5 space-y-4">
            <div>
              <h2 className="text-base font-bold">
                Éditeur des Plans, Tarifs & Quotas SaaS
              </h2>
              <p className="text-xs text-muted">
                Ajustez dynamiquement les limites commerciales des forfaits Starter, Business Pro et Enterprise.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map((plan) => {
                const currentEdit = planEdits[plan.id] || {
                  price: Number(plan.price),
                  maxMembers: getPlanLimit(plan, "max_members"),
                  maxWarehouses: getPlanLimit(plan, "max_warehouses"),
                  maxProducts: getPlanLimit(plan, "max_products"),
                };

                return (
                  <div
                    key={plan.id}
                    className="p-4 rounded-card border border-border bg-background space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">{plan.name}</span>
                      <span className="text-[11px] text-muted">
                        {plan._count?.subscriptions ?? 0} abonné(s)
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 text-xs">
                      <div>
                        <label className="block text-[11px] text-muted mb-1">
                          Prix mensuel (€)
                        </label>
                        <input
                          type="number"
                          min={0}
                          step="1"
                          value={currentEdit.price}
                          onChange={(e) =>
                            setPlanEdits({
                              ...planEdits,
                              [plan.id]: {
                                ...currentEdit,
                                price: Number(e.target.value),
                              },
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-control border border-border bg-surface font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-muted mb-1">
                          Max Membres
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={currentEdit.maxMembers}
                          onChange={(e) =>
                            setPlanEdits({
                              ...planEdits,
                              [plan.id]: {
                                ...currentEdit,
                                maxMembers: Number(e.target.value),
                              },
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-control border border-border bg-surface font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-muted mb-1">
                          Max Entrepôts
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={currentEdit.maxWarehouses}
                          onChange={(e) =>
                            setPlanEdits({
                              ...planEdits,
                              [plan.id]: {
                                ...currentEdit,
                                maxWarehouses: Number(e.target.value),
                              },
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-control border border-border bg-surface font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-muted mb-1">
                          Max Produits
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={currentEdit.maxProducts}
                          onChange={(e) =>
                            setPlanEdits({
                              ...planEdits,
                              [plan.id]: {
                                ...currentEdit,
                                maxProducts: Number(e.target.value),
                              },
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-control border border-border bg-surface font-mono"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isUpdatingPlan}
                      onClick={() => handleSavePlan(plan)}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-control bg-primary text-primary-foreground text-xs font-semibold"
                    >
                      <Save size={13} />
                      <span>Mettre à jour {plan.name}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Journal d'Audit Global Plateforme */}
          <section className="gstock-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  <Activity size={18} className="text-primary" />
                  <span>Journal d&apos;Audit Global Multi-Tenant</span>
                </h2>
                <p className="text-xs text-muted">
                  Dernières opérations critiques enregistrées à travers l&apos;ensemble de la plateforme.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs gstock-table">
                <thead>
                  <tr className="border-b border-border bg-surface-muted/60">
                    <th className="font-semibold">Date</th>
                    <th className="font-semibold">Organisation</th>
                    <th className="font-semibold">Acteur</th>
                    <th className="font-semibold">Action</th>
                    <th className="font-semibold">Request ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface-muted/30">
                      <td className="font-mono text-[11px] whitespace-nowrap">
                        {new Date(log.occurredAt).toLocaleString("fr-FR")}
                      </td>
                      <td className="font-semibold">
                        {log.organization?.name || "Plateforme Globale"}
                      </td>
                      <td>{log.actor?.email || "Système"}</td>
                      <td>
                        <code className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-semibold">
                          {log.action}
                        </code>
                      </td>
                      <td className="font-mono text-[10px] text-muted">
                        {log.requestId || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}
