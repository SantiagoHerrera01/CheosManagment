import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "../../config/env.js";

/**
 * Firmas opacas para enlaces compartibles (PDF de factura, reset de
 * contraseña, etc.).
 *
 * - Es HMAC-SHA256 con el secreto del servidor: quien no conoce el
 *   secreto no puede fabricar un link válido ni "recorrer" facturas.
 * - El prefijo `share:` separa dominios: el mismo secreto firma tokens
 *   con propósitos distintos sin que unos afecten a los otros.
 * - Es estable: mientras el secreto no cambie, el link sigue vivo (los
 *   clientes guardan la factura en el chat y deben poder abrirla luego).
 */
function hmac(value: string): string {
  return createHmac("sha256", env.JWT_ACCESS_SECRET)
    .update(`share:${value}`)
    .digest("hex");
}

/** Firma opaca de 64 caracteres hexadecimales para un valor dado. */
export function signToken(value: string): string {
  return hmac(value);
}

/** Verifica una firma en tiempo constante (sin comparar strings literal). */
export function verifyToken(value: string, token: string): boolean {
  if (!/^[a-f0-9]{64}$/.test(token)) return false;

  const expected = Buffer.from(hmac(value), "hex");
  const actual = Buffer.from(token, "hex");

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
