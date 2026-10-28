import {
  CircleDollarSign,
  ShoppingCart,
  Clock3,
  AlertTriangle,
} from "lucide-react";

import type { Invoice } from "../../types/api";

type SalesStatsProps = {
  invoices: Invoice[];
};

function formatCurrency(value: number) {
  return value.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

function isToday(iso: string) {
  return (
    new Date(iso).toLocaleDateString("es-CO") ===
    new Date().toLocaleDateString("es-CO")
  );
}

export default function SalesStats({
  invoices,
}: SalesStatsProps) {
  const todaySales = invoices.filter(
    (invoice) =>
      invoice.status !== "ANULADA" &&
      isToday(invoice.issueDate)
  );

  const todayTotal = todaySales.reduce(
    (total, invoice) => total + invoice.total,
    0
  );

  const openInvoices = invoices.filter(
    (invoice) =>
      invoice.status === "PENDIENTE" ||
      invoice.status === "VENCIDA"
  );

  const pendingTotal = openInvoices.reduce(
    (total, invoice) => total + invoice.balance,
    0
  );

  const overdueCount = invoices.filter(
    (invoice) => invoice.status === "VENCIDA"
  ).length;

  const stats = [
    {
      title: "Ventas de hoy",
      value: formatCurrency(todayTotal),
      description: "Facturado hoy (sin anuladas)",
      icon: CircleDollarSign,
    },
    {
      title: "Facturas de hoy",
      value: String(todaySales.length),
      description: "Ventas emitidas hoy",
      icon: ShoppingCart,
    },
    {
      title: "Pendiente por cobrar",
      value: formatCurrency(pendingTotal),
      description: `${openInvoices.length} facturas sin saldar`,
      icon: Clock3,
    },
    {
      title: "Facturas vencidas",
      value: String(overdueCount),
      description: "Vencidas al día de hoy",
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">

      {stats.map((stat) => {
        const Icon = stat.icon;

        return (
          <div
            key={stat.title}
            className="
              bg-white
              border
              border-stone-200
              rounded-2xl
              p-4
              sm:p-5
              shadow-sm
            "
          >
            <div className="flex items-start justify-between gap-2">

              <div className="min-w-0">

                <p className="text-xs sm:text-sm text-stone-500 truncate">
                  {stat.title}
                </p>

                <p className="text-lg sm:text-2xl font-bold text-stone-800 mt-1.5 sm:mt-2 truncate">
                  {stat.value}
                </p>

                <p className="text-[11px] sm:text-xs text-stone-400 mt-1.5 sm:mt-2">
                  {stat.description}
                </p>

              </div>

              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-[#F3EDE7] text-[#6F4E37] flex items-center justify-center shrink-0">
                <Icon size={18} />
              </div>

            </div>
          </div>
        );
      })}

    </div>
  );
}
