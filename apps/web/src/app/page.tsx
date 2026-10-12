"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Layers,
  Palette,
  ArrowRight,
  Warehouse,
  CheckCircle2,
  Activity,
  BarChart3,
  Sparkles,
  Barcode,
  Zap,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { INDUSTRY_PROFILES } from "@g-stock/config";

const LIVE_SECTOR_PREVIEWS: Record<
  string,
  {
    valuation: string;
    skus: string;
    serviceRate: string;
    turnover: string;
    series: Array<{ day: string; in: number; out: number }>;
  }
> = {
  wholesale: {
    valuation: "148 920 €",
    skus: "1 420 réf.",
    serviceRate: "98.6%",
    turnover: "6.4x / an",
    series: [
      { day: "Lun", in: 140, out: 85 },
      { day: "Mar", in: 95, out: 110 },
      { day: "Mer", in: 210, out: 130 },
      { day: "Jeu", in: 165, out: 140 },
      { day: "Ven", in: 260, out: 190 },
      { day: "Sam", in: 120, out: 75 },
      { day: "Dim", in: 185, out: 95 },
    ],
  },
  retail: {
    valuation: "64 350 €",
    skus: "890 réf.",
    serviceRate: "97.2%",
    turnover: "8.2x / an",
    series: [
      { day: "Lun", in: 60, out: 52 },
      { day: "Mar", in: 45, out: 68 },
      { day: "Mer", in: 110, out: 94 },
      { day: "Jeu", in: 80, out: 76 },
      { day: "Ven", in: 150, out: 142 },
      { day: "Sam", in: 190, out: 175 },
      { day: "Dim", in: 95, out: 80 },
    ],
  },
  pharmacy: {
    valuation: "212 400 €",
    skus: "3 150 réf.",
    serviceRate: "99.8%",
    turnover: "9.1x / an",
    series: [
      { day: "Lun", in: 310, out: 280 },
      { day: "Mar", in: 240, out: 260 },
      { day: "Mer", in: 290, out: 275 },
      { day: "Jeu", in: 340, out: 305 },
      { day: "Ven", in: 380, out: 350 },
      { day: "Sam", in: 210, out: 195 },
      { day: "Dim", in: 150, out: 140 },
    ],
  },
  logistics: {
    valuation: "492 000 €",
    skus: "4 800 réf.",
    serviceRate: "99.1%",
    turnover: "11.5x / an",
    series: [
      { day: "Lun", in: 520, out: 480 },
      { day: "Mar", in: 610, out: 540 },
      { day: "Mer", in: 490, out: 510 },
      { day: "Jeu", in: 720, out: 650 },
      { day: "Ven", in: 840, out: 790 },
      { day: "Sam", in: 390, out: 320 },
      { day: "Dim", in: 430, out: 310 },
    ],
  },
};

export default function HomePage() {
  const [selectedSector, setSelectedSector] = useState<string>("wholesale");
  const activePreview =
    LIVE_SECTOR_PREVIEWS[selectedSector] || LIVE_SECTOR_PREVIEWS.wholesale;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-control bg-primary text-primary-foreground flex items-center justify-center font-bold text-base shadow-sm">
              G
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight">G-Stock</span>
              <span className="ml-2 text-xs px-2 py-0.5 rounded bg-surface-muted text-muted font-semibold">
                SaaS v1.2 • Cockpit Temps Réel
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-control border border-border text-xs font-semibold hover:bg-surface-muted transition-colors"
            >
              <Activity size={14} className="text-primary" />
              <span>Cockpit Live</span>
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 rounded-control border border-border text-sm font-medium hover:bg-surface-muted transition-colors"
            >
              Connexion / Démo
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 rounded-control bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-1.5 shadow-sm hover:opacity-95 transition-opacity"
            >
              <span>Créer un espace entreprise</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 lg:px-8 py-10 space-y-16 animate-fade-up">
        {/* Hero + Cockpit de visualisation en direct */}
        <section className="grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-border text-xs font-semibold text-primary shadow-2xs">
              <Sparkles size={14} className="animate-pulse" />
              <span>Moteur Transactionnel PostgreSQL • Isolation Multi-Tenant • WCAG 2.2 AA</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              Pilotez vos stocks, entrepôts et marges avec une précision chirurgicale.
            </h1>
            <p className="text-base text-muted max-w-2xl leading-relaxed">
              Catalogue enrichi avec photos HD, codes-barres EAN-13, analyse Pareto ABC,
              flux multi-entrepôts, inventaires physiques mobiles et personnalisation
              complète aux couleurs de votre marque.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/login"
                className="px-6 py-3 rounded-control bg-primary text-primary-foreground font-semibold text-sm inline-flex items-center gap-2 shadow-sm hover:opacity-95 transition-all"
              >
                <Zap size={16} />
                <span>Tester la Démo Interactive en 1 clic</span>
              </Link>
              <Link
                href="/register"
                className="px-6 py-3 rounded-control border border-border bg-surface font-semibold text-sm hover:bg-surface-muted transition-colors"
              >
                Créer mon organisation isolée
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-3">
              <div className="gstock-card p-3">
                <div className="text-xs text-muted font-medium">Contrôle Stock</div>
                <div className="text-base font-extrabold text-primary">100% Atomique</div>
                <div className="text-[11px] text-muted">Verrouillage & Idempotence</div>
              </div>
              <div className="gstock-card p-3">
                <div className="text-xs text-muted font-medium">Fiches Produits</div>
                <div className="text-base font-extrabold text-primary">Vue 360° & EAN</div>
                <div className="text-[11px] text-muted">Photos, Marges & Specs</div>
              </div>
              <div className="gstock-card p-3">
                <div className="text-xs text-muted font-medium">Personnalisation</div>
                <div className="text-base font-extrabold text-primary">6 Thèmes Pro</div>
                <div className="text-[11px] text-muted">Tokens CSS & Logo</div>
              </div>
            </div>
          </div>

          {/* Widget Interactif de Visualisation en direct sur la page d'accueil */}
          <div className="lg:col-span-6 gstock-card p-5 space-y-4 shadow-lg border-primary/20">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="font-bold text-sm">
                  Aperçu Dynamique du Cockpit Analytique
                </span>
              </div>
              <div className="flex items-center gap-1 bg-surface-muted p-1 rounded-control text-[11px] font-semibold">
                {[
                  { id: "wholesale", label: "Grossiste" },
                  { id: "retail", label: "Commerce" },
                  { id: "pharmacy", label: "Pharmacie" },
                  { id: "logistics", label: "Logistique 3PL" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedSector(tab.id)}
                    className={`px-2 py-1 rounded transition-colors ${
                      selectedSector === tab.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-2.5 rounded-control bg-surface-muted/60 border border-border">
                <div className="text-[10px] text-muted uppercase font-bold">Valorisation</div>
                <div className="text-sm font-extrabold text-primary">
                  {activePreview.valuation}
                </div>
              </div>
              <div className="p-2.5 rounded-control bg-surface-muted/60 border border-border">
                <div className="text-[10px] text-muted uppercase font-bold">Catalogue</div>
                <div className="text-sm font-extrabold">{activePreview.skus}</div>
              </div>
              <div className="p-2.5 rounded-control bg-surface-muted/60 border border-border">
                <div className="text-[10px] text-muted uppercase font-bold">Taux Service</div>
                <div className="text-sm font-extrabold text-emerald-600">
                  {activePreview.serviceRate}
                </div>
              </div>
              <div className="p-2.5 rounded-control bg-surface-muted/60 border border-border">
                <div className="text-[10px] text-muted uppercase font-bold">Rotation</div>
                <div className="text-sm font-extrabold">{activePreview.turnover}</div>
              </div>
            </div>

            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activePreview.series}>
                  <defs>
                    <linearGradient id="homeIn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="homeOut" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d97706" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#d97706" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="in"
                    name="Réceptions (Entrées)"
                    stroke="var(--color-primary)"
                    strokeWidth={2.5}
                    fill="url(#homeIn)"
                  />
                  <Area
                    type="monotone"
                    dataKey="out"
                    name="Expéditions (Sorties)"
                    stroke="#d97706"
                    strokeWidth={2}
                    fill="url(#homeOut)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
              <span className="text-muted flex items-center gap-1.5">
                <Barcode size={14} className="text-primary" />
                <span>Simulation interactive par profil métier</span>
              </span>
              <Link href="/login" className="text-primary font-bold hover:underline">
                Ouvrir le vrai cockpit →
              </Link>
            </div>
          </div>
        </section>

        {/* Profils métiers */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold">
            Adaptable à chaque secteur d&apos;activité dès l&apos;ouverture de compte
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {Object.values(INDUSTRY_PROFILES).map((p) => (
              <div
                key={p.code}
                className="gstock-card gstock-card-interactive p-4 space-y-1.5"
              >
                <div className="font-semibold text-sm">{p.label}</div>
                <p className="text-xs text-muted">{p.description}</p>
                <div className="pt-1 flex flex-wrap gap-1">
                  {p.defaultUnits.slice(0, 4).map((u) => (
                    <span
                      key={u}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-surface-muted font-mono"
                    >
                      {u}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid md:grid-cols-3 gap-6">
          <div className="gstock-card gstock-card-interactive p-5 space-y-2">
            <Warehouse className="text-primary" size={22} />
            <h3 className="font-bold text-base">Multi-Entrepôts &amp; Emplacements</h3>
            <p className="text-xs text-muted leading-relaxed">
              Structurez vos dépôts en zones de stockage, quais de réception, expédition et
              quarantaine avec suivi des soldes disponibles en temps réel.
            </p>
          </div>
          <div className="gstock-card gstock-card-interactive p-5 space-y-2">
            <Layers className="text-primary" size={22} />
            <h3 className="font-bold text-base">Catalogue Visuel &amp; Fiches 360°</h3>
            <p className="text-xs text-muted leading-relaxed">
              Associez photos, codes-barres EAN-13, marques, fournisseurs, prix de vente,
              marges brutes et spécifications techniques à chaque référence.
            </p>
          </div>
          <div className="gstock-card gstock-card-interactive p-5 space-y-2">
            <Palette className="text-primary" size={22} />
            <h3 className="font-bold text-base">Personnalisation &amp; Accessibilité</h3>
            <p className="text-xs text-muted leading-relaxed">
              Adaptez les couleurs, la densité des tableaux, le rayon des cartes et le logo
              de votre société tout en garantissant un contraste WCAG 2.2 AA.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
