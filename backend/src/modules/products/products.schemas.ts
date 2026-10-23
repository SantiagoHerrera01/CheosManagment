import { z } from "zod";

import { paginationQuery } from "../../shared/utils/pagination.js";

export const grindSchema = z.enum(["MOLIDO", "GRANO"]);

export const presentationInputSchema = z.object({
  label: z.string().trim().min(1).max(30),
  grind: grindSchema,
  price: z.number().positive("El precio debe ser mayor que cero."),
  cost: z.number().nonnegative().default(0),
  stock: z.number().int().nonnegative().default(0),
  minimumStock: z.number().int().nonnegative().default(0),
});

export const createProductSchema = z.object({
  name: z.string().trim().min(2).max(120),
  variety: z.string().trim().max(80).nullish(),
  process: z.string().trim().max(80).nullish(),
  presentations: z
    .array(presentationInputSchema)
    .min(1, "El producto debe tener al menos una presentación.")
    .max(20),
});

export const updateProductSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    variety: z.string().trim().max(80).nullish(),
    process: z.string().trim().max(80).nullish(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "Debes enviar al menos un campo a actualizar.",
  });

export const updatePresentationSchema = z
  .object({
    label: z.string().trim().min(1).max(30).optional(),
    grind: grindSchema.optional(),
    price: z.number().positive().optional(),
    cost: z.number().nonnegative().optional(),
    minimumStock: z.number().int().nonnegative().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "Debes enviar al menos un campo a actualizar.",
  });

export const createPresentationSchema = presentationInputSchema;

/** Entrada de stock por producción/compra (bodega). */
export const stockEntrySchema = z.object({
  quantity: z.number().int().positive("La cantidad debe ser mayor que cero."),
  reason: z.enum(["PRODUCCION", "COMPRA", "DEVOLUCION", "AJUSTE"]).default("PRODUCCION"),
  cost: z.number().nonnegative().optional(),
  notes: z.string().trim().max(500).nullish(),
});

export const listProductsQuery = paginationQuery.extend({
  q: z.string().trim().max(120).optional(),
  active: z.enum(["true", "false"]).default("true"),
  lowStock: z.enum(["true", "false"]).default("false"),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreatePresentationInput = z.infer<typeof createPresentationSchema>;
export type UpdatePresentationInput = z.infer<typeof updatePresentationSchema>;
export type StockEntryInput = z.infer<typeof stockEntrySchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuery>;
