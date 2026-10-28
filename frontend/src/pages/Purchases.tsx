import { useCallback, useEffect, useState, type FormEvent } from "react";

import {
  CalendarDays,
  Eye,
  Loader2,
  Package,
  Plus,
  RotateCw,
  Search,
  ShoppingBag,
  X,
} from "lucide-react";

import { useAuth } from "../context/auth-context";
import { api, ApiError, qs } from "../lib/api";
import Modal from "../components/ui/Modal";
import Select from "../components/ui/Select";
import type { Paginated, Product, Purchase } from "../types/api";

function formatCurrency(value: number) {
  return value.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

async function fetchAllProducts(): Promise<Product[]> {
  const all: Product[] = [];

  for (let page = 1; ; page += 1) {
    const result = await api.get<Paginated<Product>>(
      `/products${qs({ active: true, page, limit: 100 })}`
    );

    all.push(...result.data);

    if (all.length >= result.meta.total || result.data.length === 0) break;
  }

  return all;
}

/** Presentación aplanada con el nombre del producto para el selector. */
interface FlatOption {
  presentationId: string;
  label: string;
}

function flatten(products: Product[]): FlatOption[] {
  const options: FlatOption[] = [];

  for (const product of products) {
    for (const presentation of product.presentations) {
      if (!presentation.isActive) continue;

      options.push({
        presentationId: presentation.id,
        label: `${product.name} · ${presentation.label} · ${presentation.grind}`,
      });
    }
  }

  return options;
}

interface PurchaseItemDraft {
  presentationId: string;
  quantity: string;
  unitCost: string;
}

const emptyItem: PurchaseItemDraft = {
  presentationId: "",
  quantity: "",
  unitCost: "",
};

export default function Purchases() {
  const { hasRole } = useAuth();
  const canCreate = hasRole("ADMIN", "BODEGA", "CONTADOR");

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [options, setOptions] = useState<FlatOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  // Detalle
  const [detail, setDetail] = useState<Purchase | null>(null);

  // Modal nueva compra
  const [createOpen, setCreateOpen] = useState(false);
  const [provider, setProvider] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<PurchaseItemDraft[]>([{ ...emptyItem }]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchPurchases = useCallback(async () => {
    const result = await api.get<Paginated<Purchase>>(
      `/purchases${qs({ q: search || undefined, page: 1, limit: 50 })}`
    );

    return result.data;
  }, [search]);

  const load = useCallback(() => {
    return Promise.all([fetchPurchases(), fetchAllProducts()])
      .then(([rows, products]) => {
        setPurchases(rows);
        setOptions(flatten(products));
      })
      .catch((error: unknown) => {
        setLoadError(
          error instanceof ApiError
            ? error.message
            : "No fue posible cargar las compras."
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [fetchPurchases]);

  useEffect(() => {
    void load();
  }, [load]);

  function updateItem(index: number, patch: Partial<PurchaseItemDraft>) {
    setItems((current) =>
      current.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaveError(null);

    const validItems = items.filter(
      (item) =>
        item.presentationId &&
        Number(item.quantity) > 0 &&
        Number(item.unitCost) >= 0
    );

    if (!provider.trim() || validItems.length === 0) {
      setSaveError(
        "Indica el proveedor y al menos un ítem con cantidad y costo."
      );
      return;
    }

    setSaving(true);

    try {
      await api.post("/purchases", {
        provider: provider.trim(),
        notes: notes.trim() || null,
        items: validItems.map((item) => ({
          presentationId: item.presentationId,
          quantity: Number(item.quantity),
          unitCost: Number(item.unitCost),
        })),
      });

      setCreateOpen(false);
      setProvider("");
      setNotes("");
      setItems([{ ...emptyItem }]);
      await load();
    } catch (error) {
      setSaveError(
        error instanceof ApiError
          ? error.message
          : "No fue posible registrar la compra."
      );
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full border border-stone-300 rounded-xl px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-[#6F4E37]";

  return (
    <div className="space-y-8">
      {/* ENCABEZADO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-stone-900">
            Compras
          </h1>

          <p className="text-stone-500 mt-2">
            Compras a proveedor con entrada directa a bodega (R5).
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={() => {
              setSaveError(null);
              setCreateOpen(true);
            }}
            className="flex items-center gap-2 bg-[#6F4E37] hover:bg-[#5B3F2D] text-white px-5 py-3 rounded-xl font-semibold transition shrink-0"
          >
            <Plus size={20} />
            Nueva compra
          </button>
        )}
      </div>

      {/* BÚSQUEDA */}
      <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-4">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
          />

          <input
            type="text"
            placeholder="Buscar por nº de compra o proveedor…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className={`${inputClass} pl-11`}
          />
        </div>
      </div>

      {/* CONTENIDO */}
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 text-[#6F4E37]">
          <Loader2 size={26} className="animate-spin" />

          <p className="text-sm font-medium">Cargando compras…</p>
        </div>
      ) : loadError ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4">
          <p className="text-sm text-red-600">{loadError}</p>

          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setLoadError(null);
              void load();
            }}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#6F4E37] hover:bg-[#5B3F2D] text-white text-sm font-semibold transition-colors"
          >
            <RotateCw size={16} />
            Reintentar
          </button>
        </div>
      ) : purchases.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm py-16 text-center">
          <ShoppingBag size={32} className="mx-auto text-stone-300" />

          <p className="mt-4 text-sm text-stone-500">
            No hay compras registradas{search ? " con esta búsqueda" : ""}.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-left text-stone-500">
                  <th className="px-6 py-3 font-medium">Nº</th>
                  <th className="px-6 py-3 font-medium">Proveedor</th>
                  <th className="px-6 py-3 font-medium">Fecha</th>
                  <th className="px-6 py-3 font-medium text-right">Ítems</th>
                  <th className="px-6 py-3 font-medium text-right">Total</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>

              <tbody className="divide-y divide-stone-100">
                {purchases.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-stone-50/60">
                    <td className="px-6 py-4 font-semibold text-stone-900 whitespace-nowrap">
                      {purchase.number}
                    </td>

                    <td className="px-6 py-4">
                      <p className="font-medium text-stone-800">
                        {purchase.provider}
                      </p>

                      <p className="text-xs text-stone-400 mt-0.5">
                        Registró {purchase.createdBy.fullName}
                      </p>
                    </td>

                    <td className="px-6 py-4 text-stone-600 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays size={14} className="text-stone-400" />
                        {formatDate(purchase.date)}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right text-stone-600">
                      {purchase.items.length}
                    </td>

                    <td className="px-6 py-4 text-right font-semibold text-stone-900 whitespace-nowrap">
                      {formatCurrency(purchase.total)}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => setDetail(purchase)}
                          aria-label={`Ver ${purchase.number}`}
                          className="p-2 rounded-lg text-stone-400 hover:text-[#6F4E37] hover:bg-stone-100 transition-colors"
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------
          MODAL: NUEVA COMPRA
      ------------------------------------------------------ */}
      {createOpen && (
        <Modal
          icon={ShoppingBag}
          title="Nueva compra"
          subtitle="El stock entrará a bodega y el costo quedará actualizado."
          onClose={() => setCreateOpen(false)}
          onSubmit={(event) => void handleSubmit(event)}
          size="lg"
          footer={
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-stone-600 hover:bg-stone-200 transition-colors"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#6F4E37] hover:bg-[#5B3F2D] text-white disabled:opacity-60 transition-colors"
              >
                {saving ? "Guardando…" : "Registrar compra"}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            {saveError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                {saveError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Proveedor *
                </label>

                <input
                  type="text"
                  required
                  placeholder="Ej. Eliseo Carvajal"
                  value={provider}
                  onChange={(event) => setProvider(event.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Notas
                </label>

                <input
                  type="text"
                  placeholder="Opcional…"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {/* ÍTEMS */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-stone-700">
                  Ítems *
                </label>

                <button
                  type="button"
                  onClick={() => setItems((c) => [...c, { ...emptyItem }])}
                  className="flex items-center gap-1 text-sm font-semibold text-[#6F4E37] hover:underline"
                >
                  <Plus size={14} />
                  Agregar ítem
                </button>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-12 gap-2 items-end"
                  >
                    <div className="col-span-12 sm:col-span-6">
                      {index === 0 && (
                        <label className="block text-xs text-stone-500 mb-1">
                          Presentación
                        </label>
                      )}

                      <Select
                        value={item.presentationId}
                        onChange={(value) =>
                          updateItem(index, {
                            presentationId: value,
                          })
                        }
                        placeholder="Seleccionar…"
                        aria-label="Presentación"
                        className="py-2.5 text-sm"
                        options={options.map((option) => ({
                          value: option.presentationId,
                          label: option.label,
                          icon: Package,
                        }))}
                      />
                    </div>

                    <div className="col-span-4 sm:col-span-2">
                      {index === 0 && (
                        <label className="block text-xs text-stone-500 mb-1">
                          Cantidad
                        </label>
                      )}

                      <input
                        type="number"
                        required
                        min="1"
                        step="1"
                        placeholder="50"
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(index, { quantity: event.target.value })
                        }
                        className={`${inputClass} py-2.5 text-sm`}
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-3">
                      {index === 0 && (
                        <label className="block text-xs text-stone-500 mb-1">
                          Costo unitario
                        </label>
                      )}

                      <input
                        type="number"
                        required
                        min="0"
                        step="any"
                        placeholder="18000"
                        value={item.unitCost}
                        onChange={(event) =>
                          updateItem(index, { unitCost: event.target.value })
                        }
                        className={`${inputClass} py-2.5 text-sm`}
                      />
                    </div>

                    <div className="col-span-2 sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          setItems((current) =>
                            current.filter((_, i) => i !== index)
                          )
                        }
                        disabled={items.length === 1}
                        aria-label="Quitar ítem"
                        className="p-2.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ------------------------------------------------------
          MODAL: DETALLE DE COMPRA
      ------------------------------------------------------ */}
      {detail && (
        <Modal
          icon={Eye}
          title={detail.number}
          subtitle={`${detail.provider} · ${formatDate(detail.date)}`}
          onClose={() => setDetail(null)}
          size="md"
        >
          <div className="space-y-3">
            {detail.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-800 truncate">
                    {item.product}
                  </p>

                  <p className="text-xs text-stone-500">
                    {item.presentation} · {item.quantity} u. ×{" "}
                    {formatCurrency(item.unitCost)}
                  </p>
                </div>

                <p className="text-sm font-semibold text-stone-900 whitespace-nowrap">
                  {formatCurrency(item.subtotal)}
                </p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-5 pt-4 border-t border-stone-200">
            <p className="text-sm text-stone-500">Total</p>

            <p className="text-lg font-bold text-stone-900">
              {formatCurrency(detail.total)}
            </p>
          </div>

          {detail.notes && (
            <p className="text-xs text-stone-400 mt-3">{detail.notes}</p>
          )}
        </Modal>
      )}
    </div>
  );
}
