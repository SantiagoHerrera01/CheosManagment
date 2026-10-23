import {
  ArrowLeft,
  Banknote,
  CreditCard,
  Landmark,
  ShoppingCart,
  UserRound,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";

import SaleProducts from "./SaleProducts";

type Customer = {
  id: number;
  name: string;
  document: string;
};

type CartItem = {
  id: string;
  productId: number;
  name: string;
  size: string;
  type: string;
  price: number;
  cost: number;
  quantity: number;
};

type PaymentMethod =
  | "efectivo"
  | "transferencia"
  | "contra_entrega"
  | "credito"
  | "abono";

type NewSaleProps = {
  onBack: () => void;
};

const customers: Customer[] = [
  {
    id: 1,
    name: "Consumidor Final",
    document: "222222222",
  },
  {
    id: 2,
    name: "Juan Pérez",
    document: "10203040",
  },
  {
    id: 3,
    name: "Café Central",
    document: "900456789",
  },
  {
    id: 4,
    name: "Tienda La 80",
    document: "901234567",
  },
];

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

export default function NewSale({ onBack }: NewSaleProps) {
  const [search, setSearch] = useState("");

  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);

  const [items, setItems] = useState<CartItem[]>([]);

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("efectivo");

  const [selectedBank, setSelectedBank] = useState("");

  const [discount, setDiscount] = useState("");

  const [receivedAmount, setReceivedAmount] = useState("");

  const [saved, setSaved] = useState(false);

  const filteredCustomers = customers.filter((customer) => {
    const value = search.toLowerCase().trim();

    if (!value) {
      return false;
    }

    return (
      customer.name.toLowerCase().includes(value) ||
      customer.document.includes(value)
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
    selectedCustomer !== null &&
    items.length > 0 &&
    total > 0 &&
    (paymentMethod !== "transferencia" ||
      selectedBank !== "") &&
    (paymentMethod !== "abono" ||
      received > 0);

  const handleSaveSale = () => {
    if (!canSave) {
      return;
    }

    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 3000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* =========================================
          ENCABEZADO
      ========================================= */}

      <div className="flex items-center gap-4">

        <button
          type="button"
          onClick={onBack}
          className="
            w-10
            h-10
            rounded-xl
            border
            border-stone-200
            bg-white
            flex
            items-center
            justify-center
            text-stone-600
            hover:bg-stone-50
            transition
            shrink-0
          "
        >
          <ArrowLeft size={20} />
        </button>

        <div>
          <h1 className="text-3xl font-bold text-stone-900">
            Nueva venta
          </h1>

          <p className="text-stone-500 mt-1">
            Registra una nueva venta de Cheo's Café.
          </p>
        </div>

      </div>

      {/* =========================================
          CLIENTE
      ========================================= */}

      <section className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">

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
                      {selectedCustomer.name}
                    </p>

                    <p className="text-sm text-stone-500">
                      Documento: {selectedCustomer.document}
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
                            {customer.name}
                          </p>

                          <p className="text-sm text-stone-500">
                            {customer.document}
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
          rounded-2xl
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
          rounded-2xl
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
                setPaymentMethod("efectivo");
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
                  paymentMethod === "efectivo"
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
                setPaymentMethod("transferencia");
                setReceivedAmount("");
              }}
              className={`
                rounded-xl
                border
                p-4
                text-left
                transition
                ${
                  paymentMethod === "transferencia"
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
                setPaymentMethod("contra_entrega");
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
                  paymentMethod === "contra_entrega"
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
                setPaymentMethod("credito");
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
                  paymentMethod === "credito"
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
                setPaymentMethod("abono");
                setSelectedBank("");
              }}
              className={`
                rounded-xl
                border
                p-4
                text-left
                transition
                ${
                  paymentMethod === "abono"
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

          {paymentMethod === "transferencia" && (

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

              <select
                value={selectedBank}
                onChange={(event) =>
                  setSelectedBank(event.target.value)
                }
                className="
                  w-full
                  border
                  border-stone-300
                  rounded-xl
                  bg-white
                  px-4
                  py-3
                  outline-none
                  focus:border-[#6F4E37]
                "
              >

                <option value="">
                  Seleccionar cuenta...
                </option>

                {bankAccounts.map((bank) => (

                  <option
                    key={bank.id}
                    value={bank.id}
                  >
                    {bank.name}
                  </option>

                ))}

              </select>

              <p className="text-xs text-stone-500 mt-2">
                Esta cuenta será la que posteriormente
                reciba el movimiento de la venta.
              </p>

            </div>

          )}

          {/* =========================================
              ABONO
          ========================================= */}

          {paymentMethod === "abono" && (

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

          {paymentMethod === "efectivo" && (

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

          {paymentMethod === "credito" && (

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

          {paymentMethod === "contra_entrega" && (

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
          rounded-2xl
          p-5
          sm:p-6
        "
      >

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
                Cliente: {selectedCustomer.name}
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
            Registrar venta
          </button>

        </div>

        {!canSave && items.length > 0 && (
          <p className="text-sm text-red-500 mt-4">
            {!selectedCustomer
              ? "Selecciona un cliente para continuar."
              : paymentMethod === "transferencia" &&
                !selectedBank
              ? "Selecciona la cuenta donde recibiste la transferencia."
              : paymentMethod === "abono" &&
                received <= 0
              ? "Ingresa el valor del abono."
              : "Revisa la información de la venta."}
          </p>
        )}

        {saved && (
          <div
            className="
              mt-4
              bg-green-50
              border
              border-green-200
              text-green-700
              rounded-xl
              p-4
              font-medium
            "
          >
            ✓ Venta registrada correctamente.
          </div>
        )}

      </section>

    </div>
  );
}