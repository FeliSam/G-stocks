import { Router } from "express";
import {
  requireAuth,
  requireTenant,
  requirePermission,
} from "../../middleware/auth-tenant.js";
import { PRODUCTS_PERMISSIONS } from "./products.permissions.js";
import {
  listProductsController,
  getProductByIdController,
  createProductController,
  updateProductController,
  listCategoriesController,
  createCategoryController,
  listUnitsController,
  createUnitController,
  createUnitConversionController,
  exportProductsCsvController,
  importProductsCsvController,
} from "./products.controller.js";

export const productsRouter = Router();

productsRouter.get(
  "/products",
  requireAuth,
  requireTenant,
  requirePermission(PRODUCTS_PERMISSIONS.READ),
  listProductsController
);

productsRouter.get(
  "/products/export/csv",
  requireAuth,
  requireTenant,
  requirePermission(PRODUCTS_PERMISSIONS.READ),
  exportProductsCsvController
);

productsRouter.post(
  "/products/import/csv",
  requireAuth,
  requireTenant,
  requirePermission(PRODUCTS_PERMISSIONS.CREATE),
  importProductsCsvController
);

productsRouter.get(
  "/products/:id",
  requireAuth,
  requireTenant,
  requirePermission(PRODUCTS_PERMISSIONS.READ),
  getProductByIdController
);

productsRouter.post(
  "/products",
  requireAuth,
  requireTenant,
  requirePermission(PRODUCTS_PERMISSIONS.CREATE),
  createProductController
);

productsRouter.patch(
  "/products/:id",
  requireAuth,
  requireTenant,
  requirePermission(PRODUCTS_PERMISSIONS.UPDATE),
  updateProductController
);

productsRouter.get(
  "/categories",
  requireAuth,
  requireTenant,
  requirePermission(PRODUCTS_PERMISSIONS.READ),
  listCategoriesController
);

productsRouter.post(
  "/categories",
  requireAuth,
  requireTenant,
  requirePermission(PRODUCTS_PERMISSIONS.CREATE),
  createCategoryController
);

productsRouter.get(
  "/units",
  requireAuth,
  requireTenant,
  requirePermission(PRODUCTS_PERMISSIONS.READ),
  listUnitsController
);

productsRouter.post(
  "/units",
  requireAuth,
  requireTenant,
  requirePermission(PRODUCTS_PERMISSIONS.CREATE),
  createUnitController
);

productsRouter.post(
  "/units/conversions",
  requireAuth,
  requireTenant,
  requirePermission(PRODUCTS_PERMISSIONS.CREATE),
  createUnitConversionController
);
