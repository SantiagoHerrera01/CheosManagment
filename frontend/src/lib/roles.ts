import type { Role } from "../types/api";

/** Etiquetas en español de cada rol (usadas en sidebar, header y tablas). */
export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrador",
  VENDEDOR: "Vendedor",
  BODEGA: "Bodega",
  CONTADOR: "Contador",
};

/** Iniciales del nombre para el avatar: "Ana María López" → "AL". */
export function initials(fullName: string): string {
  return (
    fullName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase() || "?"
  );
}
