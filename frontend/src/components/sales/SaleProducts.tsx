import {
  Search,
  Plus,
  Minus,
  Trash2,
  Package,
  ChevronDown,
} from "lucide-react";
import { useMemo, useState } from "react";

type Presentation = {
  size: string;
  cost: number;
  wholesale: number;
  retail: number | null;
};

type CatalogProduct = {
  id: number;
  name: string;
  process: string;
  presentations: Presentation[];
  types: string[];
};

type CartItem = {
  id: string;
  productId: number;
  name: string;
  size: string;
  type: string;
  price: number;
  cost: number;
  quantity: number;
};

const catalog: CatalogProduct[] = [
  {
    id: 1,
    name: "Castillo",
    process: "Suave lavado",
    presentations: [
      {
        size: "125 g",
        cost: 8036,
        wholesale: 12900,
        retail: 19900,
      },
      {
        size: "250 g",
        cost: 13552,
        wholesale: 19900,
        retail: 28000,
      },
      {
        size: "500 g",
        cost: 23995,
        wholesale: 30000,
        retail: 40000,
      },
      {
        size: "2.5 kg",
        cost: 108250,
        wholesale: 140000,
        retail: null,
      },
    ],
    types: ["Molido", "Grano"],
  },
  {
    id: 2,
    name: "Chiroso Urrao",
    process: "Exótico",
    presentations: [
      {
        size: "125 g",
        cost: 12250,
        wholesale: 17900,
        retail: 24000,
      },
      {
        size: "250 g",
        cost: 20750,
        wholesale: 28900,
        retail: 35000,
      },
    ],
    types: ["Molido", "Grano"],
  },
  {
    id: 3,
    name: "Papayo Honey",
    process: "Honey",
    presentations: [
      {
        size: "250 g",
        cost: 18250,
        wholesale: 27900,
        retail: 35000,
      },
    ],
    types: ["Molido", "Grano"],
  },
  {
    id: 4,
    name: "Bourbon Rosado Honey",
    process: "Honey",
    presentations: [
      {
        size: "250 g",
        cost: 26450,
        wholesale: 35900,
        retail: 40000,
      },
    ],
    types: ["Molido", "Grano"],
  },
  {
    id: 5,
    name: "Natural Melaza de Caña",
    process: "Natural",
    presentations: [
      {
        size: "250 g",
        cost: 26450,
        wholesale: 35900,
        retail: 40000,
      },
    ],
    types: ["Molido", "Grano"],
  },
];

type SaleProductsProps = {
  items: CartItem[];
  onItemsChange: (items: CartItem[]) => void;
};

function formatCurrency(value: number) {
  return value.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

export default function SaleProducts({
  items,
  onItemsChange,
}: SaleProductsProps) {
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] =
    useState<CatalogProduct | null>(null);

  const [selectedSize, setSelectedSize] = useState("");
  const [selectedType, setSelectedType] = useState("Molido");

  const filteredProducts = useMemo(() => {
    const value = search.toLowerCase().trim();

    if (!value) {
      return catalog;
    }

    return catalog.filter(
      (product) =>
        product.name.toLowerCase().includes(value) ||
        product.process.toLowerCase().includes(value)
    );
  }, [search]);

  const selectedPresentation = selectedProduct?.presentations.find(
    (presentation) => presentation.size === selectedSize
  );

  const price = selectedPresentation?.retail ?? 0;

  const addProduct = () => {
    if (!selectedProduct || !selectedPresentation || price <= 0) {
      return;
    }

    const itemId = `${selectedProduct.id}-${selectedPresentation.size}-${selectedType}`;

    const existingItem = items.find(
      (item) => item.id === itemId
    );

    if (existingItem) {
      onItemsChange(
        items.map((item) =>
          item.id === itemId
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        )
      );
    } else {
      onItemsChange([
        ...items,
        {
          id: itemId,
          productId: selectedProduct.id,
          name: selectedProduct.name,
          size: selectedPresentation.size,
          type: selectedType,
          price,
          cost: selectedPresentation.cost,
          quantity: 1,
        },
      ]);
    }

    setSelectedProduct(null);
    setSelectedSize("");
    setSearch("");
  };

  const increaseQuantity = (id: string) => {
    onItemsChange(
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity: item.quantity + 1,
            }
          : item
      )
    );
  };

  const decreaseQuantity = (id: string) => {
    onItemsChange(
      items
        .map((item) =>
          item.id === id
            ? {
                ...item,
                quantity: item.quantity - 1,
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (id: string) => {
    onItemsChange(
      items.filter((item) => item.id !== id)
    );
  };

  return (
    <section className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">

      {/* ENCABEZADO */}
      <div className="p-5 sm:p-6 border-b border-stone-200">

        <div className="flex items-center gap-3">

          <div className="w-10 h-10 rounded-xl bg-[#F3EDE7] text-[#6F4E37] flex items-center justify-center">
            <Package size={19} />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-stone-900">
              Productos
            </h2>

            <p className="text-sm text-stone-500">
              Agrega los productos de esta venta.
            </p>
          </div>

        </div>

      </div>

      <div className="p-5 sm:p-6 space-y-6">

        {/* BUSCADOR */}
        <div className="relative">

          <Search
            size={19}
            className="
              absolute
              left-4
              top-1/2
              -translate-y-1/2
              text-stone-400
            "
          />

          <input
            type="text"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setSelectedProduct(null);
            }}
            placeholder="Buscar producto..."
            className="
              w-full
              border
              border-stone-300
              rounded-xl
              pl-11
              pr-4
              py-3.5
              outline-none
              focus:border-[#6F4E37]
              focus:ring-2
              focus:ring-[#6F4E37]/20
            "
          />

        </div>

        {/* RESULTADOS */}
        {search.trim() !== "" && !selectedProduct && (
          <div className="border border-stone-200 rounded-xl overflow-hidden">

            {filteredProducts.map((product) => (

              <button
                key={product.id}
                type="button"
                onClick={() => {
                  setSelectedProduct(product);
                  setSelectedSize(
                    product.presentations[0]?.size ?? ""
                  );
                  setSelectedType(
                    product.types[0] ?? "Molido"
                  );
                }}
                className="
                  w-full
                  text-left
                  flex
                  items-center
                  justify-between
                  gap-4
                  px-4
                  py-4
                  border-b
                  last:border-b-0
                  border-stone-100
                  hover:bg-stone-50
                  transition
                "
              >

                <div>
                  <p className="font-semibold text-stone-800">
                    {product.name}
                  </p>

                  <p className="text-sm text-stone-500 mt-1">
                    {product.process}
                  </p>
                </div>

                <span className="text-sm text-[#6F4E37] font-semibold">
                  {product.presentations.length} presentaciones
                </span>

              </button>

            ))}

            {filteredProducts.length === 0 && (
              <div className="p-5 text-center text-stone-500">
                No encontramos ese producto.
              </div>
            )}

          </div>
        )}

        {/* CONFIGURAR PRODUCTO */}
        {selectedProduct && (

          <div className="border border-[#D9C8BB] bg-[#FAF7F4] rounded-xl p-4 sm:p-5">

            <div className="flex items-start justify-between gap-4">

              <div>
                <p className="font-bold text-stone-900">
                  {selectedProduct.name}
                </p>

                <p className="text-sm text-stone-500 mt-1">
                  {selectedProduct.process}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="text-sm text-stone-500 hover:text-stone-800"
              >
                Cancelar
              </button>

            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">

              {/* PRESENTACIÓN */}
              <div>

                <label className="block text-sm font-semibold text-stone-700 mb-2">
                  Presentación
                </label>

                <div className="relative">

                  <select
                    value={selectedSize}
                    onChange={(event) =>
                      setSelectedSize(event.target.value)
                    }
                    className="
                      w-full
                      appearance-none
                      border
                      border-stone-300
                      rounded-xl
                      bg-white
                      px-4
                      py-3
                      pr-10
                      outline-none
                      focus:border-[#6F4E37]
                    "
                  >
                    {selectedProduct.presentations.map(
                      (presentation) => (
                        <option
                          key={presentation.size}
                          value={presentation.size}
                        >
                          {presentation.size}
                        </option>
                      )
                    )}
                  </select>

                  <ChevronDown
                    size={18}
                    className="
                      absolute
                      right-3
                      top-1/2
                      -translate-y-1/2
                      pointer-events-none
                      text-stone-400
                    "
                  />

                </div>

              </div>

              {/* TIPO */}
              <div>

                <label className="block text-sm font-semibold text-stone-700 mb-2">
                  Tipo
                </label>

                <div className="grid grid-cols-2 gap-2">

                  {selectedProduct.types.map((type) => (

                    <button
                      key={type}
                      type="button"
                      onClick={() => setSelectedType(type)}
                      className={`
                        py-3
                        rounded-xl
                        border
                        font-medium
                        transition
                        ${
                          selectedType === type
                            ? "border-[#6F4E37] bg-[#6F4E37] text-white"
                            : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                        }
                      `}
                    >
                      {type}
                    </button>

                  ))}

                </div>

              </div>

            </div>

            {/* PRECIO + AGREGAR */}
            <div className="mt-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">

              <div>

                <p className="text-sm text-stone-500">
                  Precio de venta
                </p>

                <p className="text-2xl font-bold text-[#6F4E37] mt-1">
                  {selectedPresentation
                    ? formatCurrency(
                        selectedPresentation.retail ??
                          selectedPresentation.wholesale
                      )
                    : "$0"}
                </p>

              </div>

              <button
                type="button"
                onClick={addProduct}
                disabled={!selectedPresentation}
                className="
                  flex
                  items-center
                  justify-center
                  gap-2
                  bg-[#6F4E37]
                  hover:bg-[#5B3F2D]
                  disabled:bg-stone-300
                  disabled:cursor-not-allowed
                  text-white
                  px-5
                  py-3
                  rounded-xl
                  font-semibold
                  transition
                "
              >
                <Plus size={19} />
                Agregar producto
              </button>

            </div>

          </div>
        )}

        {/* CARRITO */}
        {items.length > 0 && (

          <div className="space-y-3">

            <div className="flex items-center justify-between">

              <div>
                <h3 className="font-semibold text-stone-900">
                  Productos agregados
                </h3>

                <p className="text-sm text-stone-500 mt-1">
                  {items.reduce(
                    (sum, item) => sum + item.quantity,
                    0
                  )}{" "}
                  unidades
                </p>
              </div>

              <span className="text-sm font-semibold text-stone-500">
                {items.length} productos
              </span>

            </div>

            <div className="space-y-3">

              {items.map((item) => (

                <div
                  key={item.id}
                  className="
                    border
                    border-stone-200
                    rounded-xl
                    p-4
                    flex
                    flex-col
                    sm:flex-row
                    sm:items-center
                    gap-4
                  "
                >

                  <div className="flex-1 min-w-0">

                    <p className="font-semibold text-stone-900">
                      {item.name}
                    </p>

                    <p className="text-sm text-stone-500 mt-1">
                      {item.size} · {item.type}
                    </p>

                    <p className="text-sm font-semibold text-[#6F4E37] mt-2">
                      {formatCurrency(item.price)} unidad
                    </p>

                  </div>

                  {/* CANTIDAD */}
                  <div className="flex items-center gap-3">

                    <button
                      type="button"
                      onClick={() =>
                        decreaseQuantity(item.id)
                      }
                      className="
                        w-9
                        h-9
                        rounded-lg
                        border
                        border-stone-300
                        flex
                        items-center
                        justify-center
                        hover:bg-stone-50
                      "
                    >
                      <Minus size={16} />
                    </button>

                    <span className="w-6 text-center font-semibold">
                      {item.quantity}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        increaseQuantity(item.id)
                      }
                      className="
                        w-9
                        h-9
                        rounded-lg
                        border
                        border-stone-300
                        flex
                        items-center
                        justify-center
                        hover:bg-stone-50
                      "
                    >
                      <Plus size={16} />
                    </button>

                  </div>

                  {/* TOTAL */}
                  <div className="sm:w-32 sm:text-right">

                    <p className="text-xs text-stone-400">
                      Total
                    </p>

                    <p className="font-bold text-stone-900">
                      {formatCurrency(
                        item.price * item.quantity
                      )}
                    </p>

                  </div>

                  {/* ELIMINAR */}
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="
                      w-9
                      h-9
                      rounded-lg
                      flex
                      items-center
                      justify-center
                      text-red-500
                      hover:bg-red-50
                    "
                  >
                    <Trash2 size={18} />
                  </button>

                </div>

              ))}

            </div>

          </div>

        )}

      </div>

    </section>
  );
}