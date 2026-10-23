import swaggerJsdoc from "swagger-jsdoc";

/**
 * Especificación OpenAPI de la Cheo Manager API.
 *
 * Los endpoints se documentan con anotaciones JSDoc `@openapi`
 * encima de cada ruta (ver `src/app.ts` y `src/modules/**`). Al ir
 * agregando routers, solo hay que añadir sus archivos al array `apis`.
 *
 * UI interactiva : GET /api/docs
 * Spec en JSON    : GET /api/openapi.json
 */

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Cheo Manager API",
      version: "1.0.0",
      description: [
        "API del ERP de Cheo: facturación, inventario, producción, cartera, gastos y control de utilidades.",
        "",
        "**Autenticación:** todas las rutas (excepto `/api` y la documentación) requieren",
        "sesión iniciada con `POST /api/auth/login`. La sesión viaja en cookies `HttpOnly`",
        "y `SameSite=Strict` (`access_token` + `refresh_token`), por lo que en los clientes",
        "HTTP hay que enviar la opción de incluir cookies.",
        "",
        "**Roles:** `ADMIN` (todo), `VENDEDOR` (facturar, clientes, cartera),",
        "`BODEGA` (inventario y producción) y `CONTADOR` (solo lectura de números).",
      ].join("\n"),
      contact: {
        name: "Santiago Castañeda",
        url: "https://github.com/SantiagoHerrera01/CheosManagment",
      },
      license: {
        name: "Todos los derechos reservados",
      },
    },
    servers: [
      { url: "http://localhost:3000", description: "Desarrollo local (Docker o npm)" },
    ],
    tags: [
      { name: "Sistema", description: "Salud y estado del servicio" },
      { name: "Autenticación", description: "Login, sesión y cambio de contraseña" },
      { name: "Usuarios", description: "Gestión de usuarios y roles (solo admin)" },
      { name: "Clientes", description: "R1 · Base de datos de clientes y búsqueda por cédula" },
      { name: "Productos", description: "R1 · Catálogo, presentaciones y precios parametrizados" },
      { name: "Facturas", description: "R1/R2 · Crear facturas, abonos y anulaciones" },
      { name: "Inventario", description: "R3 · Movimientos de stock de producto terminado" },
      { name: "Producción", description: "R4 · Órdenes, etapas (trilla/tueste) y mermas" },
      { name: "Gastos", description: "R6 · Carga de gastos operativos" },
      { name: "Reportes", description: "R7/R8 · Utilidad, alertas e inventario" },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "access_token",
          description:
            "Cookie de sesión que se emite en `POST /api/auth/login`. Envíala con `credentials: include` desde el navegador o con la opción de cookies en Postman.",
        },
      },
      schemas: {
        Rol: {
          type: "string",
          enum: ["ADMIN", "VENDEDOR", "BODEGA", "CONTADOR"],
          description:
            "ADMIN: todo · VENDEDOR: facturar/clientes/cartera · BODEGA: inventario/producción · CONTADOR: solo lectura de números.",
        },
        Usuario: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            email: { type: "string", format: "email" },
            fullName: { type: "string" },
            role: { $ref: "#/components/schemas/Rol" },
            isActive: { type: "boolean" },
            lastLoginAt: { type: "string", format: "date-time", nullable: true },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        TipoDocumento: {
          type: "string",
          enum: ["CC", "NIT", "CE", "PASSPORT"],
        },
        ClienteInput: {
          type: "object",
          required: ["documentType", "documentNumber", "fullName", "phone"],
          properties: {
            documentType: { $ref: "#/components/schemas/TipoDocumento" },
            documentNumber: { type: "string", example: "1032456789" },
            fullName: { type: "string", example: "María Pérez" },
            phone: { type: "string", example: "300 123 4567" },
            email: { type: "string", format: "email" },
            address: { type: "string" },
            city: { type: "string", example: "Medellín" },
            department: { type: "string", example: "Antioquia" },
            notes: { type: "string" },
            creditLimit: { type: "number", description: "Cupo de crédito en pesos" },
          },
        },
        PresentacionInput: {
          type: "object",
          required: ["label", "grind", "price"],
          properties: {
            label: { type: "string", example: "250 g" },
            grind: { type: "string", enum: ["MOLIDO", "GRANO"] },
            price: { type: "number", example: 12900, description: "Precio de venta" },
            cost: { type: "number", example: 8000, description: "Costo interno (solo roles ADMIN/CONTADOR lo ven)" },
            stock: { type: "integer", example: 100 },
            minimumStock: { type: "integer", example: 20, description: "Umbral de alerta (R8)" },
          },
        },
        MetodoPago: {
          type: "string",
          enum: ["EFECTIVO", "TRANSFERENCIA", "CONTRA_ENTREGA", "CREDITO", "ABONO"],
          description:
            "EFECTIVO/TRANSFERENCIA/CONTRA_ENTREGA dejan la factura PAGADA. CREDITO la deja PENDIENTE a `creditDays` (30 por defecto). ABONO registra un abono inicial.",
        },
        EstadoFactura: {
          type: "string",
          enum: ["PENDIENTE", "PAGADA", "VENCIDA", "ANULADA"],
        },
        Error: {
          type: "object",
          properties: {
            error: {
              type: "object",
              properties: {
                code: { type: "string", example: "VALIDATION_ERROR" },
                message: { type: "string" },
                details: { type: "array", items: { type: "object" } },
              },
            },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: "No hay sesión activa o el token expiró (401)",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
        },
        Forbidden: {
          description: "El rol no tiene permisos para esta operación (403)",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
        },
        NotFound: {
          description: "Recurso no encontrado (404)",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
        },
        RateLimited: {
          description: "Demasiados intentos; intenta más tarde (429)",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
        },
      },
    },
  },
  // Dev corre desde `backend/` y las imágenes Docker desde la raíz del monorepo:
  // se declaran ambas rutas (la que no exista simplemente no aporta archivos).
  apis: ["src/**/*.ts", "backend/src/**/*.ts"],
};

export const swaggerDocument = swaggerJsdoc(options);
