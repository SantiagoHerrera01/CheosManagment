import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/auth-context";

export default function RequirePermission({ permission, children }: { permission: string; children: ReactNode }) {
  const { user, loading, hasPermission } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return hasPermission(permission) ? <>{children}</> : <Navigate to="/" replace />;
}
