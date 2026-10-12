import { prisma, Prisma } from "@g-stock/database";
import type { z } from "zod";
import type { listProductsQuerySchema } from "./products.schemas.js";

export async function findProductsPaginated(
  organizationId: string,
  query: z.infer<typeof listProductsQuerySchema>
) {
  const where: Prisma.ProductWhereInput = {
    organizationId,
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" } },
            { sku: { contains: query.search, mode: "insensitive" } },
            { barcode: { contains: query.search, mode: "insensitive" } },
            { brand: { contains: query.search, mode: "insensitive" } },
            { description: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.ProductOrderByWithRelationInput = {
    [query.sortBy || "createdAt"]: query.sortOrder || "desc",
  };

  const allMatching = await prisma.product.findMany({
    where,
    include: {
      category: true,
      baseUnit: true,
      variants: true,
      inventoryBalances: {
        include: { location: { include: { warehouse: true } } },
      },
    },
    orderBy,
  });

  const enriched = allMatching.map((p) => {
    const totalOnHand = p.inventoryBalances.reduce(
      (acc, b) => acc + Number(b.onHand),
      0
    );
    const totalReserved = p.inventoryBalances.reduce(
      (acc, b) => acc + Number(b.reserved),
      0
    );
    const available = totalOnHand - totalReserved;
    const reorderLevel = Number(p.reorderLevel);
    const stockState =
      available <= 0 ? "out" : available <= reorderLevel ? "low" : "ok";

    return {
      ...p,
      costPrice: Number(p.costPrice),
      salePrice: Number(p.salePrice ?? 0),
      weightKg: p.weightKg !== null && p.weightKg !== undefined ? Number(p.weightKg) : null,
      reorderLevel,
      totalOnHand,
      totalReserved,
      available,
      stockState,
    };
  });

  const filtered =
    query.stockStatus && query.stockStatus !== "all"
      ? enriched.filter((p) => p.stockState === query.stockStatus)
      : enriched;

  const total = filtered.length;
  const start = (query.page - 1) * query.limit;
  const paginated = filtered.slice(start, start + query.limit);

  return {
    data: paginated,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}
