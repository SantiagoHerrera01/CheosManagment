import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import {
  ChevronDown,
  KeyRound,
  LogOut,
  Menu,
  ShieldCheck,
} from "lucide-react";

import Sidebar from "../components/Sidebar";
import Modal from "../components/ui/Modal";
import { useAuth } from "../context/auth-context";
import { api, ApiError } from "../lib/api";
import { ROLE_LABELS, initials } from "../lib/roles";

/** Título del header según la ruta actual. */
const TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/ventas": "Ventas",
  "/clientes": "Clientes",
  "/productos": "Productos",
  "/inventario": "Inventario",
  "/produccion": "Producción",
  "/cartera": "Cartera",
  "/gastos": "Gastos",
  "/bancos": "Bancos",
  "/compras": "Compras",
  "/reportes": "Reportes",
  "/configuracion": "Configuración",
};

const TODAY = new Intl.DateTimeFormat("es-CO", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
}).format(new Date());

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  /** Drawer del menú lateral en pantallas pequeñas. */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar el menú de perfil al hacer clic fuera o Escape; el drawer con Escape.
  useEffect(() => {
    if (!menuOpen && !drawerOpen) return;

    function onClick(event: MouseEvent) {
      if (menuOpen && !menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setDrawerOpen(false);
      }
    }

    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen, drawerOpen]);

  // Escape cierra el modal abierto (bug 20): todos los modales de la app
  // tienen role="dialog" y un botón aria-label="Cerrar". Si hay un dropdown
  // (Select) abierto, Escape lo cierra primero y el modal queda intacto.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;

      if (document.querySelector('[role="listbox"]')) return;

      const dialogs = document.querySelectorAll<HTMLElement>('[role="dialog"]');
      const top = dialogs[dialogs.length - 1];
      if (!top) return;

      top
        .querySelector<HTMLButtonElement>('button[aria-label="Cerrar"]')
        ?.click();
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Bloquea el scroll de la página mientras haya un modal abierto
  // (role="dialog") o el drawer móvil. Cubre todos los modales de la app
  // sin tocar cada archivo. La técnica con body fijo funciona también en
  // iOS Safari, donde overflow:hidden no basta.
  useEffect(() => {
    let locked = false;
    let scrollY = 0;

    const lock = () => {
      if (locked) return;
      locked = true;
      scrollY = window.scrollY;

      const scrollbar = window.innerWidth - document.documentElement.clientWidth;

      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";

      if (scrollbar > 0) {
        document.body.style.paddingRight = `${scrollbar}px`;
      }
    };

    const unlock = () => {
      if (!locked) return;
      locked = false;

      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.paddingRight = "";

      window.scrollTo(0, scrollY);
    };

    const sync = () => {
      const hasOverlay = document.querySelector(
        '[role="dialog"], [data-scroll-lock]'
      );

      if (hasOverlay) lock();
      else unlock();
    };

    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    sync();

    return () => {
      observer.disconnect();
      unlock();
    };
  }, []);

  if (!user) return null;

  const title = TITLES[pathname] ?? "Cheo's Café";

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen bg-stone-100">
      {/* Sidebar en escritorio: sticky a altura de viewport para que siempre
          cubra la columna izquierda mientras se hace scroll (sin hueco). */}
      <div className="hidden lg:block shrink-0 self-start sticky top-0 h-screen">
        <Sidebar />
      </div>

      {/* Drawer del menú en móvil */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50" data-scroll-lock>
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />

          <div className="absolute inset-y-0 left-0 w-64 max-w-[80vw] shadow-2xl">
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      <main className="flex-1 min-w-0">
        {/* =========================================
            HEADER: título + fecha | perfil de usuario
        ========================================= */}

        <header className="h-16 bg-white border-b border-stone-200 shadow-sm sticky top-0 z-40 flex items-center justify-between gap-4 px-4 sm:px-8">

          <div className="flex items-center gap-3 min-w-0">

            {/* Hamburguesa: abre el menú lateral en pantallas pequeñas */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Abrir menú"
              className="lg:hidden p-2 -ml-2 rounded-xl text-stone-600 hover:bg-stone-100 transition-colors shrink-0"
            >
              <Menu size={22} />
            </button>

            <div className="min-w-0">
              <h1 className="text-lg font-bold text-stone-900 truncate leading-tight">
                {title}
              </h1>

              <p className="text-xs text-stone-500 truncate">{TODAY}</p>
            </div>
          </div>

          <div className="relative" ref={menuRef}>

            {/* Botón perfil */}
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-xl hover:bg-stone-100 transition-colors"
            >

              <div className="text-right hidden sm:block">

                <p className="text-sm font-semibold text-stone-800 leading-tight truncate max-w-[180px]">
                  {user.fullName}
                </p>

                <p className="text-xs text-stone-500">
                  {ROLE_LABELS[user.role]}
                </p>

              </div>

              <div className="w-9 h-9 rounded-full bg-[#6F4E37] text-white flex items-center justify-center text-sm font-bold shrink-0">
                {initials(user.fullName)}
              </div>

              <ChevronDown
                size={16}
                className={`text-stone-400 transition-transform ${
                  menuOpen ? "rotate-180" : ""
                }`}
              />

            </button>

            {/* Dropdown */}
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-stone-200 shadow-xl overflow-hidden"
              >

                <div className="px-4 py-4 bg-stone-50 border-b border-stone-200 flex items-center gap-3">

                  <div className="w-11 h-11 rounded-full bg-[#6F4E37] text-white flex items-center justify-center font-bold shrink-0">
                    {initials(user.fullName)}
                  </div>

                  <div className="min-w-0">

                    <p className="text-sm font-bold text-stone-900 truncate">
                      {user.fullName}
                    </p>

                    <p className="text-xs text-stone-500 truncate">
                      {user.email}
                    </p>

                    <span className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-semibold bg-[#6F4E37]/10 text-[#6F4E37] px-2 py-0.5 rounded-full">
                      <ShieldCheck size={12} />
                      {ROLE_LABELS[user.role]}
                    </span>

                  </div>

                </div>

                <div className="p-2">

                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setPwOpen(true);
                    }}
                    role="menuitem"
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-stone-700 hover:bg-stone-100 transition-colors"
                  >
                    <KeyRound size={16} className="text-stone-400" />
                    Cambiar contraseña
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleLogout()}
                    role="menuitem"
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={16} />
                    Cerrar sesión
                  </button>

                </div>

              </div>
            )}

          </div>

        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>

      {pwOpen && user && <ChangePasswordModal onClose={() => setPwOpen(false)} />}
    </div>
  );
}

// ------------------------------------------------------------
//  Modal: cambiar contraseña (POST /auth/change-password)
// ------------------------------------------------------------

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (next !== confirm) {
      setError("La confirmación no coincide con la nueva contraseña.");
      return;
    }

    setSaving(true);

    try {
      await api.post("/auth/change-password", {
        currentPassword: current,
        newPassword: next,
      });

      setDone(true);
      setTimeout(onClose, 1400);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "No se pudo cambiar la contraseña.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full border border-stone-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#6F4E37]";

  return (
    <Modal
      icon={KeyRound}
      title="Cambiar contraseña"
      subtitle="Se cerrarán las demás sesiones de este usuario."
      onClose={onClose}
      onSubmit={(event) => void handleSubmit(event)}
      size="md"
      footer={
        <div className="flex justify-end gap-3">

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-stone-600 hover:bg-stone-200 transition-colors"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={saving || done}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#6F4E37] hover:bg-[#5B3F2D] text-white disabled:opacity-60 transition-colors"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>

        </div>
      }
    >

        <div className="space-y-4">

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {done && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3">
              ✓ Contraseña actualizada.
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Contraseña actual *
            </label>

            <input
              type="password"
              autoComplete="current-password"
              required
              value={current}
              onChange={(event) => setCurrent(event.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Nueva contraseña *
            </label>

            <input
              type="password"
              autoComplete="new-password"
              required
              value={next}
              onChange={(event) => setNext(event.target.value)}
              className={inputClass}
            />

            <p className="text-xs text-stone-400 mt-2">
              Mínimo 10 caracteres, con mayúscula, minúscula y número.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Confirmar nueva contraseña *
            </label>

            <input
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              className={inputClass}
            />
          </div>

        </div>

    </Modal>
  );
}
