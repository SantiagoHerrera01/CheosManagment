/**
 * Tipos que devuelve la API del backend.
 *
 * Coinciden con los serializadores de `backend/src/modules/**` (los Decimal
 * de Prisma salen como `number` y las fechas como ISO string).
 */

export type Role = "ADMIN" | "VENDEDOR" | "BODEGA" | "CONTADOR";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export type DocumentType = "CC" | "NIT" | "CE" | "PASSPORT";

export interface Client {
  id: string;
  documentType: DocumentType;
  documentNumber: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  department: string | null;
  notes: string | null;
  creditLimit: number;
  isActive: boolean;
  /** Saldo de cartera: facturas no anuladas − abonos. */
  balance: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClientInput {
  documentType: DocumentType;
  documentNumber: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  department?: string | null;
  notes?: string | null;
  creditLimit?: number | null;
}

export type Grind = "MOLIDO" | "GRANO";

/**
 * Tipo de artículo (R5): TERMINADO se vende; MATERIA_PRIMA entra a
 * producción; INSUMO es empaque u otro insumo de bodega.
 */
export type ProductCategory = "TERMINADO" | "MATERIA_PRIMA" | "INSUMO";

export interface Presentation {
  id: string;
  label: string;
  grind: Grind;
  price: number;
  /** Solo lo envían los roles ADMIN y CONTADOR. */
  cost?: number;
  stock: number;
  minimumStock: number;
  isActive: boolean;
}

export interface Product {
  id: string;
  name: string;
  variety: string | null;
  process: string | null;
  category: ProductCategory;
  isActive: boolean;
  presentations: Presentation[];
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethod =
  | "EFECTIVO"
  | "TRANSFERENCIA"
  | "CONTRA_ENTREGA"
  | "CREDITO"
  | "ABONO";

export type InvoiceStatus = "PENDIENTE" | "PAGADA" | "VENCIDA" | "ANULADA";

export interface InvoiceItem {
  id: string;
  presentationId: string;
  productName: string;
  presentationLabel: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface InvoicePayment {
  id: string;
  amount: number;
  method: PaymentMethod;
  paidAt: string;
  notes: string | null;
}

export interface Invoice {
  id: string;
  number: string;
  client: {
    id: string;
    fullName: string;
    documentNumber: string;
    phone: string | null;
  };
  issueDate: string;
  dueDate: string;
  subtotal: number;
  discount: number;
  total: number;
  totalPaid: number;
  balance: number;
  status: InvoiceStatus;
  paymentMethod: PaymentMethod;
  notes: string | null;
  createdBy: { id: string; fullName: string };
  /** El detalle de líneas solo viene en detalle y en listados con `withItems=true`. */
  items?: InvoiceItem[];
  payments: InvoicePayment[];
  createdAt: string;
}

export interface CreateInvoiceInput {
  clientId: string;
  items: Array<{ presentationId: string; quantity: number }>;
  discount?: number;
  paymentMethod: PaymentMethod;
  initialPayment?: number | null;
  notes?: string | null;
  creditDays?: number;
}

export type MovementType = "ENTRADA" | "SALIDA" | "AJUSTE";

export type MovementReason =
  | "VENTA"
  | "OBSEQUIO"
  | "PRODUCCION"
  | "COMPRA"
  | "DEVOLUCION"
  | "AJUSTE"
  | "MERMA";

export interface InventoryMovement {
  id: string;
  product: string;
  presentation: string;
  type: MovementType;
  reason: MovementReason;
  quantity: number;
  reference: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
}

/** Respuesta paginada estándar del backend: `{ data, meta }`. */
export interface Paginated<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ============================================================
//  PRODUCCIÓN (R4)
// ============================================================

export type ProductionStatus = "EN_PROCESO" | "FINALIZADA" | "CANCELADA";

export type StageType =
  | "TRILLA"
  | "TUESTE"
  | "LAVADO"
  | "SECADO"
  | "EMPAQUE"
  | "OTRO";

export interface ProductionStage {
  id: string;
  type: StageType;
  inputQuantity: number;
  outputQuantity: number;
  /** Merma de la etapa: entrada − salida (calculada por el backend). */
  waste: number;
  notes: string | null;
  sequence: number;
  createdAt: string;
}

export interface ProductionOrder {
  id: string;
  number: string;
  status: ProductionStatus;
  rawMaterial: {
    presentationId: string;
    product: string;
    presentation: string;
  };
  inputQuantity: number;
  output: {
    presentationId: string;
    product: string;
    presentation: string;
    quantity: number;
  } | null;
  /** Suma de mermas de todas las etapas. */
  totalWaste: number;
  /** Rendimiento neto (%): lo que salió respecto a lo que entró. */
  yieldPercent: number;
  startedAt: string;
  finishedAt: string | null;
  notes: string | null;
  createdBy: { id: string; fullName: string };
  stages: ProductionStage[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================
//  GASTOS (R6)
// ============================================================

export type ExpenseCategory =
  | "Operativo"
  | "Nómina"
  | "Arriendo"
  | "Servicios públicos"
  | "Transporte"
  | "Empaque"
  | "Mantenimiento"
  | "Impuestos"
  | "Otro";

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "Operativo",
  "Nómina",
  "Arriendo",
  "Servicios públicos",
  "Transporte",
  "Empaque",
  "Mantenimiento",
  "Impuestos",
  "Otro",
];

export interface Expense {
  id: string;
  date: string;
  concept: string;
  amount: number;
  category: ExpenseCategory;
  notes: string | null;
  createdBy: { id: string; fullName: string };
  createdAt: string;
  updatedAt: string;
}

// ============================================================
//  COMPRAS (R5)
// ============================================================

export interface PurchaseItem {
  id: string;
  presentationId: string;
  product: string;
  presentation: string;
  quantity: number;
  unitCost: number;
  subtotal: number;
}

export interface Purchase {
  id: string;
  number: string;
  provider: string;
  date: string;
  total: number;
  notes: string | null;
  createdBy: { id: string; fullName: string };
  items: PurchaseItem[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================
//  BANCOS
// ============================================================

export type BankMovementType = "ENTRADA" | "SALIDA" | "AJUSTE";

export interface BankAccount {
  id: string;
  name: string;
  bank: string;
  accountNumber: string | null;
  balance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BankMovement {
  id: string;
  accountId: string;
  account: string;
  type: BankMovementType;
  amount: number;
  concept: string;
  date: string;
  createdBy: { id: string; fullName: string };
  createdAt: string;
}

// ============================================================
//  REPORTES (R7 / R8)
// ============================================================

export interface ProfitReport {
  from: string;
  to: string;
  invoiced: number;
  /** Costo de lo vendido: snapshot `unitCost` de cada línea (R7). */
  costOfSales: number;
  grossProfit: number;
  /** Margen bruto sobre lo facturado (%). */
  grossMargin: number;
  expenses: number;
  expenseCount: number;
  netProfit: number;
  netMargin: number;
  invoicesCount: number;
  averageTicket: number;
}

export interface MonthlyProfit {
  month: string;
  invoiced: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
}

export interface TopProduct {
  product: string;
  quantity: number;
  revenue: number;
  profit: number;
}

export interface LowStockAlert {
  presentationId: string;
  productId: string;
  product: string;
  presentation: string;
  stock: number;
  minimumStock: number;
  /** true cuando ya no queda nada que vender. */
  out: boolean;
}

export interface OverdueInvoiceAlert {
  id: string;
  number: string;
  client: {
    id: string;
    fullName: string;
    phone: string | null;
  };
  balance: number;
  dueDate: string;
  status: InvoiceStatus;
  /** Días de mora; 0 = aún no vence. */
  daysOverdue: number;
}

export interface Alerts {
  lowStock: LowStockAlert[];
  outOfStock: number;
  overdueInvoices: OverdueInvoiceAlert[];
  overdueBalance: number;
  inProductionOrders: number;
}
