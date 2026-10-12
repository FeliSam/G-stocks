import type {
  CardStyle,
  ColorMode,
  DesignTokens,
  FontScale,
  IndustryProfile,
  PermissionCode,
  RadiusScale,
  SidebarStyle,
  SystemRoleCode,
  TableDensity,
  ThemePresetId,
} from "@g-stock/types";

export const ALL_PERMISSIONS: { code: PermissionCode; name: string; category: string }[] = [
  { code: "products.read", name: "Consulter le catalogue produits", category: "Catalogue" },
  { code: "products.create", name: "Créer des produits et catégories", category: "Catalogue" },
  { code: "products.update", name: "Modifier des produits", category: "Catalogue" },
  { code: "products.archive", name: "Archiver des produits", category: "Catalogue" },
  { code: "stock.read", name: "Consulter les soldes et mouvements", category: "Stock" },
  { code: "stock.receive", name: "Enregistrer des réceptions", category: "Stock" },
  { code: "stock.issue", name: "Enregistrer des sorties", category: "Stock" },
  { code: "stock.transfer", name: "Effectuer des transferts inter-emplacements", category: "Stock" },
  { code: "stock.adjust", name: "Valider des ajustements et contrepassations", category: "Stock" },
  { code: "inventory.create", name: "Ouvrir une campagne d'inventaire", category: "Inventaire" },
  { code: "inventory.count", name: "Saisir des comptages d'inventaire", category: "Inventaire" },
  { code: "inventory.validate", name: "Valider les écarts d'inventaire", category: "Inventaire" },
  { code: "warehouses.manage", name: "Gérer les entrepôts et emplacements", category: "Logistique" },
  { code: "members.manage", name: "Gérer les membres, invitations et rôles", category: "Administration" },
  { code: "settings.manage", name: "Gérer les paramètres de l'organisation", category: "Administration" },
  { code: "appearance.manage", name: "Personnaliser le thème et la marque", category: "Apparence" },
  { code: "billing.read", name: "Consulter l'abonnement et les quotas", category: "Facturation" },
  { code: "billing.manage", name: "Gérer l'abonnement et la facturation", category: "Facturation" },
  { code: "reports.read", name: "Consulter les rapports et KPI avancés", category: "Rapports" },
  { code: "audit.read", name: "Consulter le journal d'audit", category: "Sécurité" },
  { code: "platform.admin", name: "Administration globale de la plateforme G-Stock", category: "Plateforme" },
];

export const DEFAULT_ROLE_PERMISSIONS: Record<SystemRoleCode, PermissionCode[]> = {
  platform_admin: ALL_PERMISSIONS.map((p) => p.code),
  owner: ALL_PERMISSIONS.filter((p) => p.code !== "platform.admin").map((p) => p.code),
  org_admin: ALL_PERMISSIONS.filter(
    (p) => p.code !== "platform.admin" && p.code !== "billing.manage"
  ).map((p) => p.code),
  stock_manager: [
    "products.read",
    "products.create",
    "products.update",
    "products.archive",
    "stock.read",
    "stock.receive",
    "stock.issue",
    "stock.transfer",
    "stock.adjust",
    "inventory.create",
    "inventory.count",
    "inventory.validate",
    "warehouses.manage",
    "reports.read",
  ],
  warehouse_clerk: [
    "products.read",
    "stock.read",
    "stock.receive",
    "stock.issue",
    "stock.transfer",
    "inventory.count",
  ],
  auditor: [
    "products.read",
    "stock.read",
    "reports.read",
    "audit.read",
    "billing.read",
  ],
  custom: ["products.read", "stock.read"],
};

export interface ThemePresetDefinition {
  id: ThemePresetId;
  name: string;
  description: string;
  light: Omit<
    DesignTokens,
    "--radius-card" | "--radius-control" | "--sidebar-width" | "--table-density" | "--font-scale"
  >;
  dark: Omit<
    DesignTokens,
    "--radius-card" | "--radius-control" | "--sidebar-width" | "--table-density" | "--font-scale"
  >;
}

export const THEME_PRESETS: Record<ThemePresetId, ThemePresetDefinition> = {
  "gstock-classic": {
    id: "gstock-classic",
    name: "G-Stock Classic",
    description: "Neutre professionnel, blanc pur et vert émeraude équilibré.",
    light: {
      "--color-primary": "#047857",
      "--color-primary-foreground": "#ffffff",
      "--color-secondary": "#0f766e",
      "--color-accent": "#10b981",
      "--color-background": "#f8fafc",
      "--color-surface": "#ffffff",
      "--color-surface-muted": "#f1f5f9",
      "--color-text": "#0f172a",
      "--color-text-muted": "#475569",
      "--color-border": "#e2e8f0",
      "--color-success": "#15803d",
      "--color-warning": "#b45309",
      "--color-danger": "#b91c1c",
      "--color-info": "#0369a1",
    },
    dark: {
      "--color-primary": "#10b981",
      "--color-primary-foreground": "#022c22",
      "--color-secondary": "#14b8a6",
      "--color-accent": "#34d399",
      "--color-background": "#090d16",
      "--color-surface": "#111827",
      "--color-surface-muted": "#1e293b",
      "--color-text": "#f8fafc",
      "--color-text-muted": "#94a3b8",
      "--color-border": "#334155",
      "--color-success": "#22c55e",
      "--color-warning": "#f59e0b",
      "--color-danger": "#ef4444",
      "--color-info": "#38bdf8",
    },
  },
  ocean: {
    id: "ocean",
    name: "Ocean",
    description: "Bleu profond et cyan lumineux adapté à la logistique et distribution.",
    light: {
      "--color-primary": "#0369a1",
      "--color-primary-foreground": "#ffffff",
      "--color-secondary": "#0e7490",
      "--color-accent": "#0284c7",
      "--color-background": "#f0f9ff",
      "--color-surface": "#ffffff",
      "--color-surface-muted": "#e0f2fe",
      "--color-text": "#0c4a6e",
      "--color-text-muted": "#334155",
      "--color-border": "#bae6fd",
      "--color-success": "#15803d",
      "--color-warning": "#b45309",
      "--color-danger": "#b91c1c",
      "--color-info": "#0284c7",
    },
    dark: {
      "--color-primary": "#38bdf8",
      "--color-primary-foreground": "#082f49",
      "--color-secondary": "#22d3ee",
      "--color-accent": "#0ea5e9",
      "--color-background": "#081420",
      "--color-surface": "#0f2236",
      "--color-surface-muted": "#16304b",
      "--color-text": "#f0f9ff",
      "--color-text-muted": "#93c5fd",
      "--color-border": "#1e3a5f",
      "--color-success": "#22c55e",
      "--color-warning": "#f59e0b",
      "--color-danger": "#f87171",
      "--color-info": "#38bdf8",
    },
  },
  graphite: {
    id: "graphite",
    name: "Graphite",
    description: "Gris ardoise sobre, noir industriel et contraste technique.",
    light: {
      "--color-primary": "#18181b",
      "--color-primary-foreground": "#ffffff",
      "--color-secondary": "#3f3f46",
      "--color-accent": "#2563eb",
      "--color-background": "#f4f4f5",
      "--color-surface": "#ffffff",
      "--color-surface-muted": "#e4e4e7",
      "--color-text": "#09090b",
      "--color-text-muted": "#52525b",
      "--color-border": "#d4d4d8",
      "--color-success": "#15803d",
      "--color-warning": "#b45309",
      "--color-danger": "#b91c1c",
      "--color-info": "#1d4ed8",
    },
    dark: {
      "--color-primary": "#e4e4e7",
      "--color-primary-foreground": "#09090b",
      "--color-secondary": "#a1a1aa",
      "--color-accent": "#60a5fa",
      "--color-background": "#09090b",
      "--color-surface": "#18181b",
      "--color-surface-muted": "#27272a",
      "--color-text": "#fafafa",
      "--color-text-muted": "#a1a1aa",
      "--color-border": "#3f3f46",
      "--color-success": "#22c55e",
      "--color-warning": "#f59e0b",
      "--color-danger": "#ef4444",
      "--color-info": "#60a5fa",
    },
  },
  violet: {
    id: "violet",
    name: "Violet",
    description: "Violet soutenu et lavande moderne pour retail, mode et cosmétique.",
    light: {
      "--color-primary": "#6d28d9",
      "--color-primary-foreground": "#ffffff",
      "--color-secondary": "#4f46e5",
      "--color-accent": "#8b5cf6",
      "--color-background": "#faf5ff",
      "--color-surface": "#ffffff",
      "--color-surface-muted": "#f3e8ff",
      "--color-text": "#1e1b4b",
      "--color-text-muted": "#4c1d95",
      "--color-border": "#e9d5ff",
      "--color-success": "#15803d",
      "--color-warning": "#b45309",
      "--color-danger": "#b91c1c",
      "--color-info": "#4338ca",
    },
    dark: {
      "--color-primary": "#a78bfa",
      "--color-primary-foreground": "#1e1b4b",
      "--color-secondary": "#818cf8",
      "--color-accent": "#c084fc",
      "--color-background": "#0f0a1c",
      "--color-surface": "#1a1230",
      "--color-surface-muted": "#261a45",
      "--color-text": "#faf5ff",
      "--color-text-muted": "#c4b5fd",
      "--color-border": "#3b2766",
      "--color-success": "#22c55e",
      "--color-warning": "#f59e0b",
      "--color-danger": "#f87171",
      "--color-info": "#818cf8",
    },
  },
  sand: {
    id: "sand",
    name: "Sand",
    description: "Tons chauds, pierre et ambre adaptés à l'artisanat, restauration et négoce.",
    light: {
      "--color-primary": "#9a3412",
      "--color-primary-foreground": "#ffffff",
      "--color-secondary": "#78350f",
      "--color-accent": "#d97706",
      "--color-background": "#fafaf9",
      "--color-surface": "#ffffff",
      "--color-surface-muted": "#f5f5f4",
      "--color-text": "#1c1917",
      "--color-text-muted": "#57534e",
      "--color-border": "#e7e5e4",
      "--color-success": "#15803d",
      "--color-warning": "#b45309",
      "--color-danger": "#b91c1c",
      "--color-info": "#0369a1",
    },
    dark: {
      "--color-primary": "#fb923c",
      "--color-primary-foreground": "#2a1205",
      "--color-secondary": "#fbbf24",
      "--color-accent": "#f59e0b",
      "--color-background": "#141210",
      "--color-surface": "#1c1917",
      "--color-surface-muted": "#292524",
      "--color-text": "#fafaf9",
      "--color-text-muted": "#a8a29e",
      "--color-border": "#44403c",
      "--color-success": "#22c55e",
      "--color-warning": "#fbbf24",
      "--color-danger": "#f87171",
      "--color-info": "#38bdf8",
    },
  },
  "high-contrast": {
    id: "high-contrast",
    name: "High Contrast",
    description: "Contraste maximal certifié WCAG AAA pour entrepôts lumineux et malvoyance.",
    light: {
      "--color-primary": "#0038a8",
      "--color-primary-foreground": "#ffffff",
      "--color-secondary": "#000000",
      "--color-accent": "#0044cc",
      "--color-background": "#ffffff",
      "--color-surface": "#ffffff",
      "--color-surface-muted": "#f0f0f0",
      "--color-text": "#000000",
      "--color-text-muted": "#1f2937",
      "--color-border": "#000000",
      "--color-success": "#005a1e",
      "--color-warning": "#7c2d12",
      "--color-danger": "#990000",
      "--color-info": "#003380",
    },
    dark: {
      "--color-primary": "#ffff00",
      "--color-primary-foreground": "#000000",
      "--color-secondary": "#00ffff",
      "--color-accent": "#ffff00",
      "--color-background": "#000000",
      "--color-surface": "#0a0a0a",
      "--color-surface-muted": "#171717",
      "--color-text": "#ffffff",
      "--color-text-muted": "#e5e5e5",
      "--color-border": "#ffffff",
      "--color-success": "#4ade80",
      "--color-warning": "#facc15",
      "--color-danger": "#ff5555",
      "--color-info": "#38bdf8",
    },
  },
};

export const RADIUS_SCALE_TOKENS: Record<
  RadiusScale,
  { "--radius-card": string; "--radius-control": string }
> = {
  compact: { "--radius-card": "0.25rem", "--radius-control": "0.2rem" },
  standard: { "--radius-card": "0.625rem", "--radius-control": "0.375rem" },
  rounded: { "--radius-card": "1rem", "--radius-control": "0.625rem" },
};

export const TABLE_DENSITY_TOKENS: Record<TableDensity, string> = {
  comfortable: "0.875rem 1.25rem",
  standard: "0.625rem 1rem",
  compact: "0.375rem 0.625rem",
};

export const FONT_SCALE_TOKENS: Record<FontScale, string> = {
  small: "0.9375",
  standard: "1",
  large: "1.0625",
};

export const SIDEBAR_WIDTH_TOKENS: Record<SidebarStyle, string> = {
  standard: "16.5rem",
  compact: "13rem",
};

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{6})$/;

export function isValidHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_COLOR_REGEX.test(value.trim());
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  if (!isValidHexColor(hex)) return null;
  const clean = hex.slice(1);
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const transform = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const R = transform(rgb.r);
  const G = transform(rgb.g);
  const B = transform(rgb.b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

export function deriveAccessibleForeground(bgHex: string): string {
  const whiteRatio = getContrastRatio(bgHex, "#ffffff");
  const darkRatio = getContrastRatio(bgHex, "#090d16");
  return whiteRatio >= 4.5 || whiteRatio >= darkRatio ? "#ffffff" : "#090d16";
}

export function resolveDesignTokens(options: {
  preset?: ThemePresetId;
  mode?: "light" | "dark";
  customColors?: Partial<Record<keyof DesignTokens, string>>;
  radiusScale?: RadiusScale;
  tableDensity?: TableDensity;
  fontScale?: FontScale;
  sidebarStyle?: SidebarStyle;
}): DesignTokens {
  const preset = THEME_PRESETS[options.preset || "gstock-classic"] || THEME_PRESETS["gstock-classic"];
  const baseColors = options.mode === "dark" ? preset.dark : preset.light;
  const radius = RADIUS_SCALE_TOKENS[options.radiusScale || "standard"] || RADIUS_SCALE_TOKENS.standard;
  const density = TABLE_DENSITY_TOKENS[options.tableDensity || "standard"] || TABLE_DENSITY_TOKENS.standard;
  const fontScale = FONT_SCALE_TOKENS[options.fontScale || "standard"] || FONT_SCALE_TOKENS.standard;
  const sidebarWidth = SIDEBAR_WIDTH_TOKENS[options.sidebarStyle || "standard"] || SIDEBAR_WIDTH_TOKENS.standard;

  const mergedColors = { ...baseColors };
  if (options.customColors) {
    const allowedColorKeys = Object.keys(baseColors) as Array<keyof typeof baseColors>;
    for (const key of allowedColorKeys) {
      const candidate = options.customColors[key];
      if (candidate && isValidHexColor(candidate)) {
        mergedColors[key] = candidate.toLowerCase();
      }
    }
    if (options.customColors["--color-primary"] && !options.customColors["--color-primary-foreground"]) {
      mergedColors["--color-primary-foreground"] = deriveAccessibleForeground(
        mergedColors["--color-primary"]
      );
    }
  }

  return {
    ...mergedColors,
    ...radius,
    "--table-density": density,
    "--font-scale": fontScale,
    "--sidebar-width": sidebarWidth,
  };
}

export const INDUSTRY_PROFILES: Record<
  IndustryProfile,
  {
    code: IndustryProfile;
    label: string;
    description: string;
    recommendedModules: string[];
    defaultUnits: string[];
  }
> = {
  retail: {
    code: "retail",
    label: "Commerce, Boutique & Supermarché",
    description: "Gestion multi-rayons, rotation rapide, alertes de réapprovisionnement.",
    recommendedModules: ["core_inventory", "alerts_kpi", "csv_import_export"],
    defaultUnits: ["UN", "BOX", "PACK", "KG", "L"],
  },
  wholesale: {
    code: "wholesale",
    label: "Grossiste & Distributeur",
    description: "Conditionnements multiples (cartons, palettes), multi-entrepôts et volumes élevés.",
    recommendedModules: ["core_inventory", "multi_warehouse", "unit_conversions", "csv_import_export"],
    defaultUnits: ["UN", "BOX", "PAL", "KG"],
  },
  logistics: {
    code: "logistics",
    label: "Entrepôt & Logistique",
    description: "Emplacements précis (allées, travées), transferts rapides et inventaires tournants.",
    recommendedModules: ["core_inventory", "multi_warehouse", "advanced_locations", "audit_trail"],
    defaultUnits: ["UN", "BOX", "PAL", "KG", "M3"],
  },
  restaurant: {
    code: "restaurant",
    label: "Restaurant & Métiers de bouche",
    description: "Matières premières périssables, conversions masse/volume, suivi des pertes.",
    recommendedModules: ["core_inventory", "unit_conversions", "lot_expiry_tracking"],
    defaultUnits: ["KG", "G", "L", "ML", "UN"],
  },
  pharmacy: {
    code: "pharmacy",
    label: "Pharmacie & Secteur réglementé",
    description: "Traçabilité stricte, audit renforcé, interdiction stricte du stock négatif.",
    recommendedModules: ["core_inventory", "lot_expiry_tracking", "audit_trail"],
    defaultUnits: ["UN", "BOX", "ML", "G"],
  },
  apparel: {
    code: "apparel",
    label: "Vêtements, Chaussures & Mode",
    description: "Catalogue structuré avec déclinaisons tailles/couleurs et saisonnalité.",
    recommendedModules: ["core_inventory", "product_variants", "csv_import_export"],
    defaultUnits: ["UN", "PAIR", "BOX"],
  },
  automotive: {
    code: "automotive",
    label: "Pièces Automobiles & Maintenance",
    description: "Références techniques OEM, compatibilités et stockage en casiers.",
    recommendedModules: ["core_inventory", "advanced_locations", "custom_attributes"],
    defaultUnits: ["UN", "SET", "L", "KG"],
  },
  construction: {
    code: "construction",
    label: "Construction, BTP & Matériaux",
    description: "Unités physiques variées (m², m³, tonnes, sacs) et dépôts chantiers.",
    recommendedModules: ["core_inventory", "multi_warehouse", "unit_conversions"],
    defaultUnits: ["UN", "BAG", "KG", "T", "M", "M2", "M3"],
  },
  manufacturing: {
    code: "manufacturing",
    label: "Industrie & Matières Premières",
    description: "Suivi des composants, matières premières, produits finis et valorisation.",
    recommendedModules: ["core_inventory", "multi_warehouse", "unit_conversions", "audit_trail"],
    defaultUnits: ["UN", "KG", "L", "M"],
  },
  general: {
    code: "general",
    label: "Activité Générale Configurable",
    description: "Configuration équilibrée universelle adaptable à tout secteur d'activité.",
    recommendedModules: ["core_inventory", "alerts_kpi", "csv_import_export"],
    defaultUnits: ["UN", "BOX", "KG", "L"],
  },
};

export interface SaasPlanCatalogItem {
  code: string;
  name: string;
  priceMonthly: string;
  currency: string;
  description: string;
  limits: {
    max_members: number;
    max_warehouses: number;
    max_products: number;
    custom_branding: boolean;
    multi_warehouse: boolean;
    audit_logs: boolean;
    csv_import_export: boolean;
  };
}

export const DEFAULT_SAAS_PLANS: SaasPlanCatalogItem[] = [
  {
    code: "starter",
    name: "Starter",
    priceMonthly: "29.00",
    currency: "EUR",
    description: "Idéal pour une boutique ou un entrepôt unique démarrant sa structuration.",
    limits: {
      max_members: 3,
      max_warehouses: 1,
      max_products: 250,
      custom_branding: false,
      multi_warehouse: false,
      audit_logs: true,
      csv_import_export: true,
    },
  },
  {
    code: "pro",
    name: "Business Pro",
    priceMonthly: "79.00",
    currency: "EUR",
    description: "Conçu pour les PME multi-entrepôts avec personnalisation de marque complète.",
    limits: {
      max_members: 15,
      max_warehouses: 5,
      max_products: 5000,
      custom_branding: true,
      multi_warehouse: true,
      audit_logs: true,
      csv_import_export: true,
    },
  },
  {
    code: "enterprise",
    name: "Enterprise",
    priceMonthly: "199.00",
    currency: "EUR",
    description: "Capacité étendue, multi-sites illimités, gouvernance et audit complets.",
    limits: {
      max_members: 100,
      max_warehouses: 50,
      max_products: 100000,
      custom_branding: true,
      multi_warehouse: true,
      audit_logs: true,
      csv_import_export: true,
    },
  },
];
