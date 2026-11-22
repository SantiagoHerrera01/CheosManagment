import prisma from "../../shared/database/prisma.js";
import { ApiError } from "../../shared/errors/api-error.js";
import { ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from "../../shared/auth/permissions.js";
import type { RoleInput } from "./roles.schemas.js";

export async function list() {
  return prisma.roleDefinition.findMany({ orderBy: [{ isSystem: "desc" }, { name: "asc" }], include: { _count: { select: { users: true } } } });
}
export function permissions() { return ALL_PERMISSIONS; }
export async function create(input: RoleInput) {
  const exists = await prisma.roleDefinition.findFirst({ where: { OR: [{ code: input.code }, { name: input.name }] } });
  if (exists) throw ApiError.conflict("Ya existe un rol con ese código o nombre.");
  return prisma.roleDefinition.create({ data: { ...input, code: input.code.toUpperCase(), permissions: input.permissions } });
}
export async function update(id: string, input: Partial<RoleInput>) {
  const role = await prisma.roleDefinition.findUnique({ where: { id } });
  if (!role) throw ApiError.notFound("Rol no encontrado.");
  if (role.isSystem && input.code && input.code !== role.code) throw ApiError.badRequest("No puedes cambiar el código de un rol del sistema.");
  return prisma.roleDefinition.update({ where: { id }, data: { ...input, ...(input.code ? { code: input.code.toUpperCase() } : {}) } });
}
export async function remove(id: string) {
  const role = await prisma.roleDefinition.findUnique({ where: { id }, include: { _count: { select: { users: true } } } });
  if (!role) throw ApiError.notFound("Rol no encontrado.");
  if (role.isSystem) throw ApiError.badRequest("Los roles del sistema no se pueden eliminar.");
  if (role._count.users) throw ApiError.conflict("No puedes eliminar un rol asignado a usuarios.");
  await prisma.roleDefinition.delete({ where: { id } });
}

export async function seedDefaults() {
  for (const [code, perms] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    const role = await prisma.roleDefinition.upsert({ where: { code }, update: { permissions: perms }, create: { code, name: code, description: "Rol del sistema", permissions: perms, isSystem: true } });
    await prisma.user.updateMany({ where: { role: code as any, roleId: null }, data: { roleId: role.id } });
  }
}
