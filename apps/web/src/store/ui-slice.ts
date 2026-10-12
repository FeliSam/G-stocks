import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
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

export interface LiveAppearancePreview {
  active: boolean;
  displayName?: string;
  themePreset: ThemePresetId;
  colorMode: ColorMode;
  cardStyle: CardStyle;
  radiusScale: RadiusScale;
  tableDensity: TableDensity;
  fontScale: FontScale;
  sidebarStyle: SidebarStyle;
  customTokens: Partial<DesignTokens>;
}

export interface UiState {
  token: string | null;
  activeOrganizationId: string | null;
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  colorModeOverride: ColorMode | null;
  livePreview: LiveAppearancePreview | null;
}

const initialState: UiState = {
  token: typeof window !== "undefined" ? localStorage.getItem("gstock_token") : null,
  activeOrganizationId:
    typeof window !== "undefined" ? localStorage.getItem("gstock_org_id") : null,
  sidebarCollapsed: false,
  mobileMenuOpen: false,
  colorModeOverride: null,
  livePreview: null,
};

export const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setSession(
      state,
      action: PayloadAction<{ token: string | null; organizationId?: string | null }>
    ) {
      state.token = action.payload.token;
      if (typeof window !== "undefined") {
        if (action.payload.token) {
          localStorage.setItem("gstock_token", action.payload.token);
        } else {
          localStorage.removeItem("gstock_token");
        }
      }
      if (action.payload.organizationId !== undefined) {
        state.activeOrganizationId = action.payload.organizationId;
        if (typeof window !== "undefined") {
          if (action.payload.organizationId) {
            localStorage.setItem("gstock_org_id", action.payload.organizationId);
          } else {
            localStorage.removeItem("gstock_org_id");
          }
        }
      }
    },
    setActiveOrganizationId(state, action: PayloadAction<string>) {
      state.activeOrganizationId = action.payload;
      if (typeof window !== "undefined") {
        localStorage.setItem("gstock_org_id", action.payload);
      }
    },
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setMobileMenuOpen(state, action: PayloadAction<boolean>) {
      state.mobileMenuOpen = action.payload;
    },
    setColorModeOverride(state, action: PayloadAction<ColorMode | null>) {
      state.colorModeOverride = action.payload;
    },
    setLivePreview(state, action: PayloadAction<LiveAppearancePreview | null>) {
      state.livePreview = action.payload;
    },
  },
});

export const {
  setSession,
  setActiveOrganizationId,
  toggleSidebar,
  setMobileMenuOpen,
  setColorModeOverride,
  setLivePreview,
} = uiSlice.actions;

export default uiSlice.reducer;
