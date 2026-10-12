export type PermissionCode =
  | "products.read"
  | "products.create"
  | "products.update"
  | "products.archive"
  | "stock.read"
  | "stock.receive"
  | "stock.issue"
  | "stock.transfer"
  | "stock.adjust"
  | "inventory.create"
  | "inventory.count"
  | "inventory.validate"
  | "warehouses.manage"
  | "members.manage"
  | "settings.manage"
  | "billing.read"
  | "billing.manage"
  | "appearance.manage"
  | "reports.read"
  | "audit.read"
  | "platform.admin";

export type SystemRoleCode =
  | "platform_admin"
  | "owner"
  | "org_admin"
  | "stock_manager"
  | "warehouse_clerk"
  | "auditor"
  | "custom";

export type IndustryProfile =
  | "retail"
  | "wholesale"
  | "logistics"
  | "restaurant"
  | "pharmacy"
  | "apparel"
  | "automotive"
  | "construction"
  | "manufacturing"
  | "general";

export type NegativeStockPolicy = "FORBID" | "WARN" | "ALLOW";
export type CostingMethod = "WAC" | "FIFO" | "STANDARD";
export type TrackingMode = "STANDARD" | "LOT_EXPIRY" | "SERIAL" | "VARIANT";

export type StockMovementType =
  | "receipt"
  | "issue"
  | "transfer"
  | "adjustment"
  | "opening_balance"
  | "reversal";

export type StockMovementStatus = "DRAFT" | "VALIDATED" | "REVERSED" | "CANCELED";
export type InventoryStatus = "OPEN" | "COUNTING" | "VALIDATED" | "CANCELED";

export type ThemePresetId =
  | "gstock-classic"
  | "ocean"
  | "graphite"
  | "violet"
  | "sand"
  | "high-contrast";

export type ColorMode = "light" | "dark" | "system";
export type CardStyle = "standard" | "bordered" | "elevated";
export type RadiusScale = "compact" | "standard" | "rounded";
export type TableDensity = "comfortable" | "standard" | "compact";
export type FontScale = "small" | "standard" | "large";
export type SidebarStyle = "standard" | "compact";

export interface DesignTokens {
  "--color-primary": string;
  "--color-primary-foreground": string;
  "--color-secondary": string;
  "--color-accent": string;
  "--color-background": string;
  "--color-surface": string;
  "--color-surface-muted": string;
  "--color-text": string;
  "--color-text-muted": string;
  "--color-border": string;
  "--color-success": string;
  "--color-warning": string;
  "--color-danger": string;
  "--color-info": string;
  "--radius-card": string;
  "--radius-control": string;
  "--sidebar-width": string;
  "--table-density": string;
  "--font-scale": string;
}

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "suspended";

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiErrorShape {
  error: {
    code: string;
    message: string;
    request_id: string;
    details?: unknown;
  };
}
