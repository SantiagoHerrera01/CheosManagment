import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Check, ChevronDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  /** Ítem decorativo del listado (y del botón seleccionado). */
  icon?: LucideIcon;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  /** Texto gris cuando no hay nada seleccionado. */
  placeholder?: string;
  /** Clases extra para el botón disparador (ancho, alto…). */
  className?: string;
  "aria-label"?: string;
}

/**
 * Select personalizado (reemplaza al `<select>` nativo): menú con portal
 * (no se corta en contenedores con scroll), íconos por opción, check en la
 * selección, animación de apertura y cierre con Escape o clic fuera.
 */
export default function Select({
  value,
  onChange,
  options,
  placeholder = "Selecciona…",
  className = "",
  "aria-label": ariaLabel,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  /** Posición fixed del menú; se calcula al abrir. */
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, above: false });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selected = options.find((option) => option.value === value);

  /**
   * Opción con el texto más largo: una copia invisible (misma caja que el
   * texto visible) fija el ancho del botón para que nunca quede chiquito
   * ni recorte lo seleccionado.
   */
  const longest = options.reduce(
    (max, option) => (option.label.length > max.length ? option.label : max),
    placeholder
  );

  function toggle() {
    const rect = triggerRef.current?.getBoundingClientRect();

    if (!open && rect) {
      const spaceBelow = window.innerHeight - rect.bottom;
      const above = spaceBelow < 232 && rect.top > spaceBelow;

      setPos({
        top: above ? rect.top - 8 : rect.bottom + 8,
        left: rect.left,
        width: rect.width,
        above,
      });
    }

    setOpen((current) => !current);
  }

  function choose(option: SelectOption) {
    onChange(option.value);
    setOpen(false);
  }

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

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="listbox"
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
          {selected?.icon && (
            <selected.icon size={16} className="shrink-0 text-[#6F4E37]" />
          )}

          {/* La copia invisible de la opción más larga fija el ancho:
              el botón tiene siempre el mismo tamaño (el de la opción más
              grande) aunque se elija una corta como "Hoy". */}
          <span className="grid min-w-0 overflow-hidden">
            <span
              aria-hidden
              className="
                [grid-area:1/1]
                invisible
                whitespace-nowrap
                text-sm
              "
            >
              {longest}
            </span>

            <span
              className={`
                [grid-area:1/1]
                truncate
                text-sm
                ${selected ? "text-stone-800" : "text-stone-400"}
              `}
            >
              {selected?.label ?? placeholder}
            </span>
          </span>
        </span>

        <ChevronDown
          size={16}
          className={`
            shrink-0
            text-stone-400
            transition-transform
            duration-200
            ${open ? "rotate-180 text-[#6F4E37]" : ""}
          `}
        />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              minWidth: pos.width,
              width: "max-content",
              maxWidth: "min(22rem, calc(100vw - 2rem))",
              transformOrigin: pos.above ? "bottom" : "top",
            }}
            className="select-pop z-[60] max-h-60 overflow-y-auto rounded-xl border border-stone-200 bg-white p-1.5 shadow-2xl shadow-stone-900/10"
          >
            {options.map((option) => {
              const isSelected = option.value === value;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => choose(option)}
                  className={`
                    flex
                    w-full
                    items-center
                    gap-2.5
                    rounded-lg
                    px-3
                    py-2.5
                    text-left text-sm
                    transition
                    ${
                      isSelected
                        ? "bg-[#6F4E37]/10 text-[#4B2F26] font-semibold"
                        : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                    }
                  `}
                >
                  {option.icon && (
                    <option.icon
                      size={16}
                      className={`
                        shrink-0
                        ${isSelected ? "text-[#6F4E37]" : "text-stone-400"}
                      `}
                    />
                  )}

                  <span className="flex-1 whitespace-normal break-words">
                    {option.label}
                  </span>

                  {isSelected && (
                    <Check size={15} className="shrink-0 text-[#6F4E37]" />
                  )}
                </button>
              );
            })}

            {options.length === 0 && (
              <p className="px-3 py-2 text-sm text-stone-400">
                Sin opciones disponibles.
              </p>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
