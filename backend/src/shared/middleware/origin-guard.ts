import type { NextFunction, Request, Response } from "express";

import { env } from "../../config/env.js";
import { ApiError } from "../errors/api-error.js";

/**
 * Segunda barrera contra CSRF (la primera es `SameSite=Strict` en las cookies):
 * toda petición que modifica datos debe venir de un origen permitido.
 *
 * Las peticiones sin `Origin` (curl, Postman, tests) se dejan pasar; en ese
 * caso la protección real la aportan las cookies `SameSite`.
 */
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function originGuard(req: Request, _res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.headers.origin;
  if (!origin) return next();

  if (env.CORS_ORIGINS.includes(origin)) return next();

  next(ApiError.forbidden(`El origen "${origin}" no está autorizado para esta operación.`));
}
