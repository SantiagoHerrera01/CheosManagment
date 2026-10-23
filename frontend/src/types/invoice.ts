export interface Customer {
  id: number;
  name: string;
  document: string;
  phone: string;
  city: string;
}

export interface InvoiceItem {
  id: number;

  productId: number;

  name: string;

  process: string;

  presentation: string;

  type: string;

  quantity: number;

  cost: number;

  price: number;

  subtotal: number;
}

export interface Invoice {
  id: number;

  customer: Customer | null;

  items: InvoiceItem[];

  subtotal: number;

  discount: number;

  total: number;

  paymentMethod:
    | "CONTADO"
    | "TRANSFERENCIA"
    | "CREDITO"
    | "BONO";

  status:
    | "PENDIENTE"
    | "PAGADA";

  observations: string;

  createdAt: Date;
}