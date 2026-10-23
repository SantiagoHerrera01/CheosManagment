import {
  Building2,
  FileText,
  CreditCard,
  Settings as SettingsIcon,
  Save,
  Phone,
  Mail,
  MapPin,
  Hash,
} from "lucide-react";

import { useState } from "react";

export default function Settings() {
  const [businessName, setBusinessName] = useState("Cheo's Café");
  const [nit, setNit] = useState("900123456-7");
  const [phone, setPhone] = useState("300 000 0000");
  const [email, setEmail] = useState("contacto@cheoscafe.com");
  const [address, setAddress] = useState("Medellín, Antioquia");

  const [invoicePrefix, setInvoicePrefix] = useState("");
  const [nextInvoice, setNextInvoice] = useState("1");

  const [cash, setCash] = useState(true);
  const [transfer, setTransfer] = useState(true);
  const [credit, setCredit] = useState(true);
  const [delivery, setDelivery] = useState(true);

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 2500);
  };

  return (
    <div className="space-y-8">

      {/* ENCABEZADO */}
      <div>
        <h1 className="text-4xl font-bold text-stone-900">
          Configuración
        </h1>

        <p className="text-stone-500 mt-2">
          Configura la información y funcionamiento de Cheo Manager.
        </p>
      </div>

      {/* INFORMACIÓN DEL NEGOCIO */}
      <section className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">

        <div className="p-6 border-b border-stone-200 flex items-center gap-4">

          <div className="bg-stone-100 text-[#6F4E37] p-3 rounded-xl">
            <Building2 size={22} />
          </div>

          <div>
            <h2 className="text-xl font-semibold text-stone-900">
              Información del negocio
            </h2>

            <p className="text-sm text-stone-500 mt-1">
              Datos principales de Cheo's Café.
            </p>
          </div>

        </div>

        <div className="p-6 grid grid-cols-2 gap-6">

          {/* NOMBRE */}
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">
              Nombre del negocio
            </label>

            <div className="relative">

              <Building2
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              />

              <input
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                className="
                  w-full
                  border
                  border-stone-300
                  rounded-xl
                  pl-10
                  pr-4
                  py-3
                  outline-none
                  focus:ring-2
                  focus:ring-[#6F4E37]
                "
              />

            </div>
          </div>

          {/* NIT */}
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">
              NIT
            </label>

            <div className="relative">

              <Hash
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              />

              <input
                value={nit}
                onChange={(event) => setNit(event.target.value)}
                className="
                  w-full
                  border
                  border-stone-300
                  rounded-xl
                  pl-10
                  pr-4
                  py-3
                  outline-none
                  focus:ring-2
                  focus:ring-[#6F4E37]
                "
              />

            </div>
          </div>

          {/* TELÉFONO */}
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">
              Teléfono
            </label>

            <div className="relative">

              <Phone
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              />

              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="
                  w-full
                  border
                  border-stone-300
                  rounded-xl
                  pl-10
                  pr-4
                  py-3
                  outline-none
                  focus:ring-2
                  focus:ring-[#6F4E37]
                "
              />

            </div>
          </div>

          {/* CORREO */}
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">
              Correo electrónico
            </label>

            <div className="relative">

              <Mail
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              />

              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="
                  w-full
                  border
                  border-stone-300
                  rounded-xl
                  pl-10
                  pr-4
                  py-3
                  outline-none
                  focus:ring-2
                  focus:ring-[#6F4E37]
                "
              />

            </div>
          </div>

          {/* DIRECCIÓN */}
          <div className="col-span-2">

            <label className="block text-sm font-semibold text-stone-700 mb-2">
              Dirección
            </label>

            <div className="relative">

              <MapPin
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              />

              <input
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                className="
                  w-full
                  border
                  border-stone-300
                  rounded-xl
                  pl-10
                  pr-4
                  py-3
                  outline-none
                  focus:ring-2
                  focus:ring-[#6F4E37]
                "
              />

            </div>

          </div>

        </div>

      </section>

      {/* FACTURACIÓN */}
      <section className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">

        <div className="p-6 border-b border-stone-200 flex items-center gap-4">

          <div className="bg-stone-100 text-[#6F4E37] p-3 rounded-xl">
            <FileText size={22} />
          </div>

          <div>
            <h2 className="text-xl font-semibold text-stone-900">
              Facturación
            </h2>

            <p className="text-sm text-stone-500 mt-1">
              Configura la numeración de las facturas.
            </p>
          </div>

        </div>

        <div className="p-6 grid grid-cols-2 gap-6">

          {/* PREFIJO */}
          <div>

            <label className="block text-sm font-semibold text-stone-700 mb-2">
              Prefijo de factura
            </label>

            <input
              value={invoicePrefix}
              onChange={(event) => setInvoicePrefix(event.target.value)}
              placeholder="Ej: FAC"
              className="
                w-full
                border
                border-stone-300
                rounded-xl
                px-4
                py-3
                outline-none
                focus:ring-2
                focus:ring-[#6F4E37]
              "
            />

            <p className="text-xs text-stone-400 mt-2">
              Puedes dejarlo vacío si no deseas utilizar prefijo.
            </p>

          </div>

          {/* PRÓXIMA FACTURA */}
          <div>

            <label className="block text-sm font-semibold text-stone-700 mb-2">
              Próximo número de factura
            </label>

            <input
              type="number"
              min="1"
              value={nextInvoice}
              onChange={(event) => setNextInvoice(event.target.value)}
              className="
                w-full
                border
                border-stone-300
                rounded-xl
                px-4
                py-3
                outline-none
                focus:ring-2
                focus:ring-[#6F4E37]
              "
            />

            <p className="text-xs text-stone-400 mt-2">
              La numeración aumentará automáticamente después de cada venta.
            </p>

          </div>

        </div>

      </section>

      {/* MÉTODOS DE PAGO */}
      <section className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">

        <div className="p-6 border-b border-stone-200 flex items-center gap-4">

          <div className="bg-stone-100 text-[#6F4E37] p-3 rounded-xl">
            <CreditCard size={22} />
          </div>

          <div>
            <h2 className="text-xl font-semibold text-stone-900">
              Métodos de pago
            </h2>

            <p className="text-sm text-stone-500 mt-1">
              Define los métodos disponibles al registrar una venta.
            </p>
          </div>

        </div>

        <div className="p-6 grid grid-cols-2 gap-4">

          {/* CONTADO */}
          <label className="flex items-center justify-between border border-stone-200 rounded-xl p-4 cursor-pointer hover:bg-stone-50">

            <div>
              <p className="font-semibold text-stone-900">
                Contado
              </p>

              <p className="text-sm text-stone-500">
                Pago inmediato.
              </p>
            </div>

            <input
              type="checkbox"
              checked={cash}
              onChange={(event) => setCash(event.target.checked)}
              className="w-5 h-5 accent-[#6F4E37]"
            />

          </label>

          {/* TRANSFERENCIA */}
          <label className="flex items-center justify-between border border-stone-200 rounded-xl p-4 cursor-pointer hover:bg-stone-50">

            <div>
              <p className="font-semibold text-stone-900">
                Transferencia
              </p>

              <p className="text-sm text-stone-500">
                Transferencias bancarias.
              </p>
            </div>

            <input
              type="checkbox"
              checked={transfer}
              onChange={(event) => setTransfer(event.target.checked)}
              className="w-5 h-5 accent-[#6F4E37]"
            />

          </label>

          {/* CRÉDITO */}
          <label className="flex items-center justify-between border border-stone-200 rounded-xl p-4 cursor-pointer hover:bg-stone-50">

            <div>
              <p className="font-semibold text-stone-900">
                Crédito
              </p>

              <p className="text-sm text-stone-500">
                Venta a crédito / fiado.
              </p>
            </div>

            <input
              type="checkbox"
              checked={credit}
              onChange={(event) => setCredit(event.target.checked)}
              className="w-5 h-5 accent-[#6F4E37]"
            />

          </label>

          {/* CONTRA ENTREGA */}
          <label className="flex items-center justify-between border border-stone-200 rounded-xl p-4 cursor-pointer hover:bg-stone-50">

            <div>
              <p className="font-semibold text-stone-900">
                Contra entrega
              </p>

              <p className="text-sm text-stone-500">
                Pago al recibir el pedido.
              </p>
            </div>

            <input
              type="checkbox"
              checked={delivery}
              onChange={(event) => setDelivery(event.target.checked)}
              className="w-5 h-5 accent-[#6F4E37]"
            />

          </label>

        </div>

      </section>

      {/* PREFERENCIAS */}
      <section className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">

        <div className="p-6 border-b border-stone-200 flex items-center gap-4">

          <div className="bg-stone-100 text-[#6F4E37] p-3 rounded-xl">
            <SettingsIcon size={22} />
          </div>

          <div>
            <h2 className="text-xl font-semibold text-stone-900">
              Preferencias
            </h2>

            <p className="text-sm text-stone-500 mt-1">
              Configuración general del sistema.
            </p>
          </div>

        </div>

        <div className="p-6">

          <div className="flex items-center justify-between border border-stone-200 rounded-xl p-4">

            <div>
              <p className="font-semibold text-stone-900">
                Moneda
              </p>

              <p className="text-sm text-stone-500">
                Moneda utilizada en el sistema.
              </p>
            </div>

            <span className="font-semibold text-stone-700">
              Peso colombiano (COP)
            </span>

          </div>

        </div>

      </section>

      {/* GUARDAR */}
      <div className="flex justify-end items-center gap-4">

        {saved && (
          <span className="text-green-600 font-medium">
            ✓ Configuración guardada
          </span>
        )}

        <button
          onClick={handleSave}
          className="
            flex
            items-center
            gap-2
            bg-[#6F4E37]
            hover:bg-[#5B3F2D]
            text-white
            px-6
            py-3
            rounded-xl
            font-semibold
            transition
          "
        >
          <Save size={20} />
          Guardar cambios
        </button>

      </div>

    </div>
  );
}