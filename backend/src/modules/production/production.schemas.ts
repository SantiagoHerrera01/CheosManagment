import { z } from "zod";

import { paginationQuery } from "../../shared/utils/pagination.js";

export const stageTypeSchema = z.enum([
  "TRILLA",
  "TUESTE",
  "LAVADO",
  "SECADO",
  "EMPAQUE",
  "OTRO",
]);

export const createOrderSchema = z.object({
  rawMaterialPresentationId: z.string().uuid(),
  inputQuantity: z.number().int().positive("La cantidad debe ser mayor que cero."),
  outputPresentationId: z.string().uuid().nullish(),
  notes: z.string().trim().max(500).nullish(),
});

export const addStageSchema = z
  .object({
    type: stageTypeSchema,
    inputQuantity: z.number().int().nonnegative(),
    outputQuantity: z.number().int().nonnegative(),
    notes: z.string().trim().max(500).nullish(),
  })
  .refine((data) => data.outputQuantity <= data.inputQuantity, {
    message: "La salida de la etapa no puede superar su entrada.",
    path: ["outputQuantity"],
  });

export const finishOrderSchema = z.object({
  /** Si la orden no se creó con producto de salida, se indica al finalizar. */
  outputPresentationId: z.string().uuid().optional(),
  outputQuantity: z.number().int().positive("Debes indicar las unidades producidas."),
});

export const listOrdersQuery = paginationQuery.extend({
  status: z.enum(["EN_PROCESO", "FINALIZADA", "CANCELADA"]).optional(),
  q: z.string().trim().max(60).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type AddStageInput = z.infer<typeof addStageSchema>;
export type FinishOrderInput = z.infer<typeof finishOrderSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuery>;
