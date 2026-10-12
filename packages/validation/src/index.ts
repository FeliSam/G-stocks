import { z } from "zod";
import { getContrastRatio, isValidHexColor } from "@g-stock/config";

export const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#([0-9a-fA-F]{6})$/, "Couleur hexadécimale invalide (format attendu : #RRGGBB)");

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(120).optional(),
  sortBy: z.string().trim().max(40).optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse email invalide"),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .max(128, "Le mot de passe est trop long"),
  name: z.string().trim().min(2, "Le nom est requis").max(100),
  organizationName: z.string().trim().min(2, "Le nom de l'entreprise est requis").max(120).optional(),
  industryProfile: z
    .enum([
      "retail",
      "wholesale",
      "logistics",
      "restaurant",
      "pharmacy",
      "apparel",
      "automotive",
      "construction",
      "manufacturing",
      "general",
    ])
    .default("general"),
  countryCode: z.string().trim().length(2).toUpperCase().default("FR"),
  defaultCurrency: z.string().trim().length(3).toUpperCase().default("EUR"),
  timezone: z.string().trim().min(2).max(64).default("Europe/Paris"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2, "Nom de l'organisation requis").max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, "Le slug ne peut contenir que des lettres minuscules, chiffres et tirets")
    .min(2)
    .max(60)
    .optional(),
  industryProfile: z
    .enum([
      "retail",
      "wholesale",
      "logistics",
      "restaurant",
      "pharmacy",
      "apparel",
      "automotive",
      "construction",
      "manufacturing",
      "general",
    ])
    .default("general"),
  countryCode: z.string().trim().length(2).toUpperCase().default("FR"),
  defaultCurrency: z.string().trim().length(3).toUpperCase().default("EUR"),
  timezone: z.string().trim().min(2).max(64).default("Europe/Paris"),
  locale: z.string().trim().min(2).max(16).default("fr-FR"),
  negativeStockPolicy: z.enum(["FORBID", "WARN", "ALLOW"]).default("FORBID"),
  costingMethod: z.enum(["WAC", "FIFO", "STANDARD"]).default("WAC"),
});

export const updateOrganizationSettingsSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  industryProfile: z
    .enum([
      "retail",
      "wholesale",
      "logistics",
      "restaurant",
      "pharmacy",
      "apparel",
      "automotive",
      "construction",
      "manufacturing",
      "general",
    ])
    .optional(),
  countryCode: z.string().trim().length(2).toUpperCase().optional(),
  defaultCurrency: z.string().trim().length(3).toUpperCase().optional(),
  timezone: z.string().trim().min(2).max(64).optional(),
  locale: z.string().trim().min(2).max(16).optional(),
  negativeStockPolicy: z.enum(["FORBID", "WARN", "ALLOW"]).optional(),
  costingMethod: z.enum(["WAC", "FIFO", "STANDARD"]).optional(),
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Nom de catégorie requis").max(100),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_-]+$/, "Code catégorie alphanumérique")
    .min(1)
    .max(32),
  parentId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().default(true),
});

export const createUnitSchema = z.object({
  code: z.string().trim().toUpperCase().min(1).max(16),
  name: z.string().trim().min(1).max(64),
  dimension: z.enum(["COUNT", "MASS", "VOLUME", "LENGTH", "AREA"]).default("COUNT"),
  precision: z.number().int().min(0).max(4).default(2),
});

export const createUnitConversionSchema = z.object({
  fromUnitId: z.string().uuid(),
  toUnitId: z.string().uuid(),
  factor: z.coerce.number().positive("Le facteur de conversion doit être strictement positif"),
});

export const createProductSchema = z.object({
  sku: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, "Le code SKU est obligatoire")
    .max(64)
    .regex(/^[A-Z0-9._-]+$/, "Le SKU ne peut contenir que lettres, chiffres, tirets, points et underscores"),
  name: z.string().trim().min(2, "Le nom du produit est obligatoire").max(160),
  description: z.string().trim().max(1000).optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  baseUnitId: z.string().uuid("L'unité de mesure de base est requise"),
  costPrice: z.coerce.number().min(0, "Le prix de revient ne peut pas être négatif").default(0),
  reorderLevel: z.coerce.number().min(0, "Le seuil d'alerte ne peut pas être négatif").default(5),
  trackingMode: z.enum(["STANDARD", "LOT_EXPIRY", "SERIAL", "VARIANT"]).default("STANDARD"),
  isActive: z.boolean().default(true),
  variants: z
    .array(
      z.object({
        sku: z.string().trim().toUpperCase().min(1).max(64),
        attributes: z.record(z.string(), z.string().max(64)),
      })
    )
    .optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const createWarehouseSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, "Le code entrepôt est requis")
    .max(32)
    .regex(/^[A-Z0-9_-]+$/),
  name: z.string().trim().min(2, "Le nom de l'entrepôt est requis").max(120),
  isActive: z.boolean().default(true),
  defaultLocations: z
    .array(
      z.object({
        code: z.string().trim().toUpperCase().min(1).max(32),
        locationType: z.enum(["STORAGE", "RECEIVING", "SHIPPING", "QUARANTINE"]).default("STORAGE"),
      })
    )
    .optional(),
});

export const createLocationSchema = z.object({
  warehouseId: z.string().uuid(),
  code: z.string().trim().toUpperCase().min(1).max(32),
  locationType: z.enum(["STORAGE", "RECEIVING", "SHIPPING", "QUARANTINE"]).default("STORAGE"),
  isActive: z.boolean().default(true),
});

export const stockReceiptSchema = z.object({
  reference: z.string().trim().min(1, "Référence requise").max(80),
  occurredAt: z.string().datetime().optional(),
  idempotencyKey: z.string().trim().min(4).max(128),
  notes: z.string().trim().max(500).optional(),
  lines: z
    .array(
      z.object({
        productId: z.string().uuid(),
        toLocationId: z.string().uuid("Emplacement de destination requis"),
        quantity: z.coerce.number().positive("La quantité reçue doit être strictement supérieure à 0"),
        unitCost: z.coerce.number().min(0, "Le coût unitaire ne peut pas être négatif").optional(),
      })
    )
    .min(1, "Au moins une ligne de mouvement est requise"),
});

export const stockIssueSchema = z.object({
  reference: z.string().trim().min(1, "Référence requise").max(80),
  occurredAt: z.string().datetime().optional(),
  idempotencyKey: z.string().trim().min(4).max(128),
  notes: z.string().trim().max(500).optional(),
  lines: z
    .array(
      z.object({
        productId: z.string().uuid(),
        fromLocationId: z.string().uuid("Emplacement source requis"),
        quantity: z.coerce.number().positive("La quantité sortie doit être strictement supérieure à 0"),
      })
    )
    .min(1, "Au moins une ligne de sortie est requise"),
});

export const stockTransferSchema = z.object({
  reference: z.string().trim().min(1, "Référence requise").max(80),
  occurredAt: z.string().datetime().optional(),
  idempotencyKey: z.string().trim().min(4).max(128),
  notes: z.string().trim().max(500).optional(),
  lines: z
    .array(
      z
        .object({
          productId: z.string().uuid(),
          fromLocationId: z.string().uuid("Emplacement source requis"),
          toLocationId: z.string().uuid("Emplacement destination requis"),
          quantity: z.coerce.number().positive("La quantité transférée doit être strictement positive"),
        })
        .refine((line) => line.fromLocationId !== line.toLocationId, {
          message: "L'emplacement source et l'emplacement de destination doivent être différents",
          path: ["toLocationId"],
        })
    )
    .min(1, "Au moins une ligne de transfert est requise"),
});

export const stockAdjustmentSchema = z.object({
  reference: z.string().trim().min(1, "Référence requise").max(80),
  occurredAt: z.string().datetime().optional(),
  idempotencyKey: z.string().trim().min(4).max(128),
  reason: z.string().trim().min(3, "Un motif d'ajustement est obligatoire").max(300),
  lines: z
    .array(
      z.object({
        productId: z.string().uuid(),
        locationId: z.string().uuid(),
        quantityDelta: z.coerce
          .number()
          .refine((val) => val !== 0, "La variation de quantité ne peut pas être nulle"),
        unitCost: z.coerce.number().min(0).optional(),
      })
    )
    .min(1, "Au moins une ligne d'ajustement est requise"),
});

export const createInventorySchema = z.object({
  warehouseId: z.string().uuid("L'entrepôt est requis"),
  notes: z.string().trim().max(500).optional(),
  locationIds: z.array(z.string().uuid()).optional(),
});

export const submitInventoryCountsSchema = z.object({
  lines: z
    .array(
      z.object({
        productId: z.string().uuid(),
        locationId: z.string().uuid(),
        countedQuantity: z.coerce.number().min(0, "La quantité comptée ne peut pas être négative"),
      })
    )
    .min(1, "Au moins une ligne comptée est requise"),
});

const allowedDesignTokenColorKeys = [
  "--color-primary",
  "--color-primary-foreground",
  "--color-secondary",
  "--color-accent",
  "--color-background",
  "--color-surface",
  "--color-surface-muted",
  "--color-text",
  "--color-text-muted",
  "--color-border",
  "--color-success",
  "--color-warning",
  "--color-danger",
  "--color-info",
] as const;

export const designTokensPartialSchema = z
  .record(z.string(), z.string())
  .superRefine((tokens, ctx) => {
    for (const [key, val] of Object.entries(tokens)) {
      if (!allowedDesignTokenColorKeys.includes(key as (typeof allowedDesignTokenColorKeys)[number])) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Token CSS non autorisé : ${key}`,
          path: [key],
        });
        continue;
      }
      if (!isValidHexColor(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `La valeur du token ${key} doit être une couleur hexadécimale stricte (#RRGGBB)`,
          path: [key],
        });
      }
    }

    const bg = tokens["--color-background"];
    const text = tokens["--color-text"];
    if (bg && text && isValidHexColor(bg) && isValidHexColor(text)) {
      const ratio = getContrastRatio(bg, text);
      if (ratio < 4.5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Contraste insuffisant WCAG 2.2 AA (${ratio}:1 < 4.5:1) entre le fond et le texte principal.`,
          path: ["--color-text"],
        });
      }
    }
  });

export const updateAppearanceSchema = z.object({
  displayName: z.string().trim().min(1).max(120).optional(),
  themePreset: z
    .enum(["gstock-classic", "ocean", "graphite", "violet", "sand", "high-contrast"])
    .default("gstock-classic"),
  colorModeDefault: z.enum(["light", "dark", "system"]).default("light"),
  cardStyle: z.enum(["standard", "bordered", "elevated"]).default("standard"),
  radiusScale: z.enum(["compact", "standard", "rounded"]).default("standard"),
  tableDensity: z.enum(["comfortable", "standard", "compact"]).default("standard"),
  fontScale: z.enum(["small", "standard", "large"]).default("standard"),
  sidebarStyle: z.enum(["standard", "compact"]).default("standard"),
  forceBrandTheme: z.boolean().default(false),
  designTokens: designTokensPartialSchema.optional().default({}),
});

export const updateUserPreferencesSchema = z.object({
  colorMode: z.enum(["light", "dark", "system"]).optional(),
  tableDensity: z.enum(["comfortable", "standard", "compact"]).optional(),
  sidebarCollapsed: z.boolean().optional(),
  locale: z.string().trim().min(2).max(16).optional(),
  reducedMotion: z.boolean().optional(),
  mobileTableLayout: z.enum(["cards", "scroll"]).optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse email invalide"),
  name: z.string().trim().min(2).max(100).optional(),
  roleCode: z
    .enum(["owner", "org_admin", "stock_manager", "warehouse_clerk", "auditor"])
    .default("warehouse_clerk"),
});
