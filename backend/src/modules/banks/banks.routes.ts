import { Router } from "express";
import { z } from "zod";

import { Role } from "@prisma/client";

import { authenticate, requireRole } from "../../shared/middleware/auth.js";
import { validate } from "../../shared/middleware/validate.js";
import { paged } from "../../shared/utils/pagination.js";
import * as banksService from "./banks.service.js";
import {
  createAccountSchema,
  createMovementSchema,
  listMovementsQuery,
  updateAccountSchema,
} from "./banks.schemas.js";

const router = Router();

router.use(authenticate);

const idParam = z.object({ id: z.string().uuid() });

/**
 * @openapi
 * /banks/accounts:
 *   get:
 *     tags: [Bancos]
 *     summary: Listar cuentas (bancarias o de efectivo)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: query, name: includeInactive, schema: { type: boolean, default: false } }
 *     responses:
 *       200: { description: Cuentas con su saldo actual. }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *   post:
 *     tags: [Bancos]
 *     summary: Crear cuenta
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, bank]
 *             properties:
 *               name: { type: string, example: Bancolombia ahorros }
 *               bank: { type: string, example: Bancolombia }
 *               accountNumber: { type: string, example: "0123456789" }
 *     responses:
 *       201: { description: Cuenta creada con saldo 0. }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get(
  "/accounts",
  requireRole(Role.ADMIN, Role.CONTADOR),
  validate({
    query: z.object({ includeInactive: z.coerce.boolean().default(false) }),
  }),
  async (req, res, next) => {
    try {
      const { includeInactive } = req.query as unknown as { includeInactive: boolean };
      res.json({ data: await banksService.listAccounts(includeInactive) });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/accounts",
  requireRole(Role.ADMIN, Role.CONTADOR),
  validate({ body: createAccountSchema }),
  async (req, res, next) => {
    try {
      const account = await banksService.createAccount(req.body);
      res.status(201).json({ data: account });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /banks/accounts/{id}:
 *   patch:
 *     tags: [Bancos]
 *     summary: Editar cuenta (nombre, banco, estado)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               bank: { type: string }
 *               accountNumber: { type: string, nullable: true }
 *               isActive: { type: boolean }
 *     responses:
 *       200: { description: Cuenta actualizada. }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.patch(
  "/accounts/:id",
  requireRole(Role.ADMIN, Role.CONTADOR),
  validate({ params: idParam, body: updateAccountSchema }),
  async (req, res, next) => {
    try {
      res.json({ data: await banksService.updateAccount(req.params.id as string, req.body) });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /banks/movements:
 *   get:
 *     tags: [Bancos]
 *     summary: Historial de movimientos bancarios
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: query, name: accountId, schema: { type: string, format: uuid } }
 *       - { in: query, name: type, schema: { type: string, enum: [ENTRADA, SALIDA, AJUSTE] } }
 *       - { in: query, name: from, schema: { type: string, format: date } }
 *       - { in: query, name: to, schema: { type: string, format: date } }
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 20 } }
 *     responses:
 *       200: { description: Movimientos paginados. }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *   post:
 *     tags: [Bancos]
 *     summary: Registrar movimiento y actualizar el saldo
 *     description: |
 *       `ENTRADA` suma, `SALIDA` resta y `AJUSTE` aplica el monto con su signo.
 *       Un SALIDA que dejaría la cuenta en negativo se rechaza (422).
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [accountId, type, amount, concept]
 *             properties:
 *               accountId: { type: string, format: uuid }
 *               type: { type: string, enum: [ENTRADA, SALIDA, AJUSTE] }
 *               amount: { type: number, example: 50000 }
 *               concept: { type: string, example: "Abono factura F-000002" }
 *               date: { type: string, format: date, description: Hoy por defecto }
 *     responses:
 *       201: { description: Movimiento registrado y saldo actualizado. }
 *       422: { description: Saldo insuficiente. }
 */
const movementBody = createMovementSchema.extend({
  accountId: z.string().uuid(),
});

router.get(
  "/movements",
  requireRole(Role.ADMIN, Role.CONTADOR),
  validate({ query: listMovementsQuery }),
  async (req, res, next) => {
    try {
      const query = req.query as unknown as z.infer<typeof listMovementsQuery>;
      const { page, limit } = { page: Number(query.page), limit: Number(query.limit) };
      const { data, total } = await banksService.listMovements({ page, limit }, query);
      res.json(paged(data, total, { page, limit }));
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/movements",
  requireRole(Role.ADMIN, Role.CONTADOR),
  validate({ body: movementBody }),
  async (req, res, next) => {
    try {
      const { accountId, ...movement } = req.body as z.infer<typeof movementBody>;
      const created = await banksService.createMovement(accountId, movement, req.user!.id);
      res.status(201).json({ data: created });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
