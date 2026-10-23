import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  Factory,
  Wallet,
  Landmark,
  ShoppingBag,
  BarChart3,
  Settings,
  Coffee,
} from "lucide-react";

import { NavLink } from "react-router-dom";

const menuItems = [
  {
    name: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Ventas",
    path: "/ventas",
    icon: ShoppingCart,
  },
  {
    name: "Clientes",
    path: "/clientes",
    icon: Users,
  },
  {
    name: "Inventario",
    path: "/inventario",
    icon: Package,
  },
  {
    name: "Producción",
    path: "/produccion",
    icon: Factory,
  },
  {
    name: "Cartera",
    path: "/cartera",
    icon: Wallet,
  },
  {
    name: "Bancos",
    path: "/bancos",
    icon: Landmark,
  },
  {
    name: "Compras",
    path: "/compras",
    icon: ShoppingBag,
  },
  {
    name: "Reportes",
    path: "/reportes",
    icon: BarChart3,
  },
  {
    name: "Configuración",
    path: "/configuracion",
    icon: Settings,
  },
];

export default function Sidebar() {
  return (
    <aside className="w-64 min-h-screen bg-[#3E2924] text-white flex flex-col">

      {/* =========================================
          LOGO / NEGOCIO
      ========================================= */}

      <div className="h-24 px-5 flex items-center border-b border-white/10">

        <div className="flex items-center gap-3">

          <div className="w-11 h-11 rounded-xl bg-[#6F4E37] flex items-center justify-center shrink-0">
            <Coffee size={22} />
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

          {menuItems.map((item) => {

            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
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
                      ? "bg-[#6F4E37] text-white shadow-sm"
                      : "text-white/75 hover:bg-white/10 hover:text-white"
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

      {/* =========================================
          PARTE INFERIOR
      ========================================= */}

      <div className="px-4 py-4 border-t border-white/10">

        <div className="flex items-center gap-3 px-2">

          <div className="w-9 h-9 rounded-full bg-[#6F4E37] flex items-center justify-center text-sm font-bold">
            A
          </div>

          <div className="min-w-0">

            <p className="text-sm font-semibold truncate">
              Administrador
            </p>

            <p className="text-xs text-white/50">
              Cheo's Café
            </p>

          </div>

        </div>

      </div>

    </aside>
  );
}