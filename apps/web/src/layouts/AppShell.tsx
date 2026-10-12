"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Warehouse,
  ArrowLeftRight,
  ClipboardCheck,
  Bell,
  Users,
  Palette,
  Settings,
  CreditCard,
  ShieldAlert,
  Menu,
  X,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Monitor,
  PlusCircle,
  Building2,
} from "lucide-react";
import { INDUSTRY_PROFILES } from "@g-stock/config";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  setSession,
  setActiveOrganizationId,
  toggleSidebar,
  setMobileMenuOpen,
  setColorModeOverride,
} from "@/store/ui-slice";
import {
  useGetMeQuery,
  useLogoutMutation,
  useCreateOrganizationMutation,
} from "@/store/api";

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

  const token = useAppSelector((s) => s.ui.token);
  const sidebarCollapsed = useAppSelector((s) => s.ui.sidebarCollapsed);
  const mobileMenuOpen = useAppSelector((s) => s.ui.mobileMenuOpen);
  const colorModeOverride = useAppSelector((s) => s.ui.colorModeOverride);
  const livePreview = useAppSelector((s) => s.ui.livePreview);

  const { data: meData, isLoading } = useGetMeQuery(undefined, { skip: !token });
  const [logout] = useLogoutMutation();
  const [createOrganization, { isLoading: isCreatingOrg }] =
    useCreateOrganizationMutation();

  const [newOrgModalOpen, setNewOrgModalOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgIndustry, setNewOrgIndustry] = useState("general");
  const [newOrgCurrency, setNewOrgCurrency] = useState("EUR");

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-foreground">
        <div className="gstock-card p-8 max-w-md w-full text-center space-y-4">
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

  const navItems = [
    {
      href: "/dashboard",
      label: "Tableau de bord",
      icon: LayoutDashboard,
      show: true,
    },
    {
      href: "/products",
      label: "Produits & Unités",
      icon: Package,
      show: permissions.has("products.read"),
    },
    {
      href: "/warehouses",
      label: "Entrepôts & Zones",
      icon: Warehouse,
      show: permissions.has("stock.read"),
    },
    {
      href: "/stock",
      label: "Mouvements & Soldes",
      icon: ArrowLeftRight,
      show: permissions.has("stock.read"),
    },
    {
      href: "/inventories",
      label: "Inventaires Physiques",
      icon: ClipboardCheck,
      show: permissions.has("stock.read"),
    },
    {
      href: "/alerts",
      label: "Alertes & Rapports",
      icon: Bell,
      show: permissions.has("stock.read"),
    },
    {
      href: "/team",
      label: "Équipe & Rôles",
      icon: Users,
      show: true,
    },
    {
      href: "/appearance",
      label: "Apparence & Marque",
      icon: Palette,
      show: true,
    },
    {
      href: "/settings",
      label: "Paramètres & Audit",
      icon: Settings,
      show: true,
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
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Sidebar Desktop */}
      <aside
        style={{
          width: sidebarCollapsed ? "4.5rem" : "var(--sidebar-width, 16.5rem)",
        }}
        className="hidden lg:flex flex-col border-r border-border bg-surface shrink-0 transition-all duration-150"
      >
        <div className="p-4 border-b border-border flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 overflow-hidden">
            {logoAssetId ? (
              <img
                src={logoAssetId.startsWith("data:") ? logoAssetId : `${apiOrigin}${logoAssetId}`}
                alt={displayName}
                className="w-8 h-8 rounded-control object-contain bg-surface-muted p-0.5 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-control bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0">
                G
              </div>
            )}
            {!sidebarCollapsed && (
              <div className="truncate">
                <div className="font-bold text-sm truncate">{displayName}</div>
                <div className="text-xs text-muted flex items-center gap-1">
                  <span>G-Stock SaaS</span>
                  {activeOrg?.isDemo && (
                    <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded text-[10px] font-semibold">
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
            className="p-1.5 rounded-control hover:bg-surface-muted text-muted"
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Sélecteur d'entreprise */}
        {!sidebarCollapsed && (
          <div className="p-3 border-b border-border space-y-2">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted">
              Organisation active
            </label>
            <div className="flex gap-1.5">
              <select
                aria-label="Sélectionner l'organisation active"
                value={activeOrg?.id || ""}
                onChange={(e) => dispatch(setActiveOrganizationId(e.target.value))}
                className="flex-1 text-xs rounded-control border border-border bg-background px-2.5 py-1.5 font-medium"
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
                title="Créer une nouvelle entreprise"
                className="p-1.5 rounded-control border border-border hover:bg-surface-muted text-muted"
              >
                <PlusCircle size={15} />
              </button>
            </div>
          </div>
        )}

        <nav className="flex-1 p-2.5 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-control text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-surface-muted"
                }`}
              >
                <Icon size={18} className="shrink-0" />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border">
          {!sidebarCollapsed && user && (
            <div className="mb-2 px-2">
              <div className="text-xs font-semibold truncate">{user.name}</div>
              <div className="text-[11px] text-muted truncate">{user.email}</div>
              <div className="text-[10px] text-primary font-semibold uppercase mt-0.5">
                Rôle : {activeOrg?.roles?.join(", ") || "membre"}
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-control text-xs font-medium border border-border hover:bg-surface-muted text-danger"
          >
            <LogOut size={15} />
            {!sidebarCollapsed && <span>Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* Drawer Mobile */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/50"
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
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-control text-sm font-medium ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-surface-muted"
                    }`}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Contenu Central */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 border-b border-border bg-surface px-4 lg:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => dispatch(setMobileMenuOpen(true))}
              className="lg:hidden p-2 rounded-control border border-border"
              aria-label="Ouvrir le menu"
            >
              <Menu size={18} />
            </button>
            <div className="truncate">
              <span className="text-xs font-medium text-muted hidden sm:inline">
                {activeOrg?.name || "Chargement..."}
              </span>
              {activeOrg?.isDemo && (
                <span className="ml-2 px-2 py-0.5 text-[11px] font-semibold rounded bg-amber-500/15 text-amber-700 dark:text-amber-300">
                  Environnement de démonstration isolé
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sélecteur rapide Clair / Sombre / Système */}
            <div className="flex items-center border border-border rounded-control p-0.5 bg-background">
              <button
                type="button"
                onClick={() => dispatch(setColorModeOverride("light"))}
                title="Mode clair"
                className={`p-1.5 rounded text-xs ${
                  colorModeOverride === "light"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted"
                }`}
              >
                <Sun size={14} />
              </button>
              <button
                type="button"
                onClick={() => dispatch(setColorModeOverride("dark"))}
                title="Mode sombre"
                className={`p-1.5 rounded text-xs ${
                  colorModeOverride === "dark"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted"
                }`}
              >
                <Moon size={14} />
              </button>
              <button
                type="button"
                onClick={() => dispatch(setColorModeOverride("system"))}
                title="Mode système"
                className={`p-1.5 rounded text-xs ${
                  colorModeOverride === "system"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted"
                }`}
              >
                <Monitor size={14} />
              </button>
            </div>

            {activeOrg?.subscription && (
              <Link
                href="/billing"
                className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-control text-xs font-semibold border border-border bg-surface-muted"
              >
                <span>Plan {activeOrg.subscription.plan?.name || "Pro"}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </Link>
            )}
          </div>
        </header>

        {/* Bannière si abonnement expiré/suspendu */}
        {activeOrg?.subscription &&
          ["canceled", "suspended", "expired"].includes(activeOrg.subscription.status) && (
            <div className="bg-red-600 text-white px-6 py-2.5 text-xs font-medium flex items-center justify-between">
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
        <main className="flex-1 p-4 lg:p-6 max-w-7xl w-full mx-auto space-y-6">
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

      {/* Modal de création d'une nouvelle organisation */}
      {newOrgModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="gstock-card p-6 max-w-md w-full space-y-4">
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
