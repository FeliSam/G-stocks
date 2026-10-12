import { Router } from "express";
import { prisma } from "@g-stock/database";
import {
  requireAuth,
  requireTenant,
  requirePermission,
} from "../../middleware/auth-tenant.js";
import { getBillingProvider } from "./billing.provider.js";
import { AppError } from "../../shared/errors.js";
import { recordAuditLog } from "../../shared/audit.js";

export const billingRouter = Router();

billingRouter.get("/billing/plans", requireAuth, async (_req, res, next) => {
  try {
    const plans = await prisma.plan.findMany({
      where: { status: "ACTIVE" },
      include: { features: true },
      orderBy: { price: "asc" },
    });
    const provider = getBillingProvider();
    res.json({
      data: plans.map((p) => ({
        ...p,
        price: Number(p.price),
      })),
      providerMeta: {
        provider: provider.name,
        isConfiguredForProduction: provider.isConfiguredForProduction,
        modeNotice: provider.isConfiguredForProduction
          ? "Paiement en production actif"
          : "Mode de développement explicite : aucun prestataire bancaire externe configuré (simulation contrôlée).",
      },
    });
  } catch (err) {
    next(err);
  }
});

billingRouter.get(
  "/billing/subscription",
  requireAuth,
  requireTenant,
  requirePermission("billing.read"),
  async (req, res, next) => {
    try {
      const orgId = req.tenant!.organizationId;
      const [sub, membersCount, warehousesCount, productsCount] = await Promise.all([
        prisma.subscription.findUnique({
          where: { organizationId: orgId },
          include: { plan: { include: { features: true } } },
        }),
        prisma.membership.count({ where: { organizationId: orgId, status: "ACTIVE" } }),
        prisma.warehouse.count({ where: { organizationId: orgId } }),
        prisma.product.count({ where: { organizationId: orgId } }),
      ]);

      const provider = getBillingProvider();

      res.json({
        data: {
          subscription: sub
            ? {
                ...sub,
                plan: { ...sub.plan, price: Number(sub.plan.price) },
              }
            : null,
          usage: {
            membersCount,
            warehousesCount,
            productsCount,
          },
          providerMeta: {
            provider: provider.name,
            isConfiguredForProduction: provider.isConfiguredForProduction,
            modeNotice:
              "Mode développement explicite : le changement de plan est persisté en base via SimulatedDevBillingProvider.",
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

billingRouter.post(
  "/billing/checkout",
  requireAuth,
  requireTenant,
  requirePermission("billing.manage"),
  async (req, res, next) => {
    try {
      const { planCode } = req.body as { planCode?: string };
      if (!planCode) {
        throw new AppError(400, "PLAN_CODE_REQUIRED", "Veuillez sélectionner un plan.");
      }

      const plan = await prisma.plan.findUnique({ where: { code: planCode } });
      if (!plan) {
        throw new AppError(404, "PLAN_NOT_FOUND", "Plan d'abonnement introuvable.");
      }

      const orgId = req.tenant!.organizationId;
      const provider = getBillingProvider();
      const session = await provider.createCheckoutSession({
        organizationId: orgId,
        planCode: plan.code,
      });

      const updatedSub = await prisma.subscription.upsert({
        where: { organizationId: orgId },
        update: {
          planId: plan.id,
          status: session.status,
          provider: session.provider,
          providerSubscriptionId: session.externalSubscriptionId,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000),
        },
        create: {
          organizationId: orgId,
          planId: plan.id,
          status: session.status,
          provider: session.provider,
          providerSubscriptionId: session.externalSubscriptionId,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000),
        },
        include: { plan: { include: { features: true } } },
      });

      await recordAuditLog({
        organizationId: orgId,
        actorUserId: req.auth!.userId,
        action: "billing.subscription.change_plan",
        resourceType: "subscription",
        resourceId: updatedSub.id,
        requestId: req.requestId,
        metadata: {
          planCode: plan.code,
          provider: session.provider,
          isDevelopmentSimulation: session.isDevelopmentSimulation,
        },
      });

      res.json({
        data: {
          subscription: updatedSub,
          checkoutSession: session,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

billingRouter.post("/billing/webhooks/:provider", async (req, res, next) => {
  try {
    const provider = getBillingProvider();
    const signature = req.header("X-Webhook-Signature");
    const rawBody = JSON.stringify(req.body);
    const event = provider.verifyAndParseWebhook(rawBody, signature);

    // Idempotence des webhooks
    const existingEvent = await prisma.billingWebhookEvent.findUnique({
      where: { externalEventId: event.externalEventId },
    });
    if (existingEvent) {
      return res.json({ received: true, idempotentReplay: true });
    }

    await prisma.$transaction(async (tx) => {
      await tx.billingWebhookEvent.create({
        data: {
          externalEventId: event.externalEventId,
          provider: String(req.params.provider),
          eventType: event.eventType,
          status: "PROCESSED",
        },
      });

      if (event.organizationId && event.subscriptionStatus) {
        await tx.subscription.updateMany({
          where: { organizationId: event.organizationId },
          data: { status: event.subscriptionStatus },
        });

        await recordAuditLog(
          {
            organizationId: event.organizationId,
            action: `billing.webhook.${event.eventType}`,
            resourceType: "subscription",
            resourceId: event.organizationId,
            requestId: req.requestId,
            metadata: {
              externalEventId: event.externalEventId,
              newStatus: event.subscriptionStatus,
            },
          },
          tx
        );
      }
    });

    res.json({ received: true, idempotentReplay: false });
  } catch (err) {
    next(err);
  }
});
