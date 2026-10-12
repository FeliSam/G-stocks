import crypto from "node:crypto";
import { prisma, Prisma } from "./index.js";
import { ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, DEFAULT_SAAS_PLANS } from "@g-stock/config";

export function hashPasswordScrypt(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

const GLOBAL_UNITS = [
  { code: "UN", name: "Unité / Pièce", dimension: "COUNT", precision: 0 },
  { code: "BOX", name: "Boîte / Carton", dimension: "COUNT", precision: 0 },
  { code: "PACK", name: "Pack / Lot", dimension: "COUNT", precision: 0 },
  { code: "PAL", name: "Palette", dimension: "COUNT", precision: 0 },
  { code: "PAIR", name: "Paire", dimension: "COUNT", precision: 0 },
  { code: "KG", name: "Kilogramme", dimension: "MASS", precision: 3 },
  { code: "G", name: "Gramme", dimension: "MASS", precision: 1 },
  { code: "L", name: "Litre", dimension: "VOLUME", precision: 3 },
  { code: "ML", name: "Millilitre", dimension: "VOLUME", precision: 0 },
  { code: "M", name: "Mètre", dimension: "LENGTH", precision: 2 },
  { code: "M2", name: "Mètre carré", dimension: "AREA", precision: 2 },
  { code: "M3", name: "Mètre cube", dimension: "VOLUME", precision: 3 },
];

export async function seedDatabase() {
  console.log("[Seed] Initialisation des permissions système...");
  for (const perm of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: { name: perm.name, category: perm.category },
      create: { code: perm.code, name: perm.name, category: perm.category },
    });
  }

  console.log("[Seed] Initialisation des plans SaaS...");
  for (const planDef of DEFAULT_SAAS_PLANS) {
    const plan = await prisma.plan.upsert({
      where: { code: planDef.code },
      update: {
        name: planDef.name,
        description: planDef.description,
        price: new Prisma.Decimal(planDef.priceMonthly),
        currency: planDef.currency,
      },
      create: {
        code: planDef.code,
        name: planDef.name,
        description: planDef.description,
        price: new Prisma.Decimal(planDef.priceMonthly),
        currency: planDef.currency,
      },
    });

    const entries: Array<{ key: string; enabled: boolean; limit: number | null }> = [
      { key: "max_members", enabled: true, limit: planDef.limits.max_members },
      { key: "max_warehouses", enabled: true, limit: planDef.limits.max_warehouses },
      { key: "max_products", enabled: true, limit: planDef.limits.max_products },
      { key: "custom_branding", enabled: planDef.limits.custom_branding, limit: null },
      { key: "multi_warehouse", enabled: planDef.limits.multi_warehouse, limit: null },
      { key: "audit_logs", enabled: planDef.limits.audit_logs, limit: null },
      { key: "csv_import_export", enabled: planDef.limits.csv_import_export, limit: null },
    ];

    for (const f of entries) {
      await prisma.planFeature.upsert({
        where: { planId_featureKey: { planId: plan.id, featureKey: f.key } },
        update: { enabled: f.enabled, limitValue: f.limit },
        create: {
          planId: plan.id,
          featureKey: f.key,
          enabled: f.enabled,
          limitValue: f.limit,
        },
      });
    }
  }

  console.log("[Seed] Initialisation des unités de mesure globales...");
  const unitMap = new Map<string, string>();
  for (const u of GLOBAL_UNITS) {
    const existing = await prisma.unitOfMeasure.findFirst({
      where: { organizationId: null, code: u.code },
    });
    if (existing) {
      unitMap.set(u.code, existing.id);
    } else {
      const created = await prisma.unitOfMeasure.create({
        data: {
          organizationId: null,
          code: u.code,
          name: u.name,
          dimension: u.dimension,
          precision: u.precision,
        },
      });
      unitMap.set(u.code, created.id);
    }
  }

  console.log("[Seed] Création des comptes de démonstration explicites (isDemo = true)...");
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@g-stock.local" },
    update: { isPlatformAdmin: true },
    create: {
      email: "admin@g-stock.local",
      passwordHash: hashPasswordScrypt("GStockAdmin2026!"),
      name: "Claire Moreau (Admin Plateforme)",
      isPlatformAdmin: true,
      emailVerifiedAt: new Date(),
    },
  });

  const managerUser = await prisma.user.upsert({
    where: { email: "responsable@horizon-demo.local" },
    update: {},
    create: {
      email: "responsable@horizon-demo.local",
      passwordHash: hashPasswordScrypt("GStockDemo2026!"),
      name: "Marc Lefèvre (Responsable Stock)",
      isPlatformAdmin: false,
      emailVerifiedAt: new Date(),
    },
  });

  const proPlan = await prisma.plan.findUniqueOrThrow({ where: { code: "pro" } });

  const demoOrg = await prisma.organization.upsert({
    where: { slug: "demo-horizon" },
    update: { isDemo: true },
    create: {
      name: "[DÉMO] Distribution Horizon SAS",
      slug: "demo-horizon",
      isDemo: true,
      status: "ACTIVE",
    },
  });

  await prisma.organizationSettings.upsert({
    where: { organizationId: demoOrg.id },
    update: {},
    create: {
      organizationId: demoOrg.id,
      industryProfile: "wholesale",
      countryCode: "FR",
      defaultCurrency: "EUR",
      timezone: "Europe/Paris",
      locale: "fr-FR",
      negativeStockPolicy: "FORBID",
      costingMethod: "WAC",
    },
  });

  await prisma.organizationBranding.upsert({
    where: { organizationId: demoOrg.id },
    update: {},
    create: {
      organizationId: demoOrg.id,
      displayName: "[DÉMO] Distribution Horizon",
    },
  });

  await prisma.organizationTheme.upsert({
    where: { organizationId: demoOrg.id },
    update: {},
    create: {
      organizationId: demoOrg.id,
      themePreset: "gstock-classic",
      colorModeDefault: "light",
      designTokens: {},
    },
  });

  await prisma.subscription.upsert({
    where: { organizationId: demoOrg.id },
    update: {},
    create: {
      organizationId: demoOrg.id,
      planId: proPlan.id,
      status: "active",
      provider: "simulated_dev",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    },
  });

  // Rôles de l'organisation de démonstration
  const allPerms = await prisma.permission.findMany();
  const permByCode = new Map(allPerms.map((p) => [p.code, p.id]));

  const roleLabels: Record<string, string> = {
    owner: "Propriétaire d'entreprise",
    org_admin: "Administrateur d'entreprise",
    stock_manager: "Responsable de stock",
    warehouse_clerk: "Magasinier",
    auditor: "Auditeur / Lecteur",
  };

  const orgRoles = new Map<string, string>();
  for (const [roleCode, label] of Object.entries(roleLabels)) {
    const r = await prisma.role.upsert({
      where: { organizationId_code: { organizationId: demoOrg.id, code: roleCode } },
      update: { name: label },
      create: {
        organizationId: demoOrg.id,
        code: roleCode,
        name: label,
        isSystem: true,
      },
    });
    orgRoles.set(roleCode, r.id);

    const codes = DEFAULT_ROLE_PERMISSIONS[roleCode as keyof typeof DEFAULT_ROLE_PERMISSIONS] || [];
    for (const c of codes) {
      const pid = permByCode.get(c);
      if (pid) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: r.id, permissionId: pid } },
          update: {},
          create: { roleId: r.id, permissionId: pid },
        });
      }
    }
  }

  for (const [user, roleCode] of [
    [adminUser, "owner"],
    [managerUser, "stock_manager"],
  ] as const) {
    const m = await prisma.membership.upsert({
      where: { organizationId_userId: { organizationId: demoOrg.id, userId: user.id } },
      update: { status: "ACTIVE" },
      create: { organizationId: demoOrg.id, userId: user.id, status: "ACTIVE" },
    });
    const rId = orgRoles.get(roleCode)!;
    await prisma.membershipRole.upsert({
      where: { membershipId_roleId: { membershipId: m.id, roleId: rId } },
      update: {},
      create: { membershipId: m.id, roleId: rId },
    });
  }

  // Entrepôt et emplacements de démo
  const wh = await prisma.warehouse.upsert({
    where: { organizationId_code: { organizationId: demoOrg.id, code: "WH-LYON-01" } },
    update: {},
    create: {
      organizationId: demoOrg.id,
      code: "WH-LYON-01",
      name: "Entrepôt Central Lyon-Corbas (DÉMO)",
      isActive: true,
    },
  });

  const locA1 = await prisma.location.upsert({
    where: { warehouseId_code: { warehouseId: wh.id, code: "ALLEE-A-01" } },
    update: {},
    create: {
      organizationId: demoOrg.id,
      warehouseId: wh.id,
      code: "ALLEE-A-01",
      locationType: "STORAGE",
    },
  });

  const locB1 = await prisma.location.upsert({
    where: { warehouseId_code: { warehouseId: wh.id, code: "ALLEE-B-01" } },
    update: {},
    create: {
      organizationId: demoOrg.id,
      warehouseId: wh.id,
      code: "ALLEE-B-01",
      locationType: "STORAGE",
    },
  });

  await prisma.location.upsert({
    where: { warehouseId_code: { warehouseId: wh.id, code: "QUAI-RECEP" } },
    update: {},
    create: {
      organizationId: demoOrg.id,
      warehouseId: wh.id,
      code: "QUAI-RECEP",
      locationType: "RECEIVING",
    },
  });

  const catElec = await prisma.category.upsert({
    where: { organizationId_code: { organizationId: demoOrg.id, code: "CAT-EQUIP" } },
    update: {},
    create: {
      organizationId: demoOrg.id,
      code: "CAT-EQUIP",
      name: "Équipements & Outillage Pro",
    },
  });

  const catPack = await prisma.category.upsert({
    where: { organizationId_code: { organizationId: demoOrg.id, code: "CAT-EMBAL" } },
    update: {},
    create: {
      organizationId: demoOrg.id,
      code: "CAT-EMBAL",
      name: "Emballages & Conditionnement",
    },
  });

  const unId = unitMap.get("UN")!;
  const boxId = unitMap.get("BOX")!;

  const prod1 = await prisma.product.upsert({
    where: { organizationId_sku: { organizationId: demoOrg.id, sku: "SCAN-PRO-2D" } },
    update: {
      salePrice: new Prisma.Decimal("149.00"),
      barcode: "3760123450018",
      brand: "ZebraTech Industrial",
      supplierName: "AutoID Distribution Europe",
      weightKg: new Prisma.Decimal("0.420"),
      dimensionsCm: "18 x 7 x 11 cm",
      leadTimeDays: 3,
      imageUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80",
      specsJson: {
        Connectivite: "Bluetooth 5.2 + Base USB-C",
        IndiceProtection: "IP65 (chutes 2m sur béton)",
        Autonomie: "65 000 lectures / charge",
        Garantie: "3 ans constructeur",
      },
    },
    create: {
      organizationId: demoOrg.id,
      categoryId: catElec.id,
      sku: "SCAN-PRO-2D",
      name: "Douchette Code-Barres Laser 2D Sans Fil",
      description: "Lecteur industriel haute cadence IP65 avec socle de charge et retour haptique.",
      baseUnitId: unId,
      costPrice: new Prisma.Decimal("85.00"),
      salePrice: new Prisma.Decimal("149.00"),
      reorderLevel: new Prisma.Decimal("10"),
      trackingMode: "SERIAL",
      barcode: "3760123450018",
      brand: "ZebraTech Industrial",
      supplierName: "AutoID Distribution Europe",
      weightKg: new Prisma.Decimal("0.420"),
      dimensionsCm: "18 x 7 x 11 cm",
      leadTimeDays: 3,
      imageUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80",
      specsJson: {
        Connectivite: "Bluetooth 5.2 + Base USB-C",
        IndiceProtection: "IP65 (chutes 2m sur béton)",
        Autonomie: "65 000 lectures / charge",
        Garantie: "3 ans constructeur",
      },
    },
  });

  const prod2 = await prisma.product.upsert({
    where: { organizationId_sku: { organizationId: demoOrg.id, sku: "CAISSE-60X40" } },
    update: {
      salePrice: new Prisma.Decimal("24.90"),
      barcode: "3760123450025",
      brand: "EuroPlast Pro",
      supplierName: "Manutan Logistique SAS",
      weightKg: new Prisma.Decimal("1.850"),
      dimensionsCm: "60 x 40 x 32 cm",
      leadTimeDays: 5,
      imageUrl: "https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=600&q=80",
      specsJson: {
        Matiere: "Polypropylène vierge alimentaire (PP-HD)",
        VolumeUtile: "60 Litres",
        ChargeMax: "35 kg unitaire / 250 kg gerbé",
        Temperature: "-20°C à +80°C",
      },
    },
    create: {
      organizationId: demoOrg.id,
      categoryId: catPack.id,
      sku: "CAISSE-60X40",
      name: "Bac Logistique Norme Europe 600x400mm",
      description: "Bac polypropylène haute densité gerbable gris à fond renforcé.",
      baseUnitId: unId,
      costPrice: new Prisma.Decimal("14.50"),
      salePrice: new Prisma.Decimal("24.90"),
      reorderLevel: new Prisma.Decimal("25"),
      trackingMode: "STANDARD",
      barcode: "3760123450025",
      brand: "EuroPlast Pro",
      supplierName: "Manutan Logistique SAS",
      weightKg: new Prisma.Decimal("1.850"),
      dimensionsCm: "60 x 40 x 32 cm",
      leadTimeDays: 5,
      imageUrl: "https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=600&q=80",
      specsJson: {
        Matiere: "Polypropylène vierge alimentaire (PP-HD)",
        VolumeUtile: "60 Litres",
        ChargeMax: "35 kg unitaire / 250 kg gerbé",
        Temperature: "-20°C à +80°C",
      },
    },
  });

  const prod3 = await prisma.product.upsert({
    where: { organizationId_sku: { organizationId: demoOrg.id, sku: "FILM-PAL-23M" } },
    update: {
      salePrice: new Prisma.Decimal("69.00"),
      barcode: "3760123450032",
      brand: "RajaPack",
      supplierName: "Raja France Emballages",
      weightKg: new Prisma.Decimal("13.200"),
      dimensionsCm: "45 x 30 x 50 cm",
      leadTimeDays: 2,
      imageUrl: "https://images.unsplash.com/photo-1607166452427-7e4477079cb9?auto=format&fit=crop&w=600&q=80",
      specsJson: {
        Epaisseur: "23 microns cast tri-couche",
        Laize: "450 mm x 270 m par bobine",
        Conditionnement: "Carton de 6 bobines",
        Etirabilite: "Jusqu'à 180%",
      },
    },
    create: {
      organizationId: demoOrg.id,
      categoryId: catPack.id,
      sku: "FILM-PAL-23M",
      name: "Carton 6 Bobines Film Étirable 23 microns",
      description: "Film étirable transparent haute résistance pour palettisation.",
      baseUnitId: boxId,
      costPrice: new Prisma.Decimal("42.00"),
      salePrice: new Prisma.Decimal("69.00"),
      reorderLevel: new Prisma.Decimal("15"),
      trackingMode: "LOT_EXPIRY",
      barcode: "3760123450032",
      brand: "RajaPack",
      supplierName: "Raja France Emballages",
      weightKg: new Prisma.Decimal("13.200"),
      dimensionsCm: "45 x 30 x 50 cm",
      leadTimeDays: 2,
      imageUrl: "https://images.unsplash.com/photo-1607166452427-7e4477079cb9?auto=format&fit=crop&w=600&q=80",
      specsJson: {
        Epaisseur: "23 microns cast tri-couche",
        Laize: "450 mm x 270 m par bobine",
        Conditionnement: "Carton de 6 bobines",
        Etirabilite: "Jusqu'à 180%",
      },
    },
  });

  // Mouvement initial idempotent de démonstration
  const existingMovement = await prisma.stockMovement.findUnique({
    where: {
      organizationId_idempotencyKey: {
        organizationId: demoOrg.id,
        idempotencyKey: "seed-opening-balance-001",
      },
    },
  });

  if (!existingMovement) {
    await prisma.$transaction(async (tx) => {
      const mvt = await tx.stockMovement.create({
        data: {
          organizationId: demoOrg.id,
          movementType: "opening_balance",
          status: "VALIDATED",
          reference: "INIT-DEMO-2026-001",
          notes: "Stock initial de démonstration (isolé et identifié [DÉMO])",
          createdBy: adminUser.id,
          validatedBy: adminUser.id,
          validatedAt: new Date(),
          idempotencyKey: "seed-opening-balance-001",
          lines: {
            create: [
              {
                organizationId: demoOrg.id,
                productId: prod1.id,
                toLocationId: locA1.id,
                quantity: new Prisma.Decimal("34"),
                unitCost: new Prisma.Decimal("85.00"),
              },
              {
                organizationId: demoOrg.id,
                productId: prod2.id,
                toLocationId: locA1.id,
                quantity: new Prisma.Decimal("8"), // Sous le seuil d'alerte (25)
                unitCost: new Prisma.Decimal("14.50"),
              },
              {
                organizationId: demoOrg.id,
                productId: prod3.id,
                toLocationId: locB1.id,
                quantity: new Prisma.Decimal("0"), // En rupture (seuil 15)
                unitCost: new Prisma.Decimal("42.00"),
              },
            ],
          },
        },
      });

      await tx.inventoryBalance.upsert({
        where: {
          organizationId_productId_locationId: {
            organizationId: demoOrg.id,
            productId: prod1.id,
            locationId: locA1.id,
          },
        },
        update: { onHand: new Prisma.Decimal("34") },
        create: {
          organizationId: demoOrg.id,
          productId: prod1.id,
          locationId: locA1.id,
          onHand: new Prisma.Decimal("34"),
        },
      });

      await tx.inventoryBalance.upsert({
        where: {
          organizationId_productId_locationId: {
            organizationId: demoOrg.id,
            productId: prod2.id,
            locationId: locA1.id,
          },
        },
        update: { onHand: new Prisma.Decimal("8") },
        create: {
          organizationId: demoOrg.id,
          productId: prod2.id,
          locationId: locA1.id,
          onHand: new Prisma.Decimal("8"),
        },
      });

      await tx.inventoryBalance.upsert({
        where: {
          organizationId_productId_locationId: {
            organizationId: demoOrg.id,
            productId: prod3.id,
            locationId: locB1.id,
          },
        },
        update: { onHand: new Prisma.Decimal("0") },
        create: {
          organizationId: demoOrg.id,
          productId: prod3.id,
          locationId: locB1.id,
          onHand: new Prisma.Decimal("0"),
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: demoOrg.id,
          actorUserId: adminUser.id,
          action: "stock.opening_balance",
          resourceType: "stock_movement",
          resourceId: mvt.id,
          metadata: { reference: mvt.reference, demo: true },
        },
      });
    });
  }

  console.log("[Seed] Terminé avec succès.");
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
  seedDatabase()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
