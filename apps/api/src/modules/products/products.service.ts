import { prisma, Prisma } from "@g-stock/database";
import type { z } from "zod";
import {
  createProductSchema,
  updateProductSchema,
  createCategorySchema,
  createUnitSchema,
  createUnitConversionSchema,
} from "./products.schemas.js";
import { AppError } from "../../shared/errors.js";
import { recordAuditLog } from "../../shared/audit.js";

export async function checkProductQuota(organizationId: string) {
  const sub = await prisma.subscription.findUnique({
    where: { organizationId },
    include: { plan: { include: { features: true } } },
  });
  const maxProductsFeature = sub?.plan.features.find((f) => f.featureKey === "max_products");
  if (maxProductsFeature?.limitValue) {
    const count = await prisma.product.count({ where: { organizationId } });
    if (count >= maxProductsFeature.limitValue) {
      throw new AppError(
        403,
        "PRODUCT_QUOTA_EXCEEDED",
        `Limite du plan atteinte (${maxProductsFeature.limitValue} produits maximum).`
      );
    }
  }
}

export async function createProductService(
  organizationId: string,
  userId: string,
  requestId: string,
  input: z.infer<typeof createProductSchema>
) {
  await checkProductQuota(organizationId);

  const existingSku = await prisma.product.findUnique({
    where: { organizationId_sku: { organizationId, sku: input.sku } },
  });
  if (existingSku) {
    throw new AppError(
      409,
      "DUPLICATE_SKU",
      `Un produit avec la référence SKU '${input.sku}' existe déjà dans votre catalogue.`
    );
  }

  const unit = await prisma.unitOfMeasure.findFirst({
    where: {
      id: input.baseUnitId,
      OR: [{ organizationId: null }, { organizationId }],
    },
  });
  if (!unit) {
    throw new AppError(400, "INVALID_BASE_UNIT", "L'unité de mesure sélectionnée est introuvable.");
  }

  if (input.categoryId) {
    const cat = await prisma.category.findFirst({
      where: { id: input.categoryId, organizationId },
    });
    if (!cat) {
      throw new AppError(400, "INVALID_CATEGORY", "La catégorie sélectionnée n'appartient pas à cette organisation.");
    }
  }

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        organizationId,
        sku: input.sku,
        name: input.name,
        description: input.description ?? null,
        categoryId: input.categoryId ?? null,
        baseUnitId: input.baseUnitId,
        costPrice: new Prisma.Decimal(input.costPrice),
        reorderLevel: new Prisma.Decimal(input.reorderLevel),
        trackingMode: input.trackingMode,
        isActive: input.isActive,
        ...(input.variants && input.variants.length > 0
          ? {
              variants: {
                create: input.variants.map((v) => ({
                  organizationId,
                  sku: v.sku,
                  attributes: v.attributes,
                })),
              },
            }
          : {}),
      },
      include: { category: true, baseUnit: true, variants: true },
    });

    await recordAuditLog(
      {
        organizationId,
        actorUserId: userId,
        action: "product.create",
        resourceType: "product",
        resourceId: product.id,
        requestId,
        metadata: { sku: product.sku, name: product.name },
      },
      tx
    );

    return product;
  });
}

export async function updateProductService(
  organizationId: string,
  userId: string,
  requestId: string,
  productId: string,
  input: z.infer<typeof updateProductSchema>
) {
  const existing = await prisma.product.findFirst({
    where: { id: productId, organizationId },
  });
  if (!existing) {
    throw new AppError(404, "PRODUCT_NOT_FOUND", "Produit introuvable dans cette organisation.");
  }

  if (input.sku && input.sku !== existing.sku) {
    const skuCollision = await prisma.product.findUnique({
      where: { organizationId_sku: { organizationId, sku: input.sku } },
    });
    if (skuCollision) {
      throw new AppError(409, "DUPLICATE_SKU", `Le SKU '${input.sku}' est déjà attribué.`);
    }
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.product.update({
      where: { id: productId },
      data: {
        ...(input.sku !== undefined ? { sku: input.sku } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
        ...(input.baseUnitId !== undefined ? { baseUnitId: input.baseUnitId } : {}),
        ...(input.costPrice !== undefined ? { costPrice: new Prisma.Decimal(input.costPrice) } : {}),
        ...(input.reorderLevel !== undefined
          ? { reorderLevel: new Prisma.Decimal(input.reorderLevel) }
          : {}),
        ...(input.trackingMode !== undefined ? { trackingMode: input.trackingMode } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
      include: { category: true, baseUnit: true, variants: true },
    });

    await recordAuditLog(
      {
        organizationId,
        actorUserId: userId,
        action: "product.update",
        resourceType: "product",
        resourceId: productId,
        requestId,
        metadata: input,
      },
      tx
    );

    return updated;
  });
}

export async function createCategoryService(
  organizationId: string,
  input: z.infer<typeof createCategorySchema>
) {
  const existing = await prisma.category.findUnique({
    where: { organizationId_code: { organizationId, code: input.code } },
  });
  if (existing) {
    throw new AppError(409, "DUPLICATE_CATEGORY_CODE", "Une catégorie avec ce code existe déjà.");
  }
  return prisma.category.create({
    data: {
      organizationId,
      code: input.code,
      name: input.name,
      parentId: input.parentId ?? null,
      isActive: input.isActive,
    },
  });
}

export async function createUnitConversionService(
  organizationId: string,
  input: z.infer<typeof createUnitConversionSchema>
) {
  if (input.fromUnitId === input.toUnitId) {
    throw new AppError(400, "SAME_UNIT_CONVERSION", "Les unités source et cible doivent être distinctes.");
  }
  const [fromUnit, toUnit] = await Promise.all([
    prisma.unitOfMeasure.findFirst({
      where: { id: input.fromUnitId, OR: [{ organizationId: null }, { organizationId }] },
    }),
    prisma.unitOfMeasure.findFirst({
      where: { id: input.toUnitId, OR: [{ organizationId: null }, { organizationId }] },
    }),
  ]);
  if (!fromUnit || !toUnit) {
    throw new AppError(404, "UNIT_NOT_FOUND", "Unité de mesure introuvable.");
  }
  if (fromUnit.dimension !== toUnit.dimension && fromUnit.dimension !== "COUNT") {
    throw new AppError(
      400,
      "INCOMPATIBLE_UNIT_DIMENSIONS",
      `Dimensions incompatibles entre ${fromUnit.code} (${fromUnit.dimension}) et ${toUnit.code} (${toUnit.dimension}).`
    );
  }

  return prisma.unitConversion.upsert({
    where: {
      organizationId_fromUnitId_toUnitId: {
        organizationId,
        fromUnitId: input.fromUnitId,
        toUnitId: input.toUnitId,
      },
    },
    update: { factor: new Prisma.Decimal(input.factor) },
    create: {
      organizationId,
      fromUnitId: input.fromUnitId,
      toUnitId: input.toUnitId,
      factor: new Prisma.Decimal(input.factor),
    },
    include: { fromUnit: true, toUnit: true },
  });
}

export async function exportProductsCsvService(organizationId: string): Promise<string> {
  const products = await prisma.product.findMany({
    where: { organizationId },
    include: { category: true, baseUnit: true, inventoryBalances: true },
    orderBy: { sku: "asc" },
  });

  const header = "SKU;Nom;Categorie;Unite;PrixRevient;SeuilAlerte;StockDisponible;Statut";
  const rows = products.map((p) => {
    const onHand = p.inventoryBalances.reduce((s, b) => s + Number(b.onHand) - Number(b.reserved), 0);
    const safeName = p.name.replace(/;/g, ",");
    const safeCat = (p.category?.code || "").replace(/;/g, ",");
    return [
      p.sku,
      safeName,
      safeCat,
      p.baseUnit.code,
      Number(p.costPrice).toFixed(2),
      Number(p.reorderLevel).toFixed(2),
      onHand.toFixed(2),
      p.isActive ? "ACTIF" : "ARCHIVE",
    ].join(";");
  });

  return [header, ...rows].join("\n");
}

export async function importProductsCsvService(
  organizationId: string,
  userId: string,
  requestId: string,
  csvContent: string
) {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    throw new AppError(400, "EMPTY_CSV", "Le fichier CSV doit contenir un en-tête et au moins une ligne.");
  }

  const units = await prisma.unitOfMeasure.findMany({
    where: { OR: [{ organizationId: null }, { organizationId }] },
  });
  const unitByCode = new Map(units.map((u) => [u.code.toUpperCase(), u.id]));
  const defaultUnitId = unitByCode.get("UN") || units[0]?.id;
  if (!defaultUnitId) {
    throw new AppError(400, "NO_UNITS_CONFIGURED", "Aucune unité de mesure disponible.");
  }

  const categories = await prisma.category.findMany({ where: { organizationId } });
  const catByCode = new Map(categories.map((c) => [c.code.toUpperCase(), c.id]));

  const imported: string[] = [];
  const errors: { line: number; message: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const sep = lines[i].includes(";") ? ";" : ",";
    const cols = lines[i].split(sep).map((c) => c.trim());
    const [rawSku, rawName, rawCatCode, rawUnitCode, rawCost, rawReorder] = cols;

    if (!rawSku || !rawName) {
      errors.push({ line: i + 1, message: "SKU et Nom obligatoires" });
      continue;
    }

    const sku = rawSku.toUpperCase().replace(/[^A-Z0-9._-]/g, "-");
    const unitId = (rawUnitCode && unitByCode.get(rawUnitCode.toUpperCase())) || defaultUnitId;
    const categoryId = (rawCatCode && catByCode.get(rawCatCode.toUpperCase())) || null;
    const costPrice = Math.max(0, Number(rawCost) || 0);
    const reorderLevel = Math.max(0, Number(rawReorder) || 5);

    await prisma.product.upsert({
      where: { organizationId_sku: { organizationId, sku } },
      update: {
        name: rawName,
        categoryId,
        baseUnitId: unitId,
        costPrice: new Prisma.Decimal(costPrice),
        reorderLevel: new Prisma.Decimal(reorderLevel),
      },
      create: {
        organizationId,
        sku,
        name: rawName,
        categoryId,
        baseUnitId: unitId,
        costPrice: new Prisma.Decimal(costPrice),
        reorderLevel: new Prisma.Decimal(reorderLevel),
      },
    });
    imported.push(sku);
  }

  await recordAuditLog({
    organizationId,
    actorUserId: userId,
    action: "product.csv_import",
    resourceType: "product",
    requestId,
    metadata: { importedCount: imported.length, errorCount: errors.length },
  });

  return { importedCount: imported.length, importedSkus: imported, errors };
}
