import { type FormEvent, type ReactNode } from "react";

import { X, type LucideIcon } from "lucide-react";

type ModalSize = "sm" | "md" | "lg" | "xl";

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
};

interface ModalProps {
  /** Icono del header (junto al título). */
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  /** Barra inferior de acciones (botones Cancelar/Guardar…). */
  footer?: ReactNode;
  /** Si se pasa, el panel se renderiza como <form> con este handler. */
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  size?: ModalSize;
}

/**
 * Shell estándar de modales: header con icono + título, X de cierre en la
 * esquina (sin contenedor), esquinas suaves, scrollbar oculta hasta hover y
 * pantalla completa en móvil.
 */
export default function Modal({
  icon: Icon,
  title,
  subtitle,
  onClose,
  children,
  footer,
  onSubmit,
  size = "md",
}: ModalProps) {
  const panelClasses = `
    w-full
    h-full
    sm:h-auto
    sm:max-h-[92vh]
    ${SIZE_CLASSES[size]}
    bg-white
    sm:rounded-xl
    shadow-2xl
    flex
    flex-col
    overflow-hidden
  `;

  const header = (
    <div className="flex items-start gap-3 px-5 sm:px-6 py-4 border-b border-stone-200 shrink-0">
      {Icon && (
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
          <Icon size={19} />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <h2 className="text-lg font-bold text-stone-900 truncate">
          {title}
        </h2>

        {subtitle && (
          <p className="text-sm text-stone-500 mt-0.5">
            {subtitle}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        className="
          p-1.5
          -m-1.5
          rounded-lg
          text-stone-400
          hover:text-stone-700
          transition-colors
          shrink-0
        "
      >
        <X size={20} />
      </button>
    </div>
  );

  const body = (
    <div className="flex-1 overflow-y-auto scrollbar-hover px-5 sm:px-6 py-5">
      {children}
    </div>
  );

  const actions = footer && (
    <div className="px-5 sm:px-6 py-4 border-t border-stone-200 bg-stone-50 shrink-0">
      {footer}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-black/50 sm:p-6">
      {onSubmit ? (
        <form
          onSubmit={onSubmit}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={panelClasses}
        >
          {header}
          {body}
          {actions}
        </form>
      ) : (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={panelClasses}
        >
          {header}
          {body}
          {actions}
        </div>
      )}
    </div>
  );
}
