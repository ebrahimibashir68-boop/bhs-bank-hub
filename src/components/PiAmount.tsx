import { formatMoney } from "@/lib/banking";
import { formatPi, toPi } from "@/lib/pi-settlement";

/**
 * Shows the Pi settlement value of a local-currency amount.
 * Pi is the settlement unit across the whole app.
 */
export function PiAmount({
  amount,
  currency,
  className = "",
  showFiat = false,
}: {
  amount: number;
  currency: string;
  className?: string;
  showFiat?: boolean;
}) {
  const pi = toPi(amount, currency);
  return (
    <span className={`text-[11px] text-muted-foreground ${className}`}>
      {formatPi(pi)}
      {showFiat && currency !== "PI" ? ` · ${formatMoney(amount, currency)}` : null}
    </span>
  );
}
