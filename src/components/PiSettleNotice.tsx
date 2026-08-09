import { Loader2, Sparkles } from "lucide-react";
import { formatPi } from "@/lib/pi-settlement";

/**
 * Shown on every outgoing money flow: the exact Pi amount that will be paid on
 * the Pi Network, plus live status of the approve/complete handshake.
 */
export function PiSettleNotice({
  pi,
  status,
  pending,
}: {
  pi: number;
  status: string | null;
  pending?: boolean;
}) {
  return (
    <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-3 text-[12px]">
      <div className="flex items-center justify-between gap-2 font-medium text-violet-800 dark:text-violet-200">
        <span className="flex items-center gap-1.5">
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Settles on Pi Network
        </span>
        <span>{formatPi(pi)}</span>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Confirming opens a real Pi payment in the Pi Browser; the app approves and
        completes it server-side before the ledger updates.
      </p>
      {status ? <div className="mt-1.5 text-[11px] text-muted-foreground">{status}</div> : null}
    </div>
  );
}
