"use client";

import React, { useState } from "react";
import {
  Users,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  X,
  Lock,
} from "lucide-react";
import { ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from "@g-stock/config";
import type { SystemRoleCode } from "@g-stock/types";
import { AppShell } from "@/layouts/AppShell";
import {
  useGetMembersQuery,
  useInviteMemberMutation,
  useUpdateMemberRoleMutation,
} from "@/store/api";

const ASSIGNABLE_ROLES: Array<{
  code: Exclude<SystemRoleCode, "platform_admin" | "custom">;
  label: string;
  description: string;
}> = [
  {
    code: "owner",
    label: "Propriétaire (Owner)",
    description: "Contrôle total sur l'organisation, l'abonnement et la sécurité.",
  },
  {
    code: "org_admin",
    label: "Administrateur (Org Admin)",
    description: "Gestion opérationnelle complète, membres, paramètres et thème.",
  },
  {
    code: "stock_manager",
    label: "Responsable Stock",
    description: "Catalogue, entrepôts, réceptions, sorties, ajustements et inventaires.",
  },
  {
    code: "warehouse_clerk",
    label: "Magasinier / Opérateur",
    description: "Exécution quotidienne des réceptions, sorties, transferts et comptages.",
  },
  {
    code: "auditor",
    label: "Auditeur / Lecture seule",
    description: "Consultation des stocks, rapports financiers et journal d'audit.",
  },
];

export default function TeamPage() {
  const { data: membersRes, isLoading } = useGetMembersQuery();
  const [inviteMember, { isLoading: isInviting }] = useInviteMemberMutation();
  const [updateMemberRole, { isLoading: isUpdatingRole }] =
    useUpdateMemberRoleMutation();

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("warehouse_clerk");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const members: any[] = membersRes?.data?.members || [];

  async function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    if (!inviteEmail.trim()) return;

    try {
      await inviteMember({
        email: inviteEmail.trim(),
        name: inviteName.trim() || undefined,
        roleCode: inviteRole,
      }).unwrap();
      setInviteEmail("");
      setInviteName("");
      setInviteRole("warehouse_clerk");
      setFeedback({
        type: "success",
        text: "Le collaborateur a été ajouté et rattaché à votre organisation avec succès.",
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        text:
          err?.data?.error?.message ||
          "Impossible d'inviter ce collaborateur (vérifiez le quota de votre plan ou vos permissions).",
      });
    }
  }

  async function handleRoleChange(membershipId: string, roleCode: string) {
    setFeedback(null);
    try {
      await updateMemberRole({ membershipId, roleCode }).unwrap();
      setFeedback({
        type: "success",
        text: "Le rôle du collaborateur a été mis à jour et journalisé dans l'audit.",
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        text:
          err?.data?.error?.message ||
          "Modification du rôle refusée. Seul un administrateur ou propriétaire peut modifier les rôles.",
      });
    }
  }

  return (
    <AppShell
      title="Équipe, Collaborateurs & Contrôle d'Accès (RBAC)"
      subtitle="Gérez les membres de votre organisation, attribuez des rôles métier explicites et consultez la matrice des permissions."
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Formulaire d'invitation */}
        <section className="lg:col-span-4 gstock-card p-5 space-y-4 h-fit">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <UserPlus size={18} className="text-primary" />
              <span>Inviter un Collaborateur</span>
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Ajoutez un membre à cette organisation sous réserve du quota de votre abonnement.
            </p>
          </div>

          <form onSubmit={handleInviteSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold mb-1">
                Adresse email professionnelle *
              </label>
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="collaborateur@entreprise.fr"
                className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                Nom complet (optionnel)
              </label>
              <input
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Ex: Claire Martin"
                className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                Rôle attribué dans l&apos;organisation
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
              >
                {ASSIGNABLE_ROLES.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted mt-1">
                {
                  ASSIGNABLE_ROLES.find((r) => r.code === inviteRole)
                    ?.description
                }
              </p>
            </div>

            <button
              type="submit"
              disabled={isInviting}
              className="w-full py-2.5 px-4 rounded-control bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
            >
              {isInviting
                ? "Ajout du collaborateur..."
                : "Inviter et activer l'accès"}
            </button>
          </form>
        </section>

        {/* Liste des membres actifs */}
        <section className="lg:col-span-8 gstock-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <Users size={18} className="text-primary" />
                <span>Membres de l&apos;Organisation ({members.length})</span>
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Chaque membre dispose d&apos;un rôle strictement isolé au sein de ce tenant.
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="p-6 text-center text-xs text-muted">
              Chargement des membres de l&apos;équipe...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs gstock-table">
                <thead>
                  <tr className="border-b border-border bg-surface-muted/60">
                    <th className="font-semibold">Collaborateur</th>
                    <th className="font-semibold">Statut</th>
                    <th className="font-semibold">Date d&apos;adhésion</th>
                    <th className="font-semibold">Rôle RBAC actif</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {members.map((m) => {
                    const currentRoleCode =
                      m.roles?.[0]?.code || "warehouse_clerk";
                    return (
                      <tr key={m.membershipId} className="hover:bg-surface-muted/30">
                        <td>
                          <div className="font-bold">{m.user?.name}</div>
                          <div className="text-[11px] text-muted">
                            {m.user?.email}
                          </div>
                        </td>
                        <td>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                            {m.status}
                          </span>
                        </td>
                        <td className="text-muted">
                          {m.joinedAt
                            ? new Date(m.joinedAt).toLocaleDateString("fr-FR")
                            : "—"}
                        </td>
                        <td>
                          <select
                            aria-label={`Rôle de ${m.user?.name}`}
                            disabled={isUpdatingRole}
                            value={currentRoleCode}
                            onChange={(e) =>
                              handleRoleChange(m.membershipId, e.target.value)
                            }
                            className="px-2.5 py-1.5 rounded-control border border-border bg-background text-xs font-medium"
                          >
                            {ASSIGNABLE_ROLES.map((r) => (
                              <option key={r.code} value={r.code}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Matrice récapitulative des rôles et permissions RBAC */}
      <section className="gstock-card p-5 space-y-4">
        <div>
          <h2 className="text-base font-bold flex items-center gap-2">
            <ShieldCheck size={18} className="text-primary" />
            <span>Matrice des Permissions RBAC par Rôle Métier</span>
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Toutes les permissions sont vérifiées côté serveur sur chaque route API Express.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs gstock-table">
            <thead>
              <tr className="border-b border-border bg-surface-muted/60">
                <th className="font-semibold">Permission</th>
                <th className="font-semibold">Catégorie</th>
                {ASSIGNABLE_ROLES.map((r) => (
                  <th key={r.code} className="font-semibold text-center">
                    {r.code}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ALL_PERMISSIONS.filter((p) => p.code !== "platform.admin").map(
                (perm) => (
                  <tr key={perm.code} className="hover:bg-surface-muted/30">
                    <td>
                      <div className="font-medium">{perm.name}</div>
                      <code className="text-[10px] text-muted">{perm.code}</code>
                    </td>
                    <td>
                      <span className="px-2 py-0.5 rounded bg-surface-muted text-[10px] font-semibold">
                        {perm.category}
                      </span>
                    </td>
                    {ASSIGNABLE_ROLES.map((role) => {
                      const hasPerm = DEFAULT_ROLE_PERMISSIONS[
                        role.code
                      ]?.includes(perm.code);
                      return (
                        <td key={role.code} className="text-center">
                          {hasPerm ? (
                            <CheckCircle2
                              size={15}
                              className="mx-auto text-emerald-600 dark:text-emerald-400"
                            />
                          ) : (
                            <Lock
                              size={13}
                              className="mx-auto text-muted opacity-35"
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
