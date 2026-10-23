import type { AuthUser } from "../shared/middleware/auth.js";

/**
 * Augmenta los tipos de Express para que `req.user` exista en toda la app
 * después del middleware `authenticate`.
 */
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
