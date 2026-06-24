import { createServerFn } from "@tanstack/react-start";

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
      throw new Error(`Pi /v2/me failed: ${res.status}`);
    }
    const me = (await res.json()) as { uid: string; username: string };
    // Session is represented client-side via the verified user object. A production
    // app would sign a JWT or set an httpOnly cookie here.
    return {
      verified: true as const,
      uid: me.uid,
      username: me.username,
      verifiedAt: new Date().toISOString(),
    };
  });

function serverKey() {
  const key = process.env.PI_SERVER_API_KEY;
  if (!key) throw new Error("PI_SERVER_API_KEY is not configured on the server");
  return key;
}

export const approvePiPayment = createServerFn({ method: "POST" })
  .inputValidator((data: { paymentId: string }) => {
    if (!data?.paymentId) throw new Error("paymentId required");
    return data;
  })
  .handler(async ({ data }) => {
    const res = await fetch(`https://api.minepi.com/v2/payments/${data.paymentId}/approve`, {
      method: "POST",
      headers: { Authorization: `Key ${serverKey()}` },
    });
    const body = await res.text();
    if (!res.ok) throw new Error(`Pi approve failed ${res.status}: ${body}`);
    return { ok: true, status: res.status };
  });

export const completePiPayment = createServerFn({ method: "POST" })
  .inputValidator((data: { paymentId: string; txid: string }) => {
    if (!data?.paymentId || !data?.txid) throw new Error("paymentId, txid required");
    return data;
  })
  .handler(async ({ data }) => {
    const res = await fetch(`https://api.minepi.com/v2/payments/${data.paymentId}/complete`, {
      method: "POST",
      headers: {
        Authorization: `Key ${serverKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ txid: data.txid }),
    });
    const body = await res.text();
    if (!res.ok) throw new Error(`Pi complete failed ${res.status}: ${body}`);
    return { ok: true, status: res.status };
  });
