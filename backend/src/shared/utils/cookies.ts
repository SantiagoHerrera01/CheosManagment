import type { Response } from "express";

import { env } from "../../config/env.js";

export const ACCESS_COOKIE = "access_token";
export const REFRESH_COOKIE = "refresh_token";

/**
 * El refresh token solo viaja a los endpoints de autenticación:
 * reduce la superficie de exposición si otra ruta tiene una fuga.
 */
const REFRESH_PATH = "/api/auth";

const base = {
  httpOnly: true, // inaccesible desde JavaScript (mitiga XSS)
  secure: env.isProduction, // solo HTTPS en producción
  sameSite: "strict" as const, // mitiga CSRF
};

export function setAccessCookie(res: Response, token: string): void {
  res.cookie(ACCESS_COOKIE, token, {
    ...base,
    path: "/",
    maxAge: env.ACCESS_TOKEN_TTL * 1000,
  });
}

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    ...base,
    path: REFRESH_PATH,
    maxAge: env.REFRESH_TOKEN_TTL * 1000,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { path: "/" });
  res.clearCookie(REFRESH_COOKIE, { path: REFRESH_PATH });
}
