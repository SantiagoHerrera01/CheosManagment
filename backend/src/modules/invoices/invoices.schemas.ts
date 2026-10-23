import { z } from "zod";

import { paginationQuery } from "../../shared/utils/pagination.js";

export const paymentMethodSchema = z.enum([
  "EFECTIVO",
  "TRANSFERENCIA",
  "CONTRA_ENTREGA",
  "CREDITO",
  "ABONO",
]);

export const invoiceStatusSchema = z.enum([
  "PENDIENTE",
  "PAGADA",
  "VENCIDA",
  "ANULADA",
]);

export const invoiceItemInputSchema = z.object({
  presentationId: z.string().uuid("presentationId debe ser un UUID."),
  quantity: z.number().int().positive("La cantidad debe ser mayor que cero."),
});

export const createInvoiceSchema = z.object({
  clientId: z.string().uuid("clientId debe ser un UUID."),
  items: z
    .array(invoiceItemInputSchema)
    .min(1, "La factura debe tener al menos un producto.")
    .max(100),
  /** Descuento absoluto en pesos (no porcentaje). */
  discount: z.number().nonnegative().default(0),
  paymentMethod: paymentMethodSchema.default("CREDITO"),
  /** Abono inicial (solo tiene sentido con método ABONO o crédito parcial). */
  initialPayment: z.number().positive().nullish(),
  notes: z.string().trim().max(1000).nullish(),
  issueDate: z.coerce.date().nullish(),
  /** Días de crédito; por defecto 30 (R1/R2). */
  creditDays: z.number().int().min(0).max(365).default(30),
});

export const createPaymentSchema = z.object({
  amount: z.number().positive("El abono debe ser mayor que cero."),
  method: paymentMethodSchema.default("ABONO"),
  paidAt: z.coerce.date().nullish(),
  notes: z.string().trim().max(500).nullish(),
});

export const voidInvoiceSchema = z.object({
  reason: z.string().trim().min(3).max(300),
});

export const listInvoicesQuery = paginationQuery.extend({
  q: z.string().trim().max(100).optional(),
  clientId: z.string().uuid().optional(),
  status: invoiceStatusSchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  /** Incluye el detalle de items en la lista (más pesado). */
  withItems: z.enum(["true", "false"]).default("false"),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type ListInvoicesQuery = z.infer<typeof listInvoicesQuery>;
