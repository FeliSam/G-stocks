import { Router } from "express";
import { prisma } from "@g-stock/database";
import {
  requireAuth,
  requireTenant,
  requirePermission,
} from "../../middleware/auth-tenant.js";

export const reportsRouter = Router();

reportsRouter.get(
  "/reports/overview",
  requireAuth,
  requireTenant,
  requirePermission("stock.read"),
  async (req, res, next) => {
    try {
      const orgId = req.tenant!.organizationId;
      const periodDays = Math.min(365, Math.max(1, Number(req.query.days) || 30));
      const sinceDate = new Date(Date.now() - periodDays * 24 * 3600 * 1000);

      const [settings, products, warehousesCount, recentMovements, periodLines] =
        await Promise.all([
          prisma.organizationSettings.findUnique({ where: { organizationId: orgId } }),
          prisma.product.findMany({
            where: { organizationId: orgId, isActive: true },
            include: { baseUnit: true, category: true, inventoryBalances: true },
          }),
          prisma.warehouse.count({ where: { organizationId: orgId, isActive: true } }),
          prisma.stockMovement.findMany({
            where: { organizationId: orgId },
            include: {
              creator: { select: { name: true, email: true } },
              lines: { include: { product: true, fromLocation: true, toLocation: true } },
            },
            orderBy: { occurredAt: "desc" },
            take: 10,
          }),
          prisma.stockMovementLine.findMany({
            where: {
              organizationId: orgId,
              movement: { occurredAt: { gte: sinceDate }, status: "VALIDATED" },
            },
            include: { movement: true },
          }),
        ]);

      let activeProductsCount = 0;
      let lowStockCount = 0;
      let outOfStockCount = 0;
      let totalEstimatedStockValue = 0;
      let productsWithCostCount = 0;
      const attentionProducts: Array<{
        id: string;
        sku: string;
        name: string;
        unit: string;
        available: number;
        reorderLevel: number;
        status: "OUT_OF_STOCK" | "LOW_STOCK";
      }> = [];

      for (const p of products) {
        activeProductsCount += 1;
        const onHand = p.inventoryBalances.reduce((s, b) => s + Number(b.onHand), 0);
        const reserved = p.inventoryBalances.reduce((s, b) => s + Number(b.reserved), 0);
        const available = Number((onHand - reserved).toFixed(4));
        const reorder = Number(p.reorderLevel);
        const cost = Number(p.costPrice);

        if (cost > 0) {
          productsWithCostCount += 1;
          totalEstimatedStockValue += onHand * cost;
        }

        if (available <= 0) {
          outOfStockCount += 1;
          attentionProducts.push({
            id: p.id,
            sku: p.sku,
            name: p.name,
            unit: p.baseUnit.code,
            available,
            reorderLevel: reorder,
            status: "OUT_OF_STOCK",
          });
        } else if (available <= reorder) {
          lowStockCount += 1;
          attentionProducts.push({
            id: p.id,
            sku: p.sku,
            name: p.name,
            unit: p.baseUnit.code,
            available,
            reorderLevel: reorder,
            status: "LOW_STOCK",
          });
        }
      }

      // Agrégation quotidienne des entrées et sorties sur la période
      const dailyMap = new Map<
        string,
        { date: string; receipts: number; issues: number; transfers: number }
      >();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 3600 * 1000).toISOString().slice(0, 10);
        dailyMap.set(d, { date: d, receipts: 0, issues: 0, transfers: 0 });
      }

      let periodReceiptsTotal = 0;
      let periodIssuesTotal = 0;

      for (const line of periodLines) {
        const qty = Number(line.quantity);
        const dayKey = line.movement.occurredAt.toISOString().slice(0, 10);
        const bucket = dailyMap.get(dayKey) || {
          date: dayKey,
          receipts: 0,
          issues: 0,
          transfers: 0,
        };

        if (
          line.movement.movementType === "receipt" ||
          line.movement.movementType === "opening_balance"
        ) {
          periodReceiptsTotal += qty;
          bucket.receipts += qty;
        } else if (line.movement.movementType === "issue") {
          periodIssuesTotal += qty;
          bucket.issues += qty;
        } else if (line.movement.movementType === "transfer") {
          bucket.transfers += qty;
        }
        dailyMap.set(dayKey, bucket);
      }

      const timezone = settings?.timezone || "Europe/Paris";
      const currency = settings?.defaultCurrency || "EUR";

      res.json({
        data: {
          kpis: {
            activeProductsCount,
            lowStockCount,
            outOfStockCount,
            activeWarehousesCount: warehousesCount,
            periodReceiptsTotal: Number(periodReceiptsTotal.toFixed(2)),
            periodIssuesTotal: Number(periodIssuesTotal.toFixed(2)),
            estimatedStockValue:
              productsWithCostCount > 0 ? Number(totalEstimatedStockValue.toFixed(2)) : null,
            costCoverageRatio:
              activeProductsCount > 0
                ? Math.round((productsWithCostCount / activeProductsCount) * 100)
                : 0,
            currency,
          },
          kpiDefinitions: {
            activeProductsCount: {
              formula: "COUNT(products WHERE is_active = true)",
              period: "Instant T",
              timezone,
            },
            lowStockCount: {
              formula: "COUNT(products WHERE 0 < (on_hand - reserved) <= reorder_level)",
              period: "Instant T",
              timezone,
            },
            outOfStockCount: {
              formula: "COUNT(products WHERE (on_hand - reserved) <= 0)",
              period: "Instant T",
              timezone,
            },
            estimatedStockValue: {
              formula: "SUM(on_hand * cost_price) sur les références ayant un coût renseigné",
              period: "Instant T (Méthode " + (settings?.costingMethod || "WAC") + ")",
              timezone,
            },
          },
          flowSeries: Array.from(dailyMap.values()).sort((a, b) =>
            a.date.localeCompare(b.date)
          ),
          attentionProducts,
          recentMovements: recentMovements.map((m) => ({
            id: m.id,
            movementType: m.movementType,
            status: m.status,
            reference: m.reference,
            occurredAt: m.occurredAt,
            creatorName: m.creator.name,
            lineCount: m.lines.length,
            totalQuantity: m.lines.reduce((s, l) => s + Number(l.quantity), 0),
          })),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

reportsRouter.get(
  "/reports/stock-value",
  requireAuth,
  requireTenant,
  requirePermission("reports.read"),
  async (req, res, next) => {
    try {
      const orgId = req.tenant!.organizationId;
      const balances = await prisma.inventoryBalance.findMany({
        where: { organizationId: orgId },
        include: {
          product: { include: { category: true, baseUnit: true } },
          location: { include: { warehouse: true } },
        },
      });

      const byWarehouse = new Map<string, { warehouseName: string; totalValue: number; totalUnits: number }>();
      const byCategory = new Map<string, { categoryName: string; totalValue: number; totalUnits: number }>();

      for (const b of balances) {
        const qty = Number(b.onHand);
        const val = qty * Number(b.product.costPrice);
        const whName = b.location.warehouse.name;
        const catName = b.product.category?.name || "Non catégorisé";

        const whEntry = byWarehouse.get(whName) || { warehouseName: whName, totalValue: 0, totalUnits: 0 };
        whEntry.totalValue = Number((whEntry.totalValue + val).toFixed(2));
        whEntry.totalUnits = Number((whEntry.totalUnits + qty).toFixed(2));
        byWarehouse.set(whName, whEntry);

        const catEntry = byCategory.get(catName) || { categoryName: catName, totalValue: 0, totalUnits: 0 };
        catEntry.totalValue = Number((catEntry.totalValue + val).toFixed(2));
        catEntry.totalUnits = Number((catEntry.totalUnits + qty).toFixed(2));
        byCategory.set(catName, catEntry);
      }

      res.json({
        data: {
          byWarehouse: Array.from(byWarehouse.values()),
          byCategory: Array.from(byCategory.values()),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

reportsRouter.get(
  "/alerts/stock",
  requireAuth,
  requireTenant,
  requirePermission("stock.read"),
  async (req, res, next) => {
    try {
      const orgId = req.tenant!.organizationId;
      const products = await prisma.product.findMany({
        where: { organizationId: orgId, isActive: true },
        include: {
          category: true,
          baseUnit: true,
          inventoryBalances: { include: { location: { include: { warehouse: true } } } },
        },
      });

      const alerts = products
        .map((p) => {
          const onHand = p.inventoryBalances.reduce((s, b) => s + Number(b.onHand), 0);
          const reserved = p.inventoryBalances.reduce((s, b) => s + Number(b.reserved), 0);
          const available = onHand - reserved;
          const reorderLevel = Number(p.reorderLevel);
          const severity =
            available <= 0 ? "CRITICAL_OUT_OF_STOCK" : available <= reorderLevel ? "WARNING_LOW_STOCK" : null;
          if (!severity) return null;
          return {
            productId: p.id,
            sku: p.sku,
            name: p.name,
            categoryName: p.category?.name || "Général",
            unitCode: p.baseUnit.code,
            onHand,
            reserved,
            available,
            reorderLevel,
            deficit: Math.max(0, reorderLevel - available),
            severity,
          };
        })
        .filter(Boolean);

      res.json({ data: alerts });
    } catch (err) {
      next(err);
    }
  }
);

reportsRouter.get(
  "/audit-logs",
  requireAuth,
  requireTenant,
  requirePermission("audit.read"),
  async (req, res, next) => {
    try {
      const logs = await prisma.auditLog.findMany({
        where: { organizationId: req.tenant!.organizationId },
        include: {
          actor: { select: { id: true, name: true, email: true } },
        },
        orderBy: { occurredAt: "desc" },
        take: 100,
      });
      res.json({ data: logs });
    } catch (err) {
      next(err);
    }
  }
);
