import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock3,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import Select from "../ui/Select";
import DateRangePicker from "../ui/DateRangePicker";

export type SalesFilterValues = {
  q: string;
  status: string;
  from: string;
  to: string;
};

type SalesFiltersProps = {
  q: string;
  status: string;
  from: string;
  to: string;
  onChange: (filters: SalesFilterValues) => void;
};

export default function SalesFilters({
  q,
  status,
  from,
  to,
  onChange,
}: SalesFiltersProps) {
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

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">

        {/* BUSCADOR */}

        <div className="relative col-span-2 lg:col-span-1">

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
            value={q}
            onChange={(event) =>
              onChange({
                q: event.target.value,
                status,
                from,
                to,
              })
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

        <Select
          value={status}
          onChange={(value) =>
            onChange({
              q,
              status: value,
              from,
              to,
            })
          }
          aria-label="Estado de la factura"
          options={[
            { value: "", label: "Todas", icon: SlidersHorizontal },
            { value: "PENDIENTE", label: "Pendientes", icon: Clock3 },
            { value: "PAGADA", label: "Pagadas", icon: CheckCircle2 },
            { value: "VENCIDA", label: "Vencidas", icon: AlertTriangle },
            { value: "ANULADA", label: "Anuladas", icon: Ban },
          ]}
        />

        {/* RANGO DE FECHAS */}

        <DateRangePicker
          value={{ from, to }}
          onChange={(range) =>
            onChange({
              q,
              status,
              from: range.from,
              to: range.to,
            })
          }
          aria-label="Rango de fechas"
        />

      </div>

    </div>
  );
}
