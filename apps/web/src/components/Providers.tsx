"use client";

import React, { useEffect } from "react";
import { Provider } from "react-redux";
import { resolveDesignTokens } from "@g-stock/config";
import type {
  DesignTokens,
  FontScale,
  RadiusScale,
  SidebarStyle,
  TableDensity,
  ThemePresetId,
} from "@g-stock/types";
import { store, useAppSelector } from "@/store";
import { useGetMeQuery } from "@/store/api";

function ThemeApplicator({ children }: { children: React.ReactNode }) {
  const token = useAppSelector((s) => s.ui.token);
  const livePreview = useAppSelector((s) => s.ui.livePreview);
  const colorModeOverride = useAppSelector((s) => s.ui.colorModeOverride);
  const { data: meData } = useGetMeQuery(undefined, { skip: !token });

  useEffect(() => {
    const root = document.documentElement;
    const orgTheme = meData?.activeOrganization?.theme;
    const userPref = meData?.userPreference;

    const preset = (livePreview?.themePreset ||
      orgTheme?.themePreset ||
      "gstock-classic") as ThemePresetId;

    const rawColorMode =
      livePreview?.colorMode ||
      colorModeOverride ||
      (orgTheme?.forceBrandTheme ? orgTheme?.colorModeDefault : userPref?.colorMode) ||
      orgTheme?.colorModeDefault ||
      "light";

    const prefersDark =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const effectiveMode: "light" | "dark" =
      rawColorMode === "system" ? (prefersDark ? "dark" : "light") : rawColorMode;

    if (effectiveMode === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    const customColors = (livePreview?.customTokens ||
      orgTheme?.designTokens ||
      {}) as Partial<DesignTokens>;

    const radiusScale = (livePreview?.radiusScale ||
      orgTheme?.radiusScale ||
      "standard") as RadiusScale;
    const tableDensity = (livePreview?.tableDensity ||
      userPref?.tableDensity ||
      orgTheme?.tableDensity ||
      "standard") as TableDensity;
    const fontScale = (livePreview?.fontScale ||
      orgTheme?.fontScale ||
      "standard") as FontScale;
    const sidebarStyle = (livePreview?.sidebarStyle ||
      orgTheme?.sidebarStyle ||
      "standard") as SidebarStyle;

    const resolved = resolveDesignTokens({
      preset,
      mode: effectiveMode,
      customColors,
      radiusScale,
      tableDensity,
      fontScale,
      sidebarStyle,
    });

    for (const [key, val] of Object.entries(resolved)) {
      root.style.setProperty(key, val);
    }
  }, [meData, livePreview, colorModeOverride]);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <ThemeApplicator>{children}</ThemeApplicator>
    </Provider>
  );
}
