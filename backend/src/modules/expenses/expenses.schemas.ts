import { z } from "zod";

import { paginationQuery } from "../../shared/utils/pagination.js";

export const expenseCategories = [
  "Operativo",
  "Nómina",
  "Arriendo",
  "Servicios públicos",
  "Transporte",
  "Empaque",
  "Mantenimiento",
  "Impuestos",
  "Otro",
] as const;

export const createExpenseSchema = z.object({
  date: z.coerce.date().optional(),
  concept: z.string().trim().min(3, "Describe el gasto.").max(150),
  amount: z.number().positive("El gasto debe ser mayor que cero."),
  category: z.enum(expenseCategories).default("Operativo"),
  notes: z.string().trim().max(500).nullish(),
});

export const updateExpenseSchema = z
  .object({
    date: z.coerce.date().optional(),
    concept: z.string().trim().min(3).max(150).optional(),
    amount: z.number().positive().optional(),
    category: z.enum(expenseCategories).optional(),
    notes: z.string().trim().max(500).nullish(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "Debes enviar al menos un campo a actualizar.",
  });

export const listExpensesQuery = paginationQuery.extend({
  category: z.enum(expenseCategories).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  q: z.string().trim().max(120).optional(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type ListExpensesQuery = z.infer<typeof listExpensesQuery>;
