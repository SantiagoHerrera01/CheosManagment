import { useCallback, useEffect, useState, type FormEvent } from "react";

import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Coffee,
  Droplet,
  Factory,
  Flame,
  Loader2,
  Package,
  Plus,
  RotateCw,
  Scissors,
  Sun,
  Trash2,
} from "lucide-react";

import { api, ApiError, qs } from "../lib/api";
import Select from "../components/ui/Select";
import Modal from "../components/ui/Modal";
import type {
  Paginated,
  Product,
  ProductionOrder,
  ProductionStatus,
  StageType,
} from "../types/api";

const STATUS_LABELS: Record<ProductionStatus, string> = {
  EN_PROCESO: "En proceso",
  FINALIZADA: "Finalizada",
  CANCELADA: "Cancelada",
};

const STATUS_STYLES: Record<ProductionStatus, string> = {
  EN_PROCESO: "bg-amber-50 text-amber-700",
  FINALIZADA: "bg-emerald-50 text-emerald-700",
  CANCELADA: "bg-stone-100 text-stone-500",
};

const STAGE_LABELS: Record<StageType, string> = {
  TRILLA: "Trilla",
  TUESTE: "Tueste",
  LAVADO: "Lavado",
  SECADO: "Secado",
  EMPAQUE: "Empaque",
  OTRO: "Otro",
};

const STAGE_TYPES: StageType[] = [
  "TRILLA",
  "TUESTE",
  "LAVADO",
  "SECADO",
  "EMPAQUE",
  "OTRO",
];

/** Presentación aplanada con el nombre del producto (para los selectores). */
interface FlatOption {
  presentationId: string;
  label: string;
  stock: number;
}

function flatten(products: Product[], category: "MATERIA_PRIMA" | "TERMINADO"): FlatOption[] {
  const options: FlatOption[] = [];

  for (const product of products) {
    if (product.category !== category) continue;

    for (const presentation of product.presentations) {
      if (!presentation.isActive) continue;

      options.push({
        presentationId: presentation.id,
        label: `${product.name} · ${presentation.label} (${presentation.stock} disp.)`,
        stock: presentation.stock,
      });
    }
  }

  return options;
}

async function fetchAllProducts(category?: string): Promise<Product[]> {
  const all: Product[] = [];

  for (let page = 1; ; page += 1) {
    const result = await api.get<Paginated<Product>>(
      `/products${qs({ active: true, category, page, limit: 100 })}`
    );

    all.push(...result.data);

    if (all.length >= result.meta.total || result.data.length === 0) break;
  }

  return all;
}

async function fetchOrders(status?: ProductionStatus): Promise<ProductionOrder[]> {
  const all: ProductionOrder[] = [];

  for (let page = 1; ; page += 1) {
    const result = await api.get<Paginated<ProductionOrder>>(
      `/production${qs({ status, page, limit: 50 })}`
    );

    all.push(...result.data);

    if (all.length >= result.meta.total || result.data.length === 0) break;
  }

  return all;
}

export default function ProductionPage() {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [rawOptions, setRawOptions] = useState<FlatOption[]>([]);
  const [finishedOptions, setFinishedOptions] = useState<FlatOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"" | ProductionStatus>("");

  // Modal nueva orden
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    rawMaterialPresentationId: "",
    inputQuantity: "",
    outputPresentationId: "",
    notes: "",
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Modal etapa
  const [stageOrder, setStageOrder] = useState<ProductionOrder | null>(null);
  const [stageForm, setStageForm] = useState({
    type: "TRILLA" as StageType,
    outputQuantity: "",
    notes: "",
  });
  const [savingStage, setSavingStage] = useState(false);
  const [stageError, setStageError] = useState<string | null>(null);

  // Modal finalizar
  const [finishOrder, setFinishOrder] = useState<ProductionOrder | null>(null);
  const [finishForm, setFinishForm] = useState({
    outputPresentationId: "",
    outputQuantity: "",
  });
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    const [rawProducts, finishedProducts, orderRows] = await Promise.all([
      fetchAllProducts("MATERIA_PRIMA"),
      fetchAllProducts("TERMINADO"),
      fetchOrders(statusFilter || undefined),
    ]);

    return {
      rawOptions: flatten(rawProducts, "MATERIA_PRIMA"),
      finishedOptions: flatten(finishedProducts, "TERMINADO"),
      orders: orderRows,
    };
  }, [statusFilter]);

  const load = useCallback(() => {
    return fetchAll()
      .then((result) => {
        setRawOptions(result.rawOptions);
        setFinishedOptions(result.finishedOptions);
        setOrders(result.orders);
      })
      .catch((error: unknown) => {
        setLoadError(
          error instanceof ApiError
            ? error.message
            : "No fue posible cargar la producción."
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [fetchAll]);

  useEffect(() => {
    void load();
  }, [load]);

  const inProcess = orders.filter((o) => o.status === "EN_PROCESO");
  const finished = orders.filter((o) => o.status === "FINALIZADA");
  const totalProcessed = finished.reduce((sum, o) => sum + o.inputQuantity, 0);
  const totalFinishedUnits = finished.reduce(
    (sum, o) => sum + (o.output?.quantity ?? 0),
    0
  );

  // ----------------------------------------------------------
  //  Crear orden (descuenta materia prima en bodega)
  // ----------------------------------------------------------
  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setCreateError(null);

    const inputQuantity = Number(createForm.inputQuantity);
    if (!createForm.rawMaterialPresentationId || !Number.isInteger(inputQuantity) || inputQuantity <= 0) {
      setCreateError("Selecciona la materia prima y una cantidad mayor que cero.");
      return;
    }

    setCreating(true);

    try {
      await api.post("/production", {
        rawMaterialPresentationId: createForm.rawMaterialPresentationId,
        inputQuantity,
        outputPresentationId: createForm.outputPresentationId || null,
        notes: createForm.notes.trim() || null,
      });

      setCreateOpen(false);
      setCreateForm({
        rawMaterialPresentationId: "",
        inputQuantity: "",
        outputPresentationId: "",
        notes: "",
      });
      await load();
    } catch (error) {
      setCreateError(
        error instanceof ApiError
          ? error.message
          : "No fue posible crear la orden de producción."
      );
    } finally {
      setCreating(false);
    }
  }

  // ----------------------------------------------------------
  //  Agregar etapa (rendimiento encadenado + merma)
  // ----------------------------------------------------------
  async function handleAddStage(event: FormEvent) {
    event.preventDefault();
    if (!stageOrder) return;
    setStageError(null);

    const lastStage = stageOrder.stages[stageOrder.stages.length - 1];
    const expectedInput = lastStage
      ? lastStage.outputQuantity
      : stageOrder.inputQuantity;
    const outputQuantity = Number(stageForm.outputQuantity);

    if (!Number.isInteger(outputQuantity) || outputQuantity < 0 || outputQuantity > expectedInput) {
      setStageError(
        `La salida debe estar entre 0 y ${expectedInput} (lo que entra a la etapa).`
      );
      return;
    }

    setSavingStage(true);

    try {
      await api.post(`/production/${stageOrder.id}/stages`, {
        type: stageForm.type,
        inputQuantity: expectedInput,
        outputQuantity,
        notes: stageForm.notes.trim() || null,
      });

      setStageOrder(null);
      await load();
    } catch (error) {
      setStageError(
        error instanceof ApiError
          ? error.message
          : "No fue posible registrar la etapa."
      );
    } finally {
      setSavingStage(false);
    }
  }

  // ----------------------------------------------------------
  //  Finalizar (entra producto terminado a bodega)
  // ----------------------------------------------------------
  async function handleFinish(event: FormEvent) {
    event.preventDefault();
    if (!finishOrder) return;
    setFinishError(null);

    const outputQuantity = Number(finishForm.outputQuantity);
    if (!Number.isInteger(outputQuantity) || outputQuantity <= 0) {
      setFinishError("Indica las unidades producidas (mayor que cero).");
      return;
    }

    const lastStage = finishOrder.stages[finishOrder.stages.length - 1];
    const maxOutput = lastStage ? lastStage.outputQuantity : finishOrder.inputQuantity;
    if (outputQuantity > maxOutput) {
      setFinishError(
        `No puedes empacar más de ${maxOutput}: es lo que salió en la última etapa.`
      );
      return;
    }

    setFinishing(true);

    try {
      await api.post(`/production/${finishOrder.id}/finish`, {
        outputPresentationId:
          finishForm.outputPresentationId || finishOrder.output?.presentationId || undefined,
        outputQuantity,
      });

      setFinishOrder(null);
      await load();
    } catch (error) {
      setFinishError(
        error instanceof ApiError
          ? error.message
          : "No fue posible finalizar la orden."
      );
    } finally {
      setFinishing(false);
    }
  }

  // ----------------------------------------------------------
  //  Cancelar (devuelve la materia prima a bodega)
  // ----------------------------------------------------------
  async function handleCancel(order: ProductionOrder) {
    if (!window.confirm(`¿Cancelar ${order.number}? La materia prima volverá a bodega.`)) {
      return;
    }

    try {
      await api.post(`/production/${order.id}/cancel`);
      await load();
    } catch (error) {
      window.alert(
        error instanceof ApiError
          ? error.message
          : "No fue posible cancelar la orden."
      );
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
            Producción
          </h1>

          <p className="text-stone-500 mt-2">
            Órdenes, etapas (trilla, tueste…) y mermas (R4).
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setCreateError(null);
            setCreateOpen(true);
          }}
          className="flex items-center gap-2 bg-[#6F4E37] hover:bg-[#5B3F2D] text-white px-5 py-3 rounded-xl font-semibold transition shrink-0"
        >
          <Plus size={20} />
          Nueva orden
        </button>
      </div>

      {/* RESUMEN */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-5">
        <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-stone-500 truncate">Órdenes en proceso</p>

              <p className="text-lg sm:text-3xl font-bold mt-1.5 sm:mt-2 truncate">{inProcess.length}</p>
            </div>

            <div className="bg-stone-100 p-2.5 sm:p-3 rounded-xl text-[#6F4E37] shrink-0">
              <ClipboardList size={22} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-stone-500 truncate">Materia prima procesada</p>

              <p className="text-lg sm:text-3xl font-bold mt-1.5 sm:mt-2 truncate">{totalProcessed} kg</p>
            </div>

            <div className="bg-stone-100 p-2.5 sm:p-3 rounded-xl text-[#6F4E37] shrink-0">
              <Coffee size={22} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-stone-500 truncate">Unidades producidas</p>

              <p className="text-lg sm:text-3xl font-bold mt-1.5 sm:mt-2 truncate">{totalFinishedUnits}</p>
            </div>

            <div className="bg-stone-100 p-2.5 sm:p-3 rounded-xl text-[#6F4E37] shrink-0">
              <Package size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* FILTRO DE ESTADO */}
      <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-4 flex flex-wrap items-center gap-2">
        {(["", "EN_PROCESO", "FINALIZADA", "CANCELADA"] as const).map((value) => (
          <button
            key={value || "todas"}
            type="button"
            onClick={() => setStatusFilter(value)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              statusFilter === value
                ? "bg-[#6F4E37] text-white"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {value ? STATUS_LABELS[value] : "Todas"}
          </button>
        ))}
      </div>

      {/* CONTENIDO */}
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 text-[#6F4E37]">
          <Loader2 size={26} className="animate-spin" />

          <p className="text-sm font-medium">Cargando producción…</p>
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
      ) : orders.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm py-16 text-center">
          <Factory size={32} className="mx-auto text-stone-300" />

          <p className="mt-4 text-sm text-stone-500">
            No hay órdenes de producción{statusFilter ? " con este estado" : ""}.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const lastStage = order.stages[order.stages.length - 1];
            const expectedInput = lastStage
              ? lastStage.outputQuantity
              : order.inputQuantity;

            return (
              <div
                key={order.id}
                className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden"
              >
                {/* CABECERA DE LA ORDEN */}
                <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="text-lg font-bold text-stone-900">
                        {order.number}
                      </p>

                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          STATUS_STYLES[order.status]
                        }`}
                      >
                        {STATUS_LABELS[order.status]}
                      </span>
                    </div>

                    <p className="text-sm text-stone-500 mt-1">
                      {order.rawMaterial.product} · {order.rawMaterial.presentation} →{" "}
                      {order.output
                        ? `${order.output.product} · ${order.output.presentation}`
                        : "producto por definir"}
                    </p>

                    <p className="text-xs text-stone-400 mt-1">
                      Inició {new Date(order.startedAt).toLocaleDateString("es-CO")}
                      {order.finishedAt &&
                        ` · Terminó ${new Date(order.finishedAt).toLocaleDateString("es-CO")}`}
                      {" · "}
                      Rendimiento: {order.yieldPercent}%
                    </p>
                  </div>

                  {order.status === "EN_PROCESO" && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setStageError(null);
                          setStageForm({
                            type: "TRILLA",
                            outputQuantity: String(expectedInput),
                            notes: "",
                          });
                          setStageOrder(order);
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#6F4E37] hover:bg-[#5B3F2D] text-white text-sm font-semibold transition-colors"
                      >
                        <Plus size={16} />
                        Agregar etapa
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setFinishError(null);
                          setFinishForm({
                            outputPresentationId: order.output?.presentationId ?? "",
                            outputQuantity: String(expectedInput),
                          });
                          setFinishOrder(order);
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
                      >
                        <CheckCircle2 size={16} />
                        Finalizar
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleCancel(order)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-red-50 hover:text-red-600 text-sm font-semibold transition-colors"
                      >
                        <Trash2 size={16} />
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>

                {/* ETAPAS */}
                {order.stages.length > 0 && (
                  <div className="border-t border-stone-100 px-6 py-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Coffee size={16} className="text-[#6F4E37] shrink-0" />

                      {order.stages.map((stage, index) => (
                        <div key={stage.id} className="flex items-center gap-3">
                          {index > 0 && (
                            <ArrowRight size={14} className="text-stone-300" />
                          )}

                          <div className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm">
                            <span className="font-semibold text-stone-800">
                              {STAGE_LABELS[stage.type]}
                            </span>{" "}
                            <span className="text-stone-500">
                              {stage.inputQuantity} → {stage.outputQuantity} kg
                            </span>{" "}
                            <span className="text-amber-600 font-medium">
                              (merma {stage.waste})
                            </span>
                          </div>
                        </div>
                      ))}

                      {order.output && (
                        <>
                          <ArrowRight size={14} className="text-stone-300" />

                          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-sm">
                            <span className="font-semibold text-emerald-700">
                              Empaque: {order.output.quantity} u.
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------
          MODAL: NUEVA ORDEN
      ------------------------------------------------------ */}
      {createOpen && (
        <Modal
          icon={Factory}
          title="Nueva orden de producción"
          subtitle="La materia prima saldrá de bodega al crearla."
          onClose={() => setCreateOpen(false)}
          onSubmit={(event) => void handleCreate(event)}
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
                disabled={creating}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#6F4E37] hover:bg-[#5B3F2D] text-white disabled:opacity-60 transition-colors"
              >
                {creating ? "Creando…" : "Crear orden"}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
              {createError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                  {createError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Materia prima *
                </label>

                <Select
                  value={createForm.rawMaterialPresentationId}
                  onChange={(value) =>
                    setCreateForm({
                      ...createForm,
                      rawMaterialPresentationId: value,
                    })
                  }
                  placeholder="Seleccionar materia prima…"
                  aria-label="Materia prima"
                  options={rawOptions.map((option) => ({
                    value: option.presentationId,
                    label: option.label,
                    icon: Coffee,
                  }))}
                />

                {rawOptions.length === 0 && (
                  <p className="text-xs text-amber-600 mt-2">
                    No hay productos categorizados como MATERIA_PRIMA. Crea uno
                    en Productos para poder producir.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Cantidad (kg) *
                  </label>

                  <input
                    type="number"
                    required
                    min="1"
                    step="1"
                    placeholder="200"
                    value={createForm.inputQuantity}
                    onChange={(event) =>
                      setCreateForm({
                        ...createForm,
                        inputQuantity: event.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Producto terminado
                  </label>

                  <Select
                    value={createForm.outputPresentationId}
                    onChange={(value) =>
                      setCreateForm({
                        ...createForm,
                        outputPresentationId: value,
                      })
                    }
                    placeholder="Definir al finalizar"
                    aria-label="Producto de salida"
                    options={finishedOptions.map((option) => ({
                      value: option.presentationId,
                      label: option.label,
                      icon: Package,
                    }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Notas
                </label>

                <textarea
                  rows={2}
                  placeholder="Ej. Lote de pergamino del norte…"
                  value={createForm.notes}
                  onChange={(event) =>
                    setCreateForm({ ...createForm, notes: event.target.value })
                  }
                  className={inputClass}
                />
              </div>
          </div>
        </Modal>
      )}

      {/* ------------------------------------------------------
          MODAL: AGREGAR ETAPA
      ------------------------------------------------------ */}
      {stageOrder && (
        <Modal
          icon={ArrowRight}
          title={`Agregar etapa · ${stageOrder.number}`}
          subtitle={`Entra ${
            stageOrder.stages[stageOrder.stages.length - 1]?.outputQuantity ??
            stageOrder.inputQuantity
          } kg (la etapa anterior).`}
          onClose={() => setStageOrder(null)}
          onSubmit={(event) => void handleAddStage(event)}
          size="md"
          footer={
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setStageOrder(null)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-stone-600 hover:bg-stone-200 transition-colors"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={savingStage}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#6F4E37] hover:bg-[#5B3F2D] text-white disabled:opacity-60 transition-colors"
              >
                {savingStage ? "Guardando…" : "Registrar etapa"}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
              {stageError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                  {stageError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Tipo de etapa *
                </label>

                <Select
                  value={stageForm.type}
                  onChange={(value) =>
                    setStageForm({
                      ...stageForm,
                      type: value as StageType,
                    })
                  }
                  aria-label="Tipo de etapa"
                  options={STAGE_TYPES.map((type) => ({
                    value: type,
                    label: STAGE_LABELS[type],
                    icon:
                      type === "TRILLA"
                        ? Scissors
                        : type === "TUESTE"
                          ? Flame
                          : type === "LAVADO"
                            ? Droplet
                            : type === "SECADO"
                              ? Sun
                              : type === "EMPAQUE"
                                ? Package
                                : ClipboardList,
                  }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Cantidad de salida (kg) *
                </label>

                <input
                  type="number"
                  required
                  min="0"
                  step="1"
                  value={stageForm.outputQuantity}
                  onChange={(event) =>
                    setStageForm({
                      ...stageForm,
                      outputQuantity: event.target.value,
                    })
                  }
                  className={inputClass}
                />

                <p className="text-xs text-stone-400 mt-2">
                  La diferencia con la entrada será la merma de esta etapa.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Notas
                </label>

                <input
                  type="text"
                  placeholder="Observaciones…"
                  value={stageForm.notes}
                  onChange={(event) =>
                    setStageForm({ ...stageForm, notes: event.target.value })
                  }
                  className={inputClass}
                />
              </div>
          </div>
        </Modal>
      )}

      {/* ------------------------------------------------------
          MODAL: FINALIZAR ORDEN
      ------------------------------------------------------ */}
      {finishOrder && (
        <Modal
          icon={CheckCircle2}
          title={`Finalizar · ${finishOrder.number}`}
          subtitle="El producto terminado entrará a bodega."
          onClose={() => setFinishOrder(null)}
          onSubmit={(event) => void handleFinish(event)}
          size="md"
          footer={
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setFinishOrder(null)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-stone-600 hover:bg-stone-200 transition-colors"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={finishing}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60 transition-colors"
              >
                {finishing ? "Finalizando…" : "Finalizar orden"}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
              {finishError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                  {finishError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Producto terminado *
                </label>

                <Select
                  value={finishForm.outputPresentationId}
                  onChange={(value) =>
                    setFinishForm({
                      ...finishForm,
                      outputPresentationId: value,
                    })
                  }
                  placeholder="Seleccionar presentación…"
                  aria-label="Presentación de salida"
                  options={finishedOptions.map((option) => ({
                    value: option.presentationId,
                    label: option.label,
                    icon: Package,
                  }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Unidades a empacar *
                </label>

                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  value={finishForm.outputQuantity}
                  onChange={(event) =>
                    setFinishForm({
                      ...finishForm,
                      outputQuantity: event.target.value,
                    })
                  }
                  className={inputClass}
                />

                <p className="text-xs text-stone-400 mt-2">
                  Máximo lo que salió en la última etapa.
                </p>
              </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
