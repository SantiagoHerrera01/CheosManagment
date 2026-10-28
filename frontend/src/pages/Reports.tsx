import {
  BarChart3,
  TrendingUp,
  ShoppingCart,
  Receipt,
  Package,
  DollarSign,
  CalendarDays,
  ArrowUpRight,
  Loader2,
  RotateCw,
} from "lucide-react";

import { useCallback, useEffect, useMemo, useState } from "react";

import { api, ApiError, qs } from "../lib/api";
import { PAYMENT_METHOD_LABELS } from "../lib/labels";
import Select from "../components/ui/Select";
import type {
  Invoice,
  Paginated,
  PaymentMethod,
  ProfitReport,
} from "../types/api";

type Period = "hoy" | "7" | "30" | "year";

const PERIOD_LABELS: Record<Period, string> = {
  hoy: "Hoy",
  "7": "Últimos 7 días",
  "30": "Últimos 30 días",
  year: "Este año",
};

type DailySale = {
  day: string;
  sales: number;
  /** Instante (ms) del inicio del día: sirve como clave única. */
  key: number;
};

type ProductReport = {
  name: string;
  quantity: number;
  total: number;
};

type MethodReport = {
  name: string;
  percentage: number;
  value: number;
};

type ReportData = {
  totalSales: number;
  invoiceCount: number;
  unitsSold: number;
  dailySales: DailySale[];
  topProducts: ProductReport[];
  paymentMethods: MethodReport[];
};

const formatCurrency = (value: number) =>
  `$${value.toLocaleString("es-CO")}`;

/** Rango [from, to] en ISO para el período elegido. */
function periodRange(period: Period): { from: string; to: string } {
  const now = new Date();

  const endOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999
  );

  let from: Date;

  if (period === "hoy") {
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === "year") {
    from = new Date(now.getFullYear(), 0, 1);
  } else {
    const days = Number(period);
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));
  }

  return { from: from.toISOString(), to: endOfDay.toISOString() };
}

/** Recorre todas las páginas del rango (máx. 100 por request). */
async function fetchInvoices(from: string, to: string): Promise<Invoice[]> {
  const all: Invoice[] = [];

  for (let page = 1; ; page += 1) {
    const result = await api.get<Paginated<Invoice>>(
      `/invoices${qs({ from, to, withItems: "true", page, limit: 100 })}`
    );

    all.push(...result.data);

    if (all.length >= result.meta.total || result.data.length === 0) break;
  }

  return all;
}

function buildReport(invoices: Invoice[]): ReportData {
  const valid = invoices.filter((invoice) => invoice.status !== "ANULADA");

  const totalSales = valid.reduce((sum, invoice) => sum + invoice.total, 0);

  // --- Ventas agrupadas por día (fecha local de la factura) ---
  // Se guarda el instante del inicio del día para poder ordenar
  // cronológicamente sin depender del formato de la etiqueta.
  const byDay = new Map<number, { label: string; sales: number }>();

  for (const invoice of valid) {
    const date = new Date(invoice.issueDate);

    const startOfDay = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    ).getTime();

    const current = byDay.get(startOfDay) ?? {
      label: new Date(startOfDay).toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "2-digit",
      }),
      sales: 0,
    };

    current.sales += invoice.total;
    byDay.set(startOfDay, current);
  }

  const dailySales: DailySale[] = [...byDay.entries()]
    .sort(([a], [b]) => a - b)
    .map(([timestamp, value]) => ({
      day: value.label,
      sales: value.sales,
      // Clave única por instante (evita colisiones de etiquetas).
      key: timestamp,
    }));

  // --- Productos más vendidos ---
  const byProduct = new Map<
    string,
    { quantity: number; total: number }
  >();

  let unitsSold = 0;

  for (const invoice of valid) {
    for (const item of invoice.items ?? []) {
      const key = `${item.productName} · ${item.presentationLabel}`;
      const current = byProduct.get(key) ?? { quantity: 0, total: 0 };

      current.quantity += item.quantity;
      current.total += item.subtotal;

      byProduct.set(key, current);
      unitsSold += item.quantity;
    }
  }

  const topProducts: ProductReport[] = [...byProduct.entries()]
    .map(([name, value]) => ({ name, ...value }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // --- Métodos de pago ---
  const byMethod = new Map<PaymentMethod, number>();

  for (const invoice of valid) {
    byMethod.set(
      invoice.paymentMethod,
      (byMethod.get(invoice.paymentMethod) ?? 0) + invoice.total
    );
  }

  const paymentMethods: MethodReport[] = [...byMethod.entries()]
    .map(([method, value]) => ({
      name: PAYMENT_METHOD_LABELS[method] ?? method,
      value,
      percentage: totalSales > 0 ? (value / totalSales) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  return {
    totalSales,
    invoiceCount: valid.length,
    unitsSold,
    dailySales,
    topProducts,
    paymentMethods,
  };
}

export default function Reports() {
  const [period, setPeriod] = useState<Period>("7");
  const [data, setData] = useState<ReportData | null>(null);
  /** Utilidad (R7) calculada por el backend: facturado − costo − gastos. */
  const [profit, setProfit] = useState<ProfitReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(() => {
    const { from, to } = periodRange(period);

    return Promise.all([
      fetchInvoices(from, to),
      api.get<ProfitReport>(`/reports/profit${qs({ from, to })}`),
    ])
      .then(([invoices, profitReport]) => {
        setData(buildReport(invoices));
        setProfit(profitReport);
      })
      .catch((error: unknown) => {
        setLoadError(
          error instanceof ApiError
            ? error.message
            : "No fue posible cargar el reporte."
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [period]);

  useEffect(() => {
    void load();
  }, [load]);

  const maxSale = useMemo(
    () =>
      data && data.dailySales.length > 0
        ? Math.max(...data.dailySales.map((item) => item.sales))
        : 1,
    [data]
  );

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-[#6F4E37]">
        <Loader2 size={26} className="animate-spin" />

        <p className="text-sm font-medium">Generando reporte…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4">
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
    );
  }

  if (!data) return null;

  const averageTicket =
    data.invoiceCount > 0 ? data.totalSales / data.invoiceCount : 0;

  return (
    <div className="space-y-8">

      {/* ENCABEZADO */}
      <div className="flex items-center justify-between">

        <div>
          <h1 className="text-4xl font-bold text-stone-900">
            Reportes
          </h1>

          <p className="text-stone-500 mt-2">
            Analiza las ventas y el comportamiento del negocio.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">

            <Select
              value={period}
              onChange={(value) =>
                setPeriod(value as Period)
              }
              aria-label="Periodo"
              className="font-medium text-stone-700"
              options={[
                { value: "hoy", label: "Hoy", icon: CalendarDays },
                { value: "7", label: "Últimos 7 días", icon: CalendarDays },
                { value: "30", label: "Últimos 30 días", icon: CalendarDays },
                { value: "year", label: "Este año", icon: CalendarDays },
              ]}
            />

          </div>

      </div>

      {/* TARJETAS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">

        <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-6 shadow-sm">

          <div className="flex items-start justify-between">

            <div>
              <p className="text-sm text-stone-500">Ventas</p>

              <p className="text-lg sm:text-2xl font-bold text-stone-900 mt-1.5 sm:mt-2 truncate">
                {formatCurrency(data.totalSales)}
              </p>

              <div className="flex items-center gap-1 mt-3 text-sm text-green-600">
                <ArrowUpRight size={16} />
                {data.invoiceCount} facturas
              </div>
            </div>

            <div className="bg-stone-100 text-[#6F4E37] p-2.5 sm:p-3 rounded-xl shrink-0">
              <DollarSign size={24} />
            </div>

          </div>

        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-6 shadow-sm">

          <div className="flex items-start justify-between">

            <div>
              <p className="text-sm text-stone-500">
                Ticket promedio
              </p>

              <p className="text-lg sm:text-2xl font-bold text-stone-900 mt-1.5 sm:mt-2 truncate">
                {formatCurrency(averageTicket)}
              </p>

              <p className="text-sm text-stone-400 mt-3">
                Por factura
              </p>
            </div>

            <div className="bg-stone-100 text-[#6F4E37] p-2.5 sm:p-3 rounded-xl shrink-0">
              <Receipt size={24} />
            </div>

          </div>

        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-6 shadow-sm">

          <div className="flex items-start justify-between">

            <div>
              <p className="text-sm text-stone-500">Facturas</p>

              <p className="text-lg sm:text-2xl font-bold text-stone-900 mt-1.5 sm:mt-2 truncate">
                {data.invoiceCount}
              </p>

              <p className="text-sm text-stone-400 mt-3">
                Excluye anuladas
              </p>
            </div>

            <div className="bg-stone-100 text-[#6F4E37] p-2.5 sm:p-3 rounded-xl shrink-0">
              <ShoppingCart size={24} />
            </div>

          </div>

        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-6 shadow-sm">

          <div className="flex items-start justify-between">

            <div>
              <p className="text-sm text-stone-500">
                Unidades vendidas
              </p>

              <p className="text-lg sm:text-2xl font-bold text-stone-900 mt-1.5 sm:mt-2 truncate">
                {data.unitsSold}
              </p>

              <p className="text-sm text-stone-400 mt-3">
                Productos en el período
              </p>
            </div>

            <div className="bg-stone-100 text-[#6F4E37] p-2.5 sm:p-3 rounded-xl shrink-0">
              <Package size={24} />
            </div>

          </div>

        </div>

      </div>

      {/* UTILIDAD DEL PERÍODO (R7): facturado − costo de lo vendido − gastos */}
      {profit && (
        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">

          <div className="p-6 border-b border-stone-100 flex items-center justify-between">

            <div>
              <h2 className="text-xl font-semibold text-stone-900">
                Utilidad del período
              </h2>

              <p className="text-sm text-stone-500 mt-1">
                Calculada con el costo real de cada factura y los gastos
                registrados.
              </p>
            </div>

            <div className="bg-stone-100 text-[#6F4E37] p-2.5 sm:p-3 rounded-xl shrink-0">
              <TrendingUp size={22} />
            </div>

          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-stone-100">

            <div className="p-6">
              <p className="text-sm text-stone-500">Facturado</p>

              <p className="text-xl font-bold text-stone-900 mt-2">
                {formatCurrency(profit.invoiced)}
              </p>

              <p className="text-xs text-stone-400 mt-2">
                {profit.invoicesCount} facturas
              </p>
            </div>

            <div className="p-6">
              <p className="text-sm text-stone-500">Costo de lo vendido</p>

              <p className="text-xl font-bold text-red-600 mt-2">
                −{formatCurrency(profit.costOfSales)}
              </p>

              <p className="text-xs text-stone-400 mt-2">
                Costo real (unitCost × cantidad)
              </p>
            </div>

            <div className="p-6">
              <p className="text-sm text-stone-500">Utilidad bruta</p>

              <p
                className={`text-xl font-bold mt-2 ${
                  profit.grossProfit >= 0
                    ? "text-stone-900"
                    : "text-red-600"
                }`}
              >
                {formatCurrency(profit.grossProfit)}
              </p>

              <p className="text-xs text-stone-400 mt-2">
                Margen {profit.grossMargin.toFixed(1)}%
              </p>
            </div>

            <div className="p-6">
              <p className="text-sm text-stone-500">Gastos</p>

              <p className="text-xl font-bold text-red-600 mt-2">
                −{formatCurrency(profit.expenses)}
              </p>

              <p className="text-xs text-stone-400 mt-2">
                {profit.expenseCount} gasto
                {profit.expenseCount === 1 ? "" : "s"} en el período
              </p>
            </div>

            <div className="p-6 bg-stone-50">
              <p className="text-sm font-semibold text-stone-700">
                Utilidad neta
              </p>

              <p
                className={`text-xl font-bold mt-2 ${
                  profit.netProfit >= 0
                    ? "text-emerald-600"
                    : "text-red-600"
                }`}
              >
                {formatCurrency(profit.netProfit)}
              </p>

              <p className="text-xs text-stone-400 mt-2">
                Margen {profit.netMargin.toFixed(1)}%
              </p>
            </div>

          </div>

        </div>
      )}

      {/* GRÁFICA + MÉTODOS DE PAGO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div className="lg:col-span-2 bg-white border border-stone-200 rounded-2xl shadow-sm p-6">

          <div className="flex items-center justify-between mb-8">

            <div>
              <h2 className="text-xl font-semibold text-stone-900">
                Ventas por día
              </h2>

              <p className="text-sm text-stone-500 mt-1">
                Comportamiento de las ventas durante el período.
              </p>
            </div>

            <div className="bg-stone-100 text-[#6F4E37] p-2.5 sm:p-3 rounded-xl shrink-0">
              <BarChart3 size={22} />
            </div>

          </div>

          {data.dailySales.length === 0 ? (
            <p className="h-72 flex items-center justify-center text-sm text-stone-500">
              No hay ventas en este período.
            </p>
          ) : (
            <div className="h-72 flex items-end gap-5 overflow-x-auto">

              {data.dailySales.map((item) => (
                <div
                  key={item.key}
                  className="flex-1 min-w-16 h-full flex flex-col justify-end items-center gap-3"
                >

                  <div className="text-xs font-semibold text-stone-500">
                    {formatCurrency(item.sales)}
                  </div>

                  <div
                    className="
                      w-full
                      max-w-14
                      bg-[#6F4E37]
                      hover:bg-[#5B3F2D]
                      rounded-t-lg
                      transition-all
                    "
                    style={{
                      height: `${Math.max(
                        (item.sales / maxSale) * 100,
                        4
                      )}%`,
                    }}
                  />

                  <span className="text-sm text-stone-500">
                    {item.day}
                  </span>

                </div>
              ))}

            </div>
          )}

        </div>

        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-6">

          <div className="flex items-center justify-between mb-7">

            <div>
              <h2 className="text-xl font-semibold text-stone-900">
                Métodos de pago
              </h2>

              <p className="text-sm text-stone-500 mt-1">
                Distribución de las ventas.
              </p>
            </div>

            <ShoppingCart
              size={22}
              className="text-[#6F4E37]"
            />

          </div>

          {data.paymentMethods.length === 0 ? (
            <p className="text-sm text-stone-500">
              Sin ventas en el período.
            </p>
          ) : (
            <div className="space-y-6">

              {data.paymentMethods.map((method) => (
                <div key={method.name}>

                  <div className="flex items-center justify-between mb-2">

                    <span className="text-sm font-medium text-stone-700">
                      {method.name}
                    </span>

                    <span className="text-sm font-semibold text-stone-900">
                      {method.percentage.toFixed(0)}%
                    </span>

                  </div>

                  <div className="h-2 bg-stone-100 rounded-full overflow-hidden">

                    <div
                      className="h-full bg-[#6F4E37] rounded-full"
                      style={{
                        width: `${method.percentage}%`,
                      }}
                    />

                  </div>

                  <p className="text-xs text-stone-400 mt-1">
                    {formatCurrency(method.value)}
                  </p>

                </div>
              ))}

            </div>
          )}

        </div>

      </div>

      {/* PRODUCTOS MÁS VENDIDOS */}
      <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">

        <div className="p-6 border-b border-stone-200 flex items-center justify-between">

          <div>
            <h2 className="text-xl font-semibold text-stone-900">
              Productos más vendidos
            </h2>

            <p className="text-sm text-stone-500 mt-1">
              Productos con mayor movimiento en ventas.
            </p>
          </div>

          <Package
            size={22}
            className="text-[#6F4E37]"
          />

        </div>

        {data.topProducts.length === 0 ? (
          <p className="p-6 text-sm text-stone-500">
            No hay productos vendidos en este período.
          </p>
        ) : (
          <table className="w-full">

            <thead className="bg-stone-50 border-b border-stone-200">

              <tr className="text-left text-sm text-stone-500">

                <th className="px-6 py-4 font-semibold">
                  PRODUCTO
                </th>

                <th className="px-6 py-4 font-semibold">
                  UNIDADES VENDIDAS
                </th>

                <th className="px-6 py-4 font-semibold">
                  VENTAS
                </th>

                <th className="px-6 py-4 font-semibold">
                  PARTICIPACIÓN
                </th>

              </tr>

            </thead>

            <tbody>

              {data.topProducts.map((product) => {

                const participation =
                  data.totalSales > 0
                    ? (product.total / data.totalSales) * 100
                    : 0;

                return (
                  <tr
                    key={product.name}
                    className="
                      border-b
                      border-stone-100
                      hover:bg-stone-50
                      transition
                    "
                  >

                    <td className="px-6 py-5">

                      <span className="font-semibold text-stone-900">
                        {product.name}
                      </span>

                    </td>

                    <td className="px-6 py-5 text-stone-600">
                      {product.quantity}
                    </td>

                    <td className="px-6 py-5 font-semibold">
                      {formatCurrency(product.total)}
                    </td>

                    <td className="px-6 py-5">

                      <div className="flex items-center gap-3">

                        <div className="w-32 h-2 bg-stone-100 rounded-full overflow-hidden">

                          <div
                            className="h-full bg-[#6F4E37] rounded-full"
                            style={{
                              width: `${Math.min(
                                participation * 2,
                                100
                              )}%`,
                            }}
                          />

                        </div>

                        <span className="text-sm text-stone-500">
                          {participation.toFixed(1)}%
                        </span>

                      </div>

                    </td>

                  </tr>
                );
              })}

            </tbody>

          </table>
        )}

      </div>

      {/* PIE */}
      <div className="flex items-center justify-between bg-[#6F4E37] text-white rounded-2xl p-6">

        <div className="flex items-center gap-4">

          <div className="bg-white/10 p-3 rounded-xl">
            <TrendingUp size={24} />
          </div>

          <div>
            <p className="font-semibold">
              Resumen del período
            </p>

            <p className="text-sm text-white/70">
              Mostrando información correspondiente a:{" "}
              {PERIOD_LABELS[period]}
            </p>
          </div>

        </div>

        <div className="text-right">

          <p className="text-sm text-white/70">
            Total ventas
          </p>

          <p className="text-2xl font-bold">
            {formatCurrency(data.totalSales)}
          </p>

        </div>

      </div>

    </div>
  );
}
