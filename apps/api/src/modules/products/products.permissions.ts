import type { PermissionCode } from "@g-stock/types";

export const PRODUCTS_PERMISSIONS: Record<string, PermissionCode> = {
  READ: "products.read",
  CREATE: "products.create",
  UPDATE: "products.update",
  ARCHIVE: "products.archive",
};
