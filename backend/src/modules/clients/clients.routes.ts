import { Router } from "express";
import { z } from "zod";

import { Role } from "@prisma/client";

import { authenticate, requireRole } from "../../shared/middleware/auth.js";
import { validate } from "../../shared/middleware/validate.js";
import * as clientsService from "./clients.service.js";
import {
  createClientSchema,
  listClientsQuery,
  updateClientSchema,
} from "./clients.schemas.js";

const router = Router();

router.use(authenticate);

const idParam = z.object({ id: z.string().uuid() });

/**
 * @openapi
 * /clients:
 *   get:
 *     tags: [Clientes]
 *     summary: Listar clientes
 *     description: Incluye el saldo de cartera (`balance`) por cliente.
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: query, name: q, schema: { type: string }, description: Buscar por nombre, cédula o teléfono }
 *       - { in: query, name: active, schema: { type: string, enum: [true, false], default: true } }
 *       - { in: query, name: sort, schema: { type: string, enum: [name, balance, recent] } }
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 20 } }
 *     responses:
 *       "200": { description: Lista paginada de clientes }
 *       "401": { $ref: "#/components/responses/Unauthorized" }
 */
router.get("/", validate({ query: listClientsQuery }), async (req, res, next) => {
  try {
    const query = req.query as unknown as z.infer<typeof listClientsQuery>;
    const { data, total } = await clientsService.list(
      { page: Number(query.page), limit: Number(query.limit) },
      query
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
 * /clients/{id}:
 *   get:
 *     tags: [Clientes]
 *     summary: Detalle de un cliente
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       "200": { description: Cliente encontrado }
 *       "404": { $ref: "#/components/responses/NotFound" }
 */
router.get("/:id", validate({ params: idParam }), async (req, res, next) => {
  try {
    const client = await clientsService.getById((req.params.id as string));
    res.json({ data: client });
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /clients:
 *   post:
 *     tags: [Clientes]
 *     summary: Crear cliente
 *     description: El número de documento debe ser único (cédula o NIT).
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: "#/components/schemas/ClienteInput" }
 *     responses:
 *       "201": { description: Cliente creado }
 *       "400": { description: Datos inválidos }
 *       "403": { $ref: "#/components/responses/Forbidden" }
 *       "409": { description: Documento ya registrado }
 */
router.post(
  "/",
  requireRole(Role.ADMIN, Role.VENDEDOR),
  validate({ body: createClientSchema }),
  async (req, res, next) => {
    try {
      const client = await clientsService.create(
        req.body as z.infer<typeof createClientSchema>
      );
      res.status(201).json({ data: client });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /clients/{id}:
 *   patch:
 *     tags: [Clientes]
 *     summary: Actualizar cliente
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: "#/components/schemas/ClienteInput" }
 *     responses:
 *       "200": { description: Cliente actualizado }
 *       "404": { $ref: "#/components/responses/NotFound" }
 */
router.patch(
  "/:id",
  requireRole(Role.ADMIN, Role.VENDEDOR),
  validate({ params: idParam, body: updateClientSchema }),
  async (req, res, next) => {
    try {
      const client = await clientsService.update(
        (req.params.id as string),
        req.body as z.infer<typeof updateClientSchema>
      );
      res.json({ data: client });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /clients/{id}/active:
 *   patch:
 *     tags: [Clientes]
 *     summary: Activar/desactivar cliente (baja lógica)
 *     description: Los clientes nunca se borran porque tienen facturas asociadas.
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [isActive]
 *             properties:
 *               isActive: { type: boolean }
 *     responses:
 *       "200": { description: Cliente actualizado }
 *       "404": { $ref: "#/components/responses/NotFound" }
 */
router.patch(
  "/:id/active",
  requireRole(Role.ADMIN, Role.VENDEDOR),
  validate({
    params: idParam,
    body: z.object({ isActive: z.boolean() }),
  }),
  async (req, res, next) => {
    try {
      const { isActive } = req.body as { isActive: boolean };
      const client = await clientsService.setActive((req.params.id as string), isActive);
      res.json({ data: client });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
