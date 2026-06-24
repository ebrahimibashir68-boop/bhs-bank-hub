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

export const approvePiPayment = createServerFn({ method: "POST" })
  .inputValidator((data: { paymentId: string; accessToken: string }) => {
    if (!data?.paymentId || !data?.accessToken) throw new Error("paymentId and accessToken required");
    return data;
  })
  .handler(async ({ data }) => {
    const res = await fetch(`https://api.minepi.com/v2/payments/${data.paymentId}/approve`, {
      method: "POST",
      headers: { Authorization: `Bearer ${data.accessToken}` },
    });
    return { ok: res.ok, status: res.status };
  });

export const completePiPayment = createServerFn({ method: "POST" })
  .inputValidator((data: { paymentId: string; txid: string; accessToken: string }) => {
    if (!data?.paymentId || !data?.txid || !data?.accessToken) throw new Error("paymentId, txid, accessToken required");
    return data;
  })
  .handler(async ({ data }) => {
    const res = await fetch(`https://api.minepi.com/v2/payments/${data.paymentId}/complete`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${data.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ txid: data.txid }),
    });
    return { ok: res.ok, status: res.status };
  });
