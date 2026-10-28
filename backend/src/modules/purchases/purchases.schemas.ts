import { z } from "zod";

import { paginationQuery } from "../../shared/utils/pagination.js";

export const purchaseItemSchema = z.object({
  presentationId: z.string().uuid(),
  quantity: z.number().int().positive("La cantidad debe ser mayor que cero."),
  unitCost: z.number().nonnegative("El costo no puede ser negativo."),
});

export const createPurchaseSchema = z.object({
  provider: z.string().trim().min(2, "Indica el proveedor.").max(120),
  date: z.coerce.date().optional(),
  notes: z.string().trim().max(500).nullish(),
  items: z
    .array(purchaseItemSchema)
    .min(1, "La compra debe tener al menos un ítem.")
    .max(50),
});

export const listPurchasesQuery = paginationQuery.extend({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  q: z.string().trim().max(120).optional(),
});

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
export type ListPurchasesQuery = z.infer<typeof listPurchasesQuery>;
