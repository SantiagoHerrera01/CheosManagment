import type { BankAccount, BankMovement, PaymentMethod, Prisma } from "@prisma/client";

import prisma from "../../shared/database/prisma.js";
import { ApiError } from "../../shared/errors/api-error.js";
import { money } from "../../shared/utils/money.js";
import { pageParams, type Pagination } from "../../shared/utils/pagination.js";
import type {
  CreateAccountInput,
  CreateMovementInput,
  ListMovementsQuery,
  UpdateAccountInput,
} from "./banks.schemas.js";

export function serializeAccount(a: BankAccount) {
  return {
    id: a.id,
    name: a.name,
    bank: a.bank,
    accountNumber: a.accountNumber,
    balance: money(a.balance),
    isActive: a.isActive,
    /** Cuenta automática del sistema ("Efectivo"). */
    isSystem: a.isSystem,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

type MovementWithRelations = BankMovement & {
  account: { name: string };
  createdBy: { id: string; fullName: string };
};

export function serializeMovement(m: MovementWithRelations) {
  return {
    id: m.id,
    accountId: m.accountId,
    account: m.account.name,
    type: m.type,
    amount: money(m.amount),
    concept: m.concept,
    date: m.date,
    createdBy: m.createdBy,
    createdAt: m.createdAt,
  };
}

// ============================================================
//  CUENTAS
// ============================================================

export async function listAccounts(includeInactive = false) {
  // La caja de efectivo siempre existe y se muestra aunque todavía no haya
  // registrado ventas.
  await ensureSystemCashAccount();

  const accounts = await prisma.bankAccount.findMany({
    ...(includeInactive ? {} : { where: { isActive: true } }),
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return accounts.map(serializeAccount);
}

export async function createAccount(input: CreateAccountInput) {
  const account = await prisma.bankAccount.create({
    data: {
      name: input.name,
      bank: input.bank,
      accountNumber: input.accountNumber ?? null,
    },
  });
  return serializeAccount(account);
}

export async function updateAccount(id: string, input: UpdateAccountInput) {
  const existing = await prisma.bankAccount.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Cuenta no encontrada.");

  // La cuenta Efectivo del sistema es automática: no se puede desactivar.
  if (existing.isSystem && input.isActive === false) {
    throw ApiError.badRequest(
      "La cuenta Efectivo es del sistema y no se puede desactivar."
    );
  }

  const account = await prisma.bankAccount.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.bank !== undefined ? { bank: input.bank } : {}),
      ...(input.accountNumber !== undefined
        ? { accountNumber: input.accountNumber || null }
        : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });

  return serializeAccount(account);
}

// ============================================================
//  MOVIMIENTOS — mantienen el saldo de la cuenta al día
// ============================================================

type Db = Prisma.TransactionClient | typeof prisma;

/**
 * Cuenta "Efectivo" del sistema: se crea sola la primera vez que se
 * necesita y recibe los pagos en efectivo de ventas y abonos.
 */
export async function ensureSystemCashAccount(
  db: Db = prisma
): Promise<BankAccount> {
  const existing = await db.bankAccount.findFirst({
    where: { isSystem: true },
  });
  if (existing) return existing;

  return db.bankAccount.create({
    data: {
      name: "Efectivo",
      bank: "Efectivo",
      accountNumber: null,
      isSystem: true,
    },
  });
}

/**
 * Cuenta donde entra el dinero de un pago:
 * - `accountId` explícito → esa cuenta (validada).
 * - TRANSFERENCIA sin cuenta → error (hay que elegir dónde cae).
 * - EFECTIVO / CONTRA_ENTREGA / ABONO → cuenta "Efectivo" del sistema.
 */
export async function resolvePaymentAccount(
  db: Db,
  method: PaymentMethod,
  accountId?: string | null
): Promise<BankAccount> {
  if (accountId) {
    const account = await db.bankAccount.findUnique({ where: { id: accountId } });
    if (!account) throw ApiError.badRequest("La cuenta indicada no existe.");
    if (!account.isActive)
      throw ApiError.badRequest(`La cuenta "${account.name}" está inactiva.`);
    return account;
  }

  if (method === "TRANSFERENCIA") {
    throw ApiError.badRequest("Elige la cuenta donde se recibió la transferencia.");
  }

  return ensureSystemCashAccount(db);
}

/**
 * Registra una ENTRADA de dinero en una cuenta y actualiza su saldo
 * dentro de una transacción ya abierta (lo usan ventas y abonos para
 * que el movimiento y la factura queden atómicos).
 */
export async function recordEntry(
  tx: Prisma.TransactionClient,
  accountId: string,
  input: { amount: number; concept: string; date?: Date },
  userId: string
) {
  const account = await tx.bankAccount.findUnique({ where: { id: accountId } });
  if (!account) throw ApiError.badRequest("La cuenta del movimiento ya no existe.");
  if (!account.isActive)
    throw ApiError.badRequest(`La cuenta "${account.name}" está inactiva.`);

  const amount = Math.abs(input.amount);

  const movement = await tx.bankMovement.create({
    data: {
      accountId,
      type: "ENTRADA",
      amount,
      concept: input.concept,
      date: input.date ?? new Date(),
      createdById: userId,
    },
    include: {
      account: { select: { name: true } },
      createdBy: { select: { id: true, fullName: true } },
    },
  });

  await tx.bankAccount.update({
    where: { id: accountId },
    data: { balance: { increment: amount } },
  });

  return movement;
}

/** Listado ligero de cuentas activas para selectores (cualquier rol). */
export async function listAccountOptions() {
  await ensureSystemCashAccount();

  return prisma.bankAccount.findMany({
    where: { isActive: true },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      bank: true,
      accountNumber: true,
      isSystem: true,
    },
  });
}


export async function listMovements(pagination: Pagination, query: ListMovementsQuery) {
  const where: Prisma.BankMovementWhereInput = {
    ...(query.accountId ? { accountId: query.accountId } : {}),
    ...(query.type ? { type: query.type } : {}),
    ...(query.from || query.to
      ? {
          date: {
            ...(query.from ? { gte: query.from } : {}),
            ...(query.to ? { lte: query.to } : {}),
          },
        }
      : {}),
  };

  const [movements, total] = await Promise.all([
    prisma.bankMovement.findMany({
      where,
      include: {
        account: { select: { name: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      ...pageParams(pagination),
    }),
    prisma.bankMovement.count({ where }),
  ]);

  return { data: movements.map(serializeMovement), total };
}

/**
 * Crea un movimiento y actualiza el saldo en la misma transacción:
 * ENTRADA suma, SALIDA resta y AJUSTE aplica el monto con su signo.
 */
export async function createMovement(
  accountId: string,
  input: CreateMovementInput,
  userId: string
) {
  const account = await prisma.bankAccount.findUnique({ where: { id: accountId } });
  if (!account) throw ApiError.notFound("Cuenta no encontrada.");
  if (!account.isActive)
    throw ApiError.badRequest("La cuenta está inactiva; no admite movimientos.");

  const signedAmount =
    input.type === "ENTRADA"
      ? Math.abs(input.amount)
      : input.type === "SALIDA"
        ? -Math.abs(input.amount)
        : input.amount;

  const current = money(account.balance);
  const nextBalance = current + signedAmount;
  if (nextBalance < -0.01) {
    throw ApiError.unprocessable(
      `Saldo insuficiente: la cuenta tiene ${current} y el movimiento deja en ${nextBalance}.`
    );
  }

  const movement = await prisma.$transaction(async (tx) => {
    const created = await tx.bankMovement.create({
      data: {
        accountId,
        type: input.type,
        // ENTRADA/SALIDA guardan valor absoluto (el signo lo da el tipo);
        // AJUSTE conserva su signo porque corrige el saldo hacia arriba o abajo.
        amount: input.type === "AJUSTE" ? signedAmount : Math.abs(input.amount),
        concept: input.concept,
        date: input.date ?? new Date(),
        createdById: userId,
      },
      include: {
        account: { select: { name: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    });

    await tx.bankAccount.update({
      where: { id: accountId },
      data: { balance: nextBalance },
    });

    return created;
  });

  return serializeMovement(movement);
}
