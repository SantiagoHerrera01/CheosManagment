import { useCallback, useEffect, useState } from "react";

import {
  DollarSign,
  Package,
  Users,
  TriangleAlert,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingCart,
  Loader2,
  RotateCw,
} from "lucide-react";

import { api, ApiError, qs } from "../lib/api";
import { INVOICE_STATUS_LABELS } from "../lib/labels";
import type {
  Alerts,
  Client,
  Invoice,
  Paginated,
  Product,
} from "../types/api";

/** Presentación por debajo de su mínimo (lista de "Stock bajo"). */
type LowStockItem = {
  key: string;
  name: string;
  stock: number;
  minimumStock: number;
};

type DashboardData = {
  todayTotal: number;
  todayCount: number;
  productsCount: number;
  clientsCount: number;
  monthTotal: number;
  monthCount: number;
  receivable: number;
  recent: Invoice[];
  lowStock: LowStockItem[];
  /** Alertas del backend (R8): stock bajo, cartera vencida y producción. */
  alerts: Alerts;
};

const isVoided = (invoice: Invoice) => invoice.status === "ANULADA";

/** Recorre todas las páginas (el backend limita a 100 por request). */
async function fetchAllInvoices(): Promise<Invoice[]> {
  const all: Invoice[] = [];

  for (let page = 1; ; page += 1) {
    const result = await api.get<Paginated<Invoice>>(
      `/invoices${qs({ page, limit: 100 })}`
    );

    all.push(...result.data);

    if (all.length >= result.meta.total || result.data.length === 0) break;
  }

  return all;
}

async function fetchAllProducts(): Promise<Product[]> {
  const all: Product[] = [];

  for (let page = 1; ; page += 1) {
    const result = await api.get<Paginated<Product>>(
      `/products${qs({ page, limit: 100 })}`
    );

    all.push(...result.data);

    if (all.length >= result.meta.total || result.data.length === 0) break;
  }

  return all;
}

function sameDay(iso: string, reference: Date): boolean {
  const date = new Date(iso);

  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  );
}

function greeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) return "Buenos días 👋";
  if (hour < 19) return "Buenas tardes 👋";
  return "Buenas noches 👋";
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  /** Descarga y calcula el resumen (sin tocar estado: apto para el effect). */
  const computeDashboard = useCallback(async (): Promise<DashboardData> => {
    const [invoices, products, clients, alertsResult] = await Promise.all([
      fetchAllInvoices(),
      fetchAllProducts(),
      api.get<Paginated<Client>>(`/clients${qs({ limit: 1 })}`),
      api.get<Alerts>("/reports/alerts").catch(() => null),
    ]);

    const now = new Date();

    const valid = invoices.filter((invoice) => !isVoided(invoice));

    const todaySales = valid.filter((invoice) =>
      sameDay(invoice.issueDate, now)
    );

    const monthSales = valid.filter((invoice) => {
      const date = new Date(invoice.issueDate);

      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth()
      );
    });

    const receivable = valid
      .filter(
        (invoice) =>
          invoice.status === "PENDIENTE" ||
          invoice.status === "VENCIDA"
      )
      .reduce((sum, invoice) => sum + invoice.balance, 0);

    const lowStock: LowStockItem[] = [];

    for (const product of products) {
      for (const presentation of product.presentations) {
        if (presentation.stock <= presentation.minimumStock) {
          lowStock.push({
            key: `${product.id}-${presentation.id}`,
            name: `${product.name} · ${presentation.label}`,
            stock: presentation.stock,
            minimumStock: presentation.minimumStock,
          });
        }
      }
    }

    lowStock.sort((a, b) => a.stock - b.stock);

    // Alertas (R8). Si el endpoint falla, el dashboard sigue mostrando el
    // resto del resumen con una estructura vacía.
    const alerts: Alerts = alertsResult ?? {
      lowStock: [],
      outOfStock: 0,
      overdueInvoices: [],
      overdueBalance: 0,
      inProductionOrders: 0,
    };

    return {
      todayTotal: todaySales.reduce(
        (sum, invoice) => sum + invoice.total,
        0
      ),
      todayCount: todaySales.length,
      productsCount: products.length,
      clientsCount: clients.meta.total,
      monthTotal: monthSales.reduce(
        (sum, invoice) => sum + invoice.total,
        0
      ),
      monthCount: monthSales.length,
      receivable,
      recent: invoices.slice(0, 5),
      lowStock,
      alerts,
    };
  }, []);

  const load = useCallback(() => {
    return computeDashboard()
      .then((result) => {
        setData(result);
      })
      .catch((error: unknown) => {
        setLoadError(
          error instanceof ApiError
            ? error.message
            : "No fue posible cargar el resumen."
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [computeDashboard]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-[#6F4E37]">
        <Loader2 size={26} className="animate-spin" />

        <p className="text-sm font-medium">
          Cargando resumen…
        </p>
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

  const cards = [
    {
      title: "Ventas de hoy",
      value: data.todayTotal.toLocaleString("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0,
      }),
      description:
        data.todayCount > 0
          ? `${data.todayCount} factura${data.todayCount > 1 ? "s" : ""} hoy`
          : "Sin ventas aún hoy",
      icon: DollarSign,
      positive: data.todayTotal > 0,
    },
    {
      title: "Productos",
      value: String(data.productsCount),
      description: "Productos registrados",
      icon: Package,
      positive: true,
    },
    {
      title: "Clientes",
      value: String(data.clientsCount),
      description: "Clientes activos",
      icon: Users,
      positive: true,
    },
    {
      title: "Stock bajo",
      value: String(data.lowStock.length),
      description:
        data.lowStock.length > 0
          ? "Requieren atención"
          : "Todo por encima del mínimo",
      icon: TriangleAlert,
      positive: data.lowStock.length === 0,
    },
  ];

  return (
    <div className="space-y-8">

      {/* ENCABEZADO */}
      <div>
        <h1 className="text-3xl font-bold text-stone-800">
          {greeting()}
        </h1>

        <p className="text-stone-500 mt-2">
          Aquí tienes el resumen de Cheo Manager.
        </p>
      </div>

      {/* TARJETAS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.title}
              className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">

                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-stone-500 truncate">
                    {card.title}
                  </p>

                  <h2 className="text-lg sm:text-2xl font-bold text-stone-800 mt-1.5 sm:mt-2 truncate">
                    {card.value}
                  </h2>
                </div>

                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-[#F3EDE7] text-[#6F4E37] flex items-center justify-center shrink-0">
                  <Icon size={18} />
                </div>
              </div>

              <div className="flex items-center gap-1 mt-3 sm:mt-4 text-[11px] sm:text-xs">
                {card.positive ? (
                  <ArrowUpRight
                    size={14}
                    className="text-green-600"
                  />
                ) : (
                  <ArrowDownRight
                    size={14}
                    className="text-red-500"
                  />
                )}

                <span
                  className={
                    card.positive
                      ? "text-green-600"
                      : "text-red-500"
                  }
                >
                  {card.description}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ALERTAS (R8): cartera vencida, stock bajo/sin stock y producción */}
      {(data.alerts.overdueInvoices.length > 0 ||
        data.alerts.lowStock.length > 0 ||
        data.alerts.inProductionOrders > 0) && (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 bg-amber-50 border-b border-amber-200">
            <TriangleAlert size={19} className="text-amber-600 shrink-0" />

            <h2 className="text-sm font-bold text-amber-800">
              Alertas
            </h2>

            {data.alerts.outOfStock > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                {data.alerts.outOfStock} sin stock
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-stone-100">
            {/* CARTERA VENCIDA */}
            <div className="p-6">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                Cartera vencida ·{" "}
                {data.alerts.overdueBalance.toLocaleString("es-CO", {
                  style: "currency",
                  currency: "COP",
                  maximumFractionDigits: 0,
                })}
              </p>

              {data.alerts.overdueInvoices.length === 0 ? (
                <p className="text-sm text-stone-400 mt-3">
                  Sin facturas vencidas. 🎉
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {data.alerts.overdueInvoices.slice(0, 5).map((alert) => (
                    <li
                      key={alert.id}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="min-w-0 truncate text-stone-700">
                        <span className="font-semibold">{alert.number}</span>{" "}
                        · {alert.client.fullName} ·{" "}
                        <span className="text-red-600 font-medium">
                          {alert.daysOverdue} día
                          {alert.daysOverdue > 1 ? "s" : ""} de mora
                        </span>
                      </span>

                      <span className="font-semibold text-stone-900 whitespace-nowrap">
                        {alert.balance.toLocaleString("es-CO", {
                          style: "currency",
                          currency: "COP",
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* STOCK BAJO */}
            <div className="p-6">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                Stock bajo / agotado
              </p>

              {data.alerts.lowStock.length === 0 ? (
                <p className="text-sm text-stone-400 mt-3">
                  Todo el inventario está por encima de su mínimo.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {data.alerts.lowStock.slice(0, 5).map((alert) => (
                    <li
                      key={alert.presentationId}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="min-w-0 truncate text-stone-700">
                        {alert.product} · {alert.presentation}
                      </span>

                      <span
                        className={`font-semibold whitespace-nowrap ${
                          alert.out ? "text-red-600" : "text-amber-600"
                        }`}
                      >
                        {alert.stock} / mín. {alert.minimumStock}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {data.alerts.inProductionOrders > 0 && (
            <div className="px-6 py-3 bg-stone-50 border-t border-stone-100 text-xs text-stone-500">
              {data.alerts.inProductionOrders} orden
              {data.alerts.inProductionOrders > 1 ? "es" : ""} de producción
              en proceso.
            </div>
          )}
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* VENTAS RECIENTES */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-stone-200 shadow-sm">

          <div className="flex items-center justify-between p-6 border-b border-stone-100">

            <div>
              <h2 className="text-lg font-semibold text-stone-800">
                Ventas recientes
              </h2>

              <p className="text-sm text-stone-500 mt-1">
                Últimas facturas registradas
              </p>
            </div>

            <div className="w-10 h-10 rounded-xl bg-[#F3EDE7] text-[#6F4E37] flex items-center justify-center">
              <ShoppingCart size={19} />
            </div>

          </div>

          {data.recent.length === 0 ? (
            <p className="p-6 text-sm text-stone-500">
              Aún no hay facturas registradas.
            </p>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full">

                <thead>
                  <tr className="border-b border-stone-100 text-left">
                    <th className="px-6 py-4 text-xs font-semibold text-stone-500 uppercase">
                      Factura
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold text-stone-500 uppercase">
                      Cliente
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold text-stone-500 uppercase">
                      Total
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold text-stone-500 uppercase">
                      Estado
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {data.recent.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="border-b border-stone-100 last:border-0 hover:bg-stone-50 transition"
                    >
                      <td className="px-6 py-4">
                        <span className="font-medium text-stone-800">
                          {invoice.number}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-sm text-stone-600">
                        {invoice.client.fullName}
                      </td>

                      <td className="px-6 py-4 text-sm font-semibold text-stone-800">
                        {invoice.total.toLocaleString("es-CO", {
                          style: "currency",
                          currency: "COP",
                          maximumFractionDigits: 0,
                        })}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={
                            invoice.status === "PAGADA"
                              ? "inline-flex px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"
                              : invoice.status === "PENDIENTE"
                                ? "inline-flex px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700"
                                : invoice.status === "VENCIDA"
                                  ? "inline-flex px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700"
                                  : "inline-flex px-3 py-1 rounded-full text-xs font-medium bg-stone-200 text-stone-600"
                          }
                        >
                          {INVOICE_STATUS_LABELS[invoice.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>

              </table>

            </div>
          )}
        </div>

        {/* STOCK BAJO */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm">

          <div className="p-6 border-b border-stone-100">

            <div className="flex items-center gap-3">

              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center">
                <TriangleAlert size={19} />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-stone-800">
                  Stock bajo
                </h2>

                <p className="text-sm text-stone-500">
                  Productos que requieren atención
                </p>
              </div>

            </div>

          </div>

          {data.lowStock.length === 0 ? (
            <p className="p-6 text-sm text-stone-500">
              Ninguna presentación está por debajo de su mínimo. ✓
            </p>
          ) : (
            <div className="p-6 space-y-5">

              {data.lowStock.slice(0, 6).map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-4"
                >

                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-800 truncate">
                      {item.name}
                    </p>

                    <p className="text-xs text-stone-500 mt-1">
                      Mínimo {item.minimumStock}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">

                    <span className="text-sm font-bold text-red-500">
                      {item.stock}
                    </span>

                    <p className="text-xs text-stone-400">
                      unidades
                    </p>

                  </div>

                </div>
              ))}

              {data.lowStock.length > 6 && (
                <p className="text-xs text-stone-400">
                  +{data.lowStock.length - 6} presentaciones más.
                </p>
              )}

            </div>
          )}

        </div>

      </div>

      {/* RESUMEN INFERIOR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        <div className="bg-[#6F4E37] text-white rounded-2xl p-6">
          <p className="text-sm text-white/70">
            Ventas del mes
          </p>

          <h3 className="text-2xl font-bold mt-2">
            {data.monthTotal.toLocaleString("es-CO", {
              style: "currency",
              currency: "COP",
              maximumFractionDigits: 0,
            })}
          </h3>

          <p className="text-xs text-white/60 mt-2">
            {data.monthCount} factura
            {data.monthCount === 1 ? "" : "s"} en el mes
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <p className="text-sm text-stone-500">
            Cuentas por cobrar
          </p>

          <h3 className="text-2xl font-bold text-stone-800 mt-2">
            {data.receivable.toLocaleString("es-CO", {
              style: "currency",
              currency: "COP",
              maximumFractionDigits: 0,
            })}
          </h3>

          <p className="text-xs text-stone-500 mt-2">
            Saldo pendiente de pago
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <p className="text-sm text-stone-500">
            Facturas del mes
          </p>

          <h3 className="text-2xl font-bold text-stone-800 mt-2">
            {data.monthCount}
          </h3>

          <p className="text-xs text-stone-500 mt-2">
            Facturación registrada en el período
          </p>
        </div>

      </div>

    </div>
  );
}
