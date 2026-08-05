"use client";

import { useEffect, useState, type MouseEvent } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { getAppStoreUrl, openAppOrStore } from "../../lib/app-store";

type Props = {
  /** Same App Store URL as the site “Download the App” buttons. */
  appStoreUrl?: string;
  /** localStorage key so home vs /khiteri dismissals stay independent. */
  dismissKey?: string;
  /** Serif headline (NAP: “SHOP THE APP”). */
  title?: string;
  /** Supporting line under the title. */
  subtitle?: string;
  className?: string;
  testId?: string;
};

/**
 * NAP-style sticky app bar: “SHOP THE APP” + large white OPEN CTA.
 * OPEN tries the native app when a URL scheme is configured, else App Store.
 */
export function AppDownloadBanner({
  appStoreUrl,
  dismissKey = "app-banner-dismissed",
  title = "Shop the app",
  subtitle = "For a personalized shopping experience.",
  className = "",
  testId = "banner-app-download",
}: Props) {
  const [dismissed, setDismissed] = useState(true);
  const href = getAppStoreUrl(appStoreUrl);

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

  const handleOpen = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    openAppOrStore({ storeUrl: href });
  };

  return (
    <div
      className={`w-full shrink-0 bg-[#0a0a0a] text-white flex items-center gap-3 md:gap-4 px-3 md:px-6 py-3 md:py-3.5 ${className}`}
      data-testid={testId}
    >
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 p-1.5 -ml-0.5 text-white/55 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label="Dismiss"
        data-testid="button-dismiss-banner"
        type="button"
      >
        <X className="w-4 h-4" strokeWidth={1.75} />
      </button>

      <Image
        src="/app-icon.png"
        alt=""
        width={44}
        height={44}
        className="h-11 w-11 shrink-0 rounded-[10px] object-cover"
        data-testid="img-app-banner-icon"
      />

      <div className="flex-1 min-w-0 py-0.5">
        <p className="font-serif text-[15px] md:text-[17px] leading-tight tracking-wide text-white">
          {title}
        </p>
        <p className="mt-0.5 text-[11px] md:text-[12px] leading-snug text-white/65 font-light truncate">
          {subtitle}
        </p>
      </div>

      <a
        href={href}
        onClick={handleOpen}
        className="flex-shrink-0 bg-white text-black px-5 md:px-7 py-2.5 md:py-3 text-[12px] md:text-[13px] font-semibold uppercase tracking-[0.12em] hover:bg-neutral-100 active:scale-[0.98] transition-all min-h-[44px] flex items-center justify-center"
        rel="noopener noreferrer"
        data-testid="link-app-open"
      >
        Open
      </a>
    </div>
  );
}
