import crypto from "node:crypto";
import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors.js";

export interface CheckoutSessionResult {
  provider: "simulated_dev" | "stripe";
  isDevelopmentSimulation: boolean;
  checkoutUrl: string;
  externalSubscriptionId: string;
  status: "active" | "trialing";
}

export interface WebhookEventPayload {
  externalEventId: string;
  eventType: string;
  organizationId: string;
  planCode?: string;
  subscriptionStatus?: "trialing" | "active" | "past_due" | "canceled" | "suspended";
}

export interface BillingProvider {
  readonly name: "simulated_dev" | "stripe";
  readonly isConfiguredForProduction: boolean;
  createCheckoutSession(params: {
    organizationId: string;
    planCode: string;
    returnUrl?: string;
  }): Promise<CheckoutSessionResult>;
  verifyAndParseWebhook(rawBody: string, signatureHeader?: string): WebhookEventPayload;
}

class SimulatedDevBillingProvider implements BillingProvider {
  readonly name = "simulated_dev" as const;
  readonly isConfiguredForProduction = false;

  async createCheckoutSession(params: {
    organizationId: string;
    planCode: string;
  }): Promise<CheckoutSessionResult> {
    return {
      provider: "simulated_dev",
      isDevelopmentSimulation: true,
      checkoutUrl: `/billing?simulated_checkout=success&plan=${params.planCode}`,
      externalSubscriptionId: `sim_sub_${crypto.randomBytes(6).toString("hex")}`,
      status: "active",
    };
  }

  verifyAndParseWebhook(rawBody: string, signatureHeader?: string): WebhookEventPayload {
    const expectedSig = crypto
      .createHmac("sha256", env.STRIPE_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

    if (!signatureHeader || signatureHeader !== expectedSig) {
      throw new AppError(400, "INVALID_WEBHOOK_SIGNATURE", "Signature de webhook invalide.");
    }

    const parsed = JSON.parse(rawBody);
    return {
      externalEventId: parsed.id || `evt_${crypto.randomUUID()}`,
      eventType: parsed.type || "customer.subscription.updated",
      organizationId: parsed.data?.organizationId,
      planCode: parsed.data?.planCode,
      subscriptionStatus: parsed.data?.status,
    };
  }
}

export function getBillingProvider(): BillingProvider {
  return new SimulatedDevBillingProvider();
}

export function signWebhookPayloadForTest(payload: unknown): {
  rawBody: string;
  signature: string;
} {
  const rawBody = JSON.stringify(payload);
  const signature = crypto
    .createHmac("sha256", env.STRIPE_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  return { rawBody, signature };
}
