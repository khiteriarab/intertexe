"use client";

/**
 * Consent-gated PostHog loader for consumer chrome.
 * Mirrors MetaPixel: only loads after cookie_consent === "accepted".
 * Skips B2B / dashboard / passport hosts (parent ClientApp already gates mount).
 */
import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  capturePostHogPageview,
  getPostHogKey,
  initPostHog,
  isPostHogConfigured,
  POSTHOG_CONSENT_EVENT,
  shutdownPostHog,
} from "../../lib/posthog";
import { hasMarketingConsent } from "../../lib/meta-pixel";

const SKIP_PREFIXES = ["/dashboard", "/platform", "/partners", "/api", "/brands", "/press-kit"];

function shouldTrackPath(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === "/p" || pathname.startsWith("/p/")) return false;
  return !SKIP_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function PostHogInner() {
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isPostHogConfigured()) return;
    setAllowed(hasMarketingConsent());
    const onConsent = (e: Event) => {
      const detail = (e as CustomEvent<{ status?: string }>).detail;
      if (detail?.status === "accepted" || hasMarketingConsent()) {
        setAllowed(true);
        initPostHog();
      } else if (detail?.status === "declined") {
        setAllowed(false);
        shutdownPostHog();
      }
    };
    window.addEventListener(POSTHOG_CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(POSTHOG_CONSENT_EVENT, onConsent);
  }, []);

  useEffect(() => {
    if (!allowed || !getPostHogKey()) return;
    initPostHog();
  }, [allowed]);

  useEffect(() => {
    if (!allowed || !shouldTrackPath(pathname)) return;
    if (lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;
    capturePostHogPageview(pathname);
  }, [allowed, pathname]);

  return null;
}

export function PostHogAnalytics() {
  if (!isPostHogConfigured()) return null;
  return (
    <Suspense fallback={null}>
      <PostHogInner />
    </Suspense>
  );
}
