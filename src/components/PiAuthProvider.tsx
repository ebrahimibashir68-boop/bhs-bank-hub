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
import { piAuthenticate } from "@/lib/pi-sdk";
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
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<PiAuthCtx | null>(null);

export function PiAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<PiSession | null>(null);
  const [status, setStatus] = useState<PiAuthCtx["status"]>("idle");
  const [error, setError] = useState<string | null>(null);
  const verify = useServerFn(verifyPiAccessToken);
  const fetchSession = useServerFn(getPiSession);
  const signOutFn = useServerFn(signOutPi);
  const ran = useRef(false);

  const signIn = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const auth = await piAuthenticate();
      // Access token is sent once to the server; cookie session is set there.
      // Never stored in client state to avoid XSS exfiltration.
      const verified = await verify({ data: { accessToken: auth.accessToken } });
      setSession({
        uid: verified.uid,
        username: verified.username,
        verifiedAt: verified.verifiedAt,
      });
      setStatus("ready");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Pi sign-in failed";
      setError(msg);
      setStatus("error");
    }
  }, [verify]);

  const signOut = useCallback(async () => {
    try {
      await signOutFn({});
    } catch {
      // ignore
    }
    setSession(null);
    setStatus("idle");
    setError(null);
  }, [signOutFn]);

  // Try to rehydrate session from server cookie first; otherwise auto-trigger sign-in.
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
    <Ctx.Provider value={{ session, status, error, signIn, signOut }}>{children}</Ctx.Provider>
  );
}

export function usePiAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePiAuth must be used inside PiAuthProvider");
  return c;
}
