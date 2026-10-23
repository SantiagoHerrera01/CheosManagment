import { z } from "zod";

import { validatePasswordStrength } from "../../shared/utils/password.js";

export const loginSchema = z.object({
  email: z.string().trim().min(3).max(254),
  // En login NO aplicamos política de fortaleza: solo se verifica.
  password: z.string().min(1).max(200),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(200),
    newPassword: z.string().min(1).max(200),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    path: ["newPassword"],
    message: "La contraseña nueva debe ser distinta a la actual.",
  })
  .refine((data) => validatePasswordStrength(data.newPassword) === null, {
    path: ["newPassword"],
    message: "Debe tener 10+ caracteres, mayúscula, minúscula y número.",
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
