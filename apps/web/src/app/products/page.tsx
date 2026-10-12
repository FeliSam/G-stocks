"use client";

import React, { useState, useEffect } from "react";
import {
  Package,
  FolderTree,
  Scale,
  Plus,
  Download,
  Upload,
  Search,
  Edit3,
  X,
  CheckCircle2,
  AlertCircle,
  ArrowLeftRight,
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
} from "@/store/api";

type TabType = "catalog" | "categories" | "units";

export default function ProductsPage() {
  const token = useAppSelector((s) => s.ui.token);
  const activeOrganizationId = useAppSelector((s) => s.ui.activeOrganizationId);

  const [activeTab, setActiveTab] = useState<TabType>("catalog");

  // Filtres et pagination serveur du catalogue
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [stockStatus, setStockStatus] = useState<"all" | "low" | "out" | "ok">("all");
  const [sortBy, setSortBy] = useState<"createdAt" | "name" | "sku" | "costPrice">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Queries RTK Query
  const {
    data: productsRes,
    isLoading: isLoadingProducts,
    error: productsError,
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

  // Mutations RTK Query
  const [createProduct, { isLoading: isCreatingProduct }] = useCreateProductMutation();
  const [updateProduct, { isLoading: isUpdatingProduct }] = useUpdateProductMutation();
  const [importProductsCsv, { isLoading: isImportingCsv }] = useImportProductsCsvMutation();
  const [createCategory, { isLoading: isCreatingCategory }] = useCreateCategoryMutation();
  const [createUnit, { isLoading: isCreatingUnit }] = useCreateUnitMutation();
  const [createUnitConversion, { isLoading: isCreatingConversion }] =
    useCreateUnitConversionMutation();

  const products = productsRes?.data || [];
  const meta = productsRes?.meta || { page: 1, limit: 10, total: 0, totalPages: 1 };
  const categories = categoriesRes?.data || [];
  const units = unitsRes?.data?.units || [];
  const conversions = unitsRes?.data?.conversions || [];

  // Notifications globales
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Modal Produit (Création / Édition)
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [prodCategoryId, setProdCategoryId] = useState("");
  const [baseUnitId, setBaseUnitId] = useState("");
  const [costPrice, setCostPrice] = useState("0");
  const [reorderLevel, setReorderLevel] = useState("5");
  const [isActive, setIsActive] = useState(true);

  // Modal Import CSV
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvContent, setCsvContent] = useState(
    "SKU;Nom;Categorie;Unite;PrixRevient;SeuilAlerte\nREF-DEMO-101;Clavier Mécanique Pro;INFO;UN;45.00;10"
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
  const [conversionFactor, setConversionFactor] = useState("1");

  useEffect(() => {
    if (units.length > 0 && !baseUnitId) {
      setBaseUnitId(units[0].id);
    }
    if (units.length >= 2 && !fromUnitId && !toUnitId) {
      setFromUnitId(units[0].id);
      setToUnitId(units[1].id);
    }
  }, [units, baseUnitId, fromUnitId, toUnitId]);

  function openCreateProductModal() {
    setEditingProduct(null);
    setSku("");
    setName("");
    setDescription("");
    setProdCategoryId(categories[0]?.id || "");
    setBaseUnitId(units[0]?.id || "");
    setCostPrice("0");
    setReorderLevel("5");
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
    setReorderLevel(String(product.reorderLevel ?? 5));
    setIsActive(Boolean(product.isActive));
    setFeedback(null);
    setProductModalOpen(true);
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    try {
      const payload = {
        sku: sku.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim() || null,
        categoryId: prodCategoryId || null,
        baseUnitId,
        costPrice: Number(costPrice),
        reorderLevel: Number(reorderLevel),
        isActive,
      };

      if (editingProduct) {
        await updateProduct({ id: editingProduct.id, data: payload }).unwrap();
        setFeedback({
          type: "success",
          message: `Le produit « ${payload.name} » (${payload.sku}) a été mis à jour avec succès.`,
        });
      } else {
        await createProduct(payload).unwrap();
        setFeedback({
          type: "success",
          message: `Le produit « ${payload.name} » (${payload.sku}) a été ajouté au catalogue.`,
        });
      }
      setProductModalOpen(false);
    } catch (err: any) {
      setFeedback({
        type: "error",
        message:
          err?.data?.error?.message ||
          "Erreur lors de l'enregistrement du produit. Vérifiez le SKU et vos quotas.",
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
        const header = "SKU;Nom;Categorie;Unite;PrixRevient;SeuilAlerte;StockActuel";
        const rows = products.map((p: any) =>
          [
            p.sku,
            `"${(p.name || "").replace(/"/g, '""')}"`,
            p.category?.code || "",
            p.baseUnit?.code || "UN",
            p.costPrice,
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
        message: "Unité de mesure personnalisée ajoutée.",
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        message:
          err?.data?.error?.message || "Impossible de créer l'unité de mesure.",
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
          "Conversion refusée : vérifiez la compatibilité des dimensions.",
      });
    }
  }

  return (
    <AppShell
      title="Catalogue Produits, Catégories & Unités"
      subtitle="Gérez votre référentiel d'articles, vos seuils de réapprovisionnement et vos unités de mesure multi-dimensions."
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
            className="px-3.5 py-2 rounded-control bg-primary text-primary-foreground text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Plus size={15} />
            <span>Nouveau produit</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Bannière de retour d'action */}
        {feedback && (
          <div
            className={`p-3.5 rounded-control border text-xs font-medium flex items-center justify-between gap-2 ${
              feedback.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                : "bg-red-500/10 border-red-500/30 text-danger"
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === "success" ? (
                <CheckCircle2 size={16} />
              ) : (
                <AlertCircle size={16} />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="p-1 hover:opacity-75"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Navigation par onglets */}
        <div className="flex flex-wrap border-b border-border gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("catalog")}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors inline-flex items-center gap-2 ${
              activeTab === "catalog"
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <Package size={15} />
            <span>Catalogue Produits ({meta.total})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("categories")}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors inline-flex items-center gap-2 ${
              activeTab === "categories"
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <FolderTree size={15} />
            <span>Catégories ({categories.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("units")}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors inline-flex items-center gap-2 ${
              activeTab === "units"
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <Scale size={15} />
            <span>Unités & Conversions ({units.length})</span>
          </button>
        </div>

        {/* ONGLET 1 : CATALOGUE PRODUITS */}
        {activeTab === "catalog" && (
          <div className="space-y-4">
            {/* Barre de filtres serveur */}
            <div className="gstock-card p-4 grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="lg:col-span-2 relative">
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
                  placeholder="Rechercher par SKU, nom ou description..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-control border border-border bg-background"
                />
              </div>

              <div>
                <select
                  aria-label="Filtrer par catégorie"
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

              <div>
                <select
                  aria-label="Filtrer par état de stock"
                  value={stockStatus}
                  onChange={(e) => {
                    setStockStatus(e.target.value as any);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
                >
                  <option value="all">Tous les états de stock</option>
                  <option value="ok">En stock normal (OK)</option>
                  <option value="low">Sous le seuil d&apos;alerte (Bas)</option>
                  <option value="out">En rupture (0 disponible)</option>
                </select>
              </div>

              <div className="flex gap-1.5">
                <select
                  aria-label="Trier par"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="flex-1 px-2.5 py-2 text-xs rounded-control border border-border bg-background"
                >
                  <option value="createdAt">Tri : Date création</option>
                  <option value="name">Tri : Nom</option>
                  <option value="sku">Tri : Code SKU</option>
                  <option value="costPrice">Tri : Prix revient</option>
                </select>
                <button
                  type="button"
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  title="Inverser l'ordre de tri"
                  className="px-2.5 py-2 text-xs font-semibold rounded-control border border-border bg-background hover:bg-surface-muted"
                >
                  {sortOrder === "asc" ? "↑" : "↓"}
                </button>
              </div>
            </div>

            {/* Tableau des produits */}
            <div className="gstock-card overflow-hidden">
              {isLoadingProducts ? (
                <div className="p-8 text-center text-xs text-muted">
                  Chargement du catalogue produits...
                </div>
              ) : productsError ? (
                <div className="p-6 text-center text-xs text-danger">
                  Erreur lors du chargement des produits.
                </div>
              ) : products.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <div className="text-sm font-semibold">
                    Aucun produit ne correspond à vos critères
                  </div>
                  <p className="text-xs text-muted">
                    Modifiez vos filtres de recherche ou créez une nouvelle référence.
                  </p>
                  <button
                    type="button"
                    onClick={openCreateProductModal}
                    className="px-3.5 py-2 rounded-control bg-primary text-primary-foreground text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <Plus size={14} />
                    <span>Créer un produit</span>
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs gstock-table">
                    <thead className="bg-surface-muted text-muted uppercase text-[11px]">
                      <tr>
                        <th>SKU</th>
                        <th>Désignation</th>
                        <th>Catégorie</th>
                        <th>Unité</th>
                        <th>Prix de revient</th>
                        <th>Seuil alerte</th>
                        <th>Disponible</th>
                        <th>État</th>
                        <th className="text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {products.map((p: any) => (
                        <tr key={p.id} className="hover:bg-surface-muted/40">
                          <td className="font-mono font-bold text-primary">{p.sku}</td>
                          <td>
                            <div className="font-semibold">{p.name}</div>
                            {p.description && (
                              <div className="text-[11px] text-muted truncate max-w-xs">
                                {p.description}
                              </div>
                            )}
                          </td>
                          <td>
                            {p.category ? (
                              <span className="px-2 py-0.5 rounded bg-surface-muted font-medium">
                                {p.category.name}
                              </span>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td className="font-mono">{p.baseUnit?.code || "UN"}</td>
                          <td className="font-medium">
                            {formatCurrencyAmount(p.costPrice)}
                          </td>
                          <td>{formatQuantity(p.reorderLevel)}</td>
                          <td className="font-bold">
                            {formatQuantity(p.available)} {p.baseUnit?.code}
                          </td>
                          <td>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                p.stockState === "out"
                                  ? "bg-red-500/15 text-danger"
                                  : p.stockState === "low"
                                  ? "bg-amber-500/15 text-amber-600"
                                  : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              }`}
                            >
                              {p.stockState === "out"
                                ? "Rupture"
                                : p.stockState === "low"
                                ? "Stock bas"
                                : "Disponible"}
                            </span>
                          </td>
                          <td className="text-right">
                            <button
                              type="button"
                              onClick={() => openEditProductModal(p)}
                              className="px-2.5 py-1 rounded-control border border-border hover:bg-surface-muted text-xs font-medium inline-flex items-center gap-1"
                            >
                              <Edit3 size={12} />
                              <span>Modifier</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination serveur */}
              <div className="p-3.5 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-muted">
                  <span>
                    Page <strong>{meta.page}</strong> sur{" "}
                    <strong>{meta.totalPages}</strong> ({meta.total} références)
                  </span>
                  <select
                    aria-label="Lignes par page"
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    className="px-2 py-1 rounded border border-border bg-background text-foreground"
                  >
                    <option value={10}>10 / page</option>
                    <option value={20}>20 / page</option>
                    <option value={50}>50 / page</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-control border border-border disabled:opacity-40 hover:bg-surface-muted font-medium"
                  >
                    Précédent
                  </button>
                  <button
                    type="button"
                    disabled={page >= meta.totalPages}
                    onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                    className="px-3 py-1.5 rounded-control border border-border disabled:opacity-40 hover:bg-surface-muted font-medium"
                  >
                    Suivant
                  </button>
                </div>
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
                  Structurez votre catalogue par famille d&apos;articles
                </p>
              </div>
              <form onSubmit={handleCreateCategory} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Code catégorie (alphanumérique)
                  </label>
                  <input
                    type="text"
                    required
                    value={catCode}
                    onChange={(e) => setCatCode(e.target.value.toUpperCase())}
                    placeholder="Ex: ELEC, EMBALLAGE, MAT-PREM"
                    className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Libellé de la catégorie
                  </label>
                  <input
                    type="text"
                    required
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    placeholder="Ex: Composants Électroniques"
                    className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isCreatingCategory}
                  className="w-full py-2 rounded-control bg-primary text-primary-foreground text-xs font-semibold"
                >
                  {isCreatingCategory
                    ? "Création en cours..."
                    : "Ajouter la catégorie"}
                </button>
              </form>
            </div>

            <div className="lg:col-span-7 gstock-card overflow-hidden">
              <div className="p-4 border-b border-border">
                <h2 className="font-bold text-base">Catégories actives</h2>
              </div>
              {isLoadingCategories ? (
                <div className="p-6 text-xs text-muted">Chargement...</div>
              ) : categories.length === 0 ? (
                <div className="p-6 text-xs text-muted text-center">
                  Aucune catégorie enregistrée.
                </div>
              ) : (
                <table className="w-full text-left text-xs gstock-table">
                  <thead className="bg-surface-muted text-muted uppercase text-[11px]">
                    <tr>
                      <th>Code</th>
                      <th>Nom de la catégorie</th>
                      <th>Produits rattachés</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {categories.map((c: any) => (
                      <tr key={c.id} className="hover:bg-surface-muted/40">
                        <td className="font-mono font-bold text-primary">{c.code}</td>
                        <td className="font-semibold">{c.name}</td>
                        <td>
                          <span className="px-2 py-0.5 rounded bg-surface-muted font-semibold">
                            {c._count?.products ?? 0} produit(s)
                          </span>
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
              {/* Formulaire d'ajout d'unité personnalisée */}
              <div className="gstock-card p-5 space-y-4">
                <div>
                  <h2 className="font-bold text-base">Ajouter une unité de mesure</h2>
                  <p className="text-xs text-muted">
                    Créez vos propres unités (ex: Palette, Carton de 12, Bobine)
                  </p>
                </div>
                <form onSubmit={handleCreateUnit} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1">Code</label>
                      <input
                        type="text"
                        required
                        value={unitCode}
                        onChange={(e) => setUnitCode(e.target.value.toUpperCase())}
                        placeholder="Ex: PAL"
                        className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Nom complet
                      </label>
                      <input
                        type="text"
                        required
                        value={unitName}
                        onChange={(e) => setUnitName(e.target.value)}
                        placeholder="Ex: Palette Europe"
                        className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Dimension physique
                      </label>
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
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Décimales (0 à 4)
                      </label>
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
                    {isCreatingUnit ? "Création..." : "Créer l'unité"}
                  </button>
                </form>
              </div>

              {/* Formulaire de conversion entre deux unités compatibles */}
              <div className="gstock-card p-5 space-y-4">
                <div>
                  <h2 className="font-bold text-base flex items-center gap-2">
                    <ArrowLeftRight size={16} className="text-primary" />
                    <span>Nouvelle conversion d&apos;unités</span>
                  </h2>
                  <p className="text-xs text-muted">
                    Définissez le facteur multiplicateur entre deux unités compatibles
                  </p>
                </div>
                <form onSubmit={handleCreateConversion} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Unité source (1)
                      </label>
                      <select
                        value={fromUnitId}
                        onChange={(e) => setFromUnitId(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
                      >
                        {units.map((u: any) => (
                          <option key={u.id} value={u.id}>
                            {u.code} — {u.name} ({u.dimension})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Unité cible
                      </label>
                      <select
                        value={toUnitId}
                        onChange={(e) => setToUnitId(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
                      >
                        {units.map((u: any) => (
                          <option key={u.id} value={u.id}>
                            {u.code} — {u.name} ({u.dimension})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      Facteur de conversion (1 unité source = X unités cibles)
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      min="0.0001"
                      required
                      value={conversionFactor}
                      onChange={(e) => setConversionFactor(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isCreatingConversion}
                    className="w-full py-2 rounded-control bg-primary text-primary-foreground text-xs font-semibold"
                  >
                    {isCreatingConversion
                      ? "Enregistrement..."
                      : "Enregistrer la conversion"}
                  </button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-6">
              <div className="gstock-card overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h2 className="font-bold text-base">Unités disponibles</h2>
                </div>
                {isLoadingUnits ? (
                  <div className="p-6 text-xs text-muted">Chargement...</div>
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
                        <tr key={u.id} className="hover:bg-surface-muted/40">
                          <td className="font-mono font-bold text-primary">{u.code}</td>
                          <td className="font-semibold">{u.name}</td>
                          <td>{u.dimension}</td>
                          <td>{u.precision} déc.</td>
                          <td>
                            <span className="px-2 py-0.5 rounded bg-surface-muted text-[10px] font-semibold">
                              {u.organizationId ? "Personnalisée" : "Standard"}
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
                  <h2 className="font-bold text-base">
                    Règles de conversion configurées
                  </h2>
                </div>
                {conversions.length === 0 ? (
                  <div className="p-6 text-xs text-muted text-center">
                    Aucune règle de conversion personnalisée définie.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs gstock-table">
                    <thead className="bg-surface-muted text-muted uppercase text-[11px]">
                      <tr>
                        <th>Unité source</th>
                        <th>Équivalence</th>
                        <th>Unité cible</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {conversions.map((conv: any) => (
                        <tr key={conv.id} className="hover:bg-surface-muted/40">
                          <td className="font-semibold">
                            1 {conv.fromUnit?.code} ({conv.fromUnit?.name})
                          </td>
                          <td className="font-mono font-bold text-primary">
                            = {Number(conv.factor)}
                          </td>
                          <td className="font-semibold">
                            {conv.toUnit?.code} ({conv.toUnit?.name})
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
      </div>

      {/* MODAL CRÉATION / ÉDITION DE PRODUIT */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="gstock-card p-6 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {editingProduct
                  ? `Modifier le produit ${editingProduct.sku}`
                  : "Nouveau produit au catalogue"}
              </h2>
              <button
                type="button"
                onClick={() => setProductModalOpen(false)}
                className="p-1 text-muted hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Code SKU *
                  </label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value.toUpperCase())}
                    placeholder="Ex: ART-001"
                    className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background font-mono"
                  />
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

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Désignation du produit *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Écran 27 pouces 4K IPS"
                  className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Description technique
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Caractéristiques, références fournisseur..."
                  className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
                />
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Catégorie
                  </label>
                  <select
                    value={prodCategoryId}
                    onChange={(e) => setProdCategoryId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
                  >
                    <option value="">Aucune catégorie</option>
                    {categories.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Prix de revient unitaire
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
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
                    className="w-full px-3 py-2 text-xs rounded-control border border-border bg-background"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="prod-active"
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-border"
                />
                <label htmlFor="prod-active" className="text-xs font-medium">
                  Produit actif et autorisé aux mouvements de stock
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
                    ? "Mettre à jour"
                    : "Créer le produit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL IMPORTATION CSV */}
      {csvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="gstock-card p-6 max-w-xl w-full space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Importation CSV validée</h2>
              <button
                type="button"
                onClick={() => setCsvModalOpen(false)}
                className="p-1 text-muted hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-muted">
              Format attendu (séparateur point-virgule ou virgule) :{" "}
              <code className="font-mono bg-surface-muted px-1.5 py-0.5 rounded">
                SKU;Nom;Categorie;Unite;PrixRevient;SeuilAlerte
              </code>
            </p>

            <div>
              <label className="block text-xs font-semibold mb-1">
                Charger un fichier .csv local
              </label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvFileUpload}
                className="w-full text-xs file:mr-3 file:px-3 file:py-1.5 file:rounded-control file:border-0 file:bg-primary file:text-primary-foreground file:text-xs file:font-semibold"
              />
            </div>

            <form onSubmit={handleImportCsv} className="space-y-3">
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
                <div className="p-3 rounded-control bg-surface-muted text-xs space-y-1">
                  <div className="font-semibold text-emerald-600">
                    {importResult.importedCount} produit(s) importé(s) avec succès.
                  </div>
                  {importResult.errors?.length > 0 && (
                    <div className="text-danger space-y-0.5">
                      {importResult.errors.map((err: any, idx: number) => (
                        <div key={idx}>
                          Ligne {err.line} : {err.message}
                        </div>
                      ))}
                    </div>
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
                  {isImportingCsv ? "Importation..." : "Lancer l'import CSV"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
