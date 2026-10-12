import type { Request, Response, NextFunction } from "express";
import { prisma } from "@g-stock/database";
import type { PermissionCode } from "@g-stock/types";
import { AppError } from "../shared/errors.js";
import { verifySessionToken } from "../shared/crypto.js";

export function extractToken(req: Request): string | null {
  const authHeader = req.header("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  if (req.cookies && typeof req.cookies.gstock_session === "string") {
    return req.cookies.gstock_session;
  }
  return null;
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);
    if (!token) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentification requise.");
    }
    let decoded;
    try {
      decoded = verifySessionToken(token);
    } catch {
      throw new AppError(401, "INVALID_SESSION", "Session expirée ou invalide.");
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
    });
    if (!user || user.status !== "ACTIVE") {
      throw new AppError(401, "USER_INACTIVE", "Compte utilisateur introuvable ou désactivé.");
    }

    req.auth = {
      userId: user.id,
      email: user.email,
      name: user.name,
      isPlatformAdmin: user.isPlatformAdmin,
    };
    next();
  } catch (err) {
    next(err);
  }
}

export async function requireTenant(req: Request, _res: Response, next: NextFunction) {
  try {
    if (!req.auth) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentification requise.");
    }

    const requestedOrgId = req.header("X-Organization-Id") || (req.query.organizationId as string | undefined);

    const memberships = await prisma.membership.findMany({
      where: {
        userId: req.auth.userId,
        status: "ACTIVE",
        ...(requestedOrgId ? { organizationId: requestedOrgId } : {}),
      },
      include: {
        organization: {
          include: {
            settings: true,
            subscriptions: {
              include: {
                plan: {
                  include: { features: true },
                },
              },
            },
          },
        },
        membershipRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    if (memberships.length === 0) {
      if (requestedOrgId) {
        throw new AppError(
          403,
          "TENANT_ACCESS_DENIED",
          "Accès refusé : vous n'êtes pas membre actif de cette organisation."
        );
      }
      throw new AppError(
        404,
        "NO_ORGANIZATION",
        "Aucune organisation active associée à ce compte."
      );
    }

    const activeMembership = memberships[0];
    const org = activeMembership.organization;

    if (org.status !== "ACTIVE") {
      throw new AppError(403, "ORGANIZATION_SUSPENDED", "Cette organisation est actuellement suspendue.");
    }

    const permissions = new Set<string>();
    const roles: string[] = [];

    for (const mr of activeMembership.membershipRoles) {
      roles.push(mr.role.code);
      for (const rp of mr.role.rolePermissions) {
        permissions.add(rp.permission.code);
      }
    }

    const subscription = org.subscriptions[0];
    const subStatus = subscription?.status || "trialing";

    if (
      ["canceled", "suspended", "expired"].includes(subStatus) &&
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      !req.originalUrl.includes("/billing")
    ) {
      throw new AppError(
        402,
        "SUBSCRIPTION_WRITE_LOCKED",
        "Votre abonnement est expiré ou suspendu. L'accès en lecture est maintenu, mais les opérations d'écriture sont bloquées."
      );
    }

    const rawModules = org.settings?.activeModules;
    const activeModules = new Set<string>(
      Array.isArray(rawModules)
        ? (rawModules as string[])
        : ["core_inventory", "alerts_kpi", "csv_import_export", "audit_trail"]
    );

    req.tenant = {
      organizationId: org.id,
      organizationSlug: org.slug,
      organizationName: org.name,
      membershipId: activeMembership.id,
      roles,
      permissions,
      subscriptionStatus: subStatus,
      negativeStockPolicy:
        (org.settings?.negativeStockPolicy as "FORBID" | "WARN" | "ALLOW") || "FORBID",
      activeModules,
    };

    next();
  } catch (err) {
    next(err);
  }
}

export function requirePermission(...requiredPermissions: PermissionCode[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.tenant) {
      return next(new AppError(403, "MISSING_TENANT_CONTEXT", "Contexte d'organisation manquant."));
    }
    for (const perm of requiredPermissions) {
      if (!req.tenant.permissions.has(perm)) {
        return next(
          new AppError(
            403,
            "INSUFFICIENT_PERMISSIONS",
            `Permission requise manquante : ${perm}`
          )
        );
      }
    }
    next();
  };
}

export function requirePlatformAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.auth?.isPlatformAdmin) {
    return next(
      new AppError(
        403,
        "PLATFORM_ADMIN_REQUIRED",
        "Accès strictement réservé aux administrateurs de la plateforme G-Stock."
      )
    );
  }
  next();
}
