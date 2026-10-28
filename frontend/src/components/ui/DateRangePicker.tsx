import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";

export interface DateRange {
  /** ISO yyyy-mm-dd (vacío = sin límite). */
  from: string;
  to: string;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (value: DateRange) => void;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
}

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/** Date local → "yyyy-mm-dd" (sin desfase de zona horaria). */
function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** "yyyy-mm-dd" → Date local. */
function fromISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Etiqueta corta tipo "12 oct" (o "12 oct 2025" si es de otro año). */
function formatShort(iso: string): string {
  const date = fromISO(iso);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  if (date.getFullYear() !== new Date().getFullYear()) {
    opts.year = "numeric";
  }
  return date.toLocaleDateString("es-CO", opts).replace(".", "");
}

/** Días de la semana (lunes primero) del mes dado. */
function monthGrid(month: Date): (Date | null)[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const startOffset = (first.getDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();

  const cells: (Date | null)[] = Array.from({ length: startOffset }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(month.getFullYear(), month.getMonth(), day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

interface QuickRange {
  label: string;
  range: () => DateRange;
}

const QUICK_RANGES: QuickRange[] = [
  {
    label: "Hoy",
    range: () => ({ from: toISO(new Date()), to: toISO(new Date()) }),
  },
  {
    label: "Últimos 7 días",
    range: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(to.getDate() - 6);
      return { from: toISO(from), to: toISO(to) };
    },
  },
  {
    label: "Últimos 30 días",
    range: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(to.getDate() - 29);
      return { from: toISO(from), to: toISO(to) };
    },
  },
  {
    label: "Este mes",
    range: () => {
      const now = new Date();
      return {
        from: toISO(new Date(now.getFullYear(), now.getMonth(), 1)),
        to: toISO(now),
      };
    },
  },
];

/**
 * Selector de rango de fechas en un solo campo (estilo Hero UI): calendario
 * desplegable con navegación por meses, rango resaltado con preview al hover
 * y rangos rápidos. Menú con portal: nunca se corta en contenedores con scroll.
 */
export default function DateRangePicker({
  value,
  onChange,
  placeholder = "Selecciona un rango…",
  className = "",
  "aria-label": ariaLabel,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, above: false });
  /** Mes visible del calendario. */
  const [month, setMonth] = useState(() =>
    value.from ? fromISO(value.from) : new Date()
  );
  /**
   * Inicio elegido pendiente de fin. Si hay un clic en un día posterior se
   * completa el rango; si es anterior, se reinicia desde ahí.
   */
  const [pendingFrom, setPendingFrom] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cierre con clic fuera y Escape.
  useEffect(() => {
    if (!open) return;

    function onMouseDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function toggle() {
    const rect = triggerRef.current?.getBoundingClientRect();

    if (!open && rect) {
      const spaceBelow = window.innerHeight - rect.bottom;
      const above = spaceBelow < 380 && rect.top > spaceBelow;

      setPos({
        top: above ? rect.top - 8 : rect.bottom + 8,
        left: Math.min(rect.left, window.innerWidth - rect.width - 12),
        width: rect.width,
        above,
      });

      // El calendario abre en el mes del inicio del rango (o el actual).
      setMonth(value.from ? fromISO(value.from) : new Date());
      setPendingFrom(null);
      setHovered(null);
    }

    setOpen((current) => !current);
  }

  function pickDay(iso: string) {
    if (!pendingFrom) {
      setPendingFrom(iso);
      onChange({ from: iso, to: "" });
      return;
    }

    if (iso < pendingFrom) {
      setPendingFrom(iso);
      onChange({ from: iso, to: "" });
      return;
    }

    onChange({ from: pendingFrom, to: iso });
    setPendingFrom(null);
    setHovered(null);
    setOpen(false);
  }

  function clear(event: React.MouseEvent) {
    event.stopPropagation();
    onChange({ from: "", to: "" });
    setPendingFrom(null);
    setOpen(false);
  }

  /** Rango efectivo para resaltar (incluye el preview con el hover). */
  const highlight = useMemo(() => {
    const from = pendingFrom ?? value.from;
    const to = pendingFrom && hovered ? hovered : value.to;
    return { from, to };
  }, [pendingFrom, value.from, value.to, hovered]);

  const label = useMemo(() => {
    if (value.from && value.to) {
      return `${formatShort(value.from)} – ${formatShort(value.to)}`;
    }
    if (value.from) {
      return `Desde ${formatShort(value.from)}`;
    }
    return placeholder;
  }, [value.from, value.to, placeholder]);

  const cells = useMemo(() => monthGrid(month), [month]);
  const todayISO = toISO(new Date());

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={`
          flex
          items-center
          justify-between
          gap-2
          w-full
          min-w-[min(14rem,100%)]
          border
          border-stone-300
          rounded-xl
          bg-white
          px-4
          py-3
          text-left
          outline-none
          transition
          duration-150
          hover:border-stone-400
          focus:ring-2
          focus:ring-[#6F4E37]/20
          focus:border-[#6F4E37]
          ${className}
        `}
      >
        <span className="flex items-center gap-2 min-w-0">
          <CalendarDays size={16} className="shrink-0 text-[#6F4E37]" />

          <span
            className={`truncate text-sm ${
              value.from ? "text-stone-800" : "text-stone-400"
            }`}
          >
            {label}
          </span>
        </span>

        {/* LIMPIAR + CHEVRON juntos a la derecha */}
        <span className="flex items-center gap-0.5 shrink-0">
          {value.from && (
            <span
              role="button"
              aria-label="Limpiar rango"
              onClick={clear}
              className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            >
              <X size={14} />
            </span>
          )}

          <ChevronDown
            size={16}
            className={`
              text-stone-400
              transition-transform
              duration-200
              ${open ? "rotate-180 text-[#6F4E37]" : ""}
            `}
          />
        </span>
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            data-popover
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              transformOrigin: pos.above ? "bottom" : "top",
            }}
            className="select-pop z-[60] w-[19rem] rounded-2xl border border-stone-200 bg-white p-4 shadow-2xl shadow-stone-900/10"
          >
            {/* RANGOS RÁPIDOS */}
            <div className="flex flex-wrap gap-1.5 pb-3 mb-3 border-b border-stone-100">
              {QUICK_RANGES.map((quick) => {
                const isActive =
                  value.from === quick.range().from && value.to === quick.range().to;

                return (
                  <button
                    key={quick.label}
                    type="button"
                    onClick={() => {
                      onChange(quick.range());
                      setPendingFrom(null);
                      setHovered(null);
                      setOpen(false);
                    }}
                    className={`
                      px-2.5
                      py-1
                      rounded-full
                      text-xs
                      font-medium
                      transition-colors
                      ${
                        isActive
                          ? "bg-[#6F4E37] text-white"
                          : "bg-stone-100 text-stone-600 hover:bg-[#F3EDE7] hover:text-[#6F4E37]"
                      }
                    `}
                  >
                    {quick.label}
                  </button>
                );
              })}
            </div>

            {/* HEADER DEL MES */}
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                aria-label="Mes anterior"
                onClick={() =>
                  setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
                }
                className="p-1.5 rounded-lg text-stone-400 hover:text-[#6F4E37] hover:bg-stone-100 transition-colors"
              >
                <ChevronLeft size={17} />
              </button>

              <p className="text-sm font-semibold text-stone-800">
                {MONTHS[month.getMonth()]}{" "}
                <span className="text-stone-400 font-normal">
                  {month.getFullYear()}
                </span>
              </p>

              <button
                type="button"
                aria-label="Mes siguiente"
                onClick={() =>
                  setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
                }
                className="p-1.5 rounded-lg text-stone-400 hover:text-[#6F4E37] hover:bg-stone-100 transition-colors"
              >
                <ChevronRight size={17} />
              </button>
            </div>

            {/* DÍAS DE LA SEMANA */}
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="h-8 flex items-center justify-center text-[11px] font-semibold text-stone-400 uppercase"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* GRILLA DE DÍAS */}
            <div className="grid grid-cols-7 gap-y-0.5">
              {cells.map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} className="h-8" />;
                }

                const iso = toISO(date);
                const isFrom = highlight.from === iso;
                const isTo = highlight.to === iso;
                const isEndpoint = isFrom || isTo;

                const inRange =
                  highlight.from &&
                  highlight.to &&
                  iso > highlight.from &&
                  iso < highlight.to;

                const isToday = iso === todayISO;

                return (
                  <div
                    key={iso}
                    className={`
                      h-8
                      relative
                      flex
                      items-center
                      justify-center
                      ${
                        inRange
                          ? "bg-[#F3EDE7]"
                          : isFrom && highlight.to
                            ? "bg-[#F3EDE7] rounded-l-full"
                            : isTo
                              ? "bg-[#F3EDE7] rounded-r-full"
                              : ""
                      }
                    `}
                  >
                    <button
                      type="button"
                      onMouseEnter={() => setHovered(iso)}
                      onMouseLeave={() => setHovered(null)}
                      onClick={() => pickDay(iso)}
                      className={`
                        h-8
                        w-8
                        rounded-full
                        text-[13px]
                        transition-colors
                        ${
                          isEndpoint
                            ? "bg-[#6F4E37] text-white font-semibold shadow-sm"
                            : isToday
                              ? "text-[#6F4E37] font-semibold border border-[#D9C8BB]"
                              : "text-stone-700 hover:bg-stone-100"
                        }
                      `}
                    >
                      {date.getDate()}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* AYUDA */}
            <p className="mt-3 pt-3 border-t border-stone-100 text-xs text-stone-400 text-center">
              {pendingFrom
                ? "Elige la fecha final del rango"
                : "Elige la fecha inicial"}
            </p>
          </div>,
          document.body
        )}
    </>
  );
}
