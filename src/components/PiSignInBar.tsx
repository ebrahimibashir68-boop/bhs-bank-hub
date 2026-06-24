import { usePiAuth } from "./PiAuthProvider";
import { Sparkles, LogOut, Loader2 } from "lucide-react";

export function PiSignInBar() {
  const { session, status, error, signIn, signOut } = usePiAuth();

  if (session) {
    return (
      <div className="mx-5 mb-3 flex items-center justify-between rounded-md border border-violet-300/40 bg-violet-100/40 px-3 py-2 text-[12px] text-violet-900 dark:bg-violet-950/30 dark:text-violet-200">
        <span className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          Signed in as <strong>@{session.username}</strong>
        </span>
        <button onClick={signOut} className="flex items-center gap-1 opacity-80 hover:opacity-100">
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="mx-5 mb-3 flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 text-[12px]">
      <div className="min-w-0">
        <div className="font-medium">Sign in with Pi</div>
        {error ? (
          <div className="truncate text-[11px] text-destructive">{error}</div>
        ) : (
          <div className="text-[11px] text-muted-foreground">Open in Pi Browser to authenticate</div>
        )}
      </div>
      <button
        onClick={() => void signIn()}
        disabled={status === "loading"}
        className="inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-60"
      >
        {status === "loading" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
        Sign in
      </button>
    </div>
  );
}
