import {
  Search,
  ShoppingBag,
  Package,
  CircleDollarSign,
  Clock3,
  Plus,
  Eye,
} from "lucide-react";

import { useMemo, useState } from "react";

type PurchaseStatus = "Recibida" | "Pendiente";

type Purchase = {
  id: number;
  invoice: string;
  supplier: string;
  date: string;
  products: number;
  total: number;
  status: PurchaseStatus;
};

const initialPurchases: Purchase[] = [
  {
    id: 1,
    invoice: "#COMP-00125",
    supplier: "Café Finca La Esperanza",
    date: "2026-08-14",
    products: 48,
    total: 1250000,
    status: "Recibida",
  },
  {
    id: 2,
    invoice: "#COMP-00124",
    supplier: "Café Especial Colombia",
    date: "2026-08-12",
    products: 32,
    total: 890000,
    status: "Recibida",
  },
  {
    id: 3,
    invoice: "#COMP-00123",
    supplier: "Empaques Colombia",
    date: "2026-08-10",
    products: 120,
    total: 640000,
    status: "Pendiente",
  },
  {
    id: 4,
    invoice: "#COMP-00122",
    supplier: "Finca El Vergel",
    date: "2026-08-07",
    products: 25,
    total: 520000,
    status: "Recibida",
  },
];

const formatCurrency = (value: number) => {
  return `$${value.toLocaleString("es-CO")}`;
};

export default function Purchases() {
  const [purchases] = useState<Purchase[]>(initialPurchases);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");

  const totalPurchases = purchases.reduce(
    (sum, purchase) => sum + purchase.total,
    0
  );

  const totalProducts = purchases.reduce(
    (sum, purchase) => sum + purchase.products,
    0
  );

  const pendingPurchases = purchases.filter(
    (purchase) => purchase.status === "Pendiente"
  ).length;

  const filteredPurchases = useMemo(() => {
    return purchases.filter((purchase) => {
      const searchValue = search.toLowerCase();

      const matchesSearch =
        purchase.supplier.toLowerCase().includes(searchValue) ||
        purchase.invoice.toLowerCase().includes(searchValue);

      const matchesStatus =
        statusFilter === "Todos" ||
        purchase.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [purchases, search, statusFilter]);

  return (
    <div className="space-y-8">

      {/* ENCABEZADO */}
      <div className="flex items-center justify-between">

        <div>
          <h1 className="text-4xl font-bold text-stone-900">
            Compras
          </h1>

          <p className="text-stone-500 mt-2">
            Registra y controla las compras de Cheo's Café.
          </p>
        </div>

        <button
          className="
            flex
            items-center
            gap-2
            bg-[#6F4E37]
            hover:bg-[#5B3F2D]
            text-white
            px-5
            py-3
            rounded-xl
            font-semibold
            transition
          "
        >
          <Plus size={20} />
          Nueva compra
        </button>

      </div>

      {/* RESUMEN */}
      <div className="grid grid-cols-4 gap-6">

        {/* TOTAL COMPRAS */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">

          <div className="flex items-start justify-between">

            <div>
              <p className="text-sm text-stone-500">
                Compras registradas
              </p>

              <p className="text-2xl font-bold text-stone-900 mt-2">
                {purchases.length}
              </p>
            </div>

            <div className="bg-stone-100 text-[#6F4E37] p-3 rounded-xl">
              <ShoppingBag size={24} />
            </div>

          </div>

        </div>

        {/* VALOR */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">

          <div className="flex items-start justify-between">

            <div>
              <p className="text-sm text-stone-500">
                Valor comprado
              </p>

              <p className="text-2xl font-bold text-stone-900 mt-2">
                {formatCurrency(totalPurchases)}
              </p>
            </div>

            <div className="bg-stone-100 text-[#6F4E37] p-3 rounded-xl">
              <CircleDollarSign size={24} />
            </div>

          </div>

        </div>

        {/* PRODUCTOS */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">

          <div className="flex items-start justify-between">

            <div>
              <p className="text-sm text-stone-500">
                Productos comprados
              </p>

              <p className="text-2xl font-bold text-stone-900 mt-2">
                {totalProducts}
              </p>
            </div>

            <div className="bg-stone-100 text-[#6F4E37] p-3 rounded-xl">
              <Package size={24} />
            </div>

          </div>

        </div>

        {/* PENDIENTES */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">

          <div className="flex items-start justify-between">

            <div>
              <p className="text-sm text-stone-500">
                Compras pendientes
              </p>

              <p className="text-2xl font-bold text-amber-600 mt-2">
                {pendingPurchases}
              </p>
            </div>

            <div className="bg-amber-50 text-amber-600 p-3 rounded-xl">
              <Clock3 size={24} />
            </div>

          </div>

        </div>

      </div>

      {/* HISTORIAL */}
      <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">

        {/* CABECERA */}
        <div className="p-6 border-b border-stone-200">

          <div className="flex items-center justify-between gap-6">

            <div>
              <h2 className="text-xl font-semibold text-stone-900">
                Historial de compras
              </h2>

              <p className="text-sm text-stone-500 mt-1">
                Consulta las compras registradas.
              </p>
            </div>

            <div className="flex items-center gap-3">

              {/* BUSCAR */}
              <div className="relative">

                <Search
                  size={18}
                  className="
                    absolute
                    left-3
                    top-1/2
                    -translate-y-1/2
                    text-stone-400
                  "
                />

                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar proveedor o factura..."
                  className="
                    w-72
                    border
                    border-stone-300
                    rounded-xl
                    pl-10
                    pr-4
                    py-2.5
                    outline-none
                    focus:ring-2
                    focus:ring-[#6F4E37]
                  "
                />

              </div>

              {/* FILTRO */}
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="
                  border
                  border-stone-300
                  rounded-xl
                  px-4
                  py-2.5
                  bg-white
                  outline-none
                  focus:ring-2
                  focus:ring-[#6F4E37]
                "
              >
                <option value="Todos">
                  Todos
                </option>

                <option value="Recibida">
                  Recibidas
                </option>

                <option value="Pendiente">
                  Pendientes
                </option>
              </select>

            </div>

          </div>

        </div>

        {/* TABLA */}
        <div className="overflow-x-auto">

          <table className="w-full">

            <thead className="bg-stone-50 border-b border-stone-200">

              <tr className="text-left text-sm text-stone-500">

                <th className="px-6 py-4 font-semibold">
                  FACTURA
                </th>

                <th className="px-6 py-4 font-semibold">
                  PROVEEDOR
                </th>

                <th className="px-6 py-4 font-semibold">
                  FECHA
                </th>

                <th className="px-6 py-4 font-semibold">
                  PRODUCTOS
                </th>

                <th className="px-6 py-4 font-semibold">
                  TOTAL
                </th>

                <th className="px-6 py-4 font-semibold">
                  ESTADO
                </th>

                <th className="px-6 py-4 font-semibold">
                  ACCIÓN
                </th>

              </tr>

            </thead>

            <tbody>

              {filteredPurchases.map((purchase) => (

                <tr
                  key={purchase.id}
                  className="
                    border-b
                    border-stone-100
                    hover:bg-stone-50
                    transition
                  "
                >

                  <td className="px-6 py-5">

                    <span className="font-semibold text-stone-900">
                      {purchase.invoice}
                    </span>

                  </td>

                  <td className="px-6 py-5">

                    <span className="font-medium text-stone-900">
                      {purchase.supplier}
                    </span>

                  </td>

                  <td className="px-6 py-5 text-stone-600">
                    {purchase.date}
                  </td>

                  <td className="px-6 py-5">

                    <span className="text-stone-700">
                      {purchase.products} unidades
                    </span>

                  </td>

                  <td className="px-6 py-5">

                    <span className="font-semibold text-stone-900">
                      {formatCurrency(purchase.total)}
                    </span>

                  </td>

                  <td className="px-6 py-5">

                    {purchase.status === "Recibida" && (
                      <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                        Recibida
                      </span>
                    )}

                    {purchase.status === "Pendiente" && (
                      <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                        Pendiente
                      </span>
                    )}

                  </td>

                  <td className="px-6 py-5">

                    <button
                      className="
                        flex
                        items-center
                        gap-2
                        text-[#6F4E37]
                        hover:text-[#5B3F2D]
                        font-semibold
                        text-sm
                      "
                    >
                      <Eye size={18} />
                      Ver detalle
                    </button>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

          {/* SIN RESULTADOS */}
          {filteredPurchases.length === 0 && (
            <div className="py-16 text-center">

              <ShoppingBag
                size={42}
                className="mx-auto text-stone-300"
              />

              <p className="mt-4 text-stone-500">
                No encontramos compras con esos criterios.
              </p>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}