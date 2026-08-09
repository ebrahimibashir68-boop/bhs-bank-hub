// Pi ecosystem settlement helpers.
// Every operation in the app is quoted in Pi (π) as the settlement unit; the
// local-currency amount is only the fiat presentation of the same value.

import { convert } from "./banking";

export const PI_SYMBOL = "π";

/** Convert any local-currency amount into its Pi settlement amount. */
export function toPi(amount: number, currency: string): number {
  if (currency === "PI") return amount;
  return convert(amount, currency, "PI");
}

/** Convert a Pi amount back into a local currency. */
export function fromPi(pi: number, currency: string): number {
  if (currency === "PI") return pi;
  return convert(pi, "PI", currency);
}

export function formatPi(value: number, digits = 4): string {
  return `${PI_SYMBOL} ${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
  })}`;
}

/** Rounded to the precision Pi Network payments accept. */
export function piPayable(amount: number, currency: string): number {
  return Math.round(toPi(amount, currency) * 1e4) / 1e4;
}

export type SettlementMethod = "pi" | "ledger";
