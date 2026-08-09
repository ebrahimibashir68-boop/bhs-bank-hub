import { useCallback, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { usePiAuth } from "@/components/PiAuthProvider";
import { getPi } from "@/lib/pi-sdk";
import { approvePiPayment, completePiPayment } from "@/lib/pi-auth.functions";

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
 * Runs a real Pi Network payment (createPayment → server approve → server
 * complete). Every outgoing money movement in the app settles through this.
 */
export function usePiPayment() {
  const { session, hasScope, signIn } = usePiAuth();
  const approve = useServerFn(approvePiPayment);
  const complete = useServerFn(completePiPayment);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const pay = useCallback(
    async (req: PiPaymentRequest): Promise<PiPaymentResult | null> => {
      setStatus(null);
      if (req.amount <= 0) {
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
      try {
        const Pi = await getPi();
        return await new Promise<PiPaymentResult | null>((resolve, reject) => {
          let currentId = "";
          Pi.createPayment(
            { amount: req.amount, memo: req.memo, metadata: req.metadata },
            {
              onReadyForServerApproval: async (paymentId) => {
                currentId = paymentId;
                setStatus("Approving payment…");
                try {
                  await approve({ data: { paymentId } });
                } catch (e) {
                  reject(e);
                }
              },
              onReadyForServerCompletion: async (paymentId, txid) => {
                setStatus("Completing payment…");
                try {
                  await complete({ data: { paymentId, txid } });
                  setStatus(`Settled on Pi · txid ${txid.slice(0, 10)}…`);
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
        setStatus(e instanceof Error ? e.message : "Pi payment failed");
        return null;
      } finally {
        setPending(false);
      }
    },
    [approve, complete, hasScope, session, signIn],
  );

  return { pay, status, pending, setStatus };
}
