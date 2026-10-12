import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { Router } from "express";
import { prisma } from "@g-stock/database";
import { THEME_PRESETS, resolveDesignTokens, getContrastRatio } from "@g-stock/config";
import type { DesignTokens, ThemePresetId } from "@g-stock/types";
import { updateAppearanceSchema, updateUserPreferencesSchema } from "@g-stock/validation";
import {
  requireAuth,
  requireTenant,
  requirePermission,
} from "../../middleware/auth-tenant.js";
import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors.js";
import { recordAuditLog } from "../../shared/audit.js";

export const appearanceRouter = Router();

appearanceRouter.get(
  "/settings/appearance",
  requireAuth,
  requireTenant,
  async (req, res, next) => {
    try {
      const orgId = req.tenant!.organizationId;
      const [branding, theme, userPref] = await Promise.all([
        prisma.organizationBranding.findUnique({ where: { organizationId: orgId } }),
        prisma.organizationTheme.findUnique({ where: { organizationId: orgId } }),
        prisma.userPreference.findFirst({
          where: { userId: req.auth!.userId, organizationId: orgId },
        }),
      ]);

      const preset = (theme?.themePreset || "gstock-classic") as ThemePresetId;
      const customColors = (theme?.designTokens || {}) as Partial<DesignTokens>;

      const resolvedLightTokens = resolveDesignTokens({
        preset,
        mode: "light",
        customColors,
        radiusScale: (theme?.radiusScale as "compact" | "standard" | "rounded") || "standard",
        tableDensity: (theme?.tableDensity as "comfortable" | "standard" | "compact") || "standard",
        fontScale: (theme?.fontScale as "small" | "standard" | "large") || "standard",
        sidebarStyle: (theme?.sidebarStyle as "standard" | "compact") || "standard",
      });

      const resolvedDarkTokens = resolveDesignTokens({
        preset,
        mode: "dark",
        customColors,
        radiusScale: (theme?.radiusScale as "compact" | "standard" | "rounded") || "standard",
        tableDensity: (theme?.tableDensity as "comfortable" | "standard" | "compact") || "standard",
        fontScale: (theme?.fontScale as "small" | "standard" | "large") || "standard",
        sidebarStyle: (theme?.sidebarStyle as "standard" | "compact") || "standard",
      });

      res.json({
        data: {
          branding,
          theme,
          userPreference: userPref,
          presetsCatalog: THEME_PRESETS,
          resolvedLightTokens,
          resolvedDarkTokens,
          contrastCheck: {
            lightTextOnBackground: getContrastRatio(
              resolvedLightTokens["--color-background"],
              resolvedLightTokens["--color-text"]
            ),
            primaryButtonContrast: getContrastRatio(
              resolvedLightTokens["--color-primary"],
              resolvedLightTokens["--color-primary-foreground"]
            ),
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

appearanceRouter.put(
  "/settings/appearance",
  requireAuth,
  requireTenant,
  requirePermission("appearance.manage"),
  async (req, res, next) => {
    try {
      const parsed = updateAppearanceSchema.parse(req.body);
      const orgId = req.tenant!.organizationId;

      const updated = await prisma.$transaction(async (tx) => {
        if (parsed.displayName) {
          await tx.organizationBranding.upsert({
            where: { organizationId: orgId },
            update: { displayName: parsed.displayName },
            create: { organizationId: orgId, displayName: parsed.displayName },
          });
        }

        const theme = await tx.organizationTheme.upsert({
          where: { organizationId: orgId },
          update: {
            themePreset: parsed.themePreset,
            colorModeDefault: parsed.colorModeDefault,
            cardStyle: parsed.cardStyle,
            radiusScale: parsed.radiusScale,
            tableDensity: parsed.tableDensity,
            fontScale: parsed.fontScale,
            sidebarStyle: parsed.sidebarStyle,
            forceBrandTheme: parsed.forceBrandTheme,
            designTokens: parsed.designTokens ?? {},
          },
          create: {
            organizationId: orgId,
            themePreset: parsed.themePreset,
            colorModeDefault: parsed.colorModeDefault,
            cardStyle: parsed.cardStyle,
            radiusScale: parsed.radiusScale,
            tableDensity: parsed.tableDensity,
            fontScale: parsed.fontScale,
            sidebarStyle: parsed.sidebarStyle,
            forceBrandTheme: parsed.forceBrandTheme,
            designTokens: parsed.designTokens ?? {},
          },
        });

        const branding = await tx.organizationBranding.findUnique({
          where: { organizationId: orgId },
        });

        await recordAuditLog(
          {
            organizationId: orgId,
            actorUserId: req.auth!.userId,
            action: "appearance.update",
            resourceType: "organization_theme",
            resourceId: orgId,
            requestId: req.requestId,
            metadata: {
              themePreset: parsed.themePreset,
              colorModeDefault: parsed.colorModeDefault,
              forceBrandTheme: parsed.forceBrandTheme,
            },
          },
          tx
        );

        return { theme, branding };
      });

      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  }
);

appearanceRouter.post(
  "/settings/branding/logo",
  requireAuth,
  requireTenant,
  requirePermission("appearance.manage"),
  async (req, res, next) => {
    try {
      const orgId = req.tenant!.organizationId;
      const { fileName, mimeType, fileContentBase64 } = req.body as {
        fileName?: string;
        mimeType?: string;
        fileContentBase64?: string;
      };

      if (!fileName || !mimeType || !fileContentBase64) {
        throw new AppError(400, "INVALID_FILE_PAYLOAD", "Fichier logo manquant ou invalide.");
      }

      const allowedMimes = new Map([
        ["image/png", ".png"],
        ["image/jpeg", ".jpg"],
        ["image/webp", ".webp"],
        ["image/svg+xml", ".svg"],
      ]);
      const ext = allowedMimes.get(mimeType);
      if (!ext) {
        throw new AppError(
          400,
          "UNSUPPORTED_LOGO_FORMAT",
          "Format de logo non supporté. Formats autorisés : PNG, JPEG, WEBP, SVG."
        );
      }

      const cleanBase64 = fileContentBase64.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(cleanBase64, "base64");
      if (buffer.length === 0 || buffer.length > 2 * 1024 * 1024) {
        throw new AppError(
          400,
          "LOGO_FILE_TOO_LARGE",
          "La taille du logo ne doit pas dépasser 2 Mo."
        );
      }

      // Stockage sur le système de fichiers / stockage objet local (jamais de base64 en BDD !)
      const logosDir = path.resolve(env.LOCAL_STORAGE_PATH, "logos", orgId);
      fs.mkdirSync(logosDir, { recursive: true });
      const assetId = `logo-${crypto.randomBytes(8).toString("hex")}${ext}`;
      const targetFile = path.join(logosDir, assetId);
      fs.writeFileSync(targetFile, buffer);

      const publicAssetPath = `/uploads/logos/${orgId}/${assetId}`;

      const branding = await prisma.organizationBranding.upsert({
        where: { organizationId: orgId },
        update: { logoAssetId: publicAssetPath },
        create: {
          organizationId: orgId,
          displayName: req.tenant!.organizationName,
          logoAssetId: publicAssetPath,
        },
      });

      await recordAuditLog({
        organizationId: orgId,
        actorUserId: req.auth!.userId,
        action: "branding.logo.upload",
        resourceType: "organization_branding",
        resourceId: orgId,
        requestId: req.requestId,
        metadata: { assetId: publicAssetPath, bytes: buffer.length, mimeType },
      });

      res.status(201).json({ data: branding });
    } catch (err) {
      next(err);
    }
  }
);

appearanceRouter.put(
  "/settings/preferences",
  requireAuth,
  requireTenant,
  async (req, res, next) => {
    try {
      const parsed = updateUserPreferencesSchema.parse(req.body);
      const orgId = req.tenant!.organizationId;
      const userId = req.auth!.userId;

      const orgTheme = await prisma.organizationTheme.findUnique({
        where: { organizationId: orgId },
      });

      const effectiveColorMode = orgTheme?.forceBrandTheme
        ? orgTheme.colorModeDefault
        : parsed.colorMode || "system";

      const pref = await prisma.userPreference.upsert({
        where: {
          userId_organizationId: { userId, organizationId: orgId },
        },
        update: {
          colorMode: effectiveColorMode,
          ...(parsed.tableDensity ? { tableDensity: parsed.tableDensity } : {}),
          ...(parsed.sidebarCollapsed !== undefined
            ? { sidebarCollapsed: parsed.sidebarCollapsed }
            : {}),
          ...(parsed.locale ? { locale: parsed.locale } : {}),
          preferencesJson: {
            reducedMotion: parsed.reducedMotion ?? false,
            mobileTableLayout: parsed.mobileTableLayout ?? "cards",
          },
        },
        create: {
          userId,
          organizationId: orgId,
          colorMode: effectiveColorMode,
          tableDensity: parsed.tableDensity || "standard",
          sidebarCollapsed: parsed.sidebarCollapsed || false,
          locale: parsed.locale || "fr-FR",
          preferencesJson: {
            reducedMotion: parsed.reducedMotion ?? false,
            mobileTableLayout: parsed.mobileTableLayout ?? "cards",
          },
        },
      });

      res.json({ data: pref, forcedByOrganization: Boolean(orgTheme?.forceBrandTheme) });
    } catch (err) {
      next(err);
    }
  }
);
