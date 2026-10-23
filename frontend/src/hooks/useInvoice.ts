import { useMemo, useState } from "react";

export interface InvoiceItem {
  id: number;
  productId: number;
  name: string;
  process: string;
  presentation: string;
  type: string;
  quantity: number;
  price: number;
}

export type PaymentMethod =
  | "CONTADO"
  | "TRANSFERENCIA"
  | "CREDITO"
  | "BONO";

export default function useInvoice() {
  const [items, setItems] = useState<InvoiceItem[]>([]);

  const [customer, setCustomer] = useState<any>(null);

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("CONTADO");

  const [discount, setDiscount] = useState(0);

  const [observations, setObservations] =
    useState("");

  function addProduct(product: InvoiceItem) {
    const exists = items.find(
      (item) =>
        item.productId === product.productId &&
        item.presentation === product.presentation &&
        item.type === product.type
    );

    if (exists) {
      setItems((old) =>
        old.map((item) =>
          item.productId === product.productId &&
          item.presentation === product.presentation &&
          item.type === product.type
            ? {
                ...item,
                quantity:
                  item.quantity + product.quantity,
              }
            : item
        )
      );

      return;
    }

    setItems((old) => [...old, product]);
  }

  function removeProduct(id: number) {
    setItems((old) =>
      old.filter((item) => item.id !== id)
    );
  }

  function increaseQuantity(id: number) {
    setItems((old) =>
      old.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity: item.quantity + 1,
            }
          : item
      )
    );
  }

  function decreaseQuantity(id: number) {
    setItems((old) =>
      old.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity:
                item.quantity > 1
                  ? item.quantity - 1
                  : 1,
            }
          : item
      )
    );
  }

  const subtotal = useMemo(() => {
    return items.reduce(
      (total, item) =>
        total + item.price * item.quantity,
      0
    );
  }, [items]);

  const total = useMemo(() => {
    return subtotal - discount;
  }, [subtotal, discount]);

  function clearInvoice() {
    setItems([]);
    setCustomer(null);
    setDiscount(0);
    setObservations("");
    setPaymentMethod("CONTADO");
  }

  return {
    customer,
    setCustomer,

    items,

    paymentMethod,
    setPaymentMethod,

    observations,
    setObservations,

    discount,
    setDiscount,

    subtotal,
    total,

    addProduct,
    removeProduct,

    increaseQuantity,
    decreaseQuantity,

    clearInvoice,
  };
}