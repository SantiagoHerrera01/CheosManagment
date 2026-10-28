import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Users,
  Phone,
  MapPin,
  CreditCard,
  FileText,
  Globe,
  Landmark,
  UserRound,
  Loader2,
} from "lucide-react";

import { api, ApiError, qs } from "../lib/api";
import Select from "../components/ui/Select";
import Modal from "../components/ui/Modal";
import type { Client, DocumentType, Paginated } from "../types/api";

type CustomerForm = {
  name: string;
  documentType: DocumentType;
  document: string;
  phone: string;
  city: string;
  address: string;
  email: string;
  creditLimit: string;
};

const emptyForm: CustomerForm = {
  name: "",
  documentType: "CC",
  document: "",
  phone: "",
  city: "",
  address: "",
  email: "",
  creditLimit: "0",
};

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  CC: "CÃ©dula",
  NIT: "NIT",
  CE: "CÃ©dula extranjera",
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
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerForm, string>>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteCustomer, setDeleteCustomer] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState(false);

  /** Trae la lista segÃºn el filtro actual (bÃºsqueda en el servidor). */
  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const all: Client[] = [];
      // El backend limita a 100 por pÃ¡gina: recorremos todas las pÃ¡ginas.
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

  // Debounce de la bÃºsqueda: evita una peticiÃ³n por tecla.
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
    setForm(emptyForm);
    setErrors({});
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (customer: Client) => {
    setEditingCustomer(customer);
    setForm({
      name: customer.fullName,
      documentType: customer.documentType,
      document: customer.documentNumber,
      phone: customer.phone ?? "",
      city: customer.city ?? "",
      address: customer.address ?? "",
      email: customer.email ?? "",
      creditLimit: String(customer.creditLimit),
    });
    setErrors({});
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
    setForm(emptyForm);
    setErrors({});
    setFormError(null);
  };

  const updateField = (field: keyof CustomerForm, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    if (errors[field]) {
      setErrors((previous) => ({ ...previous, [field]: undefined }));
    }
  };

  const validateForm = () => {
    const newErrors: Partial<Record<keyof CustomerForm, string>> = {};

    if (!form.name.trim()) newErrors.name = "El nombre es obligatorio.";
    if (!form.document.trim()) newErrors.document = "El documento es obligatorio.";
    if (form.phone && !/^[0-9]{7,15}$/.test(form.phone)) {
      newErrors.phone = "El telÃ©fono debe contener entre 7 y 15 nÃºmeros.";
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Ingresa un correo vÃ¡lido.";
    }

    const creditLimit = Number(form.creditLimit);
    if (Number.isNaN(creditLimit) || creditLimit < 0) {
      newErrors.creditLimit = "El lÃ­mite de crÃ©dito no puede ser negativo.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    setFormError(null);

    const payload = {
      documentType: form.documentType,
      documentNumber: form.document.trim(),
      fullName: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      city: form.city.trim() || null,
      address: form.address.trim() || null,
      creditLimit: Number(form.creditLimit),
    };

    try {
      if (editingCustomer) {
        await api.patch(`/clients/${editingCustomer.id}`, payload);
      } else {
        await api.post("/clients", payload);
      }
      closeModal();
      await loadCustomers();
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : "No fue posible guardar el cliente."
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteCustomer) return;

    setDeleting(true);
    setFormError(null);
    try {
      // Baja lÃ³gica: el cliente conserva sus facturas e historial.
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
                placeholder="Buscar por nombre, documento o telÃ©fono..."
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
                  UbicaciÃ³n
                </th>

                <th className="text-right px-6 py-4 text-xs font-semibold text-stone-500 uppercase">
                  CrÃ©dito
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
                      Cargando clientesâ€¦
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
                      Intenta cambiar la bÃºsqueda.
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
                          Sin telÃ©fono
                        </span>
                      )}

                      {customer.email && (
                        <p className="text-xs text-stone-400 mt-1 truncate max-w-[200px]">
                          {customer.email}
                        </p>
                      )}

                    </td>

                    {/* UBICACIÃ“N */}
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

                    {/* CRÃ‰DITO */}
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
        <Modal
          icon={Users}
          title={editingCustomer ? "Editar cliente" : "Nuevo cliente"}
          subtitle={
            editingCustomer
              ? "Actualiza la informaciÃ³n del cliente."
              : "Registra un nuevo cliente en Cheo Manager."
          }
          onClose={closeModal}
          onSubmit={handleSave}
          size="lg"
          footer={
            <div className="flex justify-end gap-3">

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
                type="submit"
                disabled={saving}
                className="
                  px-5
                  py-3
                  rounded-xl
                  bg-[#6F4E37]
                  hover:bg-[#5B3F2D]
                  disabled:opacity-60
                  text-white
                  font-semibold
                  transition
                  inline-flex
                  items-center
                  gap-2
                "
              >
                {saving && <Loader2 size={17} className="animate-spin" />}
                {editingCustomer ? "Guardar cambios" : "Crear cliente"}
              </button>

            </div>
          }
        >

            {/* FORMULARIO */}
            <div className="space-y-5">

              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* NOMBRE */}
                <div className="md:col-span-2">

                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Nombre completo / RazÃ³n social *
                  </label>

                  <input
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    placeholder="Ej. Juan PÃ©rez"
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
                    <p className="text-xs text-red-500 mt-1">{errors.name}</p>
                  )}

                </div>

                {/* TIPO DE DOCUMENTO */}
                <div>

                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Tipo de documento *
                  </label>

                  <Select
                    value={form.documentType}
                    onChange={(value) =>
                      updateField("documentType", value)
                    }
                    aria-label="Tipo de documento"
                    options={[
                      { value: "CC", label: "CÃ©dula", icon: CreditCard },
                      { value: "NIT", label: "NIT", icon: Landmark },
                      {
                        value: "CE",
                        label: "CÃ©dula extranjera",
                        icon: Globe,
                      },
                      { value: "PASSPORT", label: "Pasaporte", icon: FileText },
                    ]}
                  />

                </div>

                {/* DOCUMENTO */}
                <div>

                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Documento *
                  </label>

                  <input
                    value={form.document}
                    onChange={(event) =>
                      updateField("document", event.target.value.replace(/\D/g, ""))
                    }
                    placeholder="CÃ©dula o NIT"
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
                        errors.document
                          ? "border-red-400"
                          : "border-stone-300 focus:border-[#6F4E37]"
                      }
                    `}
                  />

                  {errors.document && (
                    <p className="text-xs text-red-500 mt-1">{errors.document}</p>
                  )}

                </div>

                {/* TELÃ‰FONO */}
                <div>

                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    TelÃ©fono
                  </label>

                  <input
                    value={form.phone}
                    onChange={(event) => updateField("phone", event.target.value.replace(/\D/g, ""))}
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
                    <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
                  )}

                </div>

                {/* CIUDAD */}
                <div>

                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Ciudad
                  </label>

                  <input
                    value={form.city}
                    onChange={(event) => updateField("city", event.target.value)}
                    placeholder="Ej. MEDELLÃN"
                    className="w-full border border-stone-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#6F4E37]/20 focus:border-[#6F4E37]"
                  />

                </div>

                {/* DIRECCIÃ“N */}
                <div>

                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    DirecciÃ³n
                  </label>

                  <input
                    value={form.address}
                    onChange={(event) => updateField("address", event.target.value)}
                    placeholder="Ej. Calle 10 # 20-30"
                    className="w-full border border-stone-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#6F4E37]/20 focus:border-[#6F4E37]"
                  />

                </div>

                {/* EMAIL */}
                <div>

                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Correo electrÃ³nico
                  </label>

                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
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
                    <p className="text-xs text-red-500 mt-1">{errors.email}</p>
                  )}

                </div>

                {/* LÃMITE DE CRÃ‰DITO */}
                <div>

                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    LÃ­mite de crÃ©dito
                  </label>

                  <div className="relative">

                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
                      $
                    </span>

                    <input
                      type="number"
                      min="0"
                      value={form.creditLimit}
                      onChange={(event) => updateField("creditLimit", event.target.value)}
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
                    <p className="text-xs text-red-500 mt-1">{errors.creditLimit}</p>
                  )}

                  <p className="text-xs text-stone-400 mt-1">
                    Define cuÃ¡nto puede deber el cliente.
                  </p>

                </div>

              </div>

            </div>

        </Modal>
      )}

      {/* CONFIRMACIÃ“N DE DESACTIVACIÃ“N */}
      {deleteCustomer && (
        <Modal
          icon={Trash2}
          title="Â¿Desactivar cliente?"
          subtitle="El cliente quedarÃ¡ inactivo para conservar su historial."
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
                SÃ­, desactivar
              </button>

            </div>
          }
        >

          <div className="space-y-4">

            <p className="text-sm text-stone-600 mt-3 leading-6">
              EstÃ¡s a punto de desactivar a{" "}
              <strong>{deleteCustomer.fullName}</strong>.
              <br />
              El cliente no serÃ¡ borrado definitivamente;
              quedarÃ¡ registrado como inactivo para conservar
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
