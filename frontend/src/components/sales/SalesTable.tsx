import {
  MoreVertical,
  Eye,
  HandCoins,
  Banknote,
  Landmark,
  Ban,
  Receipt,
  UserRound,
  AlertTriangle,
  Loader2,
} from "lucide-react";

import { useState, type FormEvent } from "react";

import { api, ApiError } from "../../lib/api";
import type {
  Invoice,
  InvoiceStatus,
} from "../../types/api";

import SaleDetailModal from "./SaleDetailModal";
import { INVOICE_STATUS_LABELS, PAYMENT_METHOD_LABELS } from "../../lib/labels";

import Select from "../ui/Select";
import Modal from "../ui/Modal";

type PayMethod = "ABONO" | "EFECTIVO" | "TRANSFERENCIA";

type SalesTableProps = {
  invoices: Invoice[];
  loading: boolean;
  error: string | null;
  reload: () => void;
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

function statusBadgeClass(status: InvoiceStatus) {
  if (status === "PAGADA") {
    return "inline-flex px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold";
  }

  if (status === "PENDIENTE") {
    return "inline-flex px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold";
  }

  if (status === "VENCIDA") {
    return "inline-flex px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold";
  }

  return "inline-flex px-3 py-1 rounded-full bg-stone-200 text-stone-600 text-xs font-semibold line-through";
}

export default function SalesTable({
  invoices,
  loading,
  error,
  reload,
}: SalesTableProps) {
  const [openMenu, setOpenMenu] =
    useState<string | null>(null);

  const [selectedInvoice, setSelectedInvoice] =
    useState<Invoice | null>(null);

  /*
   * REGISTRAR ABONO
   */
  const [payingInvoice, setPayingInvoice] =
    useState<Invoice | null>(null);

  const [payAmount, setPayAmount] =
    useState("");

  const [payMethod, setPayMethod] =
    useState<PayMethod>("ABONO");

  const [payNotes, setPayNotes] =
    useState("");

  const [paySaving, setPaySaving] =
    useState(false);

  const [payError, setPayError] =
    useState<string | null>(null);

  /*
   * ANULAR FACTURA
   */
  const [voidingInvoice, setVoidingInvoice] =
    useState<Invoice | null>(null);

  const [voidReason, setVoidReason] =
    useState("");

  const [voidSaving, setVoidSaving] =
    useState(false);

  const [voidError, setVoidError] =
    useState<string | null>(null);

  /*
   * VER DETALLE
   */
  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setOpenMenu(null);
  };

  /*
   * ABRIR MODAL DE ABONO
   */
  const handleOpenPay = (invoice: Invoice) => {
    setPayingInvoice(invoice);
    setPayAmount("");
    setPayMethod("ABONO");
    setPayNotes("");
    setPayError(null);
    setOpenMenu(null);
  };

  /*
   * CONFIRMAR ABONO
   */
  const handlePaySubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!payingInvoice) {
      return;
    }

    const amount = Number(payAmount);

    if (!payAmount || Number.isNaN(amount) || amount <= 0) {
      setPayError("Ingresa un monto mayor a cero.");
      return;
    }

    if (amount > payingInvoice.balance) {
      setPayError(
        `El monto no puede superar el saldo pendiente (${formatCurrency(payingInvoice.balance)}).`
      );
      return;
    }

    setPaySaving(true);
    setPayError(null);

    try {
      await api.post<Invoice>(
        `/invoices/${payingInvoice.id}/payments`,
        {
          amount,
          method: payMethod,
          notes: payNotes.trim() || undefined,
        }
      );

      setPayingInvoice(null);
      reload();
    } catch (error) {
      setPayError(
        error instanceof ApiError
          ? error.message
          : "No fue posible registrar el abono."
      );
    } finally {
      setPaySaving(false);
    }
  };

  /*
   * ABRIR MODAL DE ANULACIÓN
   */
  const handleOpenVoid = (invoice: Invoice) => {
    setVoidingInvoice(invoice);
    setVoidReason("");
    setVoidError(null);
    setOpenMenu(null);
  };

  /*
   * CONFIRMAR ANULACIÓN
   */
  const handleVoidSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!voidingInvoice) {
      return;
    }

    if (voidReason.trim().length < 3) {
      setVoidError(
        "El motivo debe tener al menos 3 caracteres."
      );
      return;
    }

    setVoidSaving(true);
    setVoidError(null);

    try {
      await api.post(
        `/invoices/${voidingInvoice.id}/void`,
        { reason: voidReason.trim() }
      );

      setVoidingInvoice(null);
      reload();
    } catch (error) {
      // El backend responde 403 si el rol no puede anular: mostramos su mensaje.
      setVoidError(
        error instanceof ApiError
          ? error.message
          : "No fue posible anular la factura."
      );
    } finally {
      setVoidSaving(false);
    }
  };

  return (
    <>
      {/* =========================================
          TABLA DE VENTAS
      ========================================= */}

      <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">

        {/* ENCABEZADO */}

        <div className="px-5 sm:px-6 py-5 border-b border-stone-200 flex items-center justify-between gap-4">

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-xl bg-[#F3EDE7] text-[#6F4E37] flex items-center justify-center shrink-0">
              <Receipt size={19} />
            </div>

            <div>
              <h2 className="font-semibold text-stone-800">
                Ventas registradas
              </h2>

              <p className="text-sm text-stone-500 mt-0.5">
                Consulta las ventas realizadas.
              </p>
            </div>

          </div>

          <span className="text-sm text-stone-500 whitespace-nowrap">
            {invoices.length} facturas
          </span>

        </div>

        {/* ERROR DE CARGA */}

        {error && (
          <div className="px-6 py-4 bg-red-50 border-b border-stone-200 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* TABLA */}

        <div className="overflow-x-auto">

          <table className="w-full min-w-[980px]">

            <thead>

              <tr className="bg-stone-50 border-b border-stone-200">

                <th className="text-left px-6 py-4 text-xs font-semibold text-stone-500 uppercase">
                  Factura
                </th>

                <th className="text-left px-6 py-4 text-xs font-semibold text-stone-500 uppercase">
                  Cliente
                </th>

                <th className="text-left px-6 py-4 text-xs font-semibold text-stone-500 uppercase">
                  Fecha
                </th>

                <th className="text-left px-6 py-4 text-xs font-semibold text-stone-500 uppercase">
                  Forma de pago
                </th>

                <th className="text-right px-6 py-4 text-xs font-semibold text-stone-500 uppercase">
                  Total
                </th>

                <th className="text-right px-6 py-4 text-xs font-semibold text-stone-500 uppercase">
                  Saldo
                </th>

                <th className="text-center px-6 py-4 text-xs font-semibold text-stone-500 uppercase">
                  Estado
                </th>

                <th className="w-16 px-6 py-4">
                </th>

              </tr>

            </thead>

            <tbody>

              {loading ? (

                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-16 text-center"
                  >
                    <Loader2
                      size={30}
                      className="mx-auto text-[#6F4E37] animate-spin"
                    />

                    <p className="mt-3 text-sm text-stone-500">
                      Cargando facturas…
                    </p>
                  </td>
                </tr>

              ) : invoices.length === 0 ? (

                <tr>

                  <td
                    colSpan={8}
                    className="px-6 py-12 text-center"
                  >

                    <div className="flex flex-col items-center">

                      <div className="w-12 h-12 rounded-xl bg-stone-100 text-stone-400 flex items-center justify-center">
                        <Receipt size={22} />
                      </div>

                      <p className="font-semibold text-stone-700 mt-4">
                        No hay facturas registradas
                      </p>

                      <p className="text-sm text-stone-500 mt-1">
                        Las ventas que registres
                        aparecerán aquí.
                      </p>

                    </div>

                  </td>

                </tr>

              ) : (

                invoices.map((invoice) => (

                  <tr
                    key={invoice.id}
                    className="
                      border-b
                      border-stone-100
                      last:border-0
                      hover:bg-stone-50
                      transition
                    "
                  >

                    {/* FACTURA */}

                    <td className="px-6 py-5">

                      <div className="flex items-center gap-3">

                        <div className="w-9 h-9 rounded-lg bg-stone-100 text-stone-600 flex items-center justify-center">
                          <Receipt size={16} />
                        </div>

                        <span className="font-semibold text-stone-800">
                          #{invoice.number}
                        </span>

                      </div>

                    </td>

                    {/* CLIENTE */}

                    <td className="px-6 py-5">

                      <div className="flex items-center gap-3">

                        <div className="w-9 h-9 rounded-full bg-[#F3EDE7] text-[#6F4E37] flex items-center justify-center">
                          <UserRound size={16} />
                        </div>

                        <span className="font-medium text-stone-800">
                          {invoice.client.fullName}
                        </span>

                      </div>

                    </td>

                    {/* FECHA */}

                    <td className="px-6 py-5 text-sm text-stone-600">
                      {formatDate(invoice.issueDate)}
                    </td>

                    {/* PAGO */}

                    <td className="px-6 py-5">

                      <span className="text-sm text-stone-700">
                        {PAYMENT_METHOD_LABELS[invoice.paymentMethod]}
                      </span>

                    </td>

                    {/* TOTAL */}

                    <td className="px-6 py-5 text-right">

                      <span className="font-semibold text-stone-800">
                        {formatCurrency(invoice.total)}
                      </span>

                    </td>

                    {/* SALDO */}

                    <td className="px-6 py-5 text-right">

                      <span
                        className={
                          invoice.balance > 0
                            ? "text-sm font-semibold text-red-600"
                            : "text-sm font-medium text-green-600"
                        }
                      >
                        {formatCurrency(invoice.balance)}
                      </span>

                    </td>

                    {/* ESTADO */}

                    <td className="px-6 py-5 text-center">

                      <span
                        className={statusBadgeClass(invoice.status)}
                      >
                        {INVOICE_STATUS_LABELS[invoice.status]}
                      </span>

                    </td>

                    {/* ACCIONES */}

                    <td className="px-6 py-5 relative">

                      <button
                        type="button"
                        onClick={() =>
                          setOpenMenu(
                            openMenu === invoice.id
                              ? null
                              : invoice.id
                          )
                        }
                        className="
                          w-9
                          h-9
                          rounded-lg
                          flex
                          items-center
                          justify-center
                          text-stone-500
                          hover:bg-stone-100
                        "
                      >
                        <MoreVertical size={19} />
                      </button>

                      {openMenu === invoice.id && (

                        <div
                          className="
                            absolute
                            right-6
                            top-14
                            z-30
                            w-48
                            bg-white
                            border
                            border-stone-200
                            rounded-xl
                            shadow-lg
                            py-1
                          "
                        >

                          {/* VER DETALLE */}

                          <button
                            type="button"
                            onClick={() =>
                              handleViewInvoice(
                                invoice
                              )
                            }
                            className="
                              w-full
                              flex
                              items-center
                              gap-3
                              px-4
                              py-2.5
                              text-sm
                              text-stone-700
                              hover:bg-stone-50
                            "
                          >
                            <Eye size={16} />
                            Ver detalle
                          </button>

                          {/* REGISTRAR ABONO */}

                          {(invoice.status === "PENDIENTE" ||
                            invoice.status === "VENCIDA") &&
                            invoice.balance > 0 && (

                            <button
                              type="button"
                              onClick={() =>
                                handleOpenPay(
                                  invoice
                                )
                              }
                              className="
                                w-full
                                flex
                                items-center
                                gap-3
                                px-4
                                py-2.5
                                text-sm
                                text-stone-700
                                hover:bg-stone-50
                              "
                            >
                              <HandCoins size={16} />
                              Registrar abono
                            </button>

                          )}

                          {/* ANULAR */}

                          {invoice.status !== "ANULADA" && (

                            <>

                              <div className="border-t border-stone-100 my-1" />

                              <button
                                type="button"
                                onClick={() =>
                                  handleOpenVoid(
                                    invoice
                                  )
                                }
                                className="
                                  w-full
                                  flex
                                  items-center
                                  gap-3
                                  px-4
                                  py-2.5
                                  text-sm
                                  text-red-600
                                  hover:bg-red-50
                                "
                              >
                                <Ban size={16} />
                                Anular factura
                              </button>

                            </>

                          )}

                        </div>

                      )}

                    </td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        </div>

      </div>

      {/* =========================================
          MODAL VER DETALLE
      ========================================= */}

      <SaleDetailModal
        invoice={selectedInvoice}
        onClose={() =>
          setSelectedInvoice(null)
        }
      />

      {/* =========================================
          MODAL REGISTRAR ABONO
      ========================================= */}

      {payingInvoice && (

        <Modal
          icon={HandCoins}
          title="Registrar abono"
          subtitle={`Factura #${payingInvoice.number}`}
          onClose={() =>
            setPayingInvoice(null)
          }
          onSubmit={handlePaySubmit}
          size="md"
          footer={
            <div
              className="
                flex
                flex-col-reverse
                sm:flex-row
                gap-3
                sm:justify-end
              "
            >

              <button
                type="button"
                onClick={() =>
                  setPayingInvoice(null)
                }
                className="
                  w-full
                  sm:w-auto
                  px-5
                  py-3
                  rounded-xl
                  border
                  border-stone-300
                  text-stone-700
                  font-semibold
                  hover:bg-stone-50
                  transition
                "
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={paySaving}
                className="
                  w-full
                  sm:w-auto
                  px-5
                  py-3
                  rounded-xl
                  bg-[#6F4E37]
                  hover:bg-[#5B3F2D]
                  disabled:opacity-60
                  text-white
                  font-semibold
                  transition
                  flex
                  items-center
                  justify-center
                  gap-2
                "
              >
                {paySaving && (
                  <Loader2 size={17} className="animate-spin" />
                )}
                Registrar abono
              </button>

            </div>
          }
        >

            {/* CONTENIDO */}

            <div className="space-y-4">

              {/* SALDO PENDIENTE */}

              <div
                className="
                  rounded-xl
                  bg-stone-50
                  border
                  border-stone-200
                  p-4
                  flex
                  items-center
                  justify-between
                  gap-4
                "
              >

                <div>

                  <p className="text-xs text-stone-500">
                    Cliente
                  </p>

                  <p className="font-semibold text-stone-800 mt-1">
                    {payingInvoice.client.fullName}
                  </p>

                </div>

                <div className="text-right">

                  <p className="text-xs text-stone-500">
                    Saldo pendiente
                  </p>

                  <p className="font-bold text-red-600 mt-1">
                    {formatCurrency(payingInvoice.balance)}
                  </p>

                </div>

              </div>

              {/* ERROR */}

              {payError && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                  {payError}
                </div>
              )}

              {/* MONTO */}

              <div>

                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Monto a abonar *
                </label>

                <input
                  type="number"
                  min="1"
                  step="1"
                  value={payAmount}
                  onChange={(event) =>
                    setPayAmount(event.target.value)
                  }
                  placeholder="Ej. 50000"
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

              </div>

              {/* MÉTODO */}

              <div>

                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Método de pago *
                </label>

                <Select
                  value={payMethod}
                  onChange={(value) =>
                    setPayMethod(
                      value as PayMethod
                    )
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

              {/* NOTAS */}

              <div>

                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Notas (opcional)
                </label>

                <textarea
                  value={payNotes}
                  onChange={(event) =>
                    setPayNotes(event.target.value)
                  }
                  rows={2}
                  placeholder="Ej. Abono en Bancolombia"
                  className="
                    w-full
                    border
                    border-stone-300
                    rounded-xl
                    px-4
                    py-3
                    outline-none
                    resize-none
                    focus:border-[#6F4E37]
                    focus:ring-2
                    focus:ring-[#6F4E37]/20
                  "
                />

              </div>

            </div>

        </Modal>

      )}

      {/* =========================================
          MODAL ANULAR FACTURA
      ========================================= */}

      {voidingInvoice && (

        <Modal
          icon={AlertTriangle}
          title="Anular factura"
          subtitle="Esta acción requiere confirmación."
          onClose={() =>
            setVoidingInvoice(null)
          }
          onSubmit={handleVoidSubmit}
          size="sm"
          footer={
            <div
              className="
                flex
                flex-col-reverse
                sm:flex-row
                gap-3
                sm:justify-end
              "
            >

              <button
                type="button"
                onClick={() =>
                  setVoidingInvoice(null)
                }
                className="
                  w-full
                  sm:w-auto
                  px-5
                  py-3
                  rounded-xl
                  border
                  border-stone-300
                  text-stone-700
                  font-semibold
                  hover:bg-stone-50
                  transition
                "
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={voidSaving}
                className="
                  w-full
                  sm:w-auto
                  px-5
                  py-3
                  rounded-xl
                  bg-red-600
                  hover:bg-red-700
                  disabled:opacity-60
                  text-white
                  font-semibold
                  transition
                  flex
                  items-center
                  justify-center
                  gap-2
                "
              >
                {voidSaving && (
                  <Loader2 size={17} className="animate-spin" />
                )}
                Anular factura
              </button>

            </div>
          }
        >

            {/* CONTENIDO */}

            <div className="space-y-4">

              <p className="text-stone-600 leading-relaxed">

                ¿Estás seguro de que quieres anular
                esta factura? El stock de los
                productos será devuelto al inventario.

              </p>

              {/* DATOS DE LA FACTURA */}

              <div
                className="
                  rounded-xl
                  bg-stone-50
                  border
                  border-stone-200
                  p-4
                "
              >

                <div className="flex items-center justify-between gap-4">

                  <div>

                    <p className="text-xs text-stone-500">
                      Factura
                    </p>

                    <p className="font-bold text-stone-900 mt-1">
                      #{voidingInvoice.number}
                    </p>

                  </div>

                  <div className="text-right">

                    <p className="text-xs text-stone-500">
                      Total
                    </p>

                    <p className="font-bold text-[#6F4E37] mt-1">
                      {formatCurrency(voidingInvoice.total)}
                    </p>

                  </div>

                </div>

                <div className="border-t border-stone-200 my-4" />

                <div>

                  <p className="text-xs text-stone-500">
                    Cliente
                  </p>

                  <p className="font-semibold text-stone-800 mt-1">
                    {voidingInvoice.client.fullName}
                  </p>

                </div>

              </div>

              {/* ERROR */}

              {voidError && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                  {voidError}
                </div>
              )}

              {/* MOTIVO */}

              <div>

                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Motivo de anulación *
                </label>

                <textarea
                  value={voidReason}
                  onChange={(event) =>
                    setVoidReason(event.target.value)
                  }
                  rows={3}
                  placeholder="Ej. Cliente se arrepintió de la compra"
                  className="
                    w-full
                    border
                    border-stone-300
                    rounded-xl
                    px-4
                    py-3
                    outline-none
                    resize-none
                    focus:border-[#6F4E37]
                    focus:ring-2
                    focus:ring-[#6F4E37]/20
                  "
                />

                <p className="text-xs text-stone-400 mt-1">
                  Mínimo 3 caracteres.
                </p>

              </div>

            </div>

        </Modal>

      )}

    </>
  );
}
