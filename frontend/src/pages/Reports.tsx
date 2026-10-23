import {
  BarChart3,
  TrendingUp,
  ShoppingCart,
  ShoppingBag,
  Package,
  DollarSign,
  CalendarDays,
  ArrowUpRight,
} from "lucide-react";

import { useState } from "react";

type Period = "Hoy" | "7 días" | "30 días" | "Este año";

type DailySale = {
  day: string;
  sales: number;
};

type ProductReport = {
  name: string;
  quantity: number;
  total: number;
};

const dailySales: DailySale[] = [
  {
    day: "Lun",
    sales: 820000,
  },
  {
    day: "Mar",
    sales: 1050000,
  },
  {
    day: "Mié",
    sales: 760000,
  },
  {
    day: "Jue",
    sales: 1280000,
  },
  {
    day: "Vie",
    sales: 1450000,
  },
  {
    day: "Sáb",
    sales: 980000,
  },
  {
    day: "Dom",
    sales: 640000,
  },
];

const topProducts: ProductReport[] = [
  {
    name: "Castillo 500 g",
    quantity: 42,
    total: 1680000,
  },
  {
    name: "Chiroso Urrao 250 g",
    quantity: 31,
    total: 1085000,
  },
  {
    name: "Papayo Honey 250 g",
    quantity: 24,
    total: 840000,
  },
  {
    name: "Bourbon Rosado Honey 250 g",
    quantity: 18,
    total: 720000,
  },
  {
    name: "Natural Melaza de Caña 250 g",
    quantity: 15,
    total: 600000,
  },
];

const paymentMethods = [
  {
    name: "Efectivo",
    percentage: 42,
    value: 2940000,
  },
  {
    name: "Transferencia",
    percentage: 35,
    value: 2450000,
  },
  {
    name: "Crédito",
    percentage: 18,
    value: 1260000,
  },
  {
    name: "Otros",
    percentage: 5,
    value: 350000,
  },
];

const formatCurrency = (value: number) => {
  return `$${value.toLocaleString("es-CO")}`;
};

export default function Reports() {
  const [period, setPeriod] = useState<Period>("7 días");

  const totalSales = dailySales.reduce(
    (sum, item) => sum + item.sales,
    0
  );

  const totalProductsSold = topProducts.reduce(
    (sum, product) => sum + product.quantity,
    0
  );

  const totalPurchases = 3200000;

  const estimatedProfit = totalSales - totalPurchases;

  const maxSale = Math.max(
    ...dailySales.map((item) => item.sales)
  );

  return (
    <div className="space-y-8">

      {/* ENCABEZADO */}
      <div className="flex items-center justify-between">

        <div>
          <h1 className="text-4xl font-bold text-stone-900">
            Reportes
          </h1>

          <p className="text-stone-500 mt-2">
            Analiza las ventas, compras y comportamiento del negocio.
          </p>
        </div>

        <div className="flex items-center gap-3">

          <div className="flex items-center gap-2 border border-stone-300 bg-white rounded-xl px-4 py-3">

            <CalendarDays
              size={18}
              className="text-stone-500"
            />

            <select
              value={period}
              onChange={(event) =>
                setPeriod(event.target.value as Period)
              }
              className="
                bg-transparent
                outline-none
                font-medium
                text-stone-700
              "
            >
              <option value="Hoy">
                Hoy
              </option>

              <option value="7 días">
                Últimos 7 días
              </option>

              <option value="30 días">
                Últimos 30 días
              </option>

              <option value="Este año">
                Este año
              </option>
            </select>

          </div>

        </div>

      </div>

      {/* TARJETAS */}
      <div className="grid grid-cols-4 gap-6">

        {/* VENTAS */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">

          <div className="flex items-start justify-between">

            <div>
              <p className="text-sm text-stone-500">
                Ventas
              </p>

              <p className="text-2xl font-bold text-stone-900 mt-2">
                {formatCurrency(totalSales)}
              </p>

              <div className="flex items-center gap-1 mt-3 text-sm text-green-600">
                <ArrowUpRight size={16} />
                +12,5%
              </div>
            </div>

            <div className="bg-stone-100 text-[#6F4E37] p-3 rounded-xl">
              <DollarSign size={24} />
            </div>

          </div>

        </div>

        {/* COMPRAS */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">

          <div className="flex items-start justify-between">

            <div>
              <p className="text-sm text-stone-500">
                Compras
              </p>

              <p className="text-2xl font-bold text-stone-900 mt-2">
                {formatCurrency(totalPurchases)}
              </p>

              <p className="text-sm text-stone-400 mt-3">
                Inversión realizada
              </p>
            </div>

            <div className="bg-stone-100 text-[#6F4E37] p-3 rounded-xl">
              <ShoppingBag size={24} />
            </div>

          </div>

        </div>

        {/* GANANCIA */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">

          <div className="flex items-start justify-between">

            <div>
              <p className="text-sm text-stone-500">
                Ganancia estimada
              </p>

              <p className="text-2xl font-bold text-green-600 mt-2">
                {formatCurrency(estimatedProfit)}
              </p>

              <p className="text-sm text-stone-400 mt-3">
                Ventas - compras
              </p>
            </div>

            <div className="bg-green-50 text-green-600 p-3 rounded-xl">
              <TrendingUp size={24} />
            </div>

          </div>

        </div>

        {/* PRODUCTOS */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">

          <div className="flex items-start justify-between">

            <div>
              <p className="text-sm text-stone-500">
                Productos vendidos
              </p>

              <p className="text-2xl font-bold text-stone-900 mt-2">
                {totalProductsSold}
              </p>

              <p className="text-sm text-stone-400 mt-3">
                Unidades
              </p>
            </div>

            <div className="bg-stone-100 text-[#6F4E37] p-3 rounded-xl">
              <Package size={24} />
            </div>

          </div>

        </div>

      </div>

      {/* GRÁFICA + MÉTODOS DE PAGO */}
      <div className="grid grid-cols-3 gap-6">

        {/* GRÁFICA */}
        <div className="col-span-2 bg-white border border-stone-200 rounded-2xl shadow-sm p-6">

          <div className="flex items-center justify-between mb-8">

            <div>
              <h2 className="text-xl font-semibold text-stone-900">
                Ventas por día
              </h2>

              <p className="text-sm text-stone-500 mt-1">
                Comportamiento de las ventas durante el período.
              </p>
            </div>

            <div className="bg-stone-100 text-[#6F4E37] p-3 rounded-xl">
              <BarChart3 size={22} />
            </div>

          </div>

          <div className="h-72 flex items-end gap-5">

            {dailySales.map((item) => {

              const height =
                (item.sales / maxSale) * 100;

              return (
                <div
                  key={item.day}
                  className="flex-1 h-full flex flex-col justify-end items-center gap-3"
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
                      height: `${height}%`,
                    }}
                  />

                  <span className="text-sm text-stone-500">
                    {item.day}
                  </span>

                </div>
              );
            })}

          </div>

        </div>

        {/* MÉTODOS DE PAGO */}
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

          <div className="space-y-6">

            {paymentMethods.map((method) => (

              <div key={method.name}>

                <div className="flex items-center justify-between mb-2">

                  <span className="text-sm font-medium text-stone-700">
                    {method.name}
                  </span>

                  <span className="text-sm font-semibold text-stone-900">
                    {method.percentage}%
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

            {topProducts.map((product) => {

              const participation =
                (product.total / totalSales) * 100;

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

      </div>

      {/* PIE */}
      <div className="flex items-center justify-between bg-[#6F4E37] text-white rounded-2xl p-6">

        <div className="flex items-center gap-4">

          <div className="bg-white/10 p-3 rounded-xl">
            <BarChart3 size={24} />
          </div>

          <div>
            <p className="font-semibold">
              Resumen del período
            </p>

            <p className="text-sm text-white/70">
              Mostrando información correspondiente a: {period}
            </p>
          </div>

        </div>

        <div className="text-right">

          <p className="text-sm text-white/70">
            Total ventas
          </p>

          <p className="text-2xl font-bold">
            {formatCurrency(totalSales)}
          </p>

        </div>

      </div>

    </div>
  );
}