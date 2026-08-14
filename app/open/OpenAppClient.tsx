"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { trackAppDownloadClick } from "../../lib/app-download-click";
import {
  getAppSchemeOpenUrl,
  getAppStoreUrl,
  openAppStore,
} from "../../lib/app-store";

/**
 * Fallback when a Universal Link is opened in a webview (Gmail, etc.)
 * instead of the installed app.
 *
 * Order: custom scheme `intertexe://` (opens installed app) → App Store.
 */
export default function OpenAppPage() {
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const storeUrl = getAppStoreUrl();
  const schemeUrl = getAppSchemeOpenUrl(next);
  const cta = params.get("itx_cta") || "open_landing";

  useEffect(() => {
    let cancelled = false;
    let leftPage = false;

    trackAppDownloadClick({
      ctaLocation: cta,
      destination: "open",
    });

    const markLeft = () => {
      leftPage = true;
    };
    const onVisibility = () => {
      if (document.hidden) markLeft();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", markLeft);
    window.addEventListener("blur", markLeft);

    window.location.href = schemeUrl;

    const t = window.setTimeout(() => {
      if (cancelled || leftPage || document.hidden) return;
      openAppStore(storeUrl);
    }, 1400);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", markLeft);
      window.removeEventListener("blur", markLeft);
    };
  }, [schemeUrl, storeUrl, cta]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
      <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground mb-4">
        Intertexe app
      </p>
      <h1 className="font-serif text-2xl mb-3">Opening INTERTEXE…</h1>
      <p className="text-sm text-muted-foreground max-w-sm mb-8">
        If you have the app, tap Open INTERTEXE. If not, continue to the App Store.
      </p>
      <a
        href={schemeUrl}
        className="bg-black text-white text-[12px] uppercase tracking-[0.18em] px-8 py-4"
        data-testid="link-open-app-scheme"
      >
        Open INTERTEXE
      </a>
      <a
        href={storeUrl}
        className="mt-4 text-[12px] text-muted-foreground hover:text-foreground"
        data-testid="link-open-fallback-store"
        onClick={() => {
          trackAppDownloadClick({
            ctaLocation: "open_store_fallback",
            destination: "app_store",
          });
        }}
      >
        Download on the App Store
      </a>
      <a
        href={next.startsWith("/") ? next : "/"}
        className="mt-4 text-[12px] text-muted-foreground hover:text-foreground"
      >
        Continue on the web
      </a>
    </div>
  );
}
