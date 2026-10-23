import { useMemo, useState } from "react";
import {
  Search,
  Package,
  Plus,
  Pencil,
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertTriangle,
  X,
  Boxes,
  CircleDollarSign,
  SlidersHorizontal,
} from "lucide-react";

type InventoryItem = {
  id: number;
  product: string;
  process: string;
  presentation: string;
  type: "Molido" | "Grano";
  cost: number;
  wholesale: number;
  retail: number | null;
  stock: number;
  minimumStock: number;
  active: boolean;
};

type MovementType = "entrada" | "salida" | "ajuste";

type InventoryMovement = {
  id: number;
  product: string;
  presentation: string;
  type: MovementType;
  quantity: number;
  reason: string;
  date: string;
};

const initialInventory: InventoryItem[] = [
  {
    id: 1,
    product: "CHEO'S Tradicional",
    process: "Suave lavado",
    presentation: "125 g",
    type: "Molido",
    cost: 8036,
    wholesale: 12900,
    retail: 19900,
    stock: 18,
    minimumStock: 5,
    active: true,
  },
  {
    id: 2,
    product: "CHEO'S Tradicional",
    process: "Suave lavado",
    presentation: "125 g",
    type: "Grano",
    cost: 8036,
    wholesale: 12900,
    retail: 19900,
    stock: 12,
    minimumStock: 5,
    active: true,
  },
  {
    id: 3,
    product: "CHEO'S Tradicional",
    process: "Suave lavado",
    presentation: "250 g",
    type: "Molido",
    cost: 13552,
    wholesale: 19900,
    retail: 28000,
    stock: 9,
    minimumStock: 5,
    active: true,
  },
  {
    id: 4,
    product: "CHEO'S Tradicional",
    process: "Suave lavado",
    presentation: "250 g",
    type: "Grano",
    cost: 13552,
    wholesale: 19900,
    retail: 28000,
    stock: 4,
    minimumStock: 5,
    active: true,
  },
  {
    id: 5,
    product: "CHEO'S Tradicional",
    process: "Suave lavado",
    presentation: "500 g",
    type: "Molido",
    cost: 23995,
    wholesale: 30000,
    retail: 40000,
    stock: 7,
    minimumStock: 3,
    active: true,
  },
  {
    id: 6,
    product: "CHEO'S Tradicional",
    process: "Suave lavado",
    presentation: "500 g",
    type: "Grano",
    cost: 23995,
    wholesale: 30000,
    retail: 40000,
    stock: 3,
    minimumStock: 3,
    active: true,
  },
  {
    id: 7,
    product: "CHEO'S Café Institucional",
    process: "Suave lavado",
    presentation: "2.5 kg",
    type: "Molido",
    cost: 108250,
    wholesale: 140000,
    retail: null,
    stock: 5,
    minimumStock: 2,
    active: true,
  },
  {
    id: 8,
    product: "CHEO'S Café Institucional",
    process: "Suave lavado",
    presentation: "2.5 kg",
    type: "Grano",
    cost: 108250,
    wholesale: 140000,
    retail: null,
    stock: 2,
    minimumStock: 2,
    active: true,
  },
  {
    id: 9,
    product: "Chiroso Urrao",
    process: "Exótico",
    presentation: "125 g",
    type: "Molido",
    cost: 12250,
    wholesale: 17900,
    retail: 24000,
    stock: 8,
    minimumStock: 4,
    active: true,
  },
  {
    id: 10,
    product: "Chiroso Urrao",
    process: "Exótico",
    presentation: "250 g",
    type: "Molido",
    cost: 20750,
    wholesale: 28900,
    retail: 35000,
    stock: 3,
    minimumStock: 4,
    active: true,
  },
  {
    id: 11,
    product: "Chiroso Urrao",
    process: "Exótico",
    presentation: "250 g",
    type: "Grano",
    cost: 20750,
    wholesale: 28900,
    retail: 35000,
    stock: 6,
    minimumStock: 4,
    active: true,
  },
  {
    id: 12,
    product: "Papayo Honey",
    process: "Honey",
    presentation: "250 g",
    type: "Molido",
    cost: 18250,
    wholesale: 27900,
    retail: 35000,
    stock: 2,
    minimumStock: 4,
    active: true,
  },
  {
    id: 13,
    product: "Papayo Honey",
    process: "Honey",
    presentation: "250 g",
    type: "Grano",
    cost: 18250,
    wholesale: 27900,
    retail: 35000,
    stock: 5,
    minimumStock: 4,
    active: true,
  },
  {
    id: 14,
    product: "Bourbon Rosado Honey",
    process: "Honey",
    presentation: "250 g",
    type: "Molido",
    cost: 26450,
    wholesale: 35900,
    retail: 40000,
    stock: 1,
    minimumStock: 4,
    active: true,
  },
  {
    id: 15,
    product: "Bourbon Rosado Honey",
    process: "Honey",
    presentation: "250 g",
    type: "Grano",
    cost: 26450,
    wholesale: 35900,
    retail: 40000,
    stock: 4,
    minimumStock: 4,
    active: true,
  },
  {
    id: 16,
    product: "Natural Melaza de Caña",
    process: "Natural",
    presentation: "250 g",
    type: "Molido",
    cost: 26450,
    wholesale: 35900,
    retail: 40000,
    stock: 6,
    minimumStock: 4,
    active: true,
  },
  {
    id: 17,
    product: "Natural Melaza de Caña",
    process: "Natural",
    presentation: "250 g",
    type: "Grano",
    cost: 26450,
    wholesale: 35900,
    retail: 40000,
    stock: 3,
    minimumStock: 4,
    active: true,
  },
];

const initialMovements: InventoryMovement[] = [
  {
    id: 1,
    product: "CHEO'S Tradicional",
    presentation: "125 g · Molido",
    type: "entrada",
    quantity: 20,
    reason: "Compra de mercancía",
    date: "Hoy, 08:30",
  },
  {
    id: 2,
    product: "Papayo Honey",
    presentation: "250 g · Molido",
    type: "salida",
    quantity: 3,
    reason: "Venta factura #000124",
    date: "Hoy, 09:15",
  },
  {
    id: 3,
    product: "Bourbon Rosado Honey",
    presentation: "250 g · Molido",
    type: "ajuste",
    quantity: -1,
    reason: "Ajuste por conteo físico",
    date: "Ayer, 16:40",
  },
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
  const [inventory, setInventory] =
    useState<InventoryItem[]>(initialInventory);

  const [movements, setMovements] =
    useState<InventoryMovement[]>(initialMovements);

  const [search, setSearch] = useState("");

  const [processFilter, setProcessFilter] =
    useState("Todos");

  const [stockFilter, setStockFilter] =
    useState("Todos");

  const [typeFilter, setTypeFilter] =
    useState("Todos");

  const [isMovementModalOpen, setIsMovementModalOpen] =
    useState(false);

  const [movementType, setMovementType] =
    useState<MovementType>("entrada");

  const [selectedProduct, setSelectedProduct] =
    useState<InventoryItem | null>(null);

  const [quantity, setQuantity] = useState("");

  const [reason, setReason] = useState("");

  const [isEditModalOpen, setIsEditModalOpen] =
    useState(false);

  const [editingItem, setEditingItem] =
    useState<InventoryItem | null>(null);

  const [editStock, setEditStock] = useState("");

  const [editMinimumStock, setEditMinimumStock] =
    useState("");

  const [showMovements, setShowMovements] =
    useState(false);

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

  const totalInventoryValue = inventory
    .filter((item) => item.active)
    .reduce(
      (total, item) =>
        total + item.stock * item.cost,
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

  const openMovementModal = (
    type: MovementType,
    item?: InventoryItem
  ) => {
    setMovementType(type);
    setSelectedProduct(item ?? null);
    setQuantity("");
    setReason("");
    setIsMovementModalOpen(true);
  };

  const closeMovementModal = () => {
    setIsMovementModalOpen(false);
    setSelectedProduct(null);
    setQuantity("");
    setReason("");
  };

  const handleMovement = () => {
    if (!selectedProduct) {
      return;
    }

    const numericQuantity = Number(quantity);

    if (
      !Number.isFinite(numericQuantity) ||
      numericQuantity <= 0
    ) {
      return;
    }

    let difference = numericQuantity;

    if (movementType === "salida") {
      difference = -numericQuantity;
    }

    if (movementType === "ajuste") {
      difference =
        numericQuantity - selectedProduct.stock;
    }

    const newStock =
      selectedProduct.stock + difference;

    if (newStock < 0) {
      return;
    }

    setInventory((previous) =>
      previous.map((item) =>
        item.id === selectedProduct.id
          ? {
              ...item,
              stock: newStock,
            }
          : item
      )
    );

    const movement: InventoryMovement = {
      id: Date.now(),
      product: selectedProduct.product,
      presentation: `${selectedProduct.presentation} · ${selectedProduct.type}`,
      type: movementType,
      quantity:
        movementType === "ajuste"
          ? difference
          : numericQuantity,
      reason:
        reason.trim() ||
        (movementType === "entrada"
          ? "Entrada de mercancía"
          : movementType === "salida"
          ? "Salida de mercancía"
          : "Ajuste manual"),
      date: "Ahora",
    };

    setMovements((previous) => [
      movement,
      ...previous,
    ]);

    closeMovementModal();
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setEditStock(String(item.stock));
    setEditMinimumStock(
      String(item.minimumStock)
    );
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditingItem(null);
    setEditStock("");
    setEditMinimumStock("");
    setIsEditModalOpen(false);
  };

  const saveInventorySettings = () => {
    if (!editingItem) {
      return;
    }

    const newStock = Number(editStock);
    const newMinimumStock =
      Number(editMinimumStock);

    if (
      !Number.isFinite(newStock) ||
      newStock < 0 ||
      !Number.isFinite(newMinimumStock) ||
      newMinimumStock < 0
    ) {
      return;
    }

    setInventory((previous) =>
      previous.map((item) =>
        item.id === editingItem.id
          ? {
              ...item,
              stock: newStock,
              minimumStock: newMinimumStock,
            }
          : item
      )
    );

    closeEditModal();
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
            onClick={() =>
              openMovementModal("salida")
            }
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
            "
          >
            <ArrowUpFromLine size={18} />
            Salida
          </button>

          <button
            type="button"
            onClick={() =>
              openMovementModal("entrada")
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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">

        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">

          <div className="flex justify-between items-start">

            <div>
              <p className="text-sm text-stone-500">
                Referencias
              </p>

              <p className="text-2xl font-bold text-stone-800 mt-2">
                {inventory.filter(
                  (item) => item.active
                ).length}
              </p>
            </div>

            <div className="w-11 h-11 rounded-xl bg-[#F3EDE7] text-[#6F4E37] flex items-center justify-center">
              <Package size={21} />
            </div>

          </div>

          <p className="text-xs text-stone-400 mt-3">
            Productos y presentaciones
          </p>

        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">

          <div className="flex justify-between items-start">

            <div>
              <p className="text-sm text-stone-500">
                Unidades disponibles
              </p>

              <p className="text-2xl font-bold text-stone-800 mt-2">
                {totalUnits}
              </p>
            </div>

            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Boxes size={21} />
            </div>

          </div>

          <p className="text-xs text-stone-400 mt-3">
            Existencias actuales
          </p>

        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">

          <div className="flex justify-between items-start">

            <div>
              <p className="text-sm text-stone-500">
                Valor del inventario
              </p>

              <p className="text-2xl font-bold text-stone-800 mt-2">
                {formatCurrency(
                  totalInventoryValue
                )}
              </p>
            </div>

            <div className="w-11 h-11 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
              <CircleDollarSign size={21} />
            </div>

          </div>

          <p className="text-xs text-stone-400 mt-3">
            Calculado al costo de producción
          </p>

        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">

          <div className="flex justify-between items-start">

            <div>
              <p className="text-sm text-stone-500">
                Requieren atención
              </p>

              <p className="text-2xl font-bold text-red-600 mt-2">
                {lowStockItems.length +
                  outOfStockItems.length}
              </p>
            </div>

            <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <AlertTriangle size={21} />
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

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">

            {/* BUSCAR */}
            <div className="relative xl:col-span-2">

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
            <select
              value={processFilter}
              onChange={(event) =>
                setProcessFilter(
                  event.target.value
                )
              }
              className="
                border
                border-stone-300
                rounded-xl
                px-4
                py-3
                bg-white
                outline-none
                focus:ring-2
                focus:ring-[#6F4E37]/20
                focus:border-[#6F4E37]
              "
            >
              {processes.map((process) => (
                <option
                  key={process}
                  value={process}
                >
                  {process === "Todos"
                    ? "Todos los procesos"
                    : process}
                </option>
              ))}
            </select>

            {/* TIPO */}
            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(
                  event.target.value
                )
              }
              className="
                border
                border-stone-300
                rounded-xl
                px-4
                py-3
                bg-white
                outline-none
                focus:ring-2
                focus:ring-[#6F4E37]/20
                focus:border-[#6F4E37]
              "
            >
              <option value="Todos">
                Todos los tipos
              </option>

              <option value="Molido">
                Molido
              </option>

              <option value="Grano">
                Grano
              </option>
            </select>

            {/* STOCK */}
            <select
              value={stockFilter}
              onChange={(event) =>
                setStockFilter(
                  event.target.value
                )
              }
              className="
                border
                border-stone-300
                rounded-xl
                px-4
                py-3
                bg-white
                outline-none
                focus:ring-2
                focus:ring-[#6F4E37]/20
                focus:border-[#6F4E37]
              "
            >
              <option value="Todos">
                Todo el stock
              </option>

              <option value="normal">
                Stock normal
              </option>

              <option value="bajo">
                Stock bajo
              </option>

              <option value="agotado">
                Agotados
              </option>
            </select>

          </div>

        </div>

        {/* TABLA */}
        <div className="overflow-x-auto">

          <table className="w-full min-w-[1100px]">

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
                  Mayorista
                </th>

                <th className="text-right px-6 py-4 text-xs font-semibold text-stone-500 uppercase">
                  Detal
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

              {filteredInventory.length === 0 ? (
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
                      key={item.id}
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

                        <span className="text-sm text-stone-700">
                          {formatCurrency(
                            item.cost
                          )}
                        </span>

                      </td>

                      {/* MAYORISTA */}
                      <td className="px-6 py-5 text-right">

                        <span className="text-sm text-stone-700">
                          {formatCurrency(
                            item.wholesale
                          )}
                        </span>

                      </td>

                      {/* DETAL */}
                      <td className="px-6 py-5 text-right">

                        {item.retail ? (
                          <span className="text-sm text-stone-700">
                            {formatCurrency(
                              item.retail
                            )}
                          </span>
                        ) : (
                          <span className="text-xs text-stone-400">
                            No disponible
                          </span>
                        )}

                      </td>

                      {/* VALOR INVENTARIO */}
                      <td className="px-6 py-5 text-right">

                        <span className="text-sm font-semibold text-stone-800">
                          {formatCurrency(
                            item.stock *
                              item.cost
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

                          <button
                            type="button"
                            onClick={() =>
                              openMovementModal(
                                "entrada",
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
                            onClick={() =>
                              openMovementModal(
                                "salida",
                                item
                              )
                            }
                            title="Registrar salida"
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
                            "
                          >
                            <ArrowUpFromLine
                              size={17}
                            />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              openEditModal(item)
                            }
                            title="Editar inventario"
                            className="
                              w-9
                              h-9
                              rounded-lg
                              flex
                              items-center
                              justify-center
                              text-stone-500
                              hover:bg-stone-100
                              hover:text-[#6F4E37]
                              transition
                            "
                          >
                            <Pencil size={17} />
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
          onClick={() =>
            setShowMovements(
              (previous) => !previous
            )
          }
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

            {movements.map((movement) => (

              <div
                key={movement.id}
                className="px-6 py-4 border-b border-stone-100 last:border-0 flex items-center justify-between gap-4"
              >

                <div className="flex items-center gap-3">

                  <div
                    className={
                      movement.type === "entrada"
                        ? "w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center"
                        : movement.type === "salida"
                        ? "w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center"
                        : "w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"
                    }
                  >
                    {movement.type ===
                      "entrada" && (
                      <ArrowDownToLine size={18} />
                    )}

                    {movement.type ===
                      "salida" && (
                      <ArrowUpFromLine size={18} />
                    )}

                    {movement.type ===
                      "ajuste" && (
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
                      {movement.reason} ·{" "}
                      {movement.date}
                    </p>

                  </div>

                </div>

                <div
                  className={
                    movement.type === "entrada"
                      ? "font-bold text-green-600"
                      : movement.type === "salida"
                      ? "font-bold text-orange-600"
                      : "font-bold text-blue-600"
                  }
                >
                  {movement.type ===
                    "entrada" && "+"}

                  {movement.type ===
                    "salida" && "-"}

                  {movement.quantity}
                </div>

              </div>

            ))}

          </div>
        )}

      </div>

      {/* MODAL MOVIMIENTO */}
      {isMovementModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">

          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">

            <div className="px-6 py-5 border-b border-stone-200 flex items-center justify-between">

              <div>

                <h2 className="text-xl font-bold text-stone-800">
                  {movementType ===
                    "entrada" &&
                    "Registrar entrada"}

                  {movementType ===
                    "salida" &&
                    "Registrar salida"}

                  {movementType ===
                    "ajuste" &&
                    "Ajustar inventario"}
                </h2>

                <p className="text-sm text-stone-500 mt-1">
                  Actualiza las existencias del producto.
                </p>

              </div>

              <button
                type="button"
                onClick={closeMovementModal}
                className="w-9 h-9 rounded-lg hover:bg-stone-100 flex items-center justify-center text-stone-500"
              >
                <X size={20} />
              </button>

            </div>

            <div className="p-6 space-y-5">

              {/* PRODUCTO */}
              <div>

                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Producto
                </label>

                <select
                  value={
                    selectedProduct?.id ?? ""
                  }
                  onChange={(event) => {
                    const item =
                      inventory.find(
                        (product) =>
                          product.id ===
                          Number(
                            event.target.value
                          )
                      );

                    setSelectedProduct(
                      item ?? null
                    );
                  }}
                  className="
                    w-full
                    border
                    border-stone-300
                    rounded-xl
                    px-4
                    py-3
                    bg-white
                    outline-none
                    focus:border-[#6F4E37]
                    focus:ring-2
                    focus:ring-[#6F4E37]/20
                  "
                >
                  <option value="">
                    Selecciona un producto
                  </option>

                  {inventory
                    .filter(
                      (item) => item.active
                    )
                    .map((item) => (
                      <option
                        key={item.id}
                        value={item.id}
                      >
                        {item.product} ·{" "}
                        {item.presentation} ·{" "}
                        {item.type}
                      </option>
                    ))}
                </select>

              </div>

              {/* STOCK ACTUAL */}
              {selectedProduct && (
                <div className="rounded-xl bg-stone-50 border border-stone-200 p-4">

                  <div className="flex justify-between">

                    <span className="text-sm text-stone-500">
                      Stock actual
                    </span>

                    <strong className="text-stone-800">
                      {selectedProduct.stock} unidades
                    </strong>

                  </div>

                </div>
              )}

              {/* CANTIDAD */}
              <div>

                <label className="block text-sm font-medium text-stone-700 mb-2">
                  {movementType === "ajuste"
                    ? "Nuevo stock"
                    : "Cantidad"}
                </label>

                <input
                  type="number"
                  min="0"
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

                {movementType ===
                  "ajuste" && (
                  <p className="text-xs text-stone-400 mt-2">
                    Indica directamente cuántas unidades
                    deben quedar.
                  </p>
                )}

              </div>

              {/* MOTIVO */}
              <div>

                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Motivo
                </label>

                <textarea
                  value={reason}
                  onChange={(event) =>
                    setReason(
                      event.target.value
                    )
                  }
                  rows={3}
                  placeholder={
                    movementType ===
                    "entrada"
                      ? "Ej. Compra de mercancía..."
                      : movementType ===
                        "salida"
                      ? "Ej. Producto usado, venta manual..."
                      : "Ej. Conteo físico..."
                  }
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

            <div className="px-6 py-5 border-t border-stone-200 flex justify-end gap-3">

              <button
                type="button"
                onClick={closeMovementModal}
                className="
                  px-5
                  py-3
                  rounded-xl
                  border
                  border-stone-300
                  text-stone-700
                  font-medium
                  hover:bg-stone-50
                "
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleMovement}
                disabled={
                  !selectedProduct ||
                  !quantity
                }
                className="
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
                Confirmar movimiento
              </button>

            </div>

          </div>

        </div>
      )}

      {/* MODAL EDITAR */}
      {isEditModalOpen &&
        editingItem && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">

            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">

              <div className="px-6 py-5 border-b border-stone-200 flex justify-between items-center">

                <div>
                  <h2 className="text-xl font-bold text-stone-800">
                    Editar inventario
                  </h2>

                  <p className="text-sm text-stone-500 mt-1">
                    {editingItem.product} ·{" "}
                    {editingItem.presentation}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeEditModal}
                  className="w-9 h-9 rounded-lg hover:bg-stone-100 flex items-center justify-center text-stone-500"
                >
                  <X size={20} />
                </button>

              </div>

              <div className="p-6 space-y-5">

                <div>

                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Stock actual
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={editStock}
                    onChange={(event) =>
                      setEditStock(
                        event.target.value
                      )
                    }
                    className="
                      w-full
                      border
                      border-stone-300
                      rounded-xl
                      px-4
                      py-3
                      outline-none
                      focus:border-[#6F4E37]
                    "
                  />

                </div>

                <div>

                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Stock mínimo
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={editMinimumStock}
                    onChange={(event) =>
                      setEditMinimumStock(
                        event.target.value
                      )
                    }
                    className="
                      w-full
                      border
                      border-stone-300
                      rounded-xl
                      px-4
                      py-3
                      outline-none
                      focus:border-[#6F4E37]
                    "
                  />

                  <p className="text-xs text-stone-400 mt-2">
                    Cuando el inventario llegue a este número,
                    aparecerá como stock bajo.
                  </p>

                </div>

              </div>

              <div className="px-6 py-5 border-t border-stone-200 flex justify-end gap-3">

                <button
                  type="button"
                  onClick={closeEditModal}
                  className="
                    px-5
                    py-3
                    rounded-xl
                    border
                    border-stone-300
                    text-stone-700
                    font-medium
                  "
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={saveInventorySettings}
                  className="
                    px-5
                    py-3
                    rounded-xl
                    bg-[#6F4E37]
                    hover:bg-[#5B3F2D]
                    text-white
                    font-semibold
                  "
                >
                  Guardar cambios
                </button>

              </div>

            </div>

          </div>
        )}

    </div>
  );
}