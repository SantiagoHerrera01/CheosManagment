import {
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { type FormEvent, useEffect, useState } from "react";

import { api, ApiError } from "../lib/api";
import { ROLE_LABELS, initials } from "../lib/roles";
import { useAuth } from "../context/auth-context";

/** Mismo criterio que el backend (`validatePasswordStrength`). */
function passwordError(password: string): string | null {
  if (password.length < 10) return "Debe tener al menos 10 caracteres.";
  if (!/[A-Z]/.test(password)) return "Debe contener al menos una mayúscula.";
  if (!/[a-z]/.test(password)) return "Debe contener al menos una minúscula.";
  if (!/[0-9]/.test(password)) return "Debe contener al menos un número.";
  if (/^(password|123456|admin|cheo)/i.test(password)) {
    return "La contraseña es demasiado común.";
  }
  return null;
}

const inputClass =
  "w-full border border-stone-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#6F4E37]";

const labelClass = "block text-sm font-medium text-stone-700 mb-2";

/**
 * Perfil del usuario autenticado: sus datos y cambio de contraseña
 * (POST /auth/change-password). La gestión de usuarios es solo para
 * ADMIN y vive en `/usuarios`.
 */
export default function Settings() {
  const { user } = useAuth();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  // Aviso temporal tras guardar.
  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => setDone(false), 3000);
    return () => clearTimeout(timer);
  }, [done]);

  if (!user) return null;

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setDone(false);

    const policy = passwordError(next);
    if (policy) {
      setError(policy);
      return;
    }

    if (next !== confirm) {
      setError("La confirmación no coincide con la contraseña nueva.");
      return;
    }

    setSaving(true);

    try {
      await api.post("/auth/change-password", {
        currentPassword: current,
        newPassword: next,
      });

      setCurrent("");
      setNext("");
      setConfirm("");
      setDone(true);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No fue posible cambiar la contraseña."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-7">

      {/* ENCABEZADO */}
      <div>
        <h1 className="text-3xl font-bold text-stone-800">
          Mi perfil
        </h1>

        <p className="text-stone-500 mt-2">
          Tus datos de acceso en Cheo Manager.
        </p>
      </div>

      {/* DATOS */}
      <section className="bg-white border border-stone-200 rounded-2xl shadow-sm p-6">

        <div className="flex items-center gap-4">

          <div className="w-16 h-16 rounded-full bg-[#F3EDE7] text-[#6F4E37] text-xl font-bold flex items-center justify-center">
            {initials(user.fullName)}
          </div>

          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-stone-900 truncate">
              {user.fullName}
            </h2>

            <p className="text-sm text-stone-500 mt-0.5 truncate">
              {user.email}
            </p>
          </div>

        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">

          <div className="flex items-center gap-3 rounded-xl bg-stone-50 border border-stone-200 px-4 py-3">
            <UserRound size={18} className="text-[#6F4E37] shrink-0" />

            <div>
              <p className="text-xs text-stone-500">Nombre</p>
              <p className="text-sm font-semibold text-stone-800 truncate">
                {user.fullName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-stone-50 border border-stone-200 px-4 py-3">
            <Mail size={18} className="text-[#6F4E37] shrink-0" />

            <div>
              <p className="text-xs text-stone-500">Correo</p>
              <p className="text-sm font-semibold text-stone-800 truncate">
                {user.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-stone-50 border border-stone-200 px-4 py-3">
            <ShieldCheck size={18} className="text-[#6F4E37] shrink-0" />

            <div>
              <p className="text-xs text-stone-500">Rol</p>
              <p className="text-sm font-semibold text-stone-800">
                {ROLE_LABELS[user.role]}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-stone-50 border border-stone-200 px-4 py-3">
            <KeyRound size={18} className="text-[#6F4E37] shrink-0" />

            <div>
              <p className="text-xs text-stone-500">Último acceso</p>
              <p className="text-sm font-semibold text-stone-800">
                {user.lastLoginAt
                  ? new Date(user.lastLoginAt).toLocaleDateString("es-CO", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "Primer ingreso"}
              </p>
            </div>
          </div>

        </div>

      </section>

      {/* CONTRASEÑA */}
      <section className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">

        <div className="p-6 border-b border-stone-200 flex items-center gap-4">

          <div className="bg-stone-100 text-[#6F4E37] p-3 rounded-xl">
            <KeyRound size={22} />
          </div>

          <div>
            <h2 className="text-xl font-semibold text-stone-900">
              Cambiar contraseña
            </h2>

            <p className="text-sm text-stone-500 mt-1">
              Al cambiarla se cerrarán tus demás sesiones abiertas.
            </p>
          </div>

        </div>

        <form onSubmit={(event) => void handleChangePassword(event)} className="p-6 space-y-4">

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {done && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3">
              <CheckCircle2 size={16} />
              Contraseña actualizada correctamente.
            </div>
          )}

          <div>
            <label className={labelClass}>Contraseña actual *</label>

            <input
              type="password"
              required
              autoComplete="current-password"
              value={current}
              onChange={(event) => setCurrent(event.target.value)}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <div>
              <label className={labelClass}>Contraseña nueva *</label>

              <input
                type="password"
                required
                autoComplete="new-password"
                value={next}
                onChange={(event) => setNext(event.target.value)}
                placeholder="Mínimo 10 caracteres"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Confirmar contraseña *</label>

              <input
                type="password"
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                className={inputClass}
              />
            </div>

          </div>

          <p className="text-xs text-stone-400">
            Debe contener mayúscula, minúscula y número.
          </p>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="
                inline-flex
                items-center
                gap-2
                bg-[#6F4E37]
                hover:bg-[#5B3F2D]
                disabled:opacity-60
                text-white
                px-5
                py-3
                rounded-xl
                font-semibold
                transition
              "
            >
              {saving ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <Save size={17} />
              )}
              Guardar contraseña
            </button>
          </div>

        </form>

      </section>

    </div>
  );
}
