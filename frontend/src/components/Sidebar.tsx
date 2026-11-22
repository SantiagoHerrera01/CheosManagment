import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  Factory,
  Wallet,
  Landmark,
  ShoppingBag,
  Receipt,
  BarChart3,
} from "lucide-react";

import { NavLink } from "react-router-dom";

import { useAuth } from "../context/auth-context";
import type { Role } from "../types/api";

interface MenuItem {
  name: string;
  path: string;
  icon: typeof LayoutDashboard;
  /** Roles que ven el item (ADMIN siempre). Sin `roles` = todos. `[]` = solo ADMIN. */
  roles?: Role[];
}

const menuItems: MenuItem[] = [
  {
    name: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Ventas",
    path: "/ventas",
    icon: ShoppingCart,
    roles: ["VENDEDOR", "CONTADOR"],
  },
  {
    name: "Clientes",
    path: "/clientes",
    icon: Users,
    roles: ["VENDEDOR", "CONTADOR"],
  },
  {
    name: "Inventario",
    path: "/inventario",
    icon: Package,
    roles: ["BODEGA"],
  },
  {
    name: "Producción",
    path: "/produccion",
    icon: Factory,
    roles: ["BODEGA"],
  },
  {
    name: "Cartera",
    path: "/cartera",
    icon: Wallet,
    roles: ["VENDEDOR", "CONTADOR"],
  },
  {
    name: "Gastos",
    path: "/gastos",
    icon: Receipt,
    roles: ["VENDEDOR", "CONTADOR"],
  },
  {
    name: "Bancos",
    path: "/bancos",
    icon: Landmark,
    roles: ["CONTADOR"],
  },
  {
    name: "Compras",
    path: "/compras",
    icon: ShoppingBag,
    roles: ["CONTADOR", "BODEGA"],
  },
  {
    name: "Reportes",
    path: "/reportes",
    icon: BarChart3,
    roles: ["CONTADOR"],
  },
];

interface SidebarProps {
  /**
   * Se ejecuta al navegar desde el menú. En móvil sirve para cerrar el
   * drawer; en escritorio puede quedar vacío.
   */
  onNavigate?: () => void;
}

export default function Sidebar({ onNavigate }: SidebarProps) {
  const { user, hasRole } = useAuth();

  if (!user) return null;

  // ADMIN ve todo; el resto solo los items cuyo rol coincide.
  // `roles: []` → solo ADMIN (hasRole sin argumentos solo lo cumple ADMIN).
  const visibleItems = menuItems.filter(
    (item) => !item.roles || hasRole(...item.roles)
  );

  return (
    <aside className="w-64 h-full min-h-screen bg-[#6F4E37] text-white flex flex-col overflow-y-auto">

      {/* =========================================
          LOGO / NEGOCIO
      ========================================= */}

      <div className="h-24 px-5 flex items-center border-b border-white/10">

        <div className="flex items-center gap-3">

          <div className="w-11 h-11 rounded-xl bg-[#8B5E3C] flex items-center justify-center shrink-0">
            <img
              src="/logo-cheos.png"
              alt="Cheo's Café"
              className="w-11 h-11 rounded-xl bg-white object-contain p-1"
            />
          </div>

          <div>
            <h1 className="font-bold text-lg leading-tight">
              Cheo's Café
            </h1>

            <p className="text-xs text-white/60 mt-0.5">
              Manager
            </p>
          </div>

        </div>

      </div>

      {/* =========================================
          MENÚ
      ========================================= */}

      <nav className="flex-1 px-3 py-5">

        <div className="space-y-1">

          {visibleItems.map((item) => {

            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `
                  group
                  flex
                  items-center
                  gap-3
                  px-4
                  py-3
                  rounded-xl
                  text-sm
                  font-medium
                  transition-all
                  ${
                    isActive
                      ? "bg-[#7A5238] text-white shadow-sm"
                      : "text-white/90 hover:bg-white/15 hover:text-white"
                  }
                  `
                }
              >

                <Icon
                  size={19}
                  strokeWidth={1.8}
                  className="shrink-0"
                />

                <span>
                  {item.name}
                </span>

              </NavLink>
            );

          })}

        </div>

      </nav>

    </aside>
  );
}
