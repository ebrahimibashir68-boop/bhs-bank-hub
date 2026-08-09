import { usePiAuth } from "./PiAuthProvider";
import { Sparkles, Loader2, ShieldCheck } from "lucide-react";

/**
 * Pi sign-in is required for every service in the app. Until a verified Pi
 * session exists, services are locked behind this screen.
 */
export function PiGate() {
  const { status, error, signIn } = usePiAuth();
  const loading = status === "loading";

  return (
    <div className="px-5 pt-16 pb-24">
      <div className="mx-auto max-w-sm rounded-3xl border border-border bg-card p-7 text-center shadow-lift">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white">
          <Sparkles className="h-8 w-8" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Sign in with Pi</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pi Bank runs entirely on the Pi ecosystem. Every account, balance and payment is
          settled in Pi, so a verified Pi Network identity is required before any service
          can be used.
        </p>

        {error ? (
          <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
            {error}
          </div>
        ) : null}

        <button
          onClick={() => void signIn(["username", "payments"])}
          disabled={loading}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-medium text-white disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Continue with Pi Network
        </button>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          Open in the Pi Browser · scopes: username, payments
        </p>
      </div>
    </div>
  );
}
