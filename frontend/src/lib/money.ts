/**
 * Formato de dinero en COP para los inputs.
 *
 * El estado de los formularios siempre guarda el valor CRUDO ("69150") y
 * solo se formatea al mostrarlo ("69.150"), así el resto del código
 * (Number(value), payloads al backend) sigue funcionando sin cambios.
 *
 * Solo enteros: en Colombia el peso no usa centavos y ningún dato de la
 * BD tiene parte decimal (verificado), lo que evita la ambigüedad de
 * "." como miles vs. decimal.
 */

/** Limpia un valor escrito dejando solo dígitos: "69.150" → "69150". */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** Formatea un entero con punto de miles: "69150" → "69.150". */
export function formatCOP(raw: string): string {
  const digits = digitsOnly(raw);

  if (!digits) {
    return "";
  }

  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
