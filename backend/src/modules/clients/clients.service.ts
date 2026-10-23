import type { Prisma, Client } from "@prisma/client";

import prisma from "../../shared/database/prisma.js";
import { ApiError } from "../../shared/errors/api-error.js";
import { money } from "../../shared/utils/money.js";
import { pageParams, type Pagination } from "../../shared/utils/pagination.js";
import type {
  CreateClientInput,
  ListClientsQuery,
  UpdateClientInput,
} from "./clients.schemas.js";

/** Cliente con los totales de cartera calculados (R2). */
export function serializeClient(client: Client, balance = 0) {
  return {
    id: client.id,
    documentType: client.documentType,
    documentNumber: client.documentNumber,
    fullName: client.fullName,
    phone: client.phone,
    email: client.email,
    address: client.address,
    city: client.city,
    department: client.department,
    notes: client.notes,
    creditLimit: money(client.creditLimit),
    isActive: client.isActive,
    /** Saldo pendiente de cartera (facturas con crédito - abonos). */
    balance,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
  };
}

/**
 * Calcula el saldo pendiente de cartera para un conjunto de clientes
 * (facturas no anuladas - abonos). Se resuelve con pocas queries, sin N+1.
 */
async function balancesFor(clientIds: string[]): Promise<Map<string, number>> {
  if (clientIds.length === 0) return new Map();

  const [totals, payments, invoices] = await Promise.all([
    prisma.invoice.groupBy({
      by: ["clientId"],
      where: { clientId: { in: clientIds }, status: { not: "ANULADA" } },
      _sum: { total: true },
    }),
    prisma.payment.findMany({
      where: { invoice: { clientId: { in: clientIds } } },
      select: { amount: true, invoiceId: true },
    }),
    prisma.invoice.findMany({
      where: { clientId: { in: clientIds } },
      select: { id: true, clientId: true },
    }),
  ]);

  const invoiceToClient = new Map(invoices.map((i) => [i.id, i.clientId]));

  const paidByClient = new Map<string, number>();
  for (const p of payments) {
    const clientId = invoiceToClient.get(p.invoiceId);
    if (!clientId) continue;
    paidByClient.set(clientId, (paidByClient.get(clientId) ?? 0) + money(p.amount));
  }

  const result = new Map<string, number>();
  for (const t of totals) {
    result.set(t.clientId, money(t._sum.total) - (paidByClient.get(t.clientId) ?? 0));
  }
  // Clientes sin facturas no aparecen en el groupBy → saldo 0
  return result;
}

export async function list(pagination: Pagination, query: ListClientsQuery) {
  const where: Prisma.ClientWhereInput = {
    ...(query.active === "true" ? { isActive: true } : {}),
    ...(query.q
      ? {
          OR: [
            { fullName: { contains: query.q, mode: "insensitive" } },
            { documentNumber: { contains: query.q, mode: "insensitive" } },
            { phone: { contains: query.q } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.ClientOrderByWithRelationInput =
    query.sort === "recent" ? { createdAt: "desc" } : { fullName: "asc" };

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy,
      ...pageParams(pagination),
    }),
    prisma.client.count({ where }),
  ]);

  const balances = await balancesFor(clients.map((c) => c.id));

  const data = clients.map((c) => serializeClient(c, balances.get(c.id) ?? 0));

  // Orden por cartera se aplica en memoria (depende de agregados)
  if (query.sort === "balance") {
    data.sort((a, b) => b.balance - a.balance);
  }

  return { data, total };
}

export async function getById(id: string) {
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) throw ApiError.notFound("Cliente no encontrado.");

  const balances = await balancesFor([id]);
  return serializeClient(client, balances.get(id) ?? 0);
}

export async function getByDocument(documentNumber: string) {
  const client = await prisma.client.findUnique({
    where: { documentNumber },
  });
  if (!client) throw ApiError.notFound("Cliente no encontrado.");
  return serializeClient(client);
}

export async function create(input: CreateClientInput) {
  const client = await prisma.client.create({
    data: {
      documentType: input.documentType,
      documentNumber: input.documentNumber,
      fullName: input.fullName,
      phone: input.phone ?? null,
      email: input.email ?? null,
      address: input.address ?? null,
      city: input.city ?? null,
      department: input.department ?? null,
      notes: input.notes ?? null,
      creditLimit: input.creditLimit ?? null,
    },
  });

  return serializeClient(client);
}

export async function update(id: string, input: UpdateClientInput) {
  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Cliente no encontrado.");

  const client = await prisma.client.update({
    where: { id },
    data: {
      ...(input.documentType !== undefined
        ? { documentType: input.documentType }
        : {}),
      ...(input.documentNumber !== undefined
        ? { documentNumber: input.documentNumber }
        : {}),
      ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
      ...(input.phone !== undefined ? { phone: input.phone || null } : {}),
      ...(input.email !== undefined ? { email: input.email || null } : {}),
      ...(input.address !== undefined ? { address: input.address || null } : {}),
      ...(input.city !== undefined ? { city: input.city || null } : {}),
      ...(input.department !== undefined
        ? { department: input.department || null }
        : {}),
      ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
      ...(input.creditLimit !== undefined
        ? { creditLimit: input.creditLimit ?? null }
        : {}),
    },
  });

  return serializeClient(client);
}

/**
 * Baja lógica: nunca se borran clientes porque tienen facturas asociadas
 * (integridad contable). Solo se ocultan de los listados nuevos.
 */
export async function setActive(id: string, isActive: boolean) {
  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Cliente no encontrado.");

  const client = await prisma.client.update({
    where: { id },
    data: { isActive },
  });

  return serializeClient(client);
}
