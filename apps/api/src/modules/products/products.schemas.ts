import { z } from "zod";
import {
  createProductSchema,
  updateProductSchema,
  createCategorySchema,
  createUnitSchema,
  createUnitConversionSchema,
  paginationQuerySchema,
} from "@g-stock/validation";

export const listProductsQuerySchema = paginationQuerySchema.extend({
  categoryId: z.string().uuid().optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  stockStatus: z.enum(["all", "low", "out", "ok"]).default("all"),
  sortBy: z.enum(["name", "sku", "costPrice", "createdAt"]).default("createdAt"),
});

export const importProductsCsvSchema = z.object({
  csvContent: z.string().min(5, "Contenu CSV requis"),
});

export {
  createProductSchema,
  updateProductSchema,
  createCategorySchema,
  createUnitSchema,
  createUnitConversionSchema,
};
