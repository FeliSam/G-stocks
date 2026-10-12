import type { PermissionCode } from "@g-stock/types";

export const STOCK_PERMISSIONS: Record<string, PermissionCode> = {
  READ: "stock.read",
  RECEIVE: "stock.receive",
  ISSUE: "stock.issue",
  TRANSFER: "stock.transfer",
  ADJUST: "stock.adjust",
};
