import type { ComponentPropsWithRef } from "react";

import { digitsOnly, formatCOP } from "../../lib/money";

type MoneyInputProps = Omit<
  ComponentPropsWithRef<"input">,
  "value" | "onChange" | "type"
> & {
  /** Valor crudo SIN formato ("69150"): el padre hace Number(value) como antes. */
  value: string;
  /** Siempre entrega dígitos crudos ("69150"), nunca el texto con puntos. */
  onChange: (raw: string) => void;
};

/**
 * Input de dinero en COP: muestra el separador de miles mientras se escribe
 * ("69.150") y conserva el valor crudo en el estado del padre ("69150").
 *
 * Uso (reemplaza a <input type="number"> en campos de dinero):
 *
 *   <MoneyInput value={amount} onChange={setAmount} placeholder="50.000" />
 *
 * Solo acepta enteros (el peso no usa centavos), con teclado numérico en
 * móvil vía inputMode="numeric".
 */
export default function MoneyInput({
  value,
  onChange,
  ...rest
}: MoneyInputProps) {
  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      {...rest}
      value={formatCOP(value)}
      onChange={(event) => onChange(digitsOnly(event.target.value))}
    />
  );
}
