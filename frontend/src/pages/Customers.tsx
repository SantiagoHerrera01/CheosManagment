import { useCallback, useEffect, useState } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Users,
  Phone,
  MapPin,
  CreditCard,
  UserRound,
  Loader2,
} from "lucide-react";

import { api, ApiError, qs } from "../lib/api";
import Modal from "../components/ui/Modal";
import ClientFormModal from "../components/clients/ClientFormModal";
import type { Client, Paginated } from "../types/api";

const DOCUMENT_TYPE_LABELS: Record<Client["documentType"], string> = {
  CC: "Cédula",
  NIT: "NIT",
  CE: "Cédula extranjera",
  PASSPORT: "Pasaporte",
};

function formatCurrency(value: number) {
  return value.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

export default function Customers() {
  const [customers, setCustomers] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Client | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteCustomer, setDeleteCustomer] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState(false);

  /** Trae la lista según el filtro actual (búsqueda en el servidor). */
  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const all: Client[] = [];
      // El backend limita a 100 por página: recorremos todas las páginas.
      for (let page = 1; ; page += 1) {
        const result = await api.get<Paginated<Client>>(
          `/clients${qs({
            q: search.trim(),
            active: showInactive ? "false" : "true",
            page,
            limit: 100,
          })}`
        );
        all.push(...result.data);
        if (all.length >= result.meta.total || result.data.length === 0) break;
      }
      setCustomers(all);
    } catch (error) {
      setLoadError(
        error instanceof ApiError ? error.message : "No fue posible cargar los clientes."
      );
    } finally {
      setLoading(false);
    }
  }, [search, showInactive]);

  // Debounce de la búsqueda: evita una petición por tecla.
  useEffect(() => {
    const timer = setTimeout(() => {
      void loadCustomers();
    }, 350);
    return () => clearTimeout(timer);
  }, [loadCustomers]);

  const activeCustomers = customers.filter((customer) => customer.isActive);
  const totalReceivable = activeCustomers.reduce((total, c) => total + c.balance, 0);
  const customersWithDebt = activeCustomers.filter((c) => c.balance > 0).length;

  const openCreateModal = () => {
    setEditingCustomer(null);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (customer: Client) => {
    setEditingCustomer(customer);
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
    setFormError(null);
  };

  /** Tras crear/editar: cierra el modal y recarga la lista del servidor. */
  const handleClientSaved = async () => {
    closeModal();
    await loadCustomers();
  };

  const confirmDelete = async () => {
    if (!deleteCustomer) return;

    setDeleting(true);
    setFormError(null);
    try {
      // Baja lógica: el cliente conserva sus facturas e historial.
      await api.patch(`/clients/${deleteCustomer.id}/active`, { isActive: false });
      setDeleteCustomer(null);
      await loadCustomers();
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : "No fue posible desactivar el cliente."
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-7">

      {/* ENCABEZADO */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

        <div>
          <h1 className="text-3xl font-bold text-stone-800">
            Clientes
          </h1>

          <p className="text-stone-500 mt-2">
            Administra tus clientes y sus cuentas por cobrar.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="
            inline-flex
            items-center
            justify-center
            gap-2
            bg-[#6F4E37]
            hover:bg-[#5B3F2D]
            text-white
            px-5
            py-3
            rounded-xl
            font-semibold
            transition
          "
        >
          <Plus size={19} />
          Nuevo cliente
        </button>

      </div>

      {/* RESUMEN */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">

            <div>
              <p className="text-sm text-stone-500">
                Clientes activos
              </p>

              <p className="text-2xl font-bold text-stone-800 mt-2">
                {activeCustomers.length}
              </p>
            </div>

            <div className="w-11 h-11 rounded-xl bg-[#F3EDE7] text-[#6F4E37] flex items-center justify-center">
              <Users size={21} />
            </div>

          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">

            <div>
              <p className="text-sm text-stone-500">
                Con saldo pendiente
              </p>

              <p className="text-2xl font-bold text-stone-800 mt-2">
                {customersWithDebt}
              </p>
            </div>

            <div className="w-11 h-11 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <CreditCard size={21} />
            </div>

          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">

            <div>
              <p className="text-sm text-stone-500">
                Cartera por cobrar
              </p>

              <p className="text-2xl font-bold text-stone-800 mt-2">
                {formatCurrency(totalReceivable)}
              </p>
            </div>

            <div className="w-11 h-11 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
              <CreditCard size={21} />
            </div>

          </div>
        </div>

      </div>

      {/* TABLA */}
      <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">

        {/* BARRA */}
        <div className="p-5 border-b border-stone-200">

          <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">

            <div className="relative flex-1 max-w-xl">

              <Search
                size={19}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
              />

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nombre, documento o teléfono..."
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

            <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">

              <input
                type="checkbox"
                checked={showInactive}
                onChange={(event) => setShowInactive(event.target.checked)}
                className="w-4 h-4 accent-[#6F4E37]"
              />

              Mostrar inactivos

            </label>

          </div>

        </div>

        {/* ERROR DE CARGA */}
        {loadError && (
          <div className="px-6 py-4 bg-red-50 border-b border-stone-200 text-sm text-red-600">
            {loadError}
          </div>
        )}

        {/* TABLA */}
        <div className="overflow-x-auto">

          <table className="w-full">

            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">

                <th className="text-left px-6 py-4 text-xs font-semibold text-stone-500 uppercase">
                  Cliente
                </th>

                <th className="text-left px-6 py-4 text-xs font-semibold text-stone-500 uppercase">
                  Contacto
                </th>

                <th className="text-left px-6 py-4 text-xs font-semibold text-stone-500 uppercase">
                  Ubicación
                </th>

                <th className="text-right px-6 py-4 text-xs font-semibold text-stone-500 uppercase">
                  Crédito
                </th>

                <th className="text-right px-6 py-4 text-xs font-semibold text-stone-500 uppercase">
                  Saldo
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
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <Loader2
                      size={30}
                      className="mx-auto text-[#6F4E37] animate-spin"
                    />
                    <p className="mt-3 text-sm text-stone-500">
                      Cargando clientes…
                    </p>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <Users size={38} className="mx-auto text-stone-300" />

                    <p className="mt-3 font-medium text-stone-700">
                      No encontramos clientes
                    </p>

                    <p className="text-sm text-stone-500 mt-1">
                      Intenta cambiar la búsqueda.
                    </p>
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="
                      border-b
                      border-stone-100
                      last:border-0
                      hover:bg-stone-50
                      transition
                    "
                  >

                    {/* CLIENTE */}
                    <td className="px-6 py-5">

                      <div className="flex items-center gap-3">

                        <div className="w-10 h-10 rounded-full bg-[#F3EDE7] text-[#6F4E37] flex items-center justify-center shrink-0">
                          <UserRound size={18} />
                        </div>

                        <div>
                          <p className="font-semibold text-stone-800">
                            {customer.fullName}
                          </p>

                          <p className="text-xs text-stone-500 mt-1">
                            {DOCUMENT_TYPE_LABELS[customer.documentType]} {customer.documentNumber}
                          </p>
                        </div>

                      </div>

                    </td>

                    {/* CONTACTO */}
                    <td className="px-6 py-5">

                      {customer.phone ? (
                        <div className="flex items-center gap-2 text-sm text-stone-700">
                          <Phone size={15} className="text-stone-400" />
                          {customer.phone}
                        </div>
                      ) : (
                        <span className="text-sm text-stone-400">
                          Sin teléfono
                        </span>
                      )}

                      {customer.email && (
                        <p className="text-xs text-stone-400 mt-1 truncate max-w-[200px]">
                          {customer.email}
                        </p>
                      )}

                    </td>

                    {/* UBICACIÓN */}
                    <td className="px-6 py-5">

                      <div className="flex items-center gap-2">

                        <MapPin size={15} className="text-stone-400" />

                        <div>
                          <p className="text-sm text-stone-700">
                            {customer.city || "Sin ciudad"}
                          </p>

                          {customer.address && (
                            <p className="text-xs text-stone-400 mt-1">
                              {customer.address}
                            </p>
                          )}
                        </div>

                      </div>

                    </td>

                    {/* CRÉDITO */}
                    <td className="px-6 py-5 text-right">

                      <span className="text-sm text-stone-700">
                        {formatCurrency(customer.creditLimit)}
                      </span>

                    </td>

                    {/* SALDO */}
                    <td className="px-6 py-5 text-right">

                      <span
                        className={
                          customer.balance > 0
                            ? "text-sm font-semibold text-red-600"
                            : "text-sm font-medium text-green-600"
                        }
                      >
                        {formatCurrency(customer.balance)}
                      </span>

                    </td>

                    {/* ESTADO */}
                    <td className="px-6 py-5 text-center">

                      <span
                        className={
                          customer.isActive
                            ? "inline-flex px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium"
                            : "inline-flex px-3 py-1 rounded-full bg-stone-200 text-stone-600 text-xs font-medium"
                        }
                      >
                        {customer.isActive ? "Activo" : "Inactivo"}
                      </span>

                    </td>

                    {/* ACCIONES */}
                    <td className="px-6 py-5">

                      <div className="flex items-center justify-end gap-2">

                        <button
                          type="button"
                          onClick={() => openEditModal(customer)}
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
                          title="Editar cliente"
                        >
                          <Pencil size={17} />
                        </button>

                        {customer.isActive && (
                          <button
                            type="button"
                            onClick={() => setDeleteCustomer(customer)}
                            className="
                              w-9
                              h-9
                              rounded-lg
                              flex
                              items-center
                              justify-center
                              text-stone-500
                              hover:bg-red-50
                              hover:text-red-600
                              transition
                            "
                            title="Desactivar cliente"
                          >
                            <Trash2 size={17} />
                          </button>
                        )}

                      </div>

                    </td>

                  </tr>
                ))
              )}

            </tbody>

          </table>

        </div>

      </div>

      {/* MODAL CREAR / EDITAR */}
      {isModalOpen && (
        <ClientFormModal
          client={editingCustomer}
          onClose={closeModal}
          onSaved={handleClientSaved}
        />
      )}

      {/* CONFIRMACIÓN DE DESACTIVACIÓN */}
      {deleteCustomer && (
        <Modal
          icon={Trash2}
          title="¿Desactivar cliente?"
          subtitle="El cliente quedará inactivo para conservar su historial."
          onClose={() => setDeleteCustomer(null)}
          size="sm"
          footer={
            <div className="flex justify-end gap-3">

              <button
                type="button"
                onClick={() => setDeleteCustomer(null)}
                className="
                  px-5
                  py-3
                  rounded-xl
                  border
                  border-stone-300
                  text-stone-700
                  font-medium
                  hover:bg-stone-50
                  transition
                "
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={deleting}
                className="
                  px-5
                  py-3
                  rounded-xl
                  bg-red-600
                  hover:bg-red-700
                  disabled:opacity-60
                  text-white
                  font-semibold
                  transition
                  inline-flex
                  items-center
                  gap-2
                "
              >
                {deleting && <Loader2 size={17} className="animate-spin" />}
                Sí, desactivar
              </button>

            </div>
          }
        >

          <div className="space-y-4">

            <p className="text-sm text-stone-600 mt-3 leading-6">
              Estás a punto de desactivar a{" "}
              <strong>{deleteCustomer.fullName}</strong>.
              <br />
              El cliente no será borrado definitivamente;
              quedará registrado como inactivo para conservar
              su historial.
            </p>

            {deleteCustomer.balance > 0 && (
              <div className="mt-4 rounded-xl bg-red-50 border border-red-100 p-4">

                <p className="text-sm font-semibold text-red-700">
                  Este cliente tiene saldo pendiente
                </p>

                <p className="text-sm text-red-600 mt-1">
                  {formatCurrency(deleteCustomer.balance)}
                </p>

                <p className="text-xs text-red-500 mt-2">
                  La cartera asociada debe conservarse.
                </p>

              </div>
            )}

            {formError && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                {formError}
              </div>
            )}

          </div>

        </Modal>
      )}

    </div>
  );
}
