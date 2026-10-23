import {
  X,
  Receipt,
  UserRound,
  CalendarDays,
  CreditCard,
  Landmark,
  CheckCircle2,
  Clock3,
  Package,
} from "lucide-react";

type SaleItem = {
  name: string;
  size: string;
  type: string;
  quantity: number;
  price: number;
};

type Sale = {
  invoice: string;
  customer: string;
  date: string;
  total: number;
  payment: string;
  status: "Pagada" | "Pendiente" | "Anulada";
  subtotal: number;
  discount: number;
  bank?: string;
  items: SaleItem[];
};

type SaleDetailModalProps = {
  sale: Sale | null;
  onClose: () => void;
};

function formatCurrency(value: number) {
  return value.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

export default function SaleDetailModal({
  sale,
  onClose,
}: SaleDetailModalProps) {
  if (!sale) {
    return null;
  }

  const getPaymentIcon = () => {
    if (sale.payment === "Transferencia") {
      return <Landmark size={18} />;
    }

    return <CreditCard size={18} />;
  };

  return (
    <div
      className="
        fixed
        inset-0
        z-50
        bg-black/40
        flex
        items-center
        justify-center
        p-4
      "
      onClick={onClose}
    >
      <div
        className="
          w-full
          max-w-2xl
          max-h-[90vh]
          overflow-y-auto
          bg-white
          rounded-2xl
          shadow-2xl
        "
        onClick={(event) => event.stopPropagation()}
      >

        {/* ENCABEZADO */}

        <div className="sticky top-0 z-10 bg-white border-b border-stone-200 px-5 sm:px-6 py-4">

          <div className="flex items-center justify-between gap-4">

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
                <Receipt size={19} />
              </div>

              <div>
                <h2 className="text-lg font-bold text-stone-900">
                  Detalle de venta
                </h2>

                <p className="text-sm text-stone-500">
                  Factura {sale.invoice}
                </p>
              </div>

            </div>

            <button
              type="button"
              onClick={onClose}
              className="
                w-9
                h-9
                rounded-lg
                flex
                items-center
                justify-center
                text-stone-500
                hover:bg-stone-100
                transition
              "
            >
              <X size={20} />
            </button>

          </div>

        </div>

        <div className="p-5 sm:p-6 space-y-5">

          {/* INFORMACIÓN GENERAL */}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

            <div className="border border-stone-200 rounded-xl p-4">

              <div className="flex items-center gap-2 text-stone-500">
                <UserRound size={17} />

                <span className="text-sm">
                  Cliente
                </span>
              </div>

              <p className="font-semibold text-stone-900 mt-2">
                {sale.customer}
              </p>

            </div>

            <div className="border border-stone-200 rounded-xl p-4">

              <div className="flex items-center gap-2 text-stone-500">
                <CalendarDays size={17} />

                <span className="text-sm">
                  Fecha
                </span>
              </div>

              <p className="font-semibold text-stone-900 mt-2">
                {sale.date}
              </p>

            </div>

          </div>

          {/* ESTADO */}

          <div className="border border-stone-200 rounded-xl p-4">

            <div className="flex items-center justify-between gap-4">

              <div className="flex items-center gap-3">

                {sale.status === "Pagada" && (
                  <div className="w-10 h-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
                    <CheckCircle2 size={20} />
                  </div>
                )}

                {sale.status === "Pendiente" && (
                  <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                    <Clock3 size={20} />
                  </div>
                )}

                {sale.status === "Anulada" && (
                  <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                    <X size={20} />
                  </div>
                )}

                <div>
                  <p className="text-sm text-stone-500">
                    Estado de la venta
                  </p>

                  <p className="font-semibold text-stone-900 mt-1">
                    {sale.status}
                  </p>
                </div>

              </div>

              {sale.status === "Pagada" && (
                <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                  Pagada
                </span>
              )}

              {sale.status === "Pendiente" && (
                <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">
                  Pendiente
                </span>
              )}

              {sale.status === "Anulada" && (
                <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                  Anulada
                </span>
              )}

            </div>

          </div>

          {/* PRODUCTOS */}

          <div className="border border-stone-200 rounded-xl overflow-hidden">

            <div className="px-4 py-4 border-b border-stone-200 flex items-center gap-2">

              <Package
                size={18}
                className="text-[#6F4E37]"
              />

              <h3 className="font-semibold text-stone-900">
                Productos
              </h3>

            </div>

            <div className="divide-y divide-stone-100">

              {sale.items.map((item, index) => (

                <div
                  key={`${item.name}-${item.size}-${index}`}
                  className="p-4"
                >

                  <div className="flex items-start justify-between gap-4">

                    <div>

                      <p className="font-semibold text-stone-900">
                        {item.name}
                      </p>

                      <p className="text-sm text-stone-500 mt-1">
                        {item.size} · {item.type}
                      </p>

                      <p className="text-sm text-stone-500 mt-1">
                        {item.quantity} ×{" "}
                        {formatCurrency(item.price)}
                      </p>

                    </div>

                    <p className="font-semibold text-stone-900">
                      {formatCurrency(
                        item.quantity * item.price
                      )}
                    </p>

                  </div>

                </div>

              ))}

            </div>

          </div>

          {/* PAGO */}

          <div className="border border-stone-200 rounded-xl p-4">

            <div className="flex items-center gap-2">

              <div className="text-[#6F4E37]">
                {getPaymentIcon()}
              </div>

              <h3 className="font-semibold text-stone-900">
                Forma de pago
              </h3>

            </div>

            <div className="mt-4 flex items-center justify-between">

              <span className="text-stone-500">
                Método
              </span>

              <span className="font-semibold text-stone-900">
                {sale.payment}
              </span>

            </div>

            {sale.bank && (
              <div className="mt-3 flex items-center justify-between">

                <span className="text-stone-500">
                  Cuenta
                </span>

                <span className="font-semibold text-stone-900 text-right">
                  {sale.bank}
                </span>

              </div>
            )}

          </div>

          {/* TOTALES */}

          <div className="bg-[#FAF7F4] border border-[#D9C8BB] rounded-xl p-5">

            <div className="flex items-center justify-between">

              <span className="text-stone-600">
                Subtotal
              </span>

              <span className="font-medium text-stone-800">
                {formatCurrency(sale.subtotal)}
              </span>

            </div>

            <div className="flex items-center justify-between mt-3">

              <span className="text-stone-600">
                Descuento
              </span>

              <span className="font-medium text-stone-800">
                - {formatCurrency(sale.discount)}
              </span>

            </div>

            <div className="border-t border-[#D9C8BB] mt-4 pt-4 flex items-center justify-between">

              <span className="text-lg font-bold text-stone-900">
                Total
              </span>

              <span className="text-2xl font-bold text-[#6F4E37]">
                {formatCurrency(sale.total)}
              </span>

            </div>

          </div>

        </div>

        {/* PIE */}

        <div className="border-t border-stone-200 px-5 sm:px-6 py-4 flex justify-end">

          <button
            type="button"
            onClick={onClose}
            className="
              w-full
              sm:w-auto
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
            Cerrar
          </button>

        </div>

      </div>
    </div>
  );
}