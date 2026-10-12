import { Router } from "express";
import { prisma, Prisma } from "@g-stock/database";
import { createInventorySchema, submitInventoryCountsSchema } from "@g-stock/validation";
import {
  requireAuth,
  requireTenant,
  requirePermission,
} from "../../middleware/auth-tenant.js";
import { AppError } from "../../shared/errors.js";
import { recordAuditLog } from "../../shared/audit.js";
import { createAdjustmentService } from "../stock/stock.service.js";

export const inventoriesRouter = Router();

inventoriesRouter.get(
  "/inventories",
  requireAuth,
  requireTenant,
  requirePermission("stock.read"),
  async (req, res, next) => {
    try {
      const inventories = await prisma.inventory.findMany({
        where: { organizationId: req.tenant!.organizationId },
        include: {
          warehouse: true,
          creator: { select: { id: true, name: true, email: true } },
          validator: { select: { id: true, name: true, email: true } },
          lines: {
            include: {
              product: { include: { baseUnit: true } },
              location: true,
            },
          },
        },
        orderBy: { startedAt: "desc" },
      });

      res.json({
        data: inventories.map((inv) => ({
          ...inv,
          lines: inv.lines.map((l) => ({
            ...l,
            expectedQuantity: Number(l.expectedQuantity),
            countedQuantity: Number(l.countedQuantity),
            variance: Number(l.variance),
          })),
        })),
      });
    } catch (err) {
      next(err);
    }
  }
);

inventoriesRouter.get(
  "/inventories/:id",
  requireAuth,
  requireTenant,
  requirePermission("stock.read"),
  async (req, res, next) => {
    try {
      const invId = String(req.params.id);
      const inv = await prisma.inventory.findFirst({
        where: { id: invId, organizationId: req.tenant!.organizationId },
        include: {
          warehouse: true,
          creator: { select: { id: true, name: true, email: true } },
          validator: { select: { id: true, name: true, email: true } },
          lines: {
            include: {
              product: { include: { baseUnit: true } },
              location: true,
            },
          },
        },
      });
      if (!inv) {
        throw new AppError(404, "INVENTORY_NOT_FOUND", "Session d'inventaire introuvable.");
      }
      res.json({
        data: {
          ...inv,
          lines: inv.lines.map((l) => ({
            ...l,
            expectedQuantity: Number(l.expectedQuantity),
            countedQuantity: Number(l.countedQuantity),
            variance: Number(l.variance),
          })),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

inventoriesRouter.post(
  "/inventories",
  requireAuth,
  requireTenant,
  requirePermission("inventory.create"),
  async (req, res, next) => {
    try {
      const parsed = createInventorySchema.parse(req.body);
      const orgId = req.tenant!.organizationId;

      const warehouse = await prisma.warehouse.findFirst({
        where: { id: parsed.warehouseId, organizationId: orgId },
        include: { locations: true },
      });
      if (!warehouse) {
        throw new AppError(404, "WAREHOUSE_NOT_FOUND", "Entrepôt introuvable.");
      }

      const balances = await prisma.inventoryBalance.findMany({
        where: {
          organizationId: orgId,
          location: { warehouseId: warehouse.id },
          ...(parsed.locationIds && parsed.locationIds.length > 0
            ? { locationId: { in: parsed.locationIds } }
            : {}),
        },
      });

      const created = await prisma.$transaction(async (tx) => {
        const inv = await tx.inventory.create({
          data: {
            organizationId: orgId,
            warehouseId: warehouse.id,
            status: "COUNTING",
            notes: parsed.notes ?? null,
            createdBy: req.auth!.userId,
            lines: {
              create: balances.map((b) => ({
                organizationId: orgId,
                productId: b.productId,
                locationId: b.locationId,
                expectedQuantity: b.onHand,
                countedQuantity: b.onHand,
                variance: new Prisma.Decimal(0),
              })),
            },
          },
          include: {
            warehouse: true,
            lines: { include: { product: true, location: true } },
          },
        });

        await recordAuditLog(
          {
            organizationId: orgId,
            actorUserId: req.auth!.userId,
            action: "inventory.create",
            resourceType: "inventory",
            resourceId: inv.id,
            requestId: req.requestId,
            metadata: { warehouseId: warehouse.id, lineCount: balances.length },
          },
          tx
        );

        return inv;
      });

      res.status(201).json({ data: created });
    } catch (err) {
      next(err);
    }
  }
);

inventoriesRouter.post(
  "/inventories/:id/counts",
  requireAuth,
  requireTenant,
  requirePermission("inventory.count"),
  async (req, res, next) => {
    try {
      const invId = String(req.params.id);
      const parsed = submitInventoryCountsSchema.parse(req.body);
      const orgId = req.tenant!.organizationId;

      const inv = await prisma.inventory.findFirst({
        where: { id: invId, organizationId: orgId },
        include: { lines: true },
      });
      if (!inv) {
        throw new AppError(404, "INVENTORY_NOT_FOUND", "Session d'inventaire introuvable.");
      }
      if (inv.status === "VALIDATED" || inv.status === "CANCELED") {
        throw new AppError(
          409,
          "INVENTORY_LOCKED",
          "Impossible de modifier les comptages d'un inventaire déjà validé ou annulé."
        );
      }

      const updated = await prisma.$transaction(async (tx) => {
        for (const item of parsed.lines) {
          const existingLine = inv.lines.find(
            (l) => l.productId === item.productId && l.locationId === item.locationId
          );

          if (existingLine) {
            const expected = Number(existingLine.expectedQuantity);
            const variance = Number((item.countedQuantity - expected).toFixed(4));
            await tx.inventoryLine.update({
              where: { id: existingLine.id },
              data: {
                countedQuantity: new Prisma.Decimal(item.countedQuantity),
                variance: new Prisma.Decimal(variance),
              },
            });
          } else {
            const bal = await tx.inventoryBalance.findUnique({
              where: {
                organizationId_productId_locationId: {
                  organizationId: orgId,
                  productId: item.productId,
                  locationId: item.locationId,
                },
              },
            });
            const expected = bal ? Number(bal.onHand) : 0;
            const variance = Number((item.countedQuantity - expected).toFixed(4));
            await tx.inventoryLine.create({
              data: {
                organizationId: orgId,
                inventoryId: inv.id,
                productId: item.productId,
                locationId: item.locationId,
                expectedQuantity: new Prisma.Decimal(expected),
                countedQuantity: new Prisma.Decimal(item.countedQuantity),
                variance: new Prisma.Decimal(variance),
              },
            });
          }
        }

        return tx.inventory.findUniqueOrThrow({
          where: { id: inv.id },
          include: {
            warehouse: true,
            lines: { include: { product: true, location: true } },
          },
        });
      });

      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  }
);

inventoriesRouter.post(
  "/inventories/:id/validate",
  requireAuth,
  requireTenant,
  requirePermission("inventory.validate"),
  async (req, res, next) => {
    try {
      const invId = String(req.params.id);
      const orgId = req.tenant!.organizationId;
      const inv = await prisma.inventory.findFirst({
        where: { id: invId, organizationId: orgId },
        include: { lines: true },
      });
      if (!inv) {
        throw new AppError(404, "INVENTORY_NOT_FOUND", "Inventaire introuvable.");
      }
      if (inv.status === "VALIDATED") {
        throw new AppError(409, "INVENTORY_ALREADY_VALIDATED", "Cet inventaire est déjà validé.");
      }

      const linesWithVariance = inv.lines.filter((l) => Number(l.variance) !== 0);
      let generatedMovementId: string | null = null;

      if (linesWithVariance.length > 0) {
        const adjustmentResult = await createAdjustmentService(
          {
            organizationId: orgId,
            userId: req.auth!.userId,
            requestId: req.requestId,
            negativeStockPolicy: req.tenant!.negativeStockPolicy,
          },
          {
            reference: `INV-ADJ-${inv.id.slice(0, 8).toUpperCase()}`,
            idempotencyKey: `inventory-validate-${inv.id}`,
            reason: `Validation des écarts d'inventaire #${inv.id.slice(0, 8)}`,
            lines: linesWithVariance.map((l) => ({
              productId: l.productId,
              locationId: l.locationId,
              quantityDelta: Number(l.variance),
            })),
          }
        );
        generatedMovementId = adjustmentResult.movement.id;
      }

      const validated = await prisma.inventory.update({
        where: { id: inv.id },
        data: {
          status: "VALIDATED",
          validatedBy: req.auth!.userId,
          validatedAt: new Date(),
          generatedMovementId,
        },
        include: {
          warehouse: true,
          lines: { include: { product: true, location: true } },
        },
      });

      await recordAuditLog({
        organizationId: orgId,
        actorUserId: req.auth!.userId,
        action: "inventory.validate",
        resourceType: "inventory",
        resourceId: inv.id,
        requestId: req.requestId,
        metadata: {
          varianceLinesCount: linesWithVariance.length,
          generatedMovementId,
        },
      });

      res.json({ data: validated, generatedMovementId });
    } catch (err) {
      next(err);
    }
  }
);
