import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";

export default function MainLayout() {
  return (
    <div className="flex min-h-screen bg-stone-100">
      <Sidebar />

      <main className="flex-1">
        <header className="h-16 bg-white shadow flex items-center justify-between px-8">
          <h1 className="text-xl font-semibold">
            Bienvenido 👋
          </h1>

          <div className="font-medium">
            Administrador
          </div>
        </header>

        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}