import { Router } from "express";
import { z } from "zod";

import { Role } from "@prisma/client";

import { authenticate, requireRole } from "../../shared/middleware/auth.js";
import { validate } from "../../shared/middleware/validate.js";
import * as reportsService from "./reports.service.js";

const router = Router();

router.use(authenticate);

const rangeQuery = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Formato esperado: YYYY-MM.")
    .optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

/**
 * @openapi
 * /reports/profit:
 *   get:
 *     tags: [Reportes]
 *     summary: Utilidad del periodo (R7)
 *     description: |
 *       `utilidad bruta = facturado − costo vendido` (usa el `unitCost` guardado
 *       en cada línea de factura) y `utilidad neta = utilidad bruta − gastos` (R6).
 *       Sin parámetros devuelve el mes en curso; también acepta `from`/`to`.
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: query, name: month, schema: { type: string, example: "2026-10" } }
 *       - { in: query, name: from, schema: { type: string, format: date } }
 *       - { in: query, name: to, schema: { type: string, format: date } }
 *     responses:
 *       200:
 *         description: Utilidad bruta/neta con márgenes, gastos y ticket promedio.
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get(
  "/profit",
  requireRole(Role.ADMIN, Role.CONTADOR),
  validate({ query: rangeQuery }),
  async (req, res, next) => {
    try {
      const q = req.query as unknown as { month?: string; from?: Date; to?: Date };
      const range =
        q.from && q.to ? { from: q.from, to: q.to } : reportsService.monthRange(q.month);
      res.json({ data: await reportsService.profit(range.from, range.to) });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /reports/monthly:
 *   get:
 *     tags: [Reportes]
 *     summary: Utilidad mes a mes (R7)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: query, name: months, schema: { type: integer, default: 6, minimum: 1, maximum: 24 } }
 *     responses:
 *       200: { description: Serie mensual de facturado, bruto, gastos y neto. }
 */
router.get(
  "/monthly",
  requireRole(Role.ADMIN, Role.CONTADOR),
  validate({ query: z.object({ months: z.coerce.number().int().min(1).max(24).default(6) }) }),
  async (req, res, next) => {
    try {
      const { months } = req.query as unknown as { months: number };
      res.json({ data: await reportsService.monthlyProfit(months) });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /reports/top-products:
 *   get:
 *     tags: [Reportes]
 *     summary: Productos más vendidos con su utilidad (R7)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: query, name: month, schema: { type: string, example: "2026-10" } }
 *       - { in: query, name: limit, schema: { type: integer, default: 10 } }
 *     responses:
 *       200: { description: Ranking por facturación con utilidad por producto. }
 */
router.get(
  "/top-products",
  requireRole(Role.ADMIN, Role.CONTADOR),
  validate({
    query: rangeQuery.extend({ limit: z.coerce.number().int().min(1).max(50).default(10) }),
  }),
  async (req, res, next) => {
    try {
      const q = req.query as unknown as { month?: string; limit: number };
      const { from, to } = reportsService.monthRange(q.month);
      res.json({ data: await reportsService.topProducts(from, to, q.limit) });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /reports/alerts:
 *   get:
 *     tags: [Reportes]
 *     summary: Alertas del sistema (R8)
 *     description: |
 *       Stock bajo/mínimo, facturas vencidas o por vencer con su saldo y
 *       órdenes de producción abiertas. Es la fuente del banner de alertas.
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: query, name: days, schema: { type: integer, default: 0, description: Días de anticipación para "por vencer" } }
 *     responses:
 *       200:
 *         description: Alertas agrupadas (stock, cartera y producción).
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get(
  "/alerts",
  requireRole(Role.ADMIN, Role.BODEGA, Role.CONTADOR, Role.VENDEDOR),
  validate({ query: z.object({ days: z.coerce.number().int().min(0).max(90).default(0) }) }),
  async (req, res, next) => {
    try {
      const { days } = req.query as unknown as { days: number };
      res.json({ data: await reportsService.alerts(days) });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /reports/dashboard:
 *   get:
 *     tags: [Reportes]
 *     summary: KPIs de hoy y del mes en curso
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200:
 *         description: Utilidad de hoy/mes, facturado y órdenes abiertas.
 */
router.get(
  "/dashboard",
  async (_req, res, next) => {
    try {
      res.json({ data: await reportsService.dashboard() });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
