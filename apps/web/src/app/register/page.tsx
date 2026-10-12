"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema } from "@g-stock/validation";
import { INDUSTRY_PROFILES } from "@g-stock/config";
import type { z } from "zod";
import { useAppDispatch } from "@/store";
import { setSession } from "@/store/ui-slice";
import { useRegisterMutation } from "@/store/api";

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [registerUser, { isLoading }] = useRegisterMutation();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      organizationName: "",
      industryProfile: "general",
      countryCode: "FR",
      defaultCurrency: "EUR",
      timezone: "Europe/Paris",
    },
  });

  const selectedProfile = watch("industryProfile");

  async function onSubmit(values: RegisterFormValues) {
    setServerError(null);
    try {
      const res = await registerUser(values).unwrap();
      dispatch(
        setSession({
          token: res.token,
          organizationId: res.organization?.id || null,
        })
      );
      router.push("/dashboard");
    } catch (err: any) {
      setServerError(
        err?.data?.error?.message || "Impossible de finaliser l'inscription."
      );
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground">
      <div className="gstock-card p-6 sm:p-8 max-w-2xl w-full space-y-6">
        <div>
          <Link href="/" className="text-xs font-bold text-primary">
            ← Retour à l&apos;accueil
          </Link>
          <h1 className="text-2xl font-bold mt-2">
            Créer votre organisation sur G-Stock
          </h1>
          <p className="text-xs text-muted">
            Votre espace entreprise sera isolé, pré-configuré avec vos unités et un entrepôt
            principal.
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Votre nom complet</label>
              <input
                type="text"
                {...register("name")}
                placeholder="Jean Dupont"
                className="w-full px-3 py-2 text-sm rounded-control border border-border bg-background"
              />
              {errors.name && (
                <p className="text-xs text-danger mt-1">{errors.name.message}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Email professionnel</label>
              <input
                type="email"
                {...register("email")}
                placeholder="j.dupont@societe.fr"
                className="w-full px-3 py-2 text-sm rounded-control border border-border bg-background"
              />
              {errors.email && (
                <p className="text-xs text-danger mt-1">{errors.email.message}</p>
              )}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">
                Mot de passe (8 caractères min.)
              </label>
              <input
                type="password"
                {...register("password")}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm rounded-control border border-border bg-background"
              />
              {errors.password && (
                <p className="text-xs text-danger mt-1">{errors.password.message}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                Nom de l&apos;entreprise / organisation
              </label>
              <input
                type="text"
                required
                {...register("organizationName")}
                placeholder="Ex: Logistique Atlantique SAS"
                className="w-full px-3 py-2 text-sm rounded-control border border-border bg-background"
              />
              {errors.organizationName && (
                <p className="text-xs text-danger mt-1">
                  {errors.organizationName.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-2">
              Sélectionnez votre profil d&apos;activité au démarrage
            </label>
            <div className="grid sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto p-1">
              {Object.values(INDUSTRY_PROFILES).map((prof) => {
                const active = selectedProfile === prof.code;
                return (
                  <button
                    key={prof.code}
                    type="button"
                    onClick={() => setValue("industryProfile", prof.code)}
                    className={`text-left p-3 rounded-control border transition-colors ${
                      active
                        ? "border-primary bg-primary/10"
                        : "border-border bg-surface hover:bg-surface-muted"
                    }`}
                  >
                    <div className="font-semibold text-xs">{prof.label}</div>
                    <div className="text-[11px] text-muted line-clamp-2 mt-0.5">
                      {prof.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Pays</label>
              <input
                type="text"
                maxLength={2}
                {...register("countryCode")}
                className="w-full px-3 py-2 text-sm rounded-control border border-border bg-background uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Devise</label>
              <select
                {...register("defaultCurrency")}
                className="w-full px-3 py-2 text-sm rounded-control border border-border bg-background"
              >
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
                <option value="CHF">CHF (Fr.)</option>
                <option value="CAD">CAD ($)</option>
                <option value="XOF">XOF (CFA)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Fuseau horaire</label>
              <select
                {...register("timezone")}
                className="w-full px-3 py-2 text-sm rounded-control border border-border bg-background"
              >
                <option value="Europe/Paris">Europe/Paris</option>
                <option value="UTC">UTC</option>
                <option value="America/Montreal">America/Montreal</option>
                <option value="Africa/Abidjan">Africa/Abidjan</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-control bg-primary text-primary-foreground text-sm font-semibold"
          >
            {isLoading
              ? "Création de l'entreprise en cours..."
              : "Créer mon compte et initialiser l'entreprise"}
          </button>
        </form>

        <div className="text-center text-xs text-muted">
          Vous possédez déjà un compte ?{" "}
          <Link href="/login" className="text-primary font-semibold underline">
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
}
