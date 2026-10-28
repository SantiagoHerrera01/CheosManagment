import { useCallback, useEffect, useState, type FormEvent } from "react";

import {
  Briefcase,
  Home,
  Lightbulb,
  Loader2,
  Package,
  Pencil,
  Plus,
  Receipt,
  RotateCw,
  Search,
  Tag,
  Trash2,
  Truck,
  Users,
  Wrench,
} from "lucide-react";

import { useAuth } from "../context/auth-context";
import { api, ApiError, qs } from "../lib/api";
import { EXPENSE_CATEGORIES, type Expense, type ExpenseCategory, type Paginated } from "../types/api";
import Modal from "../components/ui/Modal";
import Select, { type SelectOption } from "../components/ui/Select";

/** Icono decorativo por categoría de gasto. */
const CATEGORY_ICONS: Record<ExpenseCategory, typeof Receipt> = {
  Operativo: Briefcase,
  "Nómina": Users,
  Arriendo: Home,
  "Servicios públicos": Lightbulb,
  Transporte: Truck,
  Empaque: Package,
  Mantenimiento: Wrench,
  Impuestos: Receipt,
  Otro: Tag,
};

const CATEGORY_OPTIONS: SelectOption[] = EXPENSE_CATEGORIES.map((category) => ({
  value: category,
  label: category,
  icon: CATEGORY_ICONS[category],
}));

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

/** Colores de badge por categoría (rotación suave). */
const CATEGORY_STYLES: Record<ExpenseCategory, string> = {
  Operativo: "bg-stone-100 text-stone-700",
  Nómina: "bg-blue-50 text-blue-700",
  Arriendo: "bg-violet-50 text-violet-700",
  "Servicios públicos": "bg-cyan-50 text-cyan-700",
  Transporte: "bg-amber-50 text-amber-700",
  Empaque: "bg-emerald-50 text-emerald-700",
  Mantenimiento: "bg-orange-50 text-orange-700",
  Impuestos: "bg-red-50 text-red-700",
  Otro: "bg-stone-100 text-stone-600",
};

interface ExpenseForm {
  date: string;
  concept: string;
  amount: string;
  category: ExpenseCategory;
  notes: string;
}

const emptyForm: ExpenseForm = {
  date: new Date().toISOString().slice(0, 10),
  concept: "",
  amount: "",
  category: "Operativo",
  notes: "",
};

export default function Expenses() {
  const { hasRole } = useAuth();
  /** El backend permite crear gastos a ADMIN, CONTADOR y VENDEDOR (R6). */
  const canCreate = hasRole("ADMIN", "CONTADOR", "VENDEDOR");
  const canDelete = hasRole("ADMIN");

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // Modal de crear/editar
  const [editing, setEditing] = useState<Expense | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ExpenseForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const limit = 20;

  const fetchExpenses = useCallback(async () => {
    const result = await api.get<Paginated<Expense> & { totalAmount: number }>(
      `/expenses${qs({
        page,
        limit,
        q: search || undefined,
        category: categoryFilter || undefined,
      })}`
    );

    return result;
  }, [page, search, categoryFilter]);

  const load = useCallback(() => {
    return fetchExpenses()
      .then((result) => {
        setExpenses(result.data);
        setTotal(result.meta.total);
        setTotalAmount(result.totalAmount);
      })
      .catch((error: unknown) => {
        setLoadError(
          error instanceof ApiError
            ? error.message
            : "No fue posible cargar los gastos."
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [fetchExpenses]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setSaveError(null);
    setModalOpen(true);
  }

  function openEdit(expense: Expense) {
    setEditing(expense);
    setForm({
      date: expense.date.slice(0, 10),
      concept: expense.concept,
      amount: String(expense.amount),
      category: expense.category,
      notes: expense.notes ?? "",
    });
    setSaveError(null);
    setModalOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaveError(null);

    const amount = Number(form.amount);
    if (!form.concept.trim() || !Number.isFinite(amount) || amount <= 0) {
      setSaveError("Describe el gasto y pon un valor mayor que cero.");
      return;
    }

    setSaving(true);

    const payload = {
      date: form.date,
      concept: form.concept.trim(),
      amount,
      category: form.category,
      notes: form.notes.trim() || null,
    };

    try {
      if (editing) {
        await api.patch(`/expenses/${editing.id}`, payload);
      } else {
        await api.post("/expenses", payload);
      }

      setModalOpen(false);
      await load();
    } catch (error) {
      setSaveError(
        error instanceof ApiError
          ? error.message
          : "No fue posible guardar el gasto."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(expense: Expense) {
    if (!window.confirm(`¿Eliminar el gasto "${expense.concept}"?`)) return;

    try {
      await api.delete(`/expenses/${expense.id}`);
      await load();
    } catch (error) {
      window.alert(
        error instanceof ApiError
          ? error.message
          : "No fue posible eliminar el gasto."
      );
    }
  }

  const inputClass =
    "w-full border border-stone-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#6F4E37]";

  return (
    <div className="space-y-8">
      {/* ENCABEZADO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-stone-900">
            Gastos
          </h1>

          <p className="text-stone-500 mt-2">
            Carga de gastos operativos del negocio (R6).
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 bg-[#6F4E37] hover:bg-[#5B3F2D] text-white px-5 py-3 rounded-xl font-semibold transition shrink-0"
          >
            <Plus size={20} />
            Registrar gasto
          </button>
        )}
      </div>

      {/* RESUMEN */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-5">
        <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-stone-500 text-xs sm:text-sm truncate">Total del filtro</p>

              <p className="text-lg sm:text-2xl font-bold text-stone-900 mt-1.5 sm:mt-2 truncate">
                {formatCurrency(totalAmount)}
              </p>
            </div>

            <div className="bg-stone-100 text-[#6F4E37] p-2.5 sm:p-3 rounded-xl shrink-0">
              <Receipt size={22} />
            </div>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-stone-500 text-xs sm:text-sm truncate">Registros</p>

              <p className="text-lg sm:text-2xl font-bold text-stone-900 mt-1.5 sm:mt-2 truncate">{total}</p>
            </div>

            <div className="bg-stone-100 text-[#6F4E37] p-2.5 sm:p-3 rounded-xl shrink-0">
              <Receipt size={22} />
            </div>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-stone-500 text-xs sm:text-sm truncate">En esta página</p>

              <p className="text-lg sm:text-2xl font-bold text-stone-900 mt-1.5 sm:mt-2 truncate">
                {expenses.length}
              </p>
            </div>

            <div className="bg-stone-100 text-[#6F4E37] p-2.5 sm:p-3 rounded-xl shrink-0">
              <Receipt size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
          />

          <input
            type="text"
            placeholder="Buscar por concepto…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            className={`${inputClass} pl-11`}
          />
        </div>

        <Select
          value={categoryFilter}
          onChange={(value) => {
            setCategoryFilter(value);
            setPage(1);
          }}
          aria-label="Filtrar por categoría"
          options={[
            { value: "", label: "Todas las categorías", icon: Search },
            ...CATEGORY_OPTIONS,
          ]}
        />
      </div>

      {/* CONTENIDO */}
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 text-[#6F4E37]">
          <Loader2 size={26} className="animate-spin" />

          <p className="text-sm font-medium">Cargando gastos…</p>
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
      ) : expenses.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm py-16 text-center">
          <Receipt size={32} className="mx-auto text-stone-300" />

          <p className="mt-4 text-sm text-stone-500">
            No hay gastos registrados con estos filtros.
          </p>
        </div>
      ) : (
        <>
          {/* TABLA */}
          <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-left text-stone-500">
                    <th className="px-6 py-3 font-medium">Fecha</th>
                    <th className="px-6 py-3 font-medium">Concepto</th>
                    <th className="px-6 py-3 font-medium">Categoría</th>
                    <th className="px-6 py-3 font-medium text-right">Valor</th>
                    <th className="px-6 py-3 font-medium">Registró</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>

                <tbody className="divide-y divide-stone-100">
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-stone-50/60">
                      <td className="px-6 py-4 whitespace-nowrap text-stone-600">
                        {formatDate(expense.date)}
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-medium text-stone-800">
                          {expense.concept}
                        </p>

                        {expense.notes && (
                          <p className="text-xs text-stone-400 mt-0.5 truncate max-w-[260px]">
                            {expense.notes}
                          </p>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${
                            CATEGORY_STYLES[expense.category]
                          }`}
                        >
                          {expense.category}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right font-semibold text-stone-900 whitespace-nowrap">
                        {formatCurrency(expense.amount)}
                      </td>

                      <td className="px-6 py-4 text-stone-500 whitespace-nowrap">
                        {expense.createdBy.fullName}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          {canCreate && (
                            <button
                              type="button"
                              onClick={() => openEdit(expense)}
                              aria-label={`Editar ${expense.concept}`}
                              className="p-2 rounded-lg text-stone-400 hover:text-[#6F4E37] hover:bg-stone-100 transition-colors"
                            >
                              <Pencil size={16} />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => void handleDelete(expense)}
                              aria-label={`Eliminar ${expense.concept}`}
                              className="p-2 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* PAGINACIÓN */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-stone-500">
              <p>
                Página {page} de {totalPages}
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-4 py-2 rounded-xl border border-stone-200 bg-white disabled:opacity-40 hover:bg-stone-50 transition-colors"
                >
                  Anterior
                </button>

                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-4 py-2 rounded-xl border border-stone-200 bg-white disabled:opacity-40 hover:bg-stone-50 transition-colors"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL CREAR/EDITAR */}
      {modalOpen && (
        <Modal
          icon={Receipt}
          title={editing ? "Editar gasto" : "Registrar gasto"}
          onClose={() => setModalOpen(false)}
          onSubmit={(event) => void handleSubmit(event)}
          size="md"
          footer={
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-stone-600 hover:bg-stone-200 transition-colors"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#6F4E37] hover:bg-[#5B3F2D] text-white disabled:opacity-60 transition-colors"
              >
                {saving ? "Guardando…" : "Guardar"}
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

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Fecha *
              </label>

              <input
                type="date"
                required
                value={form.date}
                onChange={(event) =>
                  setForm({ ...form, date: event.target.value })
                }
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Concepto *
              </label>

              <input
                type="text"
                required
                placeholder="Ej. Bolsas 250 g"
                value={form.concept}
                onChange={(event) =>
                  setForm({ ...form, concept: event.target.value })
                }
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Valor *
                </label>

                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  placeholder="45000"
                  value={form.amount}
                  onChange={(event) =>
                    setForm({ ...form, amount: event.target.value })
                  }
                  className={inputClass}
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
                      category: value as ExpenseCategory,
                    })
                  }
                  aria-label="Categoría"
                  options={CATEGORY_OPTIONS}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Notas
              </label>

              <textarea
                rows={2}
                placeholder="Detalles adicionales…"
                value={form.notes}
                onChange={(event) =>
                  setForm({ ...form, notes: event.target.value })
                }
                className={inputClass}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
