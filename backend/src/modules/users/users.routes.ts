import { Router } from "express";
import { z } from "zod";

import { Role } from "@prisma/client";

import { authenticate, requireRole } from "../../shared/middleware/auth.js";
import { validate } from "../../shared/middleware/validate.js";
import * as usersService from "./users.service.js";
import {
  assertPasswordPolicy,
  createUserSchema,
  listUsersQuery,
  updateUserSchema,
} from "./users.schemas.js";

const router = Router();

// Todas las rutas de usuarios requieren sesión + rol ADMIN
router.use(authenticate, requireRole(Role.ADMIN));

const idParam = z.object({ id: z.string().uuid() });

const resetPasswordSchema = z.object({
  newPassword: z.string().min(1).max(200),
});

/**
 * @openapi
 * /users:
 *   get:
 *     tags: [Usuarios]
 *     summary: Listar usuarios (solo admin)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: query, name: q, schema: { type: string }, description: Buscar por nombre o correo }
 *       - { in: query, name: role, schema: { $ref: "#/components/schemas/Rol" } }
 *       - { in: query, name: includeInactive, schema: { type: string, enum: [true, false] } }
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 20 } }
 *     responses:
 *       "200": { description: Lista paginada de usuarios }
 *       "401": { $ref: "#/components/responses/Unauthorized" }
 *       "403": { $ref: "#/components/responses/Forbidden" }
 */
router.get("/", validate({ query: listUsersQuery }), async (req, res, next) => {
  try {
    const query = req.query as unknown as z.infer<typeof listUsersQuery>;
    const { users, total } = await usersService.list(
      {
        page: Number(query.page),
        limit: Number(query.limit),
      },
      {
        q: query.q,
        role: query.role as Role | undefined,
        includeInactive: query.includeInactive === "true",
      }
    );

    res.json({
      data: users,
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
 * /users:
 *   post:
 *     tags: [Usuarios]
 *     summary: Crear usuario (solo admin)
 *     description: La contraseña debe cumplir la política (10+ caracteres, mayúscula, minúscula y número).
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, fullName, password, role]
 *             properties:
 *               email: { type: string, format: email }
 *               fullName: { type: string }
 *               password: { type: string }
 *               role: { $ref: "#/components/schemas/Rol" }
 *     responses:
 *       "201": { description: Usuario creado }
 *       "400": { description: Datos inválidos o contraseña débil }
 *       "409": { description: Correo ya registrado }
 */
router.post(
  "/",
  validate({ body: createUserSchema }),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof createUserSchema>;
      assertPasswordPolicy(body.password);
      const user = await usersService.create(body);
      res.status(201).json({ data: user });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /users/{id}:
 *   patch:
 *     tags: [Usuarios]
 *     summary: Actualizar usuario (solo admin)
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
 *               fullName: { type: string }
 *               role: { $ref: "#/components/schemas/Rol" }
 *               isActive: { type: boolean }
 *     responses:
 *       "200": { description: Usuario actualizado }
 *       "400": { description: Protección de cuenta propia }
 *       "404": { description: Usuario no encontrado }
 */
router.patch(
  "/:id",
  validate({ params: idParam, body: updateUserSchema }),
  async (req, res, next) => {
    try {
      const user = await usersService.update(
        (req.params.id as string),
        req.body as z.infer<typeof updateUserSchema>,
        req.user!
      );
      res.json({ data: user });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /users/{id}/reset-password:
 *   post:
 *     tags: [Usuarios]
 *     summary: Restablecer contraseña (solo admin)
 *     description: Cambia la contraseña y cierra todas las sesiones abiertas del usuario.
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newPassword]
 *             properties:
 *               newPassword: { type: string }
 *     responses:
 *       "200": { description: Contraseña restablecida }
 *       "404": { description: Usuario no encontrado }
 */
router.post(
  "/:id/reset-password",
  validate({ params: idParam, body: resetPasswordSchema }),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof resetPasswordSchema>;
      assertPasswordPolicy(body.newPassword);
      await usersService.resetPassword((req.params.id as string), body.newPassword);
      res.json({ data: { ok: true } });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
