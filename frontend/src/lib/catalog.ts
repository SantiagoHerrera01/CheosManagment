import type { Grind } from "../types/api";

/**
 * Catálogo de presentaciones (P1-4 del to-do post-demo).
 *
 * El cliente pide que en todos los productos existan las opciones
 * estándar (250 g / 500 g / 1 kg…) tanto en grano como en molido,
 * en lugar de texto libre que se olvida de una en una.
 */

/** Tamaños estándar que ofrece el menú al crear un producto. */
export const SIZE_OPTIONS = [
  "250 g",
  "500 g",
  "1 kg",
  "2 kg",
  "5 kg",
] as const;

/** ¿Esta etiqueta es uno de los tamaños del catálogo? */
export function isKnownSize(label: string): boolean {
  return (SIZE_OPTIONS as readonly string[]).includes(label);
}

/**
 * Plantilla de presentaciones estándar: todo producto debería poder
 * tener estos tamaños en grano y molido. Se usa en el botón
 * "Agregar presentaciones" de Productos.
 */
export const STANDARD_PRESENTATIONS: { label: string; grind: Grind }[] = [
  { label: "250 g", grind: "GRANO" },
  { label: "250 g", grind: "MOLIDO" },
  { label: "500 g", grind: "GRANO" },
  { label: "500 g", grind: "MOLIDO" },
  { label: "1 kg", grind: "GRANO" },
  { label: "1 kg", grind: "MOLIDO" },
];
