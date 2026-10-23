import {
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  UserRound,
  Receipt,
  AlertTriangle,
  X,
} from "lucide-react";

import { useState } from "react";

import SaleDetailModal from "./SaleDetailModal";
import EditSale, {
  type EditableSale,
} from "./EditSale";

type SaleItem = {
  name: string;
  size: string;
  type: string;
  quantity: number;
  price: number;
  cost?: number;
};

export type Sale = {
  id: number;
  invoice: string;
  customer: string;
  date: string;
  total: number;
  payment: string;
  status: "Pagada" | "Pendiente" | "Anulada";
  subtotal: number;
  discount: number;
  bank?: string;
  items: SaleItem[];
};

const initialSales: Sale[] = [
  {
    id: 1,
    invoice: "#000125",
    customer: "Juan Pérez",
    date: "14/08/2026",
    total: 85000,
    payment: "Efectivo",
    status: "Pagada",
    subtotal: 85000,
    discount: 0,
    items: [
      {
        name: "Castillo",
        size: "500 g",
        type: "Molido",
        quantity: 1,
        price: 40000,
      },
      {
        name: "Chiroso Urrao",
        size: "250 g",
        type: "Grano",
        quantity: 1,
        price: 35000,
      },
      {
        name: "Castillo",
        size: "125 g",
        type: "Molido",
        quantity: 1,
        price: 10000,
      },
    ],
  },

  {
    id: 2,
    invoice: "#000124",
    customer: "Tienda La 80",
    date: "14/08/2026",
    total: 240000,
    payment: "Crédito",
    status: "Pendiente",
    subtotal: 240000,
    discount: 0,
    items: [
      {
        name: "Castillo",
        size: "500 g",
        type: "Grano",
        quantity: 6,
        price: 40000,
      },
    ],
  },

  {
    id: 3,
    invoice: "#000123",
    customer: "María Gómez",
    date: "13/08/2026",
    total: 120000,
    payment: "Transferencia",
    status: "Pagada",
    subtotal: 125000,
    discount: 5000,
    bank: "Bancolombia Cta Cheo",
    items: [
      {
        name: "Papayo Honey",
        size: "250 g",
        type: "Molido",
        quantity: 2,
        price: 35000,
      },
      {
        name: "Bourbon Rosado Honey",
        size: "250 g",
        type: "Grano",
        quantity: 1,
        price: 40000,
      },
      {
        name: "Castillo",
        size: "125 g",
        type: "Molido",
        quantity: 1,
        price: 15000,
      },
    ],
  },

  {
    id: 4,
    invoice: "#000122",
    customer: "Café La Montaña",
    date: "13/08/2026",
    total: 385000,
    payment: "Transferencia",
    status: "Pagada",
    subtotal: 385000,
    discount: 0,
    bank: "Bancolombia Cta Omar",
    items: [
      {
        name: "Castillo",
        size: "2.5 kg",
        type: "Grano",
        quantity: 2,
        price: 140000,
      },
      {
        name: "Chiroso Urrao",
        size: "250 g",
        type: "Grano",
        quantity: 3,
        price: 35000,
      },
    ],
  },

  {
    id: 5,
    invoice: "#000121",
    customer: "Distribuciones El Café",
    date: "12/08/2026",
    total: 560000,
    payment: "Crédito",
    status: "Pendiente",
    subtotal: 560000,
    discount: 0,
    items: [
      {
        name: "Castillo",
        size: "500 g",
        type: "Molido",
        quantity: 14,
        price: 40000,
      },
    ],
  },

  {
    id: 6,
    invoice: "#000120",
    customer: "Pedro Ramírez",
    date: "12/08/2026",
    total: 95000,
    payment: "Efectivo",
    status: "Anulada",
    subtotal: 95000,
    discount: 0,
    items: [
      {
        name: "Castillo",
        size: "500 g",
        type: "Grano",
        quantity: 2,
        price: 40000,
      },
      {
        name: "Castillo",
        size: "125 g",
        type: "Molido",
        quantity: 1,
        price: 15000,
      },
    ],
  },
];

function formatCurrency(value: number) {
  return value.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

function getCustomerData(customerName: string) {
  const customers: Record<
    string,
    {
      id: number;
      document: string;
    }
  > = {
    "Juan Pérez": {
      id: 2,
      document: "10203040",
    },

    "Tienda La 80": {
      id: 4,
      document: "901234567",
    },

    "María Gómez": {
      id: 5,
      document: "100203040",
    },

    "Café La Montaña": {
      id: 6,
      document: "900555666",
    },

    "Distribuciones El Café": {
      id: 7,
      document: "901777888",
    },

    "Pedro Ramírez": {
      id: 8,
      document: "1030405060",
    },
  };

  const customer = customers[customerName];

  return {
    id: customer?.id ?? 1,
    name: customerName,
    document: customer?.document ?? "222222222",
  };
}

function getPaymentMethod(
  payment: string
): EditableSale["paymentMethod"] {
  if (payment === "Transferencia") {
    return "transferencia";
  }

  if (payment === "Crédito") {
    return "credito";
  }

  if (payment === "Contra entrega") {
    return "contra_entrega";
  }

  if (payment === "Abono") {
    return "abono";
  }

  return "efectivo";
}

export default function SalesTable() {
  const [sales, setSales] =
    useState<Sale[]>(initialSales);

  const [openMenu, setOpenMenu] =
    useState<number | null>(null);

  const [selectedSale, setSelectedSale] =
    useState<Sale | null>(null);

  const [editingSale, setEditingSale] =
    useState<EditableSale | null>(null);

  const [saleToDelete, setSaleToDelete] =
    useState<Sale | null>(null);

  /*
   * VER DETALLE
   */
  const handleViewSale = (sale: Sale) => {
    setSelectedSale(sale);
    setOpenMenu(null);
  };

  /*
   * EDITAR VENTA
   */
  const handleEditSale = (sale: Sale) => {
    const editableSale: EditableSale = {
      id: sale.id,

      invoice: sale.invoice,

      customer: getCustomerData(
        sale.customer
      ),

      items: sale.items.map(
        (item, index) => ({
          id: `${sale.id}-${index}`,

          productId: index + 1,

          name: item.name,

          size: item.size,

          type: item.type,

          price: item.price,

          cost: item.cost ?? 0,

          quantity: item.quantity,
        })
      ),

      discount: sale.discount,

      paymentMethod: getPaymentMethod(
        sale.payment
      ),

      bank: sale.bank,
    };

    setEditingSale(editableSale);
    setOpenMenu(null);
  };

  /*
   * ABRIR CONFIRMACIÓN
   */
  const handleDeleteRequest = (sale: Sale) => {
    setSaleToDelete(sale);
    setOpenMenu(null);
  };

  /*
   * CONFIRMAR ELIMINACIÓN
   */
  const handleConfirmDelete = () => {
    if (!saleToDelete) {
      return;
    }

    setSales((currentSales) =>
      currentSales.filter(
        (sale) =>
          sale.id !== saleToDelete.id
      )
    );

    setSaleToDelete(null);
  };

  /*
   * SI ESTAMOS EDITANDO
   */
  if (editingSale) {
    return (
      <EditSale
        sale={editingSale}
        onBack={() =>
          setEditingSale(null)
        }
        onSaved={() =>
          setEditingSale(null)
        }
      />
    );
  }

  return (
    <>
      {/* =========================================
          TABLA DE VENTAS
      ========================================= */}

      <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">

        {/* ENCABEZADO */}

        <div className="px-5 sm:px-6 py-5 border-b border-stone-200 flex items-center justify-between gap-4">

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-xl bg-[#F3EDE7] text-[#6F4E37] flex items-center justify-center shrink-0">
              <Receipt size={19} />
            </div>

            <div>
              <h2 className="font-semibold text-stone-800">
                Ventas registradas
              </h2>

              <p className="text-sm text-stone-500 mt-0.5">
                Consulta las ventas realizadas.
              </p>
            </div>

          </div>

          <span className="text-sm text-stone-500 whitespace-nowrap">
            {sales.length} ventas
          </span>

        </div>

        {/* TABLA */}

        <div className="overflow-x-auto">

          <table className="w-full min-w-[900px]">

            <thead>

              <tr className="bg-stone-50 border-b border-stone-200">

                <th className="text-left px-6 py-4 text-xs font-semibold text-stone-500 uppercase">
                  Factura
                </th>

                <th className="text-left px-6 py-4 text-xs font-semibold text-stone-500 uppercase">
                  Cliente
                </th>

                <th className="text-left px-6 py-4 text-xs font-semibold text-stone-500 uppercase">
                  Fecha
                </th>

                <th className="text-left px-6 py-4 text-xs font-semibold text-stone-500 uppercase">
                  Forma de pago
                </th>

                <th className="text-right px-6 py-4 text-xs font-semibold text-stone-500 uppercase">
                  Total
                </th>

                <th className="text-center px-6 py-4 text-xs font-semibold text-stone-500 uppercase">
                  Estado
                </th>

                <th className="w-16 px-6 py-4">
                </th>

              </tr>

            </thead>

            <tbody>

              {sales.map((sale) => (

                <tr
                  key={sale.id}
                  className="
                    border-b
                    border-stone-100
                    last:border-0
                    hover:bg-stone-50
                    transition
                  "
                >

                  {/* FACTURA */}

                  <td className="px-6 py-5">

                    <div className="flex items-center gap-3">

                      <div className="w-9 h-9 rounded-lg bg-stone-100 text-stone-600 flex items-center justify-center">
                        <Receipt size={16} />
                      </div>

                      <span className="font-semibold text-stone-800">
                        {sale.invoice}
                      </span>

                    </div>

                  </td>

                  {/* CLIENTE */}

                  <td className="px-6 py-5">

                    <div className="flex items-center gap-3">

                      <div className="w-9 h-9 rounded-full bg-[#F3EDE7] text-[#6F4E37] flex items-center justify-center">
                        <UserRound size={16} />
                      </div>

                      <span className="font-medium text-stone-800">
                        {sale.customer}
                      </span>

                    </div>

                  </td>

                  {/* FECHA */}

                  <td className="px-6 py-5 text-sm text-stone-600">
                    {sale.date}
                  </td>

                  {/* PAGO */}

                  <td className="px-6 py-5">

                    <span className="text-sm text-stone-700">
                      {sale.payment}
                    </span>

                    {sale.bank && (
                      <p className="text-xs text-stone-400 mt-1">
                        {sale.bank}
                      </p>
                    )}

                  </td>

                  {/* TOTAL */}

                  <td className="px-6 py-5 text-right">

                    <span className="font-semibold text-stone-800">
                      {formatCurrency(
                        sale.total
                      )}
                    </span>

                  </td>

                  {/* ESTADO */}

                  <td className="px-6 py-5 text-center">

                    {sale.status ===
                      "Pagada" && (
                      <span className="inline-flex px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                        Pagada
                      </span>
                    )}

                    {sale.status ===
                      "Pendiente" && (
                      <span className="inline-flex px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">
                        Pendiente
                      </span>
                    )}

                    {sale.status ===
                      "Anulada" && (
                      <span className="inline-flex px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                        Anulada
                      </span>
                    )}

                  </td>

                  {/* ACCIONES */}

                  <td className="px-6 py-5 relative">

                    <button
                      type="button"
                      onClick={() =>
                        setOpenMenu(
                          openMenu === sale.id
                            ? null
                            : sale.id
                        )
                      }
                      className="
                        w-9
                        h-9
                        rounded-lg
                        flex
                        items-center
                        justify-center
                        text-stone-500
                        hover:bg-stone-100
                      "
                    >
                      <MoreVertical size={19} />
                    </button>

                    {openMenu === sale.id && (

                      <div
                        className="
                          absolute
                          right-6
                          top-14
                          z-30
                          w-44
                          bg-white
                          border
                          border-stone-200
                          rounded-xl
                          shadow-lg
                          py-1
                        "
                      >

                        {/* VER DETALLE */}

                        <button
                          type="button"
                          onClick={() =>
                            handleViewSale(
                              sale
                            )
                          }
                          className="
                            w-full
                            flex
                            items-center
                            gap-3
                            px-4
                            py-2.5
                            text-sm
                            text-stone-700
                            hover:bg-stone-50
                          "
                        >
                          <Eye size={16} />
                          Ver detalle
                        </button>

                        {/* EDITAR */}

                        <button
                          type="button"
                          onClick={() =>
                            handleEditSale(
                              sale
                            )
                          }
                          className="
                            w-full
                            flex
                            items-center
                            gap-3
                            px-4
                            py-2.5
                            text-sm
                            text-stone-700
                            hover:bg-stone-50
                          "
                        >
                          <Pencil size={16} />
                          Editar venta
                        </button>

                        <div className="border-t border-stone-100 my-1" />

                        {/* ELIMINAR */}

                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteRequest(
                              sale
                            )
                          }
                          className="
                            w-full
                            flex
                            items-center
                            gap-3
                            px-4
                            py-2.5
                            text-sm
                            text-red-600
                            hover:bg-red-50
                          "
                        >
                          <Trash2 size={16} />
                          Eliminar venta
                        </button>

                      </div>

                    )}

                  </td>

                </tr>

              ))}

              {sales.length === 0 && (

                <tr>

                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center"
                  >

                    <div className="flex flex-col items-center">

                      <div className="w-12 h-12 rounded-xl bg-stone-100 text-stone-400 flex items-center justify-center">
                        <Receipt size={22} />
                      </div>

                      <p className="font-semibold text-stone-700 mt-4">
                        No hay ventas registradas
                      </p>

                      <p className="text-sm text-stone-500 mt-1">
                        Las ventas que registres
                        aparecerán aquí.
                      </p>

                    </div>

                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>

      </div>

      {/* =========================================
          MODAL VER DETALLE
      ========================================= */}

      <SaleDetailModal
        sale={selectedSale}
        onClose={() =>
          setSelectedSale(null)
        }
      />

      {/* =========================================
          MODAL ELIMINAR
      ========================================= */}

      {saleToDelete && (

        <div
          className="
            fixed
            inset-0
            z-[60]
            bg-black/40
            flex
            items-center
            justify-center
            p-4
          "
          onClick={() =>
            setSaleToDelete(null)
          }
        >

          <div
            className="
              w-full
              max-w-md
              bg-white
              rounded-2xl
              shadow-2xl
              overflow-hidden
            "
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* ENCABEZADO */}

            <div className="p-5 sm:p-6 border-b border-stone-200">

              <div className="flex items-start justify-between gap-4">

                <div className="flex items-center gap-3">

                  <div
                    className="
                      w-11
                      h-11
                      rounded-xl
                      bg-red-100
                      text-red-600
                      flex
                      items-center
                      justify-center
                      shrink-0
                    "
                  >
                    <AlertTriangle size={21} />
                  </div>

                  <div>

                    <h2 className="text-lg font-bold text-stone-900">
                      Eliminar venta
                    </h2>

                    <p className="text-sm text-stone-500 mt-0.5">
                      Esta acción requiere confirmación.
                    </p>

                  </div>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSaleToDelete(null)
                  }
                  className="
                    w-9
                    h-9
                    rounded-lg
                    flex
                    items-center
                    justify-center
                    text-stone-500
                    hover:bg-stone-100
                  "
                >
                  <X size={19} />
                </button>

              </div>

            </div>

            {/* CONTENIDO */}

            <div className="p-5 sm:p-6">

              <p className="text-stone-600 leading-relaxed">

                ¿Estás seguro de que quieres eliminar
                esta venta?

              </p>

              {/* DATOS DE LA VENTA */}

              <div
                className="
                  mt-4
                  rounded-xl
                  bg-stone-50
                  border
                  border-stone-200
                  p-4
                "
              >

                <div className="flex items-center justify-between gap-4">

                  <div>

                    <p className="text-xs text-stone-500">
                      Factura
                    </p>

                    <p className="font-bold text-stone-900 mt-1">
                      {saleToDelete.invoice}
                    </p>

                  </div>

                  <div className="text-right">

                    <p className="text-xs text-stone-500">
                      Total
                    </p>

                    <p className="font-bold text-[#6F4E37] mt-1">
                      {formatCurrency(
                        saleToDelete.total
                      )}
                    </p>

                  </div>

                </div>

                <div className="border-t border-stone-200 my-4" />

                <div>

                  <p className="text-xs text-stone-500">
                    Cliente
                  </p>

                  <p className="font-semibold text-stone-800 mt-1">
                    {saleToDelete.customer}
                  </p>

                </div>

              </div>

              {/* ADVERTENCIA */}

              <div
                className="
                  mt-4
                  rounded-xl
                  bg-red-50
                  border
                  border-red-200
                  p-4
                "
              >

                <p className="text-sm text-red-700 leading-relaxed">

                  La venta será eliminada de la lista.
                  Cuando conectemos la base de datos,
                  esta acción también deberá controlar
                  inventario, cartera y movimientos
                  bancarios relacionados.

                </p>

              </div>

            </div>

            {/* BOTONES */}

            <div
              className="
                border-t
                border-stone-200
                p-5
                sm:p-6
                flex
                flex-col-reverse
                sm:flex-row
                gap-3
                sm:justify-end
              "
            >

              <button
                type="button"
                onClick={() =>
                  setSaleToDelete(null)
                }
                className="
                  w-full
                  sm:w-auto
                  px-5
                  py-3
                  rounded-xl
                  border
                  border-stone-300
                  text-stone-700
                  font-semibold
                  hover:bg-stone-50
                  transition
                "
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={
                  handleConfirmDelete
                }
                className="
                  w-full
                  sm:w-auto
                  px-5
                  py-3
                  rounded-xl
                  bg-red-600
                  hover:bg-red-700
                  text-white
                  font-semibold
                  transition
                  flex
                  items-center
                  justify-center
                  gap-2
                "
              >
                <Trash2 size={17} />
                Eliminar venta
              </button>

            </div>

          </div>

        </div>

      )}

    </>
  );
}