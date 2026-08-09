import { usePiAuth } from "./PiAuthProvider";

/**
 * Pi ecosystem compliance surface — shown under every page so the Pi
 * provenance of every operation is always visible.
 */
export function PiComplianceFooter() {
  const { session, scopes } = usePiAuth();
  return (
    <footer className="mx-5 mt-8 mb-4 rounded-xl border border-border bg-card/60 p-3 text-[10px] leading-relaxed text-muted-foreground">
      <div className="flex flex-wrap gap-1.5">
        <Badge>Pi SDK 2.0</Badge>
        <Badge>Pi Mainnet</Badge>
        <Badge>π settlement</Badge>
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
