import {
  ClipboardList,
  Coffee,
  Package,
  Plus,
  ArrowRight,
} from "lucide-react";

export default function Production() {
  return (
    <div className="space-y-8">

      {/* ENCABEZADO */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-stone-900">
            Producción
          </h1>

          <p className="text-stone-500 mt-2">
            Controla la producción y transformación del café.
          </p>
        </div>

        <button
          className="
            flex items-center gap-2
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
          <Plus size={20} />
          Nueva producción
        </button>
      </div>

      {/* RESUMEN */}
      <div className="grid grid-cols-3 gap-6">

        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-stone-500">
                Producciones de hoy
              </p>

              <p className="text-3xl font-bold mt-2">
                0
              </p>
            </div>

            <div className="bg-stone-100 p-3 rounded-xl text-[#6F4E37]">
              <ClipboardList size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-stone-500">
                Café procesado
              </p>

              <p className="text-3xl font-bold mt-2">
                0 kg
              </p>
            </div>

            <div className="bg-stone-100 p-3 rounded-xl text-[#6F4E37]">
              <Coffee size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-stone-500">
                Productos terminados
              </p>

              <p className="text-3xl font-bold mt-2">
                0
              </p>
            </div>

            <div className="bg-stone-100 p-3 rounded-xl text-[#6F4E37]">
              <Package size={24} />
            </div>
          </div>
        </div>

      </div>

      {/* NUEVA PRODUCCIÓN */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm">

        <div className="p-6 border-b border-stone-200">
          <h2 className="text-xl font-semibold text-stone-900">
            Registrar producción
          </h2>

          <p className="text-stone-500 mt-1">
            Registra el café utilizado y el producto que se obtiene.
          </p>
        </div>

        <div className="p-6">

          <div className="grid grid-cols-2 gap-6">

            {/* PRODUCTO DE ORIGEN */}
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">
                Producto de origen
              </label>

              <select
                className="
                  w-full
                  border border-stone-300
                  rounded-xl
                  px-4
                  py-3
                  bg-white
                  outline-none
                  focus:ring-2
                  focus:ring-[#6F4E37]
                "
              >
                <option value="">
                  Seleccionar producto
                </option>

                <option>
                  CHEO'S Tradicional
                </option>

                <option>
                  Chiroso Urrao
                </option>

                <option>
                  Papayo Honey
                </option>

                <option>
                  Bourbon Rosado Honey
                </option>

                <option>
                  Natural Melaza de Caña
                </option>
              </select>
            </div>

            {/* CANTIDAD */}
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">
                Cantidad utilizada
              </label>

              <div className="flex gap-3">
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  className="
                    flex-1
                    border border-stone-300
                    rounded-xl
                    px-4
                    py-3
                    outline-none
                    focus:ring-2
                    focus:ring-[#6F4E37]
                  "
                />

                <select
                  className="
                    w-28
                    border border-stone-300
                    rounded-xl
                    px-4
                    py-3
                    bg-white
                    outline-none
                  "
                >
                  <option>kg</option>
                  <option>g</option>
                </select>
              </div>
            </div>

          </div>

          {/* TRANSFORMACIÓN */}
          <div className="flex items-center justify-center gap-4 my-8">

            <div className="bg-stone-100 px-6 py-4 rounded-xl text-center">
              <Coffee
                className="mx-auto text-[#6F4E37]"
                size={24}
              />

              <p className="font-semibold mt-2">
                Materia prima
              </p>
            </div>

            <ArrowRight
              className="text-[#6F4E37]"
              size={28}
            />

            <div className="bg-stone-100 px-6 py-4 rounded-xl text-center">
              <Package
                className="mx-auto text-[#6F4E37]"
                size={24}
              />

              <p className="font-semibold mt-2">
                Producto terminado
              </p>
            </div>

          </div>

          {/* PRODUCTO RESULTANTE */}
          <div className="grid grid-cols-2 gap-6">

            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">
                Producto resultante
              </label>

              <select
                className="
                  w-full
                  border border-stone-300
                  rounded-xl
                  px-4
                  py-3
                  bg-white
                  outline-none
                  focus:ring-2
                  focus:ring-[#6F4E37]
                "
              >
                <option value="">
                  Seleccionar presentación
                </option>

                <option>
                  CHEO'S Tradicional - 125 g
                </option>

                <option>
                  CHEO'S Tradicional - 250 g
                </option>

                <option>
                  CHEO'S Tradicional - 500 g
                </option>

                <option>
                  CHEO'S Tradicional - 2.5 kg
                </option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">
                Cantidad producida
              </label>

              <input
                type="number"
                min="0"
                placeholder="0"
                className="
                  w-full
                  border border-stone-300
                  rounded-xl
                  px-4
                  py-3
                  outline-none
                  focus:ring-2
                  focus:ring-[#6F4E37]
                "
              />
            </div>

          </div>

          {/* BOTÓN */}
          <div className="flex justify-end mt-8">

            <button
              className="
                flex items-center gap-2
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
              <ClipboardList size={20} />
              Registrar producción
            </button>

          </div>

        </div>
      </div>

      {/* HISTORIAL */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm">

        <div className="p-6 border-b border-stone-200">
          <h2 className="text-xl font-semibold">
            Historial de producción
          </h2>

          <p className="text-stone-500 mt-1">
            Últimas producciones registradas.
          </p>
        </div>

        <div className="p-10 text-center text-stone-400">
          <ClipboardList
            className="mx-auto mb-3"
            size={40}
          />

          <p>
            Todavía no hay producciones registradas.
          </p>
        </div>

      </div>

    </div>
  );
}