"use client";

import React, { useEffect, useState } from "react";
import {
  Settings,
  Blocks,
  FileSearch,
  Save,
  CheckCircle2,
  AlertTriangle,
  X,
  Shield,
} from "lucide-react";
import { INDUSTRY_PROFILES } from "@g-stock/config";
import type { CostingMethod, IndustryProfile, NegativeStockPolicy } from "@g-stock/types";
import { AppShell } from "@/layouts/AppShell";
import {
  useGetCurrentOrganizationQuery,
  useUpdateOrganizationSettingsMutation,
  useGetOrganizationModulesQuery,
  useUpdateOrganizationModulesMutation,
  useGetAuditLogsQuery,
} from "@/store/api";

export default function SettingsAndAuditPage() {
  const [activeTab, setActiveTab] = useState<"org" | "modules" | "audit">("org");

  const { data: orgRes, isLoading: isLoadingOrg } = useGetCurrentOrganizationQuery();
  const [updateSettings, { isLoading: isSavingSettings }] =
    useUpdateOrganizationSettingsMutation();

  const { data: modulesRes, isLoading: isLoadingModules } =
    useGetOrganizationModulesQuery();
  const [updateModules, { isLoading: isSavingModules }] =
    useUpdateOrganizationModulesMutation();

  const { data: auditRes, isLoading: isLoadingAudit } = useGetAuditLogsQuery();

  const [name, setName] = useState("");
  const [industryProfile, setIndustryProfile] = useState<IndustryProfile>("general");
  const [countryCode, setCountryCode] = useState("FR");
  const [defaultCurrency, setDefaultCurrency] = useState("EUR");
  const [timezone, setTimezone] = useState("Europe/Paris");
  const [negativeStockPolicy, setNegativeStockPolicy] =
    useState<NegativeStockPolicy>("FORBID");
  const [costingMethod, setCostingMethod] = useState<CostingMethod>("WAC");

  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    const org = orgRes?.data;
    if (!org) return;
    setName(org.name || "");
    if (org.settings) {
      setIndustryProfile(
        (org.settings.industryProfile as IndustryProfile) || "general"
      );
      setCountryCode(org.settings.countryCode || "FR");
      setDefaultCurrency(org.settings.defaultCurrency || "EUR");
      setTimezone(org.settings.timezone || "Europe/Paris");
      setNegativeStockPolicy(
        (org.settings.negativeStockPolicy as NegativeStockPolicy) || "FORBID"
      );
      setCostingMethod((org.settings.costingMethod as CostingMethod) || "WAC");
    }
  }, [orgRes]);

  useEffect(() => {
    const mods: any[] = modulesRes?.data || [];
    if (mods.length > 0) {
      setSelectedModules(mods.filter((m) => m.enabled).map((m) => m.key));
    }
  }, [modulesRes]);

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    try {
      await updateSettings({
        name: name.trim(),
        industryProfile,
        countryCode: countryCode.trim().toUpperCase(),
        defaultCurrency: defaultCurrency.trim().toUpperCase(),
        timezone,
        negativeStockPolicy,
        costingMethod,
      }).unwrap();
      setFeedback({
        type: "success",
        text: "Paramètres de l'organisation et règles comptables mis à jour avec succès.",
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        text:
          err?.data?.error?.message ||
          "Erreur lors de la sauvegarde des paramètres (permission settings.manage requise).",
      });
    }
  }

  function toggleModuleKey(key: string, mandatory?: boolean) {
    if (mandatory) return;
    setSelectedModules((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  async function handleSaveModules() {
    setFeedback(null);
    try {
      await updateModules({ activeModules: selectedModules }).unwrap();
      setFeedback({
        type: "success",
        text: "Modules métier activables enregistrés et synchronisés avec votre tenant.",
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        text:
          err?.data?.error?.message ||
          "Impossible de mettre à jour les modules métier.",
      });
    }
  }

  const modulesList: any[] = modulesRes?.data || [];
  const auditLogs: any[] = auditRes?.data || [];

  return (
    <AppShell
      title="Paramètres de l'Organisation, Modules & Audit"
      subtitle="Configurez les règles de gestion de stock, activez vos modules sectoriels et inspectez le journal d'audit immuable."
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

      {/* Navigation par onglets */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        {[
          {
            id: "org" as const,
            label: "1. Paramètres de l'Organisation",
            icon: Settings,
          },
          {
            id: "modules" as const,
            label: "2. Modules Métier Activables",
            icon: Blocks,
          },
          {
            id: "audit" as const,
            label: "3. Journal d'Audit Sécurisé",
            icon: FileSearch,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-control text-xs font-semibold transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface border border-border hover:bg-surface-muted"
              }`}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Onglet 1 : Paramètres de l'Organisation */}
      {activeTab === "org" && (
        <section className="gstock-card p-6 max-w-4xl space-y-5">
          <div>
            <h2 className="text-base font-bold">
              Configuration Générale & Politiques de Stock
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Définissez les règles transactionnelles appliquées à chaque mouvement de stock.
            </p>
          </div>

          {isLoadingOrg ? (
            <div className="p-6 text-center text-xs text-muted">
              Chargement des paramètres de l&apos;organisation...
            </div>
          ) : (
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Raison sociale / Nom de l&apos;organisation *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Profil d&apos;activité métier
                  </label>
                  <select
                    value={industryProfile}
                    onChange={(e) =>
                      setIndustryProfile(e.target.value as IndustryProfile)
                    }
                    className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
                  >
                    {Object.values(INDUSTRY_PROFILES).map((prof) => (
                      <option key={prof.code} value={prof.code}>
                        {prof.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Code Pays (ISO-2)
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Devise de comptabilisation (ISO-3)
                  </label>
                  <select
                    value={defaultCurrency}
                    onChange={(e) => setDefaultCurrency(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
                  >
                    <option value="EUR">EUR (€ - Euro)</option>
                    <option value="USD">USD ($ - Dollar US)</option>
                    <option value="CHF">CHF (Fr. - Franc Suisse)</option>
                    <option value="CAD">CAD ($ - Dollar Canadien)</option>
                    <option value="XOF">XOF (CFA - Franc CFA)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Fuseau horaire de référence (KPI & Clôtures)
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
                  >
                    <option value="Europe/Paris">Europe/Paris (CET/CEST)</option>
                    <option value="Europe/Brussels">Europe/Brussels</option>
                    <option value="Europe/Zurich">Europe/Zurich</option>
                    <option value="America/Montreal">America/Montreal</option>
                    <option value="Africa/Abidjan">Africa/Abidjan (UTC)</option>
                    <option value="UTC">UTC Universel</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Politique de stock négatif (`negativeStockPolicy`)
                  </label>
                  <select
                    value={negativeStockPolicy}
                    onChange={(e) =>
                      setNegativeStockPolicy(e.target.value as NegativeStockPolicy)
                    }
                    className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
                  >
                    <option value="FORBID">
                      FORBID — Interdire strictement (Recommandé)
                    </option>
                    <option value="WARN">
                      WARN — Autoriser avec avertissement tracé
                    </option>
                    <option value="ALLOW">
                      ALLOW — Autoriser les soldes négatifs temporaires
                    </option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold mb-1">
                    Méthode de valorisation comptable (`costingMethod`)
                  </label>
                  <select
                    value={costingMethod}
                    onChange={(e) =>
                      setCostingMethod(e.target.value as CostingMethod)
                    }
                    className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
                  >
                    <option value="WAC">
                      WAC (CUMP — Coût Unitaire Moyen Pondéré)
                    </option>
                    <option value="FIFO">
                      FIFO (PEPS — Premier Entré, Premier Sorti)
                    </option>
                    <option value="STANDARD">
                      STANDARD (Coût Standard Fixe)
                    </option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-border flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-control bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
                >
                  <Save size={14} />
                  <span>
                    {isSavingSettings
                      ? "Enregistrement..."
                      : "Enregistrer les paramètres"}
                  </span>
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      {/* Onglet 2 : Modules Métier Activables */}
      {activeTab === "modules" && (
        <section className="gstock-card p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-bold">
                Modules Métier Activables par Organisation
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Activez uniquement les briques fonctionnelles utiles à votre secteur pour garder une interface épurée.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveModules}
              disabled={isSavingModules}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-control bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
            >
              <Save size={14} />
              <span>
                {isSavingModules
                  ? "Synchronisation..."
                  : "Enregistrer la sélection des modules"}
              </span>
            </button>
          </div>

          {isLoadingModules ? (
            <div className="p-6 text-center text-xs text-muted">
              Chargement du catalogue de modules...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {modulesList.map((mod) => {
                const isChecked =
                  mod.mandatory || selectedModules.includes(mod.key);
                return (
                  <div
                    key={mod.key}
                    onClick={() => toggleModuleKey(mod.key, mod.mandatory)}
                    className={`p-4 rounded-card border transition-all flex items-start justify-between gap-4 ${
                      mod.mandatory
                        ? "border-primary/40 bg-surface-muted/50 cursor-default"
                        : isChecked
                        ? "border-primary bg-primary/5 cursor-pointer"
                        : "border-border hover:bg-surface-muted/40 cursor-pointer"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs">{mod.name}</span>
                        {mod.mandatory && (
                          <span className="px-2 py-0.5 rounded bg-primary/15 text-primary text-[10px] font-bold">
                            Socle obligatoire
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted">{mod.description}</p>
                      <code className="text-[10px] text-muted block pt-0.5">
                        Clé : {mod.key}
                      </code>
                    </div>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={mod.mandatory}
                      onChange={() => {}}
                      className="mt-1 h-4 w-4 accent-emerald-700"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Onglet 3 : Journal d'Audit Sécurisé */}
      {activeTab === "audit" && (
        <section className="gstock-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <Shield size={18} className="text-primary" />
                <span>Journal d&apos;Audit Immuable de l&apos;Organisation</span>
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Traçabilité horodatée de toutes les opérations sensibles avec identifiant de corrélation (`request_id`).
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-surface-muted">
              {auditLogs.length} événements récents
            </span>
          </div>

          {isLoadingAudit ? (
            <div className="p-6 text-center text-xs text-muted">
              Chargement du journal d&apos;audit...
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted border border-dashed border-border rounded-control">
              Aucun événement d&apos;audit enregistré pour cette organisation.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs gstock-table">
                <thead>
                  <tr className="border-b border-border bg-surface-muted/60">
                    <th className="font-semibold">Horodatage</th>
                    <th className="font-semibold">Acteur</th>
                    <th className="font-semibold">Action</th>
                    <th className="font-semibold">Ressource</th>
                    <th className="font-semibold">Request ID</th>
                    <th className="font-semibold">Métadonnées</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface-muted/30">
                      <td className="font-mono whitespace-nowrap text-[11px]">
                        {new Date(log.occurredAt).toLocaleString("fr-FR")}
                      </td>
                      <td>
                        <div className="font-semibold">
                          {log.actor?.name || "Système"}
                        </div>
                        <div className="text-[10px] text-muted">
                          {log.actor?.email || "—"}
                        </div>
                      </td>
                      <td>
                        <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-[11px] font-semibold">
                          {log.action}
                        </span>
                      </td>
                      <td className="font-mono text-[11px]">
                        {log.resourceType}
                      </td>
                      <td className="font-mono text-[10px] text-muted">
                        {log.requestId || "—"}
                      </td>
                      <td className="max-w-xs truncate font-mono text-[10px] text-muted">
                        {JSON.stringify(log.metadata || {})}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </AppShell>
  );
}
