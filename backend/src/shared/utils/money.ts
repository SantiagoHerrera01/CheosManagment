/**
 * Serialización de dinero: Prisma devuelve `Decimal`, la API responde `number`
 * (los pesos colombianos son enteros y caben con holgura en un double).
 */
export function money(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function moneyOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
