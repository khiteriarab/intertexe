"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { getAppStoreUrl, openAppOrStore, getAppCtaLabel } from "../../lib/app-store";
import { useIsMobileWeb } from "../../lib/use-is-mobile-web";
import { useLikelyAppInstalled } from "../../lib/use-likely-app-installed";

const DISMISS_KEY = "app-download-prompt-dismissed-at";
const PROMPT_DELAY_MS = 3 * 60 * 1000; // ~3 minutes engaged — enough to browse before asking
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // don’t re-ask for a week
const SKIP_PREFIXES = ["/dashboard", "/platform", "/partners", "/press-kit", "/api"];
const APP_ICON_SRC = "/app-icon.png";
const APP_ICON_FALLBACK = "/favicon.png";

function shouldSkipPath(pathname: string) {
  return SKIP_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Soft NAP-style modal after a few minutes on site — mobile web only.
 */
export function AppDownloadPrompt() {
  const pathname = usePathname() || "/";
  const isMobile = useIsMobileWeb();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [iconSrc, setIconSrc] = useState(APP_ICON_SRC);
  const href = getAppStoreUrl();
  const likelyInstalled = useLikelyAppInstalled();
  const ctaLabel = getAppCtaLabel(likelyInstalled);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !isMobile || shouldSkipPath(pathname)) return;

    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (raw) {
        const at = Number(raw);
        if (Number.isFinite(at) && Date.now() - at < DISMISS_COOLDOWN_MS) return;
      }
    } catch {
      // ignore
    }

    const timer = window.setTimeout(() => setOpen(true), PROMPT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [mounted, isMobile, pathname]);

  if (!mounted || !isMobile || !open || shouldSkipPath(pathname)) return null;

  const dismiss = () => {
    setOpen(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore
    }
  };

  const handleDownload = (e: MouseEvent<HTMLAnchorElement>) => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    if (likelyInstalled) {
      e.preventDefault();
      openAppOrStore({ storeUrl: href, preferApp: true });
    }
    // else: let the https App Store link open normally
    setOpen(false);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[180] flex items-end justify-center p-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-download-prompt-title"
      data-testid="app-download-prompt"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={dismiss}
      />
      <div className="relative w-full max-w-md bg-white text-neutral-900 shadow-2xl px-6 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] rounded-t-sm">
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-3 top-3 p-2 text-neutral-400 hover:text-neutral-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Dismiss"
        >
          <X className="w-5 h-5" strokeWidth={1.5} />
        </button>

        <div className="flex flex-col items-center text-center pt-4 pb-2">
          {/* Native img — more reliable than next/image inside a portal */}
          <img
            src={iconSrc}
            alt="Intertexe"
            width={72}
            height={72}
            className="h-[72px] w-[72px] rounded-[16px] object-cover mb-5 bg-neutral-900"
            onError={() => {
              if (iconSrc !== APP_ICON_FALLBACK) setIconSrc(APP_ICON_FALLBACK);
            }}
          />
          <p className="text-[10px] uppercase tracking-[0.28em] text-neutral-400 mb-3">
            Intertexe app
          </p>
          <h2
            id="app-download-prompt-title"
            className="font-serif text-[26px] leading-tight mb-3"
          >
            Shop the app
          </h2>
          <p className="text-[14px] text-neutral-500 font-light leading-relaxed max-w-xs mb-8">
            Scan any label, save favorites, and shop verified natural fibers — built for your phone.
          </p>
          <a
            href={href}
            onClick={handleDownload}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-black text-white text-[12px] uppercase tracking-[0.18em] font-medium py-4 min-h-[52px] flex items-center justify-center hover:bg-neutral-800 active:scale-[0.99] transition-all"
            data-testid="link-app-download-prompt"
          >
            {ctaLabel}
          </a>
          <button
            type="button"
            onClick={dismiss}
            className="mt-4 text-[12px] text-neutral-400 hover:text-neutral-700 py-2"
          >
            Continue on the web
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
