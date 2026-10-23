import type {
  Invoice,
  InvoiceItem,
  Payment,
  Prisma,
  ProductPresentation,
  Role,
} from "@prisma/client";

import prisma from "../../shared/database/prisma.js";
import { ApiError } from "../../shared/errors/api-error.js";
import { money } from "../../shared/utils/money.js";
import { pageParams, type Pagination } from "../../shared/utils/pagination.js";
import type {
  CreateInvoiceInput,
  CreatePaymentInput,
  ListInvoicesQuery,
} from "./invoices.schemas.js";

// ============================================================
//  SERIALIZACIÓN
// ============================================================

type InvoiceWithRelations = Invoice & {
  client: {
    id: string;
    fullName: string;
    documentNumber: string;
    phone: string | null;
  };
  createdBy: { id: string; fullName: string };
  items: InvoiceItem[];
  payments: Payment[];
};

/** Saldo pendiente de una factura: total - abonos. */
export function invoiceBalance(invoice: Invoice & { payments: Payment[] }): number {
  const paid = invoice.payments.reduce((sum, p) => sum + money(p.amount), 0);
  return money(invoice.total) - paid;
}

export function serializeInvoice(invoice: InvoiceWithRelations, includeItems = true) {
  const paid = invoice.payments.reduce((sum, p) => sum + money(p.amount), 0);

  return {
    id: invoice.id,
    number: invoice.number,
    client: invoice.client,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    subtotal: money(invoice.subtotal),
    discount: money(invoice.discount),
    total: money(invoice.total),
    totalPaid: paid,
    balance: money(invoice.total) - paid,
    status: invoice.status,
    paymentMethod: invoice.paymentMethod,
    notes: invoice.notes,
    createdBy: invoice.createdBy,
    items: includeItems
      ? invoice.items.map((item) => ({
          id: item.id,
          presentationId: item.presentationId,
          productName: item.productName,
          presentationLabel: item.presentationLabel,
          quantity: item.quantity,
          unitPrice: money(item.unitPrice),
          subtotal: money(item.subtotal),
        }))
      : undefined,
    payments: invoice.payments.map((p) => ({
      id: p.id,
      amount: money(p.amount),
      method: p.method,
      paidAt: p.paidAt,
      notes: p.notes,
    })),
    createdAt: invoice.createdAt,
  };
}

// ============================================================
//  CONSECUTIVO
// ============================================================

/** Presentación con el nombre del producto incluido (para snapshots). */
type PresentationWithProduct = ProductPresentation & {
  product: { name: string };
};

/** Genera el siguiente número consecutivo: F-000001, F-000002… (único en BD). */
async function nextInvoiceNumber(tx: Prisma.TransactionClient): Promise<string> {
  const rows = await tx.$queryRaw<Array<{ num: bigint | null }>>`
    SELECT MAX(CAST(SUBSTRING(number FROM 4) AS INTEGER)) AS num
    FROM "Invoice"
  `;
  const next = Number(rows[0]?.num ?? 0) + 1;
  return `F-${String(next).padStart(6, "0")}`;
}

// ============================================================
//  CREAR FACTURA (R1) — con descuento de inventario (R3)
// ============================================================

export async function create(input: CreateInvoiceInput, userId: string) {
  // Fuera de la transacción: lecturas baratas
  const client = await prisma.client.findUnique({ where: { id: input.clientId } });
  if (!client) throw ApiError.notFound("Cliente no encontrado.");
  if (!client.isActive)
    throw ApiError.badRequest("El cliente está inactivo; no se le puede facturar.");

  const presentationIds = [...new Set(input.items.map((i) => i.presentationId))];
  const presentations = await prisma.productPresentation.findMany({
    where: { id: { in: presentationIds }, isActive: true },
    include: { product: { select: { name: true } } },
  });
  const byId = new Map(presentations.map((p) => [p.id, p]));

  const missing = presentationIds.filter((id) => !byId.has(id));
  if (missing.length > 0) {
    throw ApiError.badRequest("Algunas presentaciones no existen o están inactivas.", missing.map((id) => ({ path: "items", message: `Presentación ${id} no encontrada.` })));
  }

  const issueDate = input.issueDate ?? new Date();
  const dueDate = new Date(
    issueDate.getTime() + input.creditDays * 24 * 60 * 60 * 1000
  );

  const isPaidUpFront =
    input.paymentMethod === "EFECTIVO" ||
    input.paymentMethod === "TRANSFERENCIA" ||
    input.paymentMethod === "CONTRA_ENTREGA";

  const result = await prisma.$transaction(async (tx) => {
    // Agrupa cantidades por presentación para validar stock
    const quantityByPresentation = new Map<string, number>();
    for (const item of input.items) {
      quantityByPresentation.set(
        item.presentationId,
        (quantityByPresentation.get(item.presentationId) ?? 0) + item.quantity
      );
    }

    // Valida y arma las líneas con precios ACTUALES de la BD (nunca del cliente)
    const lines = input.items.map((item) => {
      const p = byId.get(item.presentationId) as PresentationWithProduct;
      const unitPrice = money(p.price);
      return {
        presentationId: p.id,
        productName: p.product.name,
        presentationLabel: `${p.label} · ${p.grind === "GRANO" ? "Grano" : "Molido"}`,
        quantity: item.quantity,
        unitPrice,
        subtotal: unitPrice * item.quantity,
      };
    });

    // Stock insuficiente → aborta toda la operación
    for (const [presentationId, qty] of quantityByPresentation) {
      const p = byId.get(presentationId) as PresentationWithProduct;
      if (p.stock < qty) {
        throw ApiError.unprocessable(
          `Stock insuficiente para ${p.product.name} (${p.label} · ${p.grind === "GRANO" ? "Grano" : "Molido"}): hay ${p.stock}, necesitas ${qty}.`,
          [{ path: "items", message: `Stock insuficiente: ${p.stock} disponibles.` }]
        );
      }
    }

    const subtotal = lines.reduce((sum, l) => sum + l.subtotal, 0);
    const total = Math.max(0, subtotal - input.discount);

    const number = await nextInvoiceNumber(tx);

    // Líneas de factura
    const invoice = await tx.invoice.create({
      data: {
        number,
        clientId: client.id,
        issueDate,
        dueDate,
        subtotal,
        discount: input.discount,
        total,
        paymentMethod: input.paymentMethod,
        status: isPaidUpFront ? "PAGADA" : "PENDIENTE",
        notes: input.notes ?? null,
        createdById: userId,
        items: { create: lines },
      },
      include: {
        client: { select: { id: true, fullName: true, documentNumber: true, phone: true } },
        createdBy: { select: { id: true, fullName: true } },
        items: true,
        payments: true,
      },
    });

    // Descuento de inventario + movimiento trazable (R3)
    for (const [presentationId, qty] of quantityByPresentation) {
      await tx.productPresentation.update({
        where: { id: presentationId },
        data: { stock: { decrement: qty } },
      });
      await tx.inventoryMovement.create({
        data: {
          presentationId,
          type: "SALIDA",
          reason: "VENTA",
          quantity: qty,
          reference: number,
          createdById: userId,
        },
      });
    }

    // Pago inicial o pago total inmediato
    const initialPayment = isPaidUpFront
      ? total
      : (input.initialPayment && input.initialPayment > 0
          ? Math.min(input.initialPayment, total)
          : 0);

    if (initialPayment > 0) {
      await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: initialPayment,
          method: isPaidUpFront ? input.paymentMethod : "ABONO",
          paidAt: issueDate,
          createdById: userId,
        },
      });
    }

    return invoice.id;
  });

  return getById(result);
}

// ============================================================
//  LISTAR / DETALLE
// ============================================================

const baseInclude = {
  client: { select: { id: true, fullName: true, documentNumber: true, phone: true } },
  createdBy: { select: { id: true, fullName: true } },
  items: true,
  payments: { orderBy: { paidAt: "asc" as const } },
};

export async function list(pagination: Pagination, query: ListInvoicesQuery) {
  const where: Prisma.InvoiceWhereInput = {
    ...(query.clientId ? { clientId: query.clientId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.from || query.to
      ? {
          issueDate: {
            ...(query.from ? { gte: query.from } : {}),
            ...(query.to ? { lte: query.to } : {}),
          },
        }
      : {}),
    ...(query.q
      ? {
          OR: [
            { number: { contains: query.q, mode: "insensitive" } },
            { client: { fullName: { contains: query.q, mode: "insensitive" } } },
            { client: { documentNumber: { contains: query.q } } },
          ],
        }
      : {}),
  };

  // Marca como VENCIDA las pendientes que ya pasaron su fecha (R2)
  await prisma.invoice.updateMany({
    where: { status: "PENDIENTE", dueDate: { lt: new Date() } },
    data: { status: "VENCIDA" },
  });

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: baseInclude,
      orderBy: { issueDate: "desc" },
      ...pageParams(pagination),
    }),
    prisma.invoice.count({ where }),
  ]);

  const data = invoices.map((i) => serializeInvoice(i, query.withItems === "true"));

  return { data, total };
}

export async function getById(id: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: baseInclude,
  });
  if (!invoice) throw ApiError.notFound("Factura no encontrada.");
  return serializeInvoice(invoice);
}

export async function getByNumber(number: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { number },
    include: baseInclude,
  });
  if (!invoice) throw ApiError.notFound("Factura no encontrada.");
  return serializeInvoice(invoice);
}

// ============================================================
//  ABONOS / PAGOS (R2)
// ============================================================

export async function registerPayment(
  invoiceId: string,
  input: CreatePaymentInput,
  userId: string
) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true },
  });
  if (!invoice) throw ApiError.notFound("Factura no encontrada.");
  if (invoice.status === "ANULADA")
    throw ApiError.badRequest("No se pueden registrar abonos a una factura anulada.");

  const currentBalance = invoiceBalance(invoice);
  if (input.amount > currentBalance + 0.01) {
    throw ApiError.unprocessable(
      `El abono (${input.amount}) supera el saldo pendiente (${currentBalance}).`
    );
  }

  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.payment.create({
      data: {
        invoiceId,
        amount: input.amount,
        method: input.method,
        paidAt: input.paidAt ?? new Date(),
        notes: input.notes ?? null,
        createdById: userId,
      },
    });

    const remaining = currentBalance - input.amount;
    if (remaining <= 0.01) {
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: "PAGADA" },
      });
    } else if (invoice.status === "VENCIDA") {
      // Mantiene el estado vencido aunque haya abonos parciales
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: "VENCIDA" },
      });
    }

    return created;
  });

  return getById(invoiceId).then((inv) => ({ ...inv, lastPayment: payment }));
}

// ============================================================
//  ANULAR (devuelve stock)
// ============================================================

export async function voidInvoice(
  invoiceId: string,
  reason: string,
  actor: { id: string; role: Role }
) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { items: true, payments: true },
  });
  if (!invoice) throw ApiError.notFound("Factura no encontrada.");
  if (invoice.status === "ANULADA")
    throw ApiError.badRequest("La factura ya está anulada.");

  // Regla de negocio: anular una factura PAGADA solo lo hace el administrador
  if (invoice.status === "PAGADA" && actor.role !== "ADMIN") {
    throw ApiError.forbidden("Solo un administrador puede anular una factura pagada.");
  }

  await prisma.$transaction(async (tx) => {
    // Devolver stock
    for (const item of invoice.items) {
      await tx.productPresentation.update({
        where: { id: item.presentationId },
        data: { stock: { increment: item.quantity } },
      });
      await tx.inventoryMovement.create({
        data: {
          presentationId: item.presentationId,
          type: "ENTRADA",
          reason: "DEVOLUCION",
          quantity: item.quantity,
          reference: invoice.number,
          notes: `Anulación: ${reason}`,
          createdById: actor.id,
        },
      });
    }

    await tx.invoice.update({
      where: { id: invoiceId },
      data: { status: "ANULADA", notes: `${invoice.notes ?? ""}\n[ANULADA] ${reason}`.trim() },
    });
  });

  return getById(invoiceId);
}

// ============================================================
//  ALERTAS / RESÚMENES (R8)
// ============================================================

/** Facturas vencidas o por vencer en X días (para la pantalla de alertas). */
export async function overdueOrDue(days: number = 30) {
  const limit = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const invoices = await prisma.invoice.findMany({
    where: {
      status: { in: ["PENDIENTE", "VENCIDA"] },
      dueDate: { lte: limit },
    },
    include: baseInclude,
    orderBy: { dueDate: "asc" },
  });

  return invoices.map((i) => serializeInvoice(i, false));
}
