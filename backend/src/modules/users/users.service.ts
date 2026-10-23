import { randomBytes } from "node:crypto";
import type { Prisma, User } from "@prisma/client";

import prisma from "../../shared/database/prisma.js";
import { ApiError } from "../../shared/errors/api-error.js";
import { pageParams, type Pagination } from "../../shared/utils/pagination.js";
import { hashPassword } from "../../shared/utils/password.js";
import type { AuthUser } from "../../shared/middleware/auth.js";
import { toPublicUser } from "../auth/auth.service.js";
import type { CreateUserInput, UpdateUserInput } from "./users.schemas.js";
import type { Role } from "@prisma/client";

export function serializeUser(user: User) {
  return toPublicUser(user);
}

/** Lista de usuarios con búsqueda y filtros (solo admin). */
export async function list(
  pagination: Pagination,
  filters: { q?: string; role?: Role; includeInactive: boolean }
) {
  const where: Prisma.UserWhereInput = {
    ...(filters.includeInactive ? {} : { isActive: true }),
    ...(filters.role ? { role: filters.role } : {}),
    ...(filters.q
      ? {
          OR: [
            { fullName: { contains: filters.q, mode: "insensitive" } },
            { email: { contains: filters.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { fullName: "asc" },
      ...pageParams(pagination),
    }),
    prisma.user.count({ where }),
  ]);

  return { users: users.map(serializeUser), total };
}

export async function getById(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw ApiError.notFound("Usuario no encontrado.");
  return user;
}

/** Crea un usuario con contraseña hasheada (Argon2id). Solo admin. */
export async function create(input: CreateUserInput) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (existing) {
    throw ApiError.conflict("Ya existe un usuario con ese correo.", [
      { path: "email", message: "Correo ya registrado." },
    ]);
  }

  const user = await prisma.user.create({
    data: {
      email: input.email,
      fullName: input.fullName,
      role: input.role,
      passwordHash: await hashPassword(input.password),
    },
  });

  return serializeUser(user);
}

/**
 * Actualiza rol, nombre o estado del usuario.
 * Protecciones: no puedes desactivarte a ti mismo ni quitarte el rol ADMIN
 * (evita quedarse sin administradores).
 */
export async function update(id: string, input: UpdateUserInput, actor: AuthUser) {
  const user = await getById(id);

  if (user.id === actor.id && input.isActive === false) {
    throw ApiError.badRequest("No puedes desactivar tu propia cuenta.");
  }
  if (user.id === actor.id && input.role && input.role !== "ADMIN") {
    throw ApiError.badRequest("No puedes cambiar tu propio rol de administrador.");
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
      ...(input.role !== undefined ? { role: input.role as Role } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      // Al reactivar, desbloquea la cuenta
      ...(input.isActive === true ? { failedLogins: 0, lockedUntil: null } : {}),
    },
  });

  return serializeUser(updated);
}

/** Restablece la contraseña (admin) y cierra todas las sesiones del usuario. */
export async function resetPassword(id: string, newPassword: string) {
  const user = await getById(id);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(newPassword),
        failedLogins: 0,
        lockedUntil: null,
      },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  return { id: user.id };
}

/** Genera una contraseña temporal segura (para restablecimientos). */
export function generateTempPassword(): string {
  return randomBytes(9).toString("base64url") + "Aa1";
}
