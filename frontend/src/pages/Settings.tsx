import {
  Users,
  UserPlus,
  ShieldCheck,
  Pencil,
  KeyRound,
  Save,
  Loader2,
  RotateCw,
  Search,
  CheckCircle2,
  Ban,
} from "lucide-react";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import { api, ApiError, qs } from "../lib/api";
import { ROLE_LABELS, initials } from "../lib/roles";
import { useAuth } from "../context/auth-context";
import Select from "../components/ui/Select";
import Modal from "../components/ui/Modal";
import type { Paginated, Role, User } from "../types/api";

const ROLES: Role[] = ["ADMIN", "VENDEDOR", "BODEGA", "CONTADOR"];

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

export default function Settings() {
  const { user: me } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [includeInactive, setIncludeInactive] = useState(true);

  // Modales
  const [editing, setEditing] = useState<User | null>(null);
  /** Rol elegido en el modal de usuario (el select nativo ya no aporta valor). */
  const [userRole, setUserRole] = useState<Role>("VENDEDOR");
  const [creating, setCreating] = useState(false);
  const [resetTarget, setResetTarget] = useState<User | null>(null);

  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const result = await api.get<Paginated<User>>(
        `/users${qs({
          q: search.trim(),
          includeInactive: String(includeInactive),
          limit: 100,
        })}`
      );

      setUsers(result.data);
    } catch (error) {
      setLoadError(
        error instanceof ApiError
          ? error.message
          : "No fue posible cargar los usuarios."
      );
    } finally {
      setLoading(false);
    }
  }, [search, includeInactive]);

  // Debounce de la búsqueda (350 ms, igual que el resto de la app).
  useEffect(() => {
    const timer = setTimeout(() => void load(), 350);
    return () => clearTimeout(timer);
  }, [load]);

  // Aviso temporal tras una acción exitosa.
  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(null), 3000);
    return () => clearTimeout(timer);
  }, [flash]);

  const closeModals = () => {
    setEditing(null);
    setCreating(false);
    setResetTarget(null);
    setFormError(null);
  };

  /** Crear / editar usuario. */
  async function handleUserSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const form = new FormData(event.currentTarget);
    const fullName = String(form.get("fullName") ?? "").trim();
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const role = String(form.get("role") ?? "") as Role;
    const password = String(form.get("password") ?? "");

    if (fullName.length < 3) {
      setFormError("El nombre debe tener al menos 3 caracteres.");
      return;
    }

    setSaving(true);

    try {
      if (creating) {
        const policy = passwordError(password);
        if (policy) {
          setFormError(policy);
          setSaving(false);
          return;
        }

        await api.post("/users", { fullName, email, password, role });
        setFlash("Usuario creado correctamente.");
      } else if (editing) {
        await api.patch(`/users/${editing.id}`, { fullName, role });
        setFlash("Usuario actualizado.");
      }

      closeModals();
      await load();
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : "No fue posible guardar el usuario."
      );
    } finally {
      setSaving(false);
    }
  }

  /** Activar / desactivar usuario (baja lógica). */
  async function toggleActive(target: User) {
    setFormError(null);

    try {
      await api.patch(`/users/${target.id}`, { isActive: !target.isActive });
      setFlash(
        target.isActive
          ? "Usuario desactivado."
          : "Usuario reactivado."
      );
      await load();
    } catch (error) {
      setLoadError(
        error instanceof ApiError
          ? error.message
          : "No fue posible cambiar el estado."
      );
    }
  }

  /** Restablecer contraseña de otro usuario. */
  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resetTarget) return;

    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");

    const policy = passwordError(password);
    if (policy) {
      setFormError(policy);
      return;
    }

    setFormError(null);
    setSaving(true);

    try {
      await api.post(`/users/${resetTarget.id}/reset-password`, {
        newPassword: password,
      });

      setFlash(`Contraseña de ${resetTarget.fullName} restablecida.`);
      closeModals();
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : "No fue posible restablecer la contraseña."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading && users.length === 0) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-[#6F4E37]">
        <Loader2 size={26} className="animate-spin" />

        <p className="text-sm font-medium">Cargando usuarios…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* ENCABEZADO */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

        <div>
          <h1 className="text-3xl font-bold text-stone-800">
            Configuración
          </h1>

          <p className="text-stone-500 mt-2">
            Gestiona los usuarios y accesos de Cheo Manager.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setCreating(true);
            setEditing(null);
            setResetTarget(null);
            setFormError(null);
            setUserRole("VENDEDOR");
          }}
          className="
            inline-flex
            items-center
            justify-center
            gap-2
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
          <UserPlus size={19} />
          Nuevo usuario
        </button>

      </div>

      {flash && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3">
          <CheckCircle2 size={16} />
          {flash}
        </div>
      )}

      {loadError && (
        <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          <span>{loadError}</span>

          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 font-semibold"
          >
            <RotateCw size={14} />
            Reintentar
          </button>
        </div>
      )}

      {/* USUARIOS */}
      <section className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">

        <div className="p-6 border-b border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-4">

          <div className="flex items-center gap-4">

            <div className="bg-stone-100 text-[#6F4E37] p-3 rounded-xl">
              <Users size={22} />
            </div>

            <div>
              <h2 className="text-xl font-semibold text-stone-900">
                Usuarios del sistema
              </h2>

              <p className="text-sm text-stone-500 mt-1">
                {users.length} usuario{users.length === 1 ? "" : "s"}{" "}
                en la lista.
              </p>
            </div>

          </div>

          <div className="flex items-center gap-4">

            <div className="relative">

              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nombre o correo"
                className="border border-stone-300 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#6F4E37] w-64"
              />

            </div>

            <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(event) =>
                  setIncludeInactive(event.target.checked)
                }
                className="w-4 h-4 accent-[#6F4E37]"
              />
              Incluir inactivos
            </label>

          </div>

        </div>

        <div className="overflow-x-auto">

          <table className="w-full">

            <thead>
              <tr className="border-b border-stone-200 text-left">
                <th className="px-6 py-4 text-xs font-semibold text-stone-500 uppercase">
                  Usuario
                </th>

                <th className="px-6 py-4 text-xs font-semibold text-stone-500 uppercase">
                  Rol
                </th>

                <th className="px-6 py-4 text-xs font-semibold text-stone-500 uppercase">
                  Estado
                </th>

                <th className="px-6 py-4 text-xs font-semibold text-stone-500 uppercase">
                  Último acceso
                </th>

                <th className="px-6 py-4 text-xs font-semibold text-stone-500 uppercase text-right">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody>
              {users.map((account) => {
                const isMe = account.id === me?.id;

                return (
                  <tr
                    key={account.id}
                    className="border-b border-stone-100 last:border-0 hover:bg-stone-50 transition"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">

                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                            account.isActive
                              ? "bg-[#6F4E37] text-white"
                              : "bg-stone-300 text-stone-600"
                          }`}
                        >
                          {initials(account.fullName)}
                        </div>

                        <div className="min-w-0">

                          <p className="text-sm font-semibold text-stone-800 truncate">
                            {account.fullName}
                            {isMe && (
                              <span className="ml-2 text-xs font-normal text-stone-400">
                                (tú)
                              </span>
                            )}
                          </p>

                          <p className="text-xs text-stone-500 truncate">
                            {account.email}
                          </p>

                        </div>

                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold bg-[#6F4E37]/10 text-[#6F4E37] px-2.5 py-1 rounded-full">
                        <ShieldCheck size={12} />
                        {ROLE_LABELS[account.role]}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={
                          account.isActive
                            ? "inline-flex px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"
                            : "inline-flex px-3 py-1 rounded-full text-xs font-medium bg-stone-200 text-stone-600"
                        }
                      >
                        {account.isActive ? "Activo" : "Inactivo"}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-sm text-stone-600">
                      {account.lastLoginAt
                        ? new Date(account.lastLoginAt).toLocaleString(
                            "es-CO",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )
                        : "Nunca"}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">

                        <button
                          type="button"
                          onClick={() => {
                            setEditing(account);
                            setCreating(false);
                            setResetTarget(null);
                            setFormError(null);
                            setUserRole(account.role);
                          }}
                          title="Editar usuario"
                          className="p-2 rounded-lg text-stone-500 hover:text-[#6F4E37] hover:bg-stone-100 transition-colors"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setResetTarget(account);
                            setEditing(null);
                            setCreating(false);
                            setFormError(null);
                          }}
                          title="Restablecer contraseña"
                          className="p-2 rounded-lg text-stone-500 hover:text-[#6F4E37] hover:bg-stone-100 transition-colors"
                        >
                          <KeyRound size={16} />
                        </button>

                        <button
                          type="button"
                          disabled={isMe}
                          onClick={() => void toggleActive(account)}
                          title={
                            isMe
                              ? "No puedes desactivar tu propia cuenta"
                              : account.isActive
                                ? "Desactivar"
                                : "Reactivar"
                          }
                          className="p-2 rounded-lg text-stone-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        >
                          <Ban size={16} />
                        </button>

                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>

          </table>

          {users.length === 0 && !loadError && (
            <p className="p-6 text-sm text-stone-500">
              No se encontraron usuarios.
            </p>
          )}

        </div>

      </section>

      {/* PREFERENCIAS */}
      <section className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">

        <div className="p-6 border-b border-stone-200 flex items-center gap-4">

          <div className="bg-stone-100 text-[#6F4E37] p-3 rounded-xl">
            <Save size={22} />
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

          <p className="text-xs text-stone-400 mt-4">
            La información del negocio y los métodos de pago se
            configurarán cuando esté disponible esa sección en el
            backend.
          </p>

        </div>

      </section>

      {/* MODAL: crear / editar usuario */}
      {(creating || editing) && (
        <Modal
          icon={Users}
          title={creating ? "Nuevo usuario" : "Editar usuario"}
          subtitle={
            creating
              ? "La contraseña debe cumplir la política de seguridad."
              : "Actualiza el nombre o el rol del usuario."
          }
          onClose={closeModals}
          onSubmit={(event) => void handleUserSubmit(event)}
          size="md"
          footer={
            <div className="flex justify-end gap-3">

              <button
                type="button"
                onClick={closeModals}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-stone-600 hover:bg-stone-200 transition-colors"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#6F4E37] hover:bg-[#5B3F2D] text-white disabled:opacity-60 transition-colors"
              >
                {saving ? "Guardando…" : "Guardar"}
              </button>

            </div>
          }
        >

          <div className="space-y-4">

              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                  {formError}
                </div>
              )}

              <div>
                <label className={labelClass}>Nombre completo *</label>

                <input
                  name="fullName"
                  required
                  minLength={3}
                  defaultValue={editing?.fullName ?? ""}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Correo *</label>

                <input
                  name="email"
                  type="email"
                  required
                  disabled={!creating}
                  defaultValue={editing?.email ?? ""}
                  placeholder="usuario@cheo.com"
                  className={`${inputClass} disabled:bg-stone-100 disabled:text-stone-500`}
                />

                {!creating && (
                  <p className="text-xs text-stone-400 mt-2">
                    El correo no se puede modificar.
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass}>Rol *</label>

                <input type="hidden" name="role" value={userRole} />

                <Select
                  value={userRole}
                  onChange={(value) => setUserRole(value as Role)}
                  options={ROLES.map((role) => ({
                    value: role,
                    label: ROLE_LABELS[role],
                    icon: ShieldCheck,
                  }))}
                  aria-label="Rol"
                />
              </div>

              {creating && (
                <div>
                  <label className={labelClass}>
                    Contraseña temporal *
                  </label>

                  <input
                    name="password"
                    type="password"
                    required
                    autoComplete="new-password"
                    className={inputClass}
                  />

                  <p className="text-xs text-stone-400 mt-2">
                    Mínimo 10 caracteres, con mayúscula, minúscula
                    y número.
                  </p>
                </div>
              )}

          </div>
        </Modal>
      )}

      {/* MODAL: restablecer contraseña */}
      {resetTarget && (
        <Modal
          icon={KeyRound}
          title="Restablecer contraseña"
          subtitle={`${resetTarget.fullName} · ${resetTarget.email}`}
          onClose={closeModals}
          onSubmit={(event) => void handleResetPassword(event)}
          size="md"
          footer={
            <div className="flex justify-end gap-3">

              <button
                type="button"
                onClick={closeModals}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-stone-600 hover:bg-stone-200 transition-colors"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#6F4E37] hover:bg-[#5B3F2D] text-white disabled:opacity-60 transition-colors"
              >
                {saving ? "Restableciendo…" : "Restablecer"}
              </button>

            </div>
          }
        >

          <div className="space-y-4">

              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                  {formError}
                </div>
              )}

              <div>
                <label className={labelClass}>
                  Nueva contraseña *
                </label>

                <input
                  name="password"
                  type="password"
                  required
                  autoComplete="new-password"
                  className={inputClass}
                />

                <p className="text-xs text-stone-400 mt-2">
                  Mínimo 10 caracteres, con mayúscula, minúscula y
                  número. Se cerrarán todas las sesiones de ese
                  usuario.
                </p>
              </div>

          </div>
        </Modal>
      )}

    </div>
  );
}
