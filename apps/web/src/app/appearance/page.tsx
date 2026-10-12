"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Palette,
  Sun,
  Moon,
  Monitor,
  Upload,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Save,
  Eye,
  X,
  Lock,
  Layout,
  Sliders,
  Sparkles,
} from "lucide-react";
import {
  THEME_PRESETS,
  getContrastRatio,
  isValidHexColor,
  deriveAccessibleForeground,
} from "@g-stock/config";
import type {
  CardStyle,
  ColorMode,
  DesignTokens,
  FontScale,
  RadiusScale,
  SidebarStyle,
  TableDensity,
  ThemePresetId,
} from "@g-stock/types";
import { AppShell } from "@/layouts/AppShell";
import { useAppDispatch, useAppSelector } from "@/store";
import { setLivePreview, setColorModeOverride } from "@/store/ui-slice";
import {
  useGetAppearanceQuery,
  useUpdateAppearanceMutation,
  useUploadBrandingLogoMutation,
  useUpdateUserPreferencesMutation,
} from "@/store/api";

const CUSTOMIZABLE_TOKEN_FIELDS: Array<{
  key: keyof Pick<
    DesignTokens,
    | "--color-primary"
    | "--color-secondary"
    | "--color-accent"
    | "--color-background"
    | "--color-surface"
    | "--color-text"
  >;
  label: string;
  description: string;
}> = [
  {
    key: "--color-primary",
    label: "Couleur Primaire",
    description: "Boutons principaux, éléments actifs et navigation",
  },
  {
    key: "--color-secondary",
    label: "Couleur Secondaire",
    description: "Actions secondaires et accents complémentaires",
  },
  {
    key: "--color-accent",
    label: "Couleur d'Accentuation",
    description: "Indicateurs graphiques, badges et mises en avant",
  },
  {
    key: "--color-background",
    label: "Fond de Page",
    description: "Arrière-plan global de l'application",
  },
  {
    key: "--color-surface",
    label: "Surface des Cartes",
    description: "Fond des cartes, panneaux et barres latérales",
  },
  {
    key: "--color-text",
    label: "Texte Principal",
    description: "Titres, libellés et données tabulaires (>= 4.5:1 requis)",
  },
];

export default function AppearancePage() {
  const dispatch = useAppDispatch();
  const livePreview = useAppSelector((s) => s.ui.livePreview);

  const { data: appearanceRes, isLoading } = useGetAppearanceQuery();
  const [updateAppearance, { isLoading: isSavingAppearance }] =
    useUpdateAppearanceMutation();
  const [uploadBrandingLogo, { isLoading: isUploadingLogo }] =
    useUploadBrandingLogoMutation();
  const [updateUserPreferences, { isLoading: isSavingPrefs }] =
    useUpdateUserPreferencesMutation();

  const [displayName, setDisplayName] = useState("");
  const [themePreset, setThemePreset] = useState<ThemePresetId>("gstock-classic");
  const [colorMode, setColorMode] = useState<ColorMode>("light");
  const [forceBrandTheme, setForceBrandTheme] = useState(false);
  const [cardStyle, setCardStyle] = useState<CardStyle>("standard");
  const [radiusScale, setRadiusScale] = useState<RadiusScale>("standard");
  const [tableDensity, setTableDensity] = useState<TableDensity>("standard");
  const [fontScale, setFontScale] = useState<FontScale>("standard");
  const [sidebarStyle, setSidebarStyle] = useState<SidebarStyle>("standard");
  const [customTokens, setCustomTokens] = useState<Partial<DesignTokens>>({});
  const [reducedMotion, setReducedMotion] = useState(false);
  const [mobileTableLayout, setMobileTableLayout] = useState<"cards" | "scroll">("cards");

  const [logoPreviewDataUrl, setLogoPreviewDataUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const apiOrigin = (
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1"
  ).replace(/\/api\/v1$/, "");

  // Synchronisation initiale avec les données serveur
  useEffect(() => {
    if (!appearanceRes?.data) return;
    const { branding, theme, userPreference } = appearanceRes.data;
    setDisplayName(branding?.displayName || "");
    setThemePreset((theme?.themePreset as ThemePresetId) || "gstock-classic");
    setColorMode((theme?.colorModeDefault as ColorMode) || "light");
    setForceBrandTheme(Boolean(theme?.forceBrandTheme));
    setCardStyle((theme?.cardStyle as CardStyle) || "standard");
    setRadiusScale((theme?.radiusScale as RadiusScale) || "standard");
    setTableDensity((theme?.tableDensity as TableDensity) || "standard");
    setFontScale((theme?.fontScale as FontScale) || "standard");
    setSidebarStyle((theme?.sidebarStyle as SidebarStyle) || "standard");
    setCustomTokens((theme?.designTokens as Partial<DesignTokens>) || {});
    if (userPreference?.preferencesJson) {
      setReducedMotion(Boolean(userPreference.preferencesJson.reducedMotion));
      setMobileTableLayout(
        userPreference.preferencesJson.mobileTableLayout === "scroll" ? "scroll" : "cards"
      );
    }
  }, [appearanceRes]);

  const activePresetDef = useMemo(
    () => THEME_PRESETS[themePreset] || THEME_PRESETS["gstock-classic"],
    [themePreset]
  );

  const baseModePalette = useMemo(
    () => (colorMode === "dark" ? activePresetDef.dark : activePresetDef.light),
    [activePresetDef, colorMode]
  );

  const effectiveColors = useMemo(() => {
    const merged = { ...baseModePalette };
    for (const field of CUSTOMIZABLE_TOKEN_FIELDS) {
      const candidate = customTokens[field.key];
      if (candidate && isValidHexColor(candidate)) {
        merged[field.key] = candidate;
      }
    }
    merged["--color-primary-foreground"] = deriveAccessibleForeground(
      merged["--color-primary"]
    );
    return merged;
  }, [baseModePalette, customTokens]);

  const textBgContrast = useMemo(
    () =>
      getContrastRatio(
        effectiveColors["--color-background"],
        effectiveColors["--color-text"]
      ),
    [effectiveColors]
  );

  const surfaceTextContrast = useMemo(
    () =>
      getContrastRatio(
        effectiveColors["--color-surface"],
        effectiveColors["--color-text"]
      ),
    [effectiveColors]
  );

  const primaryBtnContrast = useMemo(
    () =>
      getContrastRatio(
        effectiveColors["--color-primary"],
        effectiveColors["--color-primary-foreground"]
      ),
    [effectiveColors]
  );

  const isContrastValid = textBgContrast >= 4.5 && surfaceTextContrast >= 4.5;

  function applyLivePreviewState(overrides?: Partial<{
    displayName: string;
    themePreset: ThemePresetId;
    colorMode: ColorMode;
    cardStyle: CardStyle;
    radiusScale: RadiusScale;
    tableDensity: TableDensity;
    fontScale: FontScale;
    sidebarStyle: SidebarStyle;
    customTokens: Partial<DesignTokens>;
  }>) {
    const nextState = {
      active: true,
      displayName: overrides?.displayName ?? displayName,
      themePreset: overrides?.themePreset ?? themePreset,
      colorMode: overrides?.colorMode ?? colorMode,
      cardStyle: overrides?.cardStyle ?? cardStyle,
      radiusScale: overrides?.radiusScale ?? radiusScale,
      tableDensity: overrides?.tableDensity ?? tableDensity,
      fontScale: overrides?.fontScale ?? fontScale,
      sidebarStyle: overrides?.sidebarStyle ?? sidebarStyle,
      customTokens: overrides?.customTokens ?? customTokens,
    };
    dispatch(setLivePreview(nextState));
  }

  function handlePresetSelect(presetId: ThemePresetId) {
    setThemePreset(presetId);
    setCustomTokens({});
    applyLivePreviewState({ themePreset: presetId, customTokens: {} });
  }

  function handleTokenColorChange(
    key: keyof DesignTokens,
    rawHex: string
  ) {
    const updated = { ...customTokens, [key]: rawHex };
    setCustomTokens(updated);
    if (isValidHexColor(rawHex)) {
      applyLivePreviewState({ customTokens: updated });
    }
  }

  async function handleLogoFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatusMessage(null);

    const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      setStatusMessage({
        type: "error",
        text: "Format non supporté. Formats autorisés : PNG, JPG, WEBP, SVG.",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setStatusMessage({
        type: "error",
        text: "Le fichier dépasse la taille maximale autorisée de 2 Mo.",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64String = String(reader.result || "");
      setLogoPreviewDataUrl(base64String);
      try {
        await uploadBrandingLogo({
          fileName: file.name,
          mimeType: file.type,
          fileContentBase64: base64String,
        }).unwrap();
        setStatusMessage({
          type: "success",
          text: "Logo d'entreprise téléversé et stocké avec succès.",
        });
      } catch (err: any) {
        setStatusMessage({
          type: "error",
          text:
            err?.data?.error?.message ||
            "Erreur lors de l'envoi du logo d'entreprise.",
        });
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleSaveAppearance() {
    setStatusMessage(null);
    if (!isContrastValid) {
      setStatusMessage({
        type: "error",
        text: `Ratio de contraste WCAG 2.2 AA insuffisant (${textBgContrast}:1). Un minimum de 4.5:1 est requis entre le texte et le fond.`,
      });
      return;
    }

    // Nettoyage des tokens hexadécimaux valides uniquement
    const sanitizedTokens: Record<string, string> = {};
    for (const [k, v] of Object.entries(customTokens)) {
      if (v && isValidHexColor(v)) {
        sanitizedTokens[k] = v.toLowerCase();
      }
    }

    try {
      await updateAppearance({
        displayName: displayName.trim() || undefined,
        themePreset,
        colorModeDefault: colorMode,
        cardStyle,
        radiusScale,
        tableDensity,
        fontScale,
        sidebarStyle,
        forceBrandTheme,
        designTokens: sanitizedTokens,
      }).unwrap();

      await updateUserPreferences({
        colorMode,
        tableDensity,
        reducedMotion,
        mobileTableLayout,
      }).unwrap();

      dispatch(setLivePreview(null));
      dispatch(setColorModeOverride(colorMode));
      setStatusMessage({
        type: "success",
        text: "Thème, design tokens et préférences d'affichage enregistrés avec succès.",
      });
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text:
          err?.data?.error?.message ||
          "Impossible d'enregistrer la configuration d'apparence (vérifiez vos permissions ou votre plan).",
      });
    }
  }

  function handleCancelPreview() {
    dispatch(setLivePreview(null));
    if (appearanceRes?.data) {
      const { branding, theme } = appearanceRes.data;
      setDisplayName(branding?.displayName || "");
      setThemePreset((theme?.themePreset as ThemePresetId) || "gstock-classic");
      setColorMode((theme?.colorModeDefault as ColorMode) || "light");
      setForceBrandTheme(Boolean(theme?.forceBrandTheme));
      setCardStyle((theme?.cardStyle as CardStyle) || "standard");
      setRadiusScale((theme?.radiusScale as RadiusScale) || "standard");
      setTableDensity((theme?.tableDensity as TableDensity) || "standard");
      setFontScale((theme?.fontScale as FontScale) || "standard");
      setSidebarStyle((theme?.sidebarStyle as SidebarStyle) || "standard");
      setCustomTokens((theme?.designTokens as Partial<DesignTokens>) || {});
    }
    setStatusMessage({
      type: "success",
      text: "Aperçu en direct annulé. Les valeurs sauvegardées ont été restaurées.",
    });
  }

  async function handleConfirmResetDefaults() {
    setResetConfirmOpen(false);
    setThemePreset("gstock-classic");
    setColorMode("light");
    setForceBrandTheme(false);
    setCardStyle("standard");
    setRadiusScale("standard");
    setTableDensity("standard");
    setFontScale("standard");
    setSidebarStyle("standard");
    setCustomTokens({});
    dispatch(setLivePreview(null));
    dispatch(setColorModeOverride("light"));

    try {
      await updateAppearance({
        themePreset: "gstock-classic",
        colorModeDefault: "light",
        cardStyle: "standard",
        radiusScale: "standard",
        tableDensity: "standard",
        fontScale: "standard",
        sidebarStyle: "standard",
        forceBrandTheme: false,
        designTokens: {},
      }).unwrap();
      setStatusMessage({
        type: "success",
        text: "Apparence réinitialisée aux valeurs par défaut (G-Stock Classic).",
      });
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text:
          err?.data?.error?.message ||
          "Réinitialisation locale appliquée (sauvegarde serveur réservée aux administrateurs).",
      });
    }
  }

  const currentLogoSrc =
    logoPreviewDataUrl ||
    (appearanceRes?.data?.branding?.logoAssetId
      ? `${apiOrigin}${appearanceRes.data.branding.logoAssetId}`
      : null);

  return (
    <AppShell
      title="Apparence, Thème & Marque"
      subtitle="Personnalisez l'identité visuelle de votre espace G-Stock, la densité d'affichage et l'accessibilité WCAG 2.2 AA."
      actions={
        <>
          {livePreview?.active && (
            <button
              type="button"
              onClick={handleCancelPreview}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-control border border-border bg-surface text-xs font-semibold hover:bg-surface-muted"
            >
              <X size={14} />
              <span>Annuler l&apos;aperçu</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setResetConfirmOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-control border border-border bg-surface text-xs font-semibold hover:bg-surface-muted"
          >
            <RotateCcw size={14} />
            <span>Réinitialiser aux valeurs par défaut</span>
          </button>
          <button
            type="button"
            disabled={isSavingAppearance || isSavingPrefs || !isContrastValid}
            onClick={handleSaveAppearance}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-control bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
          >
            <Save size={14} />
            <span>
              {isSavingAppearance || isSavingPrefs ? "Enregistrement..." : "Enregistrer"}
            </span>
          </button>
        </>
      }
    >
      {statusMessage && (
        <div
          className={`p-3.5 rounded-control border text-xs font-medium flex items-center justify-between ${
            statusMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
              : "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === "success" ? (
              <CheckCircle2 size={16} />
            ) : (
              <AlertTriangle size={16} />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="p-1 hover:opacity-75"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="gstock-card p-8 text-center text-sm text-muted">
          Chargement des paramètres d&apos;apparence et du moteur de thèmes...
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Colonne gauche : contrôles de personnalisation */}
          <div className="xl:col-span-7 space-y-6">
            {/* 1. Galerie des 6 thèmes prédéfinis */}
            <section className="gstock-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold flex items-center gap-2">
                    <Palette size={18} className="text-primary" />
                    <span>1. Galerie de Thèmes Prédéfinis</span>
                  </h2>
                  <p className="text-xs text-muted mt-0.5">
                    Sélectionnez une harmonie chromatique professionnelle testée pour la lisibilité.
                  </p>
                </div>
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded bg-surface-muted">
                  6 presets officiels
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.values(THEME_PRESETS).map((preset) => {
                  const selected = themePreset === preset.id;
                  const palette = colorMode === "dark" ? preset.dark : preset.light;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handlePresetSelect(preset.id)}
                      className={`text-left p-3.5 rounded-card border transition-all ${
                        selected
                          ? "border-primary ring-2 ring-primary/25 bg-surface-muted/60"
                          : "border-border hover:bg-surface-muted/40"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-xs">{preset.name}</span>
                        {selected && (
                          <CheckCircle2 size={15} className="text-primary shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted line-clamp-2 mb-3">
                        {preset.description}
                      </p>
                      <div className="flex items-center gap-1.5">
                        {[
                          palette["--color-primary"],
                          palette["--color-secondary"],
                          palette["--color-accent"],
                          palette["--color-background"],
                          palette["--color-surface"],
                          palette["--color-text"],
                        ].map((hex, i) => (
                          <span
                            key={i}
                            title={hex}
                            style={{ backgroundColor: hex }}
                            className="w-5 h-5 rounded-full border border-black/15 dark:border-white/20 shrink-0"
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 2. Mode Clair / Sombre / Système & Verrouillage Marque */}
            <section className="gstock-card p-5 space-y-4">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Sun size={18} className="text-primary" />
                <span>2. Mode d&apos;Affichage & Gouvernance du Thème</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: "light" as ColorMode,
                    label: "Mode Clair",
                    desc: "Idéal en bureau lumineux",
                    icon: Sun,
                  },
                  {
                    id: "dark" as ColorMode,
                    label: "Mode Sombre",
                    desc: "Confort visuel en entrepôt",
                    icon: Moon,
                  },
                  {
                    id: "system" as ColorMode,
                    label: "Automatique (Système)",
                    desc: "Suit prefers-color-scheme",
                    icon: Monitor,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = colorMode === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setColorMode(item.id);
                        dispatch(setColorModeOverride(item.id));
                        applyLivePreviewState({ colorMode: item.id });
                      }}
                      className={`p-3 rounded-control border text-left transition-all ${
                        active
                          ? "border-primary bg-primary/10"
                          : "border-border hover:bg-surface-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-semibold text-xs">
                        <Icon size={15} className={active ? "text-primary" : "text-muted"} />
                        <span>{item.label}</span>
                      </div>
                      <p className="text-[11px] text-muted mt-1">{item.desc}</p>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold flex items-center gap-1.5">
                    <Lock size={14} className="text-primary" />
                    <span>Forcer le thème de l&apos;entreprise pour tous les membres</span>
                  </div>
                  <p className="text-[11px] text-muted mt-0.5">
                    Si activé (`forceBrandTheme`), la charte de l&apos;organisation s&apos;impose à tous les collaborateurs.
                  </p>
                </div>
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={forceBrandTheme}
                    onChange={(e) => setForceBrandTheme(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-surface-muted border border-border rounded-full peer peer-checked:bg-primary transition-colors relative">
                    <span
                      className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                        forceBrandTheme ? "translate-x-5" : ""
                      }`}
                    />
                  </div>
                </label>
              </div>
            </section>

            {/* 3. Couleurs sur mesure & Contraste WCAG 2.2 AA */}
            <section className="gstock-card p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold flex items-center gap-2">
                    <Sparkles size={18} className="text-primary" />
                    <span>3. Tokens de Couleurs & Contraste WCAG 2.2 AA</span>
                  </h2>
                  <p className="text-xs text-muted mt-0.5">
                    Ajustez les variables CSS sécurisées (`#RRGGBB`). Aucun CSS brut non filtré n&apos;est exécuté.
                  </p>
                </div>
                <div
                  className={`px-3 py-1.5 rounded-control text-xs font-bold flex items-center gap-1.5 ${
                    isContrastValid
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      : "bg-red-500/15 text-red-700 dark:text-red-300"
                  }`}
                >
                  {isContrastValid ? (
                    <CheckCircle2 size={14} />
                  ) : (
                    <AlertTriangle size={14} />
                  )}
                  <span>Contraste Texte/Fond : {textBgContrast}:1</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {CUSTOMIZABLE_TOKEN_FIELDS.map((field) => {
                  const currentVal =
                    customTokens[field.key] ?? effectiveColors[field.key];
                  const valid = isValidHexColor(currentVal);
                  return (
                    <div
                      key={field.key}
                      className="p-3 rounded-control border border-border bg-background space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold">{field.label}</label>
                        <code className="text-[10px] text-muted">{field.key}</code>
                      </div>
                      <p className="text-[11px] text-muted">{field.description}</p>
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="color"
                          aria-label={`Sélecteur de couleur pour ${field.label}`}
                          value={valid ? currentVal : "#047857"}
                          onChange={(e) =>
                            handleTokenColorChange(field.key, e.target.value)
                          }
                          className="w-9 h-8 rounded cursor-pointer border border-border bg-transparent p-0.5"
                        />
                        <input
                          type="text"
                          value={currentVal}
                          onChange={(e) =>
                            handleTokenColorChange(field.key, e.target.value)
                          }
                          placeholder="#047857"
                          maxLength={7}
                          className={`flex-1 px-2.5 py-1.5 text-xs font-mono rounded-control border bg-surface ${
                            valid ? "border-border" : "border-red-500"
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Barre de diagnostic WCAG */}
              <div className="p-3 rounded-control bg-surface-muted border border-border grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-muted block text-[11px]">Texte sur Fond</span>
                  <span className="font-bold">
                    {textBgContrast}:1{" "}
                    {textBgContrast >= 7
                      ? "(AAA)"
                      : textBgContrast >= 4.5
                      ? "(AA Valide)"
                      : "(Insuffisant < 4.5)"}
                  </span>
                </div>
                <div>
                  <span className="text-muted block text-[11px]">Texte sur Surface</span>
                  <span className="font-bold">
                    {surfaceTextContrast}:1{" "}
                    {surfaceTextContrast >= 4.5 ? "(AA Valide)" : "(Insuffisant)"}
                  </span>
                </div>
                <div>
                  <span className="text-muted block text-[11px]">Bouton Primaire</span>
                  <span className="font-bold">{primaryBtnContrast}:1 (Auto-adapté)</span>
                </div>
              </div>
            </section>

            {/* 4. Densité, Rayon des angles, Police, Cartes et Sidebar */}
            <section className="gstock-card p-5 space-y-4">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Sliders size={18} className="text-primary" />
                <span>4. Ergonomie, Densité & Disposition de l&apos;Interface</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5">
                    Style des cartes (`cardStyle`)
                  </label>
                  <select
                    value={cardStyle}
                    onChange={(e) => {
                      const val = e.target.value as CardStyle;
                      setCardStyle(val);
                      applyLivePreviewState({ cardStyle: val });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
                  >
                    <option value="standard">Standard (Équilibré)</option>
                    <option value="bordered">Bordure franche (Technique)</option>
                    <option value="elevated">Élevé (Ombre portée douce)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5">
                    Rayon des angles (`radiusScale`)
                  </label>
                  <select
                    value={radiusScale}
                    onChange={(e) => {
                      const val = e.target.value as RadiusScale;
                      setRadiusScale(val);
                      applyLivePreviewState({ radiusScale: val });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
                  >
                    <option value="compact">Compact (Angulaire industriel)</option>
                    <option value="standard">Standard (Moderne 10px)</option>
                    <option value="rounded">Arrondi (Doux 16px)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5">
                    Densité des tableaux (`tableDensity`)
                  </label>
                  <select
                    value={tableDensity}
                    onChange={(e) => {
                      const val = e.target.value as TableDensity;
                      setTableDensity(val);
                      applyLivePreviewState({ tableDensity: val });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
                  >
                    <option value="comfortable">Confortable (Espacé)</option>
                    <option value="standard">Standard (Recommandé)</option>
                    <option value="compact">Compact (Haute densité logistique)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5">
                    Taille de police (`fontScale`)
                  </label>
                  <select
                    value={fontScale}
                    onChange={(e) => {
                      const val = e.target.value as FontScale;
                      setFontScale(val);
                      applyLivePreviewState({ fontScale: val });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
                  >
                    <option value="small">Petite (93.75% - Écrans denses)</option>
                    <option value="standard">Standard (100%)</option>
                    <option value="large">Grande (106.25% - Lisibilité accrue)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5">
                    Largeur de la barre latérale (`sidebarStyle`)
                  </label>
                  <select
                    value={sidebarStyle}
                    onChange={(e) => {
                      const val = e.target.value as SidebarStyle;
                      setSidebarStyle(val);
                      applyLivePreviewState({ sidebarStyle: val });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
                  >
                    <option value="standard">Standard (264px)</option>
                    <option value="compact">Compacte (208px)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5">
                    Affichage mobile des tableaux
                  </label>
                  <select
                    value={mobileTableLayout}
                    onChange={(e) =>
                      setMobileTableLayout(
                        e.target.value === "scroll" ? "scroll" : "cards"
                      )
                    }
                    className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
                  >
                    <option value="cards">Cartes empilées lisibles</option>
                    <option value="scroll">Défilement horizontal</option>
                  </select>
                </div>
              </div>
            </section>

            {/* 5. Identité de marque & Upload du logo */}
            <section className="gstock-card p-5 space-y-4">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Upload size={18} className="text-primary" />
                <span>5. Identité de Marque & Logo de l&apos;Entreprise</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Nom d&apos;affichage dans l&apos;en-tête
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      applyLivePreviewState({ displayName: e.target.value });
                    }}
                    placeholder="Ex: Logistique Alpes Distribution"
                    className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
                  />
                  <p className="text-[11px] text-muted mt-1">
                    Apparaît en haut de la barre latérale et dans les rapports.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Téléverser un logo (PNG, JPG, WEBP, SVG &le; 2 Mo)
                  </label>
                  <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-control border border-dashed border-border bg-background hover:bg-surface-muted cursor-pointer text-xs font-medium">
                    <Upload size={14} className="text-primary" />
                    <span>
                      {isUploadingLogo
                        ? "Téléversement en cours..."
                        : "Choisir un fichier image..."}
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleLogoFileSelect}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Aperçu du logo sur fond clair et sur fond sombre */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-control border border-slate-200 bg-white text-slate-900 flex items-center gap-3">
                  {currentLogoSrc ? (
                    <img
                      src={currentLogoSrc}
                      alt="Aperçu fond clair"
                      className="w-10 h-10 object-contain rounded"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-emerald-700 text-white flex items-center justify-center font-bold">
                      G
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-bold">
                      {displayName || "Votre Entreprise"}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Aperçu du logo sur fond clair
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-control border border-slate-700 bg-slate-900 text-slate-100 flex items-center gap-3">
                  {currentLogoSrc ? (
                    <img
                      src={currentLogoSrc}
                      alt="Aperçu fond sombre"
                      className="w-10 h-10 object-contain rounded"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
                      G
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-bold">
                      {displayName || "Votre Entreprise"}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Aperçu du logo sur fond sombre
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Colonne droite : Panneau d'aperçu en direct */}
          <div className="xl:col-span-5">
            <div className="gstock-card p-5 sticky top-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold flex items-center gap-2">
                    <Eye size={18} className="text-primary" />
                    <span>6. Aperçu en Direct des Composants</span>
                  </h2>
                  <p className="text-xs text-muted">
                    Simulation instantanée des tokens CSS avant sauvegarde.
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-primary/15 text-primary">
                  Temps réel
                </span>
              </div>

              {/* Mini fenêtre d'aperçu isolée */}
              <div
                style={{
                  backgroundColor: effectiveColors["--color-background"],
                  color: effectiveColors["--color-text"],
                  borderColor: effectiveColors["--color-border"],
                }}
                className="rounded-card border overflow-hidden shadow-sm transition-colors"
              >
                <div className="flex min-h-[360px]">
                  {/* Mini Sidebar */}
                  <div
                    style={{
                      backgroundColor: effectiveColors["--color-surface"],
                      borderColor: effectiveColors["--color-border"],
                      width: sidebarStyle === "compact" ? "110px" : "140px",
                    }}
                    className="border-r p-3 flex flex-col justify-between shrink-0"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2 pb-2 border-b border-current/10">
                        <div
                          style={{
                            backgroundColor: effectiveColors["--color-primary"],
                            color: effectiveColors["--color-primary-foreground"],
                          }}
                          className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold shrink-0"
                        >
                          G
                        </div>
                        <span className="text-xs font-bold truncate">
                          {displayName || "G-Stock"}
                        </span>
                      </div>

                      <div
                        style={{
                          backgroundColor: effectiveColors["--color-primary"],
                          color: effectiveColors["--color-primary-foreground"],
                        }}
                        className="px-2.5 py-1.5 rounded text-[11px] font-semibold flex items-center gap-1.5"
                      >
                        <Layout size={12} />
                        <span className="truncate">Tableau</span>
                      </div>
                      <div className="px-2.5 py-1.5 rounded text-[11px] opacity-75">
                        Produits
                      </div>
                      <div className="px-2.5 py-1.5 rounded text-[11px] opacity-75">
                        Mouvements
                      </div>
                      <div className="px-2.5 py-1.5 rounded text-[11px] opacity-75">
                        Entrepôts
                      </div>
                    </div>

                    <div className="text-[10px] opacity-60 pt-2 border-t border-current/10">
                      Preset : {activePresetDef.name}
                    </div>
                  </div>

                  {/* Mini Zone Principale */}
                  <div className="flex-1 p-3.5 space-y-3">
                    {/* Boutons primaire / secondaire */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold">Vue Opérationnelle</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          style={{
                            backgroundColor: effectiveColors["--color-primary"],
                            color: effectiveColors["--color-primary-foreground"],
                          }}
                          className="px-2.5 py-1 rounded text-[11px] font-semibold"
                        >
                          + Réception
                        </button>
                        <button
                          type="button"
                          style={{
                            backgroundColor: effectiveColors["--color-secondary"],
                            color: "#ffffff",
                          }}
                          className="px-2.5 py-1 rounded text-[11px] font-semibold"
                        >
                          Exporter
                        </button>
                      </div>
                    </div>

                    {/* Mini Cartes KPI */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div
                        style={{
                          backgroundColor: effectiveColors["--color-surface"],
                          borderColor: effectiveColors["--color-border"],
                        }}
                        className="p-2.5 rounded border"
                      >
                        <div className="text-[10px] opacity-70">Valeur du stock</div>
                        <div className="text-sm font-bold mt-0.5">48 920,00 €</div>
                        <div
                          style={{ color: effectiveColors["--color-accent"] }}
                          className="text-[10px] font-semibold mt-0.5"
                        >
                          +12.4% ce mois
                        </div>
                      </div>
                      <div
                        style={{
                          backgroundColor: effectiveColors["--color-surface"],
                          borderColor: effectiveColors["--color-border"],
                        }}
                        className="p-2.5 rounded border"
                      >
                        <div className="text-[10px] opacity-70">Alertes Seuil</div>
                        <div className="text-sm font-bold mt-0.5">3 références</div>
                        <div
                          style={{ color: effectiveColors["--color-warning"] }}
                          className="text-[10px] font-semibold mt-0.5"
                        >
                          Réappro. requise
                        </div>
                      </div>
                    </div>

                    {/* Mini Tableau */}
                    <div
                      style={{
                        backgroundColor: effectiveColors["--color-surface"],
                        borderColor: effectiveColors["--color-border"],
                      }}
                      className="rounded border overflow-hidden"
                    >
                      <table className="w-full text-left text-[11px]">
                        <thead
                          style={{
                            backgroundColor: effectiveColors["--color-surface-muted"],
                          }}
                        >
                          <tr>
                            <th className="px-2.5 py-1.5 font-semibold">SKU</th>
                            <th className="px-2.5 py-1.5 font-semibold">Dispo.</th>
                            <th className="px-2.5 py-1.5 font-semibold">Statut</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-t border-current/10">
                            <td className="px-2.5 py-1.5 font-mono">CAF-BIO-1KG</td>
                            <td className="px-2.5 py-1.5 font-semibold">142 KG</td>
                            <td className="px-2.5 py-1.5">
                              <span
                                style={{
                                  backgroundColor: effectiveColors["--color-success"],
                                  color: "#ffffff",
                                }}
                                className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                              >
                                EN STOCK
                              </span>
                            </td>
                          </tr>
                          <tr className="border-t border-current/10">
                            <td className="px-2.5 py-1.5 font-mono">EMB-BOX-XL</td>
                            <td className="px-2.5 py-1.5 font-semibold">4 UN</td>
                            <td className="px-2.5 py-1.5">
                              <span
                                style={{
                                  backgroundColor: effectiveColors["--color-warning"],
                                  color: "#ffffff",
                                }}
                                className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                              >
                                SEUIL BAS
                              </span>
                            </td>
                          </tr>
                          <tr className="border-t border-current/10">
                            <td className="px-2.5 py-1.5 font-mono">PAL-EUR-80</td>
                            <td className="px-2.5 py-1.5 font-semibold">0 UN</td>
                            <td className="px-2.5 py-1.5">
                              <span
                                style={{
                                  backgroundColor: effectiveColors["--color-danger"],
                                  color: "#ffffff",
                                }}
                                className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                              >
                                RUPTURE
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Barres de statut */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span>Taux de couverture des coûts</span>
                        <span className="font-bold">94%</span>
                      </div>
                      <div
                        style={{
                          backgroundColor: effectiveColors["--color-surface-muted"],
                        }}
                        className="w-full h-2 rounded-full overflow-hidden"
                      >
                        <div
                          style={{
                            width: "94%",
                            backgroundColor: effectiveColors["--color-primary"],
                          }}
                          className="h-full rounded-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Boîte de dialogue de confirmation avant réinitialisation */}
      {resetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="gstock-card p-6 max-w-md w-full space-y-4">
            <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400">
              <AlertTriangle size={20} />
              <h3 className="text-base font-bold text-foreground">
                Réinitialiser l&apos;apparence par défaut ?
              </h3>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Cette action rétablira le thème <strong>G-Stock Classic</strong>, le mode
              clair, la densité standard et supprimera les couleurs personnalisées. Votre
              logo d&apos;entreprise sera conservé.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResetConfirmOpen(false)}
                className="px-3.5 py-2 rounded-control border border-border text-xs font-medium"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmResetDefaults}
                className="px-4 py-2 rounded-control bg-primary text-primary-foreground text-xs font-semibold"
              >
                Confirmer la réinitialisation
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
