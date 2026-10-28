/**
 * Etiquetas de la UI compartidas entre páginas y componentes.
 *
 * Vive fuera de los componentes a propósito: los archivos que exportan
 * constantes junto a componentes rompen el fast refresh (react-refresh).
 */
import type { InvoiceStatus, PaymentMethod } from "../types/api";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  CONTRA_ENTREGA: "Contra entrega",
  CREDITO: "Crédito",
  ABONO: "Abono",
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  PENDIENTE: "Pendiente",
  PAGADA: "Pagada",
  VENCIDA: "Vencida",
  ANULADA: "Anulada",
};
