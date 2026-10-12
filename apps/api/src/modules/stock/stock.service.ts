import { prisma, Prisma } from "@g-stock/database";
import type { z } from "zod";
import {
  stockReceiptSchema,
  stockIssueSchema,
  stockTransferSchema,
  stockAdjustmentSchema,
  reverseMovementSchema,
} from "./stock.schemas.js";
import { AppError } from "../../shared/errors.js";
import { computeRequestHash } from "../../shared/crypto.js";
import { recordAuditLog } from "../../shared/audit.js";

interface NormalizedMovementLine {
  productId: string;
  fromLocationId: string | null;
  toLocationId: string | null;
  quantity: number;
  unitCost?: number;
}

async function verifyTenantOwnershipInTx(
  tx: Prisma.TransactionClient,
  organizationId: string,
  lines: NormalizedMovementLine[]
) {
  const productIds = Array.from(new Set(lines.map((l) => l.productId)));
  const locationIds = Array.from(
    new Set(
      lines
        .flatMap((l) => [l.fromLocationId, l.toLocationId])
        .filter((id): id is string => Boolean(id))
    )
  );

  const products = await tx.product.findMany({
    where: { id: { in: productIds }, organizationId },
  });
  if (products.length !== productIds.length) {
    throw new AppError(
      403,
      "CROSS_TENANT_OR_MISSING_PRODUCT",
      "Un ou plusieurs produits référencés n'appartiennent pas à votre organisation."
    );
  }

  const locations = await tx.location.findMany({
    where: { id: { in: locationIds }, organizationId },
  });
  if (locations.length !== locationIds.length) {
    throw new AppError(
      403,
      "CROSS_TENANT_OR_MISSING_LOCATION",
      "Un ou plusieurs emplacements référencés n'appartiennent pas à votre organisation."
    );
  }

  return new Map(products.map((p) => [p.id, p]));
}

async function applyBalanceDeltaInTx(
  tx: Prisma.TransactionClient,
  params: {
    organizationId: string;
    productId: string;
    locationId: string;
    delta: number;
    negativeStockPolicy: "FORBID" | "WARN" | "ALLOW";
  }
) {
  await tx.$queryRaw`
    SELECT id FROM inventory_balances
    WHERE organization_id = ${params.organizationId}::uuid
      AND product_id = ${params.productId}::uuid
      AND location_id = ${params.locationId}::uuid
    FOR UPDATE
  `;

  const existing = await tx.inventoryBalance.findUnique({
    where: {
      organizationId_productId_locationId: {
        organizationId: params.organizationId,
        productId: params.productId,
        locationId: params.locationId,
      },
    },
  });

  const currentOnHand = existing ? Number(existing.onHand) : 0;
  const currentReserved = existing ? Number(existing.reserved) : 0;
  const nextOnHand = Number((currentOnHand + params.delta).toFixed(4));
  const nextAvailable = Number((nextOnHand - currentReserved).toFixed(4));

  if (nextAvailable < 0 && params.negativeStockPolicy === "FORBID") {
    throw new AppError(
      409,
      "NEGATIVE_STOCK_FORBIDDEN",
      `Stock disponible insuffisant pour cette opération (disponible actuel : ${currentOnHand - currentReserved}, demandé : ${Math.abs(params.delta)}).`
    );
  }

  if (existing) {
    await tx.inventoryBalance.update({
      where: { id: existing.id },
      data: { onHand: new Prisma.Decimal(nextOnHand) },
    });
  } else {
    await tx.inventoryBalance.create({
      data: {
        organizationId: params.organizationId,
        productId: params.productId,
        locationId: params.locationId,
        onHand: new Prisma.Decimal(nextOnHand),
        reserved: new Prisma.Decimal(0),
      },
    });
  }
}

export async function executeStockMovementTransaction(params: {
  organizationId: string;
  userId: string;
  requestId: string;
  negativeStockPolicy: "FORBID" | "WARN" | "ALLOW";
  movementType: "receipt" | "issue" | "transfer" | "adjustment" | "opening_balance" | "reversal";
  reference: string;
  notes?: string;
  occurredAt?: string;
  idempotencyKey: string;
  reversalOfMovementId?: string | null;
  rawPayloadForHash: unknown;
  lines: NormalizedMovementLine[];
}) {
  const requestHash = computeRequestHash({
    movementType: params.movementType,
    payload: params.rawPayloadForHash,
  });

  return prisma.$transaction(
    async (tx) => {
      const existingIdem = await tx.idempotencyKey.findUnique({
        where: {
          organizationId_key: {
            organizationId: params.organizationId,
            key: params.idempotencyKey,
          },
        },
      });

      if (existingIdem) {
        if (existingIdem.requestHash !== requestHash) {
          throw new AppError(
            409,
            "IDEMPOTENCY_KEY_CONFLICT",
            "Cette clé d'idempotence a déjà été utilisée avec des paramètres différents."
          );
        }
        const savedMovementId = (existingIdem.responseReference as { movementId?: string })
          ?.movementId;
        if (savedMovementId) {
          const existingMovement = await tx.stockMovement.findUniqueOrThrow({
            where: { id: savedMovementId },
            include: {
              lines: { include: { product: true, fromLocation: true, toLocation: true } },
            },
          });
          return { movement: existingMovement, idempotentReplay: true };
        }
      }

      const productMap = await verifyTenantOwnershipInTx(
        tx,
        params.organizationId,
        params.lines
      );

      const balanceOperations: Array<{
        productId: string;
        locationId: string;
        delta: number;
      }> = [];

      for (const line of params.lines) {
        if (line.fromLocationId) {
          balanceOperations.push({
            productId: line.productId,
            locationId: line.fromLocationId,
            delta: -Math.abs(line.quantity),
          });
        }
        if (line.toLocationId) {
          balanceOperations.push({
            productId: line.productId,
            locationId: line.toLocationId,
            delta: Math.abs(line.quantity),
          });
        }
      }

      balanceOperations.sort((a, b) =>
        `${a.productId}:${a.locationId}`.localeCompare(`${b.productId}:${b.locationId}`)
      );

      for (const op of balanceOperations) {
        await applyBalanceDeltaInTx(tx, {
          organizationId: params.organizationId,
          productId: op.productId,
          locationId: op.locationId,
          delta: op.delta,
          negativeStockPolicy: params.negativeStockPolicy,
        });
      }

      if (params.movementType === "receipt") {
        for (const line of params.lines) {
          if (line.unitCost !== undefined && line.unitCost > 0) {
            await tx.product.update({
              where: { id: line.productId },
              data: { costPrice: new Prisma.Decimal(line.unitCost) },
            });
          }
        }
      }

      const movement = await tx.stockMovement.create({
        data: {
          organizationId: params.organizationId,
          movementType: params.movementType,
          status: "VALIDATED",
          reference: params.reference,
          notes: params.notes ?? null,
          occurredAt: params.occurredAt ? new Date(params.occurredAt) : new Date(),
          createdBy: params.userId,
          validatedBy: params.userId,
          validatedAt: new Date(),
          reversalOfMovementId: params.reversalOfMovementId ?? null,
          idempotencyKey: params.idempotencyKey,
          lines: {
            create: params.lines.map((l) => {
              const prod = productMap.get(l.productId)!;
              const resolvedCost =
                l.unitCost !== undefined ? l.unitCost : Number(prod.costPrice);
              return {
                organizationId: params.organizationId,
                productId: l.productId,
                fromLocationId: l.fromLocationId,
                toLocationId: l.toLocationId,
                quantity: new Prisma.Decimal(Math.abs(l.quantity)),
                unitCost: new Prisma.Decimal(resolvedCost),
              };
            }),
          },
        },
        include: {
          lines: {
            include: { product: true, fromLocation: true, toLocation: true },
          },
        },
      });

      await tx.idempotencyKey.create({
        data: {
          organizationId: params.organizationId,
          key: params.idempotencyKey,
          requestHash,
          responseReference: { movementId: movement.id },
        },
      });

      await recordAuditLog(
        {
          organizationId: params.organizationId,
          actorUserId: params.userId,
          action: `stock.${params.movementType}`,
          resourceType: "stock_movement",
          resourceId: movement.id,
          requestId: params.requestId,
          metadata: {
            reference: movement.reference,
            lineCount: params.lines.length,
            reversalOfMovementId: params.reversalOfMovementId ?? null,
          },
        },
        tx
      );

      return { movement, idempotentReplay: false };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    }
  );
}

export async function createReceiptService(
  ctx: {
    organizationId: string;
    userId: string;
    requestId: string;
    negativeStockPolicy: "FORBID" | "WARN" | "ALLOW";
  },
  input: z.infer<typeof stockReceiptSchema>
) {
  return executeStockMovementTransaction({
    ...ctx,
    movementType: "receipt",
    reference: input.reference,
    notes: input.notes,
    occurredAt: input.occurredAt,
    idempotencyKey: input.idempotencyKey,
    rawPayloadForHash: input,
    lines: input.lines.map((l) => ({
      productId: l.productId,
      fromLocationId: null,
      toLocationId: l.toLocationId,
      quantity: l.quantity,
      unitCost: l.unitCost,
    })),
  });
}

export async function createIssueService(
  ctx: {
    organizationId: string;
    userId: string;
    requestId: string;
    negativeStockPolicy: "FORBID" | "WARN" | "ALLOW";
  },
  input: z.infer<typeof stockIssueSchema>
) {
  return executeStockMovementTransaction({
    ...ctx,
    movementType: "issue",
    reference: input.reference,
    notes: input.notes,
    occurredAt: input.occurredAt,
    idempotencyKey: input.idempotencyKey,
    rawPayloadForHash: input,
    lines: input.lines.map((l) => ({
      productId: l.productId,
      fromLocationId: l.fromLocationId,
      toLocationId: null,
      quantity: l.quantity,
    })),
  });
}

export async function createTransferService(
  ctx: {
    organizationId: string;
    userId: string;
    requestId: string;
    negativeStockPolicy: "FORBID" | "WARN" | "ALLOW";
  },
  input: z.infer<typeof stockTransferSchema>
) {
  return executeStockMovementTransaction({
    ...ctx,
    movementType: "transfer",
    reference: input.reference,
    notes: input.notes,
    occurredAt: input.occurredAt,
    idempotencyKey: input.idempotencyKey,
    rawPayloadForHash: input,
    lines: input.lines.map((l) => ({
      productId: l.productId,
      fromLocationId: l.fromLocationId,
      toLocationId: l.toLocationId,
      quantity: l.quantity,
    })),
  });
}

export async function createAdjustmentService(
  ctx: {
    organizationId: string;
    userId: string;
    requestId: string;
    negativeStockPolicy: "FORBID" | "WARN" | "ALLOW";
  },
  input: z.infer<typeof stockAdjustmentSchema>
) {
  return executeStockMovementTransaction({
    ...ctx,
    movementType: "adjustment",
    reference: input.reference,
    notes: input.reason,
    occurredAt: input.occurredAt,
    idempotencyKey: input.idempotencyKey,
    rawPayloadForHash: input,
    lines: input.lines.map((l) => ({
      productId: l.productId,
      fromLocationId: l.quantityDelta < 0 ? l.locationId : null,
      toLocationId: l.quantityDelta > 0 ? l.locationId : null,
      quantity: Math.abs(l.quantityDelta),
      unitCost: l.unitCost,
    })),
  });
}

export async function reverseMovementService(
  ctx: {
    organizationId: string;
    userId: string;
    requestId: string;
    negativeStockPolicy: "FORBID" | "WARN" | "ALLOW";
  },
  movementId: string,
  input: z.infer<typeof reverseMovementSchema>
) {
  const original = await prisma.stockMovement.findFirst({
    where: { id: movementId, organizationId: ctx.organizationId },
    include: { lines: true, reversals: true },
  });
  if (!original) {
    throw new AppError(404, "MOVEMENT_NOT_FOUND", "Mouvement de stock introuvable.");
  }
  if (original.status === "REVERSED" || original.reversals.length > 0) {
    throw new AppError(
      409,
      "MOVEMENT_ALREADY_REVERSED",
      "Ce mouvement a déjà fait l'objet d'une contrepassation."
    );
  }

  const result = await executeStockMovementTransaction({
    ...ctx,
    movementType: "reversal",
    reference: `REV-${original.reference}`,
    notes: `Contrepassation de ${original.reference} : ${input.reason}`,
    idempotencyKey: input.idempotencyKey,
    reversalOfMovementId: original.id,
    rawPayloadForHash: { movementId, ...input },
    lines: original.lines.map((l) => ({
      productId: l.productId,
      fromLocationId: l.toLocationId,
      toLocationId: l.fromLocationId,
      quantity: Number(l.quantity),
      unitCost: Number(l.unitCost),
    })),
  });

  await prisma.stockMovement.update({
    where: { id: original.id },
    data: { status: "REVERSED" },
  });

  return result;
}
