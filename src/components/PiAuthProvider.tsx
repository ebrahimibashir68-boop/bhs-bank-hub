import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  piAuthenticate,
  readGrantedScopes,
  writeGrantedScopes,
  clearGrantedScopes,
  setIncompletePaymentHandler,
  type PiScope,
} from "@/lib/pi-sdk";
import {
  verifyPiAccessToken,
  getPiSession,
  signOutPi,
  resolveIncompletePiPayment,
} from "@/lib/pi-auth.functions";

export interface PiSession {
  uid: string;
  username: string;
  verifiedAt: string;
  expiresAt?: string | null;
  /** Mainnet wallet address granted via the "wallet_address" scope, if any. */
  walletAddress?: string | null;
}

interface PiAuthCtx {
  session: PiSession | null;
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  scopes: string[];
  hasScope: (scope: PiScope | string) => boolean;
  signIn: (scopes?: PiScope[]) => Promise<{ scopes: string[] } | null>;
  signOut: () => Promise<void>;
  incompleteNotice: string | null;
}

const Ctx = createContext<PiAuthCtx | null>(null);

export function PiAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<PiSession | null>(null);
  const [status, setStatus] = useState<PiAuthCtx["status"]>("idle");
  const [error, setError] = useState<string | null>(null);
  const [scopes, setScopes] = useState<string[]>([]);
  const [incompleteNotice, setIncompleteNotice] = useState<string | null>(null);
  const verify = useServerFn(verifyPiAccessToken);
  const fetchSession = useServerFn(getPiSession);
  const signOutFn = useServerFn(signOutPi);
  const resolveIncomplete = useServerFn(resolveIncompletePiPayment);
  const ran = useRef(false);

  // Pi requires any incomplete payment to be resolved before a new one starts.
  useEffect(() => {
    setIncompletePaymentHandler((payment) => {
      const txid = payment?.transaction?.txid ?? null;
      setIncompleteNotice(`Resolving a pending Pi payment (${payment.identifier})…`);
      void resolveIncomplete({ data: { paymentId: payment.identifier, txid } })
        .then((r) => setIncompleteNotice(`Pending Pi payment ${r.resolved}.`))
        .catch(() => setIncompleteNotice("A pending Pi payment could not be resolved automatically."));
    });
  }, [resolveIncomplete]);

  const signIn = useCallback(
    async (requested: PiScope[] = ["username", "payments"]) => {
      setStatus("loading");
      setError(null);
      try {
        const auth = await piAuthenticate(requested);
        const verified = await verify({ data: { accessToken: auth.accessToken } });
        setSession({
          uid: verified.uid,
          username: verified.username,
          verifiedAt: verified.verifiedAt,
          expiresAt: verified.validUntil,
          walletAddress: verified.walletAddress ?? null,
        });
        // Trust the Platform API's granted scopes over the requested list.
        const granted = verified.scopes.length ? verified.scopes : auth.scopes;
        setScopes(granted);
        writeGrantedScopes(granted as PiScope[]);
        setStatus("ready");
        return { scopes: granted };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Pi sign-in failed";
        setError(msg);
        setStatus("error");
        return null;
      }
    },
    [verify],
  );

  const signOut = useCallback(async () => {
    try {
      await signOutFn({});
    } catch {
      // ignore
    }
    setSession(null);
    setScopes([]);
    clearGrantedScopes();
    setStatus("idle");
    setError(null);
  }, [signOutFn]);

  const hasScope = useCallback((s: PiScope | string) => scopes.includes(s), [scopes]);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (typeof window === "undefined") return;
    (async () => {
      try {
        const existing = await fetchSession({});
        if (existing.authenticated) {
          setSession({
            uid: existing.uid,
            username: existing.username,
            verifiedAt: new Date().toISOString(),
            expiresAt: existing.expiresAt,
            walletAddress: existing.walletAddress ?? null,
          });
          setScopes(existing.scopes?.length ? existing.scopes : readGrantedScopes());
          setStatus("ready");
          return;
        }
      } catch {
        // fall through to sign-in
      }
      void signIn();
    })();
  }, [fetchSession, signIn]);

  return (
    <Ctx.Provider
      value={{ session, status, error, scopes, hasScope, signIn, signOut, incompleteNotice }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function usePiAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePiAuth must be used inside PiAuthProvider");
  return c;
}
