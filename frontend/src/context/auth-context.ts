/**
 * Contexto de autenticación: valor, contexto y hook `useAuth`.
 *
 * Separa el hook del proveedor (que es componente) para no mezclar
 * exports de componentes con funciones en el mismo archivo
 * (react-refresh/only-export-components).
 */
import { createContext, useContext } from "react";

import type { Role, User } from "../types/api";

export interface AuthContextValue {
  /** Usuario autenticado o `null` si no hay sesión. */
  user: User | null;
  /** true mientras se verifica la sesión inicial (GET /auth/me). */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** ADMIN siempre cumple; el resto solo si su rol está en la lista. */
  hasRole: (...roles: Role[]) => boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return context;
}
