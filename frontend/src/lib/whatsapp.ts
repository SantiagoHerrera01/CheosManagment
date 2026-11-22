import type { Invoice } from "../types/api";
import { apiUrl } from "./api";

/**
 * Envío de facturas por WhatsApp (wa.me).
 *
 * Todo pasa por aquí: el número se normaliza (solo dígitos, sin cero
 * inicial, con prefijo 57 — R9) y el mensaje se arma con las plantillas
 * de venta/abono de abajo. Si un día cambia el formato del mensaje, se
 * cambia en un solo lugar.
 *
 * El mensaje incluye el link al PDF REAL de la factura (generado en el
 * servidor desde la BD): el cliente lo toca y se abre/baja el documento.
 *
 * ⚠️ SIN EMOJI en el mensaje: el flujo click-to-chat de WhatsApp
 * (wa.me → api.whatsapp.com) reemplaza cualquier carácter con propiedad
 * Unicode "Emoji" por  (U+FFFD) antes de abrir el chat — probado el
 * 16/11/2026: ☕✅🙌📥 llegaban como diamantes rotos al cliente. Se
 * usan símbolos que SÍ sobreviven el viaje (✓ • — → *negrita*), todos
 * verificados contra el redirect de wa.me.
 */

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

/** Distribuye descuento e IVA entre las líneas de una factura electrónica. */
function messageItemTotal(invoice: Invoice, item: NonNullable<Invoice["items"]>[number]) {
  if (!invoice.electronic || invoice.subtotal <= 0) return item.subtotal;

  const taxableBase = Math.max(invoice.subtotal - invoice.discount, 0);
  const itemShare = item.subtotal / invoice.subtotal;
  return Math.round(itemShare * (taxableBase + invoice.ivaAmount));
}

/** Normaliza un celular colombiano para wa.me (solo dígitos + 57). */
export function whatsappPhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");

  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (!digits.startsWith("57")) {
    digits = `57${digits}`;
  }

  return digits;
}

/** Link wa.me listo para abrir con el mensaje precargado. */
export function whatsappLink(phone: string, message: string): string {
  return `https://wa.me/${whatsappPhone(phone)}?text=${encodeURIComponent(
    message
  )}`;
}

/**
 * Link absoluto al PDF de la factura (firmado, no requiere sesión).
 *
 * Es el que viaja dentro del mensaje de WhatsApp: incluye `download=1`
 * para que al tocarlo el cliente *descargue* el archivo (se le guarda
 * en el celular) en vez de solo verlo en el navegador. El saldo que
 * muestra es siempre el vigente al momento de abrirlo.
 */
export function invoicePdfUrl(invoice: Invoice): string {
  return apiUrl(
    `/invoices/public/${invoice.id}/pdf?token=${invoice.pdfToken}&download=1`
  );
}

/** Cierra cualquier mensaje con el link de descarga del documento. */
function withPdfLink(lines: string[], invoice: Invoice): string {
  lines.push("");
  lines.push("↓ Descargar tu factura en PDF:");
  lines.push(invoicePdfUrl(invoice));
  lines.push("");
  return lines.join("\n");
}

/**
 * Plantilla de VENTA EXITOSA.
 *
 * - Venta pagada al frente (efectivo/transferencia): resalta "Pagada".
 * - Venta a crédito o con abono inicial: lista productos, total,
 *   abono y saldo pendiente con fecha límite.
 */
export function saleMessage(invoice: Invoice): string {
  const lines: string[] = [];

  lines.push(`Hola ${invoice.client.fullName}`);
  lines.push("");

  if (invoice.balance <= 0) {
    lines.push("¡Venta registrada! Tu factura quedó *PAGADA* ✓");
  } else {
    lines.push("¡Venta registrada! Aquí tienes el detalle de tu factura:");
  }

  lines.push("");
  lines.push(`*Factura ${invoice.number}*`);

  if (invoice.items && invoice.items.length > 0) {
    lines.push("");
    for (const item of invoice.items) {
      lines.push(
        `• ${item.quantity}x ${item.productName} (${item.presentationLabel}) — ${formatCurrency(
          messageItemTotal(invoice, item)
        )}`
      );
    }
  }

  lines.push("");
  lines.push(`Total: *${formatCurrency(invoice.total)}*`);

  if (invoice.balance > 0) {
    if (invoice.totalPaid > 0) {
      lines.push(`Abono: ${formatCurrency(invoice.totalPaid)}`);
    }
    lines.push(`Saldo pendiente: *${formatCurrency(invoice.balance)}*`);
    lines.push(`Fecha límite de pago: ${formatDate(invoice.dueDate)}`);
  }

  lines.push("");
  lines.push("¡Gracias por tu compra! ★");

  return withPdfLink(lines, invoice);
}

/**
 * Plantilla de ABONO EXITOSO.
 *
 * - Con saldo restante: dice cuánto se abonó y cuánto falta.
 * - Sin saldo: anuncia que la factura quedó saldada.
 */
export function paymentMessage(
  invoice: Invoice,
  paymentAmount: number
): string {
  const lines: string[] = [];

  lines.push(`Hola ${invoice.client.fullName}`);
  lines.push("");

  if (invoice.balance <= 0) {
    lines.push("¡Abono recibido! Tu factura *quedó saldada* ✓");
  } else {
    lines.push("¡Abono recibido con éxito! ✓");
  }

  lines.push("");
  lines.push(`*Factura ${invoice.number}*`);
  lines.push(`Valor abonado: *${formatCurrency(paymentAmount)}*`);
  lines.push(`Total de la factura: ${formatCurrency(invoice.total)}`);

  if (invoice.balance > 0) {
    lines.push(`Saldo restante: *${formatCurrency(invoice.balance)}*`);
    lines.push(`Fecha límite de pago: ${formatDate(invoice.dueDate)}`);
  }

  lines.push("");
  lines.push("¡Gracias por tu pago! ★");

  return withPdfLink(lines, invoice);
}
