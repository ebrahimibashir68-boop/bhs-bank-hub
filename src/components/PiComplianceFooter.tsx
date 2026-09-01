import { usePiAuth } from "./PiAuthProvider";
import { PI_SANDBOX, PI_SDK_VERSION } from "@/lib/pi-sdk";

/**
 * Pi ecosystem compliance surface — shown under every page so the Pi
 * provenance of every operation is always visible.
 */
export function PiComplianceFooter() {
  const { session, scopes } = usePiAuth();
  return (
    <footer className="mx-5 mt-8 mb-4 rounded-xl border border-border bg-card/60 p-3 text-[10px] leading-relaxed text-muted-foreground">
      <div className="flex flex-wrap gap-1.5">
        <Badge>Pi SDK {PI_SDK_VERSION}</Badge>
        <Badge>{PI_SANDBOX ? "Pi Testnet" : "Pi Mainnet"}</Badge>
        <Badge>π settlement</Badge>
        <Badge>Platform API v2</Badge>
        <Badge>U2A approve/complete</Badge>
        <Badge>Incomplete-payment recovery</Badge>
        <Badge>Ad Network verified</Badge>
        <Badge>PiNet metadata</Badge>
        <Badge>Validation key published</Badge>
      </div>
      <p className="mt-2">
        All operations and services in this app are carried out in accordance with the Pi
        ecosystem: identity via Pi Network sign-in, settlement quoted and executed in Pi,
        and outgoing payments approved and completed server-side through the Pi Platform API.
        Fiat figures are country-module presentations of the same Pi value and are simulated.
      </p>
      <p className="mt-1.5">
        {session ? (
          <>
            Session: <strong>@{session.username}</strong> · scopes {scopes.join(", ") || "username"}
          </>
        ) : (
          "No Pi session — services locked."
        )}
      </p>
    </footer>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-300">
      {children}
    </span>
  );
}
