import { useCallback, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { piShowAd, piAdReady, type PiAdType } from "@/lib/pi-sdk";
import { verifyRewardedAd } from "@/lib/pi-auth.functions";

/**
 * Pi Ad Network integration. Rewarded ads are only ever credited after the
 * adId is verified server-side against the Pi Platform API.
 */
export function usePiAds() {
  const verify = useServerFn(verifyRewardedAd);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const show = useCallback(
    async (type: PiAdType): Promise<{ rewarded: boolean }> => {
      setBusy(true);
      setStatus(null);
      try {
        const ready = await piAdReady(type);
        if (!ready) {
          setStatus("No ad is available right now.");
          return { rewarded: false };
        }
        const res = await piShowAd(type);
        if (res.type === "rewarded" && res.result === "AD_REWARDED") {
          if (!res.adId) {
            setStatus("Ad watched, but it could not be verified for a reward.");
            return { rewarded: false };
          }
          const v = await verify({ data: { adId: res.adId } });
          setStatus(v.granted ? "Reward verified by the Pi Ad Network." : "Reward was not granted.");
          return { rewarded: v.granted };
        }
        setStatus(
          res.result === "AD_CLOSED" ? "Ad closed." : `Ad unavailable (${res.result}).`,
        );
        return { rewarded: false };
      } catch (e) {
        setStatus(e instanceof Error ? e.message : "Ad failed to display");
        return { rewarded: false };
      } finally {
        setBusy(false);
      }
    },
    [verify],
  );

  return { show, status, busy };
}
