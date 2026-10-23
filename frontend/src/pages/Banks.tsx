import {
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  Plus,
  Wallet,
  Eye,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

type BankAccount = {
  id: number;
  bank: string;
  name: string;
  type: string;
  number: string;
  balance: number;
  income: number;
  expenses: number;
};

const accounts: BankAccount[] = [
  {
    id: 1,
    bank: "Bancolombia",
    name: "Cta. Omar",
    type: "Cuenta corriente",
    number: "**** 4582",
    balance: 5400000,
    income: 1850000,
    expenses: 620000,
  },

  {
    id: 2,
    bank: "Bancolombia",
    name: "Cta. Cheo",
    type: "Cuenta corriente",
    number: "**** 7314",
    balance: 3250000,
    income: 1420000,
    expenses: 480000,
  },

  {
    id: 3,
    bank: "Bancolombia",
    name: "Cta. Emiliano",
    type: "Cuenta de ahorros",
    number: "**** 2198",
    balance: 2750000,
    income: 980000,
    expenses: 310000,
  },

  {
    id: 4,
    bank: "Nequi",
    name: "Nequi Gustavo",
    type: "Cuenta digital",
    number: "**** 9021",
    balance: 1450000,
    income: 600000,
    expenses: 180000,
  },
];

function formatCurrency(value: number) {
  return value.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

export default function Banks() {
  const totalBalance = accounts.reduce(
    (total, account) =>
      total + account.balance,
    0
  );

  const totalIncome = accounts.reduce(
    (total, account) =>
      total + account.income,
    0
  );

  const totalExpenses = accounts.reduce(
    (total, account) =>
      total + account.expenses,
    0
  );

  return (
    <div className="max-w-7xl mx-auto space-y-7">

      {/* =========================================
          ENCABEZADO
      ========================================= */}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">

        <div>

          <div className="flex items-center gap-3">

            <div className="w-11 h-11 rounded-xl bg-[#F3EDE7] text-[#6F4E37] flex items-center justify-center">
              <Landmark size={21} />
            </div>

            <div>

              <h1 className="text-3xl font-bold text-stone-900">
                Bancos
              </h1>

              <p className="text-stone-500 mt-1">
                Administra las cuentas y movimientos de Cheo's Café.
              </p>

            </div>

          </div>

        </div>

        <button
          type="button"
          className="
            w-full
            sm:w-auto
            flex
            items-center
            justify-center
            gap-2
            px-5
            py-3
            rounded-xl
            bg-[#6F4E37]
            hover:bg-[#5B3F2D]
            text-white
            font-semibold
            transition
          "
        >
          <Plus size={18} />
          Nueva cuenta
        </button>

      </div>

      {/* =========================================
          RESUMEN
      ========================================= */}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">

        {/* SALDO TOTAL */}

        <div className="sm:col-span-2 xl:col-span-1 bg-[#6F4E37] rounded-2xl p-5 sm:p-6 text-white">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-white/70 text-sm">
                Saldo total
              </p>

              <p className="text-3xl sm:text-4xl font-bold mt-2">
                {formatCurrency(
                  totalBalance
                )}
              </p>

            </div>

            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center">
              <Wallet size={21} />
            </div>

          </div>

          <p className="text-sm text-white/70 mt-5">
            Dinero disponible en todas las cuentas.
          </p>

        </div>

        {/* INGRESOS */}

        <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm text-stone-500">
                Ingresos
              </p>

              <p className="text-2xl font-bold text-stone-900 mt-2">
                {formatCurrency(
                  totalIncome
                )}
              </p>

            </div>

            <div className="w-11 h-11 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
              <ArrowDownLeft size={21} />
            </div>

          </div>

          <div className="flex items-center gap-2 mt-4 text-sm text-green-600 font-medium">

            <TrendingUp size={16} />

            <span>
              Entradas registradas
            </span>

          </div>

        </div>

        {/* EGRESOS */}

        <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm text-stone-500">
                Egresos
              </p>

              <p className="text-2xl font-bold text-stone-900 mt-2">
                {formatCurrency(
                  totalExpenses
                )}
              </p>

            </div>

            <div className="w-11 h-11 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
              <ArrowUpRight size={21} />
            </div>

          </div>

          <div className="flex items-center gap-2 mt-4 text-sm text-red-600 font-medium">

            <TrendingDown size={16} />

            <span>
              Salidas registradas
            </span>

          </div>

        </div>

      </div>

      {/* =========================================
          CUENTAS
      ========================================= */}

      <section>

        <div className="flex items-center justify-between mb-4">

          <div>

            <h2 className="text-xl font-bold text-stone-900">
              Cuentas
            </h2>

            <p className="text-sm text-stone-500 mt-1">
              Cuentas bancarias y digitales registradas.
            </p>

          </div>

          <span className="text-sm text-stone-500">
            {accounts.length} cuentas
          </span>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

          {accounts.map((account) => (

            <div
              key={account.id}
              className="
                bg-white
                border
                border-stone-200
                rounded-2xl
                p-5
                shadow-sm
                hover:shadow-md
                transition
              "
            >

              {/* BANCO */}

              <div className="flex items-start justify-between gap-4">

                <div className="flex items-center gap-3">

                  <div className="w-11 h-11 rounded-xl bg-[#F3EDE7] text-[#6F4E37] flex items-center justify-center">
                    <Landmark size={20} />
                  </div>

                  <div>

                    <p className="font-bold text-stone-900">
                      {account.bank}
                    </p>

                    <p className="text-sm text-stone-500">
                      {account.name}
                    </p>

                  </div>

                </div>

                <span className="text-xs bg-stone-100 text-stone-500 px-2.5 py-1 rounded-full">
                  Activa
                </span>

              </div>

              {/* SALDO */}

              <div className="mt-6">

                <p className="text-xs text-stone-500">
                  Saldo disponible
                </p>

                <p className="text-2xl font-bold text-stone-900 mt-1">
                  {formatCurrency(
                    account.balance
                  )}
                </p>

              </div>

              {/* INFORMACIÓN */}

              <div className="mt-5 pt-5 border-t border-stone-100">

                <div className="flex items-center justify-between">

                  <div>

                    <p className="text-xs text-stone-400">
                      Tipo
                    </p>

                    <p className="text-sm font-medium text-stone-700 mt-1">
                      {account.type}
                    </p>

                  </div>

                  <div className="text-right">

                    <p className="text-xs text-stone-400">
                      Cuenta
                    </p>

                    <p className="text-sm font-medium text-stone-700 mt-1">
                      {account.number}
                    </p>

                  </div>

                </div>

              </div>

              {/* MOVIMIENTOS */}

              <div className="grid grid-cols-2 gap-3 mt-5">

                <div className="rounded-xl bg-green-50 p-3">

                  <div className="flex items-center gap-1.5 text-green-600">

                    <ArrowDownLeft size={15} />

                    <span className="text-xs font-medium">
                      Ingresos
                    </span>

                  </div>

                  <p className="text-sm font-bold text-green-700 mt-1">
                    {formatCurrency(
                      account.income
                    )}
                  </p>

                </div>

                <div className="rounded-xl bg-red-50 p-3">

                  <div className="flex items-center gap-1.5 text-red-600">

                    <ArrowUpRight size={15} />

                    <span className="text-xs font-medium">
                      Egresos
                    </span>

                  </div>

                  <p className="text-sm font-bold text-red-700 mt-1">
                    {formatCurrency(
                      account.expenses
                    )}
                  </p>

                </div>

              </div>

              {/* BOTÓN */}

              <button
                type="button"
                className="
                  w-full
                  mt-5
                  py-3
                  rounded-xl
                  border
                  border-stone-200
                  text-stone-700
                  font-semibold
                  text-sm
                  flex
                  items-center
                  justify-center
                  gap-2
                  hover:bg-stone-50
                  transition
                "
              >
                <Eye size={16} />
                Ver movimientos
              </button>

            </div>

          ))}

        </div>

      </section>

      {/* =========================================
          RESUMEN DE CUENTAS
      ========================================= */}

      <section className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">

        <div className="p-5 sm:p-6 border-b border-stone-200">

          <h2 className="text-lg font-semibold text-stone-900">
            Distribución del dinero
          </h2>

          <p className="text-sm text-stone-500 mt-1">
            Así está distribuido el saldo entre tus cuentas.
          </p>

        </div>

        <div className="p-5 sm:p-6 space-y-5">

          {accounts.map((account) => {

            const percentage =
              totalBalance > 0
                ? (account.balance /
                    totalBalance) *
                  100
                : 0;

            return (
              <div key={account.id}>

                <div className="flex items-center justify-between gap-4 mb-2">

                  <div className="flex items-center gap-2">

                    <div className="w-8 h-8 rounded-lg bg-[#F3EDE7] text-[#6F4E37] flex items-center justify-center">
                      <Landmark size={15} />
                    </div>

                    <span className="text-sm font-medium text-stone-700">
                      {account.bank} · {account.name}
                    </span>

                  </div>

                  <span className="text-sm font-semibold text-stone-800">
                    {percentage.toFixed(1)}%
                  </span>

                </div>

                <div className="h-2 bg-stone-100 rounded-full overflow-hidden">

                  <div
                    className="h-full bg-[#8B6B52] rounded-full"
                    style={{
                      width: `${percentage}%`,
                    }}
                  />

                </div>

              </div>
            );
          })}

        </div>

      </section>

    </div>
  );
}