import {
  ArrowLeft,
  Banknote,
  CreditCard,
  Landmark,
  Save,
  ShoppingCart,
  UserRound,
  Wallet,
} from "lucide-react";
import { useState } from "react";

type Customer = {
  id: number;
  name: string;
  document: string;
};

type SaleItem = {
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

export type EditableSale = {
  id: number;
  invoice: string;
  customer: Customer;
  items: SaleItem[];
  discount: number;
  paymentMethod: PaymentMethod;
  bank?: string;
  receivedAmount?: number;
};

type EditSaleProps = {
  sale: EditableSale;
  onBack: () => void;
  onSaved: () => void;
};

const bankAccounts = [
  {
    id: "111005",
    name: "Bancolombia Cta Omar",
  },
  {
    id: "111006",
    name: "Bancolombia Cta Cheo",
  },
  {
    id: "111007",
    name: "Bancolombia Cta Emiliano",
  },
  {
    id: "111008",
    name: "Nequi Gustavo",
  },
  {
    id: "111009",
    name: "Cruce de Cuentas Migdo",
  },
];

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

function formatCurrency(value: number) {
  return value.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

export default function EditSale({
  sale,
  onBack,
  onSaved,
}: EditSaleProps) {
  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer>(sale.customer);

  const [customerSearch, setCustomerSearch] =
    useState("");

  const [items, setItems] = useState<SaleItem[]>(
    sale.items
  );

  const [discount, setDiscount] = useState(
    sale.discount.toString()
  );

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>(sale.paymentMethod);

  const [selectedBank, setSelectedBank] =
    useState(sale.bank ?? "");

  const [receivedAmount, setReceivedAmount] =
    useState(
      sale.receivedAmount?.toString() ?? ""
    );

  const [saved, setSaved] = useState(false);

  const filteredCustomers = customers.filter(
    (customer) => {
      const value = customerSearch
        .toLowerCase()
        .trim();

      if (!value) {
        return false;
      }

      return (
        customer.name
          .toLowerCase()
          .includes(value) ||
        customer.document.includes(value)
      );
    }
  );

  const subtotal = items.reduce(
    (total, item) =>
      total + item.price * item.quantity,
    0
  );

  const discountValue = Math.min(
    Number(discount) || 0,
    subtotal
  );

  const total = Math.max(
    subtotal - discountValue,
    0
  );

  const received =
    Number(receivedAmount) || 0;

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

  const increaseQuantity = (id: string) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity: item.quantity + 1,
            }
          : item
      )
    );
  };

  const decreaseQuantity = (id: string) => {
    setItems((current) =>
      current
        .map((item) =>
          item.id === id
            ? {
                ...item,
                quantity: item.quantity - 1,
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (id: string) => {
    setItems((current) =>
      current.filter((item) => item.id !== id)
    );
  };

  const handleSave = () => {
    if (!canSave) {
      return;
    }

    setSaved(true);

    setTimeout(() => {
      onSaved();
    }, 1200);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* ENCABEZADO */}

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
            Editar venta
          </h1>

          <p className="text-stone-500 mt-1">
            Modifica la información de {sale.invoice}.
          </p>
        </div>

      </div>

      {/* INFORMACIÓN DE FACTURA */}

      <div className="bg-[#FAF7F4] border border-[#D9C8BB] rounded-2xl p-5">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

          <div>
            <p className="text-sm text-stone-500">
              Factura
            </p>

            <p className="text-xl font-bold text-[#6F4E37]">
              {sale.invoice}
            </p>
          </div>

          <span className="text-sm text-stone-500">
            Editando información de la venta
          </span>

        </div>

      </div>

      {/* CLIENTE */}

      <section className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">

        <div className="p-5 sm:p-6 border-b border-stone-200">

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-xl bg-[#F3EDE7] text-[#6F4E37] flex items-center justify-center">
              <UserRound size={19} />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-stone-900">
                Cliente
              </h2>

              <p className="text-sm text-stone-500">
                Puedes cambiar el cliente de la venta.
              </p>
            </div>

          </div>

        </div>

        <div className="p-5 sm:p-6">

          <div className="border border-[#D9C8BB] bg-[#FAF7F4] rounded-xl p-4">

            <div className="flex items-center justify-between gap-4">

              <div className="flex items-center gap-3">

                <div className="w-10 h-10 rounded-full bg-[#6F4E37] text-white flex items-center justify-center">
                  <UserRound size={18} />
                </div>

                <div>
                  <p className="font-semibold text-stone-900">
                    {selectedCustomer.name}
                  </p>

                  <p className="text-sm text-stone-500">
                    Documento:{" "}
                    {selectedCustomer.document}
                  </p>
                </div>

              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedCustomer(
                    selectedCustomer
                  )
                }
                className="
                  text-sm
                  font-semibold
                  text-[#6F4E37]
                "
              >
                Actual
              </button>

            </div>

          </div>

          <div className="mt-4">

            <input
              type="text"
              value={customerSearch}
              onChange={(event) =>
                setCustomerSearch(
                  event.target.value
                )
              }
              placeholder="Buscar otro cliente..."
              className="
                w-full
                border
                border-stone-300
                rounded-xl
                px-4
                py-3
                outline-none
                focus:border-[#6F4E37]
                focus:ring-2
                focus:ring-[#6F4E37]/20
              "
            />

            {customerSearch.trim() !== "" && (
              <div className="mt-2 border border-stone-200 rounded-xl overflow-hidden">

                {filteredCustomers.map(
                  (customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => {
                        setSelectedCustomer(
                          customer
                        );
                        setCustomerSearch("");
                      }}
                      className="
                        w-full
                        text-left
                        px-4
                        py-3
                        border-b
                        last:border-0
                        border-stone-100
                        hover:bg-stone-50
                      "
                    >
                      <p className="font-semibold text-stone-800">
                        {customer.name}
                      </p>

                      <p className="text-sm text-stone-500">
                        {customer.document}
                      </p>
                    </button>
                  )
                )}

                {filteredCustomers.length === 0 && (
                  <p className="p-4 text-sm text-stone-500">
                    No encontramos ese cliente.
                  </p>
                )}

              </div>
            )}

          </div>

        </div>

      </section>

      {/* PRODUCTOS */}

      <section className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">

        <div className="p-5 sm:p-6 border-b border-stone-200">

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-xl bg-[#F3EDE7] text-[#6F4E37] flex items-center justify-center">
              <ShoppingCart size={19} />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-stone-900">
                Productos
              </h2>

              <p className="text-sm text-stone-500">
                Modifica las cantidades o elimina productos.
              </p>
            </div>

          </div>

        </div>

        <div className="p-5 sm:p-6 space-y-3">

          {items.length === 0 ? (

            <div className="border-2 border-dashed border-stone-200 rounded-xl p-8 text-center">

              <p className="text-stone-500">
                No hay productos en esta venta.
              </p>

            </div>

          ) : (

            items.map((item) => (

              <div
                key={item.id}
                className="
                  border
                  border-stone-200
                  rounded-xl
                  p-4
                  flex
                  flex-col
                  sm:flex-row
                  sm:items-center
                  gap-4
                "
              >

                <div className="flex-1">

                  <p className="font-semibold text-stone-900">
                    {item.name}
                  </p>

                  <p className="text-sm text-stone-500 mt-1">
                    {item.size} · {item.type}
                  </p>

                  <p className="text-sm text-[#6F4E37] font-semibold mt-2">
                    {formatCurrency(item.price)}
                    {" "}unidad
                  </p>

                </div>

                <div className="flex items-center gap-3">

                  <button
                    type="button"
                    onClick={() =>
                      decreaseQuantity(item.id)
                    }
                    className="
                      w-9
                      h-9
                      rounded-lg
                      border
                      border-stone-300
                      hover:bg-stone-50
                    "
                  >
                    −
                  </button>

                  <span className="w-6 text-center font-semibold">
                    {item.quantity}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      increaseQuantity(item.id)
                    }
                    className="
                      w-9
                      h-9
                      rounded-lg
                      border
                      border-stone-300
                      hover:bg-stone-50
                    "
                  >
                    +
                  </button>

                </div>

                <div className="sm:w-32 sm:text-right">

                  <p className="text-xs text-stone-400">
                    Total
                  </p>

                  <p className="font-bold text-stone-900">
                    {formatCurrency(
                      item.price *
                        item.quantity
                    )}
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    removeItem(item.id)
                  }
                  className="
                    text-sm
                    text-red-500
                    hover:text-red-700
                    font-medium
                  "
                >
                  Eliminar
                </button>

              </div>

            ))

          )}

        </div>

      </section>

      {/* RESUMEN */}

      <section className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">

        <div className="p-5 sm:p-6 border-b border-stone-200">

          <h2 className="text-lg font-semibold text-stone-900">
            Resumen
          </h2>

          <p className="text-sm text-stone-500 mt-1">
            Ajusta el descuento y revisa el total.
          </p>

        </div>

        <div className="p-5 sm:p-6 space-y-5">

          <div className="flex items-center justify-between">

            <span className="text-stone-600">
              Subtotal
            </span>

            <span className="font-semibold text-stone-900">
              {formatCurrency(subtotal)}
            </span>

          </div>

          <div>

            <label className="block text-sm font-semibold text-stone-700 mb-2">
              Descuento
            </label>

            <div className="relative">

              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
                $
              </span>

              <input
                type="number"
                min="0"
                value={discount}
                onChange={(event) =>
                  setDiscount(
                    event.target.value
                  )
                }
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
                "
              />

            </div>

          </div>

          <div className="border-t border-stone-200 pt-5 flex items-center justify-between">

            <span className="text-xl font-bold text-stone-900">
              Total
            </span>

            <span className="text-2xl font-bold text-[#6F4E37]">
              {formatCurrency(total)}
            </span>

          </div>

        </div>

      </section>

      {/* FORMA DE PAGO */}

      <section className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">

        <div className="p-5 sm:p-6 border-b border-stone-200">

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-xl bg-[#F3EDE7] text-[#6F4E37] flex items-center justify-center">
              <Wallet size={19} />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-stone-900">
                Forma de pago
              </h2>

              <p className="text-sm text-stone-500">
                Modifica cómo se realizó el pago.
              </p>
            </div>

          </div>

        </div>

        <div className="p-5 sm:p-6">

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">

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

            <button
              type="button"
              onClick={() => {
                setPaymentMethod(
                  "transferencia"
                );
                setReceivedAmount("");
              }}
              className={`
                rounded-xl
                border
                p-4
                text-left
                transition
                ${
                  paymentMethod ===
                  "transferencia"
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

            <button
              type="button"
              onClick={() => {
                setPaymentMethod(
                  "contra_entrega"
                );
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
                  paymentMethod ===
                  "contra_entrega"
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

          {/* TRANSFERENCIA */}

          {paymentMethod ===
            "transferencia" && (

            <div className="mt-5 p-5 rounded-xl bg-[#FAF7F4] border border-[#D9C8BB]">

              <label className="block text-sm font-semibold text-stone-700 mb-2">
                Cuenta donde recibimos el dinero
              </label>

              <select
                value={selectedBank}
                onChange={(event) =>
                  setSelectedBank(
                    event.target.value
                  )
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

                {bankAccounts.map(
                  (bank) => (
                    <option
                      key={bank.id}
                      value={bank.id}
                    >
                      {bank.name}
                    </option>
                  )
                )}

              </select>

            </div>

          )}

          {/* ABONO */}

          {paymentMethod === "abono" && (

            <div className="mt-5 p-5 rounded-xl bg-[#FAF7F4] border border-[#D9C8BB]">

              <label className="block text-sm font-semibold text-stone-700 mb-2">
                Valor del abono
              </label>

              <input
                type="number"
                min="0"
                max={total}
                value={receivedAmount}
                onChange={(event) =>
                  setReceivedAmount(
                    event.target.value
                  )
                }
                className="
                  w-full
                  border
                  border-stone-300
                  rounded-xl
                  px-4
                  py-3
                  outline-none
                  focus:border-[#6F4E37]
                "
              />

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
                    {formatCurrency(
                      pendingAmount
                    )}
                  </p>

                </div>

              </div>

            </div>

          )}

          {/* EFECTIVO */}

          {paymentMethod === "efectivo" && (

            <div className="mt-5 p-5 rounded-xl bg-[#FAF7F4] border border-[#D9C8BB]">

              <label className="block text-sm font-semibold text-stone-700 mb-2">
                Dinero recibido
              </label>

              <input
                type="number"
                min="0"
                value={receivedAmount}
                onChange={(event) =>
                  setReceivedAmount(
                    event.target.value
                  )
                }
                className="
                  w-full
                  border
                  border-stone-300
                  rounded-xl
                  px-4
                  py-3
                  outline-none
                  focus:border-[#6F4E37]
                "
              />

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

          {/* CRÉDITO */}

          {paymentMethod === "credito" && (

            <div className="mt-5 rounded-xl bg-amber-50 border border-amber-200 p-5">

              <p className="font-semibold text-stone-900">
                Venta a crédito
              </p>

              <p className="text-sm text-stone-600 mt-1">
                El valor pendiente se registrará
                posteriormente en Cartera.
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

          {/* CONTRA ENTREGA */}

          {paymentMethod ===
            "contra_entrega" && (

            <div className="mt-5 rounded-xl bg-blue-50 border border-blue-200 p-5">

              <p className="font-semibold text-stone-900">
                Pago contra entrega
              </p>

              <p className="text-sm text-stone-600 mt-1">
                La venta quedará pendiente hasta
                recibir el pago.
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

      {/* GUARDAR */}

      <section className="bg-[#FAF7F4] border border-[#D9C8BB] rounded-2xl p-5 sm:p-6">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">

          <div>

            <p className="text-sm text-stone-500">
              Total actualizado
            </p>

            <p className="text-3xl font-bold text-[#6F4E37] mt-1">
              {formatCurrency(total)}
            </p>

          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="
              w-full
              sm:w-auto
              min-w-[220px]
              flex
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
            <Save size={19} />
            Guardar cambios
          </button>

        </div>

        {!canSave && (
          <p className="text-sm text-red-500 mt-4">
            Revisa los datos de la venta antes de guardar.
          </p>
        )}

        {saved && (
          <div className="mt-4 bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 font-medium">
            ✓ Cambios guardados correctamente.
          </div>
        )}

      </section>

    </div>
  );
}