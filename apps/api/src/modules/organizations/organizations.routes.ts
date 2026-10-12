import crypto from "node:crypto";
import { Router } from "express";
import { prisma } from "@g-stock/database";
import { INDUSTRY_PROFILES } from "@g-stock/config";
import {
  createOrganizationSchema,
  updateOrganizationSettingsSchema,
  inviteMemberSchema,
} from "@g-stock/validation";
import {
  requireAuth,
  requireTenant,
  requirePermission,
} from "../../middleware/auth-tenant.js";
import { provisionOrganizationInTx } from "../auth/auth.service.js";
import { recordAuditLog } from "../../shared/audit.js";
import { AppError } from "../../shared/errors.js";
import { hashPassword } from "../../shared/crypto.js";

export const organizationsRouter = Router();

organizationsRouter.post("/organizations", requireAuth, async (req, res, next) => {
  try {
    const parsed = createOrganizationSchema.parse(req.body);
    const org = await prisma.$transaction(async (tx) => {
      const created = await provisionOrganizationInTx(tx, {
        userId: req.auth!.userId,
        name: parsed.name,
        slug: parsed.slug,
        industryProfile: parsed.industryProfile,
        countryCode: parsed.countryCode,
        defaultCurrency: parsed.defaultCurrency,
        timezone: parsed.timezone,
        locale: parsed.locale,
        negativeStockPolicy: parsed.negativeStockPolicy,
        costingMethod: parsed.costingMethod,
      });

      await recordAuditLog(
        {
          organizationId: created.id,
          actorUserId: req.auth!.userId,
          action: "organization.create",
          resourceType: "organization",
          resourceId: created.id,
          requestId: req.requestId,
          metadata: { name: created.name, industryProfile: parsed.industryProfile },
        },
        tx
      );
      return created;
    });

    res.status(201).json({ data: org });
  } catch (err) {
    next(err);
  }
});

organizationsRouter.get(
  "/organizations/current",
  requireAuth,
  requireTenant,
  async (req, res, next) => {
    try {
      const org = await prisma.organization.findUniqueOrThrow({
        where: { id: req.tenant!.organizationId },
        include: {
          settings: true,
          branding: true,
          theme: true,
          subscriptions: {
            include: { plan: { include: { features: true } } },
          },
          _count: {
            select: {
              memberships: true,
              warehouses: true,
              products: true,
            },
          },
        },
      });
      res.json({
        data: {
          ...org,
          industryProfilesCatalog: INDUSTRY_PROFILES,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

organizationsRouter.patch(
  "/organizations/current/settings",
  requireAuth,
  requireTenant,
  requirePermission("settings.manage"),
  async (req, res, next) => {
    try {
      const parsed = updateOrganizationSettingsSchema.parse(req.body);
      const orgId = req.tenant!.organizationId;

      const updated = await prisma.$transaction(async (tx) => {
        if (parsed.name) {
          await tx.organization.update({
            where: { id: orgId },
            data: { name: parsed.name },
          });
        }

        const settings = await tx.organizationSettings.update({
          where: { organizationId: orgId },
          data: {
            ...(parsed.industryProfile ? { industryProfile: parsed.industryProfile } : {}),
            ...(parsed.countryCode ? { countryCode: parsed.countryCode } : {}),
            ...(parsed.defaultCurrency ? { defaultCurrency: parsed.defaultCurrency } : {}),
            ...(parsed.timezone ? { timezone: parsed.timezone } : {}),
            ...(parsed.locale ? { locale: parsed.locale } : {}),
            ...(parsed.negativeStockPolicy
              ? { negativeStockPolicy: parsed.negativeStockPolicy }
              : {}),
            ...(parsed.costingMethod ? { costingMethod: parsed.costingMethod } : {}),
          },
        });

        await recordAuditLog(
          {
            organizationId: orgId,
            actorUserId: req.auth!.userId,
            action: "organization.settings.update",
            resourceType: "organization_settings",
            resourceId: orgId,
            requestId: req.requestId,
            metadata: parsed,
          },
          tx
        );

        return settings;
      });

      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  }
);

organizationsRouter.get(
  "/organizations/current/modules",
  requireAuth,
  requireTenant,
  async (req, res, next) => {
    try {
      const settings = await prisma.organizationSettings.findUnique({
        where: { organizationId: req.tenant!.organizationId },
      });
      const availableModules = [
        {
          key: "core_inventory",
          name: "Noyau Stock & Mouvements",
          description: "Entrées, sorties, transferts, ajustements et inventaires physiques.",
          mandatory: true,
        },
        {
          key: "alerts_kpi",
          name: "Alertes de Seuil & KPI Temps Réel",
          description: "Détection automatique des ruptures et références sous le seuil.",
          mandatory: false,
        },
        {
          key: "multi_warehouse",
          name: "Multi-Entrepôts & Emplacements",
          description: "Gestion de plusieurs dépôts, zones, allées et quais logistiques.",
          mandatory: false,
        },
        {
          key: "unit_conversions",
          name: "Conversions d'Unités",
          description: "Facteurs de conversion validés par dimension physique.",
          mandatory: false,
        },
        {
          key: "product_variants",
          name: "Variantes Produits (Tailles / Couleurs)",
          description: "Déclinaisons d'articles avec attributs structurés.",
          mandatory: false,
        },
        {
          key: "lot_expiry_tracking",
          name: "Traçabilité Renforcée (Lots & Péremption)",
          description: "Suivi adapté aux secteurs alimentaire, pharmacie et chimie.",
          mandatory: false,
        },
        {
          key: "csv_import_export",
          name: "Import / Export CSV Validé",
          description: "Importation et exportation contrôlée du catalogue et des soldes.",
          mandatory: false,
        },
        {
          key: "audit_trail",
          name: "Journal d'Audit Sécurisé",
          description: "Traçabilité complète des opérations sensibles de l'organisation.",
          mandatory: false,
        },
      ];

      const activeList = Array.isArray(settings?.activeModules)
        ? (settings?.activeModules as string[])
        : ["core_inventory", "alerts_kpi", "csv_import_export", "audit_trail"];

      res.json({
        data: availableModules.map((m) => ({
          ...m,
          enabled: m.mandatory || activeList.includes(m.key),
        })),
      });
    } catch (err) {
      next(err);
    }
  }
);

organizationsRouter.patch(
  "/organizations/current/modules",
  requireAuth,
  requireTenant,
  requirePermission("settings.manage"),
  async (req, res, next) => {
    try {
      const { activeModules } = req.body as { activeModules?: string[] };
      if (!Array.isArray(activeModules)) {
        throw new AppError(400, "INVALID_MODULES", "La liste des modules actifs est invalide.");
      }
      const normalized = Array.from(new Set(["core_inventory", ...activeModules]));
      const updated = await prisma.organizationSettings.update({
        where: { organizationId: req.tenant!.organizationId },
        data: { activeModules: normalized },
      });

      await recordAuditLog({
        organizationId: req.tenant!.organizationId,
        actorUserId: req.auth!.userId,
        action: "organization.modules.update",
        resourceType: "organization_settings",
        resourceId: req.tenant!.organizationId,
        requestId: req.requestId,
        metadata: { activeModules: normalized },
      });

      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  }
);

organizationsRouter.get(
  "/organizations/current/members",
  requireAuth,
  requireTenant,
  async (req, res, next) => {
    try {
      const orgId = req.tenant!.organizationId;
      const [members, invitations, roles] = await Promise.all([
        prisma.membership.findMany({
          where: { organizationId: orgId },
          include: {
            user: {
              select: { id: true, email: true, name: true, status: true, createdAt: true },
            },
            membershipRoles: { include: { role: true } },
          },
          orderBy: { joinedAt: "asc" },
        }),
        prisma.invitation.findMany({
          where: { organizationId: orgId },
          orderBy: { createdAt: "desc" },
        }),
        prisma.role.findMany({
          where: { organizationId: orgId },
          include: {
            rolePermissions: { include: { permission: true } },
          },
        }),
      ]);

      res.json({
        data: {
          members: members.map((m) => ({
            membershipId: m.id,
            status: m.status,
            joinedAt: m.joinedAt,
            user: m.user,
            roles: m.membershipRoles.map((mr) => ({
              id: mr.role.id,
              code: mr.role.code,
              name: mr.role.name,
            })),
          })),
          invitations,
          roles: roles.map((r) => ({
            id: r.id,
            code: r.code,
            name: r.name,
            isSystem: r.isSystem,
            permissions: r.rolePermissions.map((rp) => rp.permission.code),
          })),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

organizationsRouter.post(
  "/organizations/current/members/invite",
  requireAuth,
  requireTenant,
  requirePermission("members.manage"),
  async (req, res, next) => {
    try {
      const parsed = inviteMemberSchema.parse(req.body);
      const orgId = req.tenant!.organizationId;

      // Vérifie le quota max_members du plan actif
      const sub = await prisma.subscription.findUnique({
        where: { organizationId: orgId },
        include: { plan: { include: { features: true } } },
      });
      const maxMembersFeature = sub?.plan.features.find((f) => f.featureKey === "max_members");
      if (maxMembersFeature?.limitValue) {
        const currentCount = await prisma.membership.count({
          where: { organizationId: orgId, status: "ACTIVE" },
        });
        if (currentCount >= maxMembersFeature.limitValue) {
          throw new AppError(
            403,
            "PLAN_QUOTA_EXCEEDED",
            `Limite de membres atteinte (${maxMembersFeature.limitValue}) pour votre plan ${sub?.plan.name}.`
          );
        }
      }

      const role = await prisma.role.findFirst({
        where: { organizationId: orgId, code: parsed.roleCode },
      });
      if (!role) {
        throw new AppError(404, "ROLE_NOT_FOUND", "Rôle introuvable dans cette organisation.");
      }

      const result = await prisma.$transaction(async (tx) => {
        let user = await tx.user.findUnique({ where: { email: parsed.email } });
        if (!user) {
          user = await tx.user.create({
            data: {
              email: parsed.email,
              name: parsed.name || parsed.email.split("@")[0],
              passwordHash: hashPassword("TempInvite2026!"),
              status: "ACTIVE",
            },
          });
        }

        const existingMembership = await tx.membership.findUnique({
          where: {
            organizationId_userId: { organizationId: orgId, userId: user.id },
          },
        });
        if (existingMembership) {
          throw new AppError(409, "ALREADY_MEMBER", "Cet utilisateur est déjà membre de l'organisation.");
        }

        const membership = await tx.membership.create({
          data: {
            organizationId: orgId,
            userId: user.id,
            status: "ACTIVE",
          },
        });

        await tx.membershipRole.create({
          data: {
            membershipId: membership.id,
            roleId: role.id,
          },
        });

        const invitation = await tx.invitation.create({
          data: {
            organizationId: orgId,
            email: parsed.email,
            roleCode: parsed.roleCode,
            token: crypto.randomBytes(24).toString("hex"),
            status: "ACCEPTED",
            acceptedAt: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
          },
        });

        await recordAuditLog(
          {
            organizationId: orgId,
            actorUserId: req.auth!.userId,
            action: "member.invite",
            resourceType: "membership",
            resourceId: membership.id,
            requestId: req.requestId,
            metadata: { email: parsed.email, roleCode: parsed.roleCode },
          },
          tx
        );

        return { membership, invitation, user };
      });

      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  }
);

organizationsRouter.patch(
  "/organizations/current/members/:membershipId/role",
  requireAuth,
  requireTenant,
  requirePermission("members.manage"),
  async (req, res, next) => {
    try {
      const { roleCode } = req.body as { roleCode?: string };
      if (!roleCode) {
        throw new AppError(400, "ROLE_REQUIRED", "Le code du rôle est requis.");
      }
      const orgId = req.tenant!.organizationId;
      const membership = await prisma.membership.findFirst({
        where: { id: String(req.params.membershipId), organizationId: orgId },
      });
      if (!membership) {
        throw new AppError(404, "MEMBERSHIP_NOT_FOUND", "Membre introuvable dans cette organisation.");
      }

      const role = await prisma.role.findFirst({
        where: { organizationId: orgId, code: roleCode },
      });
      if (!role) {
        throw new AppError(404, "ROLE_NOT_FOUND", "Rôle introuvable.");
      }

      await prisma.$transaction(async (tx) => {
        await tx.membershipRole.deleteMany({
          where: { membershipId: membership.id },
        });
        await tx.membershipRole.create({
          data: { membershipId: membership.id, roleId: role.id },
        });
        await recordAuditLog(
          {
            organizationId: orgId,
            actorUserId: req.auth!.userId,
            action: "member.role.update",
            resourceType: "membership",
            resourceId: membership.id,
            requestId: req.requestId,
            metadata: { roleCode },
          },
          tx
        );
      });

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);
