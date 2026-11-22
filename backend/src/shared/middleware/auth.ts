import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { Role } from "@prisma/client";

import { ApiError } from "../errors/api-error.js";
import { verifyAccessToken } from "../utils/jwt.js";
import prisma from "../database/prisma.js";
import { DEFAULT_ROLE_PERMISSIONS } from "../auth/permissions.js";

/** Usuario autenticado que queda en `req.user` después del middleware. */
export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  roleId?: string | null;
  roleName?: string;
  permissions: string[];
}

/**
 * Valida la cookie `access_token` y deja el usuario en `req.user`.
 * No redirige: devuelve 401 en JSON (es una API).
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.access_token as string | undefined;

  if (!token) {
    return next(ApiError.unauthorized("No hay sesión activa."));
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { roleDefinition: true },
    });
    if (!user || !user.isActive) return next(ApiError.unauthorized("La sesión no es válida."));
    req.user = {
      id: payload.sub,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      roleId: user.roleId,
      roleName: user.roleDefinition?.name ?? user.role,
      permissions: user.roleDefinition?.permissions ?? DEFAULT_ROLE_PERMISSIONS[user.role] ?? [],
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

    const allowed = roles.flatMap((role) => DEFAULT_ROLE_PERMISSIONS[role] ?? []);
    if (user.permissions.includes("*") || allowed.some((permission) => user.permissions.includes(permission))) {
      return next();
    }

    next(
      ApiError.forbidden(
        `Tu rol (${user.role.toLowerCase()}) no tiene permisos para esta acción.`
      )
    );
  };
}
