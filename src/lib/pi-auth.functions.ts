import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, setResponseHeader } from "@tanstack/react-start/server";
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "pi_session";
const SESSION_TTL_SECONDS = 60 * 60; // 1 hour
const PI_API = "https://api.minepi.com/v2";

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

function keyHeaders(json = false): Record<string, string> {
  return json
    ? { Authorization: `Key ${serverKey()}`, "Content-Type": "application/json" }
    : { Authorization: `Key ${serverKey()}` };
}

interface SessionPayload {
  uid: string;
  username: string;
  scopes: string[];
  walletAddress?: string | null;
  exp: number;
}

function signSession(payload: {
  uid: string;
  username: string;
  scopes: string[];
  walletAddress?: string | null;
}): string {
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
    return { ...data, scopes: Array.isArray(data.scopes) ? data.scopes : [] };
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
  if (!s) throw new Error("Unauthorized: Pi session required");
  return s;
}

function requirePaymentsScope(): SessionPayload {
  const s = requirePiSession();
  if (!s.scopes.includes("payments")) {
    throw new Error('Unauthorized: the "payments" scope is required');
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

async function piFail(label: string, res: Response, userMessage: string): Promise<never> {
  const body = await res.text().catch(() => "");
  console.error(`Pi ${label} failed ${res.status}: ${body}`);
  throw new Error(userMessage);
}

// ───────── Authentication (/v2/me) ─────────

interface UserDTO {
  uid: string;
  username?: string;
  wallet_address?: string | null;
  credentials?: { scopes?: string[]; valid_until?: { timestamp: number; iso8601: string } };
}

export const verifyPiAccessToken = createServerFn({ method: "POST" })
  .inputValidator((data: { accessToken: string }) => {
    if (!data || typeof data.accessToken !== "string" || data.accessToken.length < 8) {
      throw new Error("Invalid access token");
    }
    return data;
  })
  .handler(async ({ data }) => {
    const res = await fetch(`${PI_API}/me`, {
      method: "GET",
      headers: { Authorization: `Bearer ${data.accessToken}` },
    });
    if (!res.ok) await piFail("/me", res, "Pi sign-in failed. Please try again.");
    const me = (await res.json()) as UserDTO;
    // Scopes are authoritative from the Pi Platform API, not from the client.
    const scopes = me.credentials?.scopes ?? [];
    const username = me.username ?? me.uid;
    const walletAddress =
      typeof me.wallet_address === "string" && me.wallet_address.length > 0
        ? me.wallet_address
        : null;
    const token = signSession({ uid: me.uid, username, scopes, walletAddress });
    setSessionCookie(token);
    return {
      verified: true as const,
      uid: me.uid,
      username,
      scopes,
      walletAddress,
      validUntil: me.credentials?.valid_until?.iso8601 ?? null,
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
    scopes: s.scopes,
    expiresAt: new Date(s.exp * 1000).toISOString(),
  };
});

export const signOutPi = createServerFn({ method: "POST" }).handler(async () => {
  clearSessionCookie();
  return { ok: true };
});

// ───────── Payments (U2A) ─────────

const PAYMENT_ID_RE = /^[a-zA-Z0-9_-]{8,64}$/;
const TXID_RE = /^[a-zA-Z0-9_-]{8,128}$/;
const AD_ID_RE = /^[a-zA-Z0-9_.:-]{6,256}$/;

function validPaymentId(id: unknown): string {
  if (typeof id !== "string" || !PAYMENT_ID_RE.test(id)) throw new Error("Invalid paymentId format");
  return id;
}

export const approvePiPayment = createServerFn({ method: "POST" })
  .inputValidator((data: { paymentId: string }) => ({ paymentId: validPaymentId(data?.paymentId) }))
  .handler(async ({ data }) => {
    requirePaymentsScope();
    const res = await fetch(`${PI_API}/payments/${encodeURIComponent(data.paymentId)}/approve`, {
      method: "POST",
      headers: keyHeaders(),
    });
    if (!res.ok) await piFail("approve", res, "Payment approval failed. Please try again.");
    return { ok: true as const, status: res.status };
  });

export const completePiPayment = createServerFn({ method: "POST" })
  .inputValidator((data: { paymentId: string; txid: string }) => {
    const paymentId = validPaymentId(data?.paymentId);
    if (!data?.txid || !TXID_RE.test(data.txid)) throw new Error("Invalid txid format");
    return { paymentId, txid: data.txid };
  })
  .handler(async ({ data }) => {
    requirePaymentsScope();
    const res = await fetch(`${PI_API}/payments/${encodeURIComponent(data.paymentId)}/complete`, {
      method: "POST",
      headers: keyHeaders(true),
      body: JSON.stringify({ txid: data.txid }),
    });
    if (!res.ok) await piFail("complete", res, "Payment completion failed. Please try again.");
    return { ok: true as const, status: res.status };
  });

export const cancelPiPayment = createServerFn({ method: "POST" })
  .inputValidator((data: { paymentId: string }) => ({ paymentId: validPaymentId(data?.paymentId) }))
  .handler(async ({ data }) => {
    requirePiSession();
    const res = await fetch(`${PI_API}/payments/${encodeURIComponent(data.paymentId)}/cancel`, {
      method: "POST",
      headers: keyHeaders(),
    });
    if (!res.ok) await piFail("cancel", res, "Payment cancellation failed. Please try again.");
    return { ok: true as const, status: res.status };
  });

export const getPiPayment = createServerFn({ method: "POST" })
  .inputValidator((data: { paymentId: string }) => ({ paymentId: validPaymentId(data?.paymentId) }))
  .handler(async ({ data }) => {
    const session = requirePiSession();
    const res = await fetch(`${PI_API}/payments/${encodeURIComponent(data.paymentId)}`, {
      method: "GET",
      headers: keyHeaders(),
    });
    if (!res.ok) await piFail("get payment", res, "Could not read payment status.");
    const p = (await res.json()) as {
      identifier: string;
      user_uid: string;
      amount: number;
      memo: string;
      created_at: string;
      network: string;
      status: Record<string, boolean>;
      transaction: null | { txid: string; verified: boolean };
    };
    // Never expose another user's payment.
    if (p.user_uid !== session.uid) throw new Error("Payment not found");
    return {
      identifier: p.identifier,
      amount: p.amount,
      memo: p.memo,
      createdAt: p.created_at,
      network: p.network,
      status: p.status,
      txid: p.transaction?.txid ?? null,
      txVerified: p.transaction?.verified ?? false,
    };
  });

/**
 * Resolves an incomplete payment reported by `Pi.authenticate`: completes it
 * when the blockchain transaction exists, cancels it otherwise. The Pi SDK
 * refuses to create a new payment while one is unresolved.
 */
export const resolveIncompletePiPayment = createServerFn({ method: "POST" })
  .inputValidator((data: { paymentId: string; txid?: string | null }) => {
    const paymentId = validPaymentId(data?.paymentId);
    const txid = data?.txid ?? null;
    if (txid !== null && !TXID_RE.test(txid)) throw new Error("Invalid txid format");
    return { paymentId, txid };
  })
  .handler(async ({ data }) => {
    requirePiSession();
    const id = encodeURIComponent(data.paymentId);
    if (data.txid) {
      const res = await fetch(`${PI_API}/payments/${id}/complete`, {
        method: "POST",
        headers: keyHeaders(true),
        body: JSON.stringify({ txid: data.txid }),
      });
      if (!res.ok) await piFail("resolve/complete", res, "Could not complete the pending Pi payment.");
      return { resolved: "completed" as const };
    }
    const res = await fetch(`${PI_API}/payments/${id}/cancel`, {
      method: "POST",
      headers: keyHeaders(),
    });
    if (!res.ok) await piFail("resolve/cancel", res, "Could not cancel the pending Pi payment.");
    return { resolved: "cancelled" as const };
  });

/** Server-side sweep of payments left approved-but-not-completed by this app. */
export const listIncompleteServerPayments = createServerFn({ method: "POST" }).handler(async () => {
  const session = requirePiSession();
  const res = await fetch(`${PI_API}/payments/incomplete_server_payments`, {
    method: "GET",
    headers: keyHeaders(),
  });
  if (!res.ok) await piFail("incomplete_server_payments", res, "Could not load pending Pi payments.");
  const json = (await res.json()) as {
    incomplete_server_payments: Array<{
      identifier: string;
      user_uid: string;
      amount: number;
      memo: string;
      created_at: string;
      transaction: null | { txid: string; verified: boolean };
    }>;
  };
  return {
    payments: (json.incomplete_server_payments ?? [])
      .filter((p) => p.user_uid === session.uid)
      .map((p) => ({
        identifier: p.identifier,
        amount: p.amount,
        memo: p.memo,
        createdAt: p.created_at,
        txid: p.transaction?.txid ?? null,
      })),
  };
});

// ───────── Ads network ─────────

/** Verifies a rewarded ad before any reward is granted (Pi Ad Network). */
export const verifyRewardedAd = createServerFn({ method: "POST" })
  .inputValidator((data: { adId: string }) => {
    if (!data?.adId || !AD_ID_RE.test(data.adId)) throw new Error("Invalid adId format");
    return data;
  })
  .handler(async ({ data }) => {
    requirePiSession();
    const res = await fetch(`${PI_API}/ads_network/status/${encodeURIComponent(data.adId)}`, {
      method: "GET",
      headers: keyHeaders(),
    });
    if (!res.ok) await piFail("ad status", res, "Could not verify the rewarded ad.");
    const dto = (await res.json()) as {
      identifier: string;
      mediator_ack_status: "granted" | "revoked" | "failed" | null;
    };
    return { adId: dto.identifier, granted: dto.mediator_ack_status === "granted" };
  });
