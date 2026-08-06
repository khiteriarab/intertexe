"use client";

import { useEffect } from "react";
import { DEFAULT_APP_STORE_URL, getAppStoreUrl } from "../../lib/app-store";

/** Hard-navigate to the App Store once Safari has opened this hop page. */
export function DownloadClientRedirect() {
  const href = getAppStoreUrl() || DEFAULT_APP_STORE_URL;

  useEffect(() => {
    window.location.replace(href);
  }, [href]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center px-6 text-center">
      <p className="text-[10px] uppercase tracking-[0.28em] text-neutral-400 mb-4">
        Intertexe
      </p>
      <p className="font-serif text-xl mb-6">Opening the App Store…</p>
      <a
        href={href}
        className="bg-black text-white text-[12px] uppercase tracking-[0.18em] px-8 py-4"
      >
        Continue to App Store
      </a>
    </div>
  );
}
