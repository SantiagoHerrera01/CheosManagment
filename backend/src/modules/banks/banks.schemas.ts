import { z } from "zod";

import { paginationQuery } from "../../shared/utils/pagination.js";

export const createAccountSchema = z.object({
  name: z.string().trim().min(2, "Ponle nombre a la cuenta.").max(80),
  bank: z.string().trim().min(2, "Indica el banco.").max(80),
  accountNumber: z.string().trim().max(30).nullish(),
});

export const updateAccountSchema = createAccountSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const createMovementSchema = z
  .object({
    type: z.enum(["ENTRADA", "SALIDA", "AJUSTE"]),
    /** El signo lo determina `type`; los ajustes negativos van con signo. */
    amount: z.number().refine((v) => v !== 0, "El monto no puede ser cero."),
    concept: z.string().trim().min(3, "Describe el movimiento.").max(150),
    date: z.coerce.date().optional(),
  })
  .refine((d) => d.type === "AJUSTE" || d.amount > 0, {
    message: "Para ENTRADA/SALIDA el monto debe ser positivo (el signo lo pone el tipo).",
    path: ["amount"],
  });

export const listMovementsQuery = paginationQuery.extend({
  accountId: z.string().uuid().optional(),
  type: z.enum(["ENTRADA", "SALIDA", "AJUSTE"]).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type CreateMovementInput = z.infer<typeof createMovementSchema>;
export type ListMovementsQuery = z.infer<typeof listMovementsQuery>;
