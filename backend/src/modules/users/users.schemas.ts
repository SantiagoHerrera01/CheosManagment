import { z } from "zod";

import { ApiError } from "../../shared/errors/api-error.js";
import { paginationQuery } from "../../shared/utils/pagination.js";
import { validatePasswordStrength } from "../../shared/utils/password.js";

/** Catálogo de roles (debe coincidir con el enum Role de Prisma). */
export const ROLES = ["ADMIN", "VENDEDOR", "BODEGA", "CONTADOR"] as const;
export const roleSchema = z.enum(ROLES);

export const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().min(5).max(254),
  fullName: z.string().trim().min(3).max(120),
  password: z.string().min(1).max(200),
  role: roleSchema,
});

export const updateUserSchema = z
  .object({
    fullName: z.string().trim().min(3).max(120).optional(),
    role: roleSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "Debes enviar al menos un campo a actualizar.",
  });

export const listUsersQuery = paginationQuery.extend({
  q: z.string().trim().max(100).optional(),
  role: roleSchema.optional(),
  includeInactive: z.enum(["true", "false"]).default("false"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

/** Valida la política de fortaleza en el momento de crear/restablecer. */
export function assertPasswordPolicy(password: string): void {
  const error = validatePasswordStrength(password);
  if (error) {
    throw ApiError.badRequest(error, [{ path: "password", message: error }]);
  }
}
