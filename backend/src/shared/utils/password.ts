import { Algorithm, hash, verify } from "@node-rs/argon2";

/**
 * Hash de contraseñas con **Argon2id** (recomendación OWASP 2024):
 * resistente a ataques con GPU/ASIC, a diferencia de bcrypt.
 *
 * - memoryCost: 65536 KiB (64 MB)
 * - timeCost: 3 iteraciones
 * - parallelism: 4 hilos
 */
const OPTIONS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 65_536,
  timeCost: 3,
  parallelism: 4,
  outputLen: 32,
} as const;

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, OPTIONS);
}

/** Verifica sin lanzar: un hash corrupto devuelve `false`, no explota. */
export async function verifyPassword(digest: string, plain: string): Promise<boolean> {
  try {
    return await verify(digest, plain, OPTIONS);
  } catch {
    return false;
  }
}

/**
 * Regla de política de contraseñas: 10+ caracteres, mayúscula, minúscula
 * y número. Devuelve `null` si es válida o el mensaje de error.
 */
export function validatePasswordStrength(password: string): string | null {
  if (password.length < 10) return "La contraseña debe tener al menos 10 caracteres.";
  if (!/[A-Z]/.test(password)) return "Debe contener al menos una mayúscula.";
  if (!/[a-z]/.test(password)) return "Debe contener al menos una minúscula.";
  if (!/[0-9]/.test(password)) return "Debe contener al menos un número.";
  if (/^(password|123456|admin|cheo)/i.test(password))
    return "La contraseña es demasiado común.";
  return null;
}
