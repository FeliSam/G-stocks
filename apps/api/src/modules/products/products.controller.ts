import type { Request, Response, NextFunction } from "express";
import { prisma } from "@g-stock/database";
import {
  listProductsQuerySchema,
  createProductSchema,
  updateProductSchema,
  createCategorySchema,
  createUnitSchema,
  createUnitConversionSchema,
  importProductsCsvSchema,
} from "./products.schemas.js";
import { findProductsPaginated } from "./products.repository.js";
import {
  createProductService,
  updateProductService,
  createCategoryService,
  createUnitConversionService,
  exportProductsCsvService,
  importProductsCsvService,
} from "./products.service.js";
import { AppError } from "../../shared/errors.js";

export async function listProductsController(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listProductsQuerySchema.parse(req.query);
    const result = await findProductsPaginated(req.tenant!.organizationId, query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getProductByIdController(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.tenant!.organizationId;
    const product = await prisma.product.findFirst({
      where: { id: String(req.params.id), organizationId: orgId },
      include: {
        category: true,
        baseUnit: true,
        variants: true,
        inventoryBalances: {
          include: { location: { include: { warehouse: true } } },
        },
        stockMovementLines: {
          include: {
            movement: true,
            fromLocation: { include: { warehouse: true } },
            toLocation: { include: { warehouse: true } },
          },
          orderBy: { movement: { occurredAt: "desc" } },
          take: 25,
        },
      },
    });
    if (!product) {
      throw new AppError(404, "PRODUCT_NOT_FOUND", "Produit introuvable.");
    }
    res.json({ data: product });
  } catch (err) {
    next(err);
  }
}

export async function createProductController(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createProductSchema.parse(req.body);
    const created = await createProductService(
      req.tenant!.organizationId,
      req.auth!.userId,
      req.requestId,
      parsed
    );
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
}

export async function updateProductController(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = updateProductSchema.parse(req.body);
    const updated = await updateProductService(
      req.tenant!.organizationId,
      req.auth!.userId,
      req.requestId,
      String(req.params.id),
      parsed
    );
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}

export async function listCategoriesController(req: Request, res: Response, next: NextFunction) {
  try {
    const categories = await prisma.category.findMany({
      where: { organizationId: req.tenant!.organizationId },
      include: { _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    });
    res.json({ data: categories });
  } catch (err) {
    next(err);
  }
}

export async function createCategoryController(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createCategorySchema.parse(req.body);
    const created = await createCategoryService(req.tenant!.organizationId, parsed);
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
}

export async function listUnitsController(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.tenant!.organizationId;
    const [units, conversions] = await Promise.all([
      prisma.unitOfMeasure.findMany({
        where: { OR: [{ organizationId: null }, { organizationId: orgId }] },
        orderBy: { code: "asc" },
      }),
      prisma.unitConversion.findMany({
        where: { organizationId: orgId },
        include: { fromUnit: true, toUnit: true },
      }),
    ]);
    res.json({ data: { units, conversions } });
  } catch (err) {
    next(err);
  }
}

export async function createUnitController(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createUnitSchema.parse(req.body);
    const orgId = req.tenant!.organizationId;
    const unit = await prisma.unitOfMeasure.create({
      data: {
        organizationId: orgId,
        code: parsed.code,
        name: parsed.name,
        dimension: parsed.dimension,
        precision: parsed.precision,
      },
    });
    res.status(201).json({ data: unit });
  } catch (err) {
    next(err);
  }
}

export async function createUnitConversionController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parsed = createUnitConversionSchema.parse(req.body);
    const conversion = await createUnitConversionService(req.tenant!.organizationId, parsed);
    res.status(201).json({ data: conversion });
  } catch (err) {
    next(err);
  }
}

export async function exportProductsCsvController(req: Request, res: Response, next: NextFunction) {
  try {
    const csv = await exportProductsCsvService(req.tenant!.organizationId);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="gstock-products.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
}

export async function importProductsCsvController(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = importProductsCsvSchema.parse(req.body);
    const result = await importProductsCsvService(
      req.tenant!.organizationId,
      req.auth!.userId,
      req.requestId,
      parsed.csvContent
    );
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}
