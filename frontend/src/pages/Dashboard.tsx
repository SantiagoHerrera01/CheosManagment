import {
  DollarSign,
  Package,
  Users,
  TriangleAlert,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingCart,
} from "lucide-react";

const cards = [
  {
    title: "Ventas de hoy",
    value: "$1.250.000",
    description: "+12,5% respecto a ayer",
    icon: DollarSign,
    positive: true,
  },
  {
    title: "Productos",
    value: "152",
    description: "Productos registrados",
    icon: Package,
    positive: true,
  },
  {
    title: "Clientes",
    value: "84",
    description: "Clientes registrados",
    icon: Users,
    positive: true,
  },
  {
    title: "Stock bajo",
    value: "7",
    description: "Requieren atención",
    icon: TriangleAlert,
    positive: false,
  },
];

const recentSales = [
  {
    id: "#000124",
    customer: "Cliente general",
    amount: "$85.000",
    status: "Pagada",
  },
  {
    id: "#000123",
    customer: "Juan Pérez",
    amount: "$140.000",
    status: "Pagada",
  },
  {
    id: "#000122",
    customer: "Café La Montaña",
    amount: "$280.000",
    status: "Pendiente",
  },
  {
    id: "#000121",
    customer: "María Gómez",
    amount: "$56.000",
    status: "Pagada",
  },
];

const lowStockProducts = [
  {
    name: "CHEO'S Tradicional 125 g",
    stock: 4,
  },
  {
    name: "Chiroso Urrao 250 g",
    stock: 3,
  },
  {
    name: "Papayo Honey 250 g",
    stock: 2,
  },
  {
    name: "Bourbon Rosado Honey 250 g",
    stock: 1,
  },
];

export default function Dashboard() {
  return (
    <div className="space-y-8">

      {/* ENCABEZADO */}
      <div>
        <h1 className="text-3xl font-bold text-stone-800">
          Buenos días 👋
        </h1>

        <p className="text-stone-500 mt-2">
          Aquí tienes el resumen de Cheo Manager.
        </p>
      </div>

      {/* TARJETAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.title}
              className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">

                <div>
                  <p className="text-sm text-stone-500">
                    {card.title}
                  </p>

                  <h2 className="text-2xl font-bold text-stone-800 mt-2">
                    {card.value}
                  </h2>
                </div>

                <div className="w-11 h-11 rounded-xl bg-[#F3EDE7] text-[#6F4E37] flex items-center justify-center">
                  <Icon size={21} />
                </div>
              </div>

              <div className="flex items-center gap-1 mt-4 text-xs">
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
                {recentSales.map((sale) => (
                  <tr
                    key={sale.id}
                    className="border-b border-stone-100 last:border-0 hover:bg-stone-50 transition"
                  >
                    <td className="px-6 py-4">
                      <span className="font-medium text-stone-800">
                        {sale.id}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-sm text-stone-600">
                      {sale.customer}
                    </td>

                    <td className="px-6 py-4 text-sm font-semibold text-stone-800">
                      {sale.amount}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={
                          sale.status === "Pagada"
                            ? "inline-flex px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"
                            : "inline-flex px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700"
                        }
                      >
                        {sale.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>

            </table>

          </div>
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

          <div className="p-6 space-y-5">

            {lowStockProducts.map((product) => (
              <div
                key={product.name}
                className="flex items-center justify-between gap-4"
              >

                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-800 truncate">
                    {product.name}
                  </p>

                  <p className="text-xs text-stone-500 mt-1">
                    Inventario disponible
                  </p>
                </div>

                <div className="shrink-0 text-right">

                  <span className="text-sm font-bold text-red-500">
                    {product.stock}
                  </span>

                  <p className="text-xs text-stone-400">
                    unidades
                  </p>

                </div>

              </div>
            ))}

          </div>

        </div>

      </div>

      {/* RESUMEN INFERIOR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        <div className="bg-[#6F4E37] text-white rounded-2xl p-6">
          <p className="text-sm text-white/70">
            Ventas del mes
          </p>

          <h3 className="text-2xl font-bold mt-2">
            $18.450.000
          </h3>

          <p className="text-xs text-white/60 mt-2">
            Total acumulado del mes
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <p className="text-sm text-stone-500">
            Cuentas por cobrar
          </p>

          <h3 className="text-2xl font-bold text-stone-800 mt-2">
            $4.280.000
          </h3>

          <p className="text-xs text-stone-500 mt-2">
            Pendiente de pago
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <p className="text-sm text-stone-500">
            Ganancia estimada
          </p>

          <h3 className="text-2xl font-bold text-green-600 mt-2">
            $7.820.000
          </h3>

          <p className="text-xs text-stone-500 mt-2">
            Según ventas registradas
          </p>
        </div>

      </div>

    </div>
  );
}