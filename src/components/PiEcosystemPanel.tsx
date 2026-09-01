import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Share2, ExternalLink, Megaphone, RefreshCw, Loader2, Cpu } from "lucide-react";
import {
  piNativeFeatures,
  piShare,
  piOpenInSystemBrowser,
  PI_SANDBOX,
  PI_SDK_VERSION,
  type PiNativeFeature,
} from "@/lib/pi-sdk";
import { usePiAds } from "@/hooks/usePiAds";
import { listIncompleteServerPayments } from "@/lib/pi-auth.functions";
import { usePiAuth } from "@/components/PiAuthProvider";

/**
 * Surfaces the current Pi Browser capabilities of this app: native features,
 * share dialog, system browser, Ad Network and pending server payments.
 */
export function PiEcosystemPanel() {
  const [features, setFeatures] = useState<PiNativeFeature[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const ads = usePiAds();
  const { session, scopes, incompleteNotice } = usePiAuth();
  const loadPending = useServerFn(listIncompleteServerPayments);
  const [pending, setPending] = useState<{ identifier: string; amount: number; memo: string }[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);

  useEffect(() => {
    void piNativeFeatures().then(setFeatures);
  }, []);

  async function refreshPending() {
    setLoadingPending(true);
    try {
      const r = await loadPending({});
      setPending(r.payments);
      setNote(r.payments.length ? null : "No pending Pi payments.");
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Could not load pending payments.");
    } finally {
      setLoadingPending(false);
    }
  }

  const adsSupported = features?.includes("ad_network") ?? false;

  return (
    <section className="mx-5 mt-5 rounded-xl border border-border bg-card p-4">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold">
        <Cpu className="h-4 w-4" /> Pi ecosystem status
      </h2>
      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
        <Info label="SDK version" value={PI_SDK_VERSION} />
        <Info label="Network" value={PI_SANDBOX ? "Pi Testnet (sandbox)" : "Pi Mainnet"} />
        <Info label="Session" value={session ? `@${session.username}` : "signed out"} />
        <Info label="Scopes" value={scopes.join(", ") || "—"} />
        <Info
          label="Native features"
          value={features === null ? "checking…" : features.length ? features.join(", ") : "none reported"}
        />
        <Info label="Ad Network" value={adsSupported ? "supported" : "unavailable"} />
      </div>

      {incompleteNotice ? (
        <div className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] text-amber-800 dark:text-amber-300">
          {incompleteNotice}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <Btn
          icon={Share2}
          label="Share Pi Bank"
          onClick={async () => {
            const ok = await piShare(
              "Pi Bank",
              "Bank in Pi: transfers, bills, and international payments settled on the Pi Network.",
            );
            setNote(ok ? null : "Share dialog is not available in this Pi Browser version.");
          }}
        />
        <Btn
          icon={ExternalLink}
          label="Pi Docs"
          onClick={async () => {
            const err = await piOpenInSystemBrowser("https://minepi.com/developers");
            setNote(err);
          }}
        />
        <Btn
          icon={Megaphone}
          label={ads.busy ? "Loading ad…" : "Watch rewarded ad"}
          onClick={() => void ads.show("rewarded")}
          disabled={ads.busy || !adsSupported}
        />
        <Btn
          icon={loadingPending ? Loader2 : RefreshCw}
          label="Pending payments"
          onClick={() => void refreshPending()}
          disabled={loadingPending}
        />
      </div>

      {pending.length > 0 ? (
        <ul className="mt-3 space-y-1 text-[11px]">
          {pending.map((p) => (
            <li key={p.identifier} className="rounded-md border border-border px-2 py-1.5">
              π {p.amount} · {p.memo} <span className="text-muted-foreground">({p.identifier.slice(0, 10)}…)</span>
            </li>
          ))}
        </ul>
      ) : null}

      {ads.status ? <div className="mt-2 text-[11px] text-muted-foreground">{ads.status}</div> : null}
      {note ? <div className="mt-1 text-[11px] text-muted-foreground">{note}</div> : null}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background/60 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 break-words font-medium">{value}</div>
    </div>
  );
}

function Btn({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-md border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-[11px] font-medium text-violet-700 disabled:opacity-50 dark:text-violet-300"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
