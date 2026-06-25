import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, setResponseHeader } from "@tanstack/react-start/server";
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "pi_session";
const SESSION_TTL_SECONDS = 60 * 60; // 1 hour

function sessionSecret() {
  const s = process.env.PI_SESSION_SECRET;
  if (!s) throw new Error("PI_SESSION_SECRET is not configured on the server");
  return s;
}

function serverKey() {
  const key = process.env.PI_SERVER_API_KEY;
  if (!key) throw new Error("PI_SERVER_API_KEY is not configured on the server");
  return key;
}

interface SessionPayload {
  uid: string;
  username: string;
  exp: number;
}

function signSession(payload: { uid: string; username: string }): string {
  const body: SessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const b64 = Buffer.from(JSON.stringify(body)).toString("base64url");
  const sig = createHmac("sha256", sessionSecret()).update(b64).digest("base64url");
  return `${b64}.${sig}`;
}

function verifySessionToken(token: string): SessionPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [b64, sig] = parts;
  const expected = createHmac("sha256", sessionSecret()).update(b64).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(b64, "base64url").toString("utf8")) as SessionPayload;
    if (typeof data.exp !== "number" || data.exp * 1000 < Date.now()) return null;
    if (!data.uid || !data.username) return null;
    return data;
  } catch {
    return null;
  }
}

function readSessionCookie(): SessionPayload | null {
  const cookie = getRequestHeader("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)pi_session=([^;]+)/);
  if (!match) return null;
  return verifySessionToken(decodeURIComponent(match[1]));
}

function requirePiSession(): SessionPayload {
  const s = readSessionCookie();
  if (!s) {
    throw new Error("Unauthorized: Pi session required");
  }
  return s;
}

function setSessionCookie(token: string) {
  const attrs = [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_TTL_SECONDS}`,
    "Secure",
  ];
  setResponseHeader("set-cookie", attrs.join("; "));
}

function clearSessionCookie() {
  setResponseHeader(
    "set-cookie",
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure`,
  );
}

export const verifyPiAccessToken = createServerFn({ method: "POST" })
  .inputValidator((data: { accessToken: string }) => {
    if (!data || typeof data.accessToken !== "string" || data.accessToken.length < 8) {
      throw new Error("Invalid access token");
    }
    return data;
  })
  .handler(async ({ data }) => {
    const res = await fetch("https://api.minepi.com/v2/me", {
      method: "GET",
      headers: { Authorization: `Bearer ${data.accessToken}` },
    });
    if (!res.ok) {
      // Log details server-side only; do not leak to client.
      const body = await res.text().catch(() => "");
      console.error(`Pi /v2/me failed: ${res.status} ${body}`);
      throw new Error("Pi sign-in failed. Please try again.");
    }
    const me = (await res.json()) as { uid: string; username: string };
    const token = signSession({ uid: me.uid, username: me.username });
    setSessionCookie(token);
    return {
      verified: true as const,
      uid: me.uid,
      username: me.username,
      verifiedAt: new Date().toISOString(),
    };
  });

export const getPiSession = createServerFn({ method: "GET" }).handler(async () => {
  const s = readSessionCookie();
  if (!s) return { authenticated: false as const };
  return {
    authenticated: true as const,
    uid: s.uid,
    username: s.username,
  };
});

export const signOutPi = createServerFn({ method: "POST" }).handler(async () => {
  clearSessionCookie();
  return { ok: true };
});

export const approvePiPayment = createServerFn({ method: "POST" })
  .inputValidator((data: { paymentId: string }) => {
    if (!data?.paymentId) throw new Error("paymentId required");
    return data;
  })
  .handler(async ({ data }) => {
    requirePiSession();
    const res = await fetch(`https://api.minepi.com/v2/payments/${data.paymentId}/approve`, {
      method: "POST",
      headers: { Authorization: `Key ${serverKey()}` },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`Pi approve failed ${res.status}: ${body}`);
      throw new Error("Payment approval failed. Please try again.");
    }
    return { ok: true, status: res.status };
  });

export const completePiPayment = createServerFn({ method: "POST" })
  .inputValidator((data: { paymentId: string; txid: string }) => {
    if (!data?.paymentId || !data?.txid) throw new Error("paymentId, txid required");
    return data;
  })
  .handler(async ({ data }) => {
    requirePiSession();
    const res = await fetch(`https://api.minepi.com/v2/payments/${data.paymentId}/complete`, {
      method: "POST",
      headers: {
        Authorization: `Key ${serverKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ txid: data.txid }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`Pi complete failed ${res.status}: ${body}`);
      throw new Error("Payment completion failed. Please try again.");
    }
    return { ok: true, status: res.status };
  });
