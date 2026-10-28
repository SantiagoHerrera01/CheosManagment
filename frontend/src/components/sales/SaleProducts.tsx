import {
  Search,
  Plus,
  Minus,
  Trash2,
  Package,
  Loader2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { api, ApiError, qs } from "../../lib/api";
import type { Grind, Paginated, Product } from "../../types/api";

export type CartItem = {
  id: string;
  presentationId: string;
  productName: string;
  presentationLabel: string;
  price: number;
  quantity: number;
};

type CatalogOption = {
  presentationId: string;
  productName: string;
  productVariety: string | null;
  productProcess: string | null;
  label: string;
  grind: Grind;
  price: number;
  stock: number;
};

type SaleProductsProps = {
  items: CartItem[];
  onItemsChange: (items: CartItem[]) => void;
};

function grindLabel(grind: Grind) {
  return grind === "GRANO" ? "Grano" : "Molido";
}

function formatCurrency(value: number) {
  return value.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

/** Aplana el catálogo: cada opción del selector es un producto + presentación. */
function flattenCatalog(products: Product[]): CatalogOption[] {
  return products.flatMap((product) =>
    product.presentations
      .filter((presentation) => presentation.isActive)
      .map((presentation) => ({
        presentationId: presentation.id,
        productName: product.name,
        productVariety: product.variety,
        productProcess: product.process,
        label: presentation.label,
        grind: presentation.grind,
        price: presentation.price,
        stock: presentation.stock,
      }))
  );
}

export default function SaleProducts({
  items,
  onItemsChange,
}: SaleProductsProps) {
  const [options, setOptions] = useState<CatalogOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [selectedOption, setSelectedOption] =
    useState<CatalogOption | null>(null);

  /** Descarga y aplana el catálogo (sin tocar estado). */
  const fetchCatalog = useCallback(async () => {
    const all: Product[] = [];

    // El backend limita a 100 por página: recorremos todas las páginas.
    // Solo se vende producto TERMINADO (R5): la materia prima e insumos
    // no aparecen en el punto de venta.
    for (let page = 1; ; page += 1) {
      const result = await api.get<Paginated<Product>>(
        `/products${qs({ active: true, category: "TERMINADO", page, limit: 100 })}`
      );

      all.push(...result.data);

      if (all.length >= result.meta.total || result.data.length === 0) {
        break;
      }
    }

    return flattenCatalog(all);
  }, []);

  const loadCatalog = useCallback(() => {
    return fetchCatalog()
      .then((options) => {
        setOptions(options);
      })
      .catch((error: unknown) => {
        setLoadError(
          error instanceof ApiError
            ? error.message
            : "No fue posible cargar los productos."
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [fetchCatalog]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  /** Las presentaciones sin stock no aparecen en el selector. */
  const availableOptions = useMemo(
    () => options.filter((option) => option.stock > 0),
    [options]
  );

  const filteredOptions = useMemo(() => {
    const value = search.toLowerCase().trim();

    if (!value) {
      return availableOptions;
    }

    return availableOptions.filter(
      (option) =>
        option.productName.toLowerCase().includes(value) ||
        (option.productVariety ?? "").toLowerCase().includes(value) ||
        (option.productProcess ?? "").toLowerCase().includes(value) ||
        option.label.toLowerCase().includes(value)
    );
  }, [availableOptions, search]);

  const stockOf = (presentationId: string) =>
    options.find(
      (option) => option.presentationId === presentationId
    )?.stock ?? 0;

  const selectedStock = selectedOption
    ? stockOf(selectedOption.presentationId)
    : 0;

  const selectedInCart = selectedOption
    ? items.find(
        (item) =>
          item.presentationId === selectedOption.presentationId
      )?.quantity ?? 0
    : 0;

  const addProduct = () => {
    if (!selectedOption) {
      return;
    }

    const option = selectedOption;

    if (selectedInCart >= stockOf(option.presentationId)) {
      return;
    }

    const existingItem = items.find(
      (item) => item.presentationId === option.presentationId
    );

    if (existingItem) {
      onItemsChange(
        items.map((item) =>
          item.presentationId === option.presentationId
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
          id: option.presentationId,
          presentationId: option.presentationId,
          productName: option.productName,
          presentationLabel: `${option.label} · ${grindLabel(option.grind)}`,
          price: option.price,
          quantity: 1,
        },
      ]);
    }

    setSelectedOption(null);
    setSearch("");
  };

  const increaseQuantity = (id: string) => {
    const stock = stockOf(id);

    onItemsChange(
      items.map((item) =>
        item.id === id && item.quantity < stock
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
              setSelectedOption(null);
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

        {/* CARGANDO CATÁLOGO */}
        {loading && (

          <div
            className="
              border
              border-stone-200
              rounded-xl
              p-6
              text-center
            "
          >

            <Loader2
              size={26}
              className="mx-auto text-[#6F4E37] animate-spin"
            />

            <p className="mt-3 text-sm text-stone-500">
              Cargando productos…
            </p>

          </div>

        )}

        {/* ERROR AL CARGAR CATÁLOGO */}
        {!loading && loadError && (

          <div
            className="
              bg-red-50
              border
              border-red-200
              text-red-700
              text-sm
              rounded-xl
              px-4
              py-3
              flex
              items-center
              justify-between
              gap-3
            "
          >

            <span>{loadError}</span>

            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setLoadError(null);
                void loadCatalog();
              }}
              className="font-semibold underline shrink-0"
            >
              Reintentar
            </button>

          </div>

        )}

        {/* RESULTADOS */}
        {!loading &&
          !loadError &&
          search.trim() !== "" &&
          !selectedOption && (

          <div className="border border-stone-200 rounded-xl overflow-hidden">

            {filteredOptions.map((option) => {

              const meta = [option.productVariety, option.productProcess]
                .filter(Boolean)
                .join(" · ");

              return (

                <button
                  key={option.presentationId}
                  type="button"
                  onClick={() => setSelectedOption(option)}
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
                      {option.productName}
                    </p>

                    <p className="text-sm text-stone-500 mt-1">
                      {option.label} · {grindLabel(option.grind)}
                    </p>

                    {meta && (
                      <p className="text-xs text-stone-400 mt-1">
                        {meta}
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">

                    <span className="text-sm text-[#6F4E37] font-semibold">
                      {formatCurrency(option.price)}
                    </span>

                    <p className="text-xs text-stone-400 mt-1">
                      stock {option.stock}
                    </p>

                  </div>

                </button>

              );

            })}

            {filteredOptions.length === 0 && (
              <div className="p-5 text-center text-stone-500">
                No encontramos ese producto.
              </div>
            )}

          </div>

        )}

        {/* CONFIGURAR PRODUCTO */}
        {selectedOption && (

          <div className="border border-[#D9C8BB] bg-[#FAF7F4] rounded-xl p-4 sm:p-5">

            <div className="flex items-start justify-between gap-4">

              <div>
                <p className="font-bold text-stone-900">
                  {selectedOption.productName}
                </p>

                <p className="text-sm text-stone-500 mt-1">
                  {selectedOption.label} · {grindLabel(selectedOption.grind)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOption(null)}
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

                <div
                  className="
                    w-full
                    border
                    border-stone-300
                    rounded-xl
                    bg-white
                    px-4
                    py-3
                    text-stone-800
                    font-medium
                  "
                >
                  {selectedOption.label} · {grindLabel(selectedOption.grind)}
                </div>

              </div>

              {/* STOCK */}
              <div>

                <label className="block text-sm font-semibold text-stone-700 mb-2">
                  Stock disponible
                </label>

                <div
                  className="
                    w-full
                    border
                    border-stone-300
                    rounded-xl
                    bg-white
                    px-4
                    py-3
                    text-stone-800
                    font-medium
                  "
                >
                  {selectedStock} unidades
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
                  {formatCurrency(selectedOption.price)}
                </p>

              </div>

              <button
                type="button"
                onClick={addProduct}
                disabled={selectedInCart >= selectedStock}
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
                {selectedInCart >= selectedStock
                  ? "Máximo en el carrito"
                  : "Agregar producto"}
              </button>

            </div>

            {selectedInCart >= selectedStock && (
              <p className="text-sm text-red-500 mt-3">
                Solo hay {selectedStock} unidades disponibles
                de esta presentación.
              </p>
            )}

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

              {items.map((item) => {

                const stock = stockOf(item.presentationId);

                return (

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
                        {item.productName}
                      </p>

                      <p className="text-sm text-stone-500 mt-1">
                        {item.presentationLabel}
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
                        disabled={item.quantity >= stock}
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
                          disabled:opacity-40
                          disabled:cursor-not-allowed
                        "
                      >
                        <Plus size={16} />
                      </button>

                      <span className="text-xs text-stone-400">
                        stock {stock}
                      </span>

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

                );

              })}

            </div>

          </div>

        )}

      </div>

    </section>
  );
}
