import {
  Search,
  WalletCards,
  AlertTriangle,
  Clock3,
  Users,
  Plus,
  CircleDollarSign,
} from "lucide-react";

import { useMemo, useState } from "react";

type AccountStatus = "Pendiente" | "Vencida" | "Abonada";

type Account = {
  id: number;
  invoice: string;
  customer: string;
  document: string;
  date: string;
  dueDate: string;
  total: number;
  paid: number;
  balance: number;
  status: AccountStatus;
};

const initialAccounts: Account[] = [
  {
    id: 1,
    invoice: "#000122",
    customer: "Café La Montaña",
    document: "900456789",
    date: "2026-08-12",
    dueDate: "2026-08-19",
    total: 280000,
    paid: 0,
    balance: 280000,
    status: "Pendiente",
  },
  {
    id: 2,
    invoice: "#000119",
    customer: "Juan Pérez",
    document: "10203040",
    date: "2026-08-08",
    dueDate: "2026-08-13",
    total: 450000,
    paid: 150000,
    balance: 300000,
    status: "Vencida",
  },
  {
    id: 3,
    invoice: "#000116",
    customer: "Distribuciones El Café",
    document: "901234567",
    date: "2026-08-05",
    dueDate: "2026-08-20",
    total: 850000,
    paid: 400000,
    balance: 450000,
    status: "Abonada",
  },
  {
    id: 4,
    invoice: "#000110",
    customer: "Tienda La 80",
    document: "103456789",
    date: "2026-07-28",
    dueDate: "2026-08-10",
    total: 320000,
    paid: 0,
    balance: 320000,
    status: "Vencida",
  },
];

const formatCurrency = (value: number) => {
  return `$${value.toLocaleString("es-CO")}`;
};

export default function Cartera() {
  const [accounts] = useState<Account[]>(initialAccounts);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");

  const totalReceivable = accounts.reduce(
    (sum, account) => sum + account.balance,
    0
  );

  const totalOverdue = accounts
    .filter((account) => account.status === "Vencida")
    .reduce((sum, account) => sum + account.balance, 0);

  const totalPending = accounts
    .filter((account) => account.status === "Pendiente")
    .reduce((sum, account) => sum + account.balance, 0);

  const customersWithDebt = new Set(
    accounts.map((account) => account.customer)
  ).size;

  const filteredAccounts = useMemo(() => {
    return accounts.filter((account) => {
      const searchValue = search.toLowerCase();

      const matchesSearch =
        account.customer.toLowerCase().includes(searchValue) ||
        account.invoice.toLowerCase().includes(searchValue) ||
        account.document.toLowerCase().includes(searchValue);

      const matchesStatus =
        statusFilter === "Todos" ||
        account.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [accounts, search, statusFilter]);

  return (
    <div className="space-y-8">

      {/* ENCABEZADO */}
      <div className="flex items-center justify-between">

        <div>
          <h1 className="text-4xl font-bold text-stone-900">
            Cartera
          </h1>

          <p className="text-stone-500 mt-2">
            Control y seguimiento de cuentas por cobrar.
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
          Registrar abono
        </button>

      </div>

      {/* TARJETAS DE RESUMEN */}
      <div className="grid grid-cols-4 gap-6">

        {/* TOTAL */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between">

            <div>
              <p className="text-stone-500 text-sm">
                Total por cobrar
              </p>

              <p className="text-2xl font-bold text-stone-900 mt-2">
                {formatCurrency(totalReceivable)}
              </p>
            </div>

            <div className="bg-stone-100 text-[#6F4E37] p-3 rounded-xl">
              <WalletCards size={24} />
            </div>

          </div>
        </div>

        {/* VENCIDO */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between">

            <div>
              <p className="text-stone-500 text-sm">
                Cartera vencida
              </p>

              <p className="text-2xl font-bold text-red-600 mt-2">
                {formatCurrency(totalOverdue)}
              </p>
            </div>

            <div className="bg-red-50 text-red-500 p-3 rounded-xl">
              <AlertTriangle size={24} />
            </div>

          </div>
        </div>

        {/* POR VENCER */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between">

            <div>
              <p className="text-stone-500 text-sm">
                Por vencer
              </p>

              <p className="text-2xl font-bold text-amber-600 mt-2">
                {formatCurrency(totalPending)}
              </p>
            </div>

            <div className="bg-amber-50 text-amber-600 p-3 rounded-xl">
              <Clock3 size={24} />
            </div>

          </div>
        </div>

        {/* CLIENTES */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between">

            <div>
              <p className="text-stone-500 text-sm">
                Clientes con deuda
              </p>

              <p className="text-2xl font-bold text-stone-900 mt-2">
                {customersWithDebt}
              </p>
            </div>

            <div className="bg-stone-100 text-[#6F4E37] p-3 rounded-xl">
              <Users size={24} />
            </div>

          </div>
        </div>

      </div>

      {/* TABLA */}
      <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">

        {/* CABECERA */}
        <div className="p-6 border-b border-stone-200">

          <div className="flex items-center justify-between gap-6">

            <div>
              <h2 className="text-xl font-semibold text-stone-900">
                Cuentas por cobrar
              </h2>

              <p className="text-stone-500 text-sm mt-1">
                Facturas pendientes de pago.
              </p>
            </div>

            <div className="flex items-center gap-3">

              {/* BUSCADOR */}
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
                  placeholder="Buscar cliente o factura..."
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

                <option value="Pendiente">
                  Pendientes
                </option>

                <option value="Vencida">
                  Vencidas
                </option>

                <option value="Abonada">
                  Abonadas
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
                  CLIENTE
                </th>

                <th className="px-6 py-4 font-semibold">
                  VENCIMIENTO
                </th>

                <th className="px-6 py-4 font-semibold">
                  TOTAL
                </th>

                <th className="px-6 py-4 font-semibold">
                  ABONADO
                </th>

                <th className="px-6 py-4 font-semibold">
                  SALDO
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

              {filteredAccounts.map((account) => (

                <tr
                  key={account.id}
                  className="
                    border-b
                    border-stone-100
                    hover:bg-stone-50
                    transition
                  "
                >

                  <td className="px-6 py-5">
                    <span className="font-semibold text-stone-900">
                      {account.invoice}
                    </span>
                  </td>

                  <td className="px-6 py-5">

                    <p className="font-medium text-stone-900">
                      {account.customer}
                    </p>

                    <p className="text-sm text-stone-400">
                      {account.document}
                    </p>

                  </td>

                  <td className="px-6 py-5">

                    <p className="text-stone-700">
                      {account.dueDate}
                    </p>

                  </td>

                  <td className="px-6 py-5 font-medium">
                    {formatCurrency(account.total)}
                  </td>

                  <td className="px-6 py-5 text-green-600">
                    {formatCurrency(account.paid)}
                  </td>

                  <td className="px-6 py-5">

                    <span className="font-bold text-stone-900">
                      {formatCurrency(account.balance)}
                    </span>

                  </td>

                  <td className="px-6 py-5">

                    {account.status === "Vencida" && (
                      <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                        Vencida
                      </span>
                    )}

                    {account.status === "Pendiente" && (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                        Pendiente
                      </span>
                    )}

                    {account.status === "Abonada" && (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                        Abonada
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
                      <CircleDollarSign size={18} />
                      Abonar
                    </button>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

          {/* SIN RESULTADOS */}
          {filteredAccounts.length === 0 && (
            <div className="py-16 text-center">

              <WalletCards
                size={42}
                className="mx-auto text-stone-300"
              />

              <p className="mt-4 text-stone-500">
                No encontramos cuentas con esos criterios.
              </p>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}