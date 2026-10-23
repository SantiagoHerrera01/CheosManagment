interface Props {
  items?: any[];
}

export default function InvoiceSummary({
  items = [],
}: Props) {
  const subtotal = items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const discount = 0;

  const total = subtotal - discount;

  return (
    <div className="bg-white rounded-2xl shadow">

      <div className="border-b px-6 py-4">

        <h2 className="text-xl font-bold">
          Resumen
        </h2>

      </div>

      <div className="p-6 space-y-5">

        <div className="flex justify-between">

          <span>Productos</span>

          <strong>
            {items.length}
          </strong>

        </div>

        <div className="flex justify-between">

          <span>Subtotal</span>

          <strong>

            $
            {subtotal.toLocaleString("es-CO")}

          </strong>

        </div>

        <div className="flex justify-between">

          <span>Descuento</span>

          <strong>

            $
            {discount.toLocaleString("es-CO")}

          </strong>

        </div>

        <hr />

        <div className="flex justify-between text-2xl font-bold text-[#6F4E37]">

          <span>Total</span>

          <span>

            $
            {total.toLocaleString("es-CO")}

          </span>

        </div>

      </div>

    </div>
  );
}