import type { Prisma, Product, ProductPresentation, Role } from "@prisma/client";

import prisma from "../../shared/database/prisma.js";
import { ApiError } from "../../shared/errors/api-error.js";
import { money } from "../../shared/utils/money.js";
import { pageParams, type Pagination } from "../../shared/utils/pagination.js";
import type {
  CreatePresentationInput,
  CreateProductInput,
  ListProductsQuery,
  StockEntryInput,
  UpdatePresentationInput,
  UpdateProductInput,
} from "./products.schemas.js";

/** Roles que pueden ver el costo interno de producción (R7). */
const COST_ROLES: Role[] = ["ADMIN", "CONTADOR"];

export function serializePresentation(
  p: ProductPresentation,
  includeCost: boolean
) {
  return {
    id: p.id,
    label: p.label,
    grind: p.grind,
    price: money(p.price),
    /** Solo admin y contador ven el costo interno; el vendedor no (R7). */
    cost: includeCost ? money(p.cost) : undefined,
    stock: p.stock,
    minimumStock: p.minimumStock,
    isActive: p.isActive,
  };
}

export function serializeProduct(
  product: Product & { presentations: ProductPresentation[] },
  role: Role
) {
  const includeCost = COST_ROLES.includes(role);
  return {
    id: product.id,
    name: product.name,
    variety: product.variety,
    process: product.process,
    isActive: product.isActive,
    presentations: product.presentations.map((p) =>
      serializePresentation(p, includeCost)
    ),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

const productInclude = { presentations: { orderBy: { label: "asc" as const } } };

export async function list(pagination: Pagination, query: ListProductsQuery, role: Role) {
  const where: Prisma.ProductWhereInput = {
    ...(query.active === "true" ? { isActive: true } : {}),
    ...(query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: "insensitive" } },
            { variety: { contains: query.q, mode: "insensitive" } },
            { presentations: { some: { label: { contains: query.q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: productInclude,
      orderBy: { name: "asc" },
      ...pageParams(pagination),
    }),
    prisma.product.count({ where }),
  ]);

  let data = products.map((p) => serializeProduct(p, role));

  // Comparar `stock` con `minimumStock` (dos columnas) no se puede en el
  // WHERE de Prisma; a esta escala se filtra en memoria sin problema.
  if (query.lowStock === "true") {
    data = data.filter((p) =>
      p.presentations.some((pres) => pres.stock <= pres.minimumStock)
    );
  }

  return { data, total };
}

export async function getById(id: string, role: Role) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: productInclude,
  });
  if (!product) throw ApiError.notFound("Producto no encontrado.");
  return serializeProduct(product, role);
}

export async function create(input: CreateProductInput) {
  const product = await prisma.product.create({
    data: {
      name: input.name,
      variety: input.variety ?? null,
      process: input.process ?? null,
      presentations: {
        create: input.presentations.map((p) => ({
          label: p.label,
          grind: p.grind,
          price: p.price,
          cost: p.cost,
          stock: p.stock,
          minimumStock: p.minimumStock,
        })),
      },
    },
    include: productInclude,
  });

  return product;
}

export async function update(id: string, input: UpdateProductInput) {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Producto no encontrado.");

  return prisma.product.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.variety !== undefined ? { variety: input.variety || null } : {}),
      ...(input.process !== undefined ? { process: input.process || null } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
    include: productInclude,
  });
}

export async function addPresentation(productId: string, input: CreatePresentationInput) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw ApiError.notFound("Producto no encontrado.");

  return prisma.productPresentation.create({
    data: {
      productId,
      label: input.label,
      grind: input.grind,
      price: input.price,
      cost: input.cost,
      stock: input.stock,
      minimumStock: input.minimumStock,
    },
  });
}

export async function updatePresentation(
  productId: string,
  presentationId: string,
  input: UpdatePresentationInput
) {
  const presentation = await prisma.productPresentation.findFirst({
    where: { id: presentationId, productId },
  });
  if (!presentation) throw ApiError.notFound("Presentación no encontrada.");

  return prisma.productPresentation.update({
    where: { id: presentationId },
    data: {
      ...(input.label !== undefined ? { label: input.label } : {}),
      ...(input.grind !== undefined ? { grind: input.grind } : {}),
      ...(input.price !== undefined ? { price: input.price } : {}),
      ...(input.cost !== undefined ? { cost: input.cost } : {}),
      ...(input.minimumStock !== undefined ? { minimumStock: input.minimumStock } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
}

/**
 * Entrada de stock (producción, compra, devolución o ajuste).
 * Registra el movimiento para trazabilidad (R3) y actualiza el saldo.
 */
export async function registerStockEntry(
  productId: string,
  presentationId: string,
  input: StockEntryInput,
  userId: string
) {
  const presentation = await prisma.productPresentation.findFirst({
    where: { id: presentationId, productId },
  });
  if (!presentation) throw ApiError.notFound("Presentación no encontrada.");

  const updated = await prisma.$transaction(async (tx) => {
    const p = await tx.productPresentation.update({
      where: { id: presentationId },
      data: {
        stock: { increment: input.quantity },
        ...(input.cost !== undefined ? { cost: input.cost } : {}),
      },
    });

    await tx.inventoryMovement.create({
      data: {
        presentationId,
        type: "ENTRADA",
        reason: input.reason,
        quantity: input.quantity,
        notes: input.notes ?? null,
        createdById: userId,
      },
    });

    return p;
  });

  return updated;
}
