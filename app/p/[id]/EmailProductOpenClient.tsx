"use client";

import { useEffect } from "react";
import { getAppSchemeOpenUrl } from "../../../lib/app-store";

/**
 * Gmail often intercepts /product/* and /open as Universal Links. /open lands on
 * Shop; a missing product handler can do the same. This page is not in AASA, so
 * the email always loads here first, then:
 *   1. custom scheme → app at /product/{id}
 *   2. otherwise the web product page (the exact item)
 */
export default function EmailProductOpenClient({ productId }: { productId: string }) {
  const productPath = `/product/${encodeURIComponent(productId)}`;
  const schemeUrl = getAppSchemeOpenUrl(productPath);

  useEffect(() => {
    let cancelled = false;
    let leftPage = false;
    const markLeft = () => {
      leftPage = true;
    };
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) markLeft();
    });
    window.addEventListener("pagehide", markLeft);
    window.addEventListener("blur", markLeft);

    window.location.href = schemeUrl;
    const timer = window.setTimeout(() => {
      if (cancelled || leftPage || document.hidden) return;
      window.location.replace(productPath);
    }, 900);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [schemeUrl, productPath]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
      <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground mb-4">
        Intertexe
      </p>
      <h1 className="font-serif text-2xl mb-3">Opening the piece…</h1>
      <p className="text-sm text-muted-foreground max-w-sm mb-8">
        If you have the app, it will open this item. If not, continue to the piece on the web.
      </p>
      <a
        href={schemeUrl}
        className="bg-black text-white text-[12px] uppercase tracking-[0.18em] px-8 py-4"
      >
        Open in INTERTEXE
      </a>
      <a href={productPath} className="mt-4 text-[12px] text-muted-foreground hover:text-foreground">
        View this item on the web
      </a>
    </div>
  );
}
