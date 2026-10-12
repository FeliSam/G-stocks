import { prisma, Prisma } from "@g-stock/database";
import type { z } from "zod";
import type { listMovementsQuerySchema, listBalancesQuerySchema } from "./stock.schemas.js";

export async function findBalancesRepository(
  organizationId: string,
  query: z.infer<typeof listBalancesQuerySchema>
) {
  const balances = await prisma.inventoryBalance.findMany({
    where: {
      organizationId,
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.warehouseId ? { location: { warehouseId: query.warehouseId } } : {}),
      ...(query.search
        ? {
            OR: [
              { product: { name: { contains: query.search, mode: "insensitive" } } },
              { product: { sku: { contains: query.search, mode: "insensitive" } } },
              { location: { code: { contains: query.search, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      product: { include: { baseUnit: true, category: true } },
      location: { include: { warehouse: true } },
    },
    orderBy: [{ product: { sku: "asc" } }, { location: { code: "asc" } }],
  });

  return balances.map((b) => {
    const onHand = Number(b.onHand);
    const reserved = Number(b.reserved);
    const available = onHand - reserved;
    const costPrice = Number(b.product.costPrice);
    return {
      ...b,
      onHand,
      reserved,
      available,
      valuation: Number((onHand * costPrice).toFixed(2)),
    };
  });
}

export async function findMovementsPaginatedRepository(
  organizationId: string,
  query: z.infer<typeof listMovementsQuerySchema>
) {
  const where: Prisma.StockMovementWhereInput = {
    organizationId,
    ...(query.movementType ? { movementType: query.movementType } : {}),
    ...(query.search
      ? {
          OR: [
            { reference: { contains: query.search, mode: "insensitive" } },
            { notes: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(query.productId
      ? {
          lines: { some: { productId: query.productId } },
        }
      : {}),
    ...(query.warehouseId
      ? {
          lines: {
            some: {
              OR: [
                { fromLocation: { warehouseId: query.warehouseId } },
                { toLocation: { warehouseId: query.warehouseId } },
              ],
            },
          },
        }
      : {}),
  };

  const [total, movements] = await Promise.all([
    prisma.stockMovement.count({ where }),
    prisma.stockMovement.findMany({
      where,
      include: {
        creator: { select: { id: true, name: true, email: true } },
        lines: {
          include: {
            product: { include: { baseUnit: true } },
            fromLocation: { include: { warehouse: true } },
            toLocation: { include: { warehouse: true } },
          },
        },
      },
      orderBy: { occurredAt: query.sortOrder || "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);

  return {
    data: movements.map((m) => ({
      ...m,
      lines: m.lines.map((l) => ({
        ...l,
        quantity: Number(l.quantity),
        unitCost: Number(l.unitCost),
      })),
    })),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}
