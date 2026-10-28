import type { Prisma, ProductionOrder, ProductionStage } from "@prisma/client";

import prisma from "../../shared/database/prisma.js";
import { ApiError } from "../../shared/errors/api-error.js";
import { pageParams, type Pagination } from "../../shared/utils/pagination.js";
import type {
  AddStageInput,
  CreateOrderInput,
  FinishOrderInput,
  ListOrdersQuery,
} from "./production.schemas.js";

type OrderWithRelations = ProductionOrder & {
  rawMaterialPresentation: {
    label: string;
    grind: string;
    product: { name: string };
  };
  outputPresentation: { label: string; grind: string; product: { name: string } } | null;
  createdBy: { id: string; fullName: string };
  stages: ProductionStage[];
};

export function serializeOrder(order: OrderWithRelations) {
  // Merma total = suma de las mermas registradas por etapa (R4)
  const totalWaste = order.stages.reduce((sum, s) => sum + s.waste, 0);
  const yieldPercent =
    order.inputQuantity > 0
      ? Math.round(((order.inputQuantity - totalWaste) / order.inputQuantity) * 1000) / 10
      : 0;

  return {
    id: order.id,
    number: order.number,
    status: order.status,
    rawMaterial: {
      presentationId: order.rawMaterialPresentationId,
      product: order.rawMaterialPresentation.product.name,
      presentation: `${order.rawMaterialPresentation.label} · ${order.rawMaterialPresentation.grind}`,
    },
    inputQuantity: order.inputQuantity,
    output: order.outputPresentation
      ? {
          presentationId: order.outputPresentationId,
          product: order.outputPresentation.product.name,
          presentation: `${order.outputPresentation.label} · ${order.outputPresentation.grind}`,
          quantity: order.outputQuantity,
        }
      : null,
    totalWaste,
    /** Rendimiento neto: lo que salió respecto a lo que entró (%). */
    yieldPercent,
    startedAt: order.startedAt,
    finishedAt: order.finishedAt,
    notes: order.notes,
    createdBy: order.createdBy,
    stages: order.stages
      .slice()
      .sort((a, b) => a.sequence - b.sequence)
      .map((s) => ({
        id: s.id,
        type: s.type,
        inputQuantity: s.inputQuantity,
        outputQuantity: s.outputQuantity,
        waste: s.waste,
        notes: s.notes,
        sequence: s.sequence,
        createdAt: s.createdAt,
      })),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

/** Siguiente número consecutivo: OP-000001, OP-000002… (único en BD). */
async function nextOrderNumber(tx: Prisma.TransactionClient): Promise<string> {
  const rows = await tx.$queryRaw<Array<{ num: bigint | null }>>`
    SELECT MAX(CAST(SUBSTRING(number FROM 4) AS INTEGER)) AS num
    FROM "ProductionOrder"
  `;
  const next = Number(rows[0]?.num ?? 0) + 1;
  return `OP-${String(next).padStart(6, "0")}`;
}

const baseInclude = {
  rawMaterialPresentation: {
    select: { label: true, grind: true, product: { select: { name: true } } },
  },
  outputPresentation: {
    select: { label: true, grind: true, product: { select: { name: true } } },
  },
  createdBy: { select: { id: true, fullName: true } },
  stages: { orderBy: { sequence: "asc" as const } },
};

// ============================================================
//  CREAR ORDEN (R4) — descuenta materia prima de bodega
// ============================================================

export async function create(input: CreateOrderInput, userId: string) {
  const raw = await prisma.productPresentation.findUnique({
    where: { id: input.rawMaterialPresentationId },
    include: { product: { select: { name: true, category: true } } },
  });
  if (!raw) throw ApiError.notFound("Materia prima no encontrada.");

  if (input.outputPresentationId) {
    const output = await prisma.productPresentation.findUnique({
      where: { id: input.outputPresentationId },
    });
    if (!output) throw ApiError.notFound("Presentación de producto terminado no encontrada.");
  }

  if (raw.stock < input.inputQuantity) {
    throw ApiError.unprocessable(
      `Stock insuficiente de ${raw.product.name} (${raw.label}): hay ${raw.stock}, la orden pide ${input.inputQuantity}.`
    );
  }

  const order = await prisma.$transaction(async (tx) => {
    const number = await nextOrderNumber(tx);

    // Descuento de materia prima + movimiento trazable (R3/R4)
    await tx.productPresentation.update({
      where: { id: raw.id },
      data: { stock: { decrement: input.inputQuantity } },
    });
    await tx.inventoryMovement.create({
      data: {
        presentationId: raw.id,
        type: "SALIDA",
        reason: "PRODUCCION",
        quantity: input.inputQuantity,
        reference: number,
        notes: input.notes ?? "Entrada a producción",
        createdById: userId,
      },
    });

    return tx.productionOrder.create({
      data: {
        number,
        rawMaterialPresentationId: raw.id,
        inputQuantity: input.inputQuantity,
        outputPresentationId: input.outputPresentationId ?? null,
        notes: input.notes ?? null,
        createdById: userId,
      },
      include: baseInclude,
    });
  });

  return serializeOrder(order);
}

// ============================================================
//  ETAPAS — rendimiento y merma por etapa (R4)
// ============================================================

export async function addStage(orderId: string, input: AddStageInput) {
  const order = await prisma.productionOrder.findUnique({ where: { id: orderId } });
  if (!order) throw ApiError.notFound("Orden de producción no encontrada.");
  if (order.status !== "EN_PROCESO")
    throw ApiError.badRequest("Solo se agregan etapas a una orden en proceso.");

  const last = await prisma.productionStage.findFirst({
    where: { orderId },
    orderBy: { sequence: "desc" },
  });
  const sequence = (last?.sequence ?? 0) + 1;

  // La primera etapa entra con la materia prima de la orden
  if (sequence === 1 && input.inputQuantity !== order.inputQuantity) {
    throw ApiError.unprocessable(
      `La primera etapa debe iniciar con ${order.inputQuantity} (la cantidad de materia prima de la orden).`
    );
  }

  // La entrada de cada etapa debe continuar desde la salida de la anterior
  if (last && input.inputQuantity !== last.outputQuantity) {
    throw ApiError.unprocessable(
      `La etapa debe iniciar con ${last.outputQuantity}, que es lo que salió de la etapa anterior.`
    );
  }

  const stage = await prisma.productionStage.create({
    data: {
      orderId,
      type: input.type,
      inputQuantity: input.inputQuantity,
      outputQuantity: input.outputQuantity,
      waste: Math.max(0, input.inputQuantity - input.outputQuantity),
      notes: input.notes ?? null,
      sequence,
    },
  });

  return stage;
}

// ============================================================
//  FINALIZAR — entrada de producto terminado a inventario (R4)
// ============================================================

export async function finish(orderId: string, input: FinishOrderInput, userId: string) {
  const order = await prisma.productionOrder.findUnique({ where: { id: orderId } });
  if (!order) throw ApiError.notFound("Orden de producción no encontrada.");
  if (order.status !== "EN_PROCESO")
    throw ApiError.badRequest("La orden ya no está en proceso.");

  const outputPresentationId = input.outputPresentationId ?? order.outputPresentationId;
  if (!outputPresentationId) {
    throw ApiError.unprocessable(
      "Debes indicar la presentación de producto terminado que se empaca."
    );
  }

  const output = await prisma.productPresentation.findUnique({
    where: { id: outputPresentationId },
    include: { product: { select: { name: true } } },
  });
  if (!output) throw ApiError.notFound("Presentación de producto terminado no encontrada.");

  const stages = await prisma.productionStage.findMany({
    where: { orderId },
    orderBy: { sequence: "asc" },
  });
  const lastStage = stages[stages.length - 1];
  if (lastStage && input.outputQuantity > lastStage.outputQuantity) {
    throw ApiError.unprocessable(
      `No puedes empacar ${input.outputQuantity}: la última etapa (${lastStage.type}) salió con ${lastStage.outputQuantity}.`
    );
  }

  await prisma.$transaction(async (tx) => {
    // Entrada de producto terminado + movimiento trazable (R3/R4)
    await tx.productPresentation.update({
      where: { id: output.id },
      data: { stock: { increment: input.outputQuantity } },
    });
    await tx.inventoryMovement.create({
      data: {
        presentationId: output.id,
        type: "ENTRADA",
        reason: "PRODUCCION",
        quantity: input.outputQuantity,
        reference: order.number,
        notes: `Finalización de ${order.number}`,
        createdById: userId,
      },
    });

    await tx.productionOrder.update({
      where: { id: orderId },
      data: {
        status: "FINALIZADA",
        outputPresentationId: output.id,
        outputQuantity: input.outputQuantity,
        finishedAt: new Date(),
      },
    });
  });

  return getById(orderId);
}

// ============================================================
//  CANCELAR — devuelve la materia prima a bodega
// ============================================================

export async function cancel(orderId: string, userId: string) {
  const order = await prisma.productionOrder.findUnique({ where: { id: orderId } });
  if (!order) throw ApiError.notFound("Orden de producción no encontrada.");
  if (order.status !== "EN_PROCESO")
    throw ApiError.badRequest("Solo se cancelan órdenes en proceso.");

  await prisma.$transaction(async (tx) => {
    await tx.productPresentation.update({
      where: { id: order.rawMaterialPresentationId },
      data: { stock: { increment: order.inputQuantity } },
    });
    await tx.inventoryMovement.create({
      data: {
        presentationId: order.rawMaterialPresentationId,
        type: "ENTRADA",
        reason: "DEVOLUCION",
        quantity: order.inputQuantity,
        reference: order.number,
        notes: `Cancelación de ${order.number}: materia prima devuelta`,
        createdById: userId,
      },
    });

    await tx.productionOrder.update({
      where: { id: orderId },
      data: { status: "CANCELADA", finishedAt: new Date() },
    });
  });

  return getById(orderId);
}

// ============================================================
//  LISTAR / DETALLE
// ============================================================

export async function list(pagination: Pagination, query: ListOrdersQuery) {
  const where: Prisma.ProductionOrderWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.q
      ? {
          OR: [
            { number: { contains: query.q, mode: "insensitive" } },
            {
              rawMaterialPresentation: {
                product: { name: { contains: query.q, mode: "insensitive" } },
              },
            },
          ],
        }
      : {}),
  };

  const [orders, total] = await Promise.all([
    prisma.productionOrder.findMany({
      where,
      include: baseInclude,
      orderBy: { startedAt: "desc" },
      ...pageParams(pagination),
    }),
    prisma.productionOrder.count({ where }),
  ]);

  return { data: orders.map(serializeOrder), total };
}

export async function getById(id: string) {
  const order = await prisma.productionOrder.findUnique({
    where: { id },
    include: baseInclude,
  });
  if (!order) throw ApiError.notFound("Orden de producción no encontrada.");
  return serializeOrder(order);
}
