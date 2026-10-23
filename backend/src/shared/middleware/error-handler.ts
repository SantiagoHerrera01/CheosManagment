import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import { env } from "../../config/env.js";
import { ApiError } from "../errors/api-error.js";

/** 404 para rutas que no existen. */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
    },
  });
}

/**
 * Manejador global de errores: siempre responde con
 * `{ error: { code, message, details? } }` y nunca filtra stack traces
 * en producción.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Errores de validación (Zod)
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Los datos enviados no son válidos.",
        details: err.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
    });
  }

  // Errores propios de la API
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  // JWT inválidos o expirados
  const jwtError = err as { name?: string };
  if (jwtError?.name === "TokenExpiredError") {
    return res.status(401).json({
      error: { code: "TOKEN_EXPIRED", message: "La sesión expiró." },
    });
  }
  if (jwtError?.name === "JsonWebTokenError") {
    return res.status(401).json({
      error: { code: "TOKEN_INVALID", message: "Credenciales inválidas." },
    });
  }

  // Errores conocidos de Prisma
  const prismaError = err as { code?: string; meta?: unknown; message?: string };
  if (typeof prismaError?.code === "string" && prismaError.code.startsWith("P")) {
    if (prismaError.code === "P2002") {
      return res.status(409).json({
        error: {
          code: "DUPLICATE",
          message: "Ya existe un registro con esos datos únicos.",
          details: prismaError.meta,
        },
      });
    }
    if (prismaError.code === "P2025") {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "El recurso solicitado no existe." },
      });
    }
    return res.status(400).json({
      error: {
        code: "DATABASE_ERROR",
        message: env.isProduction
          ? "No fue posible procesar la operación."
          : (prismaError.message ?? "Error de base de datos."),
      },
    });
  }

  // JSON malformado en el body
  const bodyError = err as { type?: string };
  if (bodyError?.type === "entity.parse.failed") {
    return res.status(400).json({
      error: { code: "INVALID_JSON", message: "El cuerpo JSON no es válido." },
    });
  }

  // Inesperado → log completo, respuesta genérica
  console.error(`[error] ${req.method} ${req.originalUrl}`, err);

  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: env.isProduction
        ? "Error interno del servidor."
        : (err instanceof Error ? err.message : "Error interno del servidor."),
    },
  });
}
