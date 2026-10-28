import { Router } from "express";
import { z } from "zod";

import { Role } from "@prisma/client";

import { authenticate, requireRole } from "../../shared/middleware/auth.js";
import { validate } from "../../shared/middleware/validate.js";
import { paged } from "../../shared/utils/pagination.js";
import * as expensesService from "./expenses.service.js";
import {
  createExpenseSchema,
  listExpensesQuery,
  updateExpenseSchema,
} from "./expenses.schemas.js";

const router = Router();

router.use(authenticate);

const idParam = z.object({ id: z.string().uuid() });

/**
 * @openapi
 * /expenses:
 *   get:
 *     tags: [Gastos]
 *     summary: Listar gastos operativos (R6)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 20 } }
 *       - { in: query, name: category, schema: { type: string, enum: [Operativo, Nómina, Arriendo, Servicios públicos, Transporte, Empaque, Mantenimiento, Impuestos, Otro] } }
 *       - { in: query, name: from, schema: { type: string, format: date } }
 *       - { in: query, name: to, schema: { type: string, format: date } }
 *       - { in: query, name: q, schema: { type: string }, description: Buscar por concepto }
 *     responses:
 *       200:
 *         description: Gastos paginados con la suma del filtro (`totalAmount`).
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.get(
  "/",
  requireRole(Role.ADMIN, Role.CONTADOR, Role.VENDEDOR),
  validate({ query: listExpensesQuery }),
  async (req, res, next) => {
    try {
      const query = req.query as unknown as z.infer<typeof listExpensesQuery>;
      const { page, limit } = { page: Number(query.page), limit: Number(query.limit) };
      const { data, total, totalAmount } = await expensesService.list({ page, limit }, query);
      res.json({ ...paged(data, total, { page, limit }), totalAmount });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /expenses/summary:
 *   get:
 *     tags: [Gastos]
 *     summary: Gastos agrupados por categoría (R6)
 *     description: Alimenta el cálculo de utilidad junto con facturación y costos (R7).
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: query, name: from, schema: { type: string, format: date }, required: true }
 *       - { in: query, name: to, schema: { type: string, format: date }, required: true }
 *     responses:
 *       200: { description: Totales por categoría en el rango. }
 */
router.get(
  "/summary",
  requireRole(Role.ADMIN, Role.CONTADOR),
  validate({
    query: z.object({ from: z.coerce.date(), to: z.coerce.date() }),
  }),
  async (req, res, next) => {
    try {
      const { from, to } = req.query as unknown as { from: Date; to: Date };
      res.json({ data: await expensesService.summaryByCategory(from, to) });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /expenses:
 *   post:
 *     tags: [Gastos]
 *     summary: Registrar un gasto (R6)
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [concept, amount]
 *             properties:
 *               date: { type: string, format: date, description: Hoy por defecto }
 *               concept: { type: string, example: Bolsas 250 g }
 *               amount: { type: number, example: 45000 }
 *               category: { type: string, enum: [Operativo, Nómina, Arriendo, Servicios públicos, Transporte, Empaque, Mantenimiento, Impuestos, Otro] }
 *               notes: { type: string }
 *     responses:
 *       201: { description: Gasto registrado. }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.post(
  "/",
  requireRole(Role.ADMIN, Role.CONTADOR, Role.VENDEDOR),
  validate({ body: createExpenseSchema }),
  async (req, res, next) => {
    try {
      const expense = await expensesService.create(req.body, req.user!.id);
      res.status(201).json({ data: expense });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /expenses/{id}:
 *   patch:
 *     tags: [Gastos]
 *     summary: Editar un gasto (R6)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/GastoInput' }
 *     responses:
 *       200: { description: Gasto actualizado. }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   delete:
 *     tags: [Gastos]
 *     summary: Eliminar un gasto (solo admin)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       204: { description: Gasto eliminado. }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.patch(
  "/:id",
  requireRole(Role.ADMIN, Role.CONTADOR),
  validate({ params: idParam, body: updateExpenseSchema }),
  async (req, res, next) => {
    try {
      res.json({ data: await expensesService.update(req.params.id as string, req.body) });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/:id",
  requireRole(Role.ADMIN),
  validate({ params: idParam }),
  async (req, res, next) => {
    try {
      await expensesService.remove(req.params.id as string);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
