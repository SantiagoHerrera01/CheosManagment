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

function normalizeProductName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function editDistance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = row[0];
    row[0] = i;

    for (let j = 1; j <= b.length; j += 1) {
      const above = row[j];
      row[j] = a[i - 1] === b[j - 1]
        ? diagonal
        : Math.min(diagonal, above, row[j - 1]) + 1;
      diagonal = above;
    }
  }

  return row[b.length];
}

function areSimilarProductNames(left: string, right: string) {
  const a = normalizeProductName(left);
  const b = normalizeProductName(right);
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;

  const longer = Math.max(a.length, b.length);
  return editDistance(a, b) / longer <= 0.2;
}

export function serializePresentation(
  p: ProductPresentation,
  includeCost: boolean
) {
  return {
    id: p.id,
    label: p.label,
    grind: p.grind,
    price: money(p.price),
    /** Precio de mayoreo (opcional, visible para todos los roles). */
    wholesalePrice: p.wholesalePrice !== null ? money(p.wholesalePrice) : null,
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
    category: product.category,
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
    ...(query.category ? { category: query.category } : {}),
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
  const existingProducts = await prisma.product.findMany({
    select: { name: true },
  });
  const similarProducts = existingProducts
    .filter((product) => areSimilarProductNames(input.name, product.name))
    .map((product) => product.name);

  if (similarProducts.length > 0) {
    throw ApiError.conflict(
      `No se creó el producto porque el nombre es muy parecido a: ${similarProducts.join(", ")}.`,
      similarProducts.map((name) => ({ path: "name", message: name }))
    );
  }

  const product = await prisma.product.create({
    data: {
      name: input.name,
      variety: input.variety ?? null,
      process: input.process ?? null,
      category: input.category,
      presentations: {
        create: input.presentations.map((p) => ({
          label: p.label,
          grind: p.grind,
          price: p.price,
          wholesalePrice: p.wholesalePrice ?? null,
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
      ...(input.category !== undefined ? { category: input.category } : {}),
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
      wholesalePrice: input.wholesalePrice ?? null,
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
      ...(input.wholesalePrice !== undefined
        ? { wholesalePrice: input.wholesalePrice }
        : {}),
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
