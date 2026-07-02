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
} from "@/lib/pi-sdk";
import { verifyPiAccessToken, getPiSession, signOutPi } from "@/lib/pi-auth.functions";

export interface PiSession {
  uid: string;
  username: string;
  verifiedAt: string;
}

interface PiAuthCtx {
  session: PiSession | null;
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  scopes: string[];
  hasScope: (scope: string) => boolean;
  signIn: (scopes?: string[]) => Promise<{ scopes: string[] } | null>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<PiAuthCtx | null>(null);

export function PiAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<PiSession | null>(null);
  const [status, setStatus] = useState<PiAuthCtx["status"]>("idle");
  const [error, setError] = useState<string | null>(null);
  const [scopes, setScopes] = useState<string[]>([]);
  const verify = useServerFn(verifyPiAccessToken);
  const fetchSession = useServerFn(getPiSession);
  const signOutFn = useServerFn(signOutPi);
  const ran = useRef(false);

  const signIn = useCallback(
    async (requested: string[] = ["username", "payments"]) => {
      setStatus("loading");
      setError(null);
      try {
        const auth = await piAuthenticate(requested);
        const verified = await verify({ data: { accessToken: auth.accessToken } });
        setSession({
          uid: verified.uid,
          username: verified.username,
          verifiedAt: verified.verifiedAt,
        });
        setScopes(auth.scopes);
        writeGrantedScopes(auth.scopes);
        setStatus("ready");
        return { scopes: auth.scopes };
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

  const hasScope = useCallback((s: string) => scopes.includes(s), [scopes]);

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
          });
          setScopes(readGrantedScopes());
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
      value={{ session, status, error, scopes, hasScope, signIn, signOut }}
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
