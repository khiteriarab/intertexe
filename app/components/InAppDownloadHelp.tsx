"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import {
  DEFAULT_APP_STORE_URL,
  getAppStoreUrl,
  getDownloadHopUrl,
  openAppStore,
  toSafariHttpsUrl,
} from "../../lib/app-store";

type Props = {
  open: boolean;
  onClose: () => void;
  appStoreUrl?: string;
};

/**
 * Shown when TikTok/Instagram blocks the App Store handoff.
 * Gives a one-tap Safari escape plus clear ··· menu instructions.
 */
export function InAppDownloadHelp({ open, onClose, appStoreUrl }: Props) {
  const [copied, setCopied] = useState(false);
  const storeUrl = getAppStoreUrl(appStoreUrl) || DEFAULT_APP_STORE_URL;
  const safariHop = toSafariHttpsUrl(getDownloadHopUrl());

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const trySafari = () => {
    openAppStore(appStoreUrl);
    // Also fire a native <a> navigation — some WebViews honor that more reliably.
    const a = document.createElement("a");
    a.href = safariHop;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(storeUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[220] flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="in-app-download-title"
      data-testid="in-app-download-help"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-white text-neutral-900 px-6 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] rounded-t-sm shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 p-2 text-neutral-400 min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Dismiss"
        >
          <X className="w-5 h-5" strokeWidth={1.5} />
        </button>

        <p className="text-[10px] uppercase tracking-[0.28em] text-neutral-400 mb-3">
          Open in Safari
        </p>
        <h2 id="in-app-download-title" className="font-serif text-[22px] leading-tight mb-3 pr-8">
          TikTok can&apos;t open the App Store
        </h2>
        <p className="text-[14px] text-neutral-500 font-light leading-relaxed mb-6">
          Tap below to leave TikTok and open the App Store in Safari. Or tap{" "}
          <span className="text-neutral-800">···</span> at the top →{" "}
          <span className="text-neutral-800">Open in Browser</span>, then Download App.
        </p>

        <a
          href={safariHop}
          onClick={(e) => {
            e.preventDefault();
            trySafari();
          }}
          className="w-full bg-black text-white text-[12px] uppercase tracking-[0.18em] font-medium py-4 min-h-[52px] flex items-center justify-center"
          data-testid="button-open-in-safari"
        >
          Open App Store
        </a>

        <button
          type="button"
          onClick={copyLink}
          className="w-full mt-3 text-[12px] text-neutral-500 hover:text-neutral-800 py-3"
        >
          {copied ? "Link copied" : "Copy App Store link"}
        </button>
      </div>
    </div>,
    document.body
  );
}
