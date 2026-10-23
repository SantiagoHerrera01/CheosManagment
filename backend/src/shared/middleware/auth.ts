import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { Role } from "@prisma/client";

import { ApiError } from "../errors/api-error.js";
import { verifyAccessToken } from "../utils/jwt.js";

/** Usuario autenticado que queda en `req.user` después del middleware. */
export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

/**
 * Valida la cookie `access_token` y deja el usuario en `req.user`.
 * No redirige: devuelve 401 en JSON (es una API).
 */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.access_token as string | undefined;

  if (!token) {
    return next(ApiError.unauthorized("No hay sesión activa."));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      fullName: payload.fullName,
      role: payload.role,
    };
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Exige uno de los roles listados. **ADMIN siempre tiene acceso**
 * (es el rol con todos los permisos).
 *
 *   router.post("/", authenticate, requireRole(Role.VENDEDOR), handler)
 */
export function requireRole(...roles: Role[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return next(ApiError.unauthorized());

    if (user.role === "ADMIN" || roles.includes(user.role)) {
      return next();
    }

    next(
      ApiError.forbidden(
        `Tu rol (${user.role.toLowerCase()}) no tiene permisos para esta acción.`
      )
    );
  };
}
