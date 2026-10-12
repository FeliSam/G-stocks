import { z } from "zod";
import {
  stockReceiptSchema,
  stockIssueSchema,
  stockTransferSchema,
  stockAdjustmentSchema,
  paginationQuerySchema,
} from "@g-stock/validation";

export const listMovementsQuerySchema = paginationQuerySchema.extend({
  movementType: z
    .enum(["receipt", "issue", "transfer", "adjustment", "opening_balance", "reversal"])
    .optional(),
  productId: z.string().uuid().optional(),
  warehouseId: z.string().uuid().optional(),
});

export const listBalancesQuerySchema = z.object({
  warehouseId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  search: z.string().trim().max(120).optional(),
});

export const reverseMovementSchema = z.object({
  idempotencyKey: z.string().trim().min(4).max(128),
  reason: z.string().trim().min(3, "Un motif d'annulation est obligatoire").max(300),
});

export {
  stockReceiptSchema,
  stockIssueSchema,
  stockTransferSchema,
  stockAdjustmentSchema,
};
