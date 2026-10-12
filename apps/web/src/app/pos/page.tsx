"use client";

import React, { useState, useMemo } from "react";
import { AppShell } from "@/layouts/AppShell";
import {
  useGetProductsQuery,
  useGetCategoriesQuery,
  useGetWarehousesQuery,
  useGetMovementsQuery,
  useCreateIssueMutation,
} from "@/store/api";
import {
  ShoppingBag,
  Search,
  Car,
  Footprints,
  Shirt,
  Package,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Printer,
  CreditCard,
  Banknote,
  Building2,
  Smartphone,
  Sparkles,
  Tag,
  User,
  FileText,
  ScanLine,
  ShieldCheck,
  AlertTriangle,
  Percent,
  Receipt,
  Layers,
  MapPin,
} from "lucide-react";

interface CartItem {
  cartItemId: string;
  productId: string;
  sku: string;
  name: string;
  categoryName: string;
  imageUrl?: string | null;
  unitPrice: number;
  costPrice: number;
  quantity: number;
  maxAvailable: number;
  variantSku?: string;
  variantLabel?: string;
  warrantyMonths: number;
}

interface CompletedReceipt {
  receiptNumber: string;
  createdAt: string;
  customerName: string;
  customerContact: string;
  paymentMethod: string;
  locationCode: string;
  items: CartItem[];
  subtotalHT: number;
  discountPercent: number;
  discountAmount: number;
  vatRate: number;
  vatAmount: number;
  totalTTC: number;
  notes?: string;
}

export default function PosStorePage() {
  const { data: productsRes, isLoading: loadingProducts } = useGetProductsQuery({
    page: 1,
    limit: 100,
  });
  const { data: categoriesRes } = useGetCategoriesQuery();
  const { data: warehousesRes } = useGetWarehousesQuery();
  const { data: movementsRes } = useGetMovementsQuery({
    page: 1,
    limit: 15,
    movementType: "issue",
  });
  const [createIssue, { isLoading: isSubmittingSale }] = useCreateIssueMutation();

  const products: any[] = productsRes?.data || [];
  const categories: any[] = categoriesRes?.data || [];
  const warehouses: any[] = warehousesRes?.data || [];
  const recentIssues: any[] = movementsRes?.data || [];

  // Default store/showroom location
  const allLocations = useMemo(() => {
    const list: Array<{ id: string; code: string; warehouseName: string; type: string }> = [];
    for (const wh of warehouses) {
      for (const loc of wh.locations || []) {
        list.push({
          id: loc.id,
          code: loc.code,
          warehouseName: wh.name,
          type: loc.locationType,
        });
      }
    }
    return list;
  }, [warehouses]);

  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const activeLocationId = selectedLocationId || allLocations[0]?.id || "";

  // Store filters
  const [search, setSearch] = useState("");
  const [selectedSector, setSelectedSector] = useState<string>("ALL");
  const [selectedVariantMap, setSelectedVariantMap] = useState<Record<string, string>>({});

  // Cart & Checkout state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("Client Comptoir / Particulier");
  const [customerContact, setCustomerContact] = useState("");
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [vatRate, setVatRate] = useState<number>(20);
  const [paymentMethod, setPaymentMethod] = useState<string>("CARTE_BANCAIRE");
  const [saleNotes, setSaleNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastReceipt, setLastReceipt] = useState<CompletedReceipt | null>(null);

  // Filter products by sector / search
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const catName = (p.category?.name || "").toLowerCase();
      const nameAndSku = `${p.name} ${p.sku} ${p.barcode || ""} ${p.brand || ""}`.toLowerCase();

      if (search.trim() && !nameAndSku.includes(search.trim().toLowerCase())) {
        return false;
      }

      if (selectedSector === "AUTO") {
        return catName.includes("auto") || catName.includes("véhicule") || p.sku.startsWith("AUTO-");
      }
      if (selectedSector === "SHOES") {
        return catName.includes("chaussure") || catName.includes("sneaker") || p.sku.startsWith("SHOE-");
      }
      if (selectedSector === "HABIT") {
        return catName.includes("habit") || catName.includes("mode") || catName.includes("vêtement") || p.sku.startsWith("HABIT-");
      }
      if (selectedSector === "OTHER") {
        return (
          !catName.includes("auto") &&
          !catName.includes("chaussure") &&
          !catName.includes("habit") &&
          !catName.includes("mode")
        );
      }
      return true;
    });
  }, [products, search, selectedSector]);

  const getSectorBadge = (p: any) => {
    const catName = (p.category?.name || "").toLowerCase();
    if (catName.includes("auto") || p.sku.startsWith("AUTO-")) {
      return {
        label: "Concession Auto",
        icon: Car,
        classes: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
        defaultWarranty: 24,
      };
    }
    if (catName.includes("chaussure") || p.sku.startsWith("SHOE-")) {
      return {
        label: "Chaussures & Pointures",
        icon: Footprints,
        classes: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
        defaultWarranty: 6,
      };
    }
    if (catName.includes("habit") || catName.includes("mode") || p.sku.startsWith("HABIT-")) {
      return {
        label: "Habits & Prêt-à-porter",
        icon: Shirt,
        classes: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30",
        defaultWarranty: 3,
      };
    }
    return {
      label: p.category?.name || "Rayon Général",
      icon: Package,
      classes: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
      defaultWarranty: 12,
    };
  };

  const formatVariantAttributes = (attributes: Record<string, string> | undefined) => {
    if (!attributes) return "";
    return Object.entries(attributes)
      .map(([k, v]) => `${k}: ${v}`)
      .join(" • ");
  };

  const handleAddToCart = (product: any) => {
    setErrorMsg(null);
    const available = Number(
      product.available ?? product.totalAvailable ?? product.totalOnHand ?? 0
    );
    if (available <= 0) {
      setErrorMsg(`Rupture de stock sur « ${product.name} » (0 disponible).`);
      return;
    }

    const variants: any[] = product.variants || [];
    const chosenVariantSku =
      selectedVariantMap[product.id] || (variants.length > 0 ? variants[0].sku : undefined);
    const chosenVariantObj = variants.find((v) => v.sku === chosenVariantSku);
    const variantLabel = chosenVariantObj
      ? formatVariantAttributes(chosenVariantObj.attributes)
      : undefined;

    const cartItemId = `${product.id}::${chosenVariantSku || "STD"}`;
    const unitPrice = Number(product.salePrice ?? Number(product.costPrice || 0) * 1.35);
    const costPrice = Number(product.costPrice || 0);
    const sectorInfo = getSectorBadge(product);

    setCart((prev) => {
      const existing = prev.find((item) => item.cartItemId === cartItemId);
      const totalProductInCart = prev
        .filter((i) => i.productId === product.id)
        .reduce((acc, i) => acc + i.quantity, 0);

      if (totalProductInCart + 1 > available) {
        setErrorMsg(
          `Stock insuffisant pour « ${product.name} » (${available} disponible(s) en magasin).`
        );
        return prev;
      }

      if (existing) {
        return prev.map((item) =>
          item.cartItemId === cartItemId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...prev,
        {
          cartItemId,
          productId: product.id,
          sku: product.sku,
          name: product.name,
          categoryName: product.category?.name || "Magasin",
          imageUrl: product.imageUrl,
          unitPrice,
          costPrice,
          quantity: 1,
          maxAvailable: available,
          variantSku: chosenVariantSku,
          variantLabel,
          warrantyMonths: sectorInfo.defaultWarranty,
        },
      ];
    });
  };

  const updateCartQuantity = (cartItemId: string, delta: number) => {
    setErrorMsg(null);
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.cartItemId !== cartItemId) return item;
          const nextQty = item.quantity + delta;
          if (nextQty <= 0) return null;
          if (nextQty > item.maxAvailable) {
            setErrorMsg(`Quantité maximale disponible atteinte (${item.maxAvailable}).`);
            return item;
          }
          return { ...item, quantity: nextQty };
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (cartItemId: string) => {
    setCart((prev) => prev.filter((item) => item.cartItemId !== cartItemId));
  };

  // Totals calculation
  const subtotalHT = useMemo(
    () => cart.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0),
    [cart]
  );
  const totalMarginHT = useMemo(
    () =>
      cart.reduce(
        (acc, item) => acc + (item.unitPrice - item.costPrice) * item.quantity,
        0
      ),
    [cart]
  );
  const clampedDiscount = Math.min(100, Math.max(0, discountPercent || 0));
  const discountAmount = subtotalHT * (clampedDiscount / 100);
  const netHT = subtotalHT - discountAmount;
  const vatAmount = netHT * (vatRate / 100);
  const totalTTC = netHT + vatAmount;

  const handleCheckoutSale = async () => {
    setErrorMsg(null);
    if (cart.length === 0) {
      setErrorMsg("Le panier de caisse est vide. Ajoutez au moins un article ou véhicule.");
      return;
    }
    if (!activeLocationId) {
      setErrorMsg("Veuillez sélectionner un emplacement de sortie (Showroom / Magasin).");
      return;
    }

    try {
      // Group quantities by productId for atomic stock issue
      const linesByProduct = new Map<string, { productId: string; quantity: number }>();
      for (const item of cart) {
        const current = linesByProduct.get(item.productId);
        if (current) {
          current.quantity += item.quantity;
        } else {
          linesByProduct.set(item.productId, {
            productId: item.productId,
            quantity: item.quantity,
          });
        }
      }

      const variantDetails = cart
        .map(
          (i) =>
            `${i.quantity}x ${i.sku}${i.variantLabel ? ` [${i.variantLabel}]` : ""}`
        )
        .join(" | ");

      const receiptNumber = `TICKET-${new Date().getFullYear()}-${String(
        Math.floor(100000 + Math.random() * 900000)
      )}`;

      await createIssue({
        reference: receiptNumber,
        idempotencyKey: `pos-sale-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        notes: `Vente Magasin ${receiptNumber} • Client: ${customerName} • Paiement: ${paymentMethod} • ${variantDetails}`,
        lines: Array.from(linesByProduct.values()).map((l) => ({
          productId: l.productId,
          fromLocationId: activeLocationId,
          quantity: l.quantity,
        })),
      }).unwrap();

      const locObj = allLocations.find((l) => l.id === activeLocationId);

      setLastReceipt({
        receiptNumber,
        createdAt: new Date().toLocaleString("fr-FR"),
        customerName: customerName || "Client Comptoir",
        customerContact,
        paymentMethod,
        locationCode: locObj ? `${locObj.code} (${locObj.warehouseName})` : "MAGASIN",
        items: [...cart],
        subtotalHT,
        discountPercent: clampedDiscount,
        discountAmount,
        vatRate,
        vatAmount,
        totalTTC,
        notes: saleNotes,
      });

      setCart([]);
      setSaleNotes("");
      setDiscountPercent(0);
    } catch (err: any) {
      setErrorMsg(
        err?.data?.error?.message ||
          "Erreur lors de la validation de la vente en caisse. Vérifiez la disponibilité du stock."
      );
    }
  };

  return (
    <AppShell
      title="Caisse & Point de Vente Magasin (POS)"
      subtitle="Concession Voitures (VIN), Boutique Chaussures (Pointures), Habits (Tailles/Couleurs) & Commerce Général"
    >
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[var(--color-primary)]/10 blur-3xl" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-3 py-1 text-xs font-semibold text-[var(--color-primary)]">
                <Sparkles className="h-3.5 w-3.5" />
                Commerce Polyvalent • Concession Auto, Chaussures, Habits & Retail
              </div>
              <h1 className="mt-2 text-2xl font-bold tracking-tight">
                Caisse & Point de Vente Magasin (POS)
              </h1>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                Encaissement comptoir et facturation concession avec sélection de{" "}
                <strong>Pointures (39-45)</strong>, <strong>Tailles & Couleurs (S-XXL)</strong>,{" "}
                <strong>Numéro de Châssis (VIN)</strong> et décrémentation atomique du stock.
              </p>
            </div>

            {/* Location selector */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3.5 py-2">
                <MapPin className="h-4 w-4 text-[var(--color-primary)]" />
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                    Point de vente / Showroom actif
                  </div>
                  <select
                    value={activeLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-[var(--color-text)] focus:outline-none"
                  >
                    {allLocations.map((loc) => (
                      <option
                        key={loc.id}
                        value={loc.id}
                        className="bg-[var(--color-surface)] text-[var(--color-text)]"
                      >
                        {loc.code} — {loc.warehouseName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Sector Quick Filter Pills */}
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] pt-4">
            {[
              { id: "ALL", label: "Tous les Rayons", icon: Layers },
              { id: "AUTO", label: "Concession Voitures & Véhicules", icon: Car },
              { id: "SHOES", label: "Chaussures & Sneakers (Pointures)", icon: Footprints },
              { id: "HABIT", label: "Habits & Mode (Tailles / Couleurs)", icon: Shirt },
              { id: "OTHER", label: "Équipements & Accessoires", icon: Package },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = selectedSector === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedSector(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                    active
                      ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-sm"
                      : "border border-[var(--color-border)] bg-[var(--color-surface-muted)]/60 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}

            <div className="relative ml-auto min-w-[240px] flex-1 sm:flex-initial">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Scanner code-barres, SKU, modèle, VIN..."
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/60 py-2 pl-9 pr-3 text-xs focus:border-[var(--color-primary)] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Main POS Grid: Left = Catalog Cards with Variant Picker | Right = Active Checkout & Receipt */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          {/* LEFT: Store Showroom Grid (7 cols) */}
          <div className="space-y-4 xl:col-span-7">
            {loadingProducts ? (
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-12 text-center text-sm text-[var(--color-text-muted)]">
                Chargement du catalogue magasin et des grilles de tailles/VIN...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-12 text-center">
                <ShoppingBag className="mx-auto h-10 w-10 text-[var(--color-text-muted)] opacity-50" />
                <p className="mt-3 text-sm font-semibold">
                  Aucun article trouvé dans ce rayon
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  Essayez un autre filtre (« Tous les Rayons ») ou créez un article depuis Catalogue Produits.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {filteredProducts.map((product) => {
                  const sector = getSectorBadge(product);
                  const SectorIcon = sector.icon;
                  const available = Number(
                    product.available ?? product.totalAvailable ?? product.totalOnHand ?? 0
                  );
                  const salePrice = Number(
                    product.salePrice ?? Number(product.costPrice || 0) * 1.35
                  );
                  const variants: any[] = product.variants || [];
                  const selectedVarSku =
                    selectedVariantMap[product.id] ||
                    (variants.length > 0 ? variants[0].sku : "");

                  return (
                    <div
                      key={product.id}
                      className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-all hover:border-[var(--color-primary)]/50 hover:shadow-md"
                    >
                      <div>
                        {/* Product Image & Sector Badge */}
                        <div className="relative h-40 w-full overflow-hidden bg-[var(--color-surface-muted)]">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <SectorIcon className="h-12 w-12 text-[var(--color-text-muted)] opacity-30" />
                            </div>
                          )}
                          <div className="absolute left-3 top-3 flex items-center gap-1.5">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur-md ${sector.classes}`}
                            >
                              <SectorIcon className="h-3 w-3" />
                              {sector.label}
                            </span>
                          </div>
                          <div className="absolute right-3 top-3">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold backdrop-blur-md ${
                                available <= 0
                                  ? "bg-red-500/90 text-white"
                                  : available <= Number(product.minStockLevel || 2)
                                  ? "bg-amber-500/90 text-white"
                                  : "bg-emerald-600/90 text-white"
                              }`}
                            >
                              {available <= 0
                                ? "Rupture"
                                : `${available} en stock`}
                            </span>
                          </div>
                        </div>

                        {/* Product Info */}
                        <div className="p-4">
                          <div className="flex items-center justify-between gap-2 text-[11px] text-[var(--color-text-muted)]">
                            <span className="font-mono font-semibold text-[var(--color-primary)]">
                              {product.sku}
                            </span>
                            {product.brand && (
                              <span className="font-medium">{product.brand}</span>
                            )}
                          </div>
                          <h3 className="mt-1 line-clamp-1 text-sm font-bold text-[var(--color-text)]">
                            {product.name}
                          </h3>
                          {product.description && (
                            <p className="mt-1 line-clamp-2 text-xs text-[var(--color-text-muted)]">
                              {product.description}
                            </p>
                          )}

                          {/* Variant Matrix Selector (Pointure / Taille / Couleur / VIN) */}
                          {variants.length > 0 && (
                            <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/60 p-2.5">
                              <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-[var(--color-text)]">
                                <Tag className="h-3 w-3 text-[var(--color-primary)]" />
                                Choisir Pointure / Taille / Couleur / Châssis :
                              </label>
                              <select
                                value={selectedVarSku}
                                onChange={(e) =>
                                  setSelectedVariantMap((prev) => ({
                                    ...prev,
                                    [product.id]: e.target.value,
                                  }))
                                }
                                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none"
                              >
                                {variants.map((v: any) => (
                                  <option key={v.sku} value={v.sku}>
                                    {formatVariantAttributes(v.attributes)} ({v.sku})
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* Key Technical Specs Pills */}
                          {product.specifications &&
                            Object.keys(product.specifications).length > 0 && (
                              <div className="mt-2.5 flex flex-wrap gap-1.5">
                                {Object.entries(product.specifications)
                                  .slice(0, 3)
                                  .map(([k, v]) => (
                                    <span
                                      key={k}
                                      className="rounded-md bg-[var(--color-surface-muted)] px-2 py-0.5 text-[10px] text-[var(--color-text-muted)]"
                                    >
                                      <strong className="text-[var(--color-text)]">
                                        {k}:
                                      </strong>{" "}
                                      {String(v)}
                                    </span>
                                  ))}
                              </div>
                            )}
                        </div>
                      </div>

                      {/* Price & Add to Cart Footer */}
                      <div className="flex items-center justify-between border-t border-[var(--color-border)] bg-[var(--color-surface-muted)]/30 px-4 py-3">
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                            Prix de vente HT
                          </div>
                          <div className="text-base font-extrabold text-[var(--color-text)]">
                            {salePrice.toLocaleString("fr-FR", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{" "}
                            €
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={available <= 0}
                          onClick={() => handleAddToCart(product)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-3.5 py-2 text-xs font-semibold text-[var(--color-primary-foreground)] shadow-sm transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Plus className="h-4 w-4" />
                          Ajouter vente
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT: POS Register / Panier Client & Facture (5 cols) */}
          <div className="space-y-6 xl:col-span-5">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary)]/15 text-[var(--color-primary)]">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold">
                      Panier Caisse & Facturation Client
                    </h2>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {cart.reduce((a, b) => a + b.quantity, 0)} article(s) sélectionné(s)
                    </p>
                  </div>
                </div>
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCart([])}
                    className="text-xs font-medium text-red-500 hover:underline"
                  >
                    Vider
                  </button>
                )}
              </div>

              {errorMsg && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Customer Details */}
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-[var(--color-text-muted)]">
                    <User className="h-3 w-3" /> Client / Acheteur
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nom du client ou société"
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 px-3 py-1.5 text-xs focus:border-[var(--color-primary)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-[var(--color-text-muted)]">
                    <FileText className="h-3 w-3" /> Téléphone / Email / Permis
                  </label>
                  <input
                    type="text"
                    value={customerContact}
                    onChange={(e) => setCustomerContact(e.target.value)}
                    placeholder="Ex: +33 6 12 34 56 78"
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 px-3 py-1.5 text-xs focus:border-[var(--color-primary)] focus:outline-none"
                  />
                </div>
              </div>

              {/* Cart Items List */}
              <div className="mt-4 max-h-72 space-y-2.5 overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[var(--color-border)] p-8 text-center">
                    <ScanLine className="mx-auto h-7 w-7 text-[var(--color-text-muted)] opacity-50" />
                    <p className="mt-2 text-xs font-medium text-[var(--color-text-muted)]">
                      Cliquez sur « Ajouter vente » sur une voiture, une paire de chaussures ou un habit pour l&apos;encaisser.
                    </p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.cartItemId}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/40 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-[var(--color-primary)]">
                            {item.sku}
                          </span>
                          <span className="rounded bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)]">
                            Garantie {item.warrantyMonths} mois
                          </span>
                        </div>
                        <div className="truncate text-xs font-bold text-[var(--color-text)]">
                          {item.name}
                        </div>
                        {item.variantLabel && (
                          <div className="mt-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                            Variante : {item.variantLabel}
                          </div>
                        )}
                        <div className="mt-1 text-xs font-semibold text-[var(--color-text-muted)]">
                          {item.unitPrice.toLocaleString("fr-FR", {
                            minimumFractionDigits: 2,
                          })}{" "}
                          € × {item.quantity} ={" "}
                          <strong className="text-[var(--color-text)]">
                            {(item.unitPrice * item.quantity).toLocaleString("fr-FR", {
                              minimumFractionDigits: 2,
                            })}{" "}
                            € HT
                          </strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.cartItemId, -1)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-muted)]"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.cartItemId, 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-muted)]"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.cartItemId)}
                          className="ml-1 flex h-7 w-7 items-center justify-center rounded-lg text-red-500 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Discount, VAT & Payment Method */}
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--color-border)] pt-4">
                <div>
                  <label className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-[var(--color-text-muted)]">
                    <Percent className="h-3 w-3" /> Remise commerciale (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Number(e.target.value))}
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 px-3 py-1.5 text-xs focus:border-[var(--color-primary)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-[var(--color-text-muted)]">
                    Taux de TVA applicable
                  </label>
                  <select
                    value={vatRate}
                    onChange={(e) => setVatRate(Number(e.target.value))}
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 px-3 py-1.5 text-xs focus:border-[var(--color-primary)] focus:outline-none"
                  >
                    <option value={20}>TVA Standard (20%)</option>
                    <option value={10}>TVA Intermédiaire (10%)</option>
                    <option value={5.5}>TVA Réduite (5.5%)</option>
                    <option value={0}>Exonéré / Export (0%)</option>
                  </select>
                </div>
              </div>

              {/* Payment method pills */}
              <div className="mt-3">
                <label className="mb-1.5 block text-[11px] font-semibold text-[var(--color-text-muted)]">
                  Mode de règlement
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "CARTE_BANCAIRE", label: "Carte Bancaire / TPE", icon: CreditCard },
                    { id: "ESPECES", label: "Espèces", icon: Banknote },
                    { id: "VIREMENT_AUTO", label: "Virement / Crédit Auto", icon: Building2 },
                    { id: "MOBILE_PAY", label: "Apple Pay / Mobile", icon: Smartphone },
                  ].map((pm) => {
                    const PmIcon = pm.icon;
                    const active = paymentMethod === pm.id;
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setPaymentMethod(pm.id)}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-all ${
                          active
                            ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                            : "border-[var(--color-border)] bg-[var(--color-surface-muted)]/40 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                        }`}
                      >
                        <PmIcon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{pm.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Financial Summary */}
              <div className="mt-4 space-y-1.5 rounded-xl bg-[var(--color-surface-muted)]/60 p-3.5 text-xs">
                <div className="flex justify-between text-[var(--color-text-muted)]">
                  <span>Sous-total HT</span>
                  <span className="font-semibold text-[var(--color-text)]">
                    {subtotalHT.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                  </span>
                </div>
                {clampedDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Remise commerciale ({clampedDiscount}%)</span>
                    <span>
                      -{discountAmount.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-[var(--color-text-muted)]">
                  <span>TVA ({vatRate}%)</span>
                  <span>
                    {vatAmount.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-emerald-600 dark:text-emerald-400">
                  <span>Marge brute estimée HT</span>
                  <span className="font-semibold">
                    +{(totalMarginHT - discountAmount).toLocaleString("fr-FR", {
                      minimumFractionDigits: 2,
                    })}{" "}
                    €
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-2 text-sm font-extrabold">
                  <span>Total à encaisser TTC</span>
                  <span className="text-lg text-[var(--color-primary)]">
                    {totalTTC.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                  </span>
                </div>
              </div>

              <button
                type="button"
                disabled={cart.length === 0 || isSubmittingSale}
                onClick={handleCheckoutSale}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-3 text-sm font-bold text-[var(--color-primary-foreground)] shadow-md transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <CheckCircle2 className="h-4 w-4" />
                {isSubmittingSale
                  ? "Validation & Sortie de stock en cours..."
                  : "Valider la vente & Éditer Ticket / Facture"}
              </button>
            </div>

            {/* Generated Receipt / Dealership Invoice Card */}
            {lastReceipt && (
              <div className="rounded-2xl border-2 border-emerald-500/40 bg-[var(--color-surface)] p-5 shadow-md">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-500" />
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        Vente validée & Stock mis à jour
                      </span>
                      <h3 className="text-sm font-extrabold">
                        {lastReceipt.receiptNumber}
                      </h3>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-1.5 text-xs font-semibold hover:bg-[var(--color-border)]"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Imprimer Facture / Ticket
                  </button>
                </div>

                <div className="mt-3 space-y-1 text-xs text-[var(--color-text-muted)]">
                  <div>
                    <strong>Date :</strong> {lastReceipt.createdAt}
                  </div>
                  <div>
                    <strong>Client :</strong> {lastReceipt.customerName}{" "}
                    {lastReceipt.customerContact ? `(${lastReceipt.customerContact})` : ""}
                  </div>
                  <div>
                    <strong>Point de sortie :</strong> {lastReceipt.locationCode}
                  </div>
                  <div>
                    <strong>Règlement :</strong> {lastReceipt.paymentMethod}
                  </div>
                </div>

                <div className="mt-3 divide-y divide-[var(--color-border)] border-y border-[var(--color-border)] py-2 text-xs">
                  {lastReceipt.items.map((item) => (
                    <div key={item.cartItemId} className="py-1.5">
                      <div className="flex justify-between font-semibold">
                        <span>
                          {item.quantity}x {item.name}
                        </span>
                        <span>
                          {(item.unitPrice * item.quantity).toLocaleString("fr-FR", {
                            minimumFractionDigits: 2,
                          })}{" "}
                          €
                        </span>
                      </div>
                      {item.variantLabel && (
                        <div className="text-[11px] text-[var(--color-primary)]">
                          {item.variantLabel}
                        </div>
                      )}
                      <div className="text-[10px] text-[var(--color-text-muted)]">
                        Réf: {item.sku} • Garantie incluse : {item.warrantyMonths} mois
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between text-sm font-extrabold">
                  <span>TOTAL PAYÉ TTC (TVA {lastReceipt.vatRate}%)</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {lastReceipt.totalTTC.toLocaleString("fr-FR", {
                      minimumFractionDigits: 2,
                    })}{" "}
                    €
                  </span>
                </div>
              </div>
            )}

            {/* Recent Store Sales History */}
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
              <h3 className="text-sm font-bold">
                Dernières sorties magasin & ventes enregistrées
              </h3>
              <div className="mt-3 space-y-2">
                {recentIssues.length === 0 ? (
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Aucune vente récente enregistrée.
                  </p>
                ) : (
                  recentIssues.slice(0, 5).map((mv: any) => (
                    <div
                      key={mv.id}
                      className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/30 px-3 py-2 text-xs"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="font-mono font-bold text-[var(--color-primary)]">
                          {mv.reference || mv.referenceCode}
                        </div>
                        <div className="truncate text-[11px] text-[var(--color-text-muted)]">
                          {mv.notes || mv.reason || "Sortie de stock magasin"}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        {new Date(mv.createdAt).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
