"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { getAppCtaLabel, getAppStoreUrl } from "../../lib/app-store";
import { useIsMobileWeb } from "../../lib/use-is-mobile-web";

type Props = {
  appStoreUrl?: string;
  path?: string;
  dismissKey?: string;
  title?: string;
  subtitle?: string;
  className?: string;
  testId?: string;
  /** First-party CTA name for app_download_click (via /open?itx_cta=). */
  cta?: string;
  mobileOnly?: boolean;
};

const APP_ICON_SRC = "/app-icon.png";
const APP_ICON_FALLBACK = "/favicon.png";

/** Sticky app bar — App Store listing. */
export function AppDownloadBanner({
  appStoreUrl,
  path: _path = "/scanner",
  dismissKey = "app-banner-dismissed",
  title = "Scan Any Garment",
  subtitle = "Find better fabrics",
  className = "",
  testId = "banner-app-download",
  cta: _cta = "home_banner",
  mobileOnly = true,
}: Props) {
  const [dismissed, setDismissed] = useState(true);
  const [iconSrc, setIconSrc] = useState(APP_ICON_SRC);
  const isMobile = useIsMobileWeb();
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
  if (mobileOnly && !isMobile) return null;

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
      className={`relative z-[200] w-full shrink-0 bg-[#0a0a0a] text-white flex items-center gap-2 px-2.5 py-2.5 ${className}`}
      data-testid={testId}
    >
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 p-1 text-white/55 hover:text-white transition-colors min-h-[40px] min-w-[32px] flex items-center justify-center"
        aria-label="Dismiss"
        data-testid="button-dismiss-banner"
        type="button"
      >
        <X className="w-3.5 h-3.5" strokeWidth={1.75} />
      </button>

      <img
        src={iconSrc}
        alt=""
        width={40}
        height={40}
        className="h-10 w-10 shrink-0 rounded-[9px] object-cover bg-neutral-800"
        data-testid="img-app-banner-icon"
        onError={() => {
          if (iconSrc !== APP_ICON_FALLBACK) setIconSrc(APP_ICON_FALLBACK);
        }}
      />

      <div className="flex-1 min-w-0 py-0.5 overflow-visible">
        <p className="font-serif text-[13px] leading-tight text-white whitespace-nowrap">
          {title}
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-white/65 font-light whitespace-nowrap">
          {subtitle}
        </p>
      </div>

      <a
        href={href}
        className="flex-shrink-0 bg-white text-black px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] hover:bg-neutral-100 active:scale-[0.98] transition-all min-h-[40px] flex items-center justify-center"
        data-testid="link-app-open"
      >
        {getAppCtaLabel()}
      </a>
    </div>
  );
}
