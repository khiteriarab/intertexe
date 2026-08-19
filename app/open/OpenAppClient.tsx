"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { trackAppDownloadClick } from "../../lib/app-download-click";
import {
  getAppSchemeOpenUrl,
  getAppStoreUrl,
  openAppStore,
} from "../../lib/app-store";

function resolveOpenDest(next: string): { appNext: string; webNext: string } {
  const raw = (next || "/").trim() || "/";
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  const inspiration = path.match(/^\/inspirations\/([^/?#]+)/);
  if (inspiration) {
    const capturePath = `/capture/${inspiration[1]}`;
    return { appNext: capturePath, webNext: capturePath };
  }
  return { appNext: path, webNext: path };
}

/**
 * Fallback when a Universal Link is opened in a webview (Gmail, etc.)
 * instead of the installed app.
 *
 * Order: custom scheme `intertexe://` (opens installed app) → App Store.
 * Chrome extension "Open in INTERTEXE" should not dump desktop users on the App Store.
 */
export default function OpenAppPage() {
  const params = useSearchParams();
    const next = params.get("next") || "/";
    const dest = resolveOpenDest(next);
    const storeUrl = getAppStoreUrl();
    const schemeUrl = getAppSchemeOpenUrl(dest.appNext);
    const cta = params.get("itx_cta") || "open_landing";
    const isAuthHandoff =
      cta === "email_confirm" ||
      cta === "password_reset" ||
      cta === "password_reset_done" ||
      dest.appNext.startsWith("/reset-password") ||
      dest.appNext.startsWith("/account");
    const isExtensionOpen =
      cta === "chrome_extension_open" || dest.appNext.startsWith("/capture/");

  useEffect(() => {
    let cancelled = false;
    let leftPage = false;

    if (!isAuthHandoff) {
      trackAppDownloadClick({
        ctaLocation: cta,
        destination: "open",
      });
    }

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
      if (isAuthHandoff) return;
      if (isExtensionOpen) {
        window.location.href = dest.webNext;
        return;
      }
      openAppStore(storeUrl);
    }, 1400);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", markLeft);
      window.removeEventListener("blur", markLeft);
    };
  }, [schemeUrl, storeUrl, cta, isAuthHandoff, isExtensionOpen, dest.webNext]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-[0_18px_40px_rgba(22,20,18,0.08)]">
        <p className="font-serif italic text-2xl">INTERTEXE</p>
        <h1 className="font-serif text-3xl mt-3 mb-3">
          {isExtensionOpen ? "Keep this piece" : "Opening INTERTEXE…"}
        </h1>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-8">
          {isExtensionOpen
            ? "Open the app to keep shopping it there, or continue on the web for TX Matches and the shop."
            : "If you have the app, tap Open INTERTEXE. If not, continue to the App Store."}
        </p>
        <a
          href={schemeUrl}
          className="flex h-12 items-center justify-center rounded-full bg-[#1f3d2b] text-sm font-semibold text-white"
          data-testid="link-open-app-scheme"
        >
          Open INTERTEXE
        </a>
        {isExtensionOpen ? (
          <>
            <a
              href={dest.webNext.startsWith("/") ? dest.webNext : "/"}
              className="mt-3 flex h-12 items-center justify-center rounded-full border border-[#e6dfd6] text-sm font-semibold text-[#1f3d2b]"
            >
              Continue on the web
            </a>
            <a
              href={storeUrl}
              className="mt-4 inline-block text-sm text-muted-foreground hover:text-foreground"
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
          </>
        ) : (
          <>
            <a
              href={storeUrl}
              className="mt-4 inline-block text-sm text-muted-foreground hover:text-foreground"
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
              href={dest.webNext.startsWith("/") ? dest.webNext : "/"}
              className="mt-4 block text-sm text-muted-foreground hover:text-foreground"
            >
              Continue on the web
            </a>
          </>
        )}
      </div>
    </div>
  );
}
