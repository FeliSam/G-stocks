import crypto from "node:crypto";
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { signWebhookPayloadForTest } from "../billing/billing.provider.js";

const app = createApp();

describe("G-Stock API — Stock Engine, Multi-Tenant Isolation, RBAC, Themes & SaaS Quotas", () => {
  const suffix = crypto.randomBytes(3).toString("hex");
  let tokenOrgA = "";
  let orgAId = "";
  let warehouseAId = "";
  let locA1Id = "";
  let locA2Id = "";
  let unitUnId = "";
  let unitKgId = "";
  let productAId = "";

  let tokenOrgB = "";
  let orgBId = "";
  let productBId = "";
  let locB1Id = "";

  beforeAll(async () => {
    // 1. Création de l'Entreprise A et de son propriétaire
    const regA = await request(app)
      .post("/api/v1/auth/register")
      .send({
        email: `owner-a-${suffix}@gstock-test.local`,
        password: "StrongPassword2026!",
        name: "Alice Propriétaire A",
        organizationName: `Entreprise Alpha ${suffix}`,
        industryProfile: "wholesale",
        countryCode: "FR",
        defaultCurrency: "EUR",
        timezone: "Europe/Paris",
      });

    expect(regA.status).toBe(201);
    tokenOrgA = regA.body.token;
    orgAId = regA.body.organization.id;

    // 2. Création de l'Entreprise B totalement isolée
    const regB = await request(app)
      .post("/api/v1/auth/register")
      .send({
        email: `owner-b-${suffix}@gstock-test.local`,
        password: "StrongPassword2026!",
        name: "Bob Propriétaire B",
        organizationName: `Entreprise Beta ${suffix}`,
        industryProfile: "retail",
        countryCode: "FR",
        defaultCurrency: "EUR",
        timezone: "Europe/Paris",
      });

    expect(regB.status).toBe(201);
    tokenOrgB = regB.body.token;
    orgBId = regB.body.organization.id;

    // Récupération des unités et entrepôts initiaux
    const unitsRes = await request(app)
      .get("/api/v1/units")
      .set("Authorization", `Bearer ${tokenOrgA}`)
      .set("X-Organization-Id", orgAId);
    expect(unitsRes.status).toBe(200);
    unitUnId = unitsRes.body.data.units.find((u: { code: string }) => u.code === "UN").id;
    unitKgId = unitsRes.body.data.units.find((u: { code: string }) => u.code === "KG").id;

    const whARes = await request(app)
      .get("/api/v1/warehouses")
      .set("Authorization", `Bearer ${tokenOrgA}`)
      .set("X-Organization-Id", orgAId);
    warehouseAId = whARes.body.data[0].id;
    locA1Id = whARes.body.data[0].locations[0].id;
    locA2Id = whARes.body.data[0].locations[1].id;

    const whBRes = await request(app)
      .get("/api/v1/warehouses")
      .set("Authorization", `Bearer ${tokenOrgB}`)
      .set("X-Organization-Id", orgBId);
    locB1Id = whBRes.body.data[0].locations[0].id;
  });

  it("crée un produit dans l'Entreprise A et un produit dans l'Entreprise B avec le même SKU sans collision inter-tenant", async () => {
    const resA = await request(app)
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${tokenOrgA}`)
      .set("X-Organization-Id", orgAId)
      .send({
        sku: "ART-100",
        name: "Moteur Électrique Triphasé",
        baseUnitId: unitUnId,
        costPrice: 120.5,
        reorderLevel: 10,
      });
    expect(resA.status).toBe(201);
    productAId = resA.body.data.id;

    const resB = await request(app)
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${tokenOrgB}`)
      .set("X-Organization-Id", orgBId)
      .send({
        sku: "ART-100",
        name: "Article Confidentiel Beta",
        baseUnitId: unitUnId,
        costPrice: 45,
        reorderLevel: 5,
      });
    expect(resB.status).toBe(201);
    productBId = resB.body.data.id;
  });

  it("bloque strictement tout accès multi-tenant croisé (Entreprise A vers Entreprise B)", async () => {
    // Tentative de forcer X-Organization-Id de l'Entreprise B avec le token de l'Entreprise A
    const spoofHeader = await request(app)
      .get("/api/v1/products")
      .set("Authorization", `Bearer ${tokenOrgA}`)
      .set("X-Organization-Id", orgBId);
    expect(spoofHeader.status).toBe(403);
    expect(spoofHeader.body.error.code).toBe("TENANT_ACCESS_DENIED");

    // Tentative de lire directement le produit de l'Entreprise B depuis le contexte de l'Entreprise A
    const readForeignProduct = await request(app)
      .get(`/api/v1/products/${productBId}`)
      .set("Authorization", `Bearer ${tokenOrgA}`)
      .set("X-Organization-Id", orgAId);
    expect(readForeignProduct.status).toBe(404);

    // Tentative d'effectuer une réception sur un emplacement appartenant à l'Entreprise B
    const crossLocationMvt = await request(app)
      .post("/api/v1/stock/receipts")
      .set("Authorization", `Bearer ${tokenOrgA}`)
      .set("X-Organization-Id", orgAId)
      .send({
        reference: "REC-HACK-01",
        idempotencyKey: `idem-hack-${suffix}`,
        lines: [{ productId: productAId, toLocationId: locB1Id, quantity: 10 }],
      });
    expect(crossLocationMvt.status).toBe(403);
    expect(crossLocationMvt.body.error.code).toBe("CROSS_TENANT_OR_MISSING_LOCATION");
  });

  it("enregistre une réception de stock idempotente et empêche les doublons", async () => {
    const idemKey = `rec-001-${suffix}`;
    const payload = {
      reference: "BL-FOURN-001",
      idempotencyKey: idemKey,
      lines: [
        {
          productId: productAId,
          toLocationId: locA1Id,
          quantity: 50,
          unitCost: 125.0,
        },
      ],
    };

    const first = await request(app)
      .post("/api/v1/stock/receipts")
      .set("Authorization", `Bearer ${tokenOrgA}`)
      .set("X-Organization-Id", orgAId)
      .send(payload);
    expect(first.status).toBe(201);
    expect(first.body.idempotentReplay).toBe(false);

    // Rejoue exactement la même requête : statut 200 et aucun doublon créé
    const replay = await request(app)
      .post("/api/v1/stock/receipts")
      .set("Authorization", `Bearer ${tokenOrgA}`)
      .set("X-Organization-Id", orgAId)
      .send(payload);
    expect(replay.status).toBe(200);
    expect(replay.body.idempotentReplay).toBe(true);
    expect(replay.body.data.id).toBe(first.body.data.id);

    // Réutiliser la même clé d'idempotence avec une quantité différente doit échouer en 409
    const conflict = await request(app)
      .post("/api/v1/stock/receipts")
      .set("Authorization", `Bearer ${tokenOrgA}`)
      .set("X-Organization-Id", orgAId)
      .send({
        ...payload,
        lines: [{ productId: productAId, toLocationId: locA1Id, quantity: 999 }],
      });
    expect(conflict.status).toBe(409);
    expect(conflict.body.error.code).toBe("IDEMPOTENCY_KEY_CONFLICT");

    // Vérifie que le solde disponible est exactement de 50 (et non 100)
    const balances = await request(app)
      .get("/api/v1/stock/balances")
      .set("Authorization", `Bearer ${tokenOrgA}`)
      .set("X-Organization-Id", orgAId);
    expect(balances.status).toBe(200);
    const bal = balances.body.data.find(
      (b: { productId: string; locationId: string }) =>
        b.productId === productAId && b.locationId === locA1Id
    );
    expect(bal.onHand).toBe(50);
    expect(bal.available).toBe(50);
  });

  it("effectue un transfert atomique entre deux emplacements et bloque toute sortie rendant le stock négatif", async () => {
    const transferRes = await request(app)
      .post("/api/v1/stock/transfers")
      .set("Authorization", `Bearer ${tokenOrgA}`)
      .set("X-Organization-Id", orgAId)
      .send({
        reference: "TRF-001",
        idempotencyKey: `trf-001-${suffix}`,
        lines: [
          {
            productId: productAId,
            fromLocationId: locA1Id,
            toLocationId: locA2Id,
            quantity: 15,
          },
        ],
      });
    expect(transferRes.status).toBe(201);

    // Tentative de sortie de 40 unités depuis locA1Id (qui n'en possède plus que 35)
    const excessiveIssue = await request(app)
      .post("/api/v1/stock/issues")
      .set("Authorization", `Bearer ${tokenOrgA}`)
      .set("X-Organization-Id", orgAId)
      .send({
        reference: "OUT-EXCESS",
        idempotencyKey: `out-excess-${suffix}`,
        lines: [
          {
            productId: productAId,
            fromLocationId: locA1Id,
            quantity: 40,
          },
        ],
      });
    expect(excessiveIssue.status).toBe(409);
    expect(excessiveIssue.body.error.code).toBe("NEGATIVE_STOCK_FORBIDDEN");

    // Sortie valide de 10 unités depuis locA1Id (reste 25 sur locA1Id et 15 sur locA2Id)
    const validIssue = await request(app)
      .post("/api/v1/stock/issues")
      .set("Authorization", `Bearer ${tokenOrgA}`)
      .set("X-Organization-Id", orgAId)
      .send({
        reference: "OUT-VALID-01",
        idempotencyKey: `out-valid-${suffix}`,
        lines: [
          {
            productId: productAId,
            fromLocationId: locA1Id,
            quantity: 10,
          },
        ],
      });
    expect(validIssue.status).toBe(201);

    // Contrepassation (reversal) de la sortie : recrédite automatiquement les 10 unités sur locA1Id
    const reverseRes = await request(app)
      .post(`/api/v1/stock/movements/${validIssue.body.data.id}/reverse`)
      .set("Authorization", `Bearer ${tokenOrgA}`)
      .set("X-Organization-Id", orgAId)
      .send({
        idempotencyKey: `rev-out-${suffix}`,
        reason: "Erreur de saisie bon de sortie",
      });
    expect(reverseRes.status).toBe(201);

    const balancesAfter = await request(app)
      .get("/api/v1/stock/balances")
      .set("Authorization", `Bearer ${tokenOrgA}`)
      .set("X-Organization-Id", orgAId);
    const balA1 = balancesAfter.body.data.find(
      (b: { locationId: string }) => b.locationId === locA1Id
    );
    const balA2 = balancesAfter.body.data.find(
      (b: { locationId: string }) => b.locationId === locA2Id
    );
    expect(balA1.onHand).toBe(35);
    expect(balA2.onHand).toBe(15);
  });

  it("réalise un inventaire physique complet et génère le mouvement d'ajustement correspondant à l'écart", async () => {
    const createInv = await request(app)
      .post("/api/v1/inventories")
      .set("Authorization", `Bearer ${tokenOrgA}`)
      .set("X-Organization-Id", orgAId)
      .send({
        warehouseId: warehouseAId,
        notes: "Inventaire tournant Zone Principale",
      });
    expect(createInv.status).toBe(201);
    const invId = createInv.body.data.id;

    // Saisit 32 au lieu de 35 sur locA1Id (écart de -3)
    const countRes = await request(app)
      .post(`/api/v1/inventories/${invId}/counts`)
      .set("Authorization", `Bearer ${tokenOrgA}`)
      .set("X-Organization-Id", orgAId)
      .send({
        lines: [
          {
            productId: productAId,
            locationId: locA1Id,
            countedQuantity: 32,
          },
        ],
      });
    expect(countRes.status).toBe(200);

    const validateRes = await request(app)
      .post(`/api/v1/inventories/${invId}/validate`)
      .set("Authorization", `Bearer ${tokenOrgA}`)
      .set("X-Organization-Id", orgAId);
    expect(validateRes.status).toBe(200);
    expect(validateRes.body.generatedMovementId).toBeTruthy();

    // Le solde sur locA1Id est maintenant de 32 et l'écart (-3) reste tracé sur la ligne d'inventaire
    const invDetail = await request(app)
      .get(`/api/v1/inventories/${invId}`)
      .set("Authorization", `Bearer ${tokenOrgA}`)
      .set("X-Organization-Id", orgAId);
    const lineA1 = invDetail.body.data.lines.find(
      (l: { locationId: string }) => l.locationId === locA1Id
    );
    expect(lineA1.expectedQuantity).toBe(35);
    expect(lineA1.countedQuantity).toBe(32);
    expect(lineA1.variance).toBe(-3);
  });

  it("valide les conversions d'unités et rejette les dimensions physiques incompatibles", async () => {
    const badConversion = await request(app)
      .post("/api/v1/units/conversions")
      .set("Authorization", `Bearer ${tokenOrgA}`)
      .set("X-Organization-Id", orgAId)
      .send({
        fromUnitId: unitKgId,
        toUnitId: unitUnId,
        factor: 10,
      });
    expect(badConversion.status).toBe(400);
    expect(badConversion.body.error.code).toBe("INCOMPATIBLE_UNIT_DIMENSIONS");
  });

  it("valide les thèmes, rejette les contrastes WCAG 2.2 AA insuffisants et bloque les injections CSS", async () => {
    // Contraste faible gris clair sur blanc -> rejeté
    const badContrast = await request(app)
      .put("/api/v1/settings/appearance")
      .set("Authorization", `Bearer ${tokenOrgA}`)
      .set("X-Organization-Id", orgAId)
      .send({
        themePreset: "ocean",
        designTokens: {
          "--color-background": "#ffffff",
          "--color-text": "#d1d5db",
        },
      });
    expect(badContrast.status).toBe(400);
    expect(badContrast.body.error.code).toBe("VALIDATION_ERROR");

    // Token CSS arbitraire ou injection url() -> rejeté
    const injectionAttempt = await request(app)
      .put("/api/v1/settings/appearance")
      .set("Authorization", `Bearer ${tokenOrgA}`)
      .set("X-Organization-Id", orgAId)
      .send({
        themePreset: "ocean",
        designTokens: {
          "--color-primary": "url(https://evil.example/x)",
        },
      });
    expect(injectionAttempt.status).toBe(400);

    // Personnalisation valide respectant WCAG 2.2 AA -> 200 OK
    const validAppearance = await request(app)
      .put("/api/v1/settings/appearance")
      .set("Authorization", `Bearer ${tokenOrgA}`)
      .set("X-Organization-Id", orgAId)
      .send({
        displayName: "Alpha Logistique Europe",
        themePreset: "ocean",
        colorModeDefault: "dark",
        cardStyle: "bordered",
        radiusScale: "rounded",
        tableDensity: "compact",
        fontScale: "standard",
        sidebarStyle: "standard",
        forceBrandTheme: true,
        designTokens: {
          "--color-primary": "#0284c7",
          "--color-background": "#ffffff",
          "--color-text": "#0f172a",
        },
      });
    expect(validAppearance.status).toBe(200);
    expect(validAppearance.body.data.theme.themePreset).toBe("ocean");
  });

  it("contrôle les permissions RBAC d'un auditeur (lecture autorisée, écriture refusée)", async () => {
    const inviteRes = await request(app)
      .post("/api/v1/organizations/current/members/invite")
      .set("Authorization", `Bearer ${tokenOrgA}`)
      .set("X-Organization-Id", orgAId)
      .send({
        email: `auditor-${suffix}@gstock-test.local`,
        name: "Paul Auditeur",
        roleCode: "auditor",
      });
    expect(inviteRes.status).toBe(201);

    const loginAuditor = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: `auditor-${suffix}@gstock-test.local`,
        password: "TempInvite2026!",
      });
    expect(loginAuditor.status).toBe(200);
    const auditorToken = loginAuditor.body.token;

    // L'auditeur peut consulter les produits et le journal d'audit
    const readProducts = await request(app)
      .get("/api/v1/products")
      .set("Authorization", `Bearer ${auditorToken}`)
      .set("X-Organization-Id", orgAId);
    expect(readProducts.status).toBe(200);

    // L'auditeur ne peut PAS créer de produit ni enregistrer de mouvement de stock
    const createAttempt = await request(app)
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${auditorToken}`)
      .set("X-Organization-Id", orgAId)
      .send({
        sku: "AUDIT-FORBIDDEN",
        name: "Produit Interdit",
        baseUnitId: unitUnId,
      });
    expect(createAttempt.status).toBe(403);
    expect(createAttempt.body.error.code).toBe("INSUFFICIENT_PERMISSIONS");
  });

  it("traite un webhook de facturation signé, bloque les écritures si l'abonnement est suspendu tout en conservant la lecture", async () => {
    const webhookPayload = {
      id: `evt_suspend_${suffix}`,
      type: "customer.subscription.suspended",
      data: {
        organizationId: orgBId,
        status: "suspended",
      },
    };
    const { signature } = signWebhookPayloadForTest(webhookPayload);

    const whRes = await request(app)
      .post("/api/v1/billing/webhooks/simulated_dev")
      .set("X-Webhook-Signature", signature)
      .send(webhookPayload);
    expect(whRes.status).toBe(200);

    // L'Entreprise B peut toujours lire ses produits (aucune perte de données)
    const getProductsB = await request(app)
      .get("/api/v1/products")
      .set("Authorization", `Bearer ${tokenOrgB}`)
      .set("X-Organization-Id", orgBId);
    expect(getProductsB.status).toBe(200);

    // Mais les écritures métier sont bloquées avec 402 SUBSCRIPTION_WRITE_LOCKED
    const writeProductB = await request(app)
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${tokenOrgB}`)
      .set("X-Organization-Id", orgBId)
      .send({
        sku: "BLOCKED-SKU",
        name: "Produit Bloqué",
        baseUnitId: unitUnId,
      });
    expect(writeProductB.status).toBe(402);
    expect(writeProductB.body.error.code).toBe("SUBSCRIPTION_WRITE_LOCKED");
  });
});
