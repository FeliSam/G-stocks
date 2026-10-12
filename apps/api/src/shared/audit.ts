import { prisma, Prisma } from "@g-stock/database";

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordHash",
  "password_hash",
  "token",
  "secret",
  "authorization",
  "cookie",
  "cardNumber",
  "cvc",
]);

export function sanitizeAuditMetadata(input: Record<string, unknown>): Prisma.InputJsonObject {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase()) || SENSITIVE_KEYS.has(key)) {
      cleaned[key] = "[REDACTED]";
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      cleaned[key] = sanitizeAuditMetadata(value as Record<string, unknown>);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned as Prisma.InputJsonObject;
}

export async function recordAuditLog(
  params: {
    organizationId?: string | null;
    actorUserId?: string | null;
    action: string;
    resourceType: string;
    resourceId?: string | null;
    requestId?: string | null;
    metadata?: Record<string, unknown>;
  },
  tx: Prisma.TransactionClient | typeof prisma = prisma
) {
  await tx.auditLog.create({
    data: {
      organizationId: params.organizationId ?? null,
      actorUserId: params.actorUserId ?? null,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId ?? null,
      requestId: params.requestId ?? null,
      metadata: sanitizeAuditMetadata(params.metadata ?? {}),
    },
  });
}
