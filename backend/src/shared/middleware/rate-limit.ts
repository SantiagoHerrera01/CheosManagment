import { rateLimit } from "express-rate-limit";

const message = (text: string) => ({ error: { code: "RATE_LIMITED", message: text } });

/** Límite general por IP: evita barridos de endpoints y abuso. */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: message("Demasiadas peticiones desde tu IP. Intenta más tarde."),
});

/**
 * Límite específico de login. Complementa el bloqueo de cuenta que guarda
 * la base de datos (`failedLogins` / `lockedUntil`): uno frena por IP y
 * el otro por cuenta, así un atacante no puede distribuir el ataque.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: message(
    "Demasiados intentos de inicio de sesión desde esta IP. Espera 15 minutos."
  ),
});
