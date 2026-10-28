import type { Prisma, Purchase, PurchaseItem } from "@prisma/client";

import prisma from "../../shared/database/prisma.js";
import { ApiError } from "../../shared/errors/api-error.js";
import { money } from "../../shared/utils/money.js";
import { pageParams, type Pagination } from "../../shared/utils/pagination.js";
import type { CreatePurchaseInput, ListPurchasesQuery } from "./purchases.schemas.js";

type PurchaseWithRelations = Purchase & {
  createdBy: { id: string; fullName: string };
  items: (PurchaseItem & {
    presentation: { label: string; grind: string; product: { name: string } };
  })[];
};

export function serializePurchase(p: PurchaseWithRelations) {
  return {
    id: p.id,
    number: p.number,
    provider: p.provider,
    date: p.date,
    total: money(p.total),
    notes: p.notes,
    createdBy: p.createdBy,
    items: p.items.map((i) => ({
      id: i.id,
      presentationId: i.presentationId,
      product: i.presentation.product.name,
      presentation: `${i.presentation.label} · ${i.presentation.grind}`,
      quantity: i.quantity,
      unitCost: money(i.unitCost),
      subtotal: money(i.subtotal),
    })),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

/** Siguiente número consecutivo: C-000001, C-000002… (único en BD). */
async function nextPurchaseNumber(tx: Prisma.TransactionClient): Promise<string> {
  const rows = await tx.$queryRaw<Array<{ num: bigint | null }>>`
    SELECT MAX(CAST(SUBSTRING(number FROM 3) AS INTEGER)) AS num
    FROM "Purchase"
  `;
  const next = Number(rows[0]?.num ?? 0) + 1;
  return `C-${String(next).padStart(6, "0")}`;
}

const baseInclude = {
  createdBy: { select: { id: true, fullName: true } },
  items: {
    include: {
      presentation: {
        select: { label: true, grind: true, product: { select: { name: true } } },
      },
    },
  },
};

// ============================================================
//  CREAR COMPRA — entrada a bodega + movimiento COMPRA (R3/R5)
// ============================================================

export async function create(input: CreatePurchaseInput, userId: string) {
  const presentationIds = [...new Set(input.items.map((i) => i.presentationId))];
  const presentations = await prisma.productPresentation.findMany({
    where: { id: { in: presentationIds } },
    include: { product: { select: { name: true } } },
  });
  const byId = new Map(presentations.map((p) => [p.id, p]));

  const missing = presentationIds.filter((id) => !byId.has(id));
  if (missing.length > 0) {
    throw ApiError.badRequest("Algunas presentaciones no existen.", [
      { path: "items", message: `IDs inválidos: ${missing.join(", ")}` },
    ]);
  }

  const purchase = await prisma.$transaction(async (tx) => {
    const number = await nextPurchaseNumber(tx);

    const lines = input.items.map((item) => ({
      presentationId: item.presentationId,
      quantity: item.quantity,
      unitCost: item.unitCost,
      subtotal: item.quantity * item.unitCost,
    }));

    const total = lines.reduce((sum, l) => sum + l.subtotal, 0);

    const created = await tx.purchase.create({
      data: {
        number,
        provider: input.provider,
        date: input.date ?? new Date(),
        total,
        notes: input.notes ?? null,
        createdById: userId,
        items: { create: lines },
      },
      include: baseInclude,
    });

    // Entrada de stock + movimiento trazable (R3) y actualización del
    // costo interno de la presentación (base del cálculo de utilidad, R7).
    for (const item of input.items) {
      await tx.productPresentation.update({
        where: { id: item.presentationId },
        data: {
          stock: { increment: item.quantity },
          cost: item.unitCost,
        },
      });
      await tx.inventoryMovement.create({
        data: {
          presentationId: item.presentationId,
          type: "ENTRADA",
          reason: "COMPRA",
          quantity: item.quantity,
          reference: number,
          notes: `Compra a ${input.provider}`,
          createdById: userId,
        },
      });
    }

    return created;
  });

  return serializePurchase(purchase);
}

// ============================================================
//  LISTAR / DETALLE
// ============================================================

export async function list(pagination: Pagination, query: ListPurchasesQuery) {
  const where: Prisma.PurchaseWhereInput = {
    ...(query.from || query.to
      ? {
          date: {
            ...(query.from ? { gte: query.from } : {}),
            ...(query.to ? { lte: query.to } : {}),
          },
        }
      : {}),
    ...(query.q
      ? {
          OR: [
            { number: { contains: query.q, mode: "insensitive" } },
            { provider: { contains: query.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [purchases, total] = await Promise.all([
    prisma.purchase.findMany({
      where,
      include: baseInclude,
      orderBy: { date: "desc" },
      ...pageParams(pagination),
    }),
    prisma.purchase.count({ where }),
  ]);

  return { data: purchases.map(serializePurchase), total };
}

export async function getById(id: string) {
  const purchase = await prisma.purchase.findUnique({ where: { id }, include: baseInclude });
  if (!purchase) throw ApiError.notFound("Compra no encontrada.");
  return serializePurchase(purchase);
}
