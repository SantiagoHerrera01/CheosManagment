import {
  Boxes,
  Calculator,
  CheckCircle2,
  KeyRound,
  Loader2,
  Pencil,
  RotateCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  UserRound,
  UserX,
  Users as UsersIcon,
} from "lucide-react";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { api, ApiError, qs } from "../lib/api";
import { ROLE_LABELS, initials } from "../lib/roles";
import { useAuth } from "../context/auth-context";
import Modal from "../components/ui/Modal";
import Select from "../components/ui/Select";
import type { Paginated, Role, User } from "../types/api";

const ROLES: Role[] = ["ADMIN", "VENDEDOR", "BODEGA", "CONTADOR"];

const ROLE_ICONS: Record<Role, typeof ShieldCheck> = {
  ADMIN: ShieldCheck,
  VENDEDOR: UserRound,
  BODEGA: Boxes,
  CONTADOR: Calculator,
};

const ROLE_BADGES: Record<Role, string> = {
  ADMIN: "bg-purple-50 text-purple-700",
  VENDEDOR: "bg-blue-50 text-blue-700",
  BODEGA: "bg-green-50 text-green-700",
  CONTADOR: "bg-amber-50 text-amber-700",
};

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

function formatDate(iso: string | null): string {
  if (!iso) return "Nunca";
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const inputClass =
  "w-full border border-stone-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#6F4E37]";

const labelClass = "block text-sm font-medium text-stone-700 mb-2";

type StatusFilter = "Todos" | "Activos" | "Inactivos";

/**
 * Gestión de usuarios (solo ADMIN): crear, editar rol, restablecer
 * contraseña y activar/desactivar con confirmación.
 */
export default function Users() {
  const { user: me } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"" | Role>("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Todos");

  const [editing, setEditing] = useState<User | null>(null);
  const [creating, setCreating] = useState(false);
  const [userRole, setUserRole] = useState<Role>("VENDEDOR");
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [toggleTarget, setToggleTarget] = useState<User | null>(null);

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
          includeInactive: "true",
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
  }, [search]);

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

  /** Filtrado por rol y estado en cliente (pocos usuarios). */
  const visible = useMemo(() => {
    return users.filter((user) => {
      if (roleFilter && user.role !== roleFilter) return false;
      if (statusFilter === "Activos" && !user.isActive) return false;
      if (statusFilter === "Inactivos" && user.isActive) return false;
      return true;
    });
  }, [users, roleFilter, statusFilter]);

  const stats = useMemo(
    () => ({
      total: users.length,
      active: users.filter((u) => u.isActive).length,
      inactive: users.filter((u) => !u.isActive).length,
      admins: users.filter((u) => u.role === "ADMIN").length,
    }),
    [users]
  );

  const closeModals = () => {
    setEditing(null);
    setCreating(false);
    setResetTarget(null);
    setToggleTarget(null);
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
      setFlash(target.isActive ? "Usuario desactivado." : "Usuario reactivado.");
      closeModals();
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
    <div className="space-y-7">

      {/* ENCABEZADO */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

        <div>
          <h1 className="text-3xl font-bold text-stone-800">
            Usuarios
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
            setToggleTarget(null);
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

      {/* STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">

        <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-stone-500 truncate">Total</p>
              <p className="text-lg sm:text-2xl font-bold text-stone-800 mt-1.5 sm:mt-2 truncate">{stats.total}</p>
            </div>
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-[#F3EDE7] text-[#6F4E37] flex items-center justify-center shrink-0">
              <UsersIcon size={18} />
            </div>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-stone-500 truncate">Activos</p>
              <p className="text-lg sm:text-2xl font-bold text-green-600 mt-1.5 sm:mt-2 truncate">{stats.active}</p>
            </div>
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
              <UserCheck size={18} />
            </div>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-stone-500 truncate">Inactivos</p>
              <p className="text-lg sm:text-2xl font-bold text-red-600 mt-1.5 sm:mt-2 truncate">{stats.inactive}</p>
            </div>
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
              <UserX size={18} />
            </div>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-sm col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-stone-500 truncate">Administradores</p>
              <p className="text-lg sm:text-2xl font-bold text-purple-600 mt-1.5 sm:mt-2 truncate">{stats.admins}</p>
            </div>
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <ShieldCheck size={18} />
            </div>
          </div>
        </div>

      </div>

      {/* FILTROS */}
      <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-5">

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">

          {/* BUSCADOR */}
          <div className="relative col-span-2 lg:col-span-1">

            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre o correo…"
              className="w-full border border-stone-300 rounded-xl py-3 pl-11 pr-4 outline-none focus:ring-2 focus:ring-[#6F4E37]/20 focus:border-[#6F4E37]"
            />

          </div>

          <Select
            value={roleFilter}
            onChange={(value) => setRoleFilter(value as "" | Role)}
            aria-label="Filtrar por rol"
            options={[
              { value: "", label: "Todos los roles", icon: UsersIcon },
              ...ROLES.map((role) => ({
                value: role,
                label: ROLE_LABELS[role],
                icon: ROLE_ICONS[role],
              })),
            ]}
          />

          <Select
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as StatusFilter)}
            aria-label="Filtrar por estado"
            options={[
              { value: "Todos", label: "Todos", icon: UsersIcon },
              { value: "Activos", label: "Activos", icon: UserCheck },
              { value: "Inactivos", label: "Inactivos", icon: UserX },
            ]}
          />

        </div>

      </div>

      {/* LISTA DE USUARIOS */}
      <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">

        {visible.length === 0 ? (
          <div className="py-12 text-center text-sm text-stone-400">
            Sin usuarios para mostrar.
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-hover">

            <table className="w-full min-w-[680px]">

              <thead>
                <tr className="bg-stone-50 border-b border-stone-200">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-stone-500 uppercase">Usuario</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-stone-500 uppercase">Rol</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-stone-500 uppercase">Estado</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-stone-500 uppercase">Último acceso</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-stone-500 uppercase">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {visible.map((account) => (
                  <tr key={account.id} className="border-b border-stone-100 last:border-0">

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">

                        <div className="w-10 h-10 rounded-full bg-[#F3EDE7] text-[#6F4E37] font-semibold flex items-center justify-center shrink-0">
                          {initials(account.fullName)}
                        </div>

                        <div className="min-w-0">
                          <p className="font-semibold text-stone-900 truncate">{account.fullName}</p>
                          <p className="text-sm text-stone-500 truncate">{account.email}</p>
                        </div>

                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_BADGES[account.role]}`}>
                        <ShieldCheck size={12} />
                        {ROLE_LABELS[account.role]}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      {account.isActive ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700">
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-stone-100 text-stone-500">
                          Inactivo
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-sm text-stone-500">
                      {formatDate(account.lastLoginAt)}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">

                        <button
                          type="button"
                          onClick={() => {
                            setEditing(account);
                            setCreating(false);
                            setResetTarget(null);
                            setToggleTarget(null);
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
                            setToggleTarget(null);
                            setFormError(null);
                          }}
                          title="Restablecer contraseña"
                          className="p-2 rounded-lg text-stone-500 hover:text-[#6F4E37] hover:bg-stone-100 transition-colors"
                        >
                          <KeyRound size={16} />
                        </button>

                        {account.id !== me?.id && (
                          <button
                            type="button"
                            onClick={() => {
                              setToggleTarget(account);
                              setEditing(null);
                              setCreating(false);
                              setResetTarget(null);
                              setFormError(null);
                            }}
                            title={account.isActive ? "Desactivar" : "Reactivar"}
                            className={`p-2 rounded-lg transition-colors ${
                              account.isActive
                                ? "text-stone-500 hover:text-red-600 hover:bg-red-50"
                                : "text-stone-500 hover:text-green-600 hover:bg-green-50"
                            }`}
                          >
                            {account.isActive ? <Trash2 size={16} /> : <CheckCircle2 size={16} />}
                          </button>
                        )}

                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>

            </table>

          </div>
        )}

      </div>

      {/* MODAL: CREAR / EDITAR USUARIO */}
      {(creating || editing) && (
        <Modal
          icon={UsersIcon}
          title={creating ? "Nuevo usuario" : "Editar usuario"}
          subtitle={
            creating
              ? "La contraseña debe cumplir la política de seguridad."
              : "Actualiza el nombre o el rol del usuario."
          }
          onClose={closeModals}
          onSubmit={handleUserSubmit}
          size="md"
          footer={
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModals}
                className="px-5 py-3 rounded-xl border border-stone-300 text-stone-700 font-medium hover:bg-stone-50 transition"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={saving}
                className="px-5 py-3 rounded-xl bg-[#6F4E37] hover:bg-[#5B3F2D] disabled:opacity-60 text-white font-semibold transition inline-flex items-center gap-2"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                {creating ? "Crear usuario" : "Guardar cambios"}
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
                aria-label="Rol"
                options={ROLES.map((role) => ({
                  value: role,
                  label: ROLE_LABELS[role],
                  icon: ROLE_ICONS[role],
                }))}
              />
            </div>

            {creating && (
              <div>
                <label className={labelClass}>Contraseña temporal *</label>

                <input
                  name="password"
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="Mínimo 10 caracteres"
                  className={inputClass}
                />

                <p className="text-xs text-stone-400 mt-2">
                  Mayúscula, minúscula y número. Debe cambiarla en su primer
                  ingreso.
                </p>
              </div>
            )}

          </div>

        </Modal>
      )}

      {/* MODAL: RESTABLECER CONTRASEÑA */}
      {resetTarget && (
        <Modal
          icon={KeyRound}
          title="Restablecer contraseña"
          subtitle={`${resetTarget.fullName} · ${resetTarget.email}`}
          onClose={closeModals}
          onSubmit={handleResetPassword}
          size="md"
          footer={
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModals}
                className="px-5 py-3 rounded-xl border border-stone-300 text-stone-700 font-medium hover:bg-stone-50 transition"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={saving}
                className="px-5 py-3 rounded-xl bg-[#6F4E37] hover:bg-[#5B3F2D] disabled:opacity-60 text-white font-semibold transition inline-flex items-center gap-2"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                Restablecer
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
              <label className={labelClass}>Nueva contraseña *</label>

              <input
                name="password"
                type="password"
                required
                autoComplete="new-password"
                placeholder="Mínimo 10 caracteres"
                className={inputClass}
              />

              <p className="text-xs text-stone-400 mt-2">
                Mayúscula, minúscula y número. Se cerrarán las sesiones
                abiertas de este usuario.
              </p>
            </div>

          </div>

        </Modal>
      )}

      {/* MODAL: CONFIRMAR CAMBIO DE ESTADO */}
      {toggleTarget && (
        <Modal
          icon={toggleTarget.isActive ? Trash2 : CheckCircle2}
          title={toggleTarget.isActive ? "¿Desactivar usuario?" : "¿Reactivar usuario?"}
          subtitle={
            toggleTarget.isActive
              ? "No podrá iniciar sesión aunque sus registros se conservan."
              : "Volverá a tener acceso al sistema."
          }
          onClose={closeModals}
          size="sm"
          footer={
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModals}
                className="px-5 py-3 rounded-xl border border-stone-300 text-stone-700 font-medium hover:bg-stone-50 transition"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => void toggleActive(toggleTarget)}
                className={`px-5 py-3 rounded-xl text-white font-semibold transition inline-flex items-center gap-2 ${
                  toggleTarget.isActive
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {toggleTarget.isActive ? "Sí, desactivar" : "Sí, reactivar"}
              </button>
            </div>
          }
        >

          <p className="text-sm text-stone-600 leading-6">
            Vas a {toggleTarget.isActive ? "desactivar" : "reactivar"} a{" "}
            <strong>{toggleTarget.fullName}</strong> ({toggleTarget.email}).
          </p>

        </Modal>
      )}

    </div>
  );
}
