import { createHash, randomBytes } from "node:crypto";
import type { User } from "@prisma/client";

import { env } from "../../config/env.js";
import prisma from "../../shared/database/prisma.js";
import { ApiError } from "../../shared/errors/api-error.js";
import { signAccessToken } from "../../shared/utils/jwt.js";
import { hashPassword, verifyPassword } from "../../shared/utils/password.js";

/** Refresh token opaco de 48 bytes; solo se guarda su hash SHA-256. */
export function generateRefreshToken(): string {
  return randomBytes(48).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Usuario sin campos sensibles (nunca sale `passwordHash` ni bloqueos). */
export function toPublicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

/**
 * Hash ficticio para igualar el tiempo de respuesta cuando el correo no
 * existe: evita descubrir qué correos están registrados midiendo tiempos.
 */
let dummyHashPromise: Promise<string> | undefined;
function getDummyHash(): Promise<string> {
  dummyHashPromise ??= hashPassword(randomBytes(16).toString("hex"));
  return dummyHashPromise;
}

export interface TokenContext {
  ip?: string;
  userAgent?: string;
}

export interface IssuedSession {
  user: ReturnType<typeof toPublicUser>;
  accessToken: string;
  refreshToken: string;
}

function invalidCredentials(): ApiError {
  // Mismo mensaje exista o no el correo: no se filtra información.
  return ApiError.unauthorized("Correo o contraseña incorrectos.");
}

function pruneExpiredTokens(userId: string): Promise<number> {
  return prisma.refreshToken.deleteMany({
    where: { userId, expiresAt: { lt: new Date() } },
  }).then((r) => r.count);
}

async function issueSession(user: User, ctx: TokenContext): Promise<IssuedSession> {
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
  });

  const refreshToken = generateRefreshToken();
  await prisma.refreshToken.create({
    data: {
      tokenHash: hashRefreshToken(refreshToken),
      userId: user.id,
      expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL * 1000),
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    },
  });

  return { user: toPublicUser(user), accessToken, refreshToken };
}

// ============================================================
//  LOGIN
// ============================================================

export async function login(
  email: string,
  password: string,
  ctx: TokenContext
): Promise<IssuedSession> {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (!user) {
    await verifyPassword(await getDummyHash(), password);
    throw invalidCredentials();
  }

  if (!user.isActive) {
    throw ApiError.unauthorized("La cuenta está deshabilitada. Contacta al administrador.");
  }

  const now = new Date();
  if (user.lockedUntil && user.lockedUntil > now) {
    const minutes = Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 60_000);
    throw ApiError.tooManyRequests(
      `Cuenta bloqueada por intentos fallidos. Intenta nuevamente en ${minutes} minuto(s).`
    );
  }

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) {
    const failedLogins = user.failedLogins + 1;
    const shouldLock = failedLogins >= env.MAX_LOGIN_ATTEMPTS;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLogins: shouldLock ? 0 : failedLogins,
        lockedUntil: shouldLock
          ? new Date(Date.now() + env.LOGIN_LOCK_MINUTES * 60_000)
          : null,
      },
    });

    throw invalidCredentials();
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { failedLogins: 0, lockedUntil: null, lastLoginAt: now },
  });

  // Higiene: elimina tokens vencidos del usuario
  void pruneExpiredTokens(user.id);

  return issueSession(updated, ctx);
}

// ============================================================
//  REFRESH (rotación con detección de reutilización)
// ============================================================

export async function refreshSession(
  token: string,
  ctx: TokenContext
): Promise<IssuedSession> {
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashRefreshToken(token) },
    include: { user: true },
  });

  const now = new Date();

  if (!stored) {
    throw ApiError.unauthorized("La sesión no es válida.");
  }

  // Reutilización de un token ya rotado = posible robo → cerrar TODA la sesión
  if (stored.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: now },
    });
    console.warn(`[auth] ⚠️  Reutilización de refresh token: user=${stored.userId}`);
    throw ApiError.unauthorized("La sesión fue cerrada por seguridad.");
  }

  if (stored.expiresAt <= now) {
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: now },
    });
    throw ApiError.unauthorized("La sesión expiró; inicia sesión nuevamente.");
  }

  if (!stored.user.isActive) {
    await prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: now },
    });
    throw ApiError.unauthorized("La cuenta está deshabilitada.");
  }

  // Rotación: el viejo queda revocado y apunta al nuevo
  const newRefreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL * 1000);

  const created = await prisma.refreshToken.create({
    data: {
      tokenHash: hashRefreshToken(newRefreshToken),
      userId: stored.userId,
      expiresAt,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    },
  });

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: now, replacedById: created.id },
  });

  const accessToken = signAccessToken({
    sub: stored.user.id,
    email: stored.user.email,
    fullName: stored.user.fullName,
    role: stored.user.role,
  });

  return { user: toPublicUser(stored.user), accessToken, refreshToken: newRefreshToken };
}

// ============================================================
//  LOGOUT
// ============================================================

export async function logout(token: string | undefined): Promise<void> {
  if (!token) return;
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashRefreshToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Cambio de contraseña: mata todas las sesiones abiertas del usuario. */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  const valid = await verifyPassword(user.passwordHash, currentPassword);
  if (!valid) {
    throw ApiError.badRequest("La contraseña actual no es correcta.");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(newPassword) },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}
