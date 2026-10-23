import { Router } from "express";

import prisma from "../../shared/database/prisma.js";
import { authenticate } from "../../shared/middleware/auth.js";
import { loginLimiter } from "../../shared/middleware/rate-limit.js";
import { validate } from "../../shared/middleware/validate.js";
import {
  clearAuthCookies,
  REFRESH_COOKIE,
  setAccessCookie,
  setRefreshCookie,
} from "../../shared/utils/cookies.js";
import type { TokenContext } from "./auth.service.js";
import * as authService from "./auth.service.js";
import { changePasswordSchema, loginSchema } from "./auth.schemas.js";

const router = Router();

function context(req: Parameters<typeof authenticate>[0]): TokenContext {
  return {
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  };
}

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Autenticación]
 *     summary: Iniciar sesión
 *     description: >
 *       Valida credenciales y devuelve las cookies de sesión
 *       (`access_token` 15 min y `refresh_token` 7 días), ambas `HttpOnly`
 *       y `SameSite=Strict`. Tras 5 intentos fallidos la cuenta se bloquea
 *       15 minutos.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: admin@cheo.com }
 *               password: { type: string, example: CheoAdmin2026! }
 *     responses:
 *       "200":
 *         description: Sesión iniciada (cookies Set-Cookie)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data: { $ref: "#/components/schemas/Usuario" }
 *       "401": { $ref: "#/components/responses/Unauthorized" }
 *       "429": { $ref: "#/components/responses/RateLimited" }
 */
router.post(
  "/login",
  loginLimiter,
  validate({ body: loginSchema }),
  async (req, res, next) => {
    try {
      const { email, password } = req.body as { email: string; password: string };
      const session = await authService.login(email, password, context(req));

      setAccessCookie(res, session.accessToken);
      setRefreshCookie(res, session.refreshToken);

      res.json({ data: session.user });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Autenticación]
 *     summary: Renovar la sesión
 *     description: >
 *       Rota el refresh token (el anterior queda revocado) y emite un nuevo
 *       access token. Si se detecta la reutilización de un token ya rotado,
 *       se cierra toda la sesión del usuario por seguridad.
 *     responses:
 *       "200": { description: Sesión renovada (nuevas cookies) }
 *       "401": { description: Sesión inválida o expirada }
 */
router.post("/refresh", async (req, res, next) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!token) {
      res.status(401).json({
        error: { code: "UNAUTHORIZED", message: "No hay sesión activa." },
      });
      return;
    }

    const session = await authService.refreshSession(token, context(req));
    setAccessCookie(res, session.accessToken);
    setRefreshCookie(res, session.refreshToken);

    res.json({ data: session.user });
  } catch (error) {
    clearAuthCookies(res);
    next(error);
  }
});

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Autenticación]
 *     summary: Cerrar sesión
 *     description: Revoca el refresh token y borra las cookies. Siempre responde 200.
 *     responses:
 *       "200": { description: Sesión cerrada }
 */
router.post("/logout", async (req, res, next) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    await authService.logout(token);
    clearAuthCookies(res);
    res.json({ data: { ok: true } });
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Autenticación]
 *     summary: Usuario autenticado actual
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       "200": { description: Datos del usuario }
 *       "401": { $ref: "#/components/responses/Unauthorized" }
 */
router.get("/me", authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.user!.id },
    });
    res.json({ data: authService.toPublicUser(user) });
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /auth/change-password:
 *   post:
 *     tags: [Autenticación]
 *     summary: Cambiar la contraseña del usuario autenticado
 *     description: Valida la contraseña actual, aplica la política de fortaleza y cierra todas las sesiones abiertas.
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string }
 *     responses:
 *       "200": { description: Contraseña actualizada }
 *       "400": { description: Contraseña actual incorrecta o nueva débil }
 *       "401": { $ref: "#/components/responses/Unauthorized" }
 */
router.post(
  "/change-password",
  authenticate,
  validate({ body: changePasswordSchema }),
  async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body as {
        currentPassword: string;
        newPassword: string;
      };
      await authService.changePassword(req.user!.id, currentPassword, newPassword);
      clearAuthCookies(res);
      res.json({ data: { ok: true, message: "Contraseña actualizada. Vuelve a iniciar sesión." } });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
