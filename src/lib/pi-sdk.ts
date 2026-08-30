// Typed wrapper around the Pi Browser SDK (version 2.0), aligned with the
// current Pi Platform client SDK reference: authentication, payments,
// native features, share dialog, Ads module and system-browser links.

export type PiScope = "username" | "payments" | "wallet_address";
export type PiNativeFeature = "inline_media" | "request_permission" | "ad_network";
export type PiAdType = "interstitial" | "rewarded";
export type PiNetwork = "Pi Network" | "Pi Testnet";

export interface PiAuthResult {
  accessToken: string;
  user: { uid: string; username: string };
}

export interface PiPaymentDTO {
  identifier: string;
  user_uid: string;
  amount: number;
  memo: string;
  metadata: Record<string, unknown>;
  from_address: string;
  to_address: string;
  direction: "user_to_app" | "app_to_user";
  created_at: string;
  network: PiNetwork;
  status: {
    developer_approved: boolean;
    transaction_verified: boolean;
    developer_completed: boolean;
    cancelled: boolean;
    user_cancelled: boolean;
  };
  transaction: null | { txid: string; verified: boolean; _link: string };
}

export type PiShowAdResponse =
  | { type: "interstitial"; result: "AD_CLOSED" | "AD_DISPLAY_ERROR" | "AD_NETWORK_ERROR" | "AD_NOT_AVAILABLE" }
  | {
      type: "rewarded";
      result:
        | "AD_REWARDED"
        | "AD_CLOSED"
        | "AD_DISPLAY_ERROR"
        | "AD_NETWORK_ERROR"
        | "AD_NOT_AVAILABLE"
        | "ADS_NOT_SUPPORTED"
        | "USER_UNAUTHENTICATED";
      adId?: string;
    };

export interface PiIsAdReadyResponse {
  type: PiAdType;
  ready: boolean;
}

export interface PiRequestAdResponse {
  type: PiAdType;
  result: "AD_LOADED" | "AD_FAILED_TO_LOAD" | "AD_NOT_AVAILABLE";
}

interface PiSDK {
  init: (opts: { version: string; sandbox?: boolean }) => Promise<void> | void;
  authenticate: (
    scopes: PiScope[],
    onIncompletePaymentFound: (payment: PiPaymentDTO) => void,
  ) => Promise<PiAuthResult>;
  createPayment: (
    payment: { amount: number; memo: string; metadata: Record<string, unknown> },
    callbacks: {
      onReadyForServerApproval: (paymentId: string) => void;
      onReadyForServerCompletion: (paymentId: string, txid: string) => void;
      onCancel: (paymentId: string) => void;
      onError: (error: Error, payment?: PiPaymentDTO) => void;
    },
  ) => void;
  nativeFeaturesList?: () => Promise<PiNativeFeature[]>;
  openShareDialog?: (title: string, message: string) => void;
  openUrlInSystemBrowser?: (url: string) => Promise<void>;
  Ads?: {
    showAd: (adType: PiAdType) => Promise<PiShowAdResponse>;
    isAdReady: (adType: PiAdType) => Promise<PiIsAdReadyResponse>;
    requestAd: (adType: PiAdType) => Promise<PiRequestAdResponse>;
  };
}

declare global {
  interface Window {
    Pi?: PiSDK;
  }
}

/** Mainnet unless the app is explicitly running against the Pi Testnet. */
export const PI_SANDBOX = import.meta.env.VITE_PI_SANDBOX === "true";
export const PI_SDK_VERSION = "2.0";

let initPromise: Promise<PiSDK> | null = null;

/** Incomplete payment reported by the SDK during authenticate(); resolved server-side. */
let onIncompletePayment: ((payment: PiPaymentDTO) => void) | null = null;

export function setIncompletePaymentHandler(fn: (payment: PiPaymentDTO) => void) {
  onIncompletePayment = fn;
}

function waitForPi(timeoutMs = 10000): Promise<PiSDK> {
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
      // init may return a Promise (SDK 2.0) or void — await either way.
      await Promise.resolve(Pi.init({ version: PI_SDK_VERSION, sandbox: PI_SANDBOX }));
      return Pi;
    })().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

export async function piAuthenticate(
  scopes: PiScope[] = ["username", "payments"],
): Promise<PiAuthResult & { scopes: PiScope[] }> {
  const Pi = await getPi();
  const result = await Pi.authenticate(scopes, (payment) => {
    // Per the payments spec, an incomplete payment MUST be resolved before a
    // new one can be created.
    onIncompletePayment?.(payment);
  });
  return { ...result, scopes };
}

// ───────── Native features ─────────

export async function piNativeFeatures(): Promise<PiNativeFeature[]> {
  try {
    const Pi = await getPi();
    if (!Pi.nativeFeaturesList) return [];
    return await Pi.nativeFeaturesList();
  } catch {
    return [];
  }
}

export async function piShare(title: string, message: string): Promise<boolean> {
  try {
    const Pi = await getPi();
    if (!Pi.openShareDialog) return false;
    Pi.openShareDialog(title, message);
    return true;
  } catch {
    return false;
  }
}

export async function piOpenInSystemBrowser(url: string): Promise<string | null> {
  try {
    const Pi = await getPi();
    if (!Pi.openUrlInSystemBrowser) {
      window.open(url, "_blank", "noopener,noreferrer");
      return null;
    }
    await Pi.openUrlInSystemBrowser(url);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "Unexpected error";
  }
}

// ───────── Ads ─────────

export async function piAdReady(type: PiAdType): Promise<boolean> {
  try {
    const Pi = await getPi();
    if (!Pi.Ads) return false;
    const r = await Pi.Ads.isAdReady(type);
    if (r.ready) return true;
    const req = await Pi.Ads.requestAd(type);
    return req.result === "AD_LOADED";
  } catch {
    return false;
  }
}

export async function piShowAd(type: PiAdType): Promise<PiShowAdResponse> {
  const Pi = await getPi();
  if (!Pi.Ads) return { type, result: "ADS_NOT_SUPPORTED" } as PiShowAdResponse;
  await piAdReady(type);
  return Pi.Ads.showAd(type);
}

// ───────── Granted scope cache (non-sensitive) ─────────

const SCOPES_KEY = "pi_granted_scopes";

export function readGrantedScopes(): PiScope[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SCOPES_KEY);
    return raw ? (JSON.parse(raw) as PiScope[]) : [];
  } catch {
    return [];
  }
}

export function writeGrantedScopes(scopes: PiScope[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SCOPES_KEY, JSON.stringify(scopes));
  } catch {
    // ignore
  }
}

export function clearGrantedScopes() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SCOPES_KEY);
  } catch {
    // ignore
  }
}
