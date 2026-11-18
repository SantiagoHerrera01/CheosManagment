import {
  Banknote,
  Check,
  CreditCard,
  Landmark,
  Loader2,
  MessageCircle,
  Plus,
  Search,
  ShoppingCart,
  UserRound,
  Wallet,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import SaleProducts, { type CartItem } from "./SaleProducts";
import ClientFormModal from "../clients/ClientFormModal";
import { api, ApiError, qs } from "../../lib/api";
import { saleMessage, whatsappLink } from "../../lib/whatsapp";
import MoneyInput from "../ui/MoneyInput";
import Select from "../ui/Select";
import type {
  Client,
  CreateInvoiceInput,
  Invoice,
  Paginated,
  PaymentMethod,
} from "../../types/api";

type NewSaleProps = {
  onBack: () => void;
  /** Se llama después de crear la factura (para recargar la lista padre). */
  onSaleCreated?: () => void;
};

const bankAccounts = [
  {
    id: "111005",
    name: "Bancolombia Cta Omar",
    code: "111005",
  },
  {
    id: "111006",
    name: "Bancolombia Cta Cheo",
    code: "111006",
  },
  {
    id: "111007",
    name: "Bancolombia Cta Emiliano",
    code: "111007",
  },
  {
    id: "111008",
    name: "Nequi Gustavo",
    code: "111008",
  },
  {
    id: "111009",
    name: "Cruce de Cuentas Migdo",
    code: "111009",
  },
];

/** Atajos de porcentaje de descuento en el resumen de la venta. */
const DISCOUNT_SHORTCUTS = [5, 15, 30];

function formatCurrency(value: number) {
  return value.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

/**
 * Normaliza texto para buscar: sin tildes ni mayúsculas.
 * "Santiago Castañeda" se encuentra escribiendo "santiago" o "castaneda".
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Mensaje legible para el banner de error (prioriza issues de zod). */
function getApiErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) {
    return "No fue posible registrar la venta.";
  }

  const details = error.details;

  if (Array.isArray(details) && details.length > 0) {
    const firstIssue = details[0] as { message?: unknown };

    if (
      firstIssue &&
      typeof firstIssue.message === "string" &&
      firstIssue.message.trim() !== ""
    ) {
      return firstIssue.message;
    }
  }

  return error.message;
}

export default function NewSale({
  onBack,
  onSaleCreated,
}: NewSaleProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  /** Autocomplete: lista visible, fila resaltada con teclado y modal de alta. */
  const [openList, setOpenList] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showClientModal, setShowClientModal] = useState(false);

  /** Contenedor del buscador: sirve para detectar el clic fuera de la lista. */
  const searchWrapRef = useRef<HTMLDivElement>(null);

  const [selectedCustomer, setSelectedCustomer] =
    useState<Client | null>(null);

  const [items, setItems] = useState<CartItem[]>([]);

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("EFECTIVO");

  const [selectedBank, setSelectedBank] = useState("");

  const [discount, setDiscount] = useState("");

  /**
   * Atajo de porcentaje activo (5 / 15 / 30). Mientras esté activo el
   * descuento se deriva del subtotal y se recalcula solo; al editar el
   * campo a mano vuelve a ser un descuento manual en pesos.
   */
  const [discountPct, setDiscountPct] = useState<number | null>(null);

  /** Input del descuento (el botón "Manual" lo enfoca). */
  const discountInputRef = useRef<HTMLInputElement>(null);

  const [receivedAmount, setReceivedAmount] = useState("");

  const [saving, setSaving] = useState(false);

  const [savingError, setSavingError] = useState<string | null>(null);

  const [saved, setSaved] = useState(false);

  const [createdInvoice, setCreatedInvoice] = useState<Invoice | null>(null);

  /** Descarga todos los clientes activos (sin tocar estado). */
  const fetchClients = useCallback(async () => {
    const all: Client[] = [];

    // El backend limita a 100 por página: recorremos todas las páginas.
    for (let page = 1; ; page += 1) {
      const result = await api.get<Paginated<Client>>(
        `/clients${qs({ active: true, page, limit: 100 })}`
      );

      all.push(...result.data);

      if (all.length >= result.meta.total || result.data.length === 0) {
        break;
      }
    }

    return all;
  }, []);

  const loadClients = useCallback(() => {
    return fetchClients()
      .then((all) => {
        setClients(all);
      })
      .catch((error: unknown) => {
        setLoadError(
          error instanceof ApiError
            ? error.message
            : "No fue posible cargar los clientes."
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [fetchClients]);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  /**
   * Coincidencias del autocomplete. Con el campo vacío muestra los primeros
   * clientes (para que en móvil solo con tocar ya se despliegue la lista).
   * Sin tildes: "castaneda" encuentra "Castañeda".
   */
  const filteredCustomers = useMemo(() => {
    const value = normalize(search.trim());

    const matches = clients.filter((customer) => {
      if (!value) return true;

      return (
        normalize(customer.fullName).includes(value) ||
        customer.documentNumber.includes(value) ||
        (customer.phone ?? "").includes(value)
      );
    });

    return value ? matches : matches.slice(0, 30);
  }, [clients, search]);

  /** Elige un cliente del autocomplete y cierra la lista. */
  const selectCustomer = (customer: Client) => {
    setSelectedCustomer(customer);
    setSearch("");
    setOpenList(false);
    setActiveIndex(-1);
  };

  /** Abre el modal de alta de cliente desde el buscador de la venta. */
  const openNewClientModal = () => {
    setOpenList(false);
    setActiveIndex(-1);
    setShowClientModal(true);
  };

  /**
   * Tras crear el cliente en el modal embebido: entra a la lista local,
   * queda seleccionado en la venta y se cierra el modal de alta.
   */
  const handleClientSaved = (client: Client) => {
    setClients((previous) =>
      previous.some((current) => current.id === client.id)
        ? previous
        : [...previous, client]
    );
    setSelectedCustomer(client);
    setSearch("");
    setShowClientModal(false);
    setActiveIndex(-1);
  };

  /** Navegación con teclado del autocomplete (↑ ↓ Enter Escape). */
  const handleSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpenList(true);
      setActiveIndex((current) =>
        Math.min(current + 1, filteredCustomers.length - 1)
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      const customer = filteredCustomers[activeIndex];
      if (openList && customer) {
        event.preventDefault();
        selectCustomer(customer);
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
      if (!searchWrapRef.current?.contains(target)) {
        setOpenList(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [openList]);

  const subtotal = useMemo(() => {
    return items.reduce(
      (total, item) =>
        total + item.price * item.quantity,
      0
    );
  }, [items]);

  /**
   * Descuento efectivo en pesos: si hay un atajo de porcentaje activo se
   * calcula sobre el subtotal (y se recalcula si cambia el carrito);
   * si no, se usa el valor escrito a mano. Siempre limitado al subtotal.
   */
  const discountValue = Math.min(
    discountPct !== null
      ? Math.round((subtotal * discountPct) / 100)
      : Number(discount) || 0,
    subtotal
  );

  const total = Math.max(
    subtotal - discountValue,
    0
  );

  /**
   * Atajo de porcentaje: activa el modo porcentaje (el valor se deriva
   * del subtotal). Tocar el que ya está activo lo desactiva y deja el
   * resultado en pesos como descuento manual.
   */
  const applyDiscountPct = (pct: number) => {
    if (discountPct === pct) {
      setDiscountPct(null);
      setDiscount(String(discountValue));
      return;
    }

    setDiscountPct(pct);
    setDiscount(String(Math.round((subtotal * pct) / 100)));
  };

  const received = Number(receivedAmount) || 0;

  const pendingAmount = Math.max(
    total - received,
    0
  );

  const change = Math.max(
    received - total,
    0
  );

  const canSave =
    !saving &&
    selectedCustomer !== null &&
    items.length > 0 &&
    total > 0 &&
    (paymentMethod !== "TRANSFERENCIA" ||
      selectedBank !== "") &&
    (paymentMethod !== "ABONO" ||
      received > 0);

  const handleNewSale = () => {
    setItems([]);
    setDiscount("");
    setDiscountPct(null);
    setReceivedAmount("");
    setSavingError(null);
    setCreatedInvoice(null);
    setSaved(false);
  };

  const handleSaveSale = async () => {
    if (saving) {
      return;
    }

    if (!selectedCustomer) {
      setSavingError("Selecciona un cliente para continuar.");
      return;
    }

    if (items.length === 0) {
      setSavingError("Agrega al menos un producto a la venta.");
      return;
    }

    if (!canSave) {
      setSavingError("Revisa la información de la venta.");
      return;
    }

    setSaving(true);
    setSavingError(null);

    const payload: CreateInvoiceInput = {
      clientId: selectedCustomer.id,
      items: items.map((item) => ({
        presentationId: item.presentationId,
        quantity: item.quantity,
        wholesale: item.wholesale,
      })),
      discount: discountValue,
      paymentMethod,
      initialPayment:
        paymentMethod === "ABONO"
          ? Number(receivedAmount || 0) || null
          : null,
      creditDays: 30,
      notes: null,
    };

    try {
      const invoice = await api.post<Invoice>("/invoices", payload);

      setCreatedInvoice(invoice);
      setSaved(true);
      onSaleCreated?.();
    } catch (error) {
      // El formulario conserva su estado: solo se muestra el error.
      setSavingError(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (saved && createdInvoice) {
    return (
      <div className="space-y-6">

        {/* =========================================
            CONFIRMACIÓN
        ========================================= */}

        <section
          className="
            bg-white
            border
            border-stone-200
            rounded-xl
            shadow-sm
            p-8
            sm:p-12
          "
        >

          <div
            className="
              w-14
              h-14
              rounded-full
              bg-green-100
              text-green-600
              flex
              items-center
              justify-center
              mx-auto
            "
          >
            <Check size={26} />
          </div>

          <h1 className="text-2xl font-bold text-stone-900 text-center mt-5">
            Venta registrada
          </h1>

          <p className="text-stone-500 text-center mt-2">
            La factura {createdInvoice.number} se creó correctamente.
          </p>

          <div
            className="
              mt-6
              max-w-sm
              mx-auto
              border
              border-stone-200
              rounded-xl
              overflow-hidden
            "
          >

            <div
              className="
                flex
                items-center
                justify-between
                gap-4
                px-4
                py-3
                border-b
                border-stone-100
              "
            >

              <span className="text-sm text-stone-500">
                Cliente
              </span>

              <span className="text-sm font-semibold text-stone-800 text-right">
                {createdInvoice.client.fullName}

                <span className="block text-xs font-normal text-stone-500 mt-0.5">
                  {createdInvoice.client.documentNumber}
                </span>
              </span>

            </div>

            <div
              className="
                flex
                items-center
                justify-between
                gap-4
                px-4
                py-3
              "
            >

              <span className="text-sm text-stone-500">
                Total
              </span>

              <span className="font-bold text-[#6F4E37]">
                {formatCurrency(createdInvoice.total)}
              </span>

            </div>

          </div>

          <div
            className="
              mt-8
              flex
              flex-col
              sm:flex-row
              items-center
              justify-center
              gap-3
            "
          >

            {createdInvoice.client.phone ? (
              <a
                href={whatsappLink(
                  createdInvoice.client.phone,
                  saleMessage(createdInvoice)
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  w-full
                  sm:w-auto
                  min-w-[220px]
                  bg-emerald-600
                  hover:bg-emerald-700
                  text-white
                  px-7
                  py-4
                  rounded-xl
                  font-semibold
                  transition
                  flex
                  items-center
                  justify-center
                  gap-2
                "
              >
                <MessageCircle size={19} />
                Enviar por WhatsApp
              </a>
            ) : (
              <span
                className="
                  w-full
                  sm:w-auto
                  min-w-[220px]
                  px-7
                  py-4
                  rounded-xl
                  border
                  border-dashed
                  border-stone-300
                  text-stone-400
                  text-sm
                  text-center
                "
              >
                Cliente sin celular registrado
              </span>
            )}

            <button
              type="button"
              onClick={handleNewSale}
              className="
                w-full
                sm:w-auto
                min-w-[220px]
                bg-[#6F4E37]
                hover:bg-[#5B3F2D]
                text-white
                px-7
                py-4
                rounded-xl
                font-semibold
                transition
              "
            >
              Nueva venta
            </button>

            <button
              type="button"
              onClick={onBack}
              className="
                w-full
                sm:w-auto
                min-w-[220px]
                border
                border-stone-300
                text-stone-700
                px-7
                py-4
                rounded-xl
                font-semibold
                hover:bg-stone-50
                transition
              "
            >
              Volver a ventas
            </button>

          </div>

        </section>

      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* =========================================
          CLIENTE
      ========================================= */}

      <section className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">

        <div className="p-5 sm:p-6 border-b border-stone-200">

          <div className="flex items-center justify-between gap-3">

            <div className="flex items-center gap-3 min-w-0">

              <div
                className="
                  w-10
                  h-10
                  rounded-xl
                  bg-[#F3EDE7]
                  text-[#6F4E37]
                  flex
                  items-center
                  justify-center
                  shrink-0
                "
              >
                <UserRound size={19} />
              </div>

              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-stone-900">
                  Cliente
                </h2>

                <p className="text-sm text-stone-500 truncate">
                  Selecciona el cliente de esta venta.
                </p>
              </div>

            </div>

            <button
              type="button"
              onClick={() => setShowClientModal(true)}
              className="
                inline-flex
                items-center
                gap-1.5
                shrink-0
                px-3
                py-2
                rounded-lg
                border
                border-stone-300
                text-sm
                font-medium
                text-stone-700
                hover:border-[#6F4E37]/50
                hover:text-[#6F4E37]
                hover:bg-[#6F4E37]/5
                transition
              "
            >
              <Plus size={16} />
              Nuevo cliente
            </button>

          </div>

        </div>

        <div className="p-5 sm:p-6">

          {selectedCustomer ? (

            <div
              className="
                border
                border-[#D9C8BB]
                bg-[#FAF7F4]
                rounded-xl
                p-4
              "
            >

              <div className="flex flex-wrap items-center justify-between gap-3">

                <div className="flex items-center gap-3 min-w-0">

                  <div
                    className="
                      w-10
                      h-10
                      rounded-full
                      bg-[#6F4E37]
                      text-white
                      flex
                      items-center
                      justify-center
                      shrink-0
                    "
                  >
                    <UserRound size={18} />
                  </div>

                  <div className="min-w-0">
                    <p className="font-semibold text-stone-900 truncate">
                      {selectedCustomer.fullName}
                    </p>

                    <p className="text-sm text-stone-500 truncate">
                      Documento: {selectedCustomer.documentNumber}
                      {selectedCustomer.phone && ` · ${selectedCustomer.phone}`}
                    </p>
                  </div>

                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomer(null);
                    setSearch("");
                    setActiveIndex(-1);
                  }}
                  className="
                    text-sm
                    font-semibold
                    text-[#6F4E37]
                    hover:underline
                    shrink-0
                  "
                >
                  Cambiar
                </button>

              </div>

            </div>

          ) : loading ? (

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
                Cargando clientes…
              </p>

            </div>

          ) : loadError ? (

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
                  void loadClients();
                }}
                className="font-semibold underline shrink-0"
              >
                Reintentar
              </button>

            </div>

          ) : (

            <div className="space-y-3" ref={searchWrapRef}>

              {/* BUSCADOR (autocomplete) */}

              <div className="relative">

                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setOpenList(true);
                    setActiveIndex(-1);
                  }}
                  onFocus={() => setOpenList(true)}
                  onKeyDown={handleSearchKeyDown}
                  role="combobox"
                  aria-expanded={openList}
                  aria-controls="sale-client-list"
                  aria-autocomplete="list"
                  autoComplete="off"
                  placeholder="Buscar por nombre, documento o teléfono..."
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

              {/* LISTA DE SUGERENCIAS */}

              {openList && (

                <div
                  id="sale-client-list"
                  role="listbox"
                  aria-label="Clientes registrados"
                  className="
                    border
                    border-stone-200
                    rounded-xl
                    bg-white
                    overflow-hidden
                    shadow-sm
                  "
                >

                  {filteredCustomers.length > 0 ? (

                    <div className="max-h-72 overflow-y-auto">

                      {filteredCustomers.map((customer, index) => (

                        <button
                          key={customer.id}
                          type="button"
                          role="option"
                          aria-selected={index === activeIndex}
                          onClick={() => selectCustomer(customer)}
                          onMouseEnter={() => setActiveIndex(index)}
                          className={`
                            w-full
                            flex
                            items-center
                            gap-3
                            text-left
                            px-4
                            py-3.5
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

                          <div
                            className="
                              w-9
                              h-9
                              rounded-full
                              bg-stone-100
                              text-stone-600
                              flex
                              items-center
                              justify-center
                              shrink-0
                            "
                          >
                            <UserRound size={17} />
                          </div>

                          <div className="min-w-0">
                            <p className="font-semibold text-stone-800 truncate">
                              {customer.fullName}
                            </p>

                            <p className="text-sm text-stone-500 truncate">
                              {customer.documentNumber}
                              {customer.phone && ` · ${customer.phone}`}
                            </p>
                          </div>

                        </button>

                      ))}

                    </div>

                  ) : (

                    <div className="p-5 text-center">

                      <p className="text-sm text-stone-500">
                        No encontramos ese cliente.
                      </p>

                      <button
                        type="button"
                        onClick={openNewClientModal}
                        className="
                          mt-3
                          inline-flex
                          items-center
                          gap-2
                          px-4
                          py-2.5
                          rounded-lg
                          bg-[#6F4E37]
                          hover:bg-[#5B3F2D]
                          text-white
                          text-sm
                          font-semibold
                          transition
                        "
                      >
                        <Plus size={16} />
                        Crear cliente
                      </button>

                    </div>

                  )}

                  {/* ALTA RÁPIDA: siempre visible al final de la lista */}

                  <button
                    type="button"
                    onClick={openNewClientModal}
                    className="
                      w-full
                      flex
                      items-center
                      justify-center
                      gap-2
                      px-4
                      py-3.5
                      border-t
                      border-stone-200
                      bg-stone-50
                      text-sm
                      font-semibold
                      text-[#6F4E37]
                      hover:bg-[#F3EDE7]
                      transition
                    "
                  >
                    <Plus size={16} />
                    Nuevo cliente
                  </button>

                </div>

              )}

            </div>

          )}

        </div>

      </section>

      {/* =========================================
          PRODUCTOS
      ========================================= */}

      <SaleProducts
        items={items}
        onItemsChange={setItems}
      />

      {/* =========================================
          RESUMEN
      ========================================= */}

      <section
        className="
          bg-white
          border
          border-stone-200
          rounded-xl
          shadow-sm
          overflow-hidden
        "
      >

        <div className="p-5 sm:p-6 border-b border-stone-200">

          <div className="flex items-center gap-3">

            <div
              className="
                w-10
                h-10
                rounded-xl
                bg-[#F3EDE7]
                text-[#6F4E37]
                flex
                items-center
                justify-center
              "
            >
              <ShoppingCart size={19} />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-stone-900">
                Resumen
              </h2>

              <p className="text-sm text-stone-500">
                Revisa los valores antes de registrar la venta.
              </p>
            </div>

          </div>

        </div>

        <div className="p-5 sm:p-6 space-y-5">

          {/* SUBTOTAL */}

          <div className="flex items-center justify-between">

            <span className="text-stone-600">
              Subtotal
            </span>

            <span className="font-semibold text-stone-900">
              {formatCurrency(subtotal)}
            </span>

          </div>

          {/* DESCUENTO */}

          <div>

            <label className="block text-sm font-semibold text-stone-700 mb-2">
              Descuento
            </label>

            {/* ATAJOS DE PORCENTAJE */}

            <div className="grid grid-cols-4 gap-2 mb-3">

              {DISCOUNT_SHORTCUTS.map((pct) => {

                const active = discountPct === pct;

                return (

                  <button
                    key={pct}
                    type="button"
                    onClick={() => applyDiscountPct(pct)}
                    aria-pressed={active}
                    className={`
                      py-2.5
                      rounded-lg
                      border
                      text-xs
                      sm:text-sm
                      font-semibold
                      transition
                      ${
                        active
                          ? `
                            bg-[#6F4E37]
                            border-[#6F4E37]
                            text-white
                          `
                          : `
                            border-stone-300
                            text-stone-600
                            hover:border-[#6F4E37]/50
                            hover:text-[#6F4E37]
                            hover:bg-[#6F4E37]/5
                          `
                      }
                    `}
                  >
                    {pct}%
                  </button>

                );

              })}

              {/* MANUAL: desactiva el porcentaje y enfoca el campo */}

              <button
                type="button"
                onClick={() => {
                  if (discountPct !== null) {
                    setDiscount(String(discountValue));
                    setDiscountPct(null);
                  }
                  discountInputRef.current?.focus();
                }}
                aria-pressed={discountPct === null}
                className={`
                  py-2.5
                  rounded-lg
                  border
                  text-xs
                  sm:text-sm
                  font-semibold
                  transition
                  ${
                    discountPct === null
                      ? `
                        bg-[#6F4E37]
                        border-[#6F4E37]
                        text-white
                      `
                      : `
                        border-stone-300
                        text-stone-600
                        hover:border-[#6F4E37]/50
                        hover:text-[#6F4E37]
                        hover:bg-[#6F4E37]/5
                      `
                  }
                `}
              >
                Manual
              </button>

            </div>

            {/* MONTO EN PESOS */}

            <div className="relative">

              <span
                className="
                  absolute
                  left-4
                  top-1/2
                  -translate-y-1/2
                  text-stone-400
                "
              >
                $
              </span>

              <MoneyInput
                ref={discountInputRef}
                value={
                  discountPct !== null
                    ? String(discountValue)
                    : discount
                }
                onChange={(raw) => {
                  setDiscountPct(null);
                  setDiscount(raw);
                }}
                placeholder="0"
                aria-label="Descuento en pesos"
                className="
                  w-full
                  border
                  border-stone-300
                  rounded-xl
                  pl-9
                  pr-4
                  py-3
                  outline-none
                  focus:border-[#6F4E37]
                  focus:ring-2
                  focus:ring-[#6F4E37]/20
                "
              />

            </div>

            {/* FEEDBACK: lo que realmente se descuenta */}

            {discountValue > 0 ? (

              <p className="mt-2 text-sm font-semibold text-[#6F4E37]">

                Ahorras {formatCurrency(discountValue)}{" "}

                (
                {discountPct ??
                  Math.round((discountValue / (subtotal || 1)) * 100)}
                % del subtotal)

              </p>

            ) : (

              <p className="mt-2 text-xs text-stone-400">
                Toca un porcentaje o escribe un valor en pesos.
              </p>

            )}

          </div>

          {/* TOTAL */}

          <div
            className="
              border-t
              border-stone-200
              pt-5
              flex
              items-center
              justify-between
            "
          >

            <span className="text-xl font-bold text-stone-900">
              Total
            </span>

            <span className="text-2xl font-bold text-[#6F4E37]">
              {formatCurrency(total)}
            </span>

          </div>

        </div>

      </section>

      {/* =========================================
          FORMA DE PAGO
      ========================================= */}

      <section
        className="
          bg-white
          border
          border-stone-200
          rounded-xl
          shadow-sm
          overflow-hidden
        "
      >

        <div className="p-5 sm:p-6 border-b border-stone-200">

          <div className="flex items-center gap-3">

            <div
              className="
                w-10
                h-10
                rounded-xl
                bg-[#F3EDE7]
                text-[#6F4E37]
                flex
                items-center
                justify-center
              "
            >
              <Wallet size={19} />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-stone-900">
                Forma de pago
              </h2>

              <p className="text-sm text-stone-500">
                Selecciona cómo se realizará el pago.
              </p>
            </div>

          </div>

        </div>

        <div className="p-5 sm:p-6">

          {/* MÉTODOS */}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">

            {/* EFECTIVO */}

            <button
              type="button"
              onClick={() => {
                setPaymentMethod("EFECTIVO");
                setSelectedBank("");
                setReceivedAmount("");
              }}
              className={`
                rounded-xl
                border
                p-4
                text-left
                transition
                ${
                  paymentMethod === "EFECTIVO"
                    ? "border-[#6F4E37] bg-[#FAF7F4]"
                    : "border-stone-200 hover:bg-stone-50"
                }
              `}
            >

              <Banknote
                size={21}
                className="text-[#6F4E37]"
              />

              <p className="font-semibold mt-3">
                Efectivo
              </p>

              <p className="text-xs text-stone-500 mt-1">
                Pago inmediato
              </p>

            </button>

            {/* TRANSFERENCIA */}

            <button
              type="button"
              onClick={() => {
                setPaymentMethod("TRANSFERENCIA");
                setReceivedAmount("");
              }}
              className={`
                rounded-xl
                border
                p-4
                text-left
                transition
                ${
                  paymentMethod === "TRANSFERENCIA"
                    ? "border-[#6F4E37] bg-[#FAF7F4]"
                    : "border-stone-200 hover:bg-stone-50"
                }
              `}
            >

              <Landmark
                size={21}
                className="text-[#6F4E37]"
              />

              <p className="font-semibold mt-3">
                Transferencia
              </p>

              <p className="text-xs text-stone-500 mt-1">
                Banco o Nequi
              </p>

            </button>

            {/* CONTRA ENTREGA */}

            <button
              type="button"
              onClick={() => {
                setPaymentMethod("CONTRA_ENTREGA");
                setSelectedBank("");
                setReceivedAmount("");
              }}
              className={`
                rounded-xl
                border
                p-4
                text-left
                transition
                ${
                  paymentMethod === "CONTRA_ENTREGA"
                    ? "border-[#6F4E37] bg-[#FAF7F4]"
                    : "border-stone-200 hover:bg-stone-50"
                }
              `}
            >

              <ShoppingCart
                size={21}
                className="text-[#6F4E37]"
              />

              <p className="font-semibold mt-3">
                Contra entrega
              </p>

              <p className="text-xs text-stone-500 mt-1">
                Pago al entregar
              </p>

            </button>

            {/* CRÉDITO */}

            <button
              type="button"
              onClick={() => {
                setPaymentMethod("CREDITO");
                setSelectedBank("");
                setReceivedAmount("");
              }}
              className={`
                rounded-xl
                border
                p-4
                text-left
                transition
                ${
                  paymentMethod === "CREDITO"
                    ? "border-[#6F4E37] bg-[#FAF7F4]"
                    : "border-stone-200 hover:bg-stone-50"
                }
              `}
            >

              <CreditCard
                size={21}
                className="text-[#6F4E37]"
              />

              <p className="font-semibold mt-3">
                Crédito
              </p>

              <p className="text-xs text-stone-500 mt-1">
                Pasa a cartera
              </p>

            </button>

            {/* ABONO */}

            <button
              type="button"
              onClick={() => {
                setPaymentMethod("ABONO");
                setSelectedBank("");
              }}
              className={`
                rounded-xl
                border
                p-4
                text-left
                transition
                ${
                  paymentMethod === "ABONO"
                    ? "border-[#6F4E37] bg-[#FAF7F4]"
                    : "border-stone-200 hover:bg-stone-50"
                }
              `}
            >

              <Wallet
                size={21}
                className="text-[#6F4E37]"
              />

              <p className="font-semibold mt-3">
                Abono
              </p>

              <p className="text-xs text-stone-500 mt-1">
                Pago parcial
              </p>

            </button>

          </div>

          {/* =========================================
              TRANSFERENCIA
          ========================================= */}

          {paymentMethod === "TRANSFERENCIA" && (

            <div
              className="
                mt-5
                p-5
                rounded-xl
                bg-[#FAF7F4]
                border
                border-[#D9C8BB]
              "
            >

              <label className="block text-sm font-semibold text-stone-700 mb-2">
                Cuenta donde recibimos el dinero
              </label>

              <Select
                value={selectedBank}
                onChange={(value) =>
                  setSelectedBank(value)
                }
                placeholder="Seleccionar cuenta..."
                aria-label="Cuenta bancaria"
                options={bankAccounts.map((bank) => ({
                  value: bank.id,
                  label: bank.name,
                  icon: Landmark,
                }))}
              />

              <p className="text-xs text-stone-500 mt-2">
                Esta cuenta será la que posteriormente
                reciba el movimiento de la venta.
              </p>

            </div>

          )}

          {/* =========================================
              ABONO
          ========================================= */}

          {paymentMethod === "ABONO" && (

            <div
              className="
                mt-5
                p-5
                rounded-xl
                bg-[#FAF7F4]
                border
                border-[#D9C8BB]
              "
            >

              <label className="block text-sm font-semibold text-stone-700 mb-2">
                Valor del abono
              </label>

              <div className="relative">

                <span
                  className="
                    absolute
                    left-4
                    top-1/2
                    -translate-y-1/2
                    text-stone-400
                  "
                >
                  $
                </span>

                <MoneyInput
                  value={receivedAmount}
                  onChange={setReceivedAmount}
                  placeholder="0"
                  className="
                    w-full
                    border
                    border-stone-300
                    rounded-xl
                    pl-9
                    pr-4
                    py-3
                    outline-none
                    focus:border-[#6F4E37]
                    focus:ring-2
                    focus:ring-[#6F4E37]/20
                  "
                />

              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">

                <div className="bg-white rounded-xl p-4 border border-stone-200">

                  <p className="text-xs text-stone-500">
                    Abono
                  </p>

                  <p className="font-bold text-stone-900 mt-1">
                    {formatCurrency(received)}
                  </p>

                </div>

                <div className="bg-white rounded-xl p-4 border border-stone-200">

                  <p className="text-xs text-stone-500">
                    Saldo pendiente
                  </p>

                  <p className="font-bold text-red-600 mt-1">
                    {formatCurrency(pendingAmount)}
                  </p>

                </div>

              </div>

            </div>

          )}

          {/* =========================================
              EFECTIVO
          ========================================= */}

          {paymentMethod === "EFECTIVO" && (

            <div
              className="
                mt-5
                p-5
                rounded-xl
                bg-[#FAF7F4]
                border
                border-[#D9C8BB]
              "
            >

              <label className="block text-sm font-semibold text-stone-700 mb-2">
                Dinero recibido
              </label>

              <div className="relative">

                <span
                  className="
                    absolute
                    left-4
                    top-1/2
                    -translate-y-1/2
                    text-stone-400
                  "
                >
                  $
                </span>

                <MoneyInput
                  value={receivedAmount}
                  onChange={setReceivedAmount}
                  placeholder="0"
                  className="
                    w-full
                    border
                    border-stone-300
                    rounded-xl
                    pl-9
                    pr-4
                    py-3
                    outline-none
                    focus:border-[#6F4E37]
                    focus:ring-2
                    focus:ring-[#6F4E37]/20
                  "
                />

              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">

                <div className="bg-white rounded-xl p-4 border border-stone-200">

                  <p className="text-xs text-stone-500">
                    Total
                  </p>

                  <p className="font-bold text-stone-900 mt-1">
                    {formatCurrency(total)}
                  </p>

                </div>

                <div className="bg-white rounded-xl p-4 border border-stone-200">

                  <p className="text-xs text-stone-500">
                    Cambio
                  </p>

                  <p className="font-bold text-green-600 mt-1">
                    {formatCurrency(change)}
                  </p>

                </div>

              </div>

            </div>

          )}

          {/* =========================================
              CRÉDITO
          ========================================= */}

          {paymentMethod === "CREDITO" && (

            <div
              className="
                mt-5
                rounded-xl
                bg-amber-50
                border
                border-amber-200
                p-5
              "
            >

              <p className="font-semibold text-stone-900">
                Venta a crédito
              </p>

              <p className="text-sm text-stone-600 mt-1">
                El valor completo de esta venta quedará
                pendiente y posteriormente aparecerá en
                Cartera.
              </p>

              <div className="mt-4 flex items-center justify-between">

                <span className="text-sm text-stone-600">
                  Saldo a cartera
                </span>

                <span className="font-bold text-amber-700">
                  {formatCurrency(total)}
                </span>

              </div>

            </div>

          )}

          {/* =========================================
              CONTRA ENTREGA
          ========================================= */}

          {paymentMethod === "CONTRA_ENTREGA" && (

            <div
              className="
                mt-5
                rounded-xl
                bg-blue-50
                border
                border-blue-200
                p-5
              "
            >

              <p className="font-semibold text-stone-900">
                Pago contra entrega
              </p>

              <p className="text-sm text-stone-600 mt-1">
                La venta quedará pendiente hasta que se
                realice el pago al momento de entregar.
              </p>

              <div className="mt-4 flex items-center justify-between">

                <span className="text-sm text-stone-600">
                  Valor pendiente
                </span>

                <span className="font-bold text-blue-700">
                  {formatCurrency(total)}
                </span>

              </div>

            </div>

          )}

        </div>

      </section>

      {/* =========================================
          RESUMEN FINAL
      ========================================= */}

      <section
        className="
          bg-[#FAF7F4]
          border
          border-[#D9C8BB]
          rounded-xl
          p-5
          sm:p-6
        "
      >

        {savingError && (
          <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
            {savingError}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">

          <div>

            <p className="text-sm text-stone-500">
              Total de la venta
            </p>

            <p className="text-3xl font-bold text-[#6F4E37] mt-1">
              {formatCurrency(total)}
            </p>

            {selectedCustomer && (
              <p className="text-sm text-stone-500 mt-2">
                Cliente: {selectedCustomer.fullName}
              </p>
            )}

          </div>

          <button
            type="button"
            onClick={handleSaveSale}
            disabled={!canSave}
            className="
              w-full
              sm:w-auto
              min-w-[220px]
              inline-flex
              items-center
              justify-center
              gap-2
              bg-[#6F4E37]
              hover:bg-[#5B3F2D]
              disabled:bg-stone-300
              disabled:text-stone-500
              disabled:cursor-not-allowed
              text-white
              px-7
              py-4
              rounded-xl
              font-semibold
              transition
            "
          >
            {saving && <Loader2 size={17} className="animate-spin" />}
            Registrar venta
          </button>

        </div>

        {!canSave && items.length > 0 && (
          <p className="text-sm text-red-500 mt-4">
            {!selectedCustomer
              ? "Selecciona un cliente para continuar."
              : paymentMethod === "TRANSFERENCIA" &&
                !selectedBank
              ? "Selecciona la cuenta donde recibiste la transferencia."
              : paymentMethod === "ABONO" &&
                received <= 0
              ? "Ingresa el valor del abono."
              : "Revisa la información de la venta."}
          </p>
        )}

      </section>

      {/* =========================================
          MODAL NUEVO CLIENTE (alta desde la venta)
      ========================================= */}

      {showClientModal && (
        <ClientFormModal
          onClose={() => setShowClientModal(false)}
          onSaved={handleClientSaved}
        />
      )}

    </div>
  );
}
