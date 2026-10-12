"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Warehouse,
  ArrowLeftRight,
  ClipboardCheck,
  AlertTriangle,
  Users,
  Palette,
  Settings,
  CreditCard,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  LogOut,
  PlusCircle,
  Sun,
  Moon,
  Monitor,
  Menu,
  X,
  Building2,
  Search,
  Sparkles,
  Activity,
  Command,
  ArrowRight,
  Barcode,
} from "lucide-react";
import {
  useGetMeQuery,
  useLogoutMutation,
  useCreateOrganizationMutation,
  useGetReportsOverviewQuery,
  useGetProductsQuery,
} from "@/store/api";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  setActiveOrganizationId,
  setColorModeOverride,
  setMobileMenuOpen,
  setSession,
  toggleSidebar,
} from "@/store/ui-slice";
import { formatCurrencyAmount } from "@g-stock/ui";
import { INDUSTRY_PROFILES, resolveDesignTokens } from "@g-stock/config";
import type { ColorMode, DesignTokens, ThemePresetId } from "@g-stock/types";

export function AppShell({
  children,
  title,
  subtitle,
  actions,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { token, activeOrganizationId, sidebarCollapsed, mobileMenuOpen, colorModeOverride, livePreview } =
    useAppSelector((s) => s.ui);

  const { data: meData, isLoading } = useGetMeQuery(undefined, {
    skip: !token,
  });
  const { data: overviewRes } = useGetReportsOverviewQuery(
    { days: 30 },
    { skip: !token }
  );
  const { data: quickProductsRes } = useGetProductsQuery(
    { page: 1, limit: 20 },
    { skip: !token }
  );

  const [logout] = useLogoutMutation();
  const [createOrganization, { isLoading: isCreatingOrg }] = useCreateOrganizationMutation();

  const [newOrgModalOpen, setNewOrgModalOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgIndustry, setNewOrgIndustry] = useState("general");
  const [newOrgCurrency, setNewOrgCurrency] = useState("EUR");

  // Palette de commandes rapide (Ctrl+K)
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");

  useEffect(() => {
    const storedToken = localStorage.getItem("gstock_token");
    const storedOrg = localStorage.getItem("gstock_org_id");
    if (storedToken && !token) {
      dispatch(setSession({ token: storedToken, organizationId: storedOrg }));
    }
  }, [dispatch, token]);

  useEffect(() => {
    if (meData?.activeOrganization?.id && !activeOrganizationId) {
      dispatch(setActiveOrganizationId(meData.activeOrganization.id));
    }
  }, [meData, activeOrganizationId, dispatch]);

  // Raccourci clavier global Ctrl+K / Cmd+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        setCommandOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Application dynamique des Design Tokens CSS (thème entreprise + préférences utilisateur + aperçu live)
  useEffect(() => {
    const activeOrg = meData?.activeOrganization;
    const orgTheme = activeOrg?.theme;
    const userPref = meData?.userPreference;

    const preset: ThemePresetId =
      (livePreview?.themePreset as ThemePresetId) ||
      (orgTheme?.themePreset as ThemePresetId) ||
      "gstock-classic";

    const rawMode: ColorMode =
      livePreview?.colorMode ||
      colorModeOverride ||
      (orgTheme?.forceBrandTheme
        ? (orgTheme?.colorModeDefault as ColorMode)
        : (userPref?.colorMode as ColorMode) ||
          (orgTheme?.colorModeDefault as ColorMode)) ||
      "light";

    const prefersDark =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const effectiveMode: "light" | "dark" =
      rawMode === "system" ? (prefersDark ? "dark" : "light") : rawMode;

    const customColors = (livePreview?.customTokens ||
      orgTheme?.designTokens ||
      {}) as Partial<DesignTokens>;

    const resolvedTokens = resolveDesignTokens({
      preset,
      mode: effectiveMode,
      customColors,
      radiusScale: (livePreview?.radiusScale || orgTheme?.radiusScale || "standard") as any,
      tableDensity: (livePreview?.tableDensity ||
        userPref?.tableDensity ||
        orgTheme?.tableDensity ||
        "standard") as any,
      fontScale: (livePreview?.fontScale || orgTheme?.fontScale || "standard") as any,
      sidebarStyle: (livePreview?.sidebarStyle || orgTheme?.sidebarStyle || "standard") as any,
    });

    const root = document.documentElement;
    root.classList.toggle("dark", effectiveMode === "dark");
    Object.entries(resolvedTokens).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, [meData, colorModeOverride, livePreview]);

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-foreground">
        <div className="gstock-card p-8 max-w-md w-full text-center space-y-4 animate-fade-up">
          <h1 className="text-xl font-bold">Session requise</h1>
          <p className="text-sm text-muted">
            Veuillez vous connecter à votre espace G-Stock pour accéder à cette page.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Link
              href="/login"
              className="px-4 py-2 rounded-control bg-primary text-primary-foreground font-medium text-sm"
            >
              Se connecter
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 rounded-control border border-border text-sm font-medium"
            >
              Créer un compte
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const activeOrg = meData?.activeOrganization;
  const user = meData?.user;
  const organizations = meData?.organizations || [];
  const permissions = new Set<string>(activeOrg?.permissions || []);
  const displayName =
    livePreview?.displayName ||
    activeOrg?.branding?.displayName ||
    activeOrg?.name ||
    "G-Stock";
  const logoAssetId = activeOrg?.branding?.logoAssetId;
  const apiOrigin = (
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1"
  ).replace(/\/api\/v1$/, "");

  const kpis = overviewRes?.data?.kpis;
  const totalAlerts = (kpis?.lowStockCount || 0) + (kpis?.outOfStockCount || 0);
  const serviceLevelRate = kpis?.serviceLevelRate ?? 92;

  const navItems = [
    {
      href: "/dashboard",
      label: "Tableau de bord",
      icon: LayoutDashboard,
      show: true,
      badge: "Live",
      badgeTone: "emerald",
    },
    {
      href: "/products",
      label: "Catalogue & Unités",
      icon: Package,
      show: permissions.has("products.read"),
      badge: kpis?.activeProductsCount ? String(kpis.activeProductsCount) : undefined,
      badgeTone: "neutral",
    },
    {
      href: "/warehouses",
      label: "Entrepôts & Zones",
      icon: Warehouse,
      show: permissions.has("warehouses.read"),
      badge: kpis?.activeWarehousesCount ? String(kpis.activeWarehousesCount) : undefined,
      badgeTone: "neutral",
    },
    {
      href: "/stock",
      label: "Mouvements de Stock",
      icon: ArrowLeftRight,
      show: permissions.has("stock.read"),
    },
    {
      href: "/inventories",
      label: "Inventaires Physiques",
      icon: ClipboardCheck,
      show: permissions.has("inventory.read"),
    },
    {
      href: "/alerts",
      label: "Alertes & Rapports",
      icon: AlertTriangle,
      show: permissions.has("reports.read") || permissions.has("stock.read"),
      badge: totalAlerts > 0 ? String(totalAlerts) : undefined,
      badgeTone: (kpis?.outOfStockCount || 0) > 0 ? "danger" : "warning",
      pulseBadge: totalAlerts > 0,
    },
    {
      href: "/team",
      label: "Équipe & Rôles RBAC",
      icon: Users,
      show: permissions.has("members.read"),
    },
    {
      href: "/appearance",
      label: "Apparence & Marque",
      icon: Palette,
      show: permissions.has("appearance.read"),
      badge: "WCAG",
      badgeTone: "primary",
    },
    {
      href: "/settings",
      label: "Paramètres & Modules",
      icon: Settings,
      show: permissions.has("settings.read"),
    },
    {
      href: "/billing",
      label: "Abonnement & Quotas",
      icon: CreditCard,
      show: permissions.has("billing.read") || permissions.has("billing.manage"),
    },
    {
      href: "/admin",
      label: "Admin Plateforme",
      icon: ShieldAlert,
      show: Boolean(user?.isPlatformAdmin),
    },
  ].filter((item) => item.show);

  const quickProducts = quickProductsRes?.data || [];
  const filteredNav = navItems.filter((n) =>
    n.label.toLowerCase().includes(commandQuery.trim().toLowerCase())
  );
  const filteredProducts = quickProducts
    .filter(
      (p: any) =>
        String(p.name || "").toLowerCase().includes(commandQuery.trim().toLowerCase()) ||
        String(p.sku || "").toLowerCase().includes(commandQuery.trim().toLowerCase()) ||
        String(p.barcode || "").toLowerCase().includes(commandQuery.trim().toLowerCase())
    )
    .slice(0, 5);

  async function handleLogout() {
    await logout();
    dispatch(setSession({ token: null, organizationId: null }));
    router.push("/login");
  }

  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    const res = await createOrganization({
      name: newOrgName.trim(),
      industryProfile: newOrgIndustry,
      defaultCurrency: newOrgCurrency,
      countryCode: "FR",
      timezone: "Europe/Paris",
    }).unwrap();
    dispatch(setActiveOrganizationId(res.data.id));
    setNewOrgName("");
    setNewOrgModalOpen(false);
  }

  return (
    <div className="h-screen overflow-hidden flex bg-background text-foreground">
      {/* BARRE DE NAVIGATION GAUCHE FIXE (Ne défile jamais avec la page, animée et dynamique) */}
      <aside
        style={{
          width: sidebarCollapsed ? "4.75rem" : "var(--sidebar-width, 16.75rem)",
        }}
        className="hidden lg:flex flex-col h-screen sticky top-0 shrink-0 select-none overflow-hidden border-r border-border bg-surface transition-[width] duration-300 ease-out z-30 shadow-sm"
      >
        {/* En-tête de marque animé */}
        <div className="p-3.5 border-b border-border flex items-center justify-between gap-2 relative overflow-hidden">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="relative group shrink-0">
              {logoAssetId ? (
                <img
                  src={logoAssetId.startsWith("data:") ? logoAssetId : `${apiOrigin}${logoAssetId}`}
                  alt={displayName}
                  className="w-9 h-9 rounded-control object-contain bg-surface-muted p-0.5 shrink-0 transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="w-9 h-9 rounded-control bg-primary text-primary-foreground flex items-center justify-center font-extrabold text-sm shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
                  G
                </div>
              )}
              <span
                title="Moteur transactionnel synchronisé"
                className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5"
              >
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-surface" />
              </span>
            </div>

            {!sidebarCollapsed && (
              <div className="truncate">
                <div className="font-bold text-sm truncate tracking-tight">{displayName}</div>
                <div className="text-[11px] text-muted flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1">
                    <Sparkles size={10} className="text-primary animate-pulse" />
                    <span>Cockpit Temps Réel</span>
                  </span>
                  {activeOrg?.isDemo && (
                    <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded text-[9px] font-bold">
                      DÉMO
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => dispatch(toggleSidebar())}
            title={sidebarCollapsed ? "Déplier la navigation" : "Replier la navigation"}
            className="p-1.5 rounded-control hover:bg-surface-muted text-muted transition-transform duration-200 hover:scale-110 active:scale-95 shrink-0"
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Sélecteur d'entreprise + Palette de recherche rapide Ctrl+K */}
        {!sidebarCollapsed ? (
          <div className="px-3 py-2.5 border-b border-border space-y-2 bg-surface-muted/30">
            <div className="flex gap-1.5">
              <select
                aria-label="Sélectionner l'organisation active"
                value={activeOrg?.id || ""}
                onChange={(e) => dispatch(setActiveOrganizationId(e.target.value))}
                className="flex-1 text-xs rounded-control border border-border bg-background px-2.5 py-1.5 font-semibold truncate transition-colors focus:border-primary"
              >
                {organizations.map((o: any) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setNewOrgModalOpen(true)}
                title="Créer une nouvelle entreprise isolée"
                className="p-1.5 rounded-control border border-border bg-background hover:bg-surface-muted text-muted hover:text-primary transition-all duration-200 hover:scale-105"
              >
                <PlusCircle size={15} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-control border border-border bg-background/90 hover:border-primary/50 text-xs text-muted transition-all duration-200 group"
            >
              <span className="flex items-center gap-2 truncate">
                <Search
                  size={13}
                  className="text-muted group-hover:text-primary transition-transform duration-200 group-hover:scale-110"
                />
                <span className="truncate">Recherche rapide...</span>
              </span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-surface-muted rounded border border-border text-muted">
                Ctrl K
              </kbd>
            </button>
          </div>
        ) : (
          <div className="p-2 border-b border-border flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              title="Recherche rapide (Ctrl+K)"
              className="p-2 rounded-control border border-border hover:bg-surface-muted text-muted hover:text-primary transition-transform hover:scale-105"
            >
              <Search size={16} />
            </button>
          </div>
        )}

        {/* Liens de navigation animés (sans barre de défilement) */}
        <nav
          aria-label="Navigation principale"
          className="flex-1 px-2.5 py-2 space-y-0.5 flex flex-col justify-start overflow-hidden"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname?.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                title={sidebarCollapsed ? item.label : undefined}
                className={`group relative flex items-center justify-between gap-2.5 px-3 py-2 rounded-control text-xs font-semibold transition-all duration-200 ${
                  active
                    ? "bg-primary text-primary-foreground shadow-sm translate-x-0.5"
                    : "text-foreground hover:bg-surface-muted/80 hover:translate-x-1"
                }`}
              >
                {/* Barre latérale lumineuse animée sur l'élément actif */}
                {active && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-primary-foreground/90 animate-pulse" />
                )}

                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    size={17}
                    className={`shrink-0 transition-transform duration-200 ${
                      active
                        ? "scale-110"
                        : "text-muted group-hover:text-primary group-hover:scale-110 group-hover:-rotate-6"
                    }`}
                  />
                  {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                </div>

                {!sidebarCollapsed && item.badge && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none shrink-0 flex items-center gap-1 transition-transform duration-200 group-hover:scale-105 ${
                      active
                        ? "bg-white/20 text-primary-foreground"
                        : item.badgeTone === "danger"
                          ? "bg-red-500/15 text-danger"
                          : item.badgeTone === "warning"
                            ? "bg-amber-500/15 text-amber-600"
                            : item.badgeTone === "emerald"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : item.badgeTone === "primary"
                                ? "bg-primary/15 text-primary"
                                : "bg-surface-muted text-muted border border-border"
                    }`}
                  >
                    {item.pulseBadge && (
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
                    )}
                    <span>{item.badge}</span>
                  </span>
                )}

                {sidebarCollapsed && item.pulseBadge && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger animate-ping" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Mini-widget dynamique "Santé du Stock" ancré en bas de la barre latérale */}
        {!sidebarCollapsed && (
          <div className="mx-2.5 mb-2 p-2.5 rounded-control border border-border bg-surface-muted/40 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold flex items-center gap-1 text-muted">
                <Activity size={12} className="text-primary animate-pulse" />
                <span>Santé du stock</span>
              </span>
              <span className="font-extrabold text-primary">{serviceLevelRate}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
              <div
                style={{ width: `${Math.min(100, Math.max(8, serviceLevelRate))}%` }}
                className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted">
              <span>
                Valeur :{" "}
                <strong className="text-foreground">
                  {formatCurrencyAmount(kpis?.estimatedStockValue ?? 0, kpis?.currency || "EUR")}
                </strong>
              </span>
              <Link href="/stock" className="text-primary font-semibold hover:underline">
                + Flux
              </Link>
            </div>
          </div>
        )}

        {/* Pied de sidebar fixe : Profil utilisateur & Déconnexion */}
        <div className="p-2.5 border-t border-border bg-surface">
          {!sidebarCollapsed && user && (
            <div className="mb-2 px-2 py-1.5 rounded-control bg-surface-muted/40 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-bold truncate">{user.name}</div>
                <div className="text-[10px] text-primary font-semibold uppercase truncate">
                  {activeOrg?.roles?.join(", ") || "membre"}
                </div>
              </div>
              <span className="w-7 h-7 rounded-full bg-primary/15 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                {String(user.name || "U")
                  .slice(0, 1)
                  .toUpperCase()}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-control text-xs font-semibold border border-border hover:bg-red-500/10 hover:border-red-500/30 text-danger transition-all duration-200"
          >
            <LogOut size={14} />
            {!sidebarCollapsed && <span>Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* Drawer Mobile */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => dispatch(setMobileMenuOpen(false))}
          />
          <aside className="relative z-10 w-72 max-w-full bg-surface border-r border-border flex flex-col h-full">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <span className="font-bold text-base">{displayName}</span>
              <button
                type="button"
                onClick={() => dispatch(setMobileMenuOpen(false))}
                className="p-1.5 rounded-control hover:bg-surface-muted"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => dispatch(setMobileMenuOpen(false))}
                    className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-control text-sm font-medium ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-surface-muted"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </span>
                    {item.badge && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-muted text-foreground">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* CONTENU CENTRAL DÉFILANT INDÉPENDAMMENT */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto scroll-smooth">
        {/* Topbar sticky */}
        <header className="h-14 sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur-md px-4 lg:px-6 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => dispatch(setMobileMenuOpen(true))}
              className="lg:hidden p-2 rounded-control border border-border"
              aria-label="Ouvrir le menu"
            >
              <Menu size={18} />
            </button>
            <div className="truncate flex items-center gap-2">
              <span className="text-xs font-semibold text-muted hidden sm:inline">
                {activeOrg?.name || "Chargement..."}
              </span>
              {activeOrg?.isDemo && (
                <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-amber-500/15 text-amber-700 dark:text-amber-300">
                  Environnement [DÉMO] isolé
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-control border border-border bg-background text-xs text-muted hover:text-foreground hover:border-primary/40 transition-colors"
            >
              <Command size={13} className="text-primary" />
              <span>Palette rapide</span>
              <kbd className="px-1.5 py-0.2 bg-surface-muted rounded text-[10px] font-mono">
                Ctrl K
              </kbd>
            </button>

            {/* Sélecteur rapide Clair / Sombre / Système */}
            <div className="flex items-center border border-border rounded-control p-0.5 bg-background">
              <button
                type="button"
                onClick={() => dispatch(setColorModeOverride("light"))}
                title="Mode clair"
                className={`p-1.5 rounded text-xs transition-colors ${
                  colorModeOverride === "light"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <Sun size={14} />
              </button>
              <button
                type="button"
                onClick={() => dispatch(setColorModeOverride("dark"))}
                title="Mode sombre"
                className={`p-1.5 rounded text-xs transition-colors ${
                  colorModeOverride === "dark"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <Moon size={14} />
              </button>
              <button
                type="button"
                onClick={() => dispatch(setColorModeOverride("system"))}
                title="Mode système"
                className={`p-1.5 rounded text-xs transition-colors ${
                  colorModeOverride === "system"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <Monitor size={14} />
              </button>
            </div>

            {activeOrg?.subscription && (
              <Link
                href="/billing"
                className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-control text-xs font-semibold border border-border bg-surface-muted hover:border-primary/40 transition-colors"
              >
                <span>Plan {activeOrg.subscription.plan?.name || "Pro"}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </Link>
            )}
          </div>
        </header>

        {/* Bannière si abonnement expiré/suspendu */}
        {activeOrg?.subscription &&
          ["canceled", "suspended", "expired"].includes(activeOrg.subscription.status) && (
            <div className="bg-red-600 text-white px-6 py-2.5 text-xs font-medium flex items-center justify-between shrink-0">
              <span>
                Votre abonnement est actuellement suspendu ou expiré. Vos données sont
                intégralement conservées en lecture seule, mais les écritures de stock sont
                bloquées.
              </span>
              <Link href="/billing" className="underline font-bold">
                Réactiver l&apos;abonnement
              </Link>
            </div>
          )}

        {/* En-tête de page et contenu */}
        <main className="flex-1 p-4 lg:p-6 max-w-7xl w-full mx-auto space-y-6 animate-fade-up">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
              {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
          </div>

          {isLoading ? (
            <div className="gstock-card p-8 text-center text-sm text-muted">
              Chargement du contexte sécurisé de l&apos;organisation...
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      {/* Modal Palette de Commandes Rapides (Ctrl+K) */}
      {commandOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-xs p-4 pt-20"
          onClick={() => setCommandOpen(false)}
        >
          <div
            className="gstock-card max-w-xl w-full overflow-hidden shadow-2xl animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3.5 border-b border-border flex items-center gap-3 bg-surface-muted/40">
              <Search size={18} className="text-primary shrink-0" />
              <input
                type="text"
                autoFocus
                value={commandQuery}
                onChange={(e) => setCommandQuery(e.target.value)}
                placeholder="Rechercher un produit (SKU, nom, code-barres) ou un écran..."
                className="flex-1 bg-transparent text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => setCommandOpen(false)}
                className="px-2 py-0.5 text-[11px] rounded border border-border text-muted hover:text-foreground"
              >
                Échap
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto p-3 space-y-4">
              {filteredProducts.length > 0 && (
                <div className="space-y-1.5">
                  <div className="px-2 text-[11px] font-bold uppercase tracking-wider text-muted">
                    Références Produits ({filteredProducts.length})
                  </div>
                  {filteredProducts.map((p: any) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setCommandOpen(false);
                        router.push("/products");
                      }}
                      className="w-full flex items-center justify-between gap-3 p-2 rounded-control hover:bg-surface-muted text-left transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="w-9 h-9 rounded object-cover border border-border shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                            {String(p.sku || "P").slice(0, 2)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">{p.name}</div>
                          <div className="text-[11px] text-muted font-mono flex items-center gap-2">
                            <span>SKU: {p.sku}</span>
                            {p.barcode && (
                              <span className="inline-flex items-center gap-1">
                                <Barcode size={11} /> {p.barcode}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-surface-muted border border-border shrink-0">
                        Stock : {p.available ?? p.totalOnHand ?? 0} {p.baseUnit?.code || "UN"}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-1">
                <div className="px-2 text-[11px] font-bold uppercase tracking-wider text-muted">
                  Navigation & Actions Rapides
                </div>
                {filteredNav.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => {
                        setCommandOpen(false);
                        router.push(item.href);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-control hover:bg-surface-muted text-xs font-semibold transition-colors"
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon size={15} className="text-primary" />
                        <span>{item.label}</span>
                      </span>
                      <ArrowRight size={14} className="text-muted" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de création d'une nouvelle organisation */}
      {newOrgModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="gstock-card p-6 max-w-md w-full space-y-4 animate-fade-up">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Building2 size={18} />
                <span>Nouvelle organisation isolée</span>
              </h2>
              <button
                type="button"
                onClick={() => setNewOrgModalOpen(false)}
                className="p-1 text-muted hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateOrg} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Nom de l&apos;entreprise
                </label>
                <input
                  type="text"
                  required
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="Ex: Entrepôts du Sud SAS"
                  className="w-full px-3 py-2 text-sm rounded-control border border-border bg-background"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Profil d&apos;activité
                </label>
                <select
                  value={newOrgIndustry}
                  onChange={(e) => setNewOrgIndustry(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-control border border-border bg-background"
                >
                  {Object.values(INDUSTRY_PROFILES).map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Devise par défaut</label>
                <select
                  value={newOrgCurrency}
                  onChange={(e) => setNewOrgCurrency(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-control border border-border bg-background"
                >
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                  <option value="CHF">CHF (Fr.)</option>
                  <option value="CAD">CAD ($)</option>
                  <option value="XOF">XOF (CFA)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewOrgModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-control border border-border"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isCreatingOrg}
                  className="px-4 py-2 text-xs font-semibold rounded-control bg-primary text-primary-foreground"
                >
                  {isCreatingOrg ? "Création..." : "Créer l'espace"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
