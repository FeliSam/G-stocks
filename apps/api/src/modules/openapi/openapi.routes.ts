import { Router } from "express";

export const openapiRouter = Router();

export const OPENAPI_SPEC = {
  openapi: "3.1.0",
  info: {
    title: "G-Stock SaaS API",
    version: "1.1.0",
    description:
      "API REST multi-tenant pour la plateforme universelle de gestion des stocks G-Stock.",
  },
  servers: [{ url: "/api/v1", description: "Serveur API v1" }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      cookieAuth: { type: "apiKey", in: "cookie", name: "gstock_session" },
    },
    parameters: {
      OrganizationHeader: {
        name: "X-Organization-Id",
        in: "header",
        required: false,
        schema: { type: "string", format: "uuid" },
        description: "Identifiant de l'organisation active (vérifié côté serveur contre memberships).",
      },
      IdempotencyHeader: {
        name: "Idempotency-Key",
        in: "header",
        required: true,
        schema: { type: "string" },
        description: "Clé d'idempotence obligatoire pour toutes les opérations d'écriture de stock.",
      },
    },
  },
  paths: {
    "/health": {
      get: { summary: "Vérification de santé API et PostgreSQL", tags: ["Système"] },
    },
    "/auth/register": {
      post: { summary: "Inscription utilisateur et création d'organisation initiale", tags: ["Auth"] },
    },
    "/auth/login": {
      post: { summary: "Connexion et ouverture de session sécurisée", tags: ["Auth"] },
    },
    "/auth/logout": {
      post: { summary: "Déconnexion de la session courante", tags: ["Auth"] },
    },
    "/me": {
      get: { summary: "Contexte utilisateur, organisations, rôles et permissions", tags: ["Auth"] },
    },
    "/organizations": {
      post: { summary: "Créer une nouvelle organisation isolée", tags: ["Organisations"] },
    },
    "/organizations/current": {
      get: { summary: "Détails et paramètres de l'organisation active", tags: ["Organisations"] },
    },
    "/organizations/current/settings": {
      patch: { summary: "Modifier les paramètres métier de l'organisation", tags: ["Organisations"] },
    },
    "/organizations/current/modules": {
      get: { summary: "Lister les modules métier activables", tags: ["Organisations"] },
      patch: { summary: "Activer ou désactiver des modules métier", tags: ["Organisations"] },
    },
    "/organizations/current/members": {
      get: { summary: "Lister les membres, invitations et rôles RBAC", tags: ["Équipe"] },
    },
    "/products": {
      get: { summary: "Recherche, filtrage, tri et pagination serveur des produits", tags: ["Catalogue"] },
      post: { summary: "Créer un produit avec validation de quota et unicité SKU", tags: ["Catalogue"] },
    },
    "/products/{id}": {
      get: { summary: "Détail complet d'un produit, ses soldes et mouvements", tags: ["Catalogue"] },
      patch: { summary: "Mettre à jour un produit", tags: ["Catalogue"] },
    },
    "/categories": {
      get: { summary: "Lister les catégories de l'organisation", tags: ["Catalogue"] },
      post: { summary: "Créer une catégorie", tags: ["Catalogue"] },
    },
    "/units": {
      get: { summary: "Lister les unités de mesure et conversions", tags: ["Catalogue"] },
      post: { summary: "Créer une unité de mesure personnalisée", tags: ["Catalogue"] },
    },
    "/warehouses": {
      get: { summary: "Lister les entrepôts et emplacements", tags: ["Logistique"] },
      post: { summary: "Créer un entrepôt et ses emplacements initiaux", tags: ["Logistique"] },
    },
    "/stock/balances": {
      get: { summary: "Soldes de stock (on_hand, reserved, available, valorisation)", tags: ["Stock"] },
    },
    "/stock/movements": {
      get: { summary: "Journal immuable paginé des mouvements de stock", tags: ["Stock"] },
    },
    "/stock/receipts": {
      post: { summary: "Enregistrer une réception de marchandises transactionnelle", tags: ["Stock"] },
    },
    "/stock/issues": {
      post: { summary: "Enregistrer une sortie de stock avec contrôle de stock négatif", tags: ["Stock"] },
    },
    "/stock/transfers": {
      post: { summary: "Transférer atomiquement du stock entre deux emplacements", tags: ["Stock"] },
    },
    "/stock/adjustments": {
      post: { summary: "Enregistrer un ajustement de stock motivé et audité", tags: ["Stock"] },
    },
    "/stock/movements/{id}/reverse": {
      post: { summary: "Contrepasser un mouvement validé par mouvement compensatoire", tags: ["Stock"] },
    },
    "/inventories": {
      get: { summary: "Lister les campagnes d'inventaire physique", tags: ["Inventaire"] },
      post: { summary: "Ouvrir une campagne d'inventaire avec figement du stock théorique", tags: ["Inventaire"] },
    },
    "/inventories/{id}/counts": {
      post: { summary: "Saisir les quantités comptées et calculer les écarts", tags: ["Inventaire"] },
    },
    "/inventories/{id}/validate": {
      post: { summary: "Valider l'inventaire et générer le mouvement d'ajustement", tags: ["Inventaire"] },
    },
    "/reports/overview": {
      get: { summary: "Tableau de bord KPI, formules, flux et références sous surveillance", tags: ["Rapports"] },
    },
    "/reports/stock-value": {
      get: { summary: "Rapport de valorisation par entrepôt et catégorie", tags: ["Rapports"] },
    },
    "/alerts/stock": {
      get: { summary: "Alertes de seuil bas et ruptures de stock", tags: ["Alertes"] },
    },
    "/settings/appearance": {
      get: { summary: "Thème, design tokens résolus et score de contraste WCAG 2.2 AA", tags: ["Apparence"] },
      put: { summary: "Enregistrer la personnalisation visuelle de l'organisation", tags: ["Apparence"] },
    },
    "/settings/branding/logo": {
      post: { summary: "Uploader le logo de l'entreprise (stockage fichier contrôlé)", tags: ["Apparence"] },
    },
    "/billing/subscription": {
      get: { summary: "État de l'abonnement, plan actif et compteurs d'usage", tags: ["Facturation"] },
    },
    "/billing/checkout": {
      post: { summary: "Souscrire ou changer de plan via BillingProvider", tags: ["Facturation"] },
    },
    "/billing/webhooks/{provider}": {
      post: { summary: "Réception idempotente et vérifiée par signature des webhooks de paiement", tags: ["Facturation"] },
    },
    "/admin/overview": {
      get: { summary: "Back-office Super-Administrateur de la plateforme G-Stock", tags: ["Administration"] },
    },
  },
};

openapiRouter.get("/openapi.json", (_req, res) => {
  res.json(OPENAPI_SPEC);
});
