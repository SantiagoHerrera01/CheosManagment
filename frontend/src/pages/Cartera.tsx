import {
  AlertTriangle,
  Banknote,
  Clock3,
  HandCoins,
  Landmark,
  ListFilter,
  Loader2,
  Plus,
  Receipt,
  CircleDollarSign,
  Search,
  Users,
  WalletCards,
} from "lucide-react";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { api, ApiError, qs } from "../lib/api";
import Select from "../components/ui/Select";
import Modal from "../components/ui/Modal";
import type { Invoice, Paginated, PaymentMethod } from "../types/api";

type AccountStatus = "Pendiente" | "Vencida" | "Abonada";

/** Cuenta por cobrar derivada de una factura con saldo pendiente. */
type Account = {
  invoice: Invoice;
  status: AccountStatus;
};

const formatCurrency = (value: number) => {
  return `$${value.toLocaleString("es-CO")}`;
};

const formatDate = (iso: string) => new Date(iso).toLocaleDateString("es-CO");

function statusOf(invoice: Invoice): AccountStatus {
  if (invoice.status === "VENCIDA") return "Vencida";
  return invoice.totalPaid > 0 ? "Abonada" : "Pendiente";
}

const STATUS_BADGES: Record<AccountStatus, string> = {
  Vencida: "bg-red-100 text-red-700",
  Pendiente: "bg-amber-100 text-amber-700",
  Abonada: "bg-green-100 text-green-700",
};

export default function Cartera() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");

  // Modal de abono
  const [payTarget, setPayTarget] = useState<Invoice | null>(null);
  const [payForm, setPayForm] = useState({
    invoiceId: "",
    amount: "",
    method: "ABONO" as PaymentMethod,
    notes: "",
  });
  const [payError, setPayError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  /**
   * Descarga las facturas con saldo: PENDIENTE + VENCIDA
   * (PAGADA tiene saldo 0 y ANULADA no se cobra). Sin tocar estado.
   */
  const fetchAccounts = useCallback(async () => {
    const collected: Invoice[] = [];

    for (const status of ["PENDIENTE", "VENCIDA"] as const) {
      for (let page = 1; ; page += 1) {
        const result = await api.get<Paginated<Invoice>>(
          `/invoices${qs({ status, page, limit: 100 })}`
        );
        collected.push(...result.data);
        if (collected.length >= result.meta.total || result.data.length === 0) break;
      }
    }

    // Solo las que realmente deben (defensa extra ante saldos en 0).
    const withBalance = collected.filter((invoice) => invoice.balance > 0);

    return withBalance
      .slice()
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .map((invoice) => ({ invoice, status: statusOf(invoice) }));
  }, []);

  const loadAccounts = useCallback(() => {
    return fetchAccounts()
      .then((rows) => {
        setAccounts(rows);
      })
      .catch((error: unknown) => {
        setLoadError(
          error instanceof ApiError ? error.message : "No fue posible cargar la cartera."
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [fetchAccounts]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const totalReceivable = accounts.reduce(
    (sum, account) => sum + account.invoice.balance,
    0
  );

  const totalOverdue = accounts
    .filter((account) => account.status === "Vencida")
    .reduce((sum, account) => sum + account.invoice.balance, 0);

  const totalPending = accounts
    .filter((account) => account.status !== "Vencida")
    .reduce((sum, account) => sum + account.invoice.balance, 0);

  const customersWithDebt = new Set(
    accounts.map((account) => account.invoice.client.id)
  ).size;

  const filteredAccounts = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return accounts.filter((account) => {
      const { invoice } = account;

      const matchesSearch =
        !searchValue ||
        invoice.client.fullName.toLowerCase().includes(searchValue) ||
        invoice.number.toLowerCase().includes(searchValue) ||
        invoice.client.documentNumber.includes(searchValue);

      const matchesStatus =
        statusFilter === "Todos" || account.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [accounts, search, statusFilter]);

  // ---------------------------------------------------------
  //  Abonos
  // ---------------------------------------------------------
  const openPayModal = (invoice: Invoice | null = null) => {
    setPayTarget(invoice);
    setPayForm({
      invoiceId: invoice?.id ?? accounts[0]?.invoice.id ?? "",
      amount: "",
      method: "ABONO",
      notes: "",
    });
    setPayError(null);
  };

  const handlePay = async (event: FormEvent) => {
    event.preventDefault();

    const invoice =
      payTarget ?? accounts.find((a) => a.invoice.id === payForm.invoiceId)?.invoice;

    if (!invoice) {
      setPayError("Selecciona una factura.");
      return;
    }

    const amount = Number(payForm.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      setPayError("El abono debe ser mayor que cero.");
      return;
    }
    if (amount > invoice.balance) {
      setPayError(`El abono no puede superar el saldo (${formatCurrency(invoice.balance)}).`);
      return;
    }

    setPaying(true);
    setPayError(null);
    try {
      await api.post(`/invoices/${invoice.id}/payments`, {
        amount,
        method: payForm.method,
        notes: payForm.notes.trim() || null,
      });
      setPayTarget(null);
      setPayForm({ invoiceId: "", amount: "", method: "ABONO", notes: "" });
      await loadAccounts();
    } catch (error) {
      setPayError(
        error instanceof ApiError ? error.message : "No fue posible registrar el abono."
      );
    } finally {
      setPaying(false);
    }
  };

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
          type="button"
          onClick={() => openPayModal()}
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">

        {/* TOTAL */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-start justify-between gap-2">

            <div className="min-w-0">
              <p className="text-stone-500 text-xs sm:text-sm truncate">
                Total por cobrar
              </p>

              <p className="text-lg sm:text-2xl font-bold text-stone-900 mt-1.5 sm:mt-2 truncate">
                {formatCurrency(totalReceivable)}
              </p>
            </div>

            <div className="bg-stone-100 text-[#6F4E37] p-2.5 sm:p-3 rounded-xl shrink-0">
              <WalletCards size={22} />
            </div>

          </div>
        </div>

        {/* VENCIDO */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-start justify-between gap-2">

            <div className="min-w-0">
              <p className="text-stone-500 text-xs sm:text-sm truncate">
                Cartera vencida
              </p>

              <p className="text-lg sm:text-2xl font-bold text-red-600 mt-1.5 sm:mt-2 truncate">
                {formatCurrency(totalOverdue)}
              </p>
            </div>

            <div className="bg-red-50 text-red-500 p-2.5 sm:p-3 rounded-xl shrink-0">
              <AlertTriangle size={22} />
            </div>

          </div>
        </div>

        {/* POR VENCER */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-start justify-between gap-2">

            <div className="min-w-0">
              <p className="text-stone-500 text-xs sm:text-sm truncate">
                Por vencer
              </p>

              <p className="text-lg sm:text-2xl font-bold text-amber-600 mt-1.5 sm:mt-2 truncate">
                {formatCurrency(totalPending)}
              </p>
            </div>

            <div className="bg-amber-50 text-amber-600 p-2.5 sm:p-3 rounded-xl shrink-0">
              <Clock3 size={22} />
            </div>

          </div>
        </div>

        {/* CLIENTES */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-start justify-between gap-2">

            <div className="min-w-0">
              <p className="text-stone-500 text-xs sm:text-sm truncate">
                Clientes con deuda
              </p>

              <p className="text-lg sm:text-2xl font-bold text-stone-900 mt-1.5 sm:mt-2 truncate">
                {customersWithDebt}
              </p>
            </div>

            <div className="bg-stone-100 text-[#6F4E37] p-2.5 sm:p-3 rounded-xl shrink-0">
              <Users size={22} />
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

            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">

              {/* BUSCADOR */}
              <div className="relative w-full sm:w-auto">

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
                    w-full
                    sm:w-72
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
              <Select
                value={statusFilter}
                onChange={(value) => setStatusFilter(value)}
                aria-label="Filtrar por estado"
                options={[
                  { value: "Todos", label: "Todos", icon: ListFilter },
                  { value: "Pendiente", label: "Pendientes", icon: Clock3 },
                  { value: "Vencida", label: "Vencidas", icon: AlertTriangle },
                  { value: "Abonada", label: "Abonadas", icon: HandCoins },
                ]}
              />

            </div>

          </div>

        </div>

        {/* ERROR DE CARGA */}
        {loadError && (
          <div className="px-6 py-4 bg-red-50 border-b border-stone-200 text-sm text-red-600">
            {loadError}
          </div>
        )}

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

              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <Loader2
                      size={30}
                      className="mx-auto text-[#6F4E37] animate-spin"
                    />
                    <p className="mt-3 text-sm text-stone-500">
                      Cargando cartera…
                    </p>
                  </td>
                </tr>
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="py-16 text-center">

                      <WalletCards
                        size={42}
                        className="mx-auto text-stone-300"
                      />

                      <p className="mt-4 text-stone-500">
                        No encontramos cuentas con esos criterios.
                      </p>

                    </div>
                  </td>
                </tr>
              ) : (
                filteredAccounts.map(({ invoice, status }) => (

                  <tr
                    key={invoice.id}
                    className="
                      border-b
                      border-stone-100
                      hover:bg-stone-50
                      transition
                    "
                  >

                    <td className="px-6 py-5">
                      <span className="font-semibold text-stone-900">
                        #{invoice.number}
                      </span>
                    </td>

                    <td className="px-6 py-5">

                      <p className="font-medium text-stone-900">
                        {invoice.client.fullName}
                      </p>

                      <p className="text-sm text-stone-400">
                        {invoice.client.documentNumber}
                      </p>

                    </td>

                    <td className="px-6 py-5">

                      <p className="text-stone-700">
                        {formatDate(invoice.dueDate)}
                      </p>

                    </td>

                    <td className="px-6 py-5 font-medium">
                      {formatCurrency(invoice.total)}
                    </td>

                    <td className="px-6 py-5 text-green-600">
                      {formatCurrency(invoice.totalPaid)}
                    </td>

                    <td className="px-6 py-5">

                      <span className="font-bold text-stone-900">
                        {formatCurrency(invoice.balance)}
                      </span>

                    </td>

                    <td className="px-6 py-5">

                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGES[status]}`}
                      >
                        {status}
                      </span>

                    </td>

                    <td className="px-6 py-5">

                      <button
                        type="button"
                        onClick={() => openPayModal(invoice)}
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
                ))
              )}

            </tbody>

          </table>

        </div>

      </div>

      {/* MODAL DE ABONO */}
      {accounts.length > 0 && (payTarget || payForm.invoiceId) && (
        <Modal
          icon={HandCoins}
          title="Registrar abono"
          subtitle={
            payTarget
              ? `Factura #${payTarget.number} · Saldo ${formatCurrency(payTarget.balance)}`
              : "Selecciona la factura a abonar."
          }
          onClose={() => {
            setPayTarget(null);
            setPayForm({ invoiceId: "", amount: "", method: "ABONO", notes: "" });
          }}
          onSubmit={handlePay}
          size="md"
          footer={
            <div className="flex justify-end gap-3">

              <button
                type="button"
                onClick={() => {
                  setPayTarget(null);
                  setPayForm({ invoiceId: "", amount: "", method: "ABONO", notes: "" });
                }}
                className="px-5 py-3 rounded-xl border border-stone-300 text-stone-700 font-medium hover:bg-stone-50 transition"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={paying}
                className="px-5 py-3 rounded-xl bg-[#6F4E37] hover:bg-[#5B3F2D] disabled:opacity-60 text-white font-semibold transition inline-flex items-center gap-2"
              >
                {paying && <Loader2 size={17} className="animate-spin" />}
                Registrar abono
              </button>

            </div>
          }
        >

            <div className="space-y-4">

              {payError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                  {payError}
                </div>
              )}

              {/* Selector de factura (solo desde el botón global) */}
              {!payTarget && (
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Factura *
                  </label>

                  <Select
                    value={payForm.invoiceId}
                    onChange={(value) =>
                      setPayForm({ ...payForm, invoiceId: value })
                    }
                    aria-label="Factura"
                    options={accounts.map(({ invoice }) => ({
                      value: invoice.id,
                      label: `#${invoice.number} · ${invoice.client.fullName} · ${formatCurrency(
                        invoice.balance
                      )}`,
                      icon: Receipt,
                    }))}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Monto a abonar *
                </label>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
                    $
                  </span>

                  <input
                    type="number"
                    min="1"
                    value={payForm.amount}
                    onChange={(event) =>
                      setPayForm({ ...payForm, amount: event.target.value })
                    }
                    placeholder="50000"
                    className="w-full border border-stone-300 rounded-xl pl-9 pr-4 py-3 outline-none focus:ring-2 focus:ring-[#6F4E37]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Método de pago
                </label>

                <Select
                  value={payForm.method}
                  onChange={(value) =>
                    setPayForm({
                      ...payForm,
                      method: value as PaymentMethod,
                    })
                  }
                  aria-label="Método de pago"
                  options={[
                    { value: "ABONO", label: "Abono", icon: HandCoins },
                    { value: "EFECTIVO", label: "Efectivo", icon: Banknote },
                    {
                      value: "TRANSFERENCIA",
                      label: "Transferencia",
                      icon: Landmark,
                    },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Notas (opcional)
                </label>

                <input
                  type="text"
                  value={payForm.notes}
                  onChange={(event) =>
                    setPayForm({ ...payForm, notes: event.target.value })
                  }
                  placeholder="Ej. Pago Nequi"
                  className="w-full border border-stone-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#6F4E37]"
                />
              </div>

            </div>

        </Modal>
      )}

    </div>
  );
}
