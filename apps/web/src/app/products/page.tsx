"use client";

import React, { useState } from "react";
import {
  Package,
  Plus,
  Search,
  Download,
  Upload,
  Edit3,
  Layers,
  Scale,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  XOctagon,
  X,
  FileSpreadsheet,
  Filter,
  ArrowUpDown,
  LayoutGrid,
  List,
  Eye,
  Barcode,
  Image as ImageIcon,
  Truck,
  Tag,
  Box,
  Clock,
  Sparkles,
  Printer,
  Trash2,
} from "lucide-react";
import { formatCurrencyAmount, formatQuantity } from "@g-stock/ui";
import { AppShell } from "@/layouts/AppShell";
import { useAppSelector } from "@/store";
import {
  useGetProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useImportProductsCsvMutation,
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useGetUnitsQuery,
  useCreateUnitMutation,
  useCreateUnitConversionMutation,
  useGetWarehousesQuery,
  useCreateReceiptMutation,
} from "@/store/api";

type ActiveTab = "catalog" | "categories" | "units";
type ViewMode = "grid" | "table";

const PRESET_PRODUCT_IMAGES = [
  {
    label: "Voiture / Concession Auto",
    url: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=900&q=80",
  },
  {
    label: "Chaussures / Sneakers",
    url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
  },
  {
    label: "Habit / Prêt-à-porter",
    url: "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=80",
  },
  {
    label: "Scanner / Électronique",
    url: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80",
  },
  {
    label: "Bac / Entrepôt",
    url: "https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=600&q=80",
  },
  {
    label: "Colis / Conditionnement",
    url: "https://images.unsplash.com/photo-1607166452427-7e4477079cb9?auto=format&fit=crop&w=600&q=80",
  },
];

function BarcodeSvg({ code }: { code: string }) {
  const clean = (code || "3760123450018").replace(/[^A-Z0-9]/gi, "");
  const bars = Array.from({ length: 38 }, (_, i) => {
    const charCode = clean.charCodeAt(i % clean.length) || 48;
    const width = ((charCode + i * 7) % 3) + 1;
    return width;
  });

  let x = 8;
  return (
    <svg
      viewBox="0 0 220 64"
      className="w-full max-w-[220px] h-16 bg-white text-slate-900 rounded p-1.5 border border-border"
      aria-label={`Code-barres ${code}`}
    >
      {bars.map((w, idx) => {
        const currentX = x;
        x += w + (idx % 2 === 0 ? 1.5 : 2.5);
        if (currentX > 208) return null;
        return (
          <rect
            key={idx}
            x={currentX}
            y={4}
            width={w}
            height={40}
            fill="#0f172a"
          />
        );
      })}
      <text
        x="110"
        y="57"
        textAnchor="middle"
        fontSize="10"
        fontFamily="monospace"
        fontWeight="bold"
        fill="#0f172a"
      >
        {code || "EAN-NON-DEFINI"}
      </text>
    </svg>
  );
}

export default function ProductsPage() {
  const { token, activeOrganizationId } = useAppSelector((s) => s.ui);

  const [activeTab, setActiveTab] = useState<ActiveTab>("catalog");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Filtres, tri et pagination serveur
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [stockStatus, setStockStatus] = useState<"all" | "low" | "out" | "ok">("all");
  const [sortBy, setSortBy] = useState<"name" | "sku" | "costPrice" | "createdAt">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);

  // Requêtes RTK Query
  const {
    data: productsRes,
    isLoading: isLoadingProducts,
    error: productsError,
    refetch: refetchProducts,
  } = useGetProductsQuery({
    page,
    limit,
    search: search.trim() || undefined,
    categoryId: categoryId || undefined,
    stockStatus,
    sortBy,
    sortOrder,
  });

  const { data: categoriesRes, isLoading: isLoadingCategories } = useGetCategoriesQuery();
  const { data: unitsRes, isLoading: isLoadingUnits } = useGetUnitsQuery();
  const { data: warehousesRes } = useGetWarehousesQuery();

  // Mutations RTK Query
  const [createProduct, { isLoading: isCreatingProduct }] = useCreateProductMutation();
  const [updateProduct, { isLoading: isUpdatingProduct }] = useUpdateProductMutation();
  const [importProductsCsv, { isLoading: isImportingCsv }] = useImportProductsCsvMutation();
  const [createCategory, { isLoading: isCreatingCategory }] = useCreateCategoryMutation();
  const [createUnit, { isLoading: isCreatingUnit }] = useCreateUnitMutation();
  const [createUnitConversion, { isLoading: isCreatingConversion }] =
    useCreateUnitConversionMutation();
  const [createReceipt, { isLoading: isReceivingQuick }] = useCreateReceiptMutation();

  const products = productsRes?.data || [];
  const meta = productsRes?.meta || { page: 1, limit: 12, total: 0, totalPages: 1 };
  const categories = categoriesRes?.data || [];
  const units = unitsRes?.data?.units || [];
  const conversions = unitsRes?.data?.conversions || [];
  const warehouses = warehousesRes?.data || [];
  const defaultLocationId = warehouses[0]?.locations?.[0]?.id;

  // Notifications globales
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Tiroir / Modal Fiche Produit 360°
  const [detailProduct, setDetailProduct] = useState<any | null>(null);
  const [detailTab, setDetailTab] = useState<"overview" | "specs" | "locations">("overview");

  // Modal Produit (Création / Édition enrichie)
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [prodCategoryId, setProdCategoryId] = useState("");
  const [baseUnitId, setBaseUnitId] = useState("");
  const [costPrice, setCostPrice] = useState("0");
  const [salePrice, setSalePrice] = useState("0");
  const [reorderLevel, setReorderLevel] = useState("5");
  const [trackingMode, setTrackingMode] = useState<
    "STANDARD" | "LOT_EXPIRY" | "SERIAL" | "VARIANT"
  >("STANDARD");
  const [imageUrl, setImageUrl] = useState("");
  const [barcode, setBarcode] = useState("");
  const [brand, setBrand] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [dimensionsCm, setDimensionsCm] = useState("");
  const [leadTimeDays, setLeadTimeDays] = useState("3");
  const [specsList, setSpecsList] = useState<Array<{ key: string; value: string }>>([
    { key: "Conditionnement", value: "Unitaire" },
    { key: "Garantie", value: "2 ans" },
  ]);
  const [variantsList, setVariantsList] = useState<
    Array<{ sku: string; attr1Key: string; attr1Val: string; attr2Key: string; attr2Val: string }>
  >([]);
  const [isActive, setIsActive] = useState(true);

  // Modal Import CSV
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvContent, setCsvContent] = useState(
    "SKU;Nom;Categorie;Unite;PrixRevient;SeuilAlerte\nREF-DEMO-101;Clavier Mécanique Pro;CAT-EQUIP;UN;45.00;10"
  );
  const [importResult, setImportResult] = useState<any | null>(null);

  // Formulaire Catégorie
  const [catCode, setCatCode] = useState("");
  const [catName, setCatName] = useState("");

  // Formulaire Unité
  const [unitCode, setUnitCode] = useState("");
  const [unitName, setUnitName] = useState("");
  const [unitDimension, setUnitDimension] = useState<
    "COUNT" | "MASS" | "VOLUME" | "LENGTH" | "AREA"
  >("COUNT");
  const [unitPrecision, setUnitPrecision] = useState(2);

  // Formulaire Conversion d'unités
  const [fromUnitId, setFromUnitId] = useState("");
  const [toUnitId, setToUnitId] = useState("");
  const [conversionFactor, setConversionFactor] = useState("12");

  function generateRandomEan13() {
    const prefix = "3760123";
    const randomPart = Math.floor(100000 + Math.random() * 900000).toString();
    setBarcode(prefix + randomPart);
  }

  function applySectorPreset(sector: "AUTO" | "SHOES" | "HABIT" | "STANDARD") {
    if (sector === "AUTO") {
      const autoCat = categories.find((c: any) =>
        String(c.code || "").includes("AUTO")
      );
      setSku("AUTO-BERLINE-EV" + Math.floor(10 + Math.random() * 89));
      setName("Berline Électrique GT 220ch Autonomie 540km");
      setDescription(
        "Véhicule neuf garantie constructeur 5 ans. Suivi individuel par numéro de châssis (VIN) et finition."
      );
      if (autoCat) setProdCategoryId(autoCat.id);
      setTrackingMode("SERIAL");
      setCostPrice("26400");
      setSalePrice("32900");
      setReorderLevel("1");
      setImageUrl(PRESET_PRODUCT_IMAGES[0].url);
      setBrand("Apex Motors Europe");
      setSupplierName("Usine Assemblage Centrale");
      setWeightKg("1680");
      setDimensionsCm("468 x 185 x 144 cm");
      setLeadTimeDays("21");
      setSpecsList([
        { key: "Motorisation", value: "Électrique 220 ch (Batterie 77 kWh)" },
        { key: "Transmission", value: "Automatique Intégrale" },
        { key: "Garantie Constructeur", value: "60 mois / 150 000 km" },
      ]);
      setVariantsList([
        {
          sku: "VIN-VF1-GT220-001",
          attr1Key: "Couleur",
          attr1Val: "Gris Titane Métallisé",
          attr2Key: "Châssis VIN",
          attr2Val: "VF1-GT220-90112",
        },
        {
          sku: "VIN-VF1-GT220-002",
          attr1Key: "Couleur",
          attr1Val: "Blanc Nacré Perle",
          attr2Key: "Châssis VIN",
          attr2Val: "VF1-GT220-90113",
        },
      ]);
    } else if (sector === "SHOES") {
      const shoeCat = categories.find((c: any) =>
        String(c.code || "").includes("SHOE")
      );
      setSku("SHOE-URBAN-PRO" + Math.floor(10 + Math.random() * 89));
      setName("Baskets Cuir Premium & Semelle Confort");
      setDescription(
        "Chaussures ville & sport en cuir véritable avec grille de pointures EU (39 à 45) et coloris."
      );
      if (shoeCat) setProdCategoryId(shoeCat.id);
      setTrackingMode("VARIANT");
      setCostPrice("42");
      setSalePrice("119");
      setReorderLevel("8");
      setImageUrl(PRESET_PRODUCT_IMAGES[1].url);
      setBrand("StrideLab Footwear");
      setSupplierName("Atelier Cuir Porto");
      setWeightKg("0.72");
      setDimensionsCm("33 x 22 x 12 cm");
      setLeadTimeDays("6");
      setSpecsList([
        { key: "Matière extérieure", value: "Cuir pleine fleur & suède" },
        { key: "Semelle", value: "Caoutchouc cousu Strobel" },
        { key: "Grille Pointures", value: "EU 40, 41, 42, 43, 44" },
      ]);
      setVariantsList([
        { sku: "SHOE-P40-NOIR", attr1Key: "Pointure", attr1Val: "40", attr2Key: "Couleur", attr2Val: "Noir Onyx" },
        { sku: "SHOE-P41-NOIR", attr1Key: "Pointure", attr1Val: "41", attr2Key: "Couleur", attr2Val: "Noir Onyx" },
        { sku: "SHOE-P42-NOIR", attr1Key: "Pointure", attr1Val: "42", attr2Key: "Couleur", attr2Val: "Noir Onyx" },
        { sku: "SHOE-P43-BLANC", attr1Key: "Pointure", attr1Val: "43", attr2Key: "Couleur", attr2Val: "Blanc Craie" },
        { sku: "SHOE-P44-BLANC", attr1Key: "Pointure", attr1Val: "44", attr2Key: "Couleur", attr2Val: "Blanc Craie" },
      ]);
    } else if (sector === "HABIT") {
      const habitCat = categories.find((c: any) =>
        String(c.code || "").includes("HABIT")
      );
      setSku("HABIT-CHEMISE-LIN" + Math.floor(10 + Math.random() * 89));
      setName("Chemise Coupe Droite Lin & Coton Bio");
      setDescription(
        "Article prêt-à-porter décliné par taille (S, M, L, XL) et couleur saisonnière."
      );
      if (habitCat) setProdCategoryId(habitCat.id);
      setTrackingMode("VARIANT");
      setCostPrice("24");
      setSalePrice("69");
      setReorderLevel("10");
      setImageUrl(PRESET_PRODUCT_IMAGES[2].url);
      setBrand("Maison Nordique Studio");
      setSupplierName("Confection Textile Euro");
      setWeightKg("0.32");
      setDimensionsCm("36 x 28 x 3 cm");
      setLeadTimeDays("5");
      setSpecsList([
        { key: "Composition", value: "60% Lin Français, 40% Coton Bio" },
        { key: "Coupe", value: "Regular Fit Unisexe" },
        { key: "Entretien", value: "Lavage délicat 30°C" },
      ]);
      setVariantsList([
        { sku: "HAB-S-BLEU", attr1Key: "Taille", attr1Val: "S", attr2Key: "Couleur", attr2Val: "Bleu Ciel" },
        { sku: "HAB-M-BLEU", attr1Key: "Taille", attr1Val: "M", attr2Key: "Couleur", attr2Val: "Bleu Ciel" },
        { sku: "HAB-L-SABLE", attr1Key: "Taille", attr1Val: "L", attr2Key: "Couleur", attr2Val: "Beige Sable" },
        { sku: "HAB-XL-SABLE", attr1Key: "Taille", attr1Val: "XL", attr2Key: "Couleur", attr2Val: "Beige Sable" },
      ]);
    } else {
      setSku("REF-STD-" + Math.floor(100 + Math.random() * 899));
      setName("");
      setDescription("");
      setTrackingMode("STANDARD");
      setCostPrice("45");
      setSalePrice("79");
      setReorderLevel("5");
      setImageUrl(PRESET_PRODUCT_IMAGES[3].url);
      setBrand("G-Stock ProLine");
      setSupplierName("Distribution Centrale Europe");
      setWeightKg("1.20");
      setDimensionsCm("30 x 20 x 15 cm");
      setLeadTimeDays("3");
      setSpecsList([
        { key: "Norme", value: "CE / ISO 9001" },
        { key: "Conditionnement", value: "Boîte individuelle" },
      ]);
      setVariantsList([]);
    }
  }

  function openCreateProductModal() {
    setEditingProduct(null);
    setSku("");
    setName("");
    setDescription("");
    setProdCategoryId(categories[0]?.id || "");
    setBaseUnitId(units[0]?.id || "");
    setCostPrice("45");
    setSalePrice("79");
    setReorderLevel("5");
    setTrackingMode("STANDARD");
    setImageUrl(PRESET_PRODUCT_IMAGES[0].url);
    setBarcode("3760123" + Math.floor(100000 + Math.random() * 900000));
    setBrand("G-Stock ProLine");
    setSupplierName("Distribution Centrale Europe");
    setWeightKg("1.20");
    setDimensionsCm("30 x 20 x 15 cm");
    setLeadTimeDays("3");
    setSpecsList([
      { key: "Norme", value: "CE / ISO 9001" },
      { key: "Conditionnement", value: "Boîte individuelle" },
    ]);
    setVariantsList([]);
    setIsActive(true);
    setFeedback(null);
    setProductModalOpen(true);
  }

  function openEditProductModal(product: any) {
    setEditingProduct(product);
    setSku(product.sku || "");
    setName(product.name || "");
    setDescription(product.description || "");
    setProdCategoryId(product.categoryId || "");
    setBaseUnitId(product.baseUnitId || units[0]?.id || "");
    setCostPrice(String(product.costPrice ?? 0));
    setSalePrice(String(product.salePrice ?? 0));
    setReorderLevel(String(product.reorderLevel ?? 5));
    setTrackingMode(product.trackingMode || "STANDARD");
    setImageUrl(product.imageUrl || "");
    setBarcode(product.barcode || "");
    setBrand(product.brand || "");
    setSupplierName(product.supplierName || "");
    setWeightKg(product.weightKg !== null && product.weightKg !== undefined ? String(product.weightKg) : "");
    setDimensionsCm(product.dimensionsCm || "");
    setLeadTimeDays(String(product.leadTimeDays ?? 3));
    const entries = Object.entries(product.specsJson || product.specifications || {}).map(([k, v]) => ({
      key: k,
      value: String(v),
    }));
    setSpecsList(entries.length > 0 ? entries : [{ key: "Origine", value: "Union Européenne" }]);
    const existingVars = (product.variants || []).map((v: any) => {
      const attrEntries = Object.entries(v.attributes || {});
      return {
        sku: v.sku || "",
        attr1Key: attrEntries[0]?.[0] || "Taille/Pointure",
        attr1Val: String(attrEntries[0]?.[1] || ""),
        attr2Key: attrEntries[1]?.[0] || "Couleur/VIN",
        attr2Val: String(attrEntries[1]?.[1] || ""),
      };
    });
    setVariantsList(existingVars);
    setIsActive(product.isActive !== false);
    setFeedback(null);
    setProductModalOpen(true);
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1500000) {
      setFeedback({
        type: "error",
        message: "L'image ne doit pas dépasser 1,5 Mo.",
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === "string") {
        setImageUrl(ev.target.result);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);

    const specsJson: Record<string, string> = {};
    for (const item of specsList) {
      if (item.key.trim() && item.value.trim()) {
        specsJson[item.key.trim()] = item.value.trim();
      }
    }

    const formattedVariants = variantsList
      .filter((v) => v.sku.trim() && (v.attr1Val.trim() || v.attr2Val.trim()))
      .map((v) => {
        const attributes: Record<string, string> = {};
        if (v.attr1Key.trim() && v.attr1Val.trim()) {
          attributes[v.attr1Key.trim()] = v.attr1Val.trim();
        }
        if (v.attr2Key.trim() && v.attr2Val.trim()) {
          attributes[v.attr2Key.trim()] = v.attr2Val.trim();
        }
        return {
          sku: v.sku.trim().toUpperCase(),
          attributes,
        };
      });

    try {
      const payload = {
        sku: sku.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim() || null,
        categoryId: prodCategoryId || null,
        baseUnitId: baseUnitId || units[0]?.id,
        costPrice: Number(costPrice),
        salePrice: Number(salePrice),
        reorderLevel: Number(reorderLevel),
        trackingMode,
        imageUrl: imageUrl.trim() || null,
        barcode: barcode.trim() || null,
        brand: brand.trim() || null,
        supplierName: supplierName.trim() || null,
        weightKg: weightKg.trim() !== "" ? Number(weightKg) : null,
        dimensionsCm: dimensionsCm.trim() || null,
        leadTimeDays: Number(leadTimeDays) || 3,
        specsJson,
        variants: formattedVariants,
        isActive,
      };

      if (editingProduct) {
        const res = await updateProduct({ id: editingProduct.id, data: payload }).unwrap();
        if (detailProduct && detailProduct.id === editingProduct.id) {
          setDetailProduct({ ...detailProduct, ...payload, ...(res?.data || {}) });
        }
        setFeedback({
          type: "success",
          message: `La référence « ${payload.name} » (${payload.sku}) a été mise à jour avec ses détails, variantes et visuels.`,
        });
      } else {
        await createProduct(payload).unwrap();
        setFeedback({
          type: "success",
          message: `La référence « ${payload.name} » (${payload.sku}) a été ajoutée au catalogue.`,
        });
      }
      setProductModalOpen(false);
    } catch (err: any) {
      setFeedback({
        type: "error",
        message:
          err?.data?.error?.message ||
          "Une erreur est survenue lors de l'enregistrement du produit.",
      });
    }
  }

  async function handleQuickRestockProduct(prod: any, qty = 10) {
    setFeedback(null);
    if (!defaultLocationId) {
      setFeedback({
        type: "error",
        message: "Aucun emplacement disponible pour réceptionner ce produit.",
      });
      return;
    }
    try {
      await createReceipt({
        reference: `RECEP-${prod.sku}-${Date.now().toString().slice(-4)}`,
        idempotencyKey: `idem-prod-${prod.id}-${Date.now()}`,
        notes: `Réception rapide depuis la fiche produit 360° (${prod.name})`,
        lines: [
          {
            productId: prod.id,
            toLocationId: defaultLocationId,
            quantity: qty,
            unitCost: Number(prod.costPrice) || undefined,
          },
        ],
      }).unwrap();
      setFeedback({
        type: "success",
        message: `+${qty} ${prod.baseUnit?.code || "UN"} réceptionnés pour « ${prod.name} ».`,
      });
      refetchProducts();
      if (detailProduct?.id === prod.id) {
        setDetailProduct({
          ...detailProduct,
          available: Number(detailProduct.available ?? 0) + qty,
          totalOnHand: Number(detailProduct.totalOnHand ?? 0) + qty,
        });
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.data?.error?.message || "Erreur lors de la réception rapide.",
      });
    }
  }

  async function handleExportCsv() {
    setFeedback(null);
    try {
      const apiBase =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
      const resolvedToken =
        token ||
        (typeof window !== "undefined" ? localStorage.getItem("gstock_token") : "");
      const resolvedOrgId =
        activeOrganizationId ||
        (typeof window !== "undefined" ? localStorage.getItem("gstock_org_id") : "");

      let csvText = "";
      try {
        const res = await fetch(`${apiBase}/products/export/csv`, {
          method: "GET",
          headers: {
            ...(resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {}),
            ...(resolvedOrgId ? { "X-Organization-Id": resolvedOrgId } : {}),
          },
        });
        if (!res.ok) {
          throw new Error("Impossible d'exporter le catalogue CSV.");
        }
        csvText = await res.text();
      } catch {
        const header =
          "SKU;CodeBarres;Nom;Marque;Fournisseur;Categorie;Unite;PrixRevient;PrixVente;SeuilAlerte;StockActuel";
        const rows = products.map((p: any) =>
          [
            p.sku,
            p.barcode || "",
            `"${(p.name || "").replace(/"/g, '""')}"`,
            p.brand || "",
            p.supplierName || "",
            p.category?.code || "",
            p.baseUnit?.code || "UN",
            p.costPrice,
            p.salePrice ?? 0,
            p.reorderLevel,
            p.totalOnHand ?? 0,
          ].join(";")
        );
        csvText = [header, ...rows].join("\n");
      }

      const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gstock-catalogue-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setFeedback({
        type: "success",
        message: "Export CSV du catalogue téléchargé avec succès.",
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || "Erreur lors du téléchargement du fichier CSV.",
      });
    }
  }

  async function handleImportCsv(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    setImportResult(null);
    try {
      const res = await importProductsCsv({ csvContent }).unwrap();
      setImportResult(res.data);
      setFeedback({
        type: "success",
        message: `${res.data.importedCount} référence(s) importée(s) ou mise(s) à jour avec succès.`,
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        message:
          err?.data?.error?.message || "Erreur lors de l'importation du fichier CSV.",
      });
    }
  }

  function handleCsvFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === "string") {
        setCsvContent(event.target.result);
      }
    };
    reader.readAsText(file);
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    try {
      await createCategory({
        code: catCode.trim().toUpperCase(),
        name: catName.trim(),
      }).unwrap();
      setCatCode("");
      setCatName("");
      setFeedback({
        type: "success",
        message: "Nouvelle catégorie créée avec succès.",
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        message:
          err?.data?.error?.message || "Impossible de créer la catégorie.",
      });
    }
  }

  async function handleCreateUnit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    try {
      await createUnit({
        code: unitCode.trim().toUpperCase(),
        name: unitName.trim(),
        dimension: unitDimension,
        precision: Number(unitPrecision),
      }).unwrap();
      setUnitCode("");
      setUnitName("");
      setFeedback({
        type: "success",
        message: "Unité de mesure ajoutée avec succès.",
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        message:
          err?.data?.error?.message || "Impossible d'ajouter l'unité de mesure.",
      });
    }
  }

  async function handleCreateConversion(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    try {
      await createUnitConversion({
        fromUnitId,
        toUnitId,
        factor: Number(conversionFactor),
      }).unwrap();
      setFeedback({
        type: "success",
        message: "Règle de conversion enregistrée avec succès.",
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        message:
          err?.data?.error?.message ||
          "Impossible d'enregistrer la conversion entre ces unités.",
      });
    }
  }

  function renderMarginBadge(cost: number, sale: number) {
    if (!sale || sale <= 0) return null;
    const marginVal = sale - cost;
    const marginPct = Math.round((marginVal / sale) * 100);
    return (
      <span
        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
          marginPct >= 30
            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
            : marginPct > 0
              ? "bg-sky-500/15 text-sky-700 dark:text-sky-300"
              : "bg-red-500/15 text-danger"
        }`}
      >
        Marge {marginPct}% ({formatCurrencyAmount(marginVal, "EUR")})
      </span>
    );
  }

  return (
    <AppShell
      title="Catalogue Produits Visuel & Fiches 360°"
      subtitle="Gérez vos références avec photos HD, codes-barres EAN-13, prix d'achat/vente, marges brutes, caractéristiques techniques et unités."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3 py-2 rounded-control border border-border bg-surface hover:bg-surface-muted text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Download size={14} />
            <span>Exporter CSV</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setImportResult(null);
              setCsvModalOpen(true);
            }}
            className="px-3 py-2 rounded-control border border-border bg-surface hover:bg-surface-muted text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Upload size={14} />
            <span>Importer CSV</span>
          </button>
          <button
            type="button"
            onClick={openCreateProductModal}
            className="px-3.5 py-2 rounded-control bg-primary text-primary-foreground text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm hover:opacity-95"
          >
            <Plus size={15} />
            <span>Nouveau produit</span>
          </button>
        </div>
      }
    >
      {/* Message de retour global */}
      {feedback && (
        <div
          className={`p-3.5 rounded-control border text-xs font-medium flex items-center justify-between animate-fade-up ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
              : "bg-red-500/10 border-red-500/30 text-danger"
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-1 hover:opacity-75"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Navigation par onglets + Sélecteur Vue Grille / Vue Tableau */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("catalog")}
            className={`px-4 py-2 rounded-control text-xs font-semibold inline-flex items-center gap-2 transition-colors ${
              activeTab === "catalog"
                ? "bg-primary text-primary-foreground"
                : "bg-surface border border-border text-foreground hover:bg-surface-muted"
            }`}
          >
            <Package size={15} />
            <span>Catalogue Produits ({meta.total})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("categories")}
            className={`px-4 py-2 rounded-control text-xs font-semibold inline-flex items-center gap-2 transition-colors ${
              activeTab === "categories"
                ? "bg-primary text-primary-foreground"
                : "bg-surface border border-border text-foreground hover:bg-surface-muted"
            }`}
          >
            <Layers size={15} />
            <span>Catégories ({categories.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("units")}
            className={`px-4 py-2 rounded-control text-xs font-semibold inline-flex items-center gap-2 transition-colors ${
              activeTab === "units"
                ? "bg-primary text-primary-foreground"
                : "bg-surface border border-border text-foreground hover:bg-surface-muted"
            }`}
          >
            <Scale size={15} />
            <span>Unités &amp; Conversions ({units.length})</span>
          </button>
        </div>

        {activeTab === "catalog" && (
          <div className="flex items-center border border-border rounded-control p-0.5 bg-surface text-xs">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`px-2.5 py-1.5 rounded font-semibold inline-flex items-center gap-1.5 transition-colors ${
                viewMode === "grid"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <LayoutGrid size={14} />
              <span>Galerie Cartes</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-2.5 py-1.5 rounded font-semibold inline-flex items-center gap-1.5 transition-colors ${
                viewMode === "table"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <List size={14} />
              <span>Tableau Dense</span>
            </button>
          </div>
        )}
      </div>

      {/* ONGLET 1 : CATALOGUE PRODUITS */}
      {activeTab === "catalog" && (
        <div className="space-y-4">
          {/* Barre de filtres et recherche */}
          <div className="gstock-card p-4 grid sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
            <div className="lg:col-span-4">
              <label className="block text-[11px] font-semibold uppercase text-muted mb-1">
                Recherche (Nom, SKU, Code-barres EAN, Marque)
              </label>
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Ex: SCAN-PRO-2D, 3760123450018, ZebraTech..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-control border border-border bg-background"
                />
              </div>
            </div>

            <div className="lg:col-span-3">
              <label className="block text-[11px] font-semibold uppercase text-muted mb-1">
                <Filter size={11} className="inline mr-1" />
                Catégorie
              </label>
              <select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
              >
                <option value="">Toutes les catégories</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="block text-[11px] font-semibold uppercase text-muted mb-1">
                État du stock
              </label>
              <select
                value={stockStatus}
                onChange={(e) => {
                  setStockStatus(e.target.value as any);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
              >
                <option value="all">Tous les états</option>
                <option value="ok">En stock normal</option>
                <option value="low">Sous le seuil d&apos;alerte</option>
                <option value="out">En rupture (≤ 0)</option>
              </select>
            </div>

            <div className="lg:col-span-3">
              <label className="block text-[11px] font-semibold uppercase text-muted mb-1">
                <ArrowUpDown size={11} className="inline mr-1" />
                Trier par
              </label>
              <div className="flex gap-1.5">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="flex-1 px-2.5 py-2 text-xs rounded-control border border-border bg-background"
                >
                  <option value="createdAt">Date de création</option>
                  <option value="name">Nom du produit</option>
                  <option value="sku">Code SKU</option>
                  <option value="costPrice">Prix de revient</option>
                </select>
                <button
                  type="button"
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  className="px-2.5 py-2 text-xs font-semibold rounded-control border border-border bg-background hover:bg-surface-muted"
                  title="Inverser l'ordre de tri"
                >
                  {sortOrder === "asc" ? "↑ Asc" : "↓ Desc"}
                </button>
              </div>
            </div>
          </div>

          {isLoadingProducts ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="gstock-card h-72 animate-pulse bg-surface-muted" />
              ))}
            </div>
          ) : productsError ? (
            <div className="gstock-card p-8 text-center text-xs text-danger">
              Impossible de charger le catalogue produits.
            </div>
          ) : products.length === 0 ? (
            <div className="gstock-card p-10 text-center space-y-3">
              <div className="text-sm font-semibold">
                Aucune référence produit ne correspond à vos critères
              </div>
              <p className="text-xs text-muted">
                Ajoutez un nouveau produit avec photo et caractéristiques ou modifiez vos filtres.
              </p>
              <button
                type="button"
                onClick={openCreateProductModal}
                className="px-4 py-2 rounded-control bg-primary text-primary-foreground text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Plus size={14} />
                <span>Créer une référence</span>
              </button>
            </div>
          ) : viewMode === "grid" ? (
            /* VUE GALERIE CARTES VISUELLES AVEC IMAGES ET DÉTAILS */
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {products.map((p: any) => {
                const state = p.stockState;
                const sale = Number(p.salePrice || 0);
                const cost = Number(p.costPrice || 0);
                const specEntries = Object.entries(p.specsJson || {}).slice(0, 2);

                return (
                  <div
                    key={p.id}
                    className="gstock-card gstock-card-interactive overflow-hidden flex flex-col justify-between group"
                  >
                    <div>
                      {/* Image du produit + Badges superposés */}
                      <div
                        onClick={() => {
                          setDetailProduct(p);
                          setDetailTab("overview");
                        }}
                        className="relative h-44 w-full bg-surface-muted overflow-hidden cursor-pointer border-b border-border"
                      >
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/15 via-surface-muted to-primary/5 text-primary">
                            <Package size={40} className="opacity-75 mb-1" />
                            <span className="text-[11px] font-mono font-bold">{p.sku}</span>
                          </div>
                        )}

                        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-black/75 text-white font-mono text-[10px] font-bold backdrop-blur-xs">
                            {p.sku}
                          </span>
                          {p.trackingMode && p.trackingMode !== "STANDARD" && (
                            <span className="px-2 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-bold">
                              {p.trackingMode === "SERIAL"
                                ? "SÉRIE"
                                : p.trackingMode === "LOT_EXPIRY"
                                  ? "LOT / FEFO"
                                  : p.trackingMode}
                            </span>
                          )}
                        </div>

                        <div className="absolute top-2.5 right-2.5">
                          {state === "out" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-600 text-white shadow-xs">
                              <XOctagon size={11} /> Rupture ({formatQuantity(p.available ?? 0)})
                            </span>
                          ) : state === "low" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-xs">
                              <AlertTriangle size={11} /> Seuil bas ({formatQuantity(p.available ?? 0)})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-xs">
                              <CheckCircle2 size={11} /> {formatQuantity(p.available ?? 0)}{" "}
                              {p.baseUnit?.code || "UN"}
                            </span>
                          )}
                        </div>

                        {p.brand && (
                          <div className="absolute bottom-2 left-2.5 px-2 py-0.5 rounded bg-surface/90 backdrop-blur-xs text-[10px] font-bold border border-border">
                            {p.brand}
                          </div>
                        )}
                      </div>

                      {/* Corps de la carte produit */}
                      <div className="p-4 space-y-3">
                        <div>
                          <div className="flex items-center justify-between gap-2 text-[11px] text-muted mb-0.5">
                            <span>{p.category?.name || "Non catégorisé"}</span>
                            {p.barcode && (
                              <span className="font-mono inline-flex items-center gap-1">
                                <Barcode size={12} /> {p.barcode}
                              </span>
                            )}
                          </div>
                          <h3
                            onClick={() => {
                              setDetailProduct(p);
                              setDetailTab("overview");
                            }}
                            className="font-bold text-sm leading-snug cursor-pointer hover:text-primary transition-colors line-clamp-1"
                          >
                            {p.name}
                          </h3>
                          {p.description && (
                            <p className="text-xs text-muted line-clamp-2 mt-1">
                              {p.description}
                            </p>
                          )}
                        </div>

                        {/* Prix d'achat, Prix de vente & Marge */}
                        <div className="p-2.5 rounded-control bg-surface-muted/60 border border-border/80 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <div>
                              <span className="text-[10px] text-muted block">Prix Revient</span>
                              <span className="font-bold font-mono">
                                {formatCurrencyAmount(cost, "EUR")}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-muted block">Prix Vente HT</span>
                              <span className="font-extrabold font-mono text-primary">
                                {sale > 0 ? formatCurrencyAmount(sale, "EUR") : "—"}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-border/60">
                            {renderMarginBadge(cost, sale) || (
                              <span className="text-[10px] text-muted">Prix de vente non défini</span>
                            )}
                            <span className="text-[10px] text-muted font-mono">
                              Seuil : {formatQuantity(p.reorderLevel)} {p.baseUnit?.code || "UN"}
                            </span>
                          </div>
                        </div>

                        {/* Aperçu des spécifications techniques */}
                        {specEntries.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {specEntries.map(([k, v]) => (
                              <span
                                key={k}
                                className="px-2 py-0.5 rounded bg-surface-muted text-[10px] text-muted border border-border/60 truncate max-w-full"
                              >
                                <strong>{k}:</strong> {String(v)}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Grille de Variantes (Pointures / Tailles / Couleurs / Châssis VIN) */}
                        {(p.variants || []).length > 0 && (
                          <div className="pt-1 border-t border-border/50 space-y-1">
                            <div className="text-[10px] font-bold text-primary flex items-center justify-between">
                              <span>
                                Déclinaisons ({p.variants.length} variantes / VIN / tailles)
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {p.variants.slice(0, 4).map((v: any) => (
                                <span
                                  key={v.sku}
                                  className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-semibold"
                                >
                                  {Object.values(v.attributes || {}).join(" • ") || v.sku}
                                </span>
                              ))}
                              {p.variants.length > 4 && (
                                <span className="px-1.5 py-0.5 rounded bg-surface-muted text-[10px] text-muted font-semibold">
                                  +{p.variants.length - 4}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions de la carte produit */}
                    <div className="px-4 py-3 border-t border-border bg-surface-muted/20 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDetailProduct(p);
                          setDetailTab("overview");
                        }}
                        className="flex-1 py-1.5 px-2.5 rounded-control bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Eye size={13} />
                        <span>Fiche 360° &amp; Détails</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditProductModal(p)}
                        title="Modifier la référence"
                        className="p-1.5 rounded-control border border-border hover:bg-surface-muted text-muted hover:text-foreground transition-colors"
                      >
                        <Edit3 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* VUE TABLEAU DENSE */
            <div className="gstock-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs gstock-table">
                  <thead className="bg-surface-muted text-muted uppercase text-[11px] border-b border-border">
                    <tr>
                      <th>Produit &amp; Visuel</th>
                      <th>SKU / EAN-13</th>
                      <th>Catégorie &amp; Marque</th>
                      <th className="text-right">Prix Revient</th>
                      <th className="text-right">Prix Vente &amp; Marge</th>
                      <th className="text-right">Disponible</th>
                      <th>Statut</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {products.map((p: any) => {
                      const state = p.stockState;
                      const cost = Number(p.costPrice ?? 0);
                      const sale = Number(p.salePrice ?? 0);
                      return (
                        <tr key={p.id} className="hover:bg-surface-muted/40 transition-colors">
                          <td>
                            <div className="flex items-center gap-3">
                              {p.imageUrl ? (
                                <img
                                  src={p.imageUrl}
                                  alt={p.name}
                                  className="w-10 h-10 rounded object-cover border border-border shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                                  {String(p.sku || "P").slice(0, 2)}
                                </div>
                              )}
                              <div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDetailProduct(p);
                                    setDetailTab("overview");
                                  }}
                                  className="font-bold text-left hover:text-primary transition-colors"
                                >
                                  {p.name}
                                </button>
                                {p.supplierName && (
                                  <div className="text-[11px] text-muted">
                                    Fournisseur : {p.supplierName}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="font-mono">
                            <div className="font-bold text-primary">{p.sku}</div>
                            {p.barcode && (
                              <div className="text-[10px] text-muted">{p.barcode}</div>
                            )}
                          </td>
                          <td>
                            <div>{p.category?.name || "Non catégorisé"}</div>
                            {p.brand && (
                              <div className="text-[10px] font-semibold text-muted">
                                {p.brand}
                              </div>
                            )}
                          </td>
                          <td className="text-right font-mono font-medium">
                            {formatCurrencyAmount(cost, "EUR")}
                          </td>
                          <td className="text-right">
                            <div className="font-mono font-bold">
                              {sale > 0 ? formatCurrencyAmount(sale, "EUR") : "—"}
                            </div>
                            <div className="mt-0.5">{renderMarginBadge(cost, sale)}</div>
                          </td>
                          <td className="text-right font-mono font-bold">
                            {formatQuantity(p.available ?? p.totalOnHand ?? 0)}{" "}
                            <span className="text-[10px] font-normal text-muted">
                              {p.baseUnit?.code}
                            </span>
                          </td>
                          <td>
                            {state === "out" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-danger">
                                <XOctagon size={11} /> Rupture
                              </span>
                            ) : state === "low" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600">
                                <AlertTriangle size={11} /> Seuil bas
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                                <CheckCircle2 size={11} /> En stock
                              </span>
                            )}
                          </td>
                          <td className="text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setDetailProduct(p);
                                  setDetailTab("overview");
                                }}
                                className="px-2.5 py-1 rounded border border-border hover:bg-surface-muted text-xs font-medium inline-flex items-center gap-1"
                              >
                                <Eye size={12} />
                                <span>Détails</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditProductModal(p)}
                                className="px-2.5 py-1 rounded border border-border hover:bg-surface-muted text-xs font-medium inline-flex items-center gap-1"
                              >
                                <Edit3 size={12} />
                                <span>Éditer</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination serveur */}
          <div className="gstock-card p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
            <div className="text-muted">
              Page <strong>{meta.page}</strong> sur <strong>{meta.totalPages}</strong> — Total :{" "}
              <strong>{meta.total}</strong> référence(s)
            </div>
            <div className="flex items-center gap-2">
              <select
                aria-label="Nombre de lignes par page"
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 rounded border border-border bg-background"
              >
                <option value={6}>6 / page</option>
                <option value={12}>12 / page</option>
                <option value={25}>25 / page</option>
              </select>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded border border-border bg-background disabled:opacity-40"
              >
                Précédent
              </button>
              <button
                type="button"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded border border-border bg-background disabled:opacity-40"
              >
                Suivant
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ONGLET 2 : CATÉGORIES */}
      {activeTab === "categories" && (
        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 gstock-card p-5 space-y-4 h-fit">
            <div>
              <h2 className="font-bold text-base">Nouvelle catégorie</h2>
              <p className="text-xs text-muted">
                Structurez votre catalogue par famille d&apos;articles.
              </p>
            </div>
            <form onSubmit={handleCreateCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Code catégorie</label>
                <input
                  type="text"
                  required
                  value={catCode}
                  onChange={(e) => setCatCode(e.target.value)}
                  placeholder="Ex: ELEC-PRO"
                  className="w-full px-3 py-2 text-xs font-mono uppercase rounded-control border border-border bg-background"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Libellé</label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="Ex: Matériel Électrique Professionnel"
                  className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
                />
              </div>
              <button
                type="submit"
                disabled={isCreatingCategory}
                className="w-full py-2 rounded-control bg-primary text-primary-foreground text-xs font-semibold"
              >
                {isCreatingCategory ? "Création..." : "Ajouter la catégorie"}
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 gstock-card overflow-hidden">
            <div className="p-4 border-b border-border">
              <h2 className="font-bold text-base">Catégories de l&apos;organisation</h2>
            </div>
            {isLoadingCategories ? (
              <div className="p-6 text-center text-xs text-muted">Chargement...</div>
            ) : categories.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted">
                Aucune catégorie créée pour le moment.
              </div>
            ) : (
              <table className="w-full text-left text-xs gstock-table">
                <thead className="bg-surface-muted text-muted uppercase text-[11px]">
                  <tr>
                    <th>Code</th>
                    <th>Nom</th>
                    <th className="text-right">Produits rattachés</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {categories.map((cat: any) => (
                    <tr key={cat.id}>
                      <td className="font-mono font-semibold text-primary">{cat.code}</td>
                      <td className="font-medium">{cat.name}</td>
                      <td className="text-right font-mono font-bold">
                        {cat._count?.products ?? 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ONGLET 3 : UNITÉS & CONVERSIONS */}
      {activeTab === "units" && (
        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-6">
            <div className="gstock-card p-5 space-y-4">
              <div>
                <h2 className="font-bold text-base">Ajouter une unité personnalisée</h2>
                <p className="text-xs text-muted">
                  Définissez vos propres conditionnements (palette, fût, rouleau, etc.).
                </p>
              </div>
              <form onSubmit={handleCreateUnit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Code unité</label>
                    <input
                      type="text"
                      required
                      value={unitCode}
                      onChange={(e) => setUnitCode(e.target.value)}
                      placeholder="Ex: PAL"
                      className="w-full px-3 py-2 text-xs font-mono uppercase rounded-control border border-border bg-background"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Dimension</label>
                    <select
                      value={unitDimension}
                      onChange={(e) => setUnitDimension(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
                    >
                      <option value="COUNT">Comptage (COUNT)</option>
                      <option value="MASS">Masse (MASS)</option>
                      <option value="VOLUME">Volume (VOLUME)</option>
                      <option value="LENGTH">Longueur (LENGTH)</option>
                      <option value="AREA">Surface (AREA)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold mb-1">Nom complet</label>
                    <input
                      type="text"
                      required
                      value={unitName}
                      onChange={(e) => setUnitName(e.target.value)}
                      placeholder="Ex: Palette Europe"
                      className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Décimales</label>
                    <input
                      type="number"
                      min={0}
                      max={4}
                      value={unitPrecision}
                      onChange={(e) => setUnitPrecision(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isCreatingUnit}
                  className="w-full py-2 rounded-control bg-primary text-primary-foreground text-xs font-semibold"
                >
                  {isCreatingUnit ? "Ajout..." : "Créer l'unité"}
                </button>
              </form>
            </div>

            <div className="gstock-card p-5 space-y-4">
              <div>
                <h2 className="font-bold text-base flex items-center gap-2">
                  <ArrowRightLeft size={16} className="text-primary" />
                  <span>Nouvelle règle de conversion</span>
                </h2>
                <p className="text-xs text-muted">
                  Exemple : 1 Carton (BOX) = 12 Unités (UN).
                </p>
              </div>
              <form onSubmit={handleCreateConversion} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      Unité source (1x)
                    </label>
                    <select
                      required
                      value={fromUnitId}
                      onChange={(e) => setFromUnitId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
                    >
                      <option value="">Sélectionner...</option>
                      {units.map((u: any) => (
                        <option key={u.id} value={u.id}>
                          {u.code} — {u.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Unité cible</label>
                    <select
                      required
                      value={toUnitId}
                      onChange={(e) => setToUnitId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
                    >
                      <option value="">Sélectionner...</option>
                      {units.map((u: any) => (
                        <option key={u.id} value={u.id}>
                          {u.code} — {u.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Facteur multiplicateur
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    required
                    value={conversionFactor}
                    onChange={(e) => setConversionFactor(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-control border border-border bg-background"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isCreatingConversion}
                  className="w-full py-2 rounded-control bg-primary text-primary-foreground text-xs font-semibold"
                >
                  {isCreatingConversion ? "Enregistrement..." : "Enregistrer la conversion"}
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <div className="gstock-card overflow-hidden">
              <div className="p-4 border-b border-border">
                <h2 className="font-bold text-base">Unités de mesure actives</h2>
              </div>
              {isLoadingUnits ? (
                <div className="p-6 text-center text-xs text-muted">Chargement...</div>
              ) : (
                <table className="w-full text-left text-xs gstock-table">
                  <thead className="bg-surface-muted text-muted uppercase text-[11px]">
                    <tr>
                      <th>Code</th>
                      <th>Libellé</th>
                      <th>Dimension</th>
                      <th>Précision</th>
                      <th>Portée</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {units.map((u: any) => (
                      <tr key={u.id}>
                        <td className="font-mono font-bold text-primary">{u.code}</td>
                        <td className="font-medium">{u.name}</td>
                        <td className="font-mono text-[11px]">{u.dimension}</td>
                        <td>{u.precision} déc.</td>
                        <td>
                          <span className="px-2 py-0.5 rounded bg-surface-muted text-[10px] font-semibold">
                            {u.organizationId ? "Personnalisée" : "Standard G-Stock"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="gstock-card overflow-hidden">
              <div className="p-4 border-b border-border">
                <h2 className="font-bold text-base">Table des conversions configurées</h2>
              </div>
              {conversions.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted">
                  Aucune règle de conversion personnalisée définie.
                </div>
              ) : (
                <table className="w-full text-left text-xs gstock-table">
                  <thead className="bg-surface-muted text-muted uppercase text-[11px]">
                    <tr>
                      <th>Unité Source</th>
                      <th>Équivalence</th>
                      <th>Unité Cible</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {conversions.map((c: any) => (
                      <tr key={c.id}>
                        <td className="font-semibold">
                          1 {c.fromUnit?.name} ({c.fromUnit?.code})
                        </td>
                        <td className="font-mono font-bold text-primary">
                          = {Number(c.factor)}
                        </td>
                        <td className="font-semibold">
                          {c.toUnit?.name} ({c.toUnit?.code})
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TIROIR / MODAL FICHE PRODUIT 360° (Images, Code-Barres EAN, Marges, Specs, Stock par zone) */}
      {detailProduct && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs"
          onClick={() => setDetailProduct(null)}
        >
          <div
            className="w-full max-w-2xl bg-surface h-full overflow-y-auto border-l border-border shadow-2xl flex flex-col justify-between animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              {/* En-tête image haute résolution */}
              <div className="relative h-60 w-full bg-surface-muted border-b border-border overflow-hidden">
                {detailProduct.imageUrl ? (
                  <img
                    src={detailProduct.imageUrl}
                    alt={detailProduct.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/20 to-surface-muted text-primary">
                    <Package size={56} />
                    <span className="font-mono text-sm font-bold mt-2">
                      {detailProduct.sku}
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setDetailProduct(null)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                >
                  <X size={18} />
                </button>

                <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2">
                  <div className="px-3 py-1.5 rounded-control bg-black/75 text-white backdrop-blur-xs">
                    <div className="text-[10px] font-mono uppercase opacity-80">
                      SKU: {detailProduct.sku} • {detailProduct.category?.name || "Catalogue"}
                    </div>
                    <h2 className="text-base font-extrabold leading-tight">
                      {detailProduct.name}
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => openEditProductModal(detailProduct)}
                    className="px-3 py-1.5 rounded-control bg-surface text-foreground text-xs font-bold shadow-md inline-flex items-center gap-1.5 hover:bg-surface-muted"
                  >
                    <Edit3 size={13} />
                    <span>Modifier</span>
                  </button>
                </div>
              </div>

              {/* Navigation interne de la fiche produit */}
              <div className="px-6 pt-4 border-b border-border flex gap-4 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setDetailTab("overview")}
                  className={`pb-2.5 border-b-2 transition-colors ${
                    detailTab === "overview"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  Vue 360° &amp; Tarification
                </button>
                <button
                  type="button"
                  onClick={() => setDetailTab("specs")}
                  className={`pb-2.5 border-b-2 transition-colors ${
                    detailTab === "specs"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  Spécifications &amp; Logistique
                </button>
                <button
                  type="button"
                  onClick={() => setDetailTab("locations")}
                  className={`pb-2.5 border-b-2 transition-colors ${
                    detailTab === "locations"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  Stock par Emplacement ({detailProduct.inventoryBalances?.length || 0})
                </button>
              </div>

              {/* Contenu de la Fiche 360° */}
              <div className="p-6 space-y-6">
                {detailTab === "overview" && (
                  <>
                    {detailProduct.description && (
                      <div className="p-3.5 rounded-control bg-surface-muted/50 border border-border text-xs leading-relaxed">
                        {detailProduct.description}
                      </div>
                    )}

                    {/* Grille Financière & Stock */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="gstock-card p-3.5">
                        <div className="text-[10px] text-muted uppercase font-bold">
                          Stock Disponible
                        </div>
                        <div className="text-xl font-extrabold text-primary mt-0.5">
                          {formatQuantity(detailProduct.available ?? 0)}{" "}
                          <span className="text-xs font-normal">
                            {detailProduct.baseUnit?.code || "UN"}
                          </span>
                        </div>
                        <div className="text-[10px] text-muted">
                          Seuil alerte : {detailProduct.reorderLevel}
                        </div>
                      </div>

                      <div className="gstock-card p-3.5">
                        <div className="text-[10px] text-muted uppercase font-bold">
                          Prix de Revient
                        </div>
                        <div className="text-lg font-extrabold font-mono mt-0.5">
                          {formatCurrencyAmount(detailProduct.costPrice ?? 0, "EUR")}
                        </div>
                        <div className="text-[10px] text-muted">Coût moyen pondéré</div>
                      </div>

                      <div className="gstock-card p-3.5">
                        <div className="text-[10px] text-muted uppercase font-bold">
                          Prix de Vente HT
                        </div>
                        <div className="text-lg font-extrabold font-mono text-emerald-600 mt-0.5">
                          {Number(detailProduct.salePrice) > 0
                            ? formatCurrencyAmount(detailProduct.salePrice, "EUR")
                            : "Non défini"}
                        </div>
                        <div className="mt-0.5">
                          {renderMarginBadge(
                            Number(detailProduct.costPrice || 0),
                            Number(detailProduct.salePrice || 0)
                          )}
                        </div>
                      </div>

                      <div className="gstock-card p-3.5">
                        <div className="text-[10px] text-muted uppercase font-bold">
                          Valeur Immobilisée
                        </div>
                        <div className="text-lg font-extrabold font-mono mt-0.5">
                          {formatCurrencyAmount(
                            Number(detailProduct.totalOnHand ?? detailProduct.available ?? 0) *
                              Number(detailProduct.costPrice ?? 0),
                            "EUR"
                          )}
                        </div>
                        <div className="text-[10px] text-muted">Actif en stock</div>
                      </div>
                    </div>

                    {/* Étiquette Code-barres EAN-13 & Identification */}
                    <div className="gstock-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface-muted/30">
                      <div className="space-y-1.5 text-xs">
                        <div className="font-bold text-sm flex items-center gap-1.5">
                          <Barcode size={16} className="text-primary" />
                          <span>Identification &amp; Étiquette Logistique GS1 / EAN-13</span>
                        </div>
                        <div className="text-muted">
                          Marque :{" "}
                          <strong className="text-foreground">
                            {detailProduct.brand || "Standard"}
                          </strong>{" "}
                          • Fournisseur :{" "}
                          <strong className="text-foreground">
                            {detailProduct.supplierName || "Non renseigné"}
                          </strong>
                        </div>
                        <button
                          type="button"
                          onClick={() => typeof window !== "undefined" && window.print()}
                          className="mt-1 px-3 py-1 rounded border border-border bg-surface hover:bg-surface-muted text-[11px] font-semibold inline-flex items-center gap-1.5"
                        >
                          <Printer size={12} />
                          <span>Imprimer l&apos;étiquette produit</span>
                        </button>
                      </div>

                      <BarcodeSvg code={detailProduct.barcode || detailProduct.sku} />
                    </div>
                  </>
                )}

                {detailTab === "specs" && (
                  <div className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-3 text-xs">
                      <div className="gstock-card p-3.5 flex items-center gap-3">
                        <Tag size={18} className="text-primary shrink-0" />
                        <div>
                          <div className="text-[10px] text-muted uppercase font-bold">
                            Marque / Fabricant
                          </div>
                          <div className="font-bold">
                            {detailProduct.brand || "Non spécifié"}
                          </div>
                        </div>
                      </div>

                      <div className="gstock-card p-3.5 flex items-center gap-3">
                        <Truck size={18} className="text-primary shrink-0" />
                        <div>
                          <div className="text-[10px] text-muted uppercase font-bold">
                            Fournisseur Principal
                          </div>
                          <div className="font-bold">
                            {detailProduct.supplierName || "Non spécifié"}
                          </div>
                        </div>
                      </div>

                      <div className="gstock-card p-3.5 flex items-center gap-3">
                        <Box size={18} className="text-primary shrink-0" />
                        <div>
                          <div className="text-[10px] text-muted uppercase font-bold">
                            Poids &amp; Dimensions
                          </div>
                          <div className="font-bold">
                            {detailProduct.weightKg ? `${detailProduct.weightKg} kg` : "—"} •{" "}
                            {detailProduct.dimensionsCm || "Dimensions standard"}
                          </div>
                        </div>
                      </div>

                      <div className="gstock-card p-3.5 flex items-center gap-3">
                        <Clock size={18} className="text-primary shrink-0" />
                        <div>
                          <div className="text-[10px] text-muted uppercase font-bold">
                            Délai Réappro &amp; Traçabilité
                          </div>
                          <div className="font-bold">
                            {detailProduct.leadTimeDays ?? 3} jour(s) • Mode{" "}
                            {detailProduct.trackingMode || "STANDARD"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="gstock-card overflow-hidden">
                      <div className="p-3.5 border-b border-border bg-surface-muted/40 font-bold text-xs">
                        Fiche Technique &amp; Attributs Métier
                      </div>
                      {Object.keys(detailProduct.specsJson || detailProduct.specifications || {}).length === 0 ? (
                        <div className="p-6 text-center text-xs text-muted">
                          Aucune caractéristique technique enregistrée sur cette référence.
                        </div>
                      ) : (
                        <div className="divide-y divide-border text-xs">
                          {Object.entries(detailProduct.specsJson || detailProduct.specifications || {}).map(([k, v]) => (
                            <div
                              key={k}
                              className="px-4 py-2.5 flex items-center justify-between gap-4"
                            >
                              <span className="text-muted font-medium">{k}</span>
                              <span className="font-bold text-right">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Grille de Variantes (Pointures, Tailles, Couleurs, Châssis VIN) */}
                    {(detailProduct.variants || []).length > 0 && (
                      <div className="gstock-card overflow-hidden">
                        <div className="p-3.5 border-b border-border bg-primary/10 font-bold text-xs text-primary flex items-center justify-between">
                          <span>
                            Grille de Variantes (Pointures / Tailles / Couleurs / Châssis VIN)
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px]">
                            {detailProduct.variants.length} déclinaisons
                          </span>
                        </div>
                        <div className="divide-y divide-border text-xs">
                          {detailProduct.variants.map((v: any) => (
                            <div
                              key={v.sku}
                              className="px-4 py-2.5 flex items-center justify-between gap-4"
                            >
                              <span className="font-mono font-bold text-primary">
                                {v.sku}
                              </span>
                              <div className="flex flex-wrap gap-1.5 justify-end">
                                {Object.entries(v.attributes || {}).map(([ak, av]) => (
                                  <span
                                    key={ak}
                                    className="px-2 py-0.5 rounded bg-surface-muted border border-border text-[11px]"
                                  >
                                    <strong>{ak}:</strong> {String(av)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {detailTab === "locations" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted">
                        Répartition physique dans les emplacements d&apos;entrepôts
                      </div>
                      <button
                        type="button"
                        disabled={isReceivingQuick}
                        onClick={() => handleQuickRestockProduct(detailProduct, 10)}
                        className="px-3 py-1.5 rounded-control bg-primary text-primary-foreground text-xs font-semibold inline-flex items-center gap-1.5"
                      >
                        <Plus size={13} />
                        <span>Réception rapide (+10)</span>
                      </button>
                    </div>

                    {(detailProduct.inventoryBalances || []).length === 0 ? (
                      <div className="gstock-card p-6 text-center text-xs text-muted">
                        Aucun solde en stock enregistré sur les emplacements pour cette
                        référence.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {(detailProduct.inventoryBalances || []).map((b: any) => (
                          <div
                            key={b.id}
                            className="gstock-card p-3.5 flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="font-bold">
                                {b.location?.warehouse?.name || "Entrepôt Central"}
                              </div>
                              <div className="text-muted font-mono text-[11px]">
                                Emplacement : {b.location?.code || "ZONE-A"} (
                                {b.location?.locationType || "STORAGE"})
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-base font-extrabold font-mono text-primary">
                                {formatQuantity(b.onHand)}{" "}
                                {detailProduct.baseUnit?.code || "UN"}
                              </div>
                              <div className="text-[10px] text-muted">
                                Réservé : {formatQuantity(b.reserved || 0)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Pied du tiroir Fiche Produit */}
            <div className="p-4 border-t border-border bg-surface-muted/30 flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={isReceivingQuick}
                onClick={() => handleQuickRestockProduct(detailProduct, 10)}
                className="px-3.5 py-2 rounded-control bg-emerald-600 text-white text-xs font-semibold inline-flex items-center gap-1.5 hover:opacity-90"
              >
                <Plus size={14} />
                <span>Réceptionner +10 en stock</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEditProductModal(detailProduct)}
                  className="px-3.5 py-2 rounded-control border border-border bg-surface text-xs font-semibold"
                >
                  Modifier la fiche
                </button>
                <button
                  type="button"
                  onClick={() => setDetailProduct(null)}
                  className="px-4 py-2 rounded-control bg-primary text-primary-foreground text-xs font-semibold"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CRÉATION / ÉDITION DE PRODUIT ENRICHIE (Image, Code-Barres, Marque, Prix Vente, Specs, Variantes) */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="gstock-card p-6 max-w-2xl w-full space-y-4 my-8 max-h-[92vh] overflow-y-auto animate-fade-up">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Package size={18} className="text-primary" />
                <span>
                  {editingProduct
                    ? `Modifier ${editingProduct.sku}`
                    : "Nouvelle référence produit (Magasin / Concession / Entrepôt)"}
                </span>
              </h2>
              <button
                type="button"
                onClick={() => setProductModalOpen(false)}
                className="p-1 text-muted hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modèles Métiers Magasin en 1 clic */}
            {!editingProduct && (
              <div className="p-3 rounded-control border border-primary/30 bg-primary/5 space-y-2">
                <div className="text-[11px] font-bold text-primary flex items-center gap-1.5">
                  <Sparkles size={13} />
                  <span>Pré-remplir avec un modèle métier de magasin (1 clic) :</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applySectorPreset("AUTO")}
                    className="px-3 py-1.5 rounded-control bg-surface border border-border hover:border-primary text-xs font-semibold transition-colors"
                  >
                    🚗 Concession Voiture (VIN &amp; Finition)
                  </button>
                  <button
                    type="button"
                    onClick={() => applySectorPreset("SHOES")}
                    className="px-3 py-1.5 rounded-control bg-surface border border-border hover:border-primary text-xs font-semibold transition-colors"
                  >
                    👟 Chaussures (Grille Pointures 40-44)
                  </button>
                  <button
                    type="button"
                    onClick={() => applySectorPreset("HABIT")}
                    className="px-3 py-1.5 rounded-control bg-surface border border-border hover:border-primary text-xs font-semibold transition-colors"
                  >
                    👕 Habit / Prêt-à-porter (Tailles S-XL &amp; Couleurs)
                  </button>
                  <button
                    type="button"
                    onClick={() => applySectorPreset("STANDARD")}
                    className="px-3 py-1.5 rounded-control bg-surface border border-border hover:border-primary text-xs font-semibold transition-colors"
                  >
                    📦 Article Standard
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-4">
              {/* Visuel Produit (Galerie rapide + Upload fichier + URL) */}
              <div className="p-3.5 rounded-control border border-border bg-surface-muted/30 space-y-3">
                <label className="block text-xs font-bold flex items-center gap-1.5">
                  <ImageIcon size={14} className="text-primary" />
                  <span>Image &amp; Visuel du Produit</span>
                </label>

                <div className="flex flex-col sm:flex-row gap-3 items-start">
                  <div className="w-24 h-24 rounded-control border border-border bg-surface overflow-hidden shrink-0 flex items-center justify-center">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt="Aperçu"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package size={28} className="text-muted" />
                    )}
                  </div>

                  <div className="flex-1 space-y-2 w-full">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="URL de l'image (https://...) ou téléversez un fichier"
                        className="flex-1 px-3 py-1.5 text-xs rounded-control border border-border bg-background"
                      />
                      <label className="px-3 py-1.5 rounded-control border border-border bg-surface hover:bg-surface-muted text-xs font-semibold cursor-pointer shrink-0">
                        Choisir photo...
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_PRODUCT_IMAGES.map((img) => (
                        <button
                          key={img.label}
                          type="button"
                          onClick={() => setImageUrl(img.url)}
                          className="px-2 py-1 rounded border border-border bg-surface hover:border-primary text-[10px] font-medium"
                        >
                          {img.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Identification : SKU, Code-Barres EAN-13, Nom */}
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Code SKU *</label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="Ex: SCAN-PRO-2D"
                    className="w-full px-3 py-2 text-xs font-mono uppercase rounded-control border border-border bg-background"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 flex items-center justify-between">
                    <span>Code-barres EAN-13</span>
                    <button
                      type="button"
                      onClick={generateRandomEan13}
                      className="text-[10px] text-primary hover:underline font-bold"
                    >
                      Générer EAN
                    </button>
                  </label>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="Ex: 3760123450018"
                    className="w-full px-3 py-2 text-xs font-mono rounded-control border border-border bg-background"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Mode de suivi</label>
                  <select
                    value={trackingMode}
                    onChange={(e) => setTrackingMode(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
                  >
                    <option value="STANDARD">Standard (Quantité)</option>
                    <option value="SERIAL">Numéro de Série / VIN (SERIAL)</option>
                    <option value="LOT_EXPIRY">Lot &amp; Péremption (FEFO)</option>
                    <option value="VARIANT">Variantes (Pointure/Taille/Couleur)</option>
                  </select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Désignation complète *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: SUV Hybride 140ch / Sneakers AirFlow / Veste Denim"
                    className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Marque</label>
                    <input
                      type="text"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder="Ex: ZebraTech"
                      className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Fournisseur</label>
                    <input
                      type="text"
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                      placeholder="Ex: AutoID Europe"
                      className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Description détaillée &amp; notes d&apos;exploitation
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Spécifications d'usage, précautions de stockage..."
                  className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
                />
              </div>

              {/* Catégorie, Unité, Prix Revient, Prix Vente, Seuil */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Catégorie</label>
                  <select
                    value={prodCategoryId}
                    onChange={(e) => setProdCategoryId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
                  >
                    <option value="">Aucune catégorie</option>
                    {categories.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Unité de base *
                  </label>
                  <select
                    required
                    value={baseUnitId}
                    onChange={(e) => setBaseUnitId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
                  >
                    {units.map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {u.code} — {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Prix de revient HT (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-control border border-border bg-background"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Prix de vente HT (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-control border border-border bg-background"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Seuil d&apos;alerte stock bas
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={reorderLevel}
                    onChange={(e) => setReorderLevel(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-control border border-border bg-background"
                  />
                </div>
              </div>

              {/* Logistique : Poids, Dimensions, Délai fournisseur */}
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Poids unitaire (kg)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    placeholder="Ex: 1.450"
                    className="w-full px-3 py-2 text-xs font-mono rounded-control border border-border bg-background"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Dimensions (L x l x H)
                  </label>
                  <input
                    type="text"
                    value={dimensionsCm}
                    onChange={(e) => setDimensionsCm(e.target.value)}
                    placeholder="Ex: 60 x 40 x 32 cm"
                    className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Délai réappro (jours)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="365"
                    value={leadTimeDays}
                    onChange={(e) => setLeadTimeDays(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-control border border-border bg-background"
                  />
                </div>
              </div>

              {/* Grille de Variantes (Pointures / Tailles / Couleurs / Châssis VIN) */}
              <div className="p-3.5 rounded-control border border-primary/30 bg-primary/5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold flex items-center gap-1.5 text-primary">
                    <Layers size={13} />
                    <span>
                      Grille de Variantes (Pointures, Tailles, Couleurs ou N° Châssis VIN)
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setVariantsList([
                        ...variantsList,
                        {
                          sku: `${sku || "VAR"}-${variantsList.length + 1}`,
                          attr1Key: "Taille/Pointure",
                          attr1Val: "",
                          attr2Key: "Couleur/VIN",
                          attr2Val: "",
                        },
                      ])
                    }
                    className="text-xs text-primary font-semibold hover:underline inline-flex items-center gap-1"
                  >
                    <Plus size={12} /> Ajouter une variante / taille / VIN
                  </button>
                </div>

                {variantsList.length === 0 ? (
                  <p className="text-[11px] text-muted">
                    Aucune variante définie. Cliquez sur « Ajouter une variante » ou choisissez un modèle métier ci-dessus (Chaussures, Habit, Voiture).
                  </p>
                ) : (
                  <div className="space-y-2">
                    {variantsList.map((v, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-1.5 items-center">
                        <input
                          type="text"
                          value={v.sku}
                          onChange={(e) => {
                            const next = [...variantsList];
                            next[idx].sku = e.target.value;
                            setVariantsList(next);
                          }}
                          placeholder="SKU Variante"
                          className="col-span-3 px-2 py-1 text-[11px] font-mono rounded border border-border bg-background"
                        />
                        <input
                          type="text"
                          value={v.attr1Key}
                          onChange={(e) => {
                            const next = [...variantsList];
                            next[idx].attr1Key = e.target.value;
                            setVariantsList(next);
                          }}
                          placeholder="Ex: Pointure"
                          className="col-span-2 px-2 py-1 text-[11px] rounded border border-border bg-background"
                        />
                        <input
                          type="text"
                          value={v.attr1Val}
                          onChange={(e) => {
                            const next = [...variantsList];
                            next[idx].attr1Val = e.target.value;
                            setVariantsList(next);
                          }}
                          placeholder="Ex: 42 / L"
                          className="col-span-2 px-2 py-1 text-[11px] font-bold rounded border border-border bg-background"
                        />
                        <input
                          type="text"
                          value={v.attr2Key}
                          onChange={(e) => {
                            const next = [...variantsList];
                            next[idx].attr2Key = e.target.value;
                            setVariantsList(next);
                          }}
                          placeholder="Ex: Couleur/VIN"
                          className="col-span-2 px-2 py-1 text-[11px] rounded border border-border bg-background"
                        />
                        <input
                          type="text"
                          value={v.attr2Val}
                          onChange={(e) => {
                            const next = [...variantsList];
                            next[idx].attr2Val = e.target.value;
                            setVariantsList(next);
                          }}
                          placeholder="Ex: Noir / VF1..."
                          className="col-span-2 px-2 py-1 text-[11px] font-bold rounded border border-border bg-background"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setVariantsList(variantsList.filter((_, i) => i !== idx))
                          }
                          className="col-span-1 flex justify-center text-muted hover:text-danger"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Caractéristiques techniques dynamiques (specsJson) */}
              <div className="p-3.5 rounded-control border border-border bg-surface-muted/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold flex items-center gap-1.5">
                    <Sparkles size={13} className="text-primary" />
                    <span>Caractéristiques techniques &amp; Attributs personnalisés</span>
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setSpecsList([...specsList, { key: "", value: "" }])
                    }
                    className="text-xs text-primary font-semibold hover:underline inline-flex items-center gap-1"
                  >
                    <Plus size={12} /> Ajouter un attribut
                  </button>
                </div>

                <div className="space-y-2">
                  {specsList.map((spec, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={spec.key}
                        onChange={(e) => {
                          const next = [...specsList];
                          next[idx].key = e.target.value;
                          setSpecsList(next);
                        }}
                        placeholder="Attribut (ex: Matière, Norme)"
                        className="w-1/3 px-2.5 py-1.5 text-xs rounded-control border border-border bg-background"
                      />
                      <input
                        type="text"
                        value={spec.value}
                        onChange={(e) => {
                          const next = [...specsList];
                          next[idx].value = e.target.value;
                          setSpecsList(next);
                        }}
                        placeholder="Valeur (ex: Acier Inox 304L)"
                        className="flex-1 px-2.5 py-1.5 text-xs rounded-control border border-border bg-background"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setSpecsList(specsList.filter((_, i) => i !== idx))
                        }
                        className="p-1.5 text-muted hover:text-danger"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="prod-active"
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <label htmlFor="prod-active" className="text-xs font-medium">
                  Référence active (disponible pour les mouvements de stock)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-control border border-border"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isCreatingProduct || isUpdatingProduct}
                  className="px-4 py-2 text-xs font-semibold rounded-control bg-primary text-primary-foreground"
                >
                  {isCreatingProduct || isUpdatingProduct
                    ? "Enregistrement..."
                    : editingProduct
                      ? "Enregistrer les modifications"
                      : "Créer la référence"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL IMPORT CSV */}
      {csvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="gstock-card p-6 max-w-xl w-full space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <FileSpreadsheet size={18} className="text-primary" />
                <span>Importation CSV validée</span>
              </h2>
              <button
                type="button"
                onClick={() => setCsvModalOpen(false)}
                className="p-1 text-muted hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleImportCsv} className="space-y-3">
              <div className="text-xs text-muted space-y-1">
                <p>
                  Format attendu (séparateur <code>;</code> ou <code>,</code>) :
                </p>
                <code className="block p-2 rounded bg-surface-muted font-mono text-[11px]">
                  SKU;Nom;Categorie;Unite;PrixRevient;SeuilAlerte
                </code>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Charger un fichier .csv
                </label>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleCsvFileUpload}
                  className="w-full text-xs file:mr-3 file:px-3 file:py-1.5 file:rounded-control file:border-0 file:bg-primary file:text-primary-foreground file:text-xs file:font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Contenu CSV à valider et importer
                </label>
                <textarea
                  rows={6}
                  required
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  className="w-full p-3 text-xs font-mono rounded-control border border-border bg-background"
                />
              </div>

              {importResult && (
                <div className="p-3 rounded-control border border-border bg-surface-muted text-xs space-y-1">
                  <div className="font-semibold">
                    Résultat : {importResult.importedCount} référence(s) traitée(s)
                  </div>
                  {importResult.errors?.length > 0 && (
                    <ul className="text-danger list-disc pl-4 space-y-0.5">
                      {importResult.errors.map((err: any, idx: number) => (
                        <li key={idx}>
                          Ligne {err.line} : {err.message}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCsvModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-control border border-border"
                >
                  Fermer
                </button>
                <button
                  type="submit"
                  disabled={isImportingCsv}
                  className="px-4 py-2 text-xs font-semibold rounded-control bg-primary text-primary-foreground"
                >
                  {isImportingCsv ? "Validation & Import..." : "Valider et importer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
