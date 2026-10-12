"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@g-stock/validation";
import type { z } from "zod";
import { useAppDispatch } from "@/store";
import { setSession } from "@/store/ui-slice";
import { useLoginMutation } from "@/store/api";

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [login, { isLoading }] = useLoginMutation();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    try {
      const res = await login(values).unwrap();
      const firstOrgId = res.organizations?.[0]?.id || null;
      dispatch(setSession({ token: res.token, organizationId: firstOrgId }));
      router.push("/dashboard");
    } catch (err: any) {
      setServerError(
        err?.data?.error?.message || "Erreur lors de la connexion. Vérifiez vos identifiants."
      );
    }
  }

  function fillDemoAccount(email: string, pass: string) {
    setValue("email", email);
    setValue("password", pass);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground">
      <div className="gstock-card p-6 sm:p-8 max-w-md w-full space-y-6">
        <div className="space-y-1">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-primary text-sm">
            ← Retour à l&apos;accueil G-Stock
          </Link>
          <h1 className="text-2xl font-bold pt-2">Connexion à votre espace</h1>
          <p className="text-xs text-muted">
            Accédez à votre organisation ou utilisez un compte de démonstration isolé.
          </p>
        </div>

        {serverError && (
          <div
            role="alert"
            className="p-3 rounded-control bg-red-500/10 border border-red-500/30 text-danger text-xs font-medium"
          >
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-xs font-semibold mb-1">
              Adresse email professionnelle
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              {...register("email")}
              className="w-full px-3 py-2 text-sm rounded-control border border-border bg-background"
              placeholder="vous@entreprise.fr"
            />
            {errors.email && (
              <p className="text-xs text-danger mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="login-password" className="block text-xs font-semibold mb-1">
              Mot de passe
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              {...register("password")}
              className="w-full px-3 py-2 text-sm rounded-control border border-border bg-background"
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="text-xs text-danger mt-1">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-control bg-primary text-primary-foreground text-sm font-semibold"
          >
            {isLoading ? "Authentification en cours..." : "Se connecter"}
          </button>
        </form>

        {/* Accès rapide aux comptes de démonstration explicitement identifiés */}
        <div className="pt-4 border-t border-border space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">
              Comptes de démonstration pré-configurés
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold">
              Données [DÉMO] isolées
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => fillDemoAccount("admin@g-stock.local", "GStockAdmin2026!")}
              className="text-left px-3 py-2 rounded-control border border-border hover:bg-surface-muted text-xs"
            >
              <div className="font-semibold">
                Propriétaire &amp; Admin Plateforme ([DÉMO] Distribution Horizon)
              </div>
              <div className="text-muted font-mono text-[11px]">
                admin@g-stock.local • GStockAdmin2026!
              </div>
            </button>
            <button
              type="button"
              onClick={() =>
                fillDemoAccount("responsable@horizon-demo.local", "GStockDemo2026!")
              }
              className="text-left px-3 py-2 rounded-control border border-border hover:bg-surface-muted text-xs"
            >
              <div className="font-semibold">
                Responsable de Stock ([DÉMO] Distribution Horizon)
              </div>
              <div className="text-muted font-mono text-[11px]">
                responsable@horizon-demo.local • GStockDemo2026!
              </div>
            </button>
          </div>
        </div>

        <div className="text-center text-xs text-muted pt-2">
          Nouvelle entreprise sur G-Stock ?{" "}
          <Link href="/register" className="text-primary font-semibold underline">
            Créer un compte et configurer mon activité
          </Link>
        </div>
      </div>
    </div>
  );
}
