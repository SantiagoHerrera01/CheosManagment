import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { api, AUTH_EXPIRED_EVENT, ApiError } from "../lib/api";
import { AuthContext } from "./auth-context";
import type { Role, User } from "../types/api";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Sesión inicial: si la cookie de acceso sigue válida, /auth/me responde;
  // si no, el cliente HTTP rota con /auth/refresh (o devuelve 401 en seco).
  // Los setStates viven en callbacks de la promesa (nunca síncronos en el effect).
  useEffect(() => {
    let cancelled = false;

    api
      .get<User>("/auth/me")
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && !error.isAuthError) {
          console.warn("[auth] No fue posible verificar la sesión:", error);
        }
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Sesión muerta detectada por el cliente HTTP (refresh fallido)
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<User>(
      "/auth/login",
      { email, password },
      { skipRefresh: true }
    );
    setUser(data);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout", undefined, { skipRefresh: true });
    } finally {
      setUser(null);
    }
  }, []);

  const hasRole = useCallback(
    (...roles: Role[]) => {
      if (!user) return false;
      return user.role === "ADMIN" || roles.includes(user.role);
    },
    [user]
  );

  const value = useMemo(
    () => ({ user, loading, login, logout, hasRole }),
    [user, loading, login, logout, hasRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
