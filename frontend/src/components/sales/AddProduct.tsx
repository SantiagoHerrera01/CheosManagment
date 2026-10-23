import { useMemo, useState } from "react";
import { catalog } from "../../data/catalog";
import ProductSelector from "./ProductSelector";

interface AddProductProps {
  onAdd: (product: any) => void;
}

export default function AddProduct({ onAdd }: AddProductProps) {
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const products = useMemo(() => {
    if (!search) return catalog;

    return catalog.filter((product) =>
      product.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  return (
    <>
      <div className="bg-white rounded-2xl shadow p-6">

        <h2 className="text-xl font-bold mb-5">
          Agregar producto
        </h2>

        <input
          type="text"
          placeholder="Buscar café..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border rounded-xl px-4 py-3 mb-5 focus:outline-none focus:border-[#6F4E37]"
        />

        <div className="space-y-3 max-h-80 overflow-y-auto">

          {products.map((product) => (

            <button
              key={product.id}
              onClick={() => setSelectedProduct(product)}
              className="w-full text-left border rounded-xl p-4 hover:border-[#6F4E37] hover:bg-[#faf7f5] transition"
            >
              <div className="font-semibold text-lg">
                {product.name}
              </div>

              <div className="text-sm text-gray-500">
                {product.process}
              </div>
            </button>

          ))}

        </div>

      </div>

      {selectedProduct && (
        <ProductSelector
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAdd={(item) => {
            onAdd(item);
            setSelectedProduct(null);
          }}
        />
      )}
    </>
  );
}