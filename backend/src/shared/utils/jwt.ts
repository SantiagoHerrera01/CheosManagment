import jwt from "jsonwebtoken";
import type { Role } from "@prisma/client";

import { env } from "../../config/env.js";

const ISSUER = "cheo-manager";
const AUDIENCE = "cheo-manager-api";

export interface AccessTokenPayload {
  sub: string;
  email: string;
  fullName: string;
  role: Role;
}

/** Firma un access token de corta vida (15 min por defecto). */
export function signAccessToken(user: AccessTokenPayload): string {
  return jwt.sign(
    {
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    },
    env.JWT_ACCESS_SECRET,
    {
      subject: user.sub,
      expiresIn: env.ACCESS_TOKEN_TTL,
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithm: "HS256",
    }
  );
}

/** Verifica firma, expiración, issuer y audience. Lanza si no es válido. */
export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: ["HS256"],
    issuer: ISSUER,
    audience: AUDIENCE,
  }) as jwt.JwtPayload;

  return {
    sub: String(decoded.sub),
    email: String(decoded.email),
    fullName: String(decoded.fullName),
    role: decoded.role as Role,
  };
}
