"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { X } from "lucide-react";
import {
  getAppCtaLabel,
  getAppStoreUrl,
  isAppDeepLinkReady,
  openAppOrStore,
} from "../../lib/app-store";
import { useLikelyAppInstalled } from "../../lib/use-likely-app-installed";
import { useIsMobileWeb } from "../../lib/use-is-mobile-web";

type Props = {
  /** Same App Store URL as the site “Download the App” buttons. */
  appStoreUrl?: string;
  /** Deep-link path (e.g. `/khiteri`). Defaults to current page. */
  path?: string;
  /** localStorage key so home vs /khiteri dismissals stay independent. */
  dismissKey?: string;
  /** Serif headline. */
  title?: string;
  /** Supporting line under the title. */
  subtitle?: string;
  className?: string;
  testId?: string;
  /** When true (default), hide on desktop viewports. */
  mobileOnly?: boolean;
};

const APP_ICON_SRC = "/app-icon.png";
const APP_ICON_FALLBACK = "/favicon.png";

/**
 * NAP-style sticky app bar — Download/Open App → App Store (or app when deep links are live).
 */
export function AppDownloadBanner({
  appStoreUrl,
  path,
  dismissKey = "app-banner-dismissed",
  title = "Scan Any Garment, Find Better Fabrics",
  subtitle = "Available in the app.",
  className = "",
  testId = "banner-app-download",
  mobileOnly = true,
}: Props) {
  const [dismissed, setDismissed] = useState(true);
  const [iconSrc, setIconSrc] = useState(APP_ICON_SRC);
  const isMobile = useIsMobileWeb();
  const likelyInstalled = useLikelyAppInstalled();
  const href = getAppStoreUrl(appStoreUrl);
  const ctaLabel = getAppCtaLabel(likelyInstalled);

  useEffect(() => {
    try {
      const hidden = localStorage.getItem(dismissKey);
      if (!hidden) setDismissed(false);
    } catch {
      setDismissed(false);
    }
  }, [dismissKey]);

  if (dismissed) return null;
  if (mobileOnly && !isMobile) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(dismissKey, "1");
    } catch {
      // ignore
    }
  };

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Native same-tab App Store navigation is the reliable path on iOS Safari.
    if (!isAppDeepLinkReady()) return;
    e.preventDefault();
    openAppOrStore({ storeUrl: href, path });
  };

  return (
    <div
      className={`w-full shrink-0 bg-[#0a0a0a] text-white flex items-center gap-3 px-3 py-3 ${className}`}
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

      <img
        src={iconSrc}
        alt=""
        width={44}
        height={44}
        className="h-11 w-11 shrink-0 rounded-[10px] object-cover bg-neutral-800"
        data-testid="img-app-banner-icon"
        onError={() => {
          if (iconSrc !== APP_ICON_FALLBACK) setIconSrc(APP_ICON_FALLBACK);
        }}
      />

      <div className="flex-1 min-w-0 py-0.5">
        <p className="font-serif text-[13px] leading-snug tracking-wide text-white line-clamp-2">
          {title}
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-white/65 font-light truncate">
          {subtitle}
        </p>
      </div>

      <a
        href={href}
        onClick={handleClick}
        className="flex-shrink-0 bg-white text-black px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.12em] hover:bg-neutral-100 active:scale-[0.98] transition-all min-h-[44px] flex items-center justify-center"
        data-testid="link-app-open"
      >
        {ctaLabel}
      </a>
    </div>
  );
}
