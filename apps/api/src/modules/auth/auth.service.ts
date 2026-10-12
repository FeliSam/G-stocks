import crypto from "node:crypto";
import { prisma, Prisma } from "@g-stock/database";
import { DEFAULT_ROLE_PERMISSIONS, INDUSTRY_PROFILES } from "@g-stock/config";
import type { z } from "zod";
import { registerSchema, loginSchema } from "@g-stock/validation";
import { AppError } from "../../shared/errors.js";
import { hashPassword, verifyPassword, signSessionToken } from "../../shared/crypto.js";
import { recordAuditLog } from "../../shared/audit.js";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

export async function provisionOrganizationInTx(
  tx: Prisma.TransactionClient,
  params: {
    userId: string;
    name: string;
    slug?: string;
    industryProfile: string;
    countryCode: string;
    defaultCurrency: string;
    timezone: string;
    locale?: string;
    negativeStockPolicy?: string;
    costingMethod?: string;
  }
) {
  const baseSlug = params.slug || slugify(params.name) || "entreprise";
  const uniqueSlug = `${baseSlug}-${crypto.randomBytes(2).toString("hex")}`;
  const profileDef =
    INDUSTRY_PROFILES[params.industryProfile as keyof typeof INDUSTRY_PROFILES] ||
    INDUSTRY_PROFILES.general;

  const org = await tx.organization.create({
    data: {
      name: params.name,
      slug: uniqueSlug,
      status: "ACTIVE",
      isDemo: false,
    },
  });

  await tx.organizationSettings.create({
    data: {
      organizationId: org.id,
      industryProfile: params.industryProfile,
      countryCode: params.countryCode,
      defaultCurrency: params.defaultCurrency,
      timezone: params.timezone,
      locale: params.locale || "fr-FR",
      negativeStockPolicy:
        params.industryProfile === "pharmacy"
          ? "FORBID"
          : params.negativeStockPolicy || "FORBID",
      costingMethod: params.costingMethod || "WAC",
      activeModules: profileDef.recommendedModules,
    },
  });

  await tx.organizationBranding.create({
    data: {
      organizationId: org.id,
      displayName: params.name,
    },
  });

  await tx.organizationTheme.create({
    data: {
      organizationId: org.id,
      themePreset: "gstock-classic",
      colorModeDefault: "light",
      designTokens: {},
    },
  });

  const starterPlan = await tx.plan.findFirst({
    where: { code: "pro" },
  });

  if (starterPlan) {
    await tx.subscription.create({
      data: {
        organizationId: org.id,
        planId: starterPlan.id,
        status: "trialing",
        provider: "simulated_dev",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 14 * 24 * 3600 * 1000),
        trialEnd: new Date(Date.now() + 14 * 24 * 3600 * 1000),
      },
    });
  }

  const allPerms = await tx.permission.findMany();
  const permByCode = new Map(allPerms.map((p) => [p.code, p.id]));

  const roleLabels: Record<string, string> = {
    owner: "Propriétaire d'entreprise",
    org_admin: "Administrateur d'entreprise",
    stock_manager: "Responsable de stock",
    warehouse_clerk: "Magasinier",
    auditor: "Auditeur / Lecteur",
  };

  let ownerRoleId = "";
  for (const [roleCode, label] of Object.entries(roleLabels)) {
    const r = await tx.role.create({
      data: {
        organizationId: org.id,
        code: roleCode,
        name: label,
        isSystem: true,
      },
    });
    if (roleCode === "owner") ownerRoleId = r.id;

    const codes = DEFAULT_ROLE_PERMISSIONS[roleCode as keyof typeof DEFAULT_ROLE_PERMISSIONS] || [];
    for (const c of codes) {
      const pid = permByCode.get(c);
      if (pid) {
        await tx.rolePermission.create({
          data: { roleId: r.id, permissionId: pid },
        });
      }
    }
  }

  const membership = await tx.membership.create({
    data: {
      organizationId: org.id,
      userId: params.userId,
      status: "ACTIVE",
    },
  });

  await tx.membershipRole.create({
    data: {
      membershipId: membership.id,
      roleId: ownerRoleId,
    },
  });

  // Crée un entrepôt principal par défaut pour démarrer immédiatement
  const defaultWarehouse = await tx.warehouse.create({
    data: {
      organizationId: org.id,
      code: "WH-MAIN",
      name: "Entrepôt Principal",
      isActive: true,
    },
  });

  await tx.location.createMany({
    data: [
      {
        organizationId: org.id,
        warehouseId: defaultWarehouse.id,
        code: "ZONE-STOCK-01",
        locationType: "STORAGE",
      },
      {
        organizationId: org.id,
        warehouseId: defaultWarehouse.id,
        code: "QUAI-RECEPTION",
        locationType: "RECEIVING",
      },
    ],
  });

  return org;
}

export async function registerUser(
  input: z.infer<typeof registerSchema>,
  requestId: string
) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (existing) {
    throw new AppError(409, "EMAIL_ALREADY_REGISTERED", "Cette adresse email est déjà utilisée.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        passwordHash: hashPassword(input.password),
        name: input.name,
        status: "ACTIVE",
        isPlatformAdmin: false,
      },
    });

    let organization = null;
    if (input.organizationName) {
      organization = await provisionOrganizationInTx(tx, {
        userId: user.id,
        name: input.organizationName,
        industryProfile: input.industryProfile,
        countryCode: input.countryCode,
        defaultCurrency: input.defaultCurrency,
        timezone: input.timezone,
      });
    }

    await recordAuditLog(
      {
        organizationId: organization?.id ?? null,
        actorUserId: user.id,
        action: "auth.register",
        resourceType: "user",
        resourceId: user.id,
        requestId,
        metadata: { email: user.email, organizationName: input.organizationName },
      },
      tx
    );

    return { user, organization };
  });

  const token = signSessionToken({
    sub: result.user.id,
    email: result.user.email,
    isPlatformAdmin: result.user.isPlatformAdmin,
  });

  return {
    token,
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      isPlatformAdmin: result.user.isPlatformAdmin,
    },
    organization: result.organization,
  };
}

export async function loginUser(input: z.infer<typeof loginSchema>, requestId: string) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (!user || !verifyPassword(input.password, user.passwordHash)) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Identifiants incorrects.");
  }
  if (user.status !== "ACTIVE") {
    throw new AppError(403, "USER_SUSPENDED", "Ce compte utilisateur est désactivé.");
  }

  const memberships = await prisma.membership.findMany({
    where: { userId: user.id, status: "ACTIVE" },
    include: {
      organization: {
        include: { settings: true, branding: true, theme: true },
      },
      membershipRoles: { include: { role: true } },
    },
    orderBy: { joinedAt: "asc" },
  });

  const token = signSessionToken({
    sub: user.id,
    email: user.email,
    isPlatformAdmin: user.isPlatformAdmin,
  });

  await recordAuditLog({
    organizationId: memberships[0]?.organizationId ?? null,
    actorUserId: user.id,
    action: "auth.login",
    resourceType: "user",
    resourceId: user.id,
    requestId,
    metadata: { email: user.email },
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      isPlatformAdmin: user.isPlatformAdmin,
    },
    organizations: memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      isDemo: m.organization.isDemo,
      roles: m.membershipRoles.map((mr) => mr.role.code),
      settings: m.organization.settings,
      branding: m.organization.branding,
      theme: m.organization.theme,
    })),
  };
}

export async function getCurrentUserContext(userId: string, activeOrgId?: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });

  const memberships = await prisma.membership.findMany({
    where: { userId, status: "ACTIVE" },
    include: {
      organization: {
        include: {
          settings: true,
          branding: true,
          theme: true,
          subscriptions: { include: { plan: { include: { features: true } } } },
        },
      },
      membershipRoles: {
        include: {
          role: {
            include: {
              rolePermissions: { include: { permission: true } },
            },
          },
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  const selected =
    memberships.find((m) => m.organizationId === activeOrgId) || memberships[0] || null;

  const permissions = new Set<string>();
  const roles: string[] = [];
  if (selected) {
    for (const mr of selected.membershipRoles) {
      roles.push(mr.role.code);
      for (const rp of mr.role.rolePermissions) {
        permissions.add(rp.permission.code);
      }
    }
  }

  const userPreference = await prisma.userPreference.findFirst({
    where: {
      userId,
      ...(selected ? { organizationId: selected.organizationId } : {}),
    },
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      isPlatformAdmin: user.isPlatformAdmin,
    },
    activeOrganization: selected
      ? {
          id: selected.organization.id,
          name: selected.organization.name,
          slug: selected.organization.slug,
          isDemo: selected.organization.isDemo,
          settings: selected.organization.settings,
          branding: selected.organization.branding,
          theme: selected.organization.theme,
          subscription: selected.organization.subscriptions[0] || null,
          roles,
          permissions: Array.from(permissions),
        }
      : null,
    organizations: memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      isDemo: m.organization.isDemo,
      roles: m.membershipRoles.map((mr) => mr.role.code),
    })),
    userPreference,
  };
}
