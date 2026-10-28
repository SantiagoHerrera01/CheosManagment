import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ArrowDownToLine,
  Search,
  Plus,
  Pencil,
  Package,
  Bean,
  Boxes,
  Coffee,
  Factory,
  Loader2,
  AlertTriangle,
  RotateCcw,
  ShoppingCart,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { api, ApiError, qs } from "../lib/api";
import { useAuth } from "../context/auth-context";
import Select from "../components/ui/Select";
import Modal from "../components/ui/Modal";
import type {
  Grind,
  Paginated,
  Presentation,
  Product,
  ProductCategory,
} from "../types/api";

const GRIND_LABELS: Record<Grind, string> = {
  MOLIDO: "Molido",
  GRANO: "Grano",
};

/** R5: TERMINADO se vende, MATERIA_PRIMA entra a producción, INSUMO es bodega. */
const CATEGORY_LABELS: Record<ProductCategory, string> = {
  TERMINADO: "Terminado",
  MATERIA_PRIMA: "Materia prima",
  INSUMO: "Insumo",
};

const CATEGORY_STYLES: Record<ProductCategory, string> = {
  TERMINADO: "bg-emerald-50 text-emerald-700",
  MATERIA_PRIMA: "bg-amber-50 text-amber-700",
  INSUMO: "bg-blue-50 text-blue-700",
};

function formatCurrency(value: number) {
  return value.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

interface PresentationDraft {
  label: string;
  grind: Grind;
  price: string;
  cost: string;
  stock: string;
  minimumStock: string;
}

const emptyPresentation: PresentationDraft = {
  label: "",
  grind: "MOLIDO",
  price: "",
  cost: "0",
  stock: "0",
  minimumStock: "0",
};

export default function Products() {
  const { hasRole } = useAuth();
  const canManage = hasRole(); // solo ADMIN (hasRole sin argumentos)
  const canStock = hasRole("BODEGA");

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<"" | ProductCategory>("");

  // Modal crear producto (ADMIN)
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    variety: "",
    process: "",
    category: "TERMINADO" as ProductCategory,
  });
  const [presentations, setPresentations] = useState<PresentationDraft[]>([
    { ...emptyPresentation },
  ]);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Modal editar presentación (ADMIN)
  const [editPres, setEditPres] = useState<{
    product: Product;
    presentation: Presentation;
  } | null>(null);
  const [presForm, setPresForm] = useState({
    price: "",
    cost: "",
    minimumStock: "",
  });

  // Modal entrada de stock (ADMIN / BODEGA)
  const [stockTarget, setStockTarget] = useState<{
    product: Product;
    presentation: Presentation;
  } | null>(null);
  const [stockForm, setStockForm] = useState({
    quantity: "",
    reason: "PRODUCCION",
    notes: "",
  });

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const all: Product[] = [];
      for (let page = 1; ; page += 1) {
        const result = await api.get<Paginated<Product>>(
          `/products${qs({
            q: search.trim(),
            lowStock: lowStockOnly ? "true" : "false",
            category: categoryFilter || undefined,
            page,
            limit: 100,
          })}`
        );
        all.push(...result.data);
        if (all.length >= result.meta.total || result.data.length === 0) break;
      }
      setProducts(all);
    } catch (error) {
      setLoadError(
        error instanceof ApiError ? error.message : "No fue posible cargar los productos."
      );
    } finally {
      setLoading(false);
    }
  }, [search, lowStockOnly, categoryFilter]);

  useEffect(() => {
    const timer = setTimeout(() => void loadProducts(), 350);
    return () => clearTimeout(timer);
  }, [loadProducts]);

  const totalStock = products.reduce(
    (sum, p) => sum + p.presentations.reduce((s, pr) => s + pr.stock, 0),
    0
  );
  const lowStockCount = products.reduce(
    (sum, p) => sum + p.presentations.filter((pr) => pr.stock <= pr.minimumStock).length,
    0
  );

  // ---------------------------------------------------------
  //  Crear producto
  // ---------------------------------------------------------
  const updatePresentationField = (
    index: number,
    field: keyof PresentationDraft,
    value: string
  ) => {
    setPresentations((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!form.name.trim()) {
      setFormError("El nombre del producto es obligatorio.");
      return;
    }

    const validPresentations = presentations.filter((p) => p.label.trim());
    if (validPresentations.length === 0) {
      setFormError("Agrega al menos una presentación con su etiqueta.");
      return;
    }

    for (const p of validPresentations) {
      if (!(Number(p.price) > 0)) {
        setFormError(`La presentación "${p.label}" necesita un precio mayor que cero.`);
        return;
      }
    }

    setSaving(true);
    try {
      await api.post("/products", {
        name: form.name.trim(),
        variety: form.variety.trim() || null,
        process: form.process.trim() || null,
        category: form.category,
        presentations: validPresentations.map((p) => ({
          label: p.label.trim(),
          grind: p.grind,
          price: Number(p.price),
          cost: Number(p.cost) || 0,
          stock: Number(p.stock) || 0,
          minimumStock: Number(p.minimumStock) || 0,
        })),
      });
      setCreateOpen(false);
      setForm({ name: "", variety: "", process: "", category: "TERMINADO" });
      setPresentations([{ ...emptyPresentation }]);
      await loadProducts();
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : "No fue posible crear el producto."
      );
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------
  //  Editar presentación (precio / costo / mínimo)
  // ---------------------------------------------------------
  const openEditPres = (product: Product, presentation: Presentation) => {
    setEditPres({ product, presentation });
    setPresForm({
      price: String(presentation.price),
      cost: String(presentation.cost ?? 0),
      minimumStock: String(presentation.minimumStock),
    });
    setFormError(null);
  };

  const handleSavePres = async (event: FormEvent) => {
    event.preventDefault();
    if (!editPres) return;
    setFormError(null);

    setSaving(true);
    try {
      await api.patch(
        `/products/${editPres.product.id}/presentations/${editPres.presentation.id}`,
        {
          price: Number(presForm.price),
          ...(hasRole() ? { cost: Number(presForm.cost) } : {}),
          minimumStock: Number(presForm.minimumStock),
        }
      );
      setEditPres(null);
      await loadProducts();
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : "No fue posible guardar los cambios."
      );
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------
  //  Entrada de stock
  // ---------------------------------------------------------
  const handleStock = async (event: FormEvent) => {
    event.preventDefault();
    if (!stockTarget) return;
    setFormError(null);

    setSaving(true);
    try {
      await api.post(
        `/products/${stockTarget.product.id}/presentations/${stockTarget.presentation.id}/stock`,
        {
          quantity: Number(stockForm.quantity),
          reason: stockForm.reason as "PRODUCCION" | "COMPRA" | "DEVOLUCION" | "AJUSTE",
          notes: stockForm.notes.trim() || null,
        }
      );
      setStockTarget(null);
      setStockForm({ quantity: "", reason: "PRODUCCION", notes: "" });
      await loadProducts();
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : "No fue posible registrar el stock."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-7">

      {/* ENCABEZADO */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

        <div>
          <h1 className="text-3xl font-bold text-stone-800">Productos</h1>
          <p className="text-stone-500 mt-2">
            Catálogo con presentaciones, precios y stock.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => {
              setForm({ name: "", variety: "", process: "", category: "TERMINADO" });
              setPresentations([{ ...emptyPresentation }]);
              setFormError(null);
              setCreateOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 bg-[#6F4E37] hover:bg-[#5B3F2D] text-white px-5 py-3 rounded-xl font-semibold transition"
          >
            <Plus size={19} />
            Nuevo producto
          </button>
        )}

      </div>

      {/* RESUMEN */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5">

        <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-stone-500 truncate">Productos activos</p>
              <p className="text-lg sm:text-2xl font-bold text-stone-800 mt-1.5 sm:mt-2 truncate">{products.length}</p>
            </div>
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-[#F3EDE7] text-[#6F4E37] flex items-center justify-center shrink-0">
              <Package size={18} />
            </div>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-stone-500 truncate">Unidades en stock</p>
              <p className="text-lg sm:text-2xl font-bold text-stone-800 mt-1.5 sm:mt-2 truncate">{totalStock}</p>
            </div>
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Boxes size={18} />
            </div>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-sm col-span-2 md:col-span-1">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-stone-500 truncate">Presentaciones con stock bajo</p>
              <p className="text-lg sm:text-2xl font-bold text-stone-800 mt-1.5 sm:mt-2 truncate">{lowStockCount}</p>
            </div>
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
              <AlertTriangle size={18} />
            </div>
          </div>
        </div>

      </div>

      {/* CATÁLOGO */}
      <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">

        <div className="p-5 border-b border-stone-200 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">

          <div className="relative flex-1 max-w-xl">
            <Search
              size={19}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
            />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre, variedad o presentación..."
              className="w-full border border-stone-300 rounded-xl py-3 pl-11 pr-4 outline-none focus:ring-2 focus:ring-[#6F4E37]/20 focus:border-[#6F4E37]"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Select
              value={categoryFilter}
              onChange={(value) =>
                setCategoryFilter(value as "" | ProductCategory)
              }
              aria-label="Filtrar por categoría"
              className="text-sm"
              options={[
                { value: "", label: "Todas las categorías", icon: Boxes },
                { value: "TERMINADO", label: "Terminado", icon: Package },
                {
                  value: "MATERIA_PRIMA",
                  label: "Materia prima",
                  icon: Coffee,
                },
                { value: "INSUMO", label: "Insumo", icon: Bean },
              ]}
            />

            <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
              <input
                type="checkbox"
                checked={lowStockOnly}
                onChange={(event) => setLowStockOnly(event.target.checked)}
                className="w-4 h-4 accent-[#6F4E37]"
              />
              Solo stock bajo
            </label>
          </div>

        </div>

        {loadError && (
          <div className="px-6 py-4 bg-red-50 border-b border-stone-200 text-sm text-red-600">
            {loadError}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center">
            <Loader2 size={30} className="mx-auto text-[#6F4E37] animate-spin" />
            <p className="mt-3 text-sm text-stone-500">Cargando productos…</p>
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center">
            <Package size={38} className="mx-auto text-stone-300" />
            <p className="mt-3 font-medium text-stone-700">No encontramos productos</p>
            <p className="text-sm text-stone-500 mt-1">Intenta cambiar la búsqueda.</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {products.map((product) => (
              <div key={product.id} className="p-5 hover:bg-stone-50 transition">

                <div className="flex flex-wrap items-start justify-between gap-3">

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-stone-800">{product.name}</p>

                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${CATEGORY_STYLES[product.category]}`}
                      >
                        {CATEGORY_LABELS[product.category]}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mt-1">
                      {[product.variety, product.process].filter(Boolean).join(" · ") ||
                        "Sin variedad registrada"}
                    </p>
                  </div>

                </div>

                {/* PRESENTACIONES */}
                <div className="mt-4 space-y-2">

                  {product.presentations.map((pres) => {
                    const isLow = pres.stock <= pres.minimumStock;
                    return (
                      <div
                        key={pres.id}
                        className="flex flex-wrap items-center gap-3 rounded-xl border border-stone-200 bg-stone-50/60 px-4 py-3"
                      >

                        <span className="inline-flex px-2.5 py-0.5 rounded-full bg-[#F3EDE7] text-[#6F4E37] text-xs font-medium">
                          {pres.label} · {GRIND_LABELS[pres.grind]}
                        </span>

                        <span className="text-sm font-semibold text-stone-800">
                          {formatCurrency(pres.price)}
                        </span>

                        {pres.cost !== undefined && (
                          <span className="text-xs text-stone-400">
                            costo {formatCurrency(pres.cost)}
                          </span>
                        )}

                        <span
                          className={
                            isLow
                              ? "text-xs font-semibold text-orange-600"
                              : "text-xs text-stone-600"
                          }
                        >
                          stock {pres.stock} / mín {pres.minimumStock}
                        </span>

                        <div className="ml-auto flex items-center gap-2">

                          {canStock && (
                            <button
                              type="button"
                              onClick={() => {
                                setStockTarget({ product, presentation: pres });
                                setStockForm({ quantity: "", reason: "PRODUCCION", notes: "" });
                                setFormError(null);
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                            >
                              + Entrada de stock
                            </button>
                          )}

                          {canManage && (
                            <button
                              type="button"
                              onClick={() => openEditPres(product, pres)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-500 hover:bg-stone-100 hover:text-[#6F4E37] transition"
                              title="Editar presentación"
                            >
                              <Pencil size={15} />
                            </button>
                          )}

                        </div>

                      </div>
                    );
                  })}

                </div>

              </div>
            ))}
          </div>
        )}

      </div>

      {/* MODAL CREAR PRODUCTO */}
      {createOpen && (
        <Modal
          icon={Package}
          title="Nuevo producto"
          subtitle="Registra el café y sus presentaciones con precio."
          onClose={() => setCreateOpen(false)}
          onSubmit={handleCreate}
          size="lg"
          footer={
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="px-5 py-3 rounded-xl border border-stone-300 text-stone-700 font-medium hover:bg-stone-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-3 rounded-xl bg-[#6F4E37] hover:bg-[#5B3F2D] disabled:opacity-60 text-white font-semibold transition inline-flex items-center gap-2"
              >
                {saving && <Loader2 size={17} className="animate-spin" />}
                Crear producto
              </button>
            </div>
          }
        >
          <div className="space-y-5">

              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                <div className="lg:col-span-1">
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Nombre *
                  </label>
                  <input
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    placeholder="Ej. Café Castillo"
                    className="w-full border border-stone-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#6F4E37]/20 focus:border-[#6F4E37]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Categoría *
                  </label>
                  <Select
                    value={form.category}
                    onChange={(value) =>
                      setForm({
                        ...form,
                        category: value as ProductCategory,
                      })
                    }
                    aria-label="Categoría"
                    options={[
                      {
                        value: "TERMINADO",
                        label: "Terminado (se vende)",
                        icon: Package,
                      },
                      {
                        value: "MATERIA_PRIMA",
                        label: "Materia prima (producción)",
                        icon: Coffee,
                      },
                      {
                        value: "INSUMO",
                        label: "Insumo (bodega)",
                        icon: Bean,
                      },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Variedad
                  </label>
                  <input
                    value={form.variety}
                    onChange={(event) => setForm({ ...form, variety: event.target.value })}
                    placeholder="Ej. Castillo"
                    className="w-full border border-stone-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#6F4E37]/20 focus:border-[#6F4E37]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Proceso
                  </label>
                  <input
                    value={form.process}
                    onChange={(event) => setForm({ ...form, process: event.target.value })}
                    placeholder="Ej. Lavado"
                    className="w-full border border-stone-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#6F4E37]/20 focus:border-[#6F4E37]"
                  />
                </div>

              </div>

              {/* PRESENTACIONES */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-stone-700">Presentaciones *</p>
                  <button
                    type="button"
                    onClick={() =>
                      setPresentations((prev) => [...prev, { ...emptyPresentation }])
                    }
                    className="text-sm font-medium text-[#6F4E37] hover:underline"
                  >
                    + Agregar
                  </button>
                </div>

                <div className="space-y-3">

                  {presentations.map((pres, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-stone-200 p-4 grid grid-cols-2 md:grid-cols-6 gap-3 items-end"
                    >

                      <div className="col-span-2">
                        <label className="block text-xs text-stone-500 mb-1">Etiqueta *</label>
                        <input
                          value={pres.label}
                          onChange={(e) => updatePresentationField(index, "label", e.target.value)}
                          placeholder="Ej. 500 g"
                          className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#6F4E37]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-stone-500 mb-1">Molienda</label>
                        <Select
                          value={pres.grind}
                          onChange={(value) =>
                            updatePresentationField(index, "grind", value)
                          }
                          className="text-sm py-2"
                          aria-label="Molienda"
                          options={[
                            { value: "MOLIDO", label: "Molido", icon: Coffee },
                            { value: "GRANO", label: "Grano", icon: Bean },
                          ]}
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-stone-500 mb-1">Precio *</label>
                        <input
                          type="number"
                          min="1"
                          value={pres.price}
                          onChange={(e) => updatePresentationField(index, "price", e.target.value)}
                          placeholder="12900"
                          className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#6F4E37]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-stone-500 mb-1">Costo</label>
                        <input
                          type="number"
                          min="0"
                          value={pres.cost}
                          onChange={(e) => updatePresentationField(index, "cost", e.target.value)}
                          className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#6F4E37]"
                        />
                      </div>

                      <div className="flex items-end gap-2">

                        <div className="flex-1">
                          <label className="block text-xs text-stone-500 mb-1">Stock</label>
                          <input
                            type="number"
                            min="0"
                            value={pres.stock}
                            onChange={(e) =>
                              updatePresentationField(index, "stock", e.target.value)
                            }
                            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#6F4E37]"
                          />
                        </div>

                        {presentations.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setPresentations((prev) => prev.filter((_, i) => i !== index))
                            }
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-stone-400 hover:text-red-600 hover:bg-red-50 transition"
                            title="Quitar presentación"
                          >
                            <X size={16} />
                          </button>
                        )}

                      </div>

                    </div>
                  ))}

                </div>

                <p className="text-xs text-stone-400 mt-2">
                  El stock inicial queda registrado como entrada de inventario.
                </p>
              </div>

          </div>
        </Modal>
      )}

      {/* MODAL EDITAR PRESENTACIÓN */}
      {editPres && (
        <Modal
          icon={Boxes}
          title="Editar presentación"
          subtitle={`${editPres.product.name} · ${editPres.presentation.label}`}
          onClose={() => setEditPres(null)}
          onSubmit={handleSavePres}
          size="md"
          footer={
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditPres(null)}
                className="px-5 py-3 rounded-xl border border-stone-300 text-stone-700 font-medium hover:bg-stone-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-3 rounded-xl bg-[#6F4E37] hover:bg-[#5B3F2D] disabled:opacity-60 text-white font-semibold transition inline-flex items-center gap-2"
              >
                {saving && <Loader2 size={17} className="animate-spin" />}
                Guardar cambios
              </button>
            </div>
          }
        >
          <div className="space-y-4">

              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Precio de venta *
                </label>
                <input
                  type="number"
                  min="1"
                  value={presForm.price}
                  onChange={(event) => setPresForm({ ...presForm, price: event.target.value })}
                  className="w-full border border-stone-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#6F4E37]/20 focus:border-[#6F4E37]"
                />
              </div>

              {canManage && (
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Costo interno
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={presForm.cost}
                    onChange={(event) => setPresForm({ ...presForm, cost: event.target.value })}
                    className="w-full border border-stone-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#6F4E37]/20 focus:border-[#6F4E37]"
                  />
                  <p className="text-xs text-stone-400 mt-1">
                    Solo lo ven ADMIN y CONTADOR.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Stock mínimo (alerta)
                </label>
                <input
                  type="number"
                  min="0"
                  value={presForm.minimumStock}
                  onChange={(event) =>
                    setPresForm({ ...presForm, minimumStock: event.target.value })
                  }
                  className="w-full border border-stone-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#6F4E37]/20 focus:border-[#6F4E37]"
                />
              </div>

          </div>
        </Modal>
      )}

      {/* MODAL ENTRADA DE STOCK */}
      {stockTarget && (
        <Modal
          icon={ArrowDownToLine}
          title="Entrada de stock"
          subtitle={`${stockTarget.product.name} · ${stockTarget.presentation.label}`}
          onClose={() => setStockTarget(null)}
          onSubmit={handleStock}
          size="md"
          footer={
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setStockTarget(null)}
                className="px-5 py-3 rounded-xl border border-stone-300 text-stone-700 font-medium hover:bg-stone-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold transition inline-flex items-center gap-2"
              >
                {saving && <Loader2 size={17} className="animate-spin" />}
                Registrar entrada
              </button>
            </div>
          }
        >
          <div className="space-y-4">

              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Cantidad *
                </label>
                <input
                  type="number"
                  min="1"
                  value={stockForm.quantity}
                  onChange={(event) =>
                    setStockForm({ ...stockForm, quantity: event.target.value })
                  }
                  placeholder="Ej. 50"
                  className="w-full border border-stone-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#6F4E37]/20 focus:border-[#6F4E37]"
                />
                <p className="text-xs text-stone-400 mt-1">
                  Stock actual: {stockTarget.presentation.stock} unidades.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Motivo
                </label>
                <Select
                  value={stockForm.reason}
                  onChange={(value) =>
                    setStockForm({ ...stockForm, reason: value })
                  }
                  aria-label="Motivo"
                  options={[
                    {
                      value: "PRODUCCION",
                      label: "Producción",
                      icon: Factory,
                    },
                    { value: "COMPRA", label: "Compra", icon: ShoppingCart },
                    {
                      value: "DEVOLUCION",
                      label: "Devolución",
                      icon: RotateCcw,
                    },
                    {
                      value: "AJUSTE",
                      label: "Ajuste",
                      icon: SlidersHorizontal,
                    },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Notas
                </label>
                <textarea
                  value={stockForm.notes}
                  onChange={(event) =>
                    setStockForm({ ...stockForm, notes: event.target.value })
                  }
                  rows={2}
                  placeholder="Opcional"
                  className="w-full border border-stone-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#6F4E37]/20 focus:border-[#6F4E37]"
                />
              </div>

          </div>
        </Modal>
      )}

    </div>
  );
}
