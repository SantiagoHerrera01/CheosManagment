import "dotenv/config";

/**
 * Selección de la base de datos según el modo (única fuente de verdad):
 *
 *   DEV  (NODE_ENV != production) → DATABASE_URL      (PostgreSQL local)
 *   PROD (NODE_ENV = production)  → DATABASE_URL_PROD (PostgreSQL de Render)
 *
 * Se sobrescribe `process.env.DATABASE_URL` al importar este módulo para que
 * todo lo que cree un `PrismaClient` (app, seed, scripts) o lo lea la CLI de
 * Prisma (`prisma.config.ts`) apunte a la BD del modo actual.
 */
const isProduction = process.env.NODE_ENV === "production";

const prodUrl = process.env.DATABASE_URL_PROD?.trim();

const databaseUrl = prodUrl && isProduction
  ? prodUrl
  : (process.env.DATABASE_URL?.trim() ?? "");

if (!databaseUrl) {
  throw new Error(
    "[database-url] No hay URL de base de datos: define DATABASE_URL" +
      (isProduction ? " o DATABASE_URL_PROD." : ".")
  );
}

process.env.DATABASE_URL = databaseUrl;

export { databaseUrl };
