"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";

type Props = {
  /** Same App Store URL as the site “Download the App” buttons. */
  appStoreUrl?: string;
  /** localStorage key so home vs /khiteri dismissals stay independent. */
  dismissKey?: string;
  /** Short line next to the icon. */
  message?: string;
  className?: string;
  testId?: string;
};

function resolveAppStoreUrl(explicit?: string): string {
  const fromProp = (explicit || "").trim();
  if (fromProp) return fromProp;
  const fromEnv = (process.env.NEXT_PUBLIC_APP_STORE_URL || "").trim();
  if (fromEnv) return fromEnv;
  return "https://apps.apple.com";
}

/**
 * Sticky black app download bar — same CTA/link as “Download the App” on the site.
 */
export function AppDownloadBanner({
  appStoreUrl,
  dismissKey = "app-banner-dismissed",
  message = "Download the Intertexe app",
  className = "",
  testId = "banner-app-download",
}: Props) {
  const [dismissed, setDismissed] = useState(true);
  const href = resolveAppStoreUrl(appStoreUrl);

  useEffect(() => {
    try {
      const hidden = localStorage.getItem(dismissKey);
      if (!hidden) setDismissed(false);
    } catch {
      setDismissed(false);
    }
  }, [dismissKey]);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(dismissKey, "1");
    } catch {
      // ignore
    }
  };

  return (
    <div
      className={`w-full shrink-0 bg-[#111] text-white flex flex-wrap items-center gap-3 px-4 md:px-6 py-2.5 ${className}`}
      data-testid={testId}
    >
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 p-0.5 text-white/50 hover:text-white transition-colors"
        aria-label="Dismiss"
        data-testid="button-dismiss-banner"
        type="button"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <Image
        src="/app-icon.png"
        alt="Intertexe app"
        width={40}
        height={40}
        className="h-10 w-10 shrink-0 rounded-[9px] object-cover"
        data-testid="img-app-banner-icon"
      />
      <p className="flex-1 min-w-0 text-[11px] md:text-[12px] leading-snug font-medium">
        {message}
      </p>
      <a
        href={href}
        className="flex-shrink-0 border border-white text-white px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.05em] hover:bg-white hover:text-black transition-colors"
        rel="noopener noreferrer"
        data-testid="link-app-download"
      >
        Download
      </a>
    </div>
  );
}
