import prisma from "../../shared/database/prisma.js";
import { money } from "../../shared/utils/money.js";

/**
 * Utilidad de un rango de fechas (R7):
 *   utilidad bruta = facturado − costo de lo vendido (snapshot `unitCost`)
 *   utilidad neta  = utilidad bruta − gastos del periodo (R6)
 *
 * Se usa `$queryRaw` porque Prisma no permite multiplicar dos columnas en un
 * agregado (`SUM(unitCost * quantity)`).
 */
export async function profit(from: Date, to: Date) {
  const [sales, expenses, counts] = await Promise.all([
    prisma.$queryRaw<Array<{ total: number; cost: number }>>`
      SELECT
        COALESCE(SUM(i."total"), 0)::float                                                    AS total,
        COALESCE(SUM(ii."unitCost" * ii."quantity"), 0)::float                                AS cost
      FROM "Invoice" i
      LEFT JOIN "InvoiceItem" ii ON ii."invoiceId" = i.id
      WHERE i.status <> 'ANULADA'
        AND i."issueDate" >= ${from}
        AND i."issueDate" < ${to}
    `,
    prisma.expense.aggregate({
      where: { date: { gte: from, lt: to } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.invoice.count({
      where: { status: { not: "ANULADA" }, issueDate: { gte: from, lt: to } },
    }),
  ]);

  const invoiced = sales[0]?.total ?? 0;
  const costOfSales = sales[0]?.cost ?? 0;
  const expenseTotal = money(expenses._sum.amount);
  const grossProfit = invoiced - costOfSales;
  const netProfit = grossProfit - expenseTotal;

  return {
    from,
    to,
    invoiced,
    costOfSales,
    grossProfit,
    /** Margen bruto sobre lo facturado (%). */
    grossMargin: invoiced > 0 ? Math.round((grossProfit / invoiced) * 1000) / 10 : 0,
    expenses: expenseTotal,
    expenseCount: expenses._count,
    netProfit,
    netMargin: invoiced > 0 ? Math.round((netProfit / invoiced) * 1000) / 10 : 0,
    invoicesCount: counts,
    averageTicket: counts > 0 ? Math.round(invoiced / counts) : 0,
  };
}

/** Utilidad mes a mes (últimos N meses) para la gráfica de Reportes. */
export async function monthlyProfit(months = 6) {
  const now = new Date();
  // Primer día del mes N−(months−1)
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const result: Array<{
    month: string;
    invoiced: number;
    grossProfit: number;
    expenses: number;
    netProfit: number;
  }> = [];

  for (let i = 0; i < months; i++) {
    const from = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const to = new Date(from.getFullYear(), from.getMonth() + 1, 1);
    if (from > now) break;

    const p = await profit(from, to);
    result.push({
      month: `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}`,
      invoiced: p.invoiced,
      grossProfit: p.grossProfit,
      expenses: p.expenses,
      netProfit: p.netProfit,
    });
  }

  return result;
}

/**
 * Alertas (R8): stock bajo, facturas vencidas/por vencer y órdenes de
 * producción detenidas. Una sola llamada para el dashboard.
 */
export async function alerts(overdueDays = 0) {
  const dueLimit = new Date(Date.now() + overdueDays * 24 * 60 * 60 * 1000);

  const [lowStock, overdue, inProduction] = await Promise.all([
    // `stock <= minimumStock` no se puede comparar en el WHERE de Prisma;
    // a esta escala se filtra en memoria sin problema.
    prisma.productPresentation.findMany({
      where: { isActive: true, minimumStock: { gt: 0 } },
      select: {
        id: true,
        stock: true,
        minimumStock: true,
        label: true,
        grind: true,
        product: { select: { id: true, name: true } },
      },
    }),
    prisma.invoice.findMany({
      where: {
        status: { in: ["PENDIENTE", "VENCIDA"] },
        dueDate: { lte: dueLimit },
      },
      select: {
        id: true,
        number: true,
        dueDate: true,
        total: true,
        status: true,
        client: { select: { id: true, fullName: true, phone: true } },
        payments: { select: { amount: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 50,
    }),
    prisma.productionOrder.count({ where: { status: "EN_PROCESO" } }),
  ]);

  const stockAlerts = lowStock
    .filter((p) => p.stock <= p.minimumStock)
    .map((p) => ({
      presentationId: p.id,
      productId: p.product.id,
      product: p.product.name,
      presentation: `${p.label} · ${p.grind}`,
      stock: p.stock,
      minimumStock: p.minimumStock,
      /** `out` = ya no hay nada que vender. */
      out: p.stock === 0,
    }));

  const invoiceAlerts = overdue.map((i) => {
    const paid = i.payments.reduce((sum, p) => sum + money(p.amount), 0);
    const days =
      i.dueDate && i.dueDate < new Date()
        ? Math.floor((Date.now() - i.dueDate.getTime()) / 86_400_000)
        : 0;

    return {
      id: i.id,
      number: i.number,
      client: i.client,
      balance: money(i.total) - paid,
      dueDate: i.dueDate,
      status: i.status,
      /** Días de mora; 0 = aún no vence. */
      daysOverdue: days,
    };
  });

  return {
    lowStock: stockAlerts,
    outOfStock: stockAlerts.filter((s) => s.out).length,
    overdueInvoices: invoiceAlerts,
    overdueBalance: invoiceAlerts.reduce((sum, i) => sum + i.balance, 0),
    inProductionOrders: inProduction,
  };
}

/** Ranking de productos vendidos en un rango (para Reportes). */
export async function topProducts(from: Date, to: Date, limit = 10) {
  const rows = await prisma.$queryRaw<
    Array<{
      product: string;
      quantity: number;
      revenue: number;
      profit: number;
    }>
  >`
    SELECT
      ii."productName"                                                       AS product,
      SUM(ii."quantity")::int                                                 AS quantity,
      SUM(ii."subtotal")::float                                               AS revenue,
      SUM((ii."unitPrice" - ii."unitCost") * ii."quantity")::float            AS profit
    FROM "InvoiceItem" ii
    JOIN "Invoice" i ON i.id = ii."invoiceId"
    WHERE i.status <> 'ANULADA'
      AND i."issueDate" >= ${from}
      AND i."issueDate" < ${to}
    GROUP BY ii."productName"
    ORDER BY revenue DESC
    LIMIT ${limit}
  `;

  return rows.map((r) => ({
    product: r.product,
    quantity: r.quantity,
    revenue: r.revenue,
    profit: r.profit,
  }));
}

/** KPIs simples del dashboard: hoy vs. mes en curso. */
export async function dashboard() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [today, month, activeOrders] = await Promise.all([
    profit(startOfToday, now),
    profit(startOfMonth, now),
    prisma.productionOrder.count({ where: { status: "EN_PROCESO" } }),
  ]);

  return {
    today,
    month,
    inProductionOrders: activeOrders,
  };
}

/** Construye el rango de un mes `YYYY-MM` (0-based para Date de JS). */
export function monthRange(month?: string): { from: Date; to: Date } {
  const now = new Date();
  if (!month) {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
  }
  const [y, m] = month.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
  }
  return { from: new Date(y, m - 1, 1), to: new Date(y, m, 1) };
}
