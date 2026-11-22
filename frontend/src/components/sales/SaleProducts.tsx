import {
  Search,
  Plus,
  Minus,
  Trash2,
  Package,
  Loader2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";

import { api, ApiError, qs } from "../../lib/api";
import type { Grind, Paginated, Product } from "../../types/api";

export type CartItem = {
  id: string;
  presentationId: string;
  productName: string;
  presentationLabel: string;
  /** Precio regular de la presentación (nunca se pierde al alternar). */
  regularPrice: number;
  /** Precio de mayoreo si la presentación lo tiene configurado (P1-3). */
  wholesalePrice: number | null;
  /** ¿Se está cobrando el precio de mayoreo en esta línea? */
  wholesale: boolean;
  /** Precio aplicado en esta línea (regular o mayoreo). */
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
  wholesalePrice: number | null;
  stock: number;
};

type SaleProductsProps = {
  items: CartItem[];
  onItemsChange: (items: CartItem[]) => void;
};

function grindLabel(grind: Grind) {
  return grind === "GRANO" ? "Grano" : "Molido";
}

/**
 * Normaliza texto para buscar: sin tildes ni mayúsculas.
 * "Café Castillo" se encuentra escribiendo "cafe", "CAFE" o "castillo".
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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
        wholesalePrice: presentation.wholesalePrice ?? null,
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

  /** Autocomplete: lista visible, fila resaltada con teclado y clic fuera. */
  const [openList, setOpenList] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  /**
   * Modo de precio de la venta completa: "detal" o "wholesale" (P1-3).
   * Al cambiar, TODAS las líneas del carrito se reajustan al precio
   * correspondiente (las que no tengan precio de mayoreo quedan igual).
   */
  const [wholesaleMode, setWholesaleMode] = useState(false);

  const searchWrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

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
    const value = normalize(search.trim());

    if (!value) {
      // Con el campo vacío (foco en el input) muestra el catálogo completo,
      // acotado para que en móvil no se despliegue una lista gigante.
      return availableOptions.slice(0, 30);
    }

    return availableOptions.filter(
      (option) =>
        normalize(option.productName).includes(value) ||
        normalize(option.productVariety ?? "").includes(value) ||
        normalize(option.productProcess ?? "").includes(value) ||
        normalize(option.label).includes(value)
    );
  }, [availableOptions, search]);

  /** Elige una opción del autocomplete: abre el paso de configuración. */
  const selectOption = (option: CatalogOption) => {
    setSelectedOption(option);
    setOpenList(false);
    setActiveIndex(-1);
    setSearch("");
  };

  /** Navegación con teclado del autocomplete (↑ ↓ Enter Escape). */
  const handleSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpenList(true);
      setActiveIndex((current) =>
        Math.min(current + 1, filteredOptions.length - 1)
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      const option = filteredOptions[activeIndex];
      if (openList && option) {
        event.preventDefault();
        selectOption(option);
      }
      return;
    }

    if (event.key === "Escape") {
      if (openList) {
        event.stopPropagation();
        setOpenList(false);
        setActiveIndex(-1);
      }
    }
  };

  // Clic fuera del buscador → se pliega la lista de sugerencias.
  useEffect(() => {
    if (!openList) return;

    function onMouseDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !searchWrapRef.current?.contains(target) &&
        !listRef.current?.contains(target)
      ) {
        setOpenList(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [openList]);

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
          regularPrice: option.price,
          wholesalePrice: option.wholesalePrice,
          wholesale: wholesaleMode && option.wholesalePrice !== null,
          price:
            wholesaleMode && option.wholesalePrice !== null
              ? option.wholesalePrice
              : option.price,
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

  /**
   * Cambia el modo global detal / mayoreo y reprica TODAS las líneas
   * del carrito. Las líneas sin precio de mayoreo conservan su precio.
   */
  const changeWholesaleMode = (wholesale: boolean) => {
    setWholesaleMode(wholesale);
    onItemsChange(
      items.map((item) =>
        wholesale && item.wholesalePrice !== null
          ? { ...item, wholesale: true, price: item.wholesalePrice }
          : { ...item, wholesale: false, price: item.regularPrice }
      )
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

          {/* DETAL / AL POR MAYOR (global para toda la venta) */}
          <div
            role="group"
            aria-label="Precio de la venta"
            className="ml-auto flex items-center rounded-full border border-stone-200 bg-stone-100 p-1"
          >
            <button
              type="button"
              onClick={() => changeWholesaleMode(false)}
              aria-pressed={!wholesaleMode}
              className={
                !wholesaleMode
                  ? "rounded-full bg-white px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold text-stone-900 shadow-sm transition"
                  : "px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium text-stone-500 transition"
              }
            >
              Detal
            </button>

            <button
              type="button"
              onClick={() => changeWholesaleMode(true)}
              aria-pressed={wholesaleMode}
              className={
                wholesaleMode
                  ? "rounded-full bg-[#6F4E37] px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition"
                  : "px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium text-stone-500 transition"
              }
            >
              Al por mayor
            </button>
          </div>

        </div>

      </div>

      <div className="p-5 sm:p-6 space-y-6">

        {/* BUSCADOR (autocomplete) */}
        <div className="relative" ref={searchWrapRef}>

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
              setOpenList(true);
              setActiveIndex(-1);
            }}
            onFocus={() => setOpenList(true)}
            onKeyDown={handleSearchKeyDown}
            role="combobox"
            aria-expanded={openList}
            aria-controls="sale-product-list"
            aria-autocomplete="list"
            autoComplete="off"
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

        {/* RESULTADOS (autocomplete) */}
        {!loading &&
          !loadError &&
          openList &&
          !selectedOption && (

          <div
            id="sale-product-list"
            role="listbox"
            aria-label="Productos del catálogo"
            ref={listRef}
            className="border border-stone-200 rounded-xl overflow-hidden"
          >

            <div className="max-h-72 overflow-y-auto">

            {filteredOptions.map((option, index) => {

              const meta = [option.productVariety, option.productProcess]
                .filter(Boolean)
                .join(" · ");

              return (

                <button
                  key={option.presentationId}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  onClick={() => selectOption(option)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`
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
                    transition
                    ${
                      index === activeIndex
                        ? "bg-[#F3EDE7]"
                        : "hover:bg-stone-50"
                    }
                  `}
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

            </div>

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

                      {/* Referencia de los dos precios (P1-3): el activo va
                          resaltado según el modo global Detal / Al por mayor. */}
                      {item.wholesalePrice !== null && (
                        <p className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          <span
                            className={
                              !item.wholesale
                                ? "rounded-full bg-[#F3EDE7] px-2.5 py-0.5 font-semibold text-[#6F4E37]"
                                : "rounded-full px-2.5 py-0.5 text-stone-400"
                            }
                          >
                            Detal {formatCurrency(item.regularPrice)}
                          </span>

                          <span
                            className={
                              item.wholesale
                                ? "rounded-full bg-emerald-100 px-2.5 py-0.5 font-semibold text-emerald-700"
                                : "rounded-full px-2.5 py-0.5 text-stone-400"
                            }
                          >
                            Mayoreo {formatCurrency(item.wholesalePrice)}
                          </span>
                        </p>
                      )}

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
