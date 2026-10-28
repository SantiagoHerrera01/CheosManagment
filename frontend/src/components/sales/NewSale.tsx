import {
  Banknote,
  Check,
  CreditCard,
  Landmark,
  Loader2,
  ShoppingCart,
  UserRound,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import SaleProducts, { type CartItem } from "./SaleProducts";
import { api, ApiError, qs } from "../../lib/api";
import Select from "../ui/Select";
import type {
  Client,
  CreateInvoiceInput,
  Invoice,
  Paginated,
  PaymentMethod,
} from "../../types/api";

type NewSaleProps = {
  onBack: () => void;
  /** Se llama después de crear la factura (para recargar la lista padre). */
  onSaleCreated?: () => void;
};

const bankAccounts = [
  {
    id: "111005",
    name: "Bancolombia Cta Omar",
    code: "111005",
  },
  {
    id: "111006",
    name: "Bancolombia Cta Cheo",
    code: "111006",
  },
  {
    id: "111007",
    name: "Bancolombia Cta Emiliano",
    code: "111007",
  },
  {
    id: "111008",
    name: "Nequi Gustavo",
    code: "111008",
  },
  {
    id: "111009",
    name: "Cruce de Cuentas Migdo",
    code: "111009",
  },
];

function formatCurrency(value: number) {
  return value.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

/** Mensaje legible para el banner de error (prioriza issues de zod). */
function getApiErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) {
    return "No fue posible registrar la venta.";
  }

  const details = error.details;

  if (Array.isArray(details) && details.length > 0) {
    const firstIssue = details[0] as { message?: unknown };

    if (
      firstIssue &&
      typeof firstIssue.message === "string" &&
      firstIssue.message.trim() !== ""
    ) {
      return firstIssue.message;
    }
  }

  return error.message;
}

export default function NewSale({
  onBack,
  onSaleCreated,
}: NewSaleProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  const [selectedCustomer, setSelectedCustomer] =
    useState<Client | null>(null);

  const [items, setItems] = useState<CartItem[]>([]);

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("EFECTIVO");

  const [selectedBank, setSelectedBank] = useState("");

  const [discount, setDiscount] = useState("");

  const [receivedAmount, setReceivedAmount] = useState("");

  const [saving, setSaving] = useState(false);

  const [savingError, setSavingError] = useState<string | null>(null);

  const [saved, setSaved] = useState(false);

  const [createdInvoice, setCreatedInvoice] = useState<Invoice | null>(null);

  /** Descarga todos los clientes activos (sin tocar estado). */
  const fetchClients = useCallback(async () => {
    const all: Client[] = [];

    // El backend limita a 100 por página: recorremos todas las páginas.
    for (let page = 1; ; page += 1) {
      const result = await api.get<Paginated<Client>>(
        `/clients${qs({ active: true, page, limit: 100 })}`
      );

      all.push(...result.data);

      if (all.length >= result.meta.total || result.data.length === 0) {
        break;
      }
    }

    return all;
  }, []);

  const loadClients = useCallback(() => {
    return fetchClients()
      .then((all) => {
        setClients(all);
      })
      .catch((error: unknown) => {
        setLoadError(
          error instanceof ApiError
            ? error.message
            : "No fue posible cargar los clientes."
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [fetchClients]);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  const filteredCustomers = clients.filter((customer) => {
    const value = search.toLowerCase().trim();

    if (!value) {
      return false;
    }

    return (
      customer.fullName.toLowerCase().includes(value) ||
      customer.documentNumber.includes(value)
    );
  });

  const subtotal = useMemo(() => {
    return items.reduce(
      (total, item) =>
        total + item.price * item.quantity,
      0
    );
  }, [items]);

  const discountValue = Math.min(
    Number(discount) || 0,
    subtotal
  );

  const total = Math.max(
    subtotal - discountValue,
    0
  );

  const received = Number(receivedAmount) || 0;

  const pendingAmount = Math.max(
    total - received,
    0
  );

  const change = Math.max(
    received - total,
    0
  );

  const canSave =
    !saving &&
    selectedCustomer !== null &&
    items.length > 0 &&
    total > 0 &&
    (paymentMethod !== "TRANSFERENCIA" ||
      selectedBank !== "") &&
    (paymentMethod !== "ABONO" ||
      received > 0);

  const handleNewSale = () => {
    setItems([]);
    setDiscount("");
    setReceivedAmount("");
    setSavingError(null);
    setCreatedInvoice(null);
    setSaved(false);
  };

  const handleSaveSale = async () => {
    if (saving) {
      return;
    }

    if (!selectedCustomer) {
      setSavingError("Selecciona un cliente para continuar.");
      return;
    }

    if (items.length === 0) {
      setSavingError("Agrega al menos un producto a la venta.");
      return;
    }

    if (!canSave) {
      setSavingError("Revisa la información de la venta.");
      return;
    }

    setSaving(true);
    setSavingError(null);

    const payload: CreateInvoiceInput = {
      clientId: selectedCustomer.id,
      items: items.map((item) => ({
        presentationId: item.presentationId,
        quantity: item.quantity,
      })),
      discount: Number(discount || 0),
      paymentMethod,
      initialPayment:
        paymentMethod === "ABONO"
          ? Number(receivedAmount || 0) || null
          : null,
      creditDays: 30,
      notes: null,
    };

    try {
      const invoice = await api.post<Invoice>("/invoices", payload);

      setCreatedInvoice(invoice);
      setSaved(true);
      onSaleCreated?.();
    } catch (error) {
      // El formulario conserva su estado: solo se muestra el error.
      setSavingError(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (saved && createdInvoice) {
    return (
      <div className="space-y-6">

        {/* =========================================
            CONFIRMACIÓN
        ========================================= */}

        <section
          className="
            bg-white
            border
            border-stone-200
            rounded-xl
            shadow-sm
            p-8
            sm:p-12
          "
        >

          <div
            className="
              w-14
              h-14
              rounded-full
              bg-green-100
              text-green-600
              flex
              items-center
              justify-center
              mx-auto
            "
          >
            <Check size={26} />
          </div>

          <h1 className="text-2xl font-bold text-stone-900 text-center mt-5">
            Venta registrada
          </h1>

          <p className="text-stone-500 text-center mt-2">
            La factura {createdInvoice.number} se creó correctamente.
          </p>

          <div
            className="
              mt-6
              max-w-sm
              mx-auto
              border
              border-stone-200
              rounded-xl
              overflow-hidden
            "
          >

            <div
              className="
                flex
                items-center
                justify-between
                gap-4
                px-4
                py-3
                border-b
                border-stone-100
              "
            >

              <span className="text-sm text-stone-500">
                Cliente
              </span>

              <span className="text-sm font-semibold text-stone-800 text-right">
                {createdInvoice.client.fullName}

                <span className="block text-xs font-normal text-stone-500 mt-0.5">
                  {createdInvoice.client.documentNumber}
                </span>
              </span>

            </div>

            <div
              className="
                flex
                items-center
                justify-between
                gap-4
                px-4
                py-3
              "
            >

              <span className="text-sm text-stone-500">
                Total
              </span>

              <span className="font-bold text-[#6F4E37]">
                {formatCurrency(createdInvoice.total)}
              </span>

            </div>

          </div>

          <div
            className="
              mt-8
              flex
              flex-col
              sm:flex-row
              items-center
              justify-center
              gap-3
            "
          >

            <button
              type="button"
              onClick={handleNewSale}
              className="
                w-full
                sm:w-auto
                min-w-[220px]
                bg-[#6F4E37]
                hover:bg-[#5B3F2D]
                text-white
                px-7
                py-4
                rounded-xl
                font-semibold
                transition
              "
            >
              Nueva venta
            </button>

            <button
              type="button"
              onClick={onBack}
              className="
                w-full
                sm:w-auto
                min-w-[220px]
                border
                border-stone-300
                text-stone-700
                px-7
                py-4
                rounded-xl
                font-semibold
                hover:bg-stone-50
                transition
              "
            >
              Volver a ventas
            </button>

          </div>

        </section>

      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* =========================================
          CLIENTE
      ========================================= */}

      <section className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">

        <div className="p-5 sm:p-6 border-b border-stone-200">

          <div className="flex items-center gap-3">

            <div
              className="
                w-10
                h-10
                rounded-xl
                bg-[#F3EDE7]
                text-[#6F4E37]
                flex
                items-center
                justify-center
              "
            >
              <UserRound size={19} />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-stone-900">
                Cliente
              </h2>

              <p className="text-sm text-stone-500">
                Selecciona el cliente de esta venta.
              </p>
            </div>

          </div>

        </div>

        <div className="p-5 sm:p-6">

          {selectedCustomer ? (

            <div
              className="
                border
                border-[#D9C8BB]
                bg-[#FAF7F4]
                rounded-xl
                p-4
              "
            >

              <div className="flex items-center justify-between gap-4">

                <div className="flex items-center gap-3">

                  <div
                    className="
                      w-10
                      h-10
                      rounded-full
                      bg-[#6F4E37]
                      text-white
                      flex
                      items-center
                      justify-center
                      shrink-0
                    "
                  >
                    <UserRound size={18} />
                  </div>

                  <div>
                    <p className="font-semibold text-stone-900">
                      {selectedCustomer.fullName}
                    </p>

                    <p className="text-sm text-stone-500">
                      Documento: {selectedCustomer.documentNumber}
                    </p>
                  </div>

                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomer(null);
                    setSearch("");
                  }}
                  className="
                    text-sm
                    font-semibold
                    text-[#6F4E37]
                    hover:underline
                  "
                >
                  Cambiar
                </button>

              </div>

            </div>

          ) : loading ? (

            <div
              className="
                border
                border-stone-200
                rounded-xl
                p-6
                text-center
              "
            >

              <Loader2
                size={26}
                className="mx-auto text-[#6F4E37] animate-spin"
              />

              <p className="mt-3 text-sm text-stone-500">
                Cargando clientes…
              </p>

            </div>

          ) : loadError ? (

            <div
              className="
                bg-red-50
                border
                border-red-200
                text-red-700
                text-sm
                rounded-xl
                px-4
                py-3
                flex
                items-center
                justify-between
                gap-3
              "
            >

              <span>{loadError}</span>

              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  setLoadError(null);
                  void loadClients();
                }}
                className="font-semibold underline shrink-0"
              >
                Reintentar
              </button>

            </div>

          ) : (

            <div className="space-y-3">

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Buscar por nombre o documento..."
                className="
                  w-full
                  border
                  border-stone-300
                  rounded-xl
                  px-4
                  py-3.5
                  outline-none
                  focus:border-[#6F4E37]
                  focus:ring-2
                  focus:ring-[#6F4E37]/20
                "
              />

              {search.trim() !== "" && (

                <div
                  className="
                    border
                    border-stone-200
                    rounded-xl
                    overflow-hidden
                  "
                >

                  {filteredCustomers.length > 0 ? (

                    filteredCustomers.map((customer) => (

                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setSearch("");
                        }}
                        className="
                          w-full
                          flex
                          items-center
                          gap-3
                          text-left
                          px-4
                          py-4
                          border-b
                          last:border-b-0
                          border-stone-100
                          hover:bg-stone-50
                          transition
                        "
                      >

                        <div
                          className="
                            w-10
                            h-10
                            rounded-full
                            bg-stone-100
                            text-stone-600
                            flex
                            items-center
                            justify-center
                            shrink-0
                          "
                        >
                          <UserRound size={18} />
                        </div>

                        <div>
                          <p className="font-semibold text-stone-800">
                            {customer.fullName}
                          </p>

                          <p className="text-sm text-stone-500">
                            {customer.documentNumber}
                          </p>
                        </div>

                      </button>

                    ))

                  ) : (

                    <div className="p-5 text-center text-stone-500">
                      No encontramos ese cliente.
                    </div>

                  )}

                </div>

              )}

            </div>

          )}

        </div>

      </section>

      {/* =========================================
          PRODUCTOS
      ========================================= */}

      <SaleProducts
        items={items}
        onItemsChange={setItems}
      />

      {/* =========================================
          RESUMEN
      ========================================= */}

      <section
        className="
          bg-white
          border
          border-stone-200
          rounded-xl
          shadow-sm
          overflow-hidden
        "
      >

        <div className="p-5 sm:p-6 border-b border-stone-200">

          <div className="flex items-center gap-3">

            <div
              className="
                w-10
                h-10
                rounded-xl
                bg-[#F3EDE7]
                text-[#6F4E37]
                flex
                items-center
                justify-center
              "
            >
              <ShoppingCart size={19} />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-stone-900">
                Resumen
              </h2>

              <p className="text-sm text-stone-500">
                Revisa los valores antes de registrar la venta.
              </p>
            </div>

          </div>

        </div>

        <div className="p-5 sm:p-6 space-y-5">

          {/* SUBTOTAL */}

          <div className="flex items-center justify-between">

            <span className="text-stone-600">
              Subtotal
            </span>

            <span className="font-semibold text-stone-900">
              {formatCurrency(subtotal)}
            </span>

          </div>

          {/* DESCUENTO */}

          <div>

            <label className="block text-sm font-semibold text-stone-700 mb-2">
              Descuento
            </label>

            <div className="relative">

              <span
                className="
                  absolute
                  left-4
                  top-1/2
                  -translate-y-1/2
                  text-stone-400
                "
              >
                $
              </span>

              <input
                type="number"
                min="0"
                value={discount}
                onChange={(event) =>
                  setDiscount(event.target.value)
                }
                placeholder="0"
                className="
                  w-full
                  border
                  border-stone-300
                  rounded-xl
                  pl-9
                  pr-4
                  py-3
                  outline-none
                  focus:border-[#6F4E37]
                  focus:ring-2
                  focus:ring-[#6F4E37]/20
                "
              />

            </div>

          </div>

          {/* TOTAL */}

          <div
            className="
              border-t
              border-stone-200
              pt-5
              flex
              items-center
              justify-between
            "
          >

            <span className="text-xl font-bold text-stone-900">
              Total
            </span>

            <span className="text-2xl font-bold text-[#6F4E37]">
              {formatCurrency(total)}
            </span>

          </div>

        </div>

      </section>

      {/* =========================================
          FORMA DE PAGO
      ========================================= */}

      <section
        className="
          bg-white
          border
          border-stone-200
          rounded-xl
          shadow-sm
          overflow-hidden
        "
      >

        <div className="p-5 sm:p-6 border-b border-stone-200">

          <div className="flex items-center gap-3">

            <div
              className="
                w-10
                h-10
                rounded-xl
                bg-[#F3EDE7]
                text-[#6F4E37]
                flex
                items-center
                justify-center
              "
            >
              <Wallet size={19} />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-stone-900">
                Forma de pago
              </h2>

              <p className="text-sm text-stone-500">
                Selecciona cómo se realizará el pago.
              </p>
            </div>

          </div>

        </div>

        <div className="p-5 sm:p-6">

          {/* MÉTODOS */}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">

            {/* EFECTIVO */}

            <button
              type="button"
              onClick={() => {
                setPaymentMethod("EFECTIVO");
                setSelectedBank("");
                setReceivedAmount("");
              }}
              className={`
                rounded-xl
                border
                p-4
                text-left
                transition
                ${
                  paymentMethod === "EFECTIVO"
                    ? "border-[#6F4E37] bg-[#FAF7F4]"
                    : "border-stone-200 hover:bg-stone-50"
                }
              `}
            >

              <Banknote
                size={21}
                className="text-[#6F4E37]"
              />

              <p className="font-semibold mt-3">
                Efectivo
              </p>

              <p className="text-xs text-stone-500 mt-1">
                Pago inmediato
              </p>

            </button>

            {/* TRANSFERENCIA */}

            <button
              type="button"
              onClick={() => {
                setPaymentMethod("TRANSFERENCIA");
                setReceivedAmount("");
              }}
              className={`
                rounded-xl
                border
                p-4
                text-left
                transition
                ${
                  paymentMethod === "TRANSFERENCIA"
                    ? "border-[#6F4E37] bg-[#FAF7F4]"
                    : "border-stone-200 hover:bg-stone-50"
                }
              `}
            >

              <Landmark
                size={21}
                className="text-[#6F4E37]"
              />

              <p className="font-semibold mt-3">
                Transferencia
              </p>

              <p className="text-xs text-stone-500 mt-1">
                Banco o Nequi
              </p>

            </button>

            {/* CONTRA ENTREGA */}

            <button
              type="button"
              onClick={() => {
                setPaymentMethod("CONTRA_ENTREGA");
                setSelectedBank("");
                setReceivedAmount("");
              }}
              className={`
                rounded-xl
                border
                p-4
                text-left
                transition
                ${
                  paymentMethod === "CONTRA_ENTREGA"
                    ? "border-[#6F4E37] bg-[#FAF7F4]"
                    : "border-stone-200 hover:bg-stone-50"
                }
              `}
            >

              <ShoppingCart
                size={21}
                className="text-[#6F4E37]"
              />

              <p className="font-semibold mt-3">
                Contra entrega
              </p>

              <p className="text-xs text-stone-500 mt-1">
                Pago al entregar
              </p>

            </button>

            {/* CRÉDITO */}

            <button
              type="button"
              onClick={() => {
                setPaymentMethod("CREDITO");
                setSelectedBank("");
                setReceivedAmount("");
              }}
              className={`
                rounded-xl
                border
                p-4
                text-left
                transition
                ${
                  paymentMethod === "CREDITO"
                    ? "border-[#6F4E37] bg-[#FAF7F4]"
                    : "border-stone-200 hover:bg-stone-50"
                }
              `}
            >

              <CreditCard
                size={21}
                className="text-[#6F4E37]"
              />

              <p className="font-semibold mt-3">
                Crédito
              </p>

              <p className="text-xs text-stone-500 mt-1">
                Pasa a cartera
              </p>

            </button>

            {/* ABONO */}

            <button
              type="button"
              onClick={() => {
                setPaymentMethod("ABONO");
                setSelectedBank("");
              }}
              className={`
                rounded-xl
                border
                p-4
                text-left
                transition
                ${
                  paymentMethod === "ABONO"
                    ? "border-[#6F4E37] bg-[#FAF7F4]"
                    : "border-stone-200 hover:bg-stone-50"
                }
              `}
            >

              <Wallet
                size={21}
                className="text-[#6F4E37]"
              />

              <p className="font-semibold mt-3">
                Abono
              </p>

              <p className="text-xs text-stone-500 mt-1">
                Pago parcial
              </p>

            </button>

          </div>

          {/* =========================================
              TRANSFERENCIA
          ========================================= */}

          {paymentMethod === "TRANSFERENCIA" && (

            <div
              className="
                mt-5
                p-5
                rounded-xl
                bg-[#FAF7F4]
                border
                border-[#D9C8BB]
              "
            >

              <label className="block text-sm font-semibold text-stone-700 mb-2">
                Cuenta donde recibimos el dinero
              </label>

              <Select
                value={selectedBank}
                onChange={(value) =>
                  setSelectedBank(value)
                }
                placeholder="Seleccionar cuenta..."
                aria-label="Cuenta bancaria"
                options={bankAccounts.map((bank) => ({
                  value: bank.id,
                  label: bank.name,
                  icon: Landmark,
                }))}
              />

              <p className="text-xs text-stone-500 mt-2">
                Esta cuenta será la que posteriormente
                reciba el movimiento de la venta.
              </p>

            </div>

          )}

          {/* =========================================
              ABONO
          ========================================= */}

          {paymentMethod === "ABONO" && (

            <div
              className="
                mt-5
                p-5
                rounded-xl
                bg-[#FAF7F4]
                border
                border-[#D9C8BB]
              "
            >

              <label className="block text-sm font-semibold text-stone-700 mb-2">
                Valor del abono
              </label>

              <div className="relative">

                <span
                  className="
                    absolute
                    left-4
                    top-1/2
                    -translate-y-1/2
                    text-stone-400
                  "
                >
                  $
                </span>

                <input
                  type="number"
                  min="0"
                  max={total}
                  value={receivedAmount}
                  onChange={(event) =>
                    setReceivedAmount(event.target.value)
                  }
                  placeholder="0"
                  className="
                    w-full
                    border
                    border-stone-300
                    rounded-xl
                    pl-9
                    pr-4
                    py-3
                    outline-none
                    focus:border-[#6F4E37]
                    focus:ring-2
                    focus:ring-[#6F4E37]/20
                  "
                />

              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">

                <div className="bg-white rounded-xl p-4 border border-stone-200">

                  <p className="text-xs text-stone-500">
                    Abono
                  </p>

                  <p className="font-bold text-stone-900 mt-1">
                    {formatCurrency(received)}
                  </p>

                </div>

                <div className="bg-white rounded-xl p-4 border border-stone-200">

                  <p className="text-xs text-stone-500">
                    Saldo pendiente
                  </p>

                  <p className="font-bold text-red-600 mt-1">
                    {formatCurrency(pendingAmount)}
                  </p>

                </div>

              </div>

            </div>

          )}

          {/* =========================================
              EFECTIVO
          ========================================= */}

          {paymentMethod === "EFECTIVO" && (

            <div
              className="
                mt-5
                p-5
                rounded-xl
                bg-[#FAF7F4]
                border
                border-[#D9C8BB]
              "
            >

              <label className="block text-sm font-semibold text-stone-700 mb-2">
                Dinero recibido
              </label>

              <div className="relative">

                <span
                  className="
                    absolute
                    left-4
                    top-1/2
                    -translate-y-1/2
                    text-stone-400
                  "
                >
                  $
                </span>

                <input
                  type="number"
                  min="0"
                  value={receivedAmount}
                  onChange={(event) =>
                    setReceivedAmount(event.target.value)
                  }
                  placeholder="0"
                  className="
                    w-full
                    border
                    border-stone-300
                    rounded-xl
                    pl-9
                    pr-4
                    py-3
                    outline-none
                    focus:border-[#6F4E37]
                    focus:ring-2
                    focus:ring-[#6F4E37]/20
                  "
                />

              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">

                <div className="bg-white rounded-xl p-4 border border-stone-200">

                  <p className="text-xs text-stone-500">
                    Total
                  </p>

                  <p className="font-bold text-stone-900 mt-1">
                    {formatCurrency(total)}
                  </p>

                </div>

                <div className="bg-white rounded-xl p-4 border border-stone-200">

                  <p className="text-xs text-stone-500">
                    Cambio
                  </p>

                  <p className="font-bold text-green-600 mt-1">
                    {formatCurrency(change)}
                  </p>

                </div>

              </div>

            </div>

          )}

          {/* =========================================
              CRÉDITO
          ========================================= */}

          {paymentMethod === "CREDITO" && (

            <div
              className="
                mt-5
                rounded-xl
                bg-amber-50
                border
                border-amber-200
                p-5
              "
            >

              <p className="font-semibold text-stone-900">
                Venta a crédito
              </p>

              <p className="text-sm text-stone-600 mt-1">
                El valor completo de esta venta quedará
                pendiente y posteriormente aparecerá en
                Cartera.
              </p>

              <div className="mt-4 flex items-center justify-between">

                <span className="text-sm text-stone-600">
                  Saldo a cartera
                </span>

                <span className="font-bold text-amber-700">
                  {formatCurrency(total)}
                </span>

              </div>

            </div>

          )}

          {/* =========================================
              CONTRA ENTREGA
          ========================================= */}

          {paymentMethod === "CONTRA_ENTREGA" && (

            <div
              className="
                mt-5
                rounded-xl
                bg-blue-50
                border
                border-blue-200
                p-5
              "
            >

              <p className="font-semibold text-stone-900">
                Pago contra entrega
              </p>

              <p className="text-sm text-stone-600 mt-1">
                La venta quedará pendiente hasta que se
                realice el pago al momento de entregar.
              </p>

              <div className="mt-4 flex items-center justify-between">

                <span className="text-sm text-stone-600">
                  Valor pendiente
                </span>

                <span className="font-bold text-blue-700">
                  {formatCurrency(total)}
                </span>

              </div>

            </div>

          )}

        </div>

      </section>

      {/* =========================================
          RESUMEN FINAL
      ========================================= */}

      <section
        className="
          bg-[#FAF7F4]
          border
          border-[#D9C8BB]
          rounded-xl
          p-5
          sm:p-6
        "
      >

        {savingError && (
          <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
            {savingError}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">

          <div>

            <p className="text-sm text-stone-500">
              Total de la venta
            </p>

            <p className="text-3xl font-bold text-[#6F4E37] mt-1">
              {formatCurrency(total)}
            </p>

            {selectedCustomer && (
              <p className="text-sm text-stone-500 mt-2">
                Cliente: {selectedCustomer.fullName}
              </p>
            )}

          </div>

          <button
            type="button"
            onClick={handleSaveSale}
            disabled={!canSave}
            className="
              w-full
              sm:w-auto
              min-w-[220px]
              inline-flex
              items-center
              justify-center
              gap-2
              bg-[#6F4E37]
              hover:bg-[#5B3F2D]
              disabled:bg-stone-300
              disabled:text-stone-500
              disabled:cursor-not-allowed
              text-white
              px-7
              py-4
              rounded-xl
              font-semibold
              transition
            "
          >
            {saving && <Loader2 size={17} className="animate-spin" />}
            Registrar venta
          </button>

        </div>

        {!canSave && items.length > 0 && (
          <p className="text-sm text-red-500 mt-4">
            {!selectedCustomer
              ? "Selecciona un cliente para continuar."
              : paymentMethod === "TRANSFERENCIA" &&
                !selectedBank
              ? "Selecciona la cuenta donde recibiste la transferencia."
              : paymentMethod === "ABONO" &&
                received <= 0
              ? "Ingresa el valor del abono."
              : "Revisa la información de la venta."}
          </p>
        )}

      </section>

    </div>
  );
}