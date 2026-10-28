import type { ReactElement } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../context/auth-context";
import type { Role } from "../types/api";

interface RequireRoleProps {
  /** Roles permitidos. ADMIN siempre tiene acceso. */
  roles: Role[];
  children: ReactElement;
}

/**
 * Guard de ruta por rol: exige sesión y uno de los roles indicados
 * (ADMIN siempre pasa). Si no cumple, vuelve al Dashboard.
 */
export default function RequireRole({ roles, children }: RequireRoleProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const allowed = user.role === "ADMIN" || roles.includes(user.role);

  if (!allowed) {
    return <Navigate to="/" replace />;
  }

  return children;
}
