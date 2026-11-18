import { useState, type FormEvent } from "react";

import {
  CreditCard,
  FileText,
  Globe,
  Landmark,
  Loader2,
  Users,
} from "lucide-react";

import { api, ApiError } from "../../lib/api";
import Modal from "../ui/Modal";
import MoneyInput from "../ui/MoneyInput";
import Select from "../ui/Select";
import type { Client, DocumentType } from "../../types/api";

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

type ClientFormModalProps = {
  /** Cliente a editar, o null/undefined para crear uno nuevo. */
  client?: Client | null;
  onClose: () => void;
  /**
   * Se dispara con el cliente guardado (el objeto que devuelve el backend).
   * El componente NO cierra solo: decide el padre (para que en Nueva venta
   * pueda seleccionarlo y en Clientes poder recargar la lista).
   */
  onSaved: (client: Client) => void;
};

/**
 * Modal de crear/editar cliente, compartido entre la página de Clientes
 * (alta y edición) y el modal de Nueva venta (alta rápida sin salir de la
 * factura). Un solo formulario = una sola validación que mantener.
 */
export default function ClientFormModal({
  client,
  onClose,
  onSaved,
}: ClientFormModalProps) {
  const editing = Boolean(client);

  const [form, setForm] = useState<CustomerForm>(() =>
    client
      ? {
          name: client.fullName,
          documentType: client.documentType,
          document: client.documentNumber,
          phone: client.phone ?? "",
          city: client.city ?? "",
          address: client.address ?? "",
          email: client.email ?? "",
          creditLimit: String(client.creditLimit),
        }
      : emptyForm
  );

  const [errors, setErrors] =
    useState<Partial<Record<keyof CustomerForm, string>>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
      newErrors.phone = "El teléfono debe contener entre 7 y 15 números.";
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Ingresa un correo válido.";
    }

    const creditLimit = Number(form.creditLimit);
    if (Number.isNaN(creditLimit) || creditLimit < 0) {
      newErrors.creditLimit = "El límite de crédito no puede ser negativo.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
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
      const saved = client
        ? await api.patch<Client>(`/clients/${client.id}`, payload)
        : await api.post<Client>("/clients", payload);

      onSaved(saved);
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : "No fue posible guardar el cliente."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      icon={Users}
      title={editing ? "Editar cliente" : "Nuevo cliente"}
      subtitle={
        editing
          ? "Actualiza la información del cliente."
          : "Registra un nuevo cliente en Cheo Manager."
      }
      onClose={onClose}
      onSubmit={handleSave}
      size="lg"
      footer={
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">

          <button
            type="button"
            onClick={onClose}
            className="
              w-full
              sm:w-auto
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
              w-full
              sm:w-auto
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
              justify-center
              gap-2
            "
          >
            {saving && <Loader2 size={17} className="animate-spin" />}
            {editing ? "Guardar cambios" : "Crear cliente"}
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
              Nombre completo / Razón social *
            </label>

            <input
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
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
                updateField("documentType", value as DocumentType)
              }
              aria-label="Tipo de documento"
              options={[
                { value: "CC", label: "Cédula", icon: CreditCard },
                { value: "NIT", label: "NIT", icon: Landmark },
                { value: "CE", label: "Cédula extranjera", icon: Globe },
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
              placeholder="Cédula o NIT"
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

          {/* TELÉFONO */}
          <div>

            <label className="block text-sm font-medium text-stone-700 mb-2">
              Teléfono
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
              placeholder="Ej. MEDELLÍN"
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
              onChange={(event) => updateField("address", event.target.value)}
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

          {/* LÍMITE DE CRÉDITO */}
          <div>

            <label className="block text-sm font-medium text-stone-700 mb-2">
              Límite de crédito
            </label>

            <div className="relative">

              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
                $
              </span>

              <MoneyInput
                value={form.creditLimit}
                onChange={(raw) => updateField("creditLimit", raw)}
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
              Define cuánto puede deber el cliente.
            </p>

          </div>

        </div>

      </div>

    </Modal>
  );
}
