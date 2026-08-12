"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { META_PIXEL_CONSENT_EVENT, META_PIXEL_CONSENT_KEY } from "../../lib/meta-pixel";

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(META_PIXEL_CONSENT_KEY);
    if (!consent) setShow(true);
  }, []);

  const accept = () => {
    localStorage.setItem(META_PIXEL_CONSENT_KEY, "accepted");
    setShow(false);
    window.dispatchEvent(
      new CustomEvent(META_PIXEL_CONSENT_EVENT, { detail: { status: "accepted" } })
    );
  };

  const decline = () => {
    localStorage.setItem(META_PIXEL_CONSENT_KEY, "declined");
    setShow(false);
    window.dispatchEvent(
      new CustomEvent(META_PIXEL_CONSENT_EVENT, { detail: { status: "declined" } })
    );
  };

  if (!show) return null;

  return (
    <div
      className="cookie-banner fixed bottom-0 left-0 right-0 z-[999] bg-background border-t border-border/40 px-4 md:px-6 py-4 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] mb-0"
      role="dialog"
      aria-label="Cookie consent"
      data-testid="banner-cookie-consent"
    >
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
          We use cookies to improve your experience, analyze site usage, and measure advertising
          (including Meta). By continuing you agree to our{" "}
          <Link href="/privacy" className="underline text-foreground">
            Privacy Policy
          </Link>
          .
        </p>
        <div className="flex gap-3 shrink-0">
          <button
            type="button"
            onClick={decline}
            className="text-xs text-muted-foreground underline px-2 py-1"
            data-testid="button-cookie-decline"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={accept}
            className="text-[10px] tracking-[0.15em] uppercase bg-foreground text-background px-6 py-2"
            data-testid="button-cookie-accept"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
