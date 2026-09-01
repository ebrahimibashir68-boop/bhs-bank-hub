import { useCallback, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { usePiAuth } from "@/components/PiAuthProvider";
import { getPi } from "@/lib/pi-sdk";
import {
  approvePiPayment,
  completePiPayment,
  cancelPiPayment,
  getPiPayment,
} from "@/lib/pi-auth.functions";

export interface PiPaymentRequest {
  amount: number; // in Pi
  memo: string;
  metadata: Record<string, unknown>;
}

export interface PiPaymentResult {
  paymentId: string;
  txid: string;
}

/**
 * Runs a real Pi Network user-to-app payment following the current Pi payment
 * flow: createPayment → server approve → on-chain tx → server complete, with
 * server-side cancellation when the flow errors out.
 */
export function usePiPayment() {
  const { session, hasScope, signIn } = usePiAuth();
  const approve = useServerFn(approvePiPayment);
  const complete = useServerFn(completePiPayment);
  const cancel = useServerFn(cancelPiPayment);
  const inspect = useServerFn(getPiPayment);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const pay = useCallback(
    async (req: PiPaymentRequest): Promise<PiPaymentResult | null> => {
      setStatus(null);
      // Pi payments are settled to 7 decimals; anything smaller cannot clear.
      const amount = Math.round(req.amount * 1e7) / 1e7;
      if (!(amount > 0)) {
        setStatus("Amount must be greater than zero.");
        return null;
      }
      if (!session || !hasScope("payments")) {
        const r = await signIn(["username", "payments"]);
        if (!r || !r.scopes.includes("payments")) {
          setStatus('The "payments" scope is required to settle in Pi.');
          return null;
        }
      }

      setPending(true);
      let currentId = "";
      try {
        const Pi = await getPi();
        return await new Promise<PiPaymentResult | null>((resolve, reject) => {
          Pi.createPayment(
            { amount, memo: req.memo.slice(0, 100), metadata: req.metadata },
            {
              onReadyForServerApproval: async (paymentId) => {
                currentId = paymentId;
                setStatus("Approving payment…");
                try {
                  await approve({ data: { paymentId } });
                  setStatus("Approved · waiting for the Pi blockchain…");
                } catch (e) {
                  reject(e);
                }
              },
              onReadyForServerCompletion: async (paymentId, txid) => {
                setStatus("Completing payment…");
                try {
                  await complete({ data: { paymentId, txid } });
                  const info = await inspect({ data: { paymentId } }).catch(() => null);
                  setStatus(
                    info?.txVerified
                      ? `Settled on Pi Mainnet · txid ${txid.slice(0, 10)}…`
                      : `Settled on Pi · txid ${txid.slice(0, 10)}…`,
                  );
                  resolve({ paymentId, txid });
                } catch (e) {
                  reject(e);
                }
              },
              onCancel: () => {
                setStatus(`Payment cancelled${currentId ? ` (${currentId})` : ""}.`);
                resolve(null);
              },
              onError: (error) => reject(error),
            },
          );
        });
      } catch (e) {
        // Leave no dangling payment behind — the SDK blocks the next one.
        if (currentId) {
          await cancel({ data: { paymentId: currentId } }).catch(() => undefined);
        }
        setStatus(e instanceof Error ? e.message : "Pi payment failed");
        return null;
      } finally {
        setPending(false);
      }
    },
    [approve, cancel, complete, hasScope, inspect, session, signIn],
  );

  return { pay, status, pending, setStatus };
}
