import "dotenv/config";

import { databaseUrl } from "./database-url.js";

/**
 * Acceso tipado y validado a las variables de entorno.
 *
 * - En PRODUCCIÓN todo lo obligatorio debe existir y los secretos deben ser
 *   largos: si falta algo, la app **no arranca** (fail-fast).
 * - En DESARROLLO se generan valores locales de respaldo con una advertencia,
 *   para que `docker compose up` funcione sin configuración previa.
 */

const isProduction = process.env.NODE_ENV === "production";

const DEV_ACCESS_SECRET = "dev-only-access-secret-cambiar-en-produccion-000";
const DEV_REFRESH_SECRET = "dev-only-refresh-secret-cambiar-en-produccion-1";

function read(name: string, fallback?: string): string {
  const value = process.env[name]?.trim();
  if (value) return value;

  if (isProduction) {
    throw new Error(
      `[env] La variable "${name}" es obligatoria en producción y no está definida.`
    );
  }

  if (fallback) {
    console.warn(`[env] ⚠️  "${name}" no está definida; usando valor de DESARROLLO.`);
    return fallback;
  }

  throw new Error(`[env] La variable "${name}" es obligatoria.`);
}

function readSecret(name: string, devFallback: string): string {
  const secret = read(name, devFallback);

  if (isProduction && secret.length < 32) {
    throw new Error(
      `[env] "${name}" debe tener al menos 32 caracteres en producción (actual: ${secret.length}).`
    );
  }
  if (isProduction && secret === devFallback) {
    throw new Error(`[env] "${name}" sigue siendo el valor de desarrollo. Genera uno real.`);
  }

  return secret;
}

function readList(name: string, fallback: string[]): string[] {
  const raw = process.env[name];
  if (!raw?.trim()) return fallback;
  return raw.split(",").map((o) => o.trim()).filter(Boolean);
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  isProduction,

  PORT: Number(process.env.PORT ?? 3000),
  DATABASE_URL: databaseUrl,

  /** Seguros independientes: comprometer uno no tumba el otro. */
  JWT_ACCESS_SECRET: readSecret("JWT_ACCESS_SECRET", DEV_ACCESS_SECRET),
  JWT_REFRESH_SECRET: readSecret("JWT_REFRESH_SECRET", DEV_REFRESH_SECRET),

  /** Duración de los tokens de acceso (segundos). */
  ACCESS_TOKEN_TTL: Number(process.env.ACCESS_TOKEN_TTL ?? 900), // 15 min
  /** Duración de la sesión en cookies (segundos). */
  REFRESH_TOKEN_TTL: Number(process.env.REFRESH_TOKEN_TTL ?? 60 * 60 * 24 * 7), // 7 días

  /** Orígenes permitidos para el frontend (con credenciales). */
  CORS_ORIGINS: readList("CORS_ORIGINS", ["http://localhost:5173"]),

  /** Intentos fallidos antes de bloquear la cuenta temporalmente. */
  MAX_LOGIN_ATTEMPTS: Number(process.env.MAX_LOGIN_ATTEMPTS ?? 5),
  LOGIN_LOCK_MINUTES: Number(process.env.LOGIN_LOCK_MINUTES ?? 15),
} as const;
