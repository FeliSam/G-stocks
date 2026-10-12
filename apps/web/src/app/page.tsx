"use client";

import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Layers,
  Palette,
  ArrowRight,
  Warehouse,
  CheckCircle2,
} from "lucide-react";
import { INDUSTRY_PROFILES } from "@g-stock/config";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border bg-surface">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-control bg-primary text-primary-foreground flex items-center justify-center font-bold text-base">
              G
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight">G-Stock</span>
              <span className="ml-2 text-xs px-2 py-0.5 rounded bg-surface-muted text-muted font-medium">
                SaaS v1.1
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 rounded-control border border-border text-sm font-medium hover:bg-surface-muted"
            >
              Connexion
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 rounded-control bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-1.5"
            >
              <span>Créer un espace entreprise</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 lg:px-8 py-12 space-y-16">
        <section className="grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-border text-xs font-semibold text-primary">
              <ShieldCheck size={14} />
              <span>Moteur transactionnel PostgreSQL • Isolation Multi-Tenant • RBAC</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              La plateforme universelle et fiable de gestion des stocks multi-secteurs.
            </h1>
            <p className="text-base text-muted max-w-2xl leading-relaxed">
              Gérez vos produits, unités de mesure, entrepôts, réceptions, sorties,
              transferts et inventaires physiques avec une traçabilité immuable et une
              personnalisation visuelle complète aux couleurs de votre entreprise.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/register"
                className="px-6 py-3 rounded-control bg-primary text-primary-foreground font-semibold text-sm inline-flex items-center gap-2"
              >
                <span>Démarrer un espace entreprise</span>
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/login"
                className="px-6 py-3 rounded-control border border-border bg-surface font-semibold text-sm hover:bg-surface-muted"
              >
                Accéder à mon compte / Démo isolée
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 gstock-card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="font-bold text-sm">Garanties d&apos;architecture G-Stock</span>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold">
                Vérifié côté serveur
              </span>
            </div>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 size={18} className="text-primary shrink-0 mt-0.5" />
                <span>
                  <strong>Invariants de stock stricts :</strong> mouvements immuables, clés
                  d&apos;idempotence, contrepassations et contrôle de stock négatif.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 size={18} className="text-primary shrink-0 mt-0.5" />
                <span>
                  <strong>Isolation multi-entreprises :</strong> séparation hermétique des
                  organisations, rôles RBAC et journal d&apos;audit expurgé des secrets.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 size={18} className="text-primary shrink-0 mt-0.5" />
                <span>
                  <strong>Design System &amp; Marque :</strong> 6 thèmes, tokens CSS validés
                  WCAG 2.2 AA, modes clair/sombre/système et logo d&apos;entreprise.
                </span>
              </li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold">
            Adaptable à chaque secteur d&apos;activité dès l&apos;ouverture de compte
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {Object.values(INDUSTRY_PROFILES).map((p) => (
              <div key={p.code} className="gstock-card p-4 space-y-1.5">
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
          <div className="gstock-card p-5 space-y-2">
            <Warehouse className="text-primary" size={22} />
            <h3 className="font-bold text-base">Multi-Entrepôts &amp; Emplacements</h3>
            <p className="text-xs text-muted leading-relaxed">
              Structurez vos dépôts en zones de stockage, quais de réception, expédition et
              quarantaine avec suivi des soldes disponibles en temps réel.
            </p>
          </div>
          <div className="gstock-card p-5 space-y-2">
            <Layers className="text-primary" size={22} />
            <h3 className="font-bold text-base">Inventaires Physiques &amp; Écarts</h3>
            <p className="text-xs text-muted leading-relaxed">
              Ouvrez une campagne d&apos;inventaire, saisissez vos comptages sur ordinateur ou
              mobile sans écraser le stock théorique, et validez les écarts en un clic.
            </p>
          </div>
          <div className="gstock-card p-5 space-y-2">
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
