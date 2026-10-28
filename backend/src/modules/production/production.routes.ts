import { Router } from "express";
import { z } from "zod";

import { Role } from "@prisma/client";

import { authenticate, requireRole } from "../../shared/middleware/auth.js";
import { validate } from "../../shared/middleware/validate.js";
import { paged, paginationQuery } from "../../shared/utils/pagination.js";
import * as productionService from "./production.service.js";
import {
  addStageSchema,
  createOrderSchema,
  finishOrderSchema,
  listOrdersQuery,
} from "./production.schemas.js";

const router = Router();

router.use(authenticate);

const idParam = z.object({ id: z.string().uuid() });

/**
 * @openapi
 * /production:
 *   get:
 *     tags: [Producción]
 *     summary: Listar órdenes de producción (R4)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 20 } }
 *       - { in: query, name: status, schema: { type: string, enum: [EN_PROCESO, FINALIZADA, CANCELADA] } }
 *       - { in: query, name: q, schema: { type: string }, description: Buscar por nº o materia prima }
 *     responses:
 *       200:
 *         description: Órdenes paginadas con etapas, merma total y rendimiento.
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.get(
  "/",
  requireRole(Role.ADMIN, Role.BODEGA, Role.CONTADOR),
  validate({ query: listOrdersQuery }),
  async (req, res, next) => {
    try {
      const query = req.query as unknown as z.infer<typeof listOrdersQuery>;
      const { page, limit } = { page: Number(query.page), limit: Number(query.limit) };
      const { data, total } = await productionService.list({ page, limit }, query);
      res.json(paged(data, total, { page, limit }));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /production/{id}:
 *   get:
 *     tags: [Producción]
 *     summary: Detalle de una orden con sus etapas y mermas (R4)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Orden con etapas, merma total y rendimiento porcentual. }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get(
  "/:id",
  requireRole(Role.ADMIN, Role.BODEGA, Role.CONTADOR),
  validate({ params: idParam }),
  async (req, res, next) => {
    try {
      res.json({ data: await productionService.getById(req.params.id as string) });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /production:
 *   post:
 *     tags: [Producción]
 *     summary: Crear orden de producción (R4)
 *     description: Descuenta la materia prima de bodega y registra el movimiento
 *       de inventario correspondiente.
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rawMaterialPresentationId, inputQuantity]
 *             properties:
 *               rawMaterialPresentationId: { type: string, format: uuid }
 *               inputQuantity: { type: integer, example: 200, description: Kilos de materia prima }
 *               outputPresentationId: { type: string, format: uuid, nullable: true }
 *               notes: { type: string }
 *     responses:
 *       201: { description: Orden creada (OP-000001) con stock descontado. }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       422: { description: Stock insuficiente de materia prima. }
 */
router.post(
  "/",
  requireRole(Role.ADMIN, Role.BODEGA),
  validate({ body: createOrderSchema }),
  async (req, res, next) => {
    try {
      const order = await productionService.create(req.body, req.user!.id);
      res.status(201).json({ data: order });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /production/{id}/stages:
 *   post:
 *     tags: [Producción]
 *     summary: Registrar etapa con rendimiento y merma (R4)
 *     description: La entrada de la etapa debe coincidir con la salida de la
 *       anterior; `waste` se calcula automáticamente (entrada − salida).
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, inputQuantity, outputQuantity]
 *             properties:
 *               type: { type: string, enum: [TRILLA, TUESTE, LAVADO, SECADO, EMPAQUE, OTRO] }
 *               inputQuantity: { type: integer, example: 200 }
 *               outputQuantity: { type: integer, example: 160, description: La diferencia es la merma }
 *               notes: { type: string }
 *     responses:
 *       201: { description: Etapa registrada con su merma calculada. }
 *       400: { description: La orden no está en proceso. }
 *       422: { description: El rendimiento no encadena con la etapa anterior. }
 */
router.post(
  "/:id/stages",
  requireRole(Role.ADMIN, Role.BODEGA),
  validate({ params: idParam, body: addStageSchema }),
  async (req, res, next) => {
    try {
      const stage = await productionService.addStage(req.params.id as string, req.body);
      res.status(201).json({ data: stage });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /production/{id}/finish:
 *   post:
 *     tags: [Producción]
 *     summary: Finalizar orden y entrar producto terminado a bodega (R4)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [outputQuantity]
 *             properties:
 *               outputPresentationId: { type: string, format: uuid, description: Requerida si la orden no la trae }
 *               outputQuantity: { type: integer, example: 150, description: Unidades que entran a inventario }
 *     responses:
 *       200: { description: Orden finalizada con entrada de inventario registrada. }
 *       400: { description: La orden ya no está en proceso. }
 *       422: { description: No se puede empacar más de lo que salió en la última etapa. }
 */
router.post(
  "/:id/finish",
  requireRole(Role.ADMIN, Role.BODEGA),
  validate({ params: idParam, body: finishOrderSchema }),
  async (req, res, next) => {
    try {
      res.json({ data: await productionService.finish(req.params.id as string, req.body, req.user!.id) });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /production/{id}/cancel:
 *   post:
 *     tags: [Producción]
 *     summary: Cancelar orden y devolver materia prima a bodega
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Orden cancelada con la materia prima devuelta. }
 *       400: { description: La orden ya no está en proceso. }
 */
router.post(
  "/:id/cancel",
  requireRole(Role.ADMIN, Role.BODEGA),
  validate({ params: idParam }),
  async (req, res, next) => {
    try {
      res.json({ data: await productionService.cancel(req.params.id as string, req.user!.id) });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
