"use client";

import { useEffect } from "react";
import { getAppSchemeProductUrl } from "../../../lib/app-store";

/**
 * Gmail claims /product/* and /open as Universal Links. /open is Shop and
 * ignores `next`. This page is not in AASA, so the email loads here first, then
 * opens the complementary INTERTEXE app product: intertexe://product/{id}.
 * If the app is not installed, continue on the INTERTEXE web product page.
 */
export default function EmailProductOpenClient({ productId }: { productId: string }) {
  const productPath = `/product/${encodeURIComponent(productId)}`;
  const schemeUrl = getAppSchemeProductUrl(productId);

  useEffect(() => {
    let cancelled = false;
    window.location.href = schemeUrl;
    const timer = window.setTimeout(() => {
      if (cancelled || document.hidden) return;
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
      <h1 className="font-serif text-2xl mb-3">Opening this piece in INTERTEXE…</h1>
      <p className="text-sm text-muted-foreground max-w-sm mb-8">
        The app will open this exact item. If it does not, continue on INTERTEXE — not the seller’s
        site.
      </p>
      <a
        href={schemeUrl}
        className="bg-black text-white text-[12px] uppercase tracking-[0.18em] px-8 py-4"
      >
        Open in INTERTEXE
      </a>
      <a href={productPath} className="mt-4 text-[12px] text-muted-foreground hover:text-foreground">
        View this item on INTERTEXE
      </a>
    </div>
  );
}
