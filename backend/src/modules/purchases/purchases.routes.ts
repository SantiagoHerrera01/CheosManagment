import { Router } from "express";
import { z } from "zod";

import { Role } from "@prisma/client";

import { authenticate, requireRole } from "../../shared/middleware/auth.js";
import { validate } from "../../shared/middleware/validate.js";
import { paged } from "../../shared/utils/pagination.js";
import * as purchasesService from "./purchases.service.js";
import { createPurchaseSchema, listPurchasesQuery } from "./purchases.schemas.js";

const router = Router();

router.use(authenticate);

const idParam = z.object({ id: z.string().uuid() });

/**
 * @openapi
 * /purchases:
 *   get:
 *     tags: [Compras]
 *     summary: Listar compras a proveedor
 *     description: Cada compra registró la entrada correspondiente a bodega (R3)
 *       y actualizó el costo interno de las presentaciones compradas.
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 20 } }
 *       - { in: query, name: from, schema: { type: string, format: date } }
 *       - { in: query, name: to, schema: { type: string, format: date } }
 *       - { in: query, name: q, schema: { type: string }, description: Buscar por nº o proveedor }
 *     responses:
 *       200: { description: Compras paginadas con sus ítems. }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.get(
  "/",
  requireRole(Role.ADMIN, Role.BODEGA, Role.CONTADOR),
  validate({ query: listPurchasesQuery }),
  async (req, res, next) => {
    try {
      const query = req.query as unknown as z.infer<typeof listPurchasesQuery>;
      const { page, limit } = { page: Number(query.page), limit: Number(query.limit) };
      const { data, total } = await purchasesService.list({ page, limit }, query);
      res.json(paged(data, total, { page, limit }));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /purchases/{id}:
 *   get:
 *     tags: [Compras]
 *     summary: Detalle de una compra
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Compra con ítems. }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get(
  "/:id",
  requireRole(Role.ADMIN, Role.BODEGA, Role.CONTADOR),
  validate({ params: idParam }),
  async (req, res, next) => {
    try {
      res.json({ data: await purchasesService.getById(req.params.id as string) });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /purchases:
 *   post:
 *     tags: [Compras]
 *     summary: Registrar compra a proveedor (entrada a bodega)
 *     description: |
 *       Crea el documento `C-000001` con sus ítems, incrementa el stock de cada
 *       presentación, registra el movimiento de inventario `COMPRA` y actualiza
 *       el costo interno (usado por la utilidad de R7).
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [provider, items]
 *             properties:
 *               provider: { type: string, example: Eliseo Carvajal }
 *               date: { type: string, format: date, description: Hoy por defecto }
 *               notes: { type: string }
 *               items:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required: [presentationId, quantity, unitCost]
 *                   properties:
 *                     presentationId: { type: string, format: uuid }
 *                     quantity: { type: integer, example: 50 }
 *                     unitCost: { type: number, example: 18000 }
 *     responses:
 *       201: { description: Compra creada con stock ingresado. }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.post(
  "/",
  requireRole(Role.ADMIN, Role.BODEGA, Role.CONTADOR),
  validate({ body: createPurchaseSchema }),
  async (req, res, next) => {
    try {
      const purchase = await purchasesService.create(req.body, req.user!.id);
      res.status(201).json({ data: purchase });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
