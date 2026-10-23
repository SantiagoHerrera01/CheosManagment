import { Router } from "express";
import { z } from "zod";

import type { Prisma } from "@prisma/client";
import { Role } from "@prisma/client";

import prisma from "../../shared/database/prisma.js";
import { authenticate, requireRole } from "../../shared/middleware/auth.js";
import { validate } from "../../shared/middleware/validate.js";
import { paged, paginationQuery } from "../../shared/utils/pagination.js";

const router = Router();

router.use(authenticate);

const movementsQuery = paginationQuery.extend({
  presentationId: z.string().uuid().optional(),
  type: z.enum(["ENTRADA", "SALIDA", "AJUSTE"]).optional(),
  reason: z
    .enum(["VENTA", "OBSEQUIO", "PRODUCCION", "COMPRA", "DEVOLUCION", "AJUSTE", "MERMA"])
    .optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

/**
 * @openapi
 * /inventory/movements:
 *   get:
 *     tags: [Inventario]
 *     summary: Historial de movimientos de inventario (R3)
 *     description: Entradas, salidas y ajustes con su motivo (venta, producción, merma…). Solo ADMIN, BODEGA y CONTADOR.
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: query, name: presentationId, schema: { type: string, format: uuid } }
 *       - { in: query, name: type, schema: { type: string, enum: [ENTRADA, SALIDA, AJUSTE] } }
 *       - { in: query, name: reason, schema: { type: string, enum: [VENTA, OBSEQUIO, PRODUCCION, COMPRA, DEVOLUCION, AJUSTE, MERMA] } }
 *       - { in: query, name: from, schema: { type: string, format: date } }
 *       - { in: query, name: to, schema: { type: string, format: date } }
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 20 } }
 *     responses:
 *       "200": { description: Movimientos paginados }
 *       "403": { $ref: "#/components/responses/Forbidden" }
 */
router.get(
  "/movements",
  requireRole(Role.ADMIN, Role.BODEGA, Role.CONTADOR),
  validate({ query: movementsQuery }),
  async (req, res, next) => {
    try {
      const q = req.query as unknown as z.infer<typeof movementsQuery>;
      const where: Prisma.InventoryMovementWhereInput = {
        ...(q.presentationId ? { presentationId: q.presentationId } : {}),
        ...(q.type ? { type: q.type } : {}),
        ...(q.reason ? { reason: q.reason } : {}),
        ...(q.from || q.to
          ? {
              createdAt: {
                ...(q.from ? { gte: q.from } : {}),
                ...(q.to ? { lte: q.to } : {}),
              },
            }
          : {}),
      };

      const [movements, total] = await Promise.all([
        prisma.inventoryMovement.findMany({
          where,
          include: {
            presentation: {
              select: {
                label: true,
                grind: true,
                product: { select: { name: true } },
              },
            },
            createdBy: { select: { fullName: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: (q.page - 1) * q.limit,
          take: q.limit,
        }),
        prisma.inventoryMovement.count({ where }),
      ]);

      res.json(
        paged(
          movements.map((m) => ({
            id: m.id,
            product: m.presentation.product.name,
            presentation: `${m.presentation.label} · ${m.presentation.grind}`,
            type: m.type,
            reason: m.reason,
            quantity: m.quantity,
            reference: m.reference,
            notes: m.notes,
            createdBy: m.createdBy.fullName,
            createdAt: m.createdAt,
          })),
          total,
          { page: q.page, limit: q.limit }
        )
      );
    } catch (error) {
      next(error);
    }
  }
);

export default router;
