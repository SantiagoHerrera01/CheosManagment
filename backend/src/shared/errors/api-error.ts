/**
 * Error de aplicación con código HTTP y código estable de negocio.
 * Cualquier `next(new ApiError(...))` llega al manejador global
 * y se responde siempre con el mismo formato:
 *
 *   { "error": { "code": "UNAUTHORIZED", "message": "...", "details": [...] } }
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, "BAD_REQUEST", message, details);
  }

  static unauthorized(message = "Debes iniciar sesión para continuar.") {
    return new ApiError(401, "UNAUTHORIZED", message);
  }

  static tokenExpired(message = "La sesión expiró; vuelve a iniciar sesión.") {
    return new ApiError(401, "TOKEN_EXPIRED", message);
  }

  static forbidden(message = "Tu rol no tiene permisos para esta acción.") {
    return new ApiError(403, "FORBIDDEN", message);
  }

  static notFound(message = "Recurso no encontrado.") {
    return new ApiError(404, "NOT_FOUND", message);
  }

  static conflict(message: string, details?: unknown) {
    return new ApiError(409, "CONFLICT", message, details);
  }

  static unprocessable(message: string, details?: unknown) {
    return new ApiError(422, "UNPROCESSABLE", message, details);
  }

  static tooManyRequests(message = "Demasiados intentos. Intenta más tarde.") {
    return new ApiError(429, "RATE_LIMITED", message);
  }

  static internal(message = "Error interno del servidor.") {
    return new ApiError(500, "INTERNAL_ERROR", message);
  }
}
