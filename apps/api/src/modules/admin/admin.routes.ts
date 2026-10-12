import { Router } from "express";
import { prisma, Prisma } from "@g-stock/database";
import { requireAuth, requirePlatformAdmin } from "../../middleware/auth-tenant.js";
import { AppError } from "../../shared/errors.js";
import { recordAuditLog } from "../../shared/audit.js";

export const adminRouter = Router();

adminRouter.use("/admin", requireAuth, requirePlatformAdmin);

adminRouter.get("/admin/overview", async (_req, res, next) => {
  try {
    const [
      totalOrganizations,
      activeOrganizations,
      totalUsers,
      totalMovements,
      organizations,
      plans,
      webhookEvents,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.organization.count(),
      prisma.organization.count({ where: { status: "ACTIVE" } }),
      prisma.user.count(),
      prisma.stockMovement.count(),
      prisma.organization.findMany({
        include: {
          settings: true,
          subscriptions: { include: { plan: true } },
          _count: {
            select: {
              memberships: true,
              products: true,
              warehouses: true,
              stockMovements: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.plan.findMany({
        include: {
          features: true,
          _count: { select: { subscriptions: true } },
        },
        orderBy: { price: "asc" },
      }),
      prisma.billingWebhookEvent.findMany({
        orderBy: { receivedAt: "desc" },
        take: 20,
      }),
      prisma.auditLog.findMany({
        include: {
          actor: { select: { id: true, name: true, email: true } },
          organization: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { occurredAt: "desc" },
        take: 50,
      }),
    ]);

    res.json({
      data: {
        metrics: {
          totalOrganizations,
          activeOrganizations,
          totalUsers,
          totalMovements,
        },
        organizations: organizations.map((o) => ({
          ...o,
          subscription: o.subscriptions[0]
            ? {
                ...o.subscriptions[0],
                plan: {
                  ...o.subscriptions[0].plan,
                  price: Number(o.subscriptions[0].plan.price),
                },
              }
            : null,
        })),
        plans: plans.map((p) => ({
          ...p,
          price: Number(p.price),
        })),
        webhookEvents,
        recentAuditLogs,
      },
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch("/admin/organizations/:id/status", async (req, res, next) => {
  try {
    const { status, subscriptionStatus, planCode } = req.body as {
      status?: "ACTIVE" | "SUSPENDED";
      subscriptionStatus?: "trialing" | "active" | "past_due" | "canceled" | "suspended";
      planCode?: string;
    };

    const org = await prisma.organization.findUnique({ where: { id: String(req.params.id) } });
    if (!org) {
      throw new AppError(404, "ORGANIZATION_NOT_FOUND", "Organisation introuvable.");
    }

    await prisma.$transaction(async (tx) => {
      if (status) {
        await tx.organization.update({
          where: { id: org.id },
          data: { status },
        });
      }

      if (subscriptionStatus || planCode) {
        let planId: string | undefined;
        if (planCode) {
          const plan = await tx.plan.findUnique({ where: { code: planCode } });
          if (plan) planId = plan.id;
        }
        await tx.subscription.updateMany({
          where: { organizationId: org.id },
          data: {
            ...(subscriptionStatus ? { status: subscriptionStatus } : {}),
            ...(planId ? { planId } : {}),
          },
        });
      }

      await recordAuditLog(
        {
          organizationId: org.id,
          actorUserId: req.auth!.userId,
          action: "platform_admin.organization.update",
          resourceType: "organization",
          resourceId: org.id,
          requestId: req.requestId,
          metadata: { status, subscriptionStatus, planCode },
        },
        tx
      );
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch("/admin/plans/:id", async (req, res, next) => {
  try {
    const { price, maxMembers, maxWarehouses, maxProducts } = req.body as {
      price?: number;
      maxMembers?: number;
      maxWarehouses?: number;
      maxProducts?: number;
    };

    const plan = await prisma.plan.findUnique({ where: { id: String(req.params.id) } });
    if (!plan) {
      throw new AppError(404, "PLAN_NOT_FOUND", "Plan introuvable.");
    }

    await prisma.$transaction(async (tx) => {
      if (price !== undefined && price >= 0) {
        await tx.plan.update({
          where: { id: plan.id },
          data: { price: new Prisma.Decimal(price) },
        });
      }

      const limitsToUpdate: Array<[string, number | undefined]> = [
        ["max_members", maxMembers],
        ["max_warehouses", maxWarehouses],
        ["max_products", maxProducts],
      ];

      for (const [featureKey, limitValue] of limitsToUpdate) {
        if (limitValue !== undefined && limitValue >= 1) {
          await tx.planFeature.upsert({
            where: { planId_featureKey: { planId: plan.id, featureKey } },
            update: { limitValue },
            create: { planId: plan.id, featureKey, enabled: true, limitValue },
          });
        }
      }

      await recordAuditLog(
        {
          actorUserId: req.auth!.userId,
          action: "platform_admin.plan.update",
          resourceType: "plan",
          resourceId: plan.id,
          requestId: req.requestId,
          metadata: { price, maxMembers, maxWarehouses, maxProducts },
        },
        tx
      );
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
