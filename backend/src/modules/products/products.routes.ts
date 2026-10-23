import { Router } from "express";
import { z } from "zod";

import { Role } from "@prisma/client";

import { authenticate, requireRole } from "../../shared/middleware/auth.js";
import { validate } from "../../shared/middleware/validate.js";
import * as productsService from "./products.service.js";
import {
  createPresentationSchema,
  createProductSchema,
  listProductsQuery,
  stockEntrySchema,
  updatePresentationSchema,
  updateProductSchema,
} from "./products.schemas.js";

const router = Router();

router.use(authenticate);

const idParam = z.object({ id: z.string().uuid() });
const presentationParam = z.object({
  id: z.string().uuid(),
  presentationId: z.string().uuid(),
});

/**
 * @openapi
 * /products:
 *   get:
 *     tags: [Productos]
 *     summary: Listar productos con presentaciones y precios
 *     description: >
 *       El campo `cost` (costo interno) solo aparece para roles ADMIN y
 *       CONTADOR; vendedor y bodega nunca lo reciben.
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: query, name: q, schema: { type: string }, description: Buscar por nombre, variedad o presentación }
 *       - { in: query, name: lowStock, schema: { type: string, enum: [true, false] }, description: Solo productos con stock bajo o igual al mínimo }
 *       - { in: query, name: active, schema: { type: string, enum: [true, false], default: true } }
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 20 } }
 *     responses:
 *       "200": { description: Lista paginada de productos }
 *       "401": { $ref: "#/components/responses/Unauthorized" }
 */
router.get("/", validate({ query: listProductsQuery }), async (req, res, next) => {
  try {
    const query = req.query as unknown as z.infer<typeof listProductsQuery>;
    const { data, total } = await productsService.list(
      { page: Number(query.page), limit: Number(query.limit) },
      query,
      req.user!.role
    );
    res.json({
      data,
      meta: {
        total,
        page: Number(query.page),
        limit: Number(query.limit),
        totalPages: Math.max(1, Math.ceil(total / Number(query.limit))),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /products/{id}:
 *   get:
 *     tags: [Productos]
 *     summary: Detalle de un producto
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       "200": { description: Producto encontrado }
 *       "404": { $ref: "#/components/responses/NotFound" }
 */
router.get("/:id", validate({ params: idParam }), async (req, res, next) => {
  try {
    const product = await productsService.getById((req.params.id as string), req.user!.role);
    res.json({ data: product });
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /products:
 *   post:
 *     tags: [Productos]
 *     summary: Crear producto con sus presentaciones (solo admin)
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, presentations]
 *             properties:
 *               name: { type: string, example: Café Castillo }
 *               variety: { type: string, example: Castillo }
 *               process: { type: string, example: Lavado }
 *               presentations:
 *                 type: array
 *                 items: { $ref: "#/components/schemas/PresentacionInput" }
 *     responses:
 *       "201": { description: Producto creado }
 *       "403": { $ref: "#/components/responses/Forbidden" }
 */
router.post(
  "/",
  requireRole(Role.ADMIN),
  validate({ body: createProductSchema }),
  async (req, res, next) => {
    try {
      const product = await productsService.create(
        req.body as z.infer<typeof createProductSchema>
      );
      res.status(201).json({ data: product });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /products/{id}:
 *   patch:
 *     tags: [Productos]
 *     summary: Actualizar producto (solo admin)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               variety: { type: string }
 *               process: { type: string }
 *               isActive: { type: boolean }
 *     responses:
 *       "200": { description: Producto actualizado }
 *       "404": { $ref: "#/components/responses/NotFound" }
 */
router.patch(
  "/:id",
  requireRole(Role.ADMIN),
  validate({ params: idParam, body: updateProductSchema }),
  async (req, res, next) => {
    try {
      const product = await productsService.update(
        (req.params.id as string),
        req.body as z.infer<typeof updateProductSchema>
      );
      res.json({ data: product });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /products/{id}/presentations:
 *   post:
 *     tags: [Productos]
 *     summary: Agregar presentación a un producto (solo admin)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: "#/components/schemas/PresentacionInput" }
 *     responses:
 *       "201": { description: Presentación creada }
 *       "409": { description: Ya existe esa presentación con esa molienda }
 */
router.post(
  "/:id/presentations",
  requireRole(Role.ADMIN),
  validate({ params: idParam, body: createPresentationSchema }),
  async (req, res, next) => {
    try {
      const presentation = await productsService.addPresentation(
        (req.params.id as string),
        req.body as z.infer<typeof createPresentationSchema>
      );
      res.status(201).json({ data: presentation });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /products/{id}/presentations/{presentationId}:
 *   patch:
 *     tags: [Productos]
 *     summary: "Actualizar presentación (precio, costo, mínimo) — solo admin"
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *       - { in: path, name: presentationId, required: true, schema: { type: string, format: uuid } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               price: { type: number, example: 12900 }
 *               cost: { type: number, example: 8000 }
 *               minimumStock: { type: integer, example: 20 }
 *               isActive: { type: boolean }
 *     responses:
 *       "200": { description: Presentación actualizada }
 *       "404": { description: Presentación no encontrada }
 */
router.patch(
  "/:id/presentations/:presentationId",
  requireRole(Role.ADMIN),
  validate({ params: presentationParam, body: updatePresentationSchema }),
  async (req, res, next) => {
    try {
      const presentation = await productsService.updatePresentation(
        (req.params.id as string),
        (req.params.presentationId as string),
        req.body as z.infer<typeof updatePresentationSchema>
      );
      res.json({ data: presentation });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /products/{id}/presentations/{presentationId}/stock:
 *   post:
 *     tags: [Productos]
 *     summary: Registrar entrada de stock (producción, compra, devolución, ajuste)
 *     description: Aumenta el saldo y deja el movimiento registrado para trazabilidad. Solo BODEGA y ADMIN.
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *       - { in: path, name: presentationId, required: true, schema: { type: string, format: uuid } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quantity]
 *             properties:
 *               quantity: { type: integer, example: 100 }
 *               reason: { type: string, enum: [PRODUCCION, COMPRA, DEVOLUCION, AJUSTE] }
 *               cost: { type: number, description: Actualiza el costo interno si se envía }
 *               notes: { type: string }
 *     responses:
 *       "200": { description: Stock actualizado }
 *       "403": { $ref: "#/components/responses/Forbidden" }
 *       "404": { description: Presentación no encontrada }
 */
router.post(
  "/:id/presentations/:presentationId/stock",
  requireRole(Role.ADMIN, Role.BODEGA),
  validate({ params: presentationParam, body: stockEntrySchema }),
  async (req, res, next) => {
    try {
      const presentation = await productsService.registerStockEntry(
        (req.params.id as string),
        (req.params.presentationId as string),
        req.body as z.infer<typeof stockEntrySchema>,
        req.user!.id
      );
      res.json({ data: presentation });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
