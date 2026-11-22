import { useEffect, useState } from "react";
import { Pencil, Plus, Shield, Trash2 } from "lucide-react";
import { api, ApiError } from "../lib/api";
import Modal from "../components/ui/Modal";
import { useAuth } from "../context/auth-context";
import type { RoleDefinition } from "../types/api";

const labels: Record<string, string> = {
  "users.view": "Ver usuarios", "users.manage": "Administrar usuarios",
  "roles.view": "Ver roles", "roles.manage": "Administrar roles",
  "sales.view": "Ver ventas", "sales.create": "Crear ventas", "sales.payments": "Registrar pagos",
  "clients.view": "Ver clientes", "clients.manage": "Administrar clientes",
  "inventory.view": "Ver inventario", "inventory.manage": "Administrar inventario",
  "production.view": "Ver producción", "production.manage": "Administrar producción",
  "expenses.view": "Ver gastos", "expenses.manage": "Administrar gastos",
  "purchases.view": "Ver compras", "purchases.manage": "Administrar compras",
  "banks.view": "Ver bancos", "banks.manage": "Administrar bancos", "reports.view": "Ver reportes",
};

export default function Roles() {
  const { hasPermission } = useAuth();
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [editing, setEditing] = useState<RoleDefinition | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const [r, p] = await Promise.all([api.get<RoleDefinition[]>("/roles"), api.get<string[]>("/roles/permissions")]);
      setRoles(r); setPermissions(p);
    } catch (e) { setError(e instanceof ApiError ? e.message : "No fue posible cargar los roles."); }
  }
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null);
    const form = new FormData(event.currentTarget);
    const selected = permissions.filter((p) => form.get(`permission:${p}`) === "on");
    const body = { code: String(form.get("code")), name: String(form.get("name")), description: String(form.get("description") || ""), permissions: selected };
    try { if (editing) await api.patch(`/roles/${editing.id}`, body); else await api.post("/roles", body); setOpen(false); setEditing(null); await load(); }
    catch (e) { setError(e instanceof ApiError ? e.message : "No fue posible guardar el rol."); }
  }
  async function remove(role: RoleDefinition) {
    if (!confirm(`¿Eliminar el rol ${role.name}?`)) return;
    try { await api.delete(`/roles/${role.id}`); await load(); } catch (e) { setError(e instanceof ApiError ? e.message : "No fue posible eliminar el rol."); }
  }

  return <div className="p-6 max-w-6xl mx-auto space-y-6">
    <div className="flex items-center justify-between"><div><h1 className="text-3xl font-bold text-stone-900">Roles y permisos</h1><p className="text-stone-500 mt-1">Configura exactamente qué puede hacer cada rol.</p></div>{hasPermission("roles.manage") && <button onClick={() => { setEditing(null); setOpen(true); }} className="flex items-center gap-2 bg-[#6F4E37] text-white px-4 py-3 rounded-xl font-semibold"><Plus size={18}/> Nuevo rol</button>}</div>
    {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{roles.map((role) => <div key={role.id} className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm"><div className="flex items-start justify-between"><div className="flex gap-3"><div className="p-2 rounded-xl bg-stone-100 text-[#6F4E37]"><Shield size={20}/></div><div><h2 className="font-bold text-lg">{role.name}</h2><p className="text-xs text-stone-400">{role.code}</p></div></div><span className="text-xs bg-stone-100 rounded-full px-2 py-1">{role._count?.users ?? 0} usuarios</span></div><p className="text-sm text-stone-500 my-4 min-h-10">{role.description || "Sin descripción"}</p><p className="text-xs text-stone-500">{role.permissions.includes("*") ? "Acceso completo" : `${role.permissions.length} permisos`}</p>{hasPermission("roles.manage") && <div className="flex gap-2 mt-4"><button onClick={() => { setEditing(role); setOpen(true); }} className="flex-1 border border-stone-200 rounded-lg py-2 flex justify-center gap-2"><Pencil size={15}/> Editar</button><button disabled={role.isSystem} onClick={() => void remove(role)} className="border border-red-200 text-red-600 rounded-lg px-3 disabled:opacity-30"><Trash2 size={15}/></button></div>}</div>)}</div>
    {open && <Modal title={editing ? "Editar rol" : "Crear rol"} onClose={() => { setOpen(false); setEditing(null); }}><form onSubmit={save} className="space-y-4"><input name="code" required disabled={Boolean(editing)} defaultValue={editing?.code ?? ""} placeholder="CODIGO_ROL" className="w-full border rounded-xl px-3 py-2"/><input name="name" required defaultValue={editing?.name ?? ""} placeholder="Nombre del rol" className="w-full border rounded-xl px-3 py-2"/><textarea name="description" defaultValue={editing?.description ?? ""} placeholder="Descripción" className="w-full border rounded-xl px-3 py-2"/><div className="grid sm:grid-cols-2 gap-2 max-h-64 overflow-auto">{permissions.map((permission) => <label key={permission} className="flex gap-2 items-center text-sm"><input type="checkbox" name={`permission:${permission}`} defaultChecked={editing?.permissions.includes(permission) || editing?.permissions.includes("*")} />{labels[permission] ?? permission}</label>)}</div><button className="w-full bg-[#6F4E37] text-white rounded-xl py-3 font-semibold">Guardar rol</button></form></Modal>}
  </div>;
}
