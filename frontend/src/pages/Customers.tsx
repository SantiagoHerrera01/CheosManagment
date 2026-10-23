import { useMemo, useState } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Users,
  Phone,
  MapPin,
  CreditCard,
  X,
  UserRound,
} from "lucide-react";

type Customer = {
  id: number;
  name: string;
  document: string;
  phone: string;
  city: string;
  address: string;
  email: string;
  creditLimit: number;
  balance: number;
  active: boolean;
};

type CustomerForm = {
  name: string;
  document: string;
  phone: string;
  city: string;
  address: string;
  email: string;
  creditLimit: string;
};

const initialCustomers: Customer[] = [
  {
    id: 1,
    name: "Consumidor Final",
    document: "222222222",
    phone: "",
    city: "Medellín",
    address: "",
    email: "",
    creditLimit: 0,
    balance: 0,
    active: true,
  },
  {
    id: 2,
    name: "Juan Pérez",
    document: "10203040",
    phone: "3001234567",
    city: "Medellín",
    address: "San Antonio de Prado",
    email: "juan@email.com",
    creditLimit: 500000,
    balance: 120000,
    active: true,
  },
  {
    id: 3,
    name: "Café Central",
    document: "900456789",
    phone: "6044567890",
    city: "Medellín",
    address: "Centro",
    email: "compras@cafecentral.com",
    creditLimit: 1500000,
    balance: 350000,
    active: true,
  },
];

const emptyForm: CustomerForm = {
  name: "",
  document: "",
  phone: "",
  city: "",
  address: "",
  email: "",
  creditLimit: "0",
};

function formatCurrency(value: number) {
  return value.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>(
    initialCustomers
  );

  const [search, setSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [editingCustomer, setEditingCustomer] =
    useState<Customer | null>(null);

  const [form, setForm] = useState<CustomerForm>(emptyForm);

  const [errors, setErrors] = useState<
    Partial<Record<keyof CustomerForm, string>>
  >({});

  const [deleteCustomer, setDeleteCustomer] =
    useState<Customer | null>(null);

  const [showInactive, setShowInactive] = useState(false);

  const filteredCustomers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return customers.filter((customer) => {
      if (!showInactive && !customer.active) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return (
        customer.name.toLowerCase().includes(normalizedSearch) ||
        customer.document.toLowerCase().includes(normalizedSearch) ||
        customer.phone.toLowerCase().includes(normalizedSearch) ||
        customer.city.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [customers, search, showInactive]);

  const activeCustomers = customers.filter(
    (customer) => customer.active
  );

  const totalReceivable = activeCustomers.reduce(
    (total, customer) => total + customer.balance,
    0
  );

  const customersWithDebt = activeCustomers.filter(
    (customer) => customer.balance > 0
  ).length;

  const openCreateModal = () => {
    setEditingCustomer(null);
    setForm(emptyForm);
    setErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);

    setForm({
      name: customer.name,
      document: customer.document,
      phone: customer.phone,
      city: customer.city,
      address: customer.address,
      email: customer.email,
      creditLimit: String(customer.creditLimit),
    });

    setErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
    setForm(emptyForm);
    setErrors({});
  };

  const updateField = (
    field: keyof CustomerForm,
    value: string
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors((previous) => ({
        ...previous,
        [field]: undefined,
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Partial<
      Record<keyof CustomerForm, string>
    > = {};

    if (!form.name.trim()) {
      newErrors.name = "El nombre es obligatorio.";
    }

    if (!form.document.trim()) {
      newErrors.document = "El documento es obligatorio.";
    }

    if (form.phone && !/^[0-9]{7,15}$/.test(form.phone)) {
      newErrors.phone =
        "El teléfono debe contener entre 7 y 15 números.";
    }

    if (
      form.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
    ) {
      newErrors.email = "Ingresa un correo válido.";
    }

    const creditLimit = Number(form.creditLimit);

    if (
      Number.isNaN(creditLimit) ||
      creditLimit < 0
    ) {
      newErrors.creditLimit =
        "El límite de crédito no puede ser negativo.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    const creditLimit = Number(form.creditLimit);

    if (editingCustomer) {
      setCustomers((previous) =>
        previous.map((customer) =>
          customer.id === editingCustomer.id
            ? {
                ...customer,
                name: form.name.trim(),
                document: form.document.trim(),
                phone: form.phone.trim(),
                city: form.city.trim(),
                address: form.address.trim(),
                email: form.email.trim(),
                creditLimit,
              }
            : customer
        )
      );
    } else {
      const newCustomer: Customer = {
        id: Date.now(),
        name: form.name.trim(),
        document: form.document.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
        address: form.address.trim(),
        email: form.email.trim(),
        creditLimit,
        balance: 0,
        active: true,
      };

      setCustomers((previous) => [
        ...previous,
        newCustomer,
      ]);
    }

    closeModal();
  };

  const confirmDelete = () => {
    if (!deleteCustomer) {
      return;
    }

    /*
     * No eliminamos físicamente el cliente.
     *
     * Lo marcamos como inactivo para conservar su historial.
     * Cuando conectemos el backend esto se convertirá
     * en una operación persistente + registro de auditoría.
     */
    setCustomers((previous) =>
      previous.map((customer) =>
        customer.id === deleteCustomer.id
          ? {
              ...customer,
              active: false,
            }
          : customer
      )
    );

    setDeleteCustomer(null);
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
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Buscar por nombre, documento, teléfono o ciudad..."
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
                onChange={(event) =>
                  setShowInactive(event.target.checked)
                }
                className="w-4 h-4 accent-[#6F4E37]"
              />

              Mostrar inactivos

            </label>

          </div>

        </div>

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

              {filteredCustomers.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-16 text-center"
                  >
                    <Users
                      size={38}
                      className="mx-auto text-stone-300"
                    />

                    <p className="mt-3 font-medium text-stone-700">
                      No encontramos clientes
                    </p>

                    <p className="text-sm text-stone-500 mt-1">
                      Intenta cambiar la búsqueda.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
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
                            {customer.name}
                          </p>

                          <p className="text-xs text-stone-500 mt-1">
                            {customer.document}
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

                    </td>

                    {/* UBICACIÓN */}
                    <td className="px-6 py-5">

                      <div className="flex items-center gap-2">

                        <MapPin
                          size={15}
                          className="text-stone-400"
                        />

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
                          customer.active
                            ? "inline-flex px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium"
                            : "inline-flex px-3 py-1 rounded-full bg-stone-200 text-stone-600 text-xs font-medium"
                        }
                      >
                        {customer.active
                          ? "Activo"
                          : "Inactivo"}
                      </span>

                    </td>

                    {/* ACCIONES */}
                    <td className="px-6 py-5">

                      <div className="flex items-center justify-end gap-2">

                        <button
                          type="button"
                          onClick={() =>
                            openEditModal(customer)
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
                            hover:text-[#6F4E37]
                            transition
                          "
                          title="Editar cliente"
                        >
                          <Pencil size={17} />
                        </button>

                        {customer.active && (
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteCustomer(customer)
                            }
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
                            title="Eliminar cliente"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">

            {/* HEADER */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-stone-200">

              <div>
                <h2 className="text-xl font-bold text-stone-800">
                  {editingCustomer
                    ? "Editar cliente"
                    : "Nuevo cliente"}
                </h2>

                <p className="text-sm text-stone-500 mt-1">
                  {editingCustomer
                    ? "Actualiza la información del cliente."
                    : "Registra un nuevo cliente en Cheo Manager."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="w-9 h-9 rounded-lg hover:bg-stone-100 flex items-center justify-center text-stone-500"
              >
                <X size={20} />
              </button>

            </div>

            {/* FORMULARIO */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* NOMBRE */}
                <div className="md:col-span-2">

                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Nombre completo / Razón social *
                  </label>

                  <input
                    value={form.name}
                    onChange={(event) =>
                      updateField(
                        "name",
                        event.target.value
                      )
                    }
                    placeholder="Ej. Juan Pérez"
                    className={`
                      w-full
                      border
                      rounded-xl
                      px-4
                      py-3
                      outline-none
                      focus:ring-2
                      focus:ring-[#6F4E37]/20
                      ${
                        errors.name
                          ? "border-red-400"
                          : "border-stone-300 focus:border-[#6F4E37]"
                      }
                    `}
                  />

                  {errors.name && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.name}
                    </p>
                  )}

                </div>

                {/* DOCUMENTO */}
                <div>

                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Documento *
                  </label>

                  <input
                    value={form.document}
                    onChange={(event) =>
                      updateField(
                        "document",
                        event.target.value
                      )
                    }
                    placeholder="Cédula o NIT"
                    className={`
                      w-full
                      border
                      rounded-xl
                      px-4
                      py-3
                      outline-none
                      focus:ring-2
                      focus:ring-[#6F4E37]/20
                      ${
                        errors.document
                          ? "border-red-400"
                          : "border-stone-300 focus:border-[#6F4E37]"
                      }
                    `}
                  />

                  {errors.document && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.document}
                    </p>
                  )}

                </div>

                {/* TELÉFONO */}
                <div>

                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Teléfono
                  </label>

                  <input
                    value={form.phone}
                    onChange={(event) =>
                      updateField(
                        "phone",
                        event.target.value.replace(
                          /\D/g,
                          ""
                        )
                      )
                    }
                    placeholder="Ej. 3001234567"
                    inputMode="numeric"
                    className={`
                      w-full
                      border
                      rounded-xl
                      px-4
                      py-3
                      outline-none
                      focus:ring-2
                      focus:ring-[#6F4E37]/20
                      ${
                        errors.phone
                          ? "border-red-400"
                          : "border-stone-300 focus:border-[#6F4E37]"
                      }
                    `}
                  />

                  {errors.phone && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.phone}
                    </p>
                  )}

                </div>

                {/* CIUDAD */}
                <div>

                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Ciudad
                  </label>

                  <input
                    value={form.city}
                    onChange={(event) =>
                      updateField(
                        "city",
                        event.target.value
                      )
                    }
                    placeholder="Ej. Medellín"
                    className="w-full border border-stone-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#6F4E37]/20 focus:border-[#6F4E37]"
                  />

                </div>

                {/* DIRECCIÓN */}
                <div>

                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Dirección
                  </label>

                  <input
                    value={form.address}
                    onChange={(event) =>
                      updateField(
                        "address",
                        event.target.value
                      )
                    }
                    placeholder="Ej. Calle 10 # 20-30"
                    className="w-full border border-stone-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#6F4E37]/20 focus:border-[#6F4E37]"
                  />

                </div>

                {/* EMAIL */}
                <div>

                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Correo electrónico
                  </label>

                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      updateField(
                        "email",
                        event.target.value
                      )
                    }
                    placeholder="correo@ejemplo.com"
                    className={`
                      w-full
                      border
                      rounded-xl
                      px-4
                      py-3
                      outline-none
                      focus:ring-2
                      focus:ring-[#6F4E37]/20
                      ${
                        errors.email
                          ? "border-red-400"
                          : "border-stone-300 focus:border-[#6F4E37]"
                      }
                    `}
                  />

                  {errors.email && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.email}
                    </p>
                  )}

                </div>

                {/* LÍMITE DE CRÉDITO */}
                <div>

                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Límite de crédito
                  </label>

                  <div className="relative">

                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
                      $
                    </span>

                    <input
                      type="number"
                      min="0"
                      value={form.creditLimit}
                      onChange={(event) =>
                        updateField(
                          "creditLimit",
                          event.target.value
                        )
                      }
                      className={`
                        w-full
                        border
                        rounded-xl
                        pl-9
                        pr-4
                        py-3
                        outline-none
                        focus:ring-2
                        focus:ring-[#6F4E37]/20
                        ${
                          errors.creditLimit
                            ? "border-red-400"
                            : "border-stone-300 focus:border-[#6F4E37]"
                        }
                      `}
                    />

                  </div>

                  {errors.creditLimit && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.creditLimit}
                    </p>
                  )}

                  <p className="text-xs text-stone-400 mt-1">
                    Define cuánto puede deber el cliente.
                  </p>

                </div>

              </div>

            </div>

            {/* FOOTER */}
            <div className="px-6 py-5 border-t border-stone-200 flex justify-end gap-3">

              <button
                type="button"
                onClick={closeModal}
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
                onClick={handleSave}
                className="
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
                {editingCustomer
                  ? "Guardar cambios"
                  : "Crear cliente"}
              </button>

            </div>

          </div>

        </div>
      )}

      {/* CONFIRMACIÓN DE ELIMINACIÓN */}
      {deleteCustomer && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">

          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">

            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-5">
              <Trash2 size={22} />
            </div>

            <h2 className="text-xl font-bold text-stone-800">
              ¿Eliminar cliente?
            </h2>

            <p className="text-sm text-stone-600 mt-3 leading-6">
              Estás a punto de desactivar a{" "}
              <strong>
                {deleteCustomer.name}
              </strong>
              .
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
                  {formatCurrency(
                    deleteCustomer.balance
                  )}
                </p>

                <p className="text-xs text-red-500 mt-2">
                  La cartera asociada debe conservarse.
                </p>

              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">

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
                onClick={confirmDelete}
                className="
                  px-5
                  py-3
                  rounded-xl
                  bg-red-600
                  hover:bg-red-700
                  text-white
                  font-semibold
                  transition
                "
              >
                Sí, desactivar
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}