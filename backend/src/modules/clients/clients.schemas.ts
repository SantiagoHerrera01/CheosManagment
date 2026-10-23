import { z } from "zod";

import { paginationQuery } from "../../shared/utils/pagination.js";

export const documentTypeSchema = z.enum(["CC", "NIT", "CE", "PASSPORT"]);

export const createClientSchema = z.object({
  documentType: documentTypeSchema,
  documentNumber: z
    .string()
    .trim()
    .min(4, "El número de documento es demasiado corto.")
    .max(20),
  fullName: z.string().trim().min(3, "El nombre es demasiado corto.").max(150),
  // Opcional: la base original del cliente tiene registros sin celular.
  phone: z.string().trim().min(3, "El teléfono es demasiado corto.").max(30).nullish(),
  email: z.string().trim().toLowerCase().email("Correo inválido.").nullish(),
  address: z.string().trim().max(200).nullish(),
  city: z.string().trim().max(100).nullish(),
  department: z.string().trim().max(100).nullish(),
  notes: z.string().trim().max(1000).nullish(),
  creditLimit: z.number().nonnegative().nullish(),
});

export const updateClientSchema = createClientSchema.partial().refine(
  (data) => Object.values(data).some((v) => v !== undefined),
  { message: "Debes enviar al menos un campo a actualizar." }
);

export const listClientsQuery = paginationQuery.extend({
  q: z.string().trim().max(150).optional(),
  active: z.enum(["true", "false"]).default("true"),
  /** Orden por saldo pendiente (cartera) — más endeudados primero. */
  sort: z.enum(["name", "balance", "recent"]).default("name"),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type ListClientsQuery = z.infer<typeof listClientsQuery>;
