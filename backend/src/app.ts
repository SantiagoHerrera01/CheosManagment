import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";

import { env } from "./config/env.js";
import { swaggerDocument } from "./docs/swagger.js";
import { errorHandler, notFoundHandler } from "./shared/middleware/error-handler.js";
import { globalLimiter } from "./shared/middleware/rate-limit.js";
import { originGuard } from "./shared/middleware/origin-guard.js";

import authRoutes from "./modules/auth/auth.routes.js";
import usersRoutes from "./modules/users/users.routes.js";
import clientsRoutes from "./modules/clients/clients.routes.js";
import productsRoutes from "./modules/products/products.routes.js";
import invoicesRoutes from "./modules/invoices/invoices.routes.js";
import inventoryRoutes from "./modules/inventory/inventory.routes.js";
import productionRoutes from "./modules/production/production.routes.js";
import expensesRoutes from "./modules/expenses/expenses.routes.js";
import purchasesRoutes from "./modules/purchases/purchases.routes.js";
import banksRoutes from "./modules/banks/banks.routes.js";
import reportsRoutes from "./modules/reports/reports.routes.js";

const app = express();

// Cabeceras de seguridad (HSTS, X-Frame-Options, no-sniff, etc.)
app.use(helmet());

// Cookies con credenciales: el frontend debe usar `credentials: "include"`
app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir peticiones sin origen (curl, Postman, apps móviles)
      if (!origin) return callback(null, true);
      if (env.CORS_ORIGINS.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// Protecciones transversales
app.use(globalLimiter);
app.use(originGuard);

/**
 * @openapi
 * /api:
 *   get:
 *     tags: [Sistema]
 *     summary: Estado del servicio
 *     description: Comprueba que la API está viva. Sirve como health check de Docker o del orquestador.
 *     responses:
 *       "200":
 *         description: API funcionando correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name: { type: string, example: Cheo Manager API }
 *                 version: { type: string, example: "1.0.0" }
 *                 status: { type: string, example: running }
 */
app.get("/api", (req, res) => {
  res.json({
    name: "Cheo Manager API",
    version: "1.0.0",
    status: "running",
    environment: env.NODE_ENV,
  });
});

// ------------------------------------------------------------
//  Rutas de la API
// ------------------------------------------------------------
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/clients", clientsRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/invoices", invoicesRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/production", productionRoutes);
app.use("/api/expenses", expensesRoutes);
app.use("/api/purchases", purchasesRoutes);
app.use("/api/banks", banksRoutes);
app.use("/api/reports", reportsRoutes);

// Documentación interactiva (Swagger UI) — sin autenticación a propósito:
// es la herramienta con la que el cliente revisa los endpoints.
app.use(
  "/api/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    customSiteTitle: "Cheo Manager API",
    explorer: false,
  })
);

// Especificación OpenAPI en JSON (importable a Postman / Insomnia)
app.get("/api/openapi.json", (req, res) => {
  res.json(swaggerDocument);
});

// 404 y manejador global de errores (van al final, siempre)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
