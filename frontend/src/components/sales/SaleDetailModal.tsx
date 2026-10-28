import { useEffect, useState } from "react";

import {
  Receipt,
  UserRound,
  CalendarDays,
  CreditCard,
  Landmark,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  Ban,
  MessageCircle,
  Package,
  Loader2,
} from "lucide-react";

import { api, ApiError } from "../../lib/api";
import Modal from "../ui/Modal";
import {
  INVOICE_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
} from "../../lib/labels";
import type { Invoice } from "../../types/api";

type SaleDetailModalProps = {
  invoice: Invoice | null;
  onClose: () => void;
};

function formatCurrency(value: number) {
  return value.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO");
}

/**
 * Normaliza un celular colombiano para wa.me: solo dÃ­gitos, sin cero inicial
 * y con prefijo 57 (R9).
 */
function whatsappPhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");

  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (!digits.startsWith("57")) {
    digits = `57${digits}`;
  }

  return digits;
}

export default function SaleDetailModal({
  invoice,
  onClose,
}: SaleDetailModalProps) {
  /*
   * El detalle fresco se guarda junto al id al que pertenece: asÃ­, al cambiar
   * de factura, los valores derivados de abajo se "resetean" solos y no hace
   * falta (ni se permite) hacer setState sÃ­ncrono dentro del effect.
   */
  const [result, setResult] = useState<{
    id: string;
    invoice: Invoice;
  } | null>(null);

  const [failure, setFailure] = useState<{
    id: string;
    message: string;
  } | null>(null);

  const invoiceId = invoice?.id ?? null;

  /*
   * REFRESCA EL DETALLE (items + payments frescos)
   */
  useEffect(() => {
    if (!invoiceId) return;

    let cancelled = false;

    api
      .get<Invoice>(`/invoices/${invoiceId}`)
      .then((fresh) => {
        if (!cancelled) {
          setResult({ id: invoiceId, invoice: fresh });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setFailure({
            id: invoiceId,
            message:
              error instanceof ApiError
                ? error.message
                : "No fue posible cargar el detalle de la factura.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [invoiceId]);

  const detail =
    result && result.id === invoiceId ? result.invoice : null;
  const loadError =
    failure && failure.id === invoiceId ? failure.message : null;
  const loading = Boolean(invoiceId) && !detail && !loadError;

  if (!invoice) {
    return null;
  }

  // Mientras carga el refresco, mostramos la factura de la lista.
  const current = detail ?? invoice;

  const getStatusIcon = () => {
    if (current.status === "PAGADA") {
      return (
        <div className="w-10 h-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
          <CheckCircle2 size={20} />
        </div>
      );
    }

    if (current.status === "PENDIENTE") {
      return (
        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
          <Clock3 size={20} />
        </div>
      );
    }

    if (current.status === "VENCIDA") {
      return (
        <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
          <AlertTriangle size={20} />
        </div>
      );
    }

    return (
      <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-500 flex items-center justify-center">
        <Ban size={20} />
      </div>
    );
  };

  const getStatusBadgeClass = () => {
    if (current.status === "PAGADA") {
      return "px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold";
    }

    if (current.status === "PENDIENTE") {
      return "px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold";
    }

    if (current.status === "VENCIDA") {
      return "px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold";
    }

    return "px-3 py-1 rounded-full bg-stone-200 text-stone-600 text-xs font-semibold line-through";
  };

  const getPaymentIcon = () => {
    if (
      current.paymentMethod === "TRANSFERENCIA" ||
      current.paymentMethod === "CONTRA_ENTREGA"
    ) {
      return <Landmark size={18} />;
    }

    return <CreditCard size={18} />;
  };

  return (
    <Modal
      icon={Receipt}
      title="Detalle de venta"
      subtitle={`Factura #${current.number}`}
      onClose={onClose}
      size="lg"
      footer={
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

          <p className="text-sm text-stone-500">
            Factura creada por{" "}
            <span className="font-semibold text-stone-700">
              {current.createdBy.fullName}
            </span>
          </p>

          <div className="flex items-center gap-3">

            {current.client.phone && (
              <a
                href={`https://wa.me/${whatsappPhone(current.client.phone)}?text=${encodeURIComponent(
                  `Hola ${current.client.fullName}, te compartimos el detalle de la factura ${current.number}: total ${formatCurrency(
                    current.total
                  )}${
                    current.balance > 0
                      ? ` con saldo pendiente de ${formatCurrency(current.balance)}`
                      : " (pagada)"
                  }. Â¡Gracias por tu compra! â˜•`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
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
                  bg-emerald-600
                  hover:bg-emerald-700
                  text-white
                  font-semibold
                  transition
                "
              >
                <MessageCircle size={18} />
                Enviar por WhatsApp
              </a>
            )}

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
      }
    >
      <div className="space-y-5">

          {/* ERROR DE CARGA */}

          {loadError && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {loadError}
            </div>
          )}

          {/* CARGANDO */}

          {loading && !detail && (
            <div className="py-10 text-center">
              <Loader2
                size={28}
                className="mx-auto text-[#6F4E37] animate-spin"
              />

              <p className="mt-3 text-sm text-stone-500">
                Cargando detalleâ€¦
              </p>
            </div>
          )}

          {/* INFORMACIÃ“N GENERAL */}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

            <div className="border border-stone-200 rounded-xl p-4">

              <div className="flex items-center gap-2 text-stone-500">
                <UserRound size={17} />

                <span className="text-sm">
                  Cliente
                </span>
              </div>

              <p className="font-semibold text-stone-900 mt-2">
                {current.client.fullName}
              </p>

              <p className="text-sm text-stone-500 mt-1">
                CC/NIT {current.client.documentNumber}
              </p>

            </div>

            <div className="border border-stone-200 rounded-xl p-4">

              <div className="flex items-center gap-2 text-stone-500">
                <CalendarDays size={17} />

                <span className="text-sm">
                  Fechas
                </span>
              </div>

              <p className="font-semibold text-stone-900 mt-2">
                {formatDate(current.issueDate)}
              </p>

              <p className="text-sm text-stone-500 mt-1">
                Vence: {formatDate(current.dueDate)}
              </p>

            </div>

          </div>

          {/* ESTADO Y MÃ‰TODO */}

          <div className="border border-stone-200 rounded-xl p-4">

            <div className="flex items-center justify-between gap-4">

              <div className="flex items-center gap-3">

                {getStatusIcon()}

                <div>
                  <p className="text-sm text-stone-500">
                    Estado de la venta
                  </p>

                  <p className="font-semibold text-stone-900 mt-1">
                    {INVOICE_STATUS_LABELS[current.status]}
                  </p>
                </div>

              </div>

              <span className={getStatusBadgeClass()}>
                {INVOICE_STATUS_LABELS[current.status]}
              </span>

            </div>

            <div className="border-t border-stone-100 mt-4 pt-4 flex items-center justify-between">

              <div className="flex items-center gap-2 text-stone-500">
                <div className="text-[#6F4E37]">
                  {getPaymentIcon()}
                </div>

                <span className="text-sm">
                  MÃ©todo de pago
                </span>
              </div>

              <span className="font-semibold text-stone-900">
                {PAYMENT_METHOD_LABELS[current.paymentMethod]}
              </span>

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

            {current.items && current.items.length > 0 ? (

              <div className="overflow-x-auto">

                <table className="w-full min-w-[480px]">

                  <thead>

                    <tr className="bg-stone-50 border-b border-stone-200">

                      <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase">
                        Producto
                      </th>

                      <th className="text-center px-4 py-3 text-xs font-semibold text-stone-500 uppercase">
                        Cant.
                      </th>

                      <th className="text-right px-4 py-3 text-xs font-semibold text-stone-500 uppercase">
                        Precio unitario
                      </th>

                      <th className="text-right px-4 py-3 text-xs font-semibold text-stone-500 uppercase">
                        Subtotal
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {current.items.map((item) => (

                      <tr
                        key={item.id}
                        className="border-b border-stone-100 last:border-0"
                      >

                        <td className="px-4 py-3">

                          <p className="font-semibold text-stone-900">
                            {item.productName}
                          </p>

                          <p className="text-sm text-stone-500 mt-0.5">
                            {item.presentationLabel}
                          </p>

                        </td>

                        <td className="px-4 py-3 text-center text-sm text-stone-700">
                          {item.quantity}
                        </td>

                        <td className="px-4 py-3 text-right text-sm text-stone-700">
                          {formatCurrency(item.unitPrice)}
                        </td>

                        <td className="px-4 py-3 text-right font-semibold text-stone-900">
                          {formatCurrency(item.subtotal)}
                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            ) : (
              <div className="px-4 py-6 text-center text-sm text-stone-500">
                Sin productos para mostrar.
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
                {formatCurrency(current.subtotal)}
              </span>

            </div>

            <div className="flex items-center justify-between mt-3">

              <span className="text-stone-600">
                Descuento
              </span>

              <span className="font-medium text-stone-800">
                - {formatCurrency(current.discount)}
              </span>

            </div>

            <div className="flex items-center justify-between mt-3">

              <span className="text-stone-600">
                Total abonado
              </span>

              <span className="font-medium text-stone-800">
                {formatCurrency(current.totalPaid)}
              </span>

            </div>

            <div className="border-t border-[#D9C8BB] mt-4 pt-4 flex items-center justify-between">

              <span className="text-lg font-bold text-stone-900">
                Total
              </span>

              <span className="text-2xl font-bold text-[#6F4E37]">
                {formatCurrency(current.total)}
              </span>

            </div>

            <div className="flex items-center justify-between mt-3">

              <span className="text-stone-600">
                Saldo pendiente
              </span>

              <span
                className={
                  current.balance > 0
                    ? "font-bold text-red-600"
                    : "font-bold text-green-600"
                }
              >
                {formatCurrency(current.balance)}
              </span>

            </div>

          </div>

          {/* ABONOS */}

          <div className="border border-stone-200 rounded-xl overflow-hidden">

            <div className="px-4 py-4 border-b border-stone-200">

              <h3 className="font-semibold text-stone-900">
                Abonos registrados
              </h3>

            </div>

            {current.payments.length > 0 ? (

              <div className="divide-y divide-stone-100">

                {current.payments.map((payment) => (

                  <div
                    key={payment.id}
                    className="px-4 py-3 flex items-center justify-between gap-4"
                  >

                    <div>

                      <p className="text-sm font-medium text-stone-800">
                        {formatDate(payment.paidAt)}
                      </p>

                      <p className="text-xs text-stone-500 mt-0.5">
                        {PAYMENT_METHOD_LABELS[payment.method]}
                        {payment.notes ? ` Â· ${payment.notes}` : ""}
                      </p>

                    </div>

                    <p className="font-semibold text-stone-900">
                      {formatCurrency(payment.amount)}
                    </p>

                  </div>

                ))}

              </div>

            ) : (
              <div className="px-4 py-6 text-center text-sm text-stone-500">
                Sin abonos registrados.
              </div>
            )}

          </div>

          {current.notes && (

            <div className="border border-stone-200 rounded-xl p-4">

              <p className="text-sm text-stone-500">
                Notas
              </p>

              <p className="text-stone-800 mt-1">
                {current.notes}
              </p>

            </div>

          )}

      </div>
    </Modal>
  );
}
