import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ApiError } from "../errors/api-error.js";

export function requirePermission(...permissions: string[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return next(ApiError.unauthorized());
    if (user.permissions.includes("*") || permissions.some((p) => user.permissions.includes(p))) {
      return next();
    }
    next(ApiError.forbidden("No tienes permisos para esta acción."));
  };
}
