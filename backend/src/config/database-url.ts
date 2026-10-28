import "dotenv/config";

/**
 * Selección de la base de datos según el modo:
 *   PROD (NODE_ENV=production) → DATABASE_URL_PROD (PostgreSQL de Render)
 *   DEV                        → DATABASE_URL      (PostgreSQL local)
 *
 * Si solo existe una de las dos, se usa esa: así el BUILD de Render (donde
 * NODE_ENV no siempre está definido) y los pasos de migración funcionan
 * siempre, sin depender del modo exacto del momento.
 *
 * Al importar este módulo se sobrescribe `process.env.DATABASE_URL` para
 * que todo lo que lea esa variable (cliente Prisma, CLI, seed y scripts)
 * apunte a la BD correcta sin más configuración.
 */
const prodUrl = process.env.DATABASE_URL_PROD?.trim();
const devUrl = process.env.DATABASE_URL?.trim();
const isProduction = process.env.NODE_ENV === "production";

const databaseUrl = isProduction
  ? prodUrl || devUrl || ""
  : devUrl || prodUrl || "";

// Si no hay ninguna URL, se deja vacío: `prisma generate` no la necesita
// y la app / migraciones fallarán con un mensaje claro al usarse.
if (databaseUrl) {
  process.env.DATABASE_URL = databaseUrl;
}

export { databaseUrl };
