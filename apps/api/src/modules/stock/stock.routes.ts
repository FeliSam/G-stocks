import { Router } from "express";
import {
  requireAuth,
  requireTenant,
  requirePermission,
} from "../../middleware/auth-tenant.js";
import { STOCK_PERMISSIONS } from "./stock.permissions.js";
import {
  listBalancesController,
  listMovementsController,
  createReceiptController,
  createIssueController,
  createTransferController,
  createAdjustmentController,
  reverseMovementController,
} from "./stock.controller.js";

export const stockRouter = Router();

stockRouter.get(
  "/stock/balances",
  requireAuth,
  requireTenant,
  requirePermission(STOCK_PERMISSIONS.READ),
  listBalancesController
);

stockRouter.get(
  "/stock/movements",
  requireAuth,
  requireTenant,
  requirePermission(STOCK_PERMISSIONS.READ),
  listMovementsController
);

stockRouter.post(
  "/stock/receipts",
  requireAuth,
  requireTenant,
  requirePermission(STOCK_PERMISSIONS.RECEIVE),
  createReceiptController
);

stockRouter.post(
  "/stock/issues",
  requireAuth,
  requireTenant,
  requirePermission(STOCK_PERMISSIONS.ISSUE),
  createIssueController
);

stockRouter.post(
  "/stock/transfers",
  requireAuth,
  requireTenant,
  requirePermission(STOCK_PERMISSIONS.TRANSFER),
  createTransferController
);

stockRouter.post(
  "/stock/adjustments",
  requireAuth,
  requireTenant,
  requirePermission(STOCK_PERMISSIONS.ADJUST),
  createAdjustmentController
);

stockRouter.post(
  "/stock/movements/:id/reverse",
  requireAuth,
  requireTenant,
  requirePermission(STOCK_PERMISSIONS.ADJUST),
  reverseMovementController
);
