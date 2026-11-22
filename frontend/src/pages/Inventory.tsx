import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Package,
  Plus,
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertTriangle,
  Ban,
  CheckCircle2,
  Factory,
  Layers,
  RotateCcw,
  ShoppingCart,
  Boxes,
  CircleDollarSign,
  SlidersHorizontal,
  Loader2,
} from "lucide-react";

import { api, ApiError, qs } from "../lib/api";
import { useAuth } from "../context/auth-context";
import Modal from "../components/ui/Modal";
import MoneyInput from "../components/ui/MoneyInput";
import Select from "../components/ui/Select";
import type {
  Grind,
  InventoryMovement,
  MovementReason,
  Paginated,
  Product,
  ProductCategory,
} from "../types/api";

type InventoryItem = {
  key: string;
  productId: string;
  presentationId: string;
  product: string;
  process: string;
  presentation: string;
  type: "Molido" | "Grano";
  cost?: number;
  price: number;
  /** Precio al por mayor (opcional): null cuando solo se vende al detal. */
  wholesalePrice: number | null;
  stock: number;
  minimumStock: number;
  active: boolean;
};

const REASON_LABELS: Record<MovementReason, string> = {
  VENTA: "Venta",
  OBSEQUIO: "Obsequio",
  PRODUCCION: "Producción",
  COMPRA: "Compra",
  DEVOLUCION: "Devolución",
  AJUSTE: "Ajuste",
  MERMA: "Merma",
};

/** Motivos que el backend acepta para una entrada manual de stock. */
const ENTRY_REASONS: { value: MovementReason; label: string }[] = [
  { value: "PRODUCCION", label: "Producción" },
  { value: "COMPRA", label: "Compra" },
  { value: "DEVOLUCION", label: "Devolución" },
  { value: "AJUSTE", label: "Ajuste" },
];

function formatCurrency(value: number) {
  return value.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

function getStockStatus(item: InventoryItem) {
  if (item.stock === 0) {
    return "agotado";
  }

  if (item.stock <= item.minimumStock) {
    return "bajo";
  }

  return "normal";
}

export default function Inventory() {
  const { hasRole } = useAuth();

  const [inventory, setInventory] =
    useState<InventoryItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState<string | null>(null);

  const [movements, setMovements] =
    useState<InventoryMovement[]>([]);

  const [movementsLoading, setMovementsLoading] =
    useState(false);

  const [movementsLoaded, setMovementsLoaded] =
    useState(false);

  const [movementsError, setMovementsError] =
    useState<string | null>(null);

  const [movementsForbidden, setMovementsForbidden] =
    useState(false);

  const [search, setSearch] = useState("");

  const [processFilter, setProcessFilter] =
    useState("Todos");

  const [stockFilter, setStockFilter] =
    useState("Todos");

  const [typeFilter, setTypeFilter] =
    useState("Todos");

  const [isMovementModalOpen, setIsMovementModalOpen] =
    useState(false);

  const [selectedKey, setSelectedKey] =
    useState("");

  const [quantity, setQuantity] = useState("");

  const [reason, setReason] =
    useState<MovementReason>("PRODUCCION");

  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);

  const [saveError, setSaveError] =
    useState<string | null>(null);

  // Autocomplete de producto en el modal de Entrada: buscar uno existente
  // o crear uno nuevo sin salir de aquí (solo admin puede crear).
  const [productQuery, setProductQuery] =
    useState("");

  const [openList, setOpenList] = useState(false);

  const [newProductMode, setNewProductMode] =
    useState(false);

  const [newProduct, setNewProduct] = useState({
    name: "",
    label: "",
    grind: "GRANO" as Grind,
    category: "TERMINADO" as ProductCategory,
    price: "",
    wholesalePrice: "",
    cost: "",
    minimumStock: "",
  });

  /** Autocomplete de presentación (250 g, 1 kg…) con opción de alta nueva. */
  const [openPresList, setOpenPresList] = useState(false);

  const searchWrapRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const presWrapRef = useRef<HTMLDivElement | null>(null);
  const presListRef = useRef<HTMLDivElement | null>(null);

  const [showMovements, setShowMovements] =
    useState(false);

  // Actualizar costo desde Inventario (P0-2 / P1-5 del to-do post-demo)
  const [isCostModalOpen, setIsCostModalOpen] =
    useState(false);

  const [costValue, setCostValue] =
    useState("");

  const [priceValue, setPriceValue] =
    useState("");

  const [wholesaleValue, setWholesaleValue] =
    useState("");

  const [costSaving, setCostSaving] =
    useState(false);

  const [costError, setCostError] =
    useState<string | null>(null);

  /** Trae los productos activos y aplana producto × presentación (sin estado). */
  const fetchInventory = useCallback(async () => {
    const all: Product[] = [];
    // El backend limita a 100 por página: recorremos todas las páginas.
    for (let page = 1; ; page += 1) {
      const result = await api.get<Paginated<Product>>(
        `/products${qs({
          active: "true",
          page,
          limit: 100,
        })}`
      );
      all.push(...result.data);
      if (all.length >= result.meta.total || result.data.length === 0) break;
    }

    const items: InventoryItem[] = [];

    for (const product of all) {
      if (!product.isActive) {
        continue;
      }

      for (const presentation of product.presentations) {
        if (!presentation.isActive) {
          continue;
        }

        items.push({
          key: presentation.id,
          productId: product.id,
          presentationId: presentation.id,
          product: product.name,
          process:
            [product.variety, product.process]
              .filter(Boolean)
              .join(" · ") || "—",
          presentation: presentation.label,
          type:
            presentation.grind === "MOLIDO"
              ? "Molido"
              : "Grano",
          cost: presentation.cost,
          price: presentation.price,
          wholesalePrice: presentation.wholesalePrice ?? null,
          stock: presentation.stock,
          minimumStock: presentation.minimumStock,
          active: presentation.isActive,
        });
      }
    }

    return items;
  }, []);

  const loadInventory = useCallback(() => {
    return fetchInventory()
      .then((items) => {
        setInventory(items);
      })
      .catch((error: unknown) => {
        setLoadError(
          error instanceof ApiError
            ? error.message
            : "No fue posible cargar el inventario."
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [fetchInventory]);

  /** Historial de movimientos (roles ADMIN, BODEGA y CONTADOR). */
  const loadMovements = useCallback(async () => {
    try {
      const all: InventoryMovement[] = [];
      for (let page = 1; ; page += 1) {
        const result = await api.get<Paginated<InventoryMovement>>(
          `/inventory/movements${qs({
            page,
            limit: 100,
          })}`
        );
        all.push(...result.data);
        if (all.length >= result.meta.total || result.data.length === 0) break;
      }
      setMovements(all);
      setMovementsLoaded(true);
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        // Rol sin permiso (p. ej. VENDEDOR): no es un error técnico.
        setMovementsForbidden(true);
        setMovementsLoaded(true);
      } else {
        setMovementsError(
          error instanceof ApiError
            ? error.message
            : "No fue posible cargar los movimientos."
        );
      }
    } finally {
      setMovementsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

  /** Carga perezosa: los movimientos se piden solo al primer expandir. */
  const toggleMovements = () => {
    const next = !showMovements;
    setShowMovements(next);

    if (next && !movementsLoaded && !movementsLoading) {
      void loadMovements();
    }
  };

  const processes = [
    "Todos",
    ...Array.from(
      new Set(inventory.map((item) => item.process))
    ),
  ];

  const filteredInventory = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLowerCase();

    return inventory.filter((item) => {
      if (!item.active) {
        return false;
      }

      if (
        normalizedSearch &&
        !item.product.toLowerCase().includes(normalizedSearch) &&
        !item.process
          .toLowerCase()
          .includes(normalizedSearch) &&
        !item.presentation
          .toLowerCase()
          .includes(normalizedSearch) &&
        !item.type.toLowerCase().includes(normalizedSearch)
      ) {
        return false;
      }

      if (
        processFilter !== "Todos" &&
        item.process !== processFilter
      ) {
        return false;
      }

      if (
        typeFilter !== "Todos" &&
        item.type !== typeFilter
      ) {
        return false;
      }

      const status = getStockStatus(item);

      if (
        stockFilter !== "Todos" &&
        status !== stockFilter
      ) {
        return false;
      }

      return true;
    });
  }, [
    inventory,
    search,
    processFilter,
    stockFilter,
    typeFilter,
  ]);

  const totalUnits = inventory
    .filter((item) => item.active)
    .reduce((total, item) => total + item.stock, 0);

  // `cost` solo lo envían los roles ADMIN y CONTADOR.
  const costsAvailable = hasRole("CONTADOR");

  const totalInventoryValue = inventory
    .filter((item) => item.active)
    .reduce(
      (total, item) =>
        total + item.stock * (item.cost ?? 0),
      0
    );

  const lowStockItems = inventory.filter(
    (item) =>
      item.active &&
      item.stock > 0 &&
      item.stock <= item.minimumStock
  );

  const outOfStockItems = inventory.filter(
    (item) =>
      item.active &&
      item.stock === 0
  );

  const selectedItem =
    inventory.find(
      (item) => item.presentationId === selectedKey
    ) ?? null;

  const openMovementModal = (item?: InventoryItem) => {
    setSelectedKey(item?.presentationId ?? "");
    setProductQuery(
      item ? `${item.product} · ${item.presentation}` : ""
    );
    setOpenList(false);
    setNewProductMode(false);
    setOpenPresList(false);
    setNewProduct({
      name: "",
      label: "",
      grind: "GRANO",
      category: "TERMINADO",
      price: "",
      wholesalePrice: "",
      cost: "",
      minimumStock: "",
    });
    setQuantity("");
    setReason("PRODUCCION");
    setNotes("");
    setSaveError(null);
    setIsMovementModalOpen(true);
  };

  const closeMovementModal = () => {
    setIsMovementModalOpen(false);
    setSelectedKey("");
    setProductQuery("");
    setOpenList(false);
    setNewProductMode(false);
    setOpenPresList(false);
    setQuantity("");
    setReason("PRODUCCION");
    setNotes("");
    setSaveError(null);
  };

  /** Opciones del autocomplete: coincide por producto, presentación o tipo.
   *  Se ignoran los "·" del texto precargado y cada token debe estar presente
   *  ("Café Castillo · 250 g" sigue filtrando bien al reabrir la lista). */
  const productOptions = useMemo(() => {
    const tokens = productQuery
      .trim()
      .toLowerCase()
      .split(/[\s·]+/)
      .filter(Boolean);

    return inventory.filter((item) => {
      if (!item.active) return false;
      if (tokens.length === 0) return true;

      const haystack = `${item.product} ${item.presentation} ${item.type}`.toLowerCase();
      return tokens.every((token) => haystack.includes(token));
    });
  }, [inventory, productQuery]);

  /** Elige una opción existente del autocomplete. */
  const pickProduct = (item: InventoryItem) => {
    setSelectedKey(item.presentationId);
    setProductQuery(`${item.product} · ${item.presentation}`);
    setOpenList(false);
    setNewProductMode(false);
  };

  /** Presentaciones ya usadas en el catálogo (para el autocomplete). */
  const presentationSuggestions = useMemo(() => {
    const query = newProduct.label.trim().toLowerCase();

    const unique = Array.from(
      new Set(
        inventory
          .filter((item) => item.active)
          .map((item) => item.presentation)
      )
    ).sort((a, b) => a.localeCompare(b, "es"));

    if (!query) return unique;

    return unique.filter((label) =>
      label.toLowerCase().includes(query)
    );
  }, [inventory, newProduct.label]);

  /** Pasa al modo "producto nuevo" con el texto escrito como nombre. */
  const startNewProduct = () => {
    const typed = productQuery.trim();
    setNewProductMode(true);
    setSelectedKey("");
    setOpenList(false);
    setOpenPresList(false);
    setNewProduct((prev) => ({
      ...prev,
      name: typed && !typed.includes(" · ") ? typed : prev.name,
    }));
  };

  // Clic fuera de los buscadores → se pliegan las listas.
  useEffect(() => {
    if (!openList && !openPresList) return;

    function onMouseDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !searchWrapRef.current?.contains(target) &&
        !listRef.current?.contains(target) &&
        !presWrapRef.current?.contains(target) &&
        !presListRef.current?.contains(target)
      ) {
        setOpenList(false);
        setOpenPresList(false);
      }
    }

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [openList, openPresList]);

  const handleMovement = async () => {
    const numericQuantity = Number(quantity);

    if (!Number.isInteger(numericQuantity) || numericQuantity <= 0) {
      setSaveError("La cantidad debe ser un número entero mayor que cero.");
      return;
    }

    // -------------------------------------------------------
    //  MODO PRODUCTO NUEVO: validar → crear → ingresar stock
    // -------------------------------------------------------
    if (newProductMode) {
      const name = newProduct.name.trim();
      const label = newProduct.label.trim();
      const price = Number(newProduct.price);
      const wholesaleRaw = newProduct.wholesalePrice.trim();
      const wholesale = wholesaleRaw === "" ? null : Number(wholesaleRaw);
      const cost = newProduct.cost.trim() === "" ? 0 : Number(newProduct.cost);
      const minimumStock =
        newProduct.minimumStock.trim() === ""
          ? 0
          : Number(newProduct.minimumStock);

      if (name.length < 2) {
        setSaveError("El nombre del producto debe tener al menos 2 letras.");
        return;
      }
      if (label.length < 1 || label.length > 30) {
        setSaveError("Indica la presentación (ej. 250 g), máximo 30 caracteres.");
        return;
      }
      if (!Number.isFinite(price) || price <= 0) {
        setSaveError("El precio al detal debe ser mayor que cero.");
        return;
      }
      if (
        wholesale !== null &&
        (!Number.isFinite(wholesale) || wholesale <= 0)
      ) {
        setSaveError("El precio al por mayor debe ser mayor que cero (o déjalo vacío).");
        return;
      }
      if (wholesale !== null && wholesale >= price) {
        setSaveError("El precio al por mayor debe ser menor que el precio al detal.");
        return;
      }
      if (!Number.isFinite(cost) || cost < 0) {
        setSaveError("El costo debe ser un número mayor o igual a cero.");
        return;
      }
      if (!Number.isInteger(minimumStock) || minimumStock < 0) {
        setSaveError("El stock mínimo debe ser un número entero mayor o igual a cero.");
        return;
      }

      setSaving(true);
      setSaveError(null);

      try {
        const created = await api.post<Product>("/products", {
          name,
          category: newProduct.category,
          presentations: [
            {
              label,
              grind: newProduct.grind,
              price,
              wholesalePrice: wholesale,
              cost,
              stock: 0,
              minimumStock,
            },
          ],
        });

        const presentation =
          created.presentations.find((p) => p.label === label) ??
          created.presentations[0];

        await api.post(
          `/products/${created.id}/presentations/${presentation.id}/stock`,
          {
            quantity: numericQuantity,
            reason,
            notes: notes.trim() || null,
          }
        );

        closeMovementModal();
        await loadInventory();

        if (movementsLoaded) {
          await loadMovements();
        }
      } catch (error) {
        setSaveError(
          error instanceof ApiError
            ? error.message
            : "No fue posible crear el producto y registrar la entrada."
        );
      } finally {
        setSaving(false);
      }

      return;
    }

    // -------------------------------------------------------
    //  MODO PRODUCTO EXISTENTE
    // -------------------------------------------------------
    if (!selectedItem) {
      setSaveError("Selecciona un producto o crea uno nuevo.");
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      await api.post(
        `/products/${selectedItem.productId}/presentations/${selectedItem.presentationId}/stock`,
        {
          quantity: numericQuantity,
          reason,
          notes: notes.trim() || null,
        }
      );

      closeMovementModal();
      await loadInventory();

      // Si el panel ya estaba cargado se refresca;
      // si no, se carga en el próximo expandir.
      if (movementsLoaded) {
        await loadMovements();
      }
    } catch (error) {
      setSaveError(
        error instanceof ApiError
          ? error.message
          : "No fue posible registrar la entrada."
      );
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------
  //  Actualizar costo y precios desde Inventario (P0-2 / P1-5)
  //  Usa el PATCH /products/:id/presentations/:presentationId (solo admin).
  // ---------------------------------------------------------
  const openCostModal = (item: InventoryItem) => {
    setSelectedKey(item.presentationId);
    setCostValue(
      item.cost !== undefined ? String(item.cost) : ""
    );
    setPriceValue(String(item.price));
    setWholesaleValue(
      item.wholesalePrice !== null
        ? String(item.wholesalePrice)
        : ""
    );
    setCostError(null);
    setIsCostModalOpen(true);
  };

  const closeCostModal = () => {
    setIsCostModalOpen(false);
    setSelectedKey("");
    setCostValue("");
    setPriceValue("");
    setWholesaleValue("");
    setCostError(null);
  };

  const handleCostSave = async () => {
    if (!selectedItem) {
      return;
    }

    const numericCost = Number(costValue);
    const numericPrice = Number(priceValue);
    const wholesaleRaw = wholesaleValue.trim();
    const numericWholesale = wholesaleRaw === "" ? null : Number(wholesaleRaw);

    if (!Number.isFinite(numericCost) || numericCost < 0) {
      setCostError(
        "El costo debe ser un número mayor o igual a cero."
      );
      return;
    }

    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      setCostError(
        "El precio al detal debe ser mayor que cero."
      );
      return;
    }

    if (
      numericWholesale !== null &&
      (!Number.isFinite(numericWholesale) || numericWholesale <= 0)
    ) {
      setCostError(
        "El precio al por mayor debe ser mayor que cero (o déjalo vacío)."
      );
      return;
    }

    if (
      numericWholesale !== null &&
      numericWholesale >= numericPrice
    ) {
      setCostError(
        "El precio al por mayor debe ser menor que el precio al detal."
      );
      return;
    }

    setCostSaving(true);
    setCostError(null);

    try {
      await api.patch(
        `/products/${selectedItem.productId}/presentations/${selectedItem.presentationId}`,
        {
          cost: numericCost,
          price: numericPrice,
          // null elimina el precio de mayoreo (lo deja solo al detal).
          wholesalePrice: numericWholesale,
        }
      );

      closeCostModal();
      await loadInventory();
    } catch (error) {
      setCostError(
        error instanceof ApiError
          ? error.message
          : "No fue posible actualizar los precios."
      );
    } finally {
      setCostSaving(false);
    }
  };

  return (
    <div className="space-y-7">

      {/* ENCABEZADO */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

        <div>
          <h1 className="text-3xl font-bold text-stone-800">
            Inventario
          </h1>

          <p className="text-stone-500 mt-2">
            Controla existencias, costos y movimientos de tus productos.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">

          <button
            type="button"
            disabled
            title="Las salidas se registran automáticamente al facturar"
            className="
              inline-flex
              items-center
              gap-2
              px-4
              py-3
              rounded-xl
              border
              border-stone-300
              bg-white
              text-stone-700
              font-semibold
              hover:bg-stone-50
              transition
              opacity-40
              cursor-not-allowed
            "
          >
            <ArrowUpFromLine size={18} />
            Salida
          </button>

          <button
            type="button"
            onClick={() =>
              openMovementModal()
            }
            className="
              inline-flex
              items-center
              gap-2
              px-5
              py-3
              rounded-xl
              bg-[#6F4E37]
              hover:bg-[#5B3F2D]
              text-white
              font-semibold
              transition
            "
          >
            <Plus size={19} />
            Entrada
          </button>

        </div>

      </div>

      {/* TARJETAS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">

        <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-sm">

          <div className="flex justify-between items-start">

            <div>
              <p className="text-xs sm:text-sm text-stone-500 truncate">
                Referencias
              </p>

              <p className="text-lg sm:text-2xl font-bold text-stone-800 mt-1.5 sm:mt-2 truncate">
                {inventory.length}
              </p>
            </div>

            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-[#F3EDE7] text-[#6F4E37] flex items-center justify-center shrink-0">
              <Package size={18} />
            </div>

          </div>

          <p className="text-xs text-stone-400 mt-3">
            Productos y presentaciones
          </p>

        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-sm">

          <div className="flex justify-between items-start">

            <div>
              <p className="text-xs sm:text-sm text-stone-500 truncate">
                Unidades disponibles
              </p>

              <p className="text-lg sm:text-2xl font-bold text-stone-800 mt-1.5 sm:mt-2 truncate">
                {totalUnits}
              </p>
            </div>

            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Boxes size={18} />
            </div>

          </div>

          <p className="text-xs text-stone-400 mt-3">
            Existencias actuales
          </p>

        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-sm">

          <div className="flex justify-between items-start">

            <div>
              <p className="text-xs sm:text-sm text-stone-500 truncate">
                Valor del inventario
              </p>

              <p className="text-lg sm:text-2xl font-bold text-stone-800 mt-1.5 sm:mt-2 truncate">
                {formatCurrency(
                  costsAvailable
                    ? totalInventoryValue
                    : 0
                )}
              </p>
            </div>

            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
              <CircleDollarSign size={18} />
            </div>

          </div>

          <p className="text-xs text-stone-400 mt-3">
            {costsAvailable
              ? "Calculado al costo de producción"
              : "Costo no disponible para tu rol"}
          </p>

        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-sm">

          <div className="flex justify-between items-start">

            <div>
              <p className="text-sm text-stone-500">
                Requieren atención
              </p>

              <p className="text-lg sm:text-2xl font-bold text-red-600 mt-1.5 sm:mt-2 truncate">
                {lowStockItems.length +
                  outOfStockItems.length}
              </p>
            </div>

            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
              <AlertTriangle size={18} />
            </div>

          </div>

          <p className="text-xs text-red-500 mt-3">
            Stock bajo o agotado
          </p>

        </div>

      </div>

      {/* ALERTA STOCK */}
      {(lowStockItems.length > 0 ||
        outOfStockItems.length > 0) && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-5">

          <div className="flex items-start gap-4">

            <div className="w-10 h-10 rounded-xl bg-white text-red-600 flex items-center justify-center shrink-0">
              <AlertTriangle size={20} />
            </div>

            <div>
              <h2 className="font-semibold text-red-800">
                Hay productos que requieren atención
              </h2>

              <p className="text-sm text-red-600 mt-1">
                {outOfStockItems.length > 0 &&
                  `${outOfStockItems.length} agotado(s). `}
                {lowStockItems.length > 0 &&
                  `${lowStockItems.length} con stock bajo.`}
              </p>
            </div>

          </div>

        </div>
      )}

      {/* FILTROS + TABLA */}
      <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">

        {/* FILTROS */}
        <div className="p-5 border-b border-stone-200">

          <div className="flex items-center gap-2 mb-4">

            <SlidersHorizontal
              size={18}
              className="text-[#6F4E37]"
            />

            <h2 className="font-semibold text-stone-800">
              Inventario de productos
            </h2>

          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">

            {/* BUSCAR */}
            <div className="relative col-span-2 lg:col-span-2">

              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Buscar producto..."
                className="
                  w-full
                  border
                  border-stone-300
                  rounded-xl
                  py-3
                  pl-11
                  pr-4
                  outline-none
                  focus:ring-2
                  focus:ring-[#6F4E37]/20
                  focus:border-[#6F4E37]
                "
              />

            </div>

            {/* PROCESO */}
            <Select
              value={processFilter}
              onChange={(value) =>
                setProcessFilter(
                  value
                )
              }
              aria-label="Filtrar por proceso"
              options={processes.map((process) => ({
                value: process,
                label: process === "Todos" ? "Todos los procesos" : process,
                icon: Factory,
              }))}
            />

            {/* TIPO */}
            <Select
              value={typeFilter}
              onChange={(value) =>
                setTypeFilter(
                  value
                )
              }
              aria-label="Filtrar por tipo"
              options={[
                { value: "Todos", label: "Todos los tipos", icon: Layers },
                { value: "Molido", label: "Molido", icon: Package },
                { value: "Grano", label: "Grano", icon: Boxes },
              ]}
            />

            {/* STOCK */}
            <Select
              value={stockFilter}
              onChange={(value) =>
                setStockFilter(
                  value
                )
              }
              aria-label="Filtrar por stock"
              options={[
                { value: "Todos", label: "Todo el stock", icon: Layers },
                { value: "normal", label: "Stock normal", icon: CheckCircle2 },
                { value: "bajo", label: "Stock bajo", icon: AlertTriangle },
                { value: "agotado", label: "Agotados", icon: Ban },
              ]}
            />

          </div>

        </div>

        {/* ERROR DE CARGA */}
        {loadError && (
          <div className="px-6 py-4 bg-red-50 border-b border-stone-200 text-sm text-red-600 flex items-center justify-between gap-3">
            <span>{loadError}</span>

            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setLoadError(null);
                void loadInventory();
              }}
              className="font-semibold underline shrink-0"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* TABLA */}
        <div className="overflow-x-auto">

          <table className="w-full min-w-[1250px]">

            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">

                <th className="text-left px-6 py-4 text-xs font-semibold text-stone-500 uppercase">
                  Producto
                </th>

                <th className="text-left px-6 py-4 text-xs font-semibold text-stone-500 uppercase">
                  Presentación
                </th>

                <th className="text-center px-6 py-4 text-xs font-semibold text-stone-500 uppercase">
                  Stock
                </th>

                <th className="text-right px-6 py-4 text-xs font-semibold text-stone-500 uppercase">
                  Costo
                </th>

                <th className="text-right px-6 py-4 text-xs font-semibold text-stone-500 uppercase">
                  Precio detal
                </th>

                <th className="text-right px-6 py-4 text-xs font-semibold text-stone-500 uppercase">
                  Precio mayoreo
                </th>

                <th className="text-right px-6 py-4 text-xs font-semibold text-stone-500 uppercase">
                  Valor
                </th>

                <th className="text-center px-6 py-4 text-xs font-semibold text-stone-500 uppercase">
                  Estado
                </th>

                <th className="text-right px-6 py-4 text-xs font-semibold text-stone-500 uppercase">
                  Acciones
                </th>

              </tr>
            </thead>

            <tbody>

              {loading ? (
                <tr>

                  <td
                    colSpan={9}
                    className="px-6 py-16 text-center"
                  >
                    <Loader2
                      size={30}
                      className="mx-auto text-[#6F4E37] animate-spin"
                    />

                    <p className="mt-3 text-sm text-stone-500">
                      Cargando inventario…
                    </p>
                  </td>

                </tr>
              ) : filteredInventory.length === 0 ? (
                <tr>

                  <td
                    colSpan={9}
                    className="px-6 py-16 text-center"
                  >

                    <Package
                      size={40}
                      className="mx-auto text-stone-300"
                    />

                    <p className="font-medium text-stone-700 mt-3">
                      No encontramos productos
                    </p>

                    <p className="text-sm text-stone-400 mt-1">
                      Cambia los filtros o la búsqueda.
                    </p>

                  </td>

                </tr>
              ) : (
                filteredInventory.map((item) => {

                  const status =
                    getStockStatus(item);

                  return (
                    <tr
                      key={item.key}
                      className="
                        border-b
                        border-stone-100
                        last:border-0
                        hover:bg-stone-50
                        transition
                      "
                    >

                      {/* PRODUCTO */}
                      <td className="px-6 py-5">

                        <div className="flex items-center gap-3">

                          <div className="w-10 h-10 rounded-xl bg-[#F3EDE7] text-[#6F4E37] flex items-center justify-center shrink-0">
                            <Package size={18} />
                          </div>

                          <div>

                            <p className="font-semibold text-stone-800">
                              {item.product}
                            </p>

                            <p className="text-xs text-stone-500 mt-1">
                              {item.process}
                            </p>

                          </div>

                        </div>

                      </td>

                      {/* PRESENTACIÓN */}
                      <td className="px-6 py-5">

                        <p className="text-sm font-medium text-stone-700">
                          {item.presentation}
                        </p>

                        <span className="inline-flex mt-1 px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 text-xs">
                          {item.type}
                        </span>

                      </td>

                      {/* STOCK */}
                      <td className="px-6 py-5 text-center">

                        <p
                          className={
                            status === "agotado"
                              ? "text-red-600 font-bold text-lg"
                              : status === "bajo"
                              ? "text-orange-600 font-bold text-lg"
                              : "text-stone-800 font-bold text-lg"
                          }
                        >
                          {item.stock}
                        </p>

                        <p className="text-xs text-stone-400">
                          mínimo {item.minimumStock}
                        </p>

                      </td>

                      {/* COSTO */}
                      <td className="px-6 py-5 text-right">

                        {item.cost !== undefined ? (
                          <span className="text-sm text-stone-700">
                            {formatCurrency(
                              item.cost
                            )}
                          </span>
                        ) : (
                          <span className="text-xs text-stone-400">
                            No disponible
                          </span>
                        )}

                      </td>

                      {/* PRECIO DETAL */}
                      <td className="px-6 py-5 text-right">

                        <span className="text-sm text-stone-700">
                          {formatCurrency(
                            item.price
                          )}
                        </span>

                      </td>

                      {/* PRECIO MAYOREO */}
                      <td className="px-6 py-5 text-right">

                        {item.wholesalePrice !== null ? (
                          <span className="text-sm text-stone-700">
                            {formatCurrency(
                              item.wholesalePrice
                            )}
                          </span>
                        ) : (
                          <span className="text-xs text-stone-400">
                            —
                          </span>
                        )}

                      </td>

                      {/* VALOR INVENTARIO */}
                      <td className="px-6 py-5 text-right">

                        <span className="text-sm font-semibold text-stone-800">
                          {formatCurrency(
                            item.stock *
                              (item.cost ?? 0)
                          )}
                        </span>

                      </td>

                      {/* ESTADO */}
                      <td className="px-6 py-5 text-center">

                        {status === "normal" && (
                          <span className="inline-flex px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                            Normal
                          </span>
                        )}

                        {status === "bajo" && (
                          <span className="inline-flex px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-medium">
                            Stock bajo
                          </span>
                        )}

                        {status === "agotado" && (
                          <span className="inline-flex px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                            Agotado
                          </span>
                        )}

                      </td>

                      {/* ACCIONES */}
                      <td className="px-6 py-5">

                        <div className="flex justify-end items-center gap-1">

                          {hasRole("ADMIN") && (
                            <button
                              type="button"
                              onClick={() =>
                                openCostModal(
                                  item
                                )
                              }
                              title="Actualizar costo y precios"
                              className="
                                w-9
                                h-9
                                rounded-lg
                                flex
                                items-center
                                justify-center
                                text-stone-600
                                hover:bg-stone-100
                                transition
                              "
                            >
                              <CircleDollarSign
                                size={17}
                              />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              openMovementModal(
                                item
                              )
                            }
                            title="Registrar entrada"
                            className="
                              w-9
                              h-9
                              rounded-lg
                              flex
                              items-center
                              justify-center
                              text-green-600
                              hover:bg-green-50
                              transition
                            "
                          >
                            <ArrowDownToLine
                              size={17}
                            />
                          </button>

                          <button
                            type="button"
                            disabled
                            title="Las salidas se registran automáticamente al facturar"
                            className="
                              w-9
                              h-9
                              rounded-lg
                              flex
                              items-center
                              justify-center
                              text-orange-600
                              hover:bg-orange-50
                              transition
                              opacity-40
                              cursor-not-allowed
                            "
                          >
                            <ArrowUpFromLine
                              size={17}
                            />
                          </button>

                        </div>

                      </td>

                    </tr>
                  );
                })
              )}

            </tbody>

          </table>

        </div>

      </div>

      {/* MOVIMIENTOS */}
      <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">

        <button
          type="button"
          onClick={toggleMovements}
          className="
            w-full
            px-6
            py-5
            flex
            items-center
            justify-between
            hover:bg-stone-50
            transition
          "
        >

          <div className="text-left">

            <h2 className="font-semibold text-stone-800">
              Últimos movimientos
            </h2>

            <p className="text-sm text-stone-500 mt-1">
              Historial reciente del inventario
            </p>

          </div>

          <span className="text-sm font-medium text-[#6F4E37]">
            {showMovements
              ? "Ocultar"
              : "Ver movimientos"}
          </span>

        </button>

        {showMovements && (
          <div className="border-t border-stone-200">

            {movementsLoading ? (

              <div className="px-6 py-10 text-center">
                <Loader2
                  size={26}
                  className="mx-auto text-[#6F4E37] animate-spin"
                />

                <p className="mt-3 text-sm text-stone-500">
                  Cargando movimientos…
                </p>
              </div>

            ) : movementsForbidden ? (

              <div className="px-6 py-8 text-center">
                <p className="text-sm text-stone-500">
                  Tu rol no tiene acceso al historial de movimientos.
                </p>
              </div>

            ) : movementsError ? (

              <div className="px-6 py-4 bg-red-50 text-sm text-red-600 flex items-center justify-between gap-3">
                <span>{movementsError}</span>

                <button
                  type="button"
                  onClick={() => {
                    setMovementsLoading(true);
                    setMovementsError(null);
                    setMovementsForbidden(false);
                    void loadMovements();
                  }}
                  className="font-semibold underline shrink-0"
                >
                  Reintentar
                </button>
              </div>

            ) : movements.length === 0 ? (

              <div className="px-6 py-8 text-center">
                <p className="text-sm text-stone-500">
                  Aún no hay movimientos registrados.
                </p>
              </div>

            ) : (

              movements.map((movement) => (

                <div
                  key={movement.id}
                  className="px-6 py-4 border-b border-stone-100 last:border-0 flex items-center justify-between gap-4"
                >

                  <div className="flex items-center gap-3">

                    <div
                      className={
                        movement.type === "ENTRADA"
                          ? "w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center"
                          : movement.type === "SALIDA"
                          ? "w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center"
                          : "w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"
                      }
                    >
                      {movement.type ===
                        "ENTRADA" && (
                        <ArrowDownToLine size={18} />
                      )}

                      {movement.type ===
                        "SALIDA" && (
                        <ArrowUpFromLine size={18} />
                      )}

                      {movement.type ===
                        "AJUSTE" && (
                        <SlidersHorizontal size={18} />
                      )}
                    </div>

                    <div>

                      <p className="font-medium text-stone-800">
                        {movement.product}
                      </p>

                      <p className="text-xs text-stone-500 mt-1">
                        {movement.presentation}
                      </p>

                      <p className="text-xs text-stone-400 mt-1">
                        {REASON_LABELS[movement.reason] ??
                          movement.reason} ·{" "}
                        {movement.createdBy} ·{" "}
                        {new Date(
                          movement.createdAt
                        ).toLocaleString("es-CO")}
                      </p>

                    </div>

                  </div>

                  <div
                    className={
                      movement.type === "ENTRADA"
                        ? "font-bold text-green-600"
                        : movement.type === "SALIDA"
                        ? "font-bold text-orange-600"
                        : "font-bold text-blue-600"
                    }
                  >
                    {movement.type ===
                      "ENTRADA" &&
                      `+${movement.quantity}`}

                    {movement.type ===
                      "SALIDA" &&
                      `−${Math.abs(movement.quantity)}`}

                    {movement.type ===
                      "AJUSTE" &&
                      movement.quantity}
                  </div>

                </div>

              ))

            )}

          </div>
        )}

      </div>

      {/* MODAL MOVIMIENTO */}
      {isMovementModalOpen && (
        <Modal
          icon={ArrowDownToLine}
          title="Registrar entrada"
          subtitle="Busca un producto existente o créalo nuevo."
          onClose={closeMovementModal}
          size="md"
          footer={
            <div className="flex justify-end gap-3">

              <button
                type="button"
                onClick={closeMovementModal}
                disabled={saving}
                className="
                  px-5
                  py-3
                  rounded-xl
                  border
                  border-stone-300
                  text-stone-700
                  font-medium
                  hover:bg-stone-50
                  disabled:opacity-40
                  disabled:cursor-not-allowed
                "
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => void handleMovement()}
                disabled={
                  (!newProductMode && !selectedItem) ||
                  (newProductMode &&
                    (newProduct.name.trim().length < 2 ||
                      newProduct.label.trim().length < 1 ||
                      newProduct.price.trim() === "" ||
                      Number(newProduct.price) <= 0)) ||
                  !Number.isInteger(Number(quantity)) ||
                  Number(quantity) <= 0 ||
                  saving
                }
                className="
                  inline-flex
                  items-center
                  gap-2
                  px-5
                  py-3
                  rounded-xl
                  bg-[#6F4E37]
                  hover:bg-[#5B3F2D]
                  disabled:opacity-40
                  disabled:cursor-not-allowed
                  text-white
                  font-semibold
                "
              >
                {saving && (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                )}

                {saving
                  ? "Registrando…"
                  : "Registrar entrada"}
              </button>

            </div>
          }
        >

          <div className="space-y-5">

            {/* ERROR */}
            {saveError && (
              <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
                {saveError}
              </div>
            )}

            {/* PRODUCTO (autocomplete o producto nuevo) */}
            <div>

              <div className="flex items-center justify-between gap-3 mb-2">
                <label className="block text-sm font-medium text-stone-700">
                  Producto
                </label>

                {hasRole("ADMIN") && !newProductMode && (
                  <button
                    type="button"
                    onClick={startNewProduct}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6F4E37] hover:text-[#5A3E2B]"
                  >
                    <Plus size={15} />
                    Crear producto
                  </button>
                )}
              </div>

              {!newProductMode ? (
                <div ref={searchWrapRef} className="relative">

                  <input
                    type="text"
                    role="combobox"
                    aria-expanded={openList}
                    aria-controls="entry-product-list"
                    autoComplete="off"
                    value={productQuery}
                    onChange={(event) => {
                      setProductQuery(event.target.value);
                      setSelectedKey("");
                      setOpenList(true);
                    }}
                    onFocus={() => setOpenList(true)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        setOpenList(false);
                      }
                      if (event.key === "Enter" && openList && productOptions[0]) {
                        event.preventDefault();
                        pickProduct(productOptions[0]);
                      }
                    }}
                    placeholder="Escribe para buscar un producto…"
                    className="
                      w-full
                      border
                      border-stone-300
                      rounded-xl
                      px-4
                      py-3
                      outline-none
                      focus:border-[#6F4E37]
                      focus:ring-2
                      focus:ring-[#6F4E37]/20
                    "
                  />

                  {openList && (
                    <div
                      id="entry-product-list"
                      ref={listRef}
                      className="
                        absolute
                        z-20
                        mt-1
                        w-full
                        max-h-56
                        overflow-y-auto
                        rounded-xl
                        border
                        border-stone-200
                        bg-white
                        shadow-lg
                        py-1
                      "
                    >
                      {productOptions.slice(0, 30).map((item) => (
                        <button
                          key={item.presentationId}
                          type="button"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            pickProduct(item);
                          }}
                          className="
                            w-full
                            text-left
                            px-4
                            py-2.5
                            text-sm
                            hover:bg-stone-50
                            flex
                            items-center
                            justify-between
                            gap-3
                          "
                        >
                          <span className="min-w-0">
                            <span className="font-medium text-stone-800 block truncate">
                              {item.product}
                            </span>
                            <span className="text-xs text-stone-500">
                              {item.presentation} · {item.type}
                            </span>
                          </span>

                          <span className="text-xs text-stone-400 shrink-0">
                            {item.stock} und
                          </span>
                        </button>
                      ))}

                      {productOptions.length === 0 && (
                        <p className="px-4 py-3 text-sm text-stone-500">
                          Sin resultados para “{productQuery.trim()}”.
                        </p>
                      )}

                    </div>
                  )}

                </div>
              ) : (

                <div className="space-y-4 rounded-xl bg-stone-50 border border-stone-200 p-4">

                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-stone-700">
                      Nuevo producto
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        setNewProductMode(false);
                        setProductQuery("");
                        setOpenPresList(false);
                        setNewProduct({
                          name: "",
                          label: "",
                          grind: "GRANO",
                          category: "TERMINADO",
                          price: "",
                          wholesalePrice: "",
                          cost: "",
                          minimumStock: "",
                        });
                      }}
                      className="text-xs font-semibold text-[#6F4E37] hover:text-[#5A3E2B]"
                    >
                      Volver a buscar
                    </button>
                  </div>

                  {/* NOMBRE */}
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1.5">
                      Nombre *
                    </label>

                    <input
                      type="text"
                      value={newProduct.name}
                      onChange={(event) =>
                        setNewProduct({ ...newProduct, name: event.target.value })
                      }
                      placeholder="Ej. Café Castillo"
                      className="
                        w-full
                        border
                        border-stone-300
                        rounded-xl
                        px-4
                        py-2.5
                        text-sm
                        outline-none
                        bg-white
                        focus:border-[#6F4E37]
                        focus:ring-2
                        focus:ring-[#6F4E37]/20
                      "
                    />
                  </div>

                  {/* TIPO + CATEGORÍA */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1.5">
                        Tipo
                      </label>

                      <Select
                        value={newProduct.grind}
                        onChange={(value) =>
                          setNewProduct({
                            ...newProduct,
                            grind: value as Grind,
                          })
                        }
                        aria-label="Tipo"
                        options={[
                          { value: "GRANO", label: "Grano", icon: Boxes },
                          { value: "MOLIDO", label: "Molido", icon: Package },
                        ]}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1.5">
                        Categoría
                      </label>

                      <Select
                        value={newProduct.category}
                        onChange={(value) =>
                          setNewProduct({
                            ...newProduct,
                            category: value as ProductCategory,
                          })
                        }
                        aria-label="Categoría"
                        options={[
                          { value: "TERMINADO", label: "Para venta", icon: Package },
                          { value: "MATERIA_PRIMA", label: "Materia prima", icon: Layers },
                          { value: "INSUMO", label: "Insumo / empaque", icon: Boxes },
                        ]}
                      />
                    </div>
                  </div>

                  {/* PRESENTACIÓN (autocomplete + alta nueva) */}
                  <div ref={presWrapRef} className="relative">

                    <label className="block text-xs font-medium text-stone-600 mb-1.5">
                      Presentación *
                    </label>

                    <input
                      type="text"
                      role="combobox"
                      aria-expanded={openPresList}
                      aria-controls="entry-pres-list"
                      autoComplete="off"
                      value={newProduct.label}
                      onChange={(event) => {
                        setNewProduct({
                          ...newProduct,
                          label: event.target.value,
                        });
                        setOpenPresList(true);
                      }}
                      onFocus={() => setOpenPresList(true)}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") {
                          setOpenPresList(false);
                        }
                        if (
                          event.key === "Enter" &&
                          openPresList &&
                          presentationSuggestions[0]
                        ) {
                          event.preventDefault();
                          setNewProduct({
                            ...newProduct,
                            label: presentationSuggestions[0],
                          });
                          setOpenPresList(false);
                        }
                      }}
                      placeholder="Ej. 250 g, 1 kg, 500 g…"
                      className="
                        w-full
                        border
                        border-stone-300
                        rounded-xl
                        px-4
                        py-2.5
                        text-sm
                        outline-none
                        bg-white
                        focus:border-[#6F4E37]
                        focus:ring-2
                        focus:ring-[#6F4E37]/20
                      "
                    />

                    {openPresList && (
                      <div
                        id="entry-pres-list"
                        ref={presListRef}
                        className="
                          absolute
                          z-20
                          mt-1
                          w-full
                          max-h-44
                          overflow-y-auto
                          rounded-xl
                          border
                          border-stone-200
                          bg-white
                          shadow-lg
                          py-1
                        "
                      >
                        {presentationSuggestions.map((label) => (
                          <button
                            key={label}
                            type="button"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              setNewProduct({ ...newProduct, label });
                              setOpenPresList(false);
                            }}
                            className="
                              w-full
                              text-left
                              px-4
                              py-2
                              text-sm
                              text-stone-700
                              hover:bg-stone-50
                            "
                          >
                            {label}
                          </button>
                        ))}

                        {presentationSuggestions.length === 0 && (
                          <p className="px-4 py-2.5 text-sm text-stone-500">
                            Sin coincidencias.
                          </p>
                        )}

                        {newProduct.label.trim().length >= 1 && (
                          <button
                            type="button"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              setOpenPresList(false);
                            }}
                            className="
                              w-full
                              text-left
                              px-4
                              py-2.5
                              text-sm
                              font-semibold
                              text-[#6F4E37]
                              hover:bg-[#F3EDE7]
                              border-t
                              border-stone-100
                              flex
                              items-center
                              gap-2
                            "
                          >
                            <Plus size={15} />
                            Usar presentación “{newProduct.label.trim()}”
                          </button>
                        )}
                      </div>
                    )}

                    <p className="text-xs text-stone-400 mt-1.5">
                      Elige una existente o escribe una nueva.
                    </p>

                  </div>

                  {/* PRECIOS */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1.5">
                        Precio al detal *
                      </label>

                      <MoneyInput
                        value={newProduct.price}
                        onChange={(raw) =>
                          setNewProduct({ ...newProduct, price: raw })
                        }
                        placeholder="0"
                        className="
                          w-full
                          border
                          border-stone-300
                          rounded-xl
                          px-4
                          py-2.5
                          text-sm
                          outline-none
                          bg-white
                          focus:border-[#6F4E37]
                          focus:ring-2
                          focus:ring-[#6F4E37]/20
                        "
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1.5">
                        Precio al por mayor
                      </label>

                      <MoneyInput
                        value={newProduct.wholesalePrice}
                        onChange={(raw) =>
                          setNewProduct({ ...newProduct, wholesalePrice: raw })
                        }
                        placeholder="Opcional"
                        className="
                          w-full
                          border
                          border-stone-300
                          rounded-xl
                          px-4
                          py-2.5
                          text-sm
                          outline-none
                          bg-white
                          focus:border-[#6F4E37]
                          focus:ring-2
                          focus:ring-[#6F4E37]/20
                        "
                      />
                    </div>
                  </div>

                  {/* COSTO + STOCK MÍNIMO */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1.5">
                        Costo
                      </label>

                      <MoneyInput
                        value={newProduct.cost}
                        onChange={(raw) =>
                          setNewProduct({ ...newProduct, cost: raw })
                        }
                        placeholder="0"
                        className="
                          w-full
                          border
                          border-stone-300
                          rounded-xl
                          px-4
                          py-2.5
                          text-sm
                          outline-none
                          bg-white
                          focus:border-[#6F4E37]
                          focus:ring-2
                          focus:ring-[#6F4E37]/20
                        "
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1.5">
                        Stock mínimo
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={newProduct.minimumStock}
                        onChange={(event) =>
                          setNewProduct({
                            ...newProduct,
                            minimumStock: event.target.value,
                          })
                        }
                        placeholder="0"
                        className="
                          w-full
                          border
                          border-stone-300
                          rounded-xl
                          px-4
                          py-2.5
                          text-sm
                          outline-none
                          bg-white
                          focus:border-[#6F4E37]
                          focus:ring-2
                          focus:ring-[#6F4E37]/20
                        "
                      />
                    </div>
                  </div>

                  <p className="text-xs text-stone-400">
                    El stock se suma con la cantidad de esta entrada.
                  </p>

                </div>

              )}

            </div>

            {/* STOCK ACTUAL (solo producto existente) */}
            {selectedItem && !newProductMode && (
              <div className="rounded-xl bg-stone-50 border border-stone-200 p-4">

                <div className="flex justify-between">

                  <span className="text-sm text-stone-500">
                    Stock actual
                  </span>

                  <strong className="text-stone-800">
                    {selectedItem.stock} unidades
                  </strong>

                </div>

              </div>
            )}

            {/* CANTIDAD */}
            <div>

              <label className="block text-sm font-medium text-stone-700 mb-2">
                Cantidad
              </label>

              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(event) =>
                  setQuantity(
                    event.target.value
                  )
                }
                placeholder="0"
                className="
                  w-full
                  border
                  border-stone-300
                  rounded-xl
                  px-4
                  py-3
                  outline-none
                  focus:border-[#6F4E37]
                  focus:ring-2
                  focus:ring-[#6F4E37]/20
                "
              />

              <p className="text-xs text-stone-400 mt-2">
                Indica cuántas unidades entran al inventario.
              </p>

            </div>

            {/* MOTIVO */}
            <div>

              <label className="block text-sm font-medium text-stone-700 mb-2">
                Motivo
              </label>

              <Select
                value={reason}
                onChange={(value) =>
                  setReason(
                    value as MovementReason
                  )
                }
                aria-label="Motivo"
                options={ENTRY_REASONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                  icon:
                    option.value === "PRODUCCION"
                      ? Factory
                      : option.value === "COMPRA"
                        ? ShoppingCart
                        : option.value === "DEVOLUCION"
                          ? RotateCcw
                          : SlidersHorizontal,
                }))}
              />

            </div>

            {/* NOTAS */}
            <div>

              <label className="block text-sm font-medium text-stone-700 mb-2">
                Notas (opcional)
              </label>

              <textarea
                value={notes}
                onChange={(event) =>
                  setNotes(
                    event.target.value
                  )
                }
                rows={3}
                placeholder="Ej. Compra de mercancía, lote 001..."
                className="
                  w-full
                  border
                  border-stone-300
                  rounded-xl
                  px-4
                  py-3
                  outline-none
                  resize-none
                  focus:border-[#6F4E37]
                  focus:ring-2
                  focus:ring-[#6F4E37]/20
                "
              />

            </div>

          </div>

        </Modal>
      )}

      {/* ACTUALIZAR COSTO */}
      {isCostModalOpen && (
        <Modal
          icon={CircleDollarSign}
          title="Costo y precios"
          subtitle="Costo interno y precios de venta de la presentación."
          onClose={closeCostModal}
          size="md"
          footer={
            <div className="flex justify-end gap-3">

              <button
                type="button"
                onClick={closeCostModal}
                disabled={costSaving}
                className="
                  px-5
                  py-3
                  rounded-xl
                  border
                  border-stone-300
                  text-stone-700
                  font-medium
                  hover:bg-stone-50
                  disabled:opacity-40
                  disabled:cursor-not-allowed
                "
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => void handleCostSave()}
                disabled={
                  costValue === "" ||
                  Number.isNaN(Number(costValue)) ||
                  Number(costValue) < 0 ||
                  priceValue === "" ||
                  Number.isNaN(Number(priceValue)) ||
                  Number(priceValue) <= 0 ||
                  costSaving
                }
                className="
                  inline-flex
                  items-center
                  gap-2
                  px-5
                  py-3
                  rounded-xl
                  bg-[#6F4E37]
                  hover:bg-[#5B3F2D]
                  disabled:opacity-40
                  disabled:cursor-not-allowed
                  text-white
                  font-semibold
                "
              >
                {costSaving && (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                )}

                {costSaving
                  ? "Guardando…"
                  : "Guardar cambios"}
              </button>

            </div>
          }
        >

          <div className="space-y-5">

            {/* ERROR */}
            {costError && (
              <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
                {costError}
              </div>
            )}

            {/* PRODUCTO */}
            {selectedItem && (
              <div className="rounded-xl bg-stone-50 border border-stone-200 p-4">

                <p className="text-sm font-medium text-stone-700">
                  {selectedItem.product}
                </p>

                <p className="text-xs text-stone-500 mt-1">
                  {selectedItem.presentation} · {selectedItem.type}
                </p>

              </div>
            )}

            {/* COSTO / PRECIOS ACTUALES */}
            {selectedItem && (
              <div className="rounded-xl bg-stone-50 border border-stone-200 p-4 space-y-2">

                <div className="flex justify-between text-sm">

                  <span className="text-stone-500">
                    Costo actual
                  </span>

                  <strong className="text-stone-800">
                    {selectedItem.cost !== undefined
                      ? formatCurrency(selectedItem.cost)
                      : "No disponible"}
                  </strong>

                </div>

                <div className="flex justify-between text-sm">

                  <span className="text-stone-500">
                    Precio detal actual
                  </span>

                  <strong className="text-stone-800">
                    {formatCurrency(selectedItem.price)}
                  </strong>

                </div>

                <div className="flex justify-between text-sm">

                  <span className="text-stone-500">
                    Precio mayoreo actual
                  </span>

                  <strong className="text-stone-800">
                    {selectedItem.wholesalePrice !== null
                      ? formatCurrency(selectedItem.wholesalePrice)
                      : "Sin mayoreo"}
                  </strong>

                </div>

              </div>
            )}

            {/* NUEVO COSTO */}
            <div>

              <label className="block text-sm font-medium text-stone-700 mb-2">
                Costo (interno)
              </label>

              <MoneyInput
                value={costValue}
                onChange={setCostValue}
                placeholder="0"
                className="
                  w-full
                  border
                  border-stone-300
                  rounded-xl
                  px-4
                  py-3
                  outline-none
                  focus:border-[#6F4E37]
                  focus:ring-2
                  focus:ring-[#6F4E37]/20
                "
              />

              <p className="text-xs text-stone-400 mt-2">
                Valor al que compraste la última vez. Se usa para la utilidad y el valor del inventario.
              </p>

            </div>

            {/* PRECIO DETAL */}
            <div>

              <label className="block text-sm font-medium text-stone-700 mb-2">
                Precio al detal
              </label>

              <MoneyInput
                value={priceValue}
                onChange={setPriceValue}
                placeholder="0"
                className="
                  w-full
                  border
                  border-stone-300
                  rounded-xl
                  px-4
                  py-3
                  outline-none
                  focus:border-[#6F4E37]
                  focus:ring-2
                  focus:ring-[#6F4E37]/20
                "
              />

              <p className="text-xs text-stone-400 mt-2">
                Precio de venta por unidad a un cliente normal.
              </p>

            </div>

            {/* PRECIO MAYOREO */}
            <div>

              <label className="block text-sm font-medium text-stone-700 mb-2">
                Precio al por mayor
              </label>

              <MoneyInput
                value={wholesaleValue}
                onChange={setWholesaleValue}
                placeholder="Opcional"
                className="
                  w-full
                  border
                  border-stone-300
                  rounded-xl
                  px-4
                  py-3
                  outline-none
                  focus:border-[#6F4E37]
                  focus:ring-2
                  focus:ring-[#6F4E37]/20
                "
              />

              <p className="text-xs text-stone-400 mt-2">
                Precio para clientes al por mayor. Déjalo vacío si no aplica (debe ser menor al detal).
              </p>

            </div>

          </div>

        </Modal>
      )}

    </div>
  );
}
