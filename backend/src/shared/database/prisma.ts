import { PrismaClient } from "@prisma/client";

// Selección dev/prod de la BD antes de construir el cliente.
import "../../config/database-url.js";

const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"],
});

export default prisma;