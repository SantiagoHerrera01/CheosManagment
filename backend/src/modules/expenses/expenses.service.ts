import type { Expense, Prisma } from "@prisma/client";

import prisma from "../../shared/database/prisma.js";
import { ApiError } from "../../shared/errors/api-error.js";
import { money } from "../../shared/utils/money.js";
import { pageParams, type Pagination } from "../../shared/utils/pagination.js";
import type {
  CreateExpenseInput,
  ListExpensesQuery,
  UpdateExpenseInput,
} from "./expenses.schemas.js";

type ExpenseWithRelations = Expense & {
  createdBy: { id: string; fullName: string };
};

export function serializeExpense(e: ExpenseWithRelations) {
  return {
    id: e.id,
    date: e.date,
    concept: e.concept,
    amount: money(e.amount),
    category: e.category,
    notes: e.notes,
    createdBy: e.createdBy,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

export async function list(pagination: Pagination, query: ListExpensesQuery) {
  const where: Prisma.ExpenseWhereInput = {
    ...(query.category ? { category: query.category } : {}),
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
            { concept: { contains: query.q, mode: "insensitive" } },
            { notes: { contains: query.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [expenses, total, sum] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: { createdBy: { select: { id: true, fullName: true } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      ...pageParams(pagination),
    }),
    prisma.expense.count({ where }),
    prisma.expense.aggregate({ where, _sum: { amount: true } }),
  ]);

  return {
    data: expenses.map(serializeExpense),
    total,
    /** Suma del filtro actual (para el encabezado de la pantalla). */
    totalAmount: money(sum._sum.amount),
  };
}

/** Desglose por categoría para un rango de fechas (R6 → utilidad R7). */
export async function summaryByCategory(from: Date, to: Date) {
  const rows = await prisma.expense.groupBy({
    by: ["category"],
    where: { date: { gte: from, lte: to } },
    _sum: { amount: true },
    _count: true,
    orderBy: { _sum: { amount: "desc" } },
  });

  return rows.map((r) => ({
    category: r.category,
    total: money(r._sum.amount),
    count: r._count,
  }));
}

export async function create(input: CreateExpenseInput, userId: string) {
  const expense = await prisma.expense.create({
    data: {
      date: input.date ?? new Date(),
      concept: input.concept,
      amount: input.amount,
      category: input.category,
      notes: input.notes ?? null,
      createdById: userId,
    },
    include: { createdBy: { select: { id: true, fullName: true } } },
  });

  return serializeExpense(expense);
}

export async function update(id: string, input: UpdateExpenseInput) {
  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Gasto no encontrado.");

  const expense = await prisma.expense.update({
    where: { id },
    data: {
      ...(input.date !== undefined ? { date: input.date } : {}),
      ...(input.concept !== undefined ? { concept: input.concept } : {}),
      ...(input.amount !== undefined ? { amount: input.amount } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
    },
    include: { createdBy: { select: { id: true, fullName: true } } },
  });

  return serializeExpense(expense);
}

/** Borrado físico: los gastos no afectan inventario ni cartera. */
export async function remove(id: string) {
  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Gasto no encontrado.");

  await prisma.expense.delete({ where: { id } });
}
