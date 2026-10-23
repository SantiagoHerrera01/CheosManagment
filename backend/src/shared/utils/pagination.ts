import { z } from "zod";

/** Query estándar de paginación: `?page=1&limit=20` (máx. 100 por página). */
export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type Pagination = z.infer<typeof paginationQuery>;

export function pageParams({ page, limit }: Pagination) {
  return { skip: (page - 1) * limit, take: limit };
}

/** Respuesta paginada estándar: `{ data, meta }`. */
export function paged<T>(data: T[], total: number, { page, limit }: Pagination) {
  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}
