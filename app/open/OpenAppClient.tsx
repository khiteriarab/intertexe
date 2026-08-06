"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { getAppStoreUrl, openAppStore } from "../../lib/app-store";

/**
 * Universal Link landing when the app is not installed.
 * If iOS opens this in Safari instead of the app → send user to the App Store.
 * Query: ?next=/product/… (optional deep path for after install / Smart Banner).
 */
export default function OpenAppPage() {
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const storeUrl = getAppStoreUrl();

  useEffect(() => {
    // Brief pause so an installed app that is slow to claim the UL can still win.
    const t = window.setTimeout(() => {
      openAppStore(storeUrl);
    }, 400);
    return () => window.clearTimeout(t);
  }, [storeUrl]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
      <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground mb-4">
        Intertexe app
      </p>
      <h1 className="font-serif text-2xl mb-3">Opening INTERTEXE…</h1>
      <p className="text-sm text-muted-foreground max-w-sm mb-8">
        If the app doesn&apos;t open, continue to the App Store.
      </p>
      <a
        href={storeUrl}
        className="bg-black text-white text-[12px] uppercase tracking-[0.18em] px-8 py-4"
        data-testid="link-open-fallback-store"
      >
        Download App
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
