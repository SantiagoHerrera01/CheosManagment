import { useState } from "react";

interface ProductSelectorProps {
  product: any;
  onClose: () => void;
  onAdd: (item: any) => void;
}

export default function ProductSelector({
  product,
  onClose,
  onAdd,
}: ProductSelectorProps) {
  const [presentation, setPresentation] = useState(
    product.presentations[0]
  );

  const [type, setType] = useState(
    product.presentations[0].types[0]
  );

  const [quantity, setQuantity] = useState(1);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

      <div className="bg-white rounded-2xl w-full max-w-md p-6">

        <h2 className="text-2xl font-bold mb-6">
          {product.name}
        </h2>

        {/* PRESENTACIÓN */}

        <div className="mb-5">

          <label className="font-semibold block mb-2">
            Presentación
          </label>

          <select
            className="w-full border rounded-xl px-4 py-3"
            value={presentation.size}
            onChange={(e) => {
              const p = product.presentations.find(
                (item: any) => item.size === e.target.value
              );

              setPresentation(p);
              setType(p.types[0]);
            }}
          >
            {product.presentations.map((p: any) => (
              <option key={p.size}>
                {p.size}
              </option>
            ))}
          </select>

        </div>

        {/* TIPO */}

        <div className="mb-5">

          <label className="font-semibold block mb-2">
            Tipo
          </label>

          <select
            className="w-full border rounded-xl px-4 py-3"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {presentation.types.map((item: string) => (
              <option key={item}>
                {item}
              </option>
            ))}
          </select>

        </div>

        {/* CANTIDAD */}

        <div className="mb-6">

          <label className="font-semibold block mb-2">
            Cantidad
          </label>

          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) =>
              setQuantity(Number(e.target.value))
            }
            className="w-full border rounded-xl px-4 py-3"
          />

        </div>

        {/* BOTONES */}

        <div className="flex justify-end gap-3">

          <button
            onClick={onClose}
            className="px-5 py-3 rounded-xl border"
          >
            Cancelar
          </button>

          <button
            onClick={() =>
              onAdd({
                id: Date.now(),

                name: product.name,

                process: product.process,

                presentation: presentation.size,

                type,

                quantity,

                price: presentation.retailPrice,
              })
            }
            className="bg-[#6F4E37] text-white px-5 py-3 rounded-xl"
          >
            Agregar
          </button>

        </div>

      </div>

    </div>
  );
}