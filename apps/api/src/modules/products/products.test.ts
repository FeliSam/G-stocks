import crypto from "node:crypto";
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";

const app = createApp();

describe("G-Stock API — Catalogue Produits, Catégories, Recherche, Pagination & CSV", () => {
  const suffix = crypto.randomBytes(3).toString("hex");
  let token = "";
  let orgId = "";
  let unitUnId = "";

  beforeAll(async () => {
    const reg = await request(app)
      .post("/api/v1/auth/register")
      .send({
        email: `cat-owner-${suffix}@gstock-test.local`,
        password: "StrongPassword2026!",
        name: "Gestionnaire Catalogue",
        organizationName: `Catalogue Corp ${suffix}`,
        industryProfile: "retail",
      });
    token = reg.body.token;
    orgId = reg.body.organization.id;

    const unitsRes = await request(app)
      .get("/api/v1/units")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", orgId);
    unitUnId = unitsRes.body.data.units.find((u: { code: string }) => u.code === "UN").id;
  });

  it("crée une catégorie, importe des produits par CSV validé, filtre et exporte en CSV", async () => {
    const catRes = await request(app)
      .post("/api/v1/categories")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", orgId)
      .send({
        code: "OUTILLAGE",
        name: "Outillage Électroportatif",
      });
    expect(catRes.status).toBe(201);

    const csvPayload = [
      "SKU;Nom;Categorie;Unite;PrixRevient;SeuilAlerte",
      "PERC-18V;Perceuse Sans Fil 18V;OUTILLAGE;UN;95.00;8",
      "MEUL-125;Meuleuse d'Angle 125mm;OUTILLAGE;UN;62.50;5",
    ].join("\n");

    const importRes = await request(app)
      .post("/api/v1/products/import/csv")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", orgId)
      .send({ csvContent: csvPayload });
    expect(importRes.status).toBe(200);
    expect(importRes.body.data.importedCount).toBe(2);

    const searchRes = await request(app)
      .get("/api/v1/products?search=Perceuse&page=1&limit=10")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", orgId);
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.data.length).toBe(1);
    expect(searchRes.body.data[0].sku).toBe("PERC-18V");

    const exportRes = await request(app)
      .get("/api/v1/products/export/csv")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", orgId);
    expect(exportRes.status).toBe(200);
    expect(exportRes.text).toContain("PERC-18V");
    expect(exportRes.text).toContain("MEUL-125");
  });

  it("rejette un doublon de SKU dans la même organisation", async () => {
    const dupRes = await request(app)
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", orgId)
      .send({
        sku: "PERC-18V",
        name: "Doublon Perceuse",
        baseUnitId: unitUnId,
      });
    expect(dupRes.status).toBe(409);
    expect(dupRes.body.error.code).toBe("DUPLICATE_SKU");
  });
});
