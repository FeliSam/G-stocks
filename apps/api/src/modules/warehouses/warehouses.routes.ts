import { Router } from "express";
import { prisma } from "@g-stock/database";
import { createWarehouseSchema, createLocationSchema } from "@g-stock/validation";
import {
  requireAuth,
  requireTenant,
  requirePermission,
} from "../../middleware/auth-tenant.js";
import { AppError } from "../../shared/errors.js";
import { recordAuditLog } from "../../shared/audit.js";

export const warehousesRouter = Router();

warehousesRouter.get("/warehouses", requireAuth, requireTenant, async (req, res, next) => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      where: { organizationId: req.tenant!.organizationId },
      include: {
        locations: {
          orderBy: { code: "asc" },
          include: {
            inventoryBalances: {
              include: { product: true },
            },
          },
        },
      },
      orderBy: { code: "asc" },
    });
    res.json({ data: warehouses });
  } catch (err) {
    next(err);
  }
});

warehousesRouter.post(
  "/warehouses",
  requireAuth,
  requireTenant,
  requirePermission("warehouses.manage"),
  async (req, res, next) => {
    try {
      const parsed = createWarehouseSchema.parse(req.body);
      const orgId = req.tenant!.organizationId;

      const sub = await prisma.subscription.findUnique({
        where: { organizationId: orgId },
        include: { plan: { include: { features: true } } },
      });
      const maxWh = sub?.plan.features.find((f) => f.featureKey === "max_warehouses");
      if (maxWh?.limitValue) {
        const count = await prisma.warehouse.count({ where: { organizationId: orgId } });
        if (count >= maxWh.limitValue) {
          throw new AppError(
            403,
            "WAREHOUSE_QUOTA_EXCEEDED",
            `Limite d'entrepôts atteinte (${maxWh.limitValue}) pour votre plan ${sub?.plan.name}.`
          );
        }
      }

      const existing = await prisma.warehouse.findUnique({
        where: { organizationId_code: { organizationId: orgId, code: parsed.code } },
      });
      if (existing) {
        throw new AppError(409, "DUPLICATE_WAREHOUSE_CODE", "Ce code entrepôt existe déjà.");
      }

      const created = await prisma.$transaction(async (tx) => {
        const wh = await tx.warehouse.create({
          data: {
            organizationId: orgId,
            code: parsed.code,
            name: parsed.name,
            isActive: parsed.isActive,
          },
        });

        const locationsToCreate =
          parsed.defaultLocations && parsed.defaultLocations.length > 0
            ? parsed.defaultLocations
            : [
                { code: "ZONE-PRINCIPALE", locationType: "STORAGE" },
                { code: "QUAI-RECEPTION", locationType: "RECEIVING" },
              ];

        await tx.location.createMany({
          data: locationsToCreate.map((loc) => ({
            organizationId: orgId,
            warehouseId: wh.id,
            code: loc.code,
            locationType: loc.locationType,
          })),
        });

        await recordAuditLog(
          {
            organizationId: orgId,
            actorUserId: req.auth!.userId,
            action: "warehouse.create",
            resourceType: "warehouse",
            resourceId: wh.id,
            requestId: req.requestId,
            metadata: { code: wh.code, name: wh.name },
          },
          tx
        );

        return tx.warehouse.findUniqueOrThrow({
          where: { id: wh.id },
          include: { locations: true },
        });
      });

      res.status(201).json({ data: created });
    } catch (err) {
      next(err);
    }
  }
);

warehousesRouter.post(
  "/locations",
  requireAuth,
  requireTenant,
  requirePermission("warehouses.manage"),
  async (req, res, next) => {
    try {
      const parsed = createLocationSchema.parse(req.body);
      const orgId = req.tenant!.organizationId;

      const warehouse = await prisma.warehouse.findFirst({
        where: { id: parsed.warehouseId, organizationId: orgId },
      });
      if (!warehouse) {
        throw new AppError(
          404,
          "WAREHOUSE_NOT_FOUND",
          "Entrepôt introuvable dans cette organisation."
        );
      }

      const existing = await prisma.location.findUnique({
        where: {
          warehouseId_code: { warehouseId: parsed.warehouseId, code: parsed.code },
        },
      });
      if (existing) {
        throw new AppError(
          409,
          "DUPLICATE_LOCATION_CODE",
          `L'emplacement '${parsed.code}' existe déjà dans cet entrepôt.`
        );
      }

      const loc = await prisma.location.create({
        data: {
          organizationId: orgId,
          warehouseId: parsed.warehouseId,
          code: parsed.code,
          locationType: parsed.locationType,
          isActive: parsed.isActive,
        },
      });

      res.status(201).json({ data: loc });
    } catch (err) {
      next(err);
    }
  }
);
