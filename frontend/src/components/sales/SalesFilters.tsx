import { CalendarDays, Search, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

export default function SalesFilters() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Todos");
  const [date, setDate] = useState("Todas");

  return (
    <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-5">

      <div className="flex items-center gap-2 mb-5">

        <SlidersHorizontal
          size={18}
          className="text-[#6F4E37]"
        />

        <h2 className="font-semibold text-stone-800">
          Buscar ventas
        </h2>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* BUSCADOR */}
        <div className="relative">

          <Search
            size={18}
            className="
              absolute
              left-4
              top-1/2
              -translate-y-1/2
              text-stone-400
            "
          />

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Buscar por factura o cliente..."
            className="
              w-full
              border
              border-stone-300
              rounded-xl
              pl-11
              pr-4
              py-3
              outline-none
              focus:border-[#6F4E37]
              focus:ring-2
              focus:ring-[#6F4E37]/20
            "
          />

        </div>

        {/* ESTADO */}
        <select
          value={status}
          onChange={(event) =>
            setStatus(event.target.value)
          }
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
          "
        >
          <option value="Todos">
            Todos los estados
          </option>

          <option value="Pagada">
            Pagadas
          </option>

          <option value="Pendiente">
            Pendientes
          </option>

          <option value="Anulada">
            Anuladas
          </option>
        </select>

        {/* FECHA */}
        <div className="relative">

          <CalendarDays
            size={18}
            className="
              absolute
              left-4
              top-1/2
              -translate-y-1/2
              text-stone-400
            "
          />

          <select
            value={date}
            onChange={(event) =>
              setDate(event.target.value)
            }
            className="
              w-full
              border
              border-stone-300
              rounded-xl
              pl-11
              pr-4
              py-3
              bg-white
              outline-none
              focus:border-[#6F4E37]
            "
          >
            <option value="Todas">
              Todas las fechas
            </option>

            <option value="Hoy">
              Hoy
            </option>

            <option value="7">
              Últimos 7 días
            </option>

            <option value="30">
              Últimos 30 días
            </option>

            <option value="Mes">
              Este mes
            </option>
          </select>

        </div>

      </div>

    </div>
  );
}