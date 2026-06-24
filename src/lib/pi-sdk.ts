// Lightweight wrapper around the Pi Browser SDK loaded via <script>.
// Treats Pi.init as a Promise and serializes init across callers.

export interface PiAuthResult {
  accessToken: string;
  user: { uid: string; username: string };
}

interface PiSDK {
  init: (opts: { version: string; sandbox?: boolean }) => Promise<void> | void;
  authenticate: (
    scopes: string[],
    onIncompletePaymentFound: (payment: unknown) => void,
  ) => Promise<PiAuthResult>;
  createPayment: (
    payment: {
      amount: number;
      memo: string;
      metadata: Record<string, unknown>;
    },
    callbacks: {
      onReadyForServerApproval: (paymentId: string) => void;
      onReadyForServerCompletion: (paymentId: string, txid: string) => void;
      onCancel: (paymentId: string) => void;
      onError: (error: Error, payment?: unknown) => void;
    },
  ) => void;
}

declare global {
  interface Window {
    Pi?: PiSDK;
  }
}

let initPromise: Promise<PiSDK> | null = null;

function waitForPi(timeoutMs = 8000): Promise<PiSDK> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("Pi SDK requires browser"));
    if (window.Pi) return resolve(window.Pi);
    const start = Date.now();
    const id = setInterval(() => {
      if (window.Pi) {
        clearInterval(id);
        resolve(window.Pi);
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(id);
        reject(new Error("Pi SDK not loaded — open this app in the Pi Browser"));
      }
    }, 100);
  });
}

export function getPi(): Promise<PiSDK> {
  if (!initPromise) {
    initPromise = (async () => {
      const Pi = await waitForPi();
      // Fully await init regardless of whether it returns a Promise or void.
      await Promise.resolve(Pi.init({ version: "2.0", sandbox: false }));
      return Pi;
    })().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

export async function piAuthenticate(
  scopes: string[] = ["username", "payments"],
): Promise<PiAuthResult> {
  const Pi = await getPi();
  return Pi.authenticate(scopes, (payment) => {
    console.warn("[Pi] Incomplete payment found:", payment);
  });
}
