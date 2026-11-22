import type { Response } from "express";

import PDFDocument from "pdfkit";

/**
 * Generador del PDF de factura: un comprobante de venta real (encabezado,
 * cliente, tabla de productos, totales, abonos), no una plantilla de texto.
 *
 * - Se genera EN EL MOMENTO desde los datos de la BD: nunca queda viejo.
 *   Si entra un abono, el mismo link muestra el saldo actualizado.
 * - Fuente Helvetica (WinAnsi): cubre acentos y signos en español sin
 *   fuentes externas. No usar emojis (no existen en esa codificación).
 * - Tamaño A4, márgenes de 45 pt.
 */

// ============================================================
//  TIPOS
// ============================================================

export type InvoicePdfData = {
  number: string;
  client: {
    fullName: string;
    documentNumber: string;
    phone: string | null;
  };
  issueDate: string | Date;
  dueDate: string | Date;
  subtotal: number;
  discount: number;
  /** Factura electrónica simulada con IVA 19% (sin DIAN). */
  electronic: boolean;
  ivaAmount: number;
  total: number;
  totalPaid: number;
  balance: number;
  status: string;
  paymentMethod: string;
  notes: string | null;
  createdBy: { fullName: string };
  items?: Array<{
    productName: string;
    presentationLabel: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  payments: Array<{
    amount: number;
    method: string;
    paidAt: string | Date;
    notes: string | null;
  }>;
};

// ============================================================
//  ETIQUETAS Y COLOR
// ============================================================

const STATUS_LABELS: Record<string, string> = {
  PENDIENTE: "Pendiente",
  PAGADA: "Pagada",
  VENCIDA: "Vencida",
  ANULADA: "Anulada",
};

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  PENDIENTE: { bg: "#FEF3C7", fg: "#B45309" },
  PAGADA: { bg: "#DCFCE7", fg: "#15803D" },
  VENCIDA: { bg: "#FEE2E2", fg: "#B91C1C" },
  ANULADA: { bg: "#E7E5E4", fg: "#57534E" },
};

const METHOD_LABELS: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  CONTRA_ENTREGA: "Contra entrega",
  CREDITO: "Crédito",
  ABONO: "Abono",
};

/** Café de la identidad visual de la app (misma tonalidad que los botones). */
const BROWN = "#6F4E37";
const BROWN_SOFT = "#E7D5C8";
const DARK = "#1C1917";
const GRAY = "#78716C";
const BORDER = "#E7E5E4";
const ROW_BG = "#FAFAF9";
const GREEN = "#15803D";
const RED = "#B91C1C";

// ============================================================
//  FORMATO (es-CO)
// ============================================================

const money = (value: number) =>
  value.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });

const date = (value: string | Date) => new Date(value).toLocaleDateString("es-CO");

// ============================================================
//  GEOMETRÍA
// ============================================================

const M = 45; // margen
const W = 595.28; // A4
const H = 841.89;
const CW = W - 2 * M; // ancho útil
const BOTTOM = H - 110; // hasta aquí cabe contenido (el pie vive debajo)

type Doc = InstanceType<typeof PDFDocument>;

// ============================================================
//  PIE DE PÁGINA
// ============================================================

function footer(doc: Doc) {
  // Ojo con el margen inferior (H - M = 796.89): si el texto del pie
  // arranca más abajo, pdfkit crea una página nueva automáticamente.
  const fy = H - 80;
  doc.moveTo(M, fy).lineTo(M + CW, fy).lineWidth(0.5).stroke(BORDER);

  doc
    .font("Helvetica")
    .fontSize(7.5)
    .fillColor(GRAY)
    .text(
      "Cheo's Café · Factura generada electrónicamente por Cheo Manager",
      M,
      fy + 8,
      { width: CW, align: "center" }
    )
    .text(`Generado el ${new Date().toLocaleString("es-CO")}`, M, fy + 20, {
      width: CW,
      align: "center",
    });
}

function newPage(doc: Doc) {
  doc.addPage();
  footer(doc);
}

// ============================================================
//  SECCIONES
// ============================================================

function header(doc: Doc, invoice: InvoicePdfData) {
  doc.rect(M, M, CW, 64).fill(BROWN);

  doc
    .font("Helvetica-Bold")
    .fontSize(21)
    .fillColor("#FFFFFF")
    .text("Cheo's Café", M + 18, M + 15, { width: 250 });
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(BROWN_SOFT)
    .text("Facturación e inventario", M + 18, M + 42, { width: 250 });

  doc
    .font("Helvetica-Bold")
    .fontSize(15)
    .fillColor("#FFFFFF")
    .text("FACTURA", M, M + 16, { width: CW - 18, align: "right" });
  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor(BROWN_SOFT)
    .text(invoice.number, M, M + 39, { width: CW - 18, align: "right" });

  // Sello de factura electrónica (simulada con IVA 19%, sin DIAN).
  if (invoice.electronic) {
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor("#FFFFFF")
      .text("ELECTRÓNICA · IVA 19%", M, M + 53, {
        width: CW - 18,
        align: "right",
      });
  }

  footer(doc);
}

function metaRow(doc: Doc, invoice: InvoicePdfData, startY: number) {
  const label = (x: number, w: number, text: string, value: string) => {
    doc
      .font("Helvetica-Bold")
      .fontSize(7)
      .fillColor(GRAY)
      .text(text.toUpperCase(), x, startY, { width: w, characterSpacing: 0.5 });
    doc
      .font("Helvetica-Bold")
      .fontSize(10.5)
      .fillColor(DARK)
      .text(value, x, startY + 12, { width: w, height: 14, ellipsis: true });
  };

  label(M, 150, "Fecha de emisión", date(invoice.issueDate));
  label(
    M + 160,
    120,
    invoice.balance > 0 ? "Vence" : "Total pagado",
    invoice.balance > 0
      ? date(invoice.dueDate)
      : money(invoice.totalPaid)
  );
  label(
    M + 290,
    110,
    "Forma de pago",
    METHOD_LABELS[invoice.paymentMethod] ?? invoice.paymentMethod
  );

  // Insignia de estado (derecha)
  const text = STATUS_LABELS[invoice.status] ?? invoice.status;
  const colors = STATUS_COLORS[invoice.status] ?? { bg: ROW_BG, fg: GRAY };

  doc.font("Helvetica-Bold").fontSize(9);
  const boxW = doc.widthOfString(text) + 26;
  const boxX = M + CW - boxW;
  const boxY = startY + 3;

  doc.roundedRect(boxX, boxY, boxW, 22, 11).fill(colors.bg);
  doc.fillColor(colors.fg).text(text, boxX, boxY + 6, {
    width: boxW,
    align: "center",
  });

  return startY + 38;
}

function clientBox(doc: Doc, invoice: InvoicePdfData, y: number) {
  const boxH = 58;
  doc.roundedRect(M, y, CW, boxH, 8).fillAndStroke(ROW_BG, BORDER);

  doc
    .font("Helvetica-Bold")
    .fontSize(7)
    .fillColor(GRAY)
    .text("CLIENTE", M + 14, y + 10, { characterSpacing: 0.5 });
  doc
    .font("Helvetica-Bold")
    .fontSize(12.5)
    .fillColor(DARK)
    .text(invoice.client.fullName, M + 14, y + 22, {
      width: 310,
      height: 15,
      ellipsis: true,
    });

  const left = [`CC/NIT ${invoice.client.documentNumber}`];
  if (invoice.client.phone) left.push(`Tel. ${invoice.client.phone}`);
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(GRAY)
    .text(left.join("  ·  "), M + 14, y + 40, { width: 320 });

  doc
    .font("Helvetica-Bold")
    .fontSize(7)
    .fillColor(GRAY)
    .text("ATENDIDO POR", M + CW - 170, y + 14, {
      width: 156,
      align: "right",
      characterSpacing: 0.5,
    });
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(DARK)
    .text(invoice.createdBy.fullName, M + CW - 170, y + 27, {
      width: 156,
      align: "right",
      height: 14,
      ellipsis: true,
    });

  return y + boxH + 20;
}

// Columnas de la tabla: [x, ancho]
const COL = {
  prod: { x: M, w: 245 },
  qty: { x: M + 245, w: 70 },
  price: { x: M + 315, w: 95 },
  sub: { x: M + 410, w: 95 },
};
const ROW_H = 30;

function tableHeader(doc: Doc, y: number) {
  doc.rect(M, y, CW, 22).fill(BROWN);
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#FFFFFF");

  doc.text("PRODUCTO", COL.prod.x + 10, y + 7, { width: COL.prod.w - 16 });
  doc.text("CANT.", COL.qty.x, y + 7, { width: COL.qty.w - 8, align: "right" });
  doc.text("PRECIO UNIT.", COL.price.x, y + 7, {
    width: COL.price.w - 8,
    align: "right",
  });
  doc.text("SUBTOTAL", COL.sub.x, y + 7, {
    width: COL.sub.w,
    align: "right",
  });

  return y + 22;
}

function itemsTable(
  doc: Doc,
  items: NonNullable<InvoicePdfData["items"]>,
  startY: number
) {
  let y = tableHeader(doc, startY);

  items.forEach((item, index) => {
    if (y + ROW_H > BOTTOM) {
      newPage(doc);
      y = tableHeader(doc, M);
    }

    if (index % 2 === 1) doc.rect(M, y, CW, ROW_H).fill(ROW_BG);

    doc
      .font("Helvetica-Bold")
      .fontSize(9.5)
      .fillColor(DARK)
      .text(item.productName, COL.prod.x + 10, y + 6, {
        width: COL.prod.w - 16,
        height: 11,
        ellipsis: true,
      });
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(GRAY)
      .text(item.presentationLabel, COL.prod.x + 10, y + 17, {
        width: COL.prod.w - 16,
        height: 10,
        ellipsis: true,
      });

    doc.font("Helvetica").fontSize(9.5).fillColor(DARK);
    doc.text(String(item.quantity), COL.qty.x, y + 9, {
      width: COL.qty.w - 8,
      align: "right",
    });
    doc.text(money(item.unitPrice), COL.price.x, y + 9, {
      width: COL.price.w - 8,
      align: "right",
    });
    doc
      .font("Helvetica-Bold")
      .text(money(item.subtotal), COL.sub.x, y + 9, {
        width: COL.sub.w,
        align: "right",
      });

    y += ROW_H;
    doc
      .moveTo(M, y)
      .lineTo(M + CW, y)
      .lineWidth(0.5)
      .stroke("#EDEDED");
  });

  return y + 4;
}

function totalsBox(doc: Doc, invoice: InvoicePdfData, y: number) {
  type Row = { label: string; value: string; bold?: boolean; color?: string; rule?: boolean };

  const rows: Row[] = [{ label: "Subtotal", value: money(invoice.subtotal) }];
  if (invoice.discount > 0) {
    rows.push({ label: "Descuento", value: `− ${money(invoice.discount)}` });
  }
  if (invoice.electronic && invoice.ivaAmount > 0) {
    rows.push({ label: "IVA 19%", value: money(invoice.ivaAmount) });
  }
  rows.push({ label: "TOTAL", value: money(invoice.total), bold: true, rule: true });

  if (invoice.status === "ANULADA") {
    rows.push({ label: "Estado", value: "ANULADA", bold: true, color: GRAY });
  } else if (invoice.balance > 0) {
    rows.push({ label: "Abonado", value: money(invoice.totalPaid), color: GRAY });
    rows.push({
      label: "Saldo pendiente",
      value: money(invoice.balance),
      bold: true,
      color: RED,
    });
  } else {
    rows.push({ label: "Estado", value: "PAGADA", bold: true, color: GREEN });
  }

  const boxW = 250;
  const boxX = M + CW - boxW;
  const lineH = 18;
  const boxH = 14 + rows.length * lineH + 8;

  if (y + boxH > BOTTOM) {
    newPage(doc);
    y = M;
  }

  doc.roundedRect(boxX, y, boxW, boxH, 8).fillAndStroke(ROW_BG, BORDER);

  let ty = y + 12;
  for (const row of rows) {
    if (row.rule) {
      doc
        .moveTo(boxX + 12, ty - 4)
        .lineTo(boxX + boxW - 12, ty - 4)
        .lineWidth(0.75)
        .stroke("#D6D3D1");
      ty += 5;
    }

    doc
      .font(row.bold ? "Helvetica-Bold" : "Helvetica")
      .fontSize(row.bold ? 10.5 : 9.5)
      .fillColor(row.color ?? DARK)
      .text(row.label, boxX + 14, ty, { width: 120, height: 13, ellipsis: true });
    doc.text(row.value, boxX + 134, ty, {
      width: boxW - 148,
      align: "right",
      height: 13,
    });

    ty += lineH;
  }

  return y + boxH + 18;
}

function paymentsTable(
  doc: Doc,
  payments: InvoicePdfData["payments"],
  startY: number
) {
  if (payments.length === 0) return startY;

  const headerH = 16;
  const lineH = 15;
  const needed = 14 + headerH + payments.length * lineH + 6;
  let y = startY;

  if (y + needed > BOTTOM) {
    newPage(doc);
    y = M;
  }

  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor(GRAY)
    .text("ABONOS REGISTRADOS", M, y, { characterSpacing: 0.4 });
  y += 14;

  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(GRAY);
  doc.text("FECHA", M, y, { width: 90 });
  doc.text("MÉTODO", M + 100, y, { width: 120 });
  doc.text("NOTA", M + 230, y, { width: 150 });
  doc.text("VALOR", M + CW - 100, y, { width: 100, align: "right" });
  y += headerH - 4;

  doc
    .moveTo(M, y)
    .lineTo(M + CW, y)
    .lineWidth(0.5)
    .stroke(BORDER);
  y += 4;

  for (const payment of payments) {
    doc.font("Helvetica").fontSize(9).fillColor(DARK);
    doc.text(date(payment.paidAt), M, y, { width: 90, height: 12 });
    doc.text(METHOD_LABELS[payment.method] ?? payment.method, M + 100, y, {
      width: 120,
      height: 12,
      ellipsis: true,
    });
    doc.fillColor(GRAY).text(payment.notes ?? "—", M + 230, y, {
      width: 145,
      height: 12,
      ellipsis: true,
    });
    doc
      .font("Helvetica-Bold")
      .fillColor(DARK)
      .text(money(payment.amount), M + CW - 100, y, {
        width: 100,
        align: "right",
        height: 12,
      });

    y += lineH;
  }

  return y + 14;
}

function notesBox(doc: Doc, invoice: InvoicePdfData, y: number) {
  if (!invoice.notes) return y;

  doc.font("Helvetica").fontSize(9);
  const textH = doc.heightOfString(invoice.notes, { width: CW - 28 });
  const boxH = 26 + textH;

  if (y + boxH > BOTTOM) {
    newPage(doc);
    y = M;
  }

  doc.roundedRect(M, y, CW, boxH, 8).fillAndStroke("#FFFBF5", BORDER);
  doc
    .font("Helvetica-Bold")
    .fontSize(7.5)
    .fillColor(GRAY)
    .text("NOTAS", M + 14, y + 9, { characterSpacing: 0.5 });
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(DARK)
    .text(invoice.notes, M + 14, y + 21, { width: CW - 28 });

  return y + boxH + 16;
}

// ============================================================
//  RENDER
// ============================================================

function draw(doc: Doc, invoice: InvoicePdfData) {
  const items = invoice.items ?? [];

  header(doc, invoice);

  let y = metaRow(doc, invoice, M + 64 + 18);
  y = clientBox(doc, invoice, y);

  if (items.length > 0) {
    y = itemsTable(doc, items, y);
  }

  y = totalsBox(doc, invoice, y + 6);
  y = paymentsTable(doc, invoice.payments, y);
  notesBox(doc, invoice, y);
}

/** Genera el PDF completo en memoria. */
export async function renderInvoicePdf(invoice: InvoicePdfData): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margin: M,
    info: {
      Title: `Factura ${invoice.number} - Cheo's Café`,
      Author: "Cheo Manager",
      Creator: "Cheo Manager",
    },
  });

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const finished = new Promise<void>((resolve) => doc.on("end", () => resolve()));

  draw(doc, invoice);
  doc.end();
  await finished;

  return Buffer.concat(chunks);
}

/**
 * Responde el PDF de la factura.
 *
 * - `inline` (por defecto): se muestra en el navegador (botón "Ver factura").
 * - `download: true`: fuerza la descarga del archivo (`attachment`) — es el
 *   modo del link que viaja por WhatsApp, para que el cliente se guarde el
 *   PDF con un toque.
 */
export async function sendInvoicePdf(
  res: Response,
  invoice: InvoicePdfData,
  options: { download?: boolean } = {}
): Promise<void> {
  const pdf = await renderInvoicePdf(invoice);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `${options.download ? "attachment" : "inline"}; filename="Factura-${invoice.number}.pdf"`
  );
  // Sin caché: el saldo debe reflejar los abonos más recientes.
  res.setHeader("Cache-Control", "no-store");

  res.send(pdf);
}
