import {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  DEFAULT_SAAS_PLANS,
  INDUSTRY_PROFILES,
  THEME_PRESETS,
  resolveDesignTokens,
  getContrastRatio,
} from "@g-stock/config";
import type { DesignTokens, ThemePresetId } from "@g-stock/types";

const STORAGE_KEY = "gstock_browser_db_v1";

function getInitialDb() {
  const orgId = "11111111-1111-4111-8111-111111111111";
  const whId = "22222222-2222-4222-8222-222222222222";
  const locA1Id = "33333333-3333-4333-8333-333333333331";
  const locB1Id = "33333333-3333-4333-8333-333333333332";
  const locRecId = "33333333-3333-4333-8333-333333333333";
  const catEquipId = "44444444-4444-4444-8444-444444444441";
  const catPackId = "44444444-4444-4444-8444-444444444442";
  const unitUnId = "55555555-5555-4555-8555-555555555551";
  const unitBoxId = "55555555-5555-4555-8555-555555555552";
  const unitKgId = "55555555-5555-4555-8555-555555555553";
  const unitLId = "55555555-5555-4555-8555-555555555554";
  const prod1Id = "66666666-6666-4666-8666-666666666661";
  const prod2Id = "66666666-6666-4666-8666-666666666662";
  const prod3Id = "66666666-6666-4666-8666-666666666663";
  const adminUserId = "77777777-7777-4777-8777-777777777771";
  const managerUserId = "77777777-7777-4777-8777-777777777772";

  const units = [
    { id: unitUnId, organizationId: null, code: "UN", name: "Unité / Pièce", dimension: "COUNT", precision: 0 },
    { id: unitBoxId, organizationId: null, code: "BOX", name: "Boîte / Carton", dimension: "COUNT", precision: 0 },
    { id: unitKgId, organizationId: null, code: "KG", name: "Kilogramme", dimension: "MASS", precision: 3 },
    { id: unitLId, organizationId: null, code: "L", name: "Litre", dimension: "VOLUME", precision: 3 },
  ];

  const categories = [
    { id: catEquipId, organizationId: orgId, code: "CAT-EQUIP", name: "Équipements & Outillage Pro", isActive: true },
    { id: catPackId, organizationId: orgId, code: "CAT-EMBAL", name: "Emballages & Conditionnement", isActive: true },
  ];

  const products = [
    {
      id: prod1Id,
      organizationId: orgId,
      categoryId: catEquipId,
      sku: "SCAN-PRO-2D",
      name: "Douchette Code-Barres Laser 2D Sans Fil",
      description: "Lecteur industriel haute cadence IP65 avec socle de charge.",
      baseUnitId: unitUnId,
      costPrice: 85.0,
      reorderLevel: 10,
      trackingMode: "STANDARD",
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: prod2Id,
      organizationId: orgId,
      categoryId: catPackId,
      sku: "CAISSE-60X40",
      name: "Bac Logistique Norme Europe 600x400mm",
      description: "Bac polypropylène haute densité gerbable gris.",
      baseUnitId: unitUnId,
      costPrice: 14.5,
      reorderLevel: 25,
      trackingMode: "STANDARD",
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: prod3Id,
      organizationId: orgId,
      categoryId: catPackId,
      sku: "FILM-PAL-23M",
      name: "Carton 6 Bobines Film Étirable 23 microns",
      description: "Film étirable transparent haute résistance pour palettisation.",
      baseUnitId: unitBoxId,
      costPrice: 42.0,
      reorderLevel: 15,
      trackingMode: "STANDARD",
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  ];

  const locations = [
    { id: locA1Id, organizationId: orgId, warehouseId: whId, code: "ALLEE-A-01", locationType: "STORAGE", isActive: true },
    { id: locB1Id, organizationId: orgId, warehouseId: whId, code: "ALLEE-B-01", locationType: "STORAGE", isActive: true },
    { id: locRecId, organizationId: orgId, warehouseId: whId, code: "QUAI-RECEP", locationType: "RECEIVING", isActive: true },
  ];

  const warehouses = [
    {
      id: whId,
      organizationId: orgId,
      code: "WH-LYON-01",
      name: "Entrepôt Central Lyon-Corbas (DÉMO)",
      isActive: true,
    },
  ];

  const balances = [
    { id: "bal-1", organizationId: orgId, productId: prod1Id, locationId: locA1Id, onHand: 34, reserved: 0 },
    { id: "bal-2", organizationId: orgId, productId: prod2Id, locationId: locA1Id, onHand: 8, reserved: 0 },
    { id: "bal-3", organizationId: orgId, productId: prod3Id, locationId: locB1Id, onHand: 0, reserved: 0 },
  ];

  const movements = [
    {
      id: "mvt-init-1",
      organizationId: orgId,
      movementType: "opening_balance",
      status: "VALIDATED",
      reference: "INIT-DEMO-2026-001",
      notes: "Stock initial de démonstration (isolé et identifié [DÉMO])",
      occurredAt: new Date().toISOString(),
      createdBy: adminUserId,
      creator: { id: adminUserId, name: "Claire Moreau (Admin Plateforme)", email: "admin@g-stock.local" },
      idempotencyKey: "seed-opening-balance-001",
      lines: [
        { id: "ml-1", productId: prod1Id, fromLocationId: null, toLocationId: locA1Id, quantity: 34, unitCost: 85.0 },
        { id: "ml-2", productId: prod2Id, fromLocationId: null, toLocationId: locA1Id, quantity: 8, unitCost: 14.5 },
      ],
    },
  ];

  const plans = DEFAULT_SAAS_PLANS.map((p, idx) => ({
    id: `plan-${idx + 1}`,
    code: p.code,
    name: p.name,
    description: p.description,
    status: "ACTIVE",
    billingInterval: "MONTHLY",
    price: Number(p.priceMonthly),
    currency: p.currency,
    features: [
      { id: `pf-${idx}-1`, featureKey: "max_members", enabled: true, limitValue: p.limits.max_members },
      { id: `pf-${idx}-2`, featureKey: "max_warehouses", enabled: true, limitValue: p.limits.max_warehouses },
      { id: `pf-${idx}-3`, featureKey: "max_products", enabled: true, limitValue: p.limits.max_products },
      { id: `pf-${idx}-4`, featureKey: "custom_branding", enabled: p.limits.custom_branding, limitValue: null },
    ],
  }));

  return {
    currentUserId: adminUserId,
    users: [
      {
        id: adminUserId,
        email: "admin@g-stock.local",
        name: "Claire Moreau (Admin Plateforme)",
        isPlatformAdmin: true,
        roleCode: "owner",
      },
      {
        id: managerUserId,
        email: "responsable@horizon-demo.local",
        name: "Marc Lefèvre (Responsable Stock)",
        isPlatformAdmin: false,
        roleCode: "stock_manager",
      },
    ],
    organizations: [
      {
        id: orgId,
        name: "[DÉMO] Distribution Horizon SAS",
        slug: "demo-horizon",
        status: "ACTIVE",
        isDemo: true,
        createdAt: new Date().toISOString(),
        settings: {
          organizationId: orgId,
          industryProfile: "wholesale",
          countryCode: "FR",
          defaultCurrency: "EUR",
          timezone: "Europe/Paris",
          locale: "fr-FR",
          negativeStockPolicy: "FORBID",
          costingMethod: "WAC",
          activeModules: [
            "core_inventory",
            "alerts_kpi",
            "multi_warehouse",
            "unit_conversions",
            "csv_import_export",
            "audit_trail",
          ],
        },
        branding: {
          organizationId: orgId,
          displayName: "[DÉMO] Distribution Horizon",
          logoAssetId: null,
        },
        theme: {
          organizationId: orgId,
          themePreset: "gstock-classic",
          colorModeDefault: "light",
          cardStyle: "standard",
          radiusScale: "standard",
          tableDensity: "standard",
          fontScale: "standard",
          sidebarStyle: "standard",
          forceBrandTheme: false,
          designTokens: {},
        },
        subscription: {
          id: "sub-demo-1",
          organizationId: orgId,
          planId: plans[1].id,
          status: "active",
          provider: "simulated_dev",
          currentPeriodStart: new Date().toISOString(),
          currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
          plan: plans[1],
        },
      },
    ],
    units,
    conversions: [],
    categories,
    products,
    warehouses,
    locations,
    balances,
    movements,
    inventories: [],
    plans,
    auditLogs: [
      {
        id: "aud-1",
        organizationId: orgId,
        action: "stock.opening_balance",
        resourceType: "stock_movement",
        resourceId: "mvt-init-1",
        occurredAt: new Date().toISOString(),
        requestId: "req-demo-init-001",
        actor: { id: adminUserId, name: "Claire Moreau", email: "admin@g-stock.local" },
        metadata: { reference: "INIT-DEMO-2026-001", demo: true },
      },
    ],
    userPreference: {
      colorMode: "light",
      tableDensity: "standard",
      sidebarCollapsed: false,
      locale: "fr-FR",
    },
  };
}

function loadDb(): any {
  if (typeof window === "undefined") return getInitialDb();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const init = getInitialDb();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(init));
      return init;
    }
    return JSON.parse(raw);
  } catch {
    return getInitialDb();
  }
}

function saveDb(db: any) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }
}

export async function handleLocalDemoRequest(
  url: string,
  method: string,
  body?: any,
  params?: any
): Promise<{ data: any }> {
  const db = loadDb();
  const activeOrgId =
    (typeof window !== "undefined" && localStorage.getItem("gstock_org_id")) ||
    db.organizations[0].id;
  const org =
    db.organizations.find((o: any) => o.id === activeOrgId) || db.organizations[0];
  const currentUser =
    db.users.find((u: any) => u.id === db.currentUserId) || db.users[0];

  const cleanUrl = url.split("?")[0];

  if (cleanUrl === "/auth/login" && method === "POST") {
    const found =
      db.users.find((u: any) => u.email.toLowerCase() === String(body?.email || "").toLowerCase()) ||
      db.users[0];
    db.currentUserId = found.id;
    saveDb(db);
    return {
      data: {
        token: `demo-jwt-${found.id}`,
        user: found,
        organizations: db.organizations.map((o: any) => ({
          id: o.id,
          name: o.name,
          slug: o.slug,
          isDemo: true,
          roles: [found.roleCode || "owner"],
          settings: o.settings,
          branding: o.branding,
          theme: o.theme,
        })),
      },
    };
  }

  if (cleanUrl === "/auth/register" && method === "POST") {
    const newUserId = `usr-${Date.now()}`;
    const newOrgId = `org-${Date.now()}`;
    const newWhId = `wh-${Date.now()}`;
    const newUser = {
      id: newUserId,
      email: body.email,
      name: body.name,
      isPlatformAdmin: true,
      roleCode: "owner",
    };
    const newOrg = {
      ...db.organizations[0],
      id: newOrgId,
      name: body.organizationName || "Nouvelle Entreprise",
      slug: `org-${Date.now()}`,
      isDemo: true,
      settings: {
        ...db.organizations[0].settings,
        organizationId: newOrgId,
        industryProfile: body.industryProfile || "general",
        defaultCurrency: body.defaultCurrency || "EUR",
      },
      branding: {
        organizationId: newOrgId,
        displayName: body.organizationName || "Nouvelle Entreprise",
        logoAssetId: null,
      },
    };
    db.users.push(newUser);
    db.organizations.push(newOrg);
    db.warehouses.push({
      id: newWhId,
      organizationId: newOrgId,
      code: "WH-MAIN",
      name: "Entrepôt Principal",
      isActive: true,
    });
    db.locations.push({
      id: `loc-${Date.now()}`,
      organizationId: newOrgId,
      warehouseId: newWhId,
      code: "ZONE-A-01",
      locationType: "STORAGE",
      isActive: true,
    });
    db.currentUserId = newUserId;
    saveDb(db);
    return {
      data: {
        token: `demo-jwt-${newUserId}`,
        user: newUser,
        organization: newOrg,
      },
    };
  }

  if (cleanUrl === "/auth/logout") {
    return { data: { success: true } };
  }

  if (cleanUrl === "/me") {
    const roleCode = (currentUser.roleCode || "owner") as keyof typeof DEFAULT_ROLE_PERMISSIONS;
    const perms = DEFAULT_ROLE_PERMISSIONS[roleCode] || DEFAULT_ROLE_PERMISSIONS.owner;
    return {
      data: {
        user: currentUser,
        isBrowserLocalDemo: true,
        activeOrganization: {
          ...org,
          roles: [roleCode],
          permissions: perms,
        },
        organizations: db.organizations.map((o: any) => ({
          id: o.id,
          name: o.name,
          slug: o.slug,
          isDemo: true,
          roles: [roleCode],
        })),
        userPreference: db.userPreference,
      },
    };
  }

  if (cleanUrl === "/organizations/current" && method === "GET") {
    return {
      data: {
        data: {
          ...org,
          _count: {
            memberships: db.users.length,
            warehouses: db.warehouses.filter((w: any) => w.organizationId === org.id).length,
            products: db.products.filter((p: any) => p.organizationId === org.id).length,
          },
          industryProfilesCatalog: INDUSTRY_PROFILES,
        },
      },
    };
  }

  if (cleanUrl === "/organizations/current/settings" && method === "PATCH") {
    if (body.name) org.name = body.name;
    org.settings = { ...org.settings, ...body };
    saveDb(db);
    return { data: { data: org.settings } };
  }

  if (cleanUrl === "/organizations/current/modules" && method === "GET") {
    const all = [
      { key: "core_inventory", name: "Noyau Stock & Mouvements", description: "Entrées, sorties, transferts et inventaires.", mandatory: true },
      { key: "alerts_kpi", name: "Alertes de Seuil & KPI Temps Réel", description: "Détection automatique des ruptures.", mandatory: false },
      { key: "multi_warehouse", name: "Multi-Entrepôts & Emplacements", description: "Gestion de plusieurs dépôts et zones.", mandatory: false },
      { key: "unit_conversions", name: "Conversions d'Unités", description: "Facteurs de conversion par dimension.", mandatory: false },
      { key: "csv_import_export", name: "Import / Export CSV Validé", description: "Importation et exportation contrôlée.", mandatory: false },
      { key: "audit_trail", name: "Journal d'Audit Sécurisé", description: "Traçabilité complète des opérations.", mandatory: false },
    ];
    return {
      data: {
        data: all.map((m) => ({
          ...m,
          enabled: m.mandatory || org.settings.activeModules.includes(m.key),
        })),
      },
    };
  }

  if (cleanUrl === "/organizations/current/modules" && method === "PATCH") {
    org.settings.activeModules = body.activeModules || ["core_inventory"];
    saveDb(db);
    return { data: { data: org.settings } };
  }

  if (cleanUrl === "/organizations/current/members" && method === "GET") {
    const roles = Object.entries(DEFAULT_ROLE_PERMISSIONS).map(([code, permissions]) => ({
      id: `role-${code}`,
      code,
      name: code.toUpperCase(),
      isSystem: true,
      permissions,
    }));
    return {
      data: {
        data: {
          members: db.users.map((u: any) => ({
            membershipId: `mem-${u.id}`,
            status: "ACTIVE",
            joinedAt: new Date().toISOString(),
            user: u,
            roles: [{ id: `role-${u.roleCode}`, code: u.roleCode || "owner", name: u.roleCode || "owner" }],
          })),
          invitations: [],
          roles,
        },
      },
    };
  }

  if (cleanUrl === "/organizations/current/members/invite" && method === "POST") {
    const newU = {
      id: `usr-${Date.now()}`,
      email: body.email,
      name: body.name || body.email.split("@")[0],
      isPlatformAdmin: false,
      roleCode: body.roleCode || "warehouse_clerk",
    };
    db.users.push(newU);
    saveDb(db);
    return { data: { data: { user: newU } } };
  }

  if (cleanUrl === "/products" && method === "GET") {
    const orgProducts = db.products
      .filter((p: any) => p.organizationId === org.id)
      .map((p: any) => {
        const category = db.categories.find((c: any) => c.id === p.categoryId) || null;
        const baseUnit = db.units.find((u: any) => u.id === p.baseUnitId) || db.units[0];
        const pBals = db.balances.filter((b: any) => b.productId === p.id);
        const totalOnHand = pBals.reduce((s: number, b: any) => s + Number(b.onHand), 0);
        const available = totalOnHand;
        const stockState =
          available <= 0 ? "out" : available <= Number(p.reorderLevel) ? "low" : "ok";
        return {
          ...p,
          category,
          baseUnit,
          inventoryBalances: pBals,
          totalOnHand,
          totalReserved: 0,
          available,
          stockState,
        };
      });
    return {
      data: {
        data: orgProducts,
        meta: { page: 1, limit: 20, total: orgProducts.length, totalPages: 1 },
      },
    };
  }

  if (cleanUrl === "/products" && method === "POST") {
    const created = {
      id: `prod-${Date.now()}`,
      organizationId: org.id,
      sku: String(body.sku).toUpperCase(),
      name: body.name,
      description: body.description || "",
      categoryId: body.categoryId || null,
      baseUnitId: body.baseUnitId || db.units[0].id,
      costPrice: Number(body.costPrice) || 0,
      reorderLevel: Number(body.reorderLevel) || 5,
      trackingMode: "STANDARD",
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    db.products.unshift(created);
    saveDb(db);
    return { data: { data: created } };
  }

  if (cleanUrl === "/categories" && method === "GET") {
    return {
      data: {
        data: db.categories
          .filter((c: any) => c.organizationId === org.id)
          .map((c: any) => ({
            ...c,
            _count: {
              products: db.products.filter((p: any) => p.categoryId === c.id).length,
            },
          })),
      },
    };
  }

  if (cleanUrl === "/categories" && method === "POST") {
    const cat = {
      id: `cat-${Date.now()}`,
      organizationId: org.id,
      code: String(body.code).toUpperCase(),
      name: body.name,
      isActive: true,
    };
    db.categories.push(cat);
    saveDb(db);
    return { data: { data: cat } };
  }

  if (cleanUrl === "/units" && method === "GET") {
    return {
      data: {
        data: {
          units: db.units,
          conversions: db.conversions.map((c: any) => ({
            ...c,
            fromUnit: db.units.find((u: any) => u.id === c.fromUnitId),
            toUnit: db.units.find((u: any) => u.id === c.toUnitId),
          })),
        },
      },
    };
  }

  if (cleanUrl === "/units" && method === "POST") {
    const u = {
      id: `unit-${Date.now()}`,
      organizationId: org.id,
      code: String(body.code).toUpperCase(),
      name: body.name,
      dimension: body.dimension || "COUNT",
      precision: Number(body.precision) || 0,
    };
    db.units.push(u);
    saveDb(db);
    return { data: { data: u } };
  }

  if (cleanUrl === "/warehouses" && method === "GET") {
    const whs = db.warehouses
      .filter((w: any) => w.organizationId === org.id)
      .map((w: any) => ({
        ...w,
        locations: db.locations
          .filter((l: any) => l.warehouseId === w.id)
          .map((l: any) => ({
            ...l,
            inventoryBalances: db.balances
              .filter((b: any) => b.locationId === l.id)
              .map((b: any) => ({
                ...b,
                product: db.products.find((p: any) => p.id === b.productId),
              })),
          })),
      }));
    return { data: { data: whs } };
  }

  if (cleanUrl === "/warehouses" && method === "POST") {
    const whId = `wh-${Date.now()}`;
    const wh = {
      id: whId,
      organizationId: org.id,
      code: String(body.code).toUpperCase(),
      name: body.name,
      isActive: true,
    };
    db.warehouses.push(wh);
    db.locations.push({
      id: `loc-${Date.now()}`,
      organizationId: org.id,
      warehouseId: whId,
      code: "ZONE-PRINCIPALE",
      locationType: "STORAGE",
      isActive: true,
    });
    saveDb(db);
    return { data: { data: wh } };
  }

  if (cleanUrl === "/locations" && method === "POST") {
    const loc = {
      id: `loc-${Date.now()}`,
      organizationId: org.id,
      warehouseId: body.warehouseId,
      code: String(body.code).toUpperCase(),
      locationType: body.locationType || "STORAGE",
      isActive: true,
    };
    db.locations.push(loc);
    saveDb(db);
    return { data: { data: loc } };
  }

  if (cleanUrl === "/stock/balances") {
    const enriched = db.balances
      .filter((b: any) => b.organizationId === org.id)
      .map((b: any) => {
        const product = db.products.find((p: any) => p.id === b.productId) || db.products[0];
        const baseUnit = db.units.find((u: any) => u.id === product?.baseUnitId) || db.units[0];
        const location = db.locations.find((l: any) => l.id === b.locationId) || db.locations[0];
        const warehouse = db.warehouses.find((w: any) => w.id === location?.warehouseId) || db.warehouses[0];
        const onHand = Number(b.onHand);
        return {
          ...b,
          onHand,
          reserved: 0,
          available: onHand,
          valuation: Number((onHand * Number(product?.costPrice || 0)).toFixed(2)),
          product: { ...product, baseUnit },
          location: { ...location, warehouse },
        };
      });
    return { data: { data: enriched } };
  }

  if (cleanUrl === "/stock/movements" && method === "GET") {
    const mvts = db.movements
      .filter((m: any) => m.organizationId === org.id)
      .map((m: any) => ({
        ...m,
        lines: m.lines.map((l: any) => ({
          ...l,
          product: {
            ...(db.products.find((p: any) => p.id === l.productId) || db.products[0]),
            baseUnit: db.units[0],
          },
          fromLocation: db.locations.find((loc: any) => loc.id === l.fromLocationId) || null,
          toLocation: db.locations.find((loc: any) => loc.id === l.toLocationId) || null,
        })),
      }));
    return {
      data: {
        data: mvts,
        meta: { page: 1, limit: 20, total: mvts.length, totalPages: 1 },
      },
    };
  }

  if (
    ["/stock/receipts", "/stock/issues", "/stock/transfers", "/stock/adjustments"].includes(
      cleanUrl
    ) &&
    method === "POST"
  ) {
    const mType = cleanUrl.includes("receipts")
      ? "receipt"
      : cleanUrl.includes("issues")
        ? "issue"
        : cleanUrl.includes("transfers")
          ? "transfer"
          : "adjustment";

    const mvtLines: any[] = [];
    for (const line of body.lines || []) {
      const fromLoc =
        mType === "issue" || mType === "transfer"
          ? line.fromLocationId
          : mType === "adjustment" && line.quantityDelta < 0
            ? line.locationId
            : null;
      const toLoc =
        mType === "receipt" || mType === "transfer"
          ? line.toLocationId
          : mType === "adjustment" && line.quantityDelta > 0
            ? line.locationId
            : null;
      const qty = Math.abs(Number(line.quantity ?? line.quantityDelta ?? 0));

      if (fromLoc) {
        const bal = db.balances.find(
          (b: any) => b.productId === line.productId && b.locationId === fromLoc
        );
        const current = bal ? Number(bal.onHand) : 0;
        if (current - qty < 0 && org.settings.negativeStockPolicy === "FORBID") {
          throw {
            status: 409,
            data: {
              error: {
                code: "NEGATIVE_STOCK_FORBIDDEN",
                message: `Stock disponible insuffisant (${current} disponible, ${qty} demandé).`,
              },
            },
          };
        }
        if (bal) bal.onHand = current - qty;
      }

      if (toLoc) {
        let bal = db.balances.find(
          (b: any) => b.productId === line.productId && b.locationId === toLoc
        );
        if (bal) {
          bal.onHand = Number(bal.onHand) + qty;
        } else {
          db.balances.push({
            id: `bal-${Date.now()}-${Math.random()}`,
            organizationId: org.id,
            productId: line.productId,
            locationId: toLoc,
            onHand: qty,
            reserved: 0,
          });
        }
      }

      mvtLines.push({
        id: `ml-${Date.now()}-${Math.random()}`,
        productId: line.productId,
        fromLocationId: fromLoc,
        toLocationId: toLoc,
        quantity: qty,
        unitCost: Number(line.unitCost || 0),
      });
    }

    const mvt = {
      id: `mvt-${Date.now()}`,
      organizationId: org.id,
      movementType: mType,
      status: "VALIDATED",
      reference: body.reference,
      notes: body.notes || body.reason || "",
      occurredAt: new Date().toISOString(),
      creator: currentUser,
      idempotencyKey: body.idempotencyKey,
      lines: mvtLines,
    };
    db.movements.unshift(mvt);
    saveDb(db);
    return { data: { data: mvt, idempotentReplay: false } };
  }

  if (cleanUrl === "/inventories" && method === "GET") {
    return { data: { data: db.inventories } };
  }

  if (cleanUrl === "/inventories" && method === "POST") {
    const wh = db.warehouses.find((w: any) => w.id === body.warehouseId) || db.warehouses[0];
    const whLocIds = db.locations
      .filter((l: any) => l.warehouseId === wh.id)
      .map((l: any) => l.id);
    const lines = db.balances
      .filter((b: any) => whLocIds.includes(b.locationId))
      .map((b: any) => ({
        id: `invl-${Date.now()}-${Math.random()}`,
        productId: b.productId,
        locationId: b.locationId,
        expectedQuantity: Number(b.onHand),
        countedQuantity: Number(b.onHand),
        variance: 0,
        product: {
          ...(db.products.find((p: any) => p.id === b.productId) || db.products[0]),
          baseUnit: db.units[0],
        },
        location: db.locations.find((l: any) => l.id === b.locationId),
      }));

    const inv = {
      id: `inv-${Date.now()}`,
      organizationId: org.id,
      warehouseId: wh.id,
      warehouse: wh,
      status: "COUNTING",
      notes: body.notes || "",
      startedAt: new Date().toISOString(),
      creator: currentUser,
      lines,
    };
    db.inventories.unshift(inv);
    saveDb(db);
    return { data: { data: inv } };
  }

  if (cleanUrl.endsWith("/counts") && method === "POST") {
    const invId = cleanUrl.split("/")[2];
    const inv = db.inventories.find((i: any) => i.id === invId);
    if (inv) {
      for (const item of body.lines || []) {
        const l = inv.lines.find(
          (line: any) =>
            line.productId === item.productId && line.locationId === item.locationId
        );
        if (l) {
          l.countedQuantity = Number(item.countedQuantity);
          l.variance = Number(item.countedQuantity) - Number(l.expectedQuantity);
        }
      }
      saveDb(db);
    }
    return { data: { data: inv } };
  }

  if (cleanUrl.endsWith("/validate") && method === "POST") {
    const invId = cleanUrl.split("/")[2];
    const inv = db.inventories.find((i: any) => i.id === invId);
    if (inv) {
      inv.status = "VALIDATED";
      inv.validatedAt = new Date().toISOString();
      for (const l of inv.lines) {
        const bal = db.balances.find(
          (b: any) => b.productId === l.productId && b.locationId === l.locationId
        );
        if (bal) bal.onHand = Number(l.countedQuantity);
      }
      saveDb(db);
    }
    return { data: { data: inv } };
  }

  if (cleanUrl === "/reports/overview") {
    const orgProds = db.products.filter((p: any) => p.organizationId === org.id);
    let low = 0;
    let out = 0;
    let totalVal = 0;
    const attentionProducts: any[] = [];

    for (const p of orgProds) {
      const onHand = db.balances
        .filter((b: any) => b.productId === p.id)
        .reduce((s: number, b: any) => s + Number(b.onHand), 0);
      totalVal += onHand * Number(p.costPrice || 0);
      if (onHand <= 0) {
        out++;
        attentionProducts.push({
          id: p.id,
          sku: p.sku,
          name: p.name,
          unit: "UN",
          available: onHand,
          reorderLevel: p.reorderLevel,
          status: "OUT_OF_STOCK",
        });
      } else if (onHand <= p.reorderLevel) {
        low++;
        attentionProducts.push({
          id: p.id,
          sku: p.sku,
          name: p.name,
          unit: "UN",
          available: onHand,
          reorderLevel: p.reorderLevel,
          status: "LOW_STOCK",
        });
      }
    }

    return {
      data: {
        data: {
          kpis: {
            activeProductsCount: orgProds.length,
            lowStockCount: low,
            outOfStockCount: out,
            activeWarehousesCount: db.warehouses.filter((w: any) => w.organizationId === org.id).length,
            periodReceiptsTotal: 42,
            periodIssuesTotal: 12,
            estimatedStockValue: Number(totalVal.toFixed(2)),
            costCoverageRatio: 100,
            currency: org.settings.defaultCurrency || "EUR",
          },
          kpiDefinitions: {
            activeProductsCount: { formula: "COUNT(products WHERE is_active = true)", period: "Instant T", timezone: org.settings.timezone },
            lowStockCount: { formula: "0 < available <= reorder_level", period: "Instant T", timezone: org.settings.timezone },
            outOfStockCount: { formula: "available <= 0", period: "Instant T", timezone: org.settings.timezone },
            estimatedStockValue: { formula: "SUM(on_hand * cost_price)", period: "Instant T (WAC)", timezone: org.settings.timezone },
          },
          flowSeries: [
            { date: "J-3", receipts: 20, issues: 4, transfers: 2 },
            { date: "J-2", receipts: 8, issues: 5, transfers: 0 },
            { date: "J-1", receipts: 14, issues: 3, transfers: 4 },
            { date: "Aujourd'hui", receipts: 34, issues: 0, transfers: 0 },
          ],
          attentionProducts,
          recentMovements: db.movements.slice(0, 8).map((m: any) => ({
            id: m.id,
            movementType: m.movementType,
            status: m.status,
            reference: m.reference,
            occurredAt: m.occurredAt,
            creatorName: m.creator?.name || "Opérateur",
            lineCount: m.lines.length,
            totalQuantity: m.lines.reduce((s: number, l: any) => s + Number(l.quantity), 0),
          })),
        },
      },
    };
  }

  if (cleanUrl === "/reports/stock-value") {
    return {
      data: {
        data: {
          byWarehouse: [{ warehouseName: "Entrepôt Central Lyon-Corbas (DÉMO)", totalValue: 3006, totalUnits: 42 }],
          byCategory: [
            { categoryName: "Équipements & Outillage Pro", totalValue: 2890, totalUnits: 34 },
            { categoryName: "Emballages & Conditionnement", totalValue: 116, totalUnits: 8 },
          ],
        },
      },
    };
  }

  if (cleanUrl === "/alerts/stock") {
    const alerts = db.products
      .filter((p: any) => p.organizationId === org.id)
      .map((p: any) => {
        const available = db.balances
          .filter((b: any) => b.productId === p.id)
          .reduce((s: number, b: any) => s + Number(b.onHand), 0);
        const severity =
          available <= 0
            ? "CRITICAL_OUT_OF_STOCK"
            : available <= p.reorderLevel
              ? "WARNING_LOW_STOCK"
              : null;
        if (!severity) return null;
        return {
          productId: p.id,
          sku: p.sku,
          name: p.name,
          categoryName: "Catalogue",
          unitCode: "UN",
          onHand: available,
          reserved: 0,
          available,
          reorderLevel: p.reorderLevel,
          deficit: Math.max(0, p.reorderLevel - available),
          severity,
        };
      })
      .filter(Boolean);
    return { data: { data: alerts } };
  }

  if (cleanUrl === "/audit-logs") {
    return { data: { data: db.auditLogs } };
  }

  if (cleanUrl === "/settings/appearance" && method === "GET") {
    const preset = (org.theme.themePreset || "gstock-classic") as ThemePresetId;
    const customColors = (org.theme.designTokens || {}) as Partial<DesignTokens>;
    const resolvedLightTokens = resolveDesignTokens({ preset, mode: "light", customColors });
    const resolvedDarkTokens = resolveDesignTokens({ preset, mode: "dark", customColors });
    return {
      data: {
        data: {
          branding: org.branding,
          theme: org.theme,
          userPreference: db.userPreference,
          presetsCatalog: THEME_PRESETS,
          resolvedLightTokens,
          resolvedDarkTokens,
          contrastCheck: {
            lightTextOnBackground: getContrastRatio(
              resolvedLightTokens["--color-background"],
              resolvedLightTokens["--color-text"]
            ),
            primaryButtonContrast: getContrastRatio(
              resolvedLightTokens["--color-primary"],
              resolvedLightTokens["--color-primary-foreground"]
            ),
          },
        },
      },
    };
  }

  if (cleanUrl === "/settings/appearance" && method === "PUT") {
    if (body.displayName) org.branding.displayName = body.displayName;
    org.theme = { ...org.theme, ...body };
    saveDb(db);
    return { data: { data: { theme: org.theme, branding: org.branding } } };
  }

  if (cleanUrl === "/billing/plans") {
    return {
      data: {
        data: db.plans,
        providerMeta: {
          provider: "simulated_dev",
          isConfiguredForProduction: false,
          modeNotice:
            "Mode de développement explicite : aucun prestataire bancaire externe configuré (simulation contrôlée).",
        },
      },
    };
  }

  if (cleanUrl === "/billing/subscription") {
    return {
      data: {
        data: {
          subscription: org.subscription,
          usage: {
            membersCount: db.users.length,
            warehousesCount: db.warehouses.filter((w: any) => w.organizationId === org.id).length,
            productsCount: db.products.filter((p: any) => p.organizationId === org.id).length,
          },
          providerMeta: {
            provider: "simulated_dev",
            isConfiguredForProduction: false,
            modeNotice:
              "Mode développement explicite : le changement de plan est persisté via SimulatedDevBillingProvider.",
          },
        },
      },
    };
  }

  if (cleanUrl === "/billing/checkout" && method === "POST") {
    const plan = db.plans.find((p: any) => p.code === body.planCode) || db.plans[1];
    org.subscription.planId = plan.id;
    org.subscription.plan = plan;
    org.subscription.status = "active";
    saveDb(db);
    return {
      data: {
        data: {
          subscription: org.subscription,
          checkoutSession: { provider: "simulated_dev", isDevelopmentSimulation: true },
        },
      },
    };
  }

  if (cleanUrl === "/admin/overview") {
    return {
      data: {
        data: {
          metrics: {
            totalOrganizations: db.organizations.length,
            activeOrganizations: db.organizations.length,
            totalUsers: db.users.length,
            totalMovements: db.movements.length,
          },
          organizations: db.organizations.map((o: any) => ({
            ...o,
            _count: {
              memberships: db.users.length,
              products: db.products.length,
              warehouses: db.warehouses.length,
              stockMovements: db.movements.length,
            },
          })),
          plans: db.plans,
          webhookEvents: [],
          recentAuditLogs: db.auditLogs,
        },
      },
    };
  }

  return { data: { data: {} } };
}
