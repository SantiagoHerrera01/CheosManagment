/**
 * Cliente HTTP de la Cheo Manager API.
 *
 * - Usa cookies (`credentials: "include"`): nunca hay tokens en JS.
 * - Si el access token expiró (401), intenta UNA rotación de sesión con
 *   `POST /auth/refresh` y reintenta la petición original. Varias peticiones
 *   simultáneas comparten un solo refresh (no se "rinde" toda la app).
 * - Normaliza la respuesta: devuelve el `data` de `{ data }` o lanza `ApiError`
 *   con el `{ error: { code, message, details } }` del backend.
 */

const BASE_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3000/api";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** true cuando la sesión ya no sirve y hay que volver al login. */
  get isAuthError(): boolean {
    return this.status === 401;
  }
}

/** Disparado cuando ninguna sesión es válida: el AuthContext lo escucha. */
export const AUTH_EXPIRED_EVENT = "cheo:auth-expired";

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  headers?: HeadersInit;
  /** Anula el refresh automático (lo usan /login y /refresh). */
  skipRefresh?: boolean;
}

// ------------------------------------------------------------
//  Rotación de sesión (un solo refresh en vuelo para toda la app)
// ------------------------------------------------------------
let refreshInFlight: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  refreshInFlight ??= fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}

// ------------------------------------------------------------
//  Request core
// ------------------------------------------------------------
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, signal, skipRefresh = false } = options;

  const headers = new Headers(options.headers);
  if (body !== undefined) headers.set("Content-Type", "application/json");

  const doFetch = () =>
    fetch(`${BASE_URL}${path}`, {
      method,
      credentials: "include",
      headers,
      signal,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  let res = await doFetch();

  // Rutas que jamás disparan la rotación (login, logout y el refresh mismo).
  const authFlowPath =
    path.startsWith("/auth/login") ||
    path.startsWith("/auth/logout") ||
    path.startsWith("/auth/refresh");

  // Access token vencido → rotamos sesión y reintentamos una sola vez.
  // /auth/me SÍ rota: es la comprobación de sesión al cargar la app.
  if (res.status === 401 && !skipRefresh && !authFlowPath) {
    const refreshed = await refreshSession();
    if (refreshed) {
      res = await doFetch();
    } else {
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
    }
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const payload: unknown = text ? safeParse(text) : null;

  if (!res.ok) {
    const errorPayload = payload as
      | { error?: { code?: string; message?: string; details?: unknown } }
      | null;

    // 401 definitivo (ya intentó rotar) → la sesión murió.
    // En /login no se avisa: el formulario muestra su propio error.
    if (res.status === 401 && !authFlowPath) {
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
    }

    throw new ApiError(
      res.status,
      errorPayload?.error?.code ?? "UNKNOWN",
      errorPayload?.error?.message ?? `Error ${res.status}`,
      errorPayload?.error?.details
    );
  }

  // Éxito: el backend envía { data: ... }
  // Los listados paginados envuelven { data, meta }: se devuelven completos
  // (el consumidor espera Paginated<T>); los simples se desenvuelven.
  const success = payload as Record<string, unknown> | null;
  if (success && typeof success === "object" && "data" in success) {
    if ("meta" in success) return payload as T;
    return success.data as T;
  }
  return payload as T;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ------------------------------------------------------------
//  Helpers tipados
// ------------------------------------------------------------
export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
};

/** Serializa query params ignorando los vacíos (`{ q: "", page: 1 }` → `?page=1`). */
export function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}
