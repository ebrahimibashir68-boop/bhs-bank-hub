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
import { verifyPiAccessToken } from "@/lib/pi-auth.functions";

export interface PiSession {
  uid: string;
  username: string;
  accessToken: string;
  verifiedAt: string;
}

interface PiAuthCtx {
  session: PiSession | null;
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => void;
}

const Ctx = createContext<PiAuthCtx | null>(null);

export function PiAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<PiSession | null>(null);
  const [status, setStatus] = useState<PiAuthCtx["status"]>("idle");
  const [error, setError] = useState<string | null>(null);
  const verify = useServerFn(verifyPiAccessToken);
  const ran = useRef(false);

  const signIn = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const auth = await piAuthenticate();
      const verified = await verify({ data: { accessToken: auth.accessToken } });
      setSession({
        uid: verified.uid,
        username: verified.username,
        accessToken: auth.accessToken,
        verifiedAt: verified.verifiedAt,
      });
      setStatus("ready");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Pi sign-in failed";
      setError(msg);
      setStatus("error");
    }
  }, [verify]);

  const signOut = useCallback(() => {
    setSession(null);
    setStatus("idle");
    setError(null);
  }, []);

  // Auto-trigger on first mount in the browser
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (typeof window === "undefined") return;
    void signIn();
  }, [signIn]);

  return (
    <Ctx.Provider value={{ session, status, error, signIn, signOut }}>{children}</Ctx.Provider>
  );
}

export function usePiAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePiAuth must be used inside PiAuthProvider");
  return c;
}
