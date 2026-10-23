import { Minus, Plus, Trash2 } from "lucide-react";
import type { InvoiceItem } from "../../hooks/useInvoice";

interface InvoiceTableProps {
  items: InvoiceItem[];
  onIncrease: (id: number) => void;
  onDecrease: (id: number) => void;
  onRemove: (id: number) => void;
}

export default function InvoiceTable({
  items,
  onIncrease,
  onDecrease,
  onRemove,
}: InvoiceTableProps) {
  return (
    <div className="bg-white rounded-2xl shadow overflow-hidden">

      <div className="px-6 py-5 border-b">

        <h2 className="text-xl font-bold">
          Factura
        </h2>

      </div>

      <div className="overflow-x-auto">

        <table className="w-full">

          <thead className="bg-gray-50">

            <tr>

              <th className="text-left px-6 py-4">
                Producto
              </th>

              <th className="text-left">
                Presentación
              </th>

              <th className="text-left">
                Tipo
              </th>

              <th className="text-center">
                Cantidad
              </th>

              <th className="text-right">
                Precio
              </th>

              <th className="text-right">
                Total
              </th>

              <th></th>

            </tr>

          </thead>

          <tbody>

            {items.length === 0 && (

              <tr>

                <td
                  colSpan={7}
                  className="py-12 text-center text-gray-400"
                >
                  No hay productos agregados.
                </td>

              </tr>

            )}

            {items.map((item) => (

              <tr
                key={item.id}
                className="border-t hover:bg-gray-50"
              >

                <td className="px-6 py-5">

                  <div className="font-semibold">
                    {item.name}
                  </div>

                  <div className="text-sm text-gray-500">
                    {item.process}
                  </div>

                </td>

                <td>
                  {item.presentation}
                </td>

                <td>

                  <span className="bg-[#F4E7DA] text-[#6F4E37] px-3 py-1 rounded-full text-sm">

                    {item.type}

                  </span>

                </td>

                <td>

                  <div className="flex justify-center items-center gap-2">

                    <button
                      onClick={() =>
                        onDecrease(item.id)
                      }
                      className="border rounded-lg p-1 hover:bg-gray-100"
                    >
                      <Minus size={16} />
                    </button>

                    <span className="w-8 text-center">
                      {item.quantity}
                    </span>

                    <button
                      onClick={() =>
                        onIncrease(item.id)
                      }
                      className="border rounded-lg p-1 hover:bg-gray-100"
                    >
                      <Plus size={16} />
                    </button>

                  </div>

                </td>

                <td className="text-right">

                  ${item.price.toLocaleString("es-CO")}

                </td>

                <td className="text-right font-semibold">

                  $
                  {(
                    item.price * item.quantity
                  ).toLocaleString("es-CO")}

                </td>

                <td className="pr-5">

                  <button
                    onClick={() =>
                      onRemove(item.id)
                    }
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={18} />
                  </button>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}