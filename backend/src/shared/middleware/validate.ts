import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ZodType } from "zod";

/**
 * Valida `body`, `params` y `query` con Zod antes de llegar al handler.
 * Si algo no cuadra, responde 400 con `details: [{ path, message }]`.
 *
 *   router.post("/", validate({ body: createClientSchema }), handler)
 */
export function validate(schemas: {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.params) req.params = schemas.params.parse(req.params) as typeof req.params;
      if (schemas.query) {
        const parsed = schemas.query.parse(req.query);
        // En Express 5 `req.query` es un getter perezoso sin setter:
        // se define una propiedad propia que lo sombrea.
        Object.defineProperty(req, "query", {
          value: parsed,
          writable: true,
          enumerable: true,
          configurable: true,
        });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
