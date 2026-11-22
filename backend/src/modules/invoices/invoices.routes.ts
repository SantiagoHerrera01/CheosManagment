import { Router } from "express";
import { z } from "zod";

import { Role } from "@prisma/client";

import { authenticate, requireRole } from "../../shared/middleware/auth.js";
import { validate } from "../../shared/middleware/validate.js";
import { ApiError } from "../../shared/errors/api-error.js";
import { verifyToken } from "../../shared/utils/share-token.js";
import * as invoicesService from "./invoices.service.js";
import { sendInvoicePdf } from "./invoices.pdf.js";
import {
  createInvoiceSchema,
  createPaymentSchema,
  listInvoicesQuery,
  voidInvoiceSchema,
} from "./invoices.schemas.js";

const router = Router();

const idParam = z.object({ id: z.string().uuid() });

/**
 * @openapi
 * /invoices/public/{id}/pdf:
 *   get:
 *     tags: [Facturas]
 *     summary: PDF de factura por link firmado (sin sesión)
 *     description: >
 *       Genera el PDF al momento desde la base de datos y lo devuelve en
 *       línea. Solo se acepta con la firma `token` (HMAC de 64 caracteres
 *       que viaja en la factura): es el link que se comparte por WhatsApp
 *       o correo. El saldo que se ve es siempre el vigente.
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *       - { in: query, name: token, required: true, schema: { type: string, minLength: 64, maxLength: 64 } }
 *       - { in: query, name: download, schema: { type: string, enum: ["1"] }, description: "1 = fuerza la descarga del archivo (link de WhatsApp)" }
 *     responses:
 *       "200": { description: PDF de la factura }
 *       "403": { description: Firma inválida o manipulada }
 */
router.get(
  "/public/:id/pdf",
  validate({
    params: idParam,
    query: z.object({
      token: z.string().length(64),
      /** `1` = responder como descarga (`attachment`) en vez de inline. */
      download: z.literal("1").optional(),
    }),
  }),
  async (req, res, next) => {
    try {
      const { id } = req.params as { id: string };
      const { token, download } = req.query as { token: string; download?: "1" };

      if (!verifyToken(id, token)) {
        throw ApiError.forbidden("Enlace de factura inválido.");
      }

      const invoice = await invoicesService.getById(id);
      await sendInvoicePdf(res, invoice, { download: download === "1" });
    } catch (error) {
      next(error);
    }
  }
);

router.use(authenticate);

/**
 * @openapi
 * /invoices:
 *   get:
 *     tags: [Facturas]
 *     summary: Listar facturas con filtros
 *     description: >
 *       Filtra por cliente, estado, rango de fechas o búsqueda libre
 *       (número, nombre o cédula). Las pendientes vencidas se marcan
 *       automáticamente como VENCIDAS.
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: query, name: q, schema: { type: string }, description: Número, nombre o cédula }
 *       - { in: query, name: clientId, schema: { type: string, format: uuid } }
 *       - { in: query, name: status, schema: { $ref: "#/components/schemas/EstadoFactura" } }
 *       - { in: query, name: from, schema: { type: string, format: date } }
 *       - { in: query, name: to, schema: { type: string, format: date } }
 *       - { in: query, name: withItems, schema: { type: string, enum: [true, false] } }
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 20 } }
 *     responses:
 *       "200": { description: Lista paginada de facturas }
 *       "401": { $ref: "#/components/responses/Unauthorized" }
 */
router.get(
  "/",
  requireRole(Role.ADMIN, Role.VENDEDOR, Role.CONTADOR),
  validate({ query: listInvoicesQuery }),
  async (req, res, next) => {
    try {
      const query = req.query as unknown as z.infer<typeof listInvoicesQuery>;
      const { data, total } = await invoicesService.list(
        { page: Number(query.page), limit: Number(query.limit) },
        query
      );
      res.json({
        data,
        meta: {
          total,
          page: Number(query.page),
          limit: Number(query.limit),
          totalPages: Math.max(1, Math.ceil(total / Number(query.limit))),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /invoices/overdue:
 *   get:
 *     tags: [Facturas]
 *     summary: Facturas vencidas o por vencer (alertas R8)
 *     description: Devuelve facturas por cobrar con vencimiento en los próximos `days` días (por defecto 30).
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: query, name: days, schema: { type: integer, default: 30 } }
 *     responses:
 *       "200": { description: Lista de facturas por cobrar }
 */
router.get(
  "/overdue",
  requireRole(Role.ADMIN, Role.VENDEDOR, Role.CONTADOR),
  validate({ query: z.object({ days: z.coerce.number().int().min(0).max(365).default(30) }) }),
  async (req, res, next) => {
    try {
      const days = Number((req.query as { days?: string }).days ?? 30);
      const data = await invoicesService.overdueOrDue(days);
      res.json({ data, meta: { total: data.length } });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /invoices/{id}:
 *   get:
 *     tags: [Facturas]
 *     summary: Detalle de factura (items, abonos y saldo)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       "200": { description: Factura encontrada }
 *       "404": { $ref: "#/components/responses/NotFound" }
 */
router.get(
  "/:id",
  requireRole(Role.ADMIN, Role.VENDEDOR, Role.CONTADOR),
  validate({ params: idParam }),
  async (req, res, next) => {
    try {
      const invoice = await invoicesService.getById((req.params.id as string));
      res.json({ data: invoice });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /invoices/{id}/pdf:
 *   get:
 *     tags: [Facturas]
 *     summary: PDF de factura (sesión iniciada)
 *     description: >
 *       Mismo PDF que el link público, pero usando la sesión de la app
 *       (botón "Ver factura" desde el detalle de la venta).
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       "200": { description: PDF de la factura }
 *       "404": { $ref: "#/components/responses/NotFound" }
 */
router.get(
  "/:id/pdf",
  requireRole(Role.ADMIN, Role.VENDEDOR, Role.CONTADOR),
  validate({ params: idParam }),
  async (req, res, next) => {
    try {
      const invoice = await invoicesService.getById((req.params.id as string));
      await sendInvoicePdf(res, invoice);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /invoices:
 *   post:
 *     tags: [Facturas]
 *     summary: Crear factura (R1)
 *     description: >
 *       Los precios se toman de la BD (nunca del cliente). Se valida stock,
 *       se descuenta inventario y se registra el movimiento de salida en la
 *       misma transacción. EFECTIVO y TRANSFERENCIA quedan PAGADA; una venta
 *       con ABONO o CONTRA_ENTREGA queda pendiente hasta completar el pago.
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [clientId, items]
 *             properties:
 *               clientId: { type: string, format: uuid }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [presentationId, quantity]
 *                   properties:
 *                     presentationId: { type: string, format: uuid }
 *                     quantity: { type: integer, example: 2 }
 *                     wholesale: { type: boolean, default: false, description: Cobra el precio de mayoreo de la presentación si existe }
 *               discount: { type: number, description: Descuento en pesos }
 *               electronic: { type: boolean, default: false, description: Factura electrónica simulada; agrega IVA 19% sobre (subtotal − descuento) }
 *               paymentMethod: { $ref: "#/components/schemas/MetodoPago" }
 *               initialPayment: { type: number, description: Abono inicial (método ABONO) }
 *               accountId: { type: string, format: uuid, description: Cuenta (Efectivo o banco) donde entra el dinero; obligatoria con TRANSFERENCIA }
 *               creditDays: { type: integer, default: 30 }
 *               notes: { type: string }
 *     responses:
 *       "201": { description: Factura creada e inventario descontado }
 *       "403": { $ref: "#/components/responses/Forbidden" }
 *       "422": { description: Stock insuficiente }
 */
router.post(
  "/",
  requireRole(Role.ADMIN, Role.VENDEDOR),
  validate({ body: createInvoiceSchema }),
  async (req, res, next) => {
    try {
      const invoice = await invoicesService.create(
        req.body as z.infer<typeof createInvoiceSchema>,
        req.user!.id
      );
      res.status(201).json({ data: invoice });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /invoices/{id}/payments:
 *   post:
 *     tags: [Facturas]
 *     summary: Registrar abono/cartera (R2)
 *     description: Cuando el saldo llega a cero, la factura pasa a PAGADA automáticamente.
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount: { type: number, example: 50000 }
 *               method: { $ref: "#/components/schemas/MetodoPago" }
 *               accountId: { type: string, format: uuid, description: Cuenta (Efectivo o banco) donde entra el abono }
 *               paidAt: { type: string, format: date }
 *               notes: { type: string }
 *     responses:
 *       "200": { description: Abono registrado }
 *       "422": { description: El abono supera el saldo pendiente }
 */
router.post(
  "/:id/payments",
  requireRole(Role.ADMIN, Role.VENDEDOR),
  validate({ params: idParam, body: createPaymentSchema }),
  async (req, res, next) => {
    try {
      const result = await invoicesService.registerPayment(
        (req.params.id as string),
        req.body as z.infer<typeof createPaymentSchema>,
        req.user!.id
      );
      res.status(201).json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /invoices/{id}/void:
 *   post:
 *     tags: [Facturas]
 *     summary: Anular factura (devuelve stock)
 *     description: >
 *       Devuelve el inventario y deja registro del movimiento. VENDEDOR solo
 *       puede anular facturas PENDIENTES; para PAGADAS se requiere ADMIN.
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason: { type: string, example: Cliente devolvió la mercancía }
 *     responses:
 *       "200": { description: Factura anulada y stock devuelto }
 *       "403": { description: Rol insuficiente }
 */
router.post(
  "/:id/void",
  requireRole(Role.ADMIN, Role.VENDEDOR),
  validate({ params: idParam, body: voidInvoiceSchema }),
  async (req, res, next) => {
    try {
      const { reason } = req.body as { reason: string };
      const invoice = await invoicesService.voidInvoice((req.params.id as string), reason, {
        id: req.user!.id,
        role: req.user!.role,
      });
      res.json({ data: invoice });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
