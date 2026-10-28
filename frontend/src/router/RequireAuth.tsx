import type { ReactElement } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../context/auth-context";

/**
 * Guarda de sesión: mientras se verifica (`loading`) muestra una pantalla
 * neutra; si no hay sesión, redirige a `/login` recordando de dónde venía.
 */
export default function RequireAuth({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center">
        <div className="text-[#6F4E37] text-sm font-medium animate-pulse">
          Verificando sesión…
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
