"use client";

/**
 * Consent-gated Meta Pixel loader + SPA PageView (no duplicate on init).
 * fbevents.js loads only after cookie_consent === "accepted".
 */
import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  getMetaPixelId,
  hasMarketingConsent,
  metaTrackPageView,
  META_PIXEL_CONSENT_EVENT,
} from "../../lib/meta-pixel";

const SKIP_PREFIXES = ["/dashboard", "/platform", "/partners", "/api"];

function shouldTrackPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return !SKIP_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function ensureFbqStub() {
  if (typeof window === "undefined") return;
  if (typeof window.fbq === "function") return;
  const n: any = function (...args: unknown[]) {
    n.callMethod ? n.callMethod.apply(n, args) : n.queue.push(args);
  };
  n.queue = [] as unknown[];
  n.loaded = true;
  n.version = "2.0";
  n.push = n;
  window.fbq = n;
  window._fbq = n;
}

function loadFbevents(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }
    ensureFbqStub();
    const existing = document.querySelector('script[data-intertexe-meta-pixel="1"]');
    if (existing) {
      resolve();
      return;
    }
    const t = document.createElement("script");
    t.async = true;
    t.src = "https://connect.facebook.net/en_US/fbevents.js";
    t.dataset.intertexeMetaPixel = "1";
    t.onload = () => resolve();
    t.onerror = () => resolve();
    document.head.appendChild(t);
  });
}

function initFbq(pixelId: string) {
  if (typeof window === "undefined") return;
  if (window.__intertexeMetaPixelInitialized) return;
  ensureFbqStub();
  window.fbq?.("init", pixelId);
  window.__intertexeMetaPixelInitialized = true;
}

function MetaPixelInner() {
  const pixelId = getMetaPixelId();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [allowed, setAllowed] = useState(false);
  const [ready, setReady] = useState(false);
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    setAllowed(hasMarketingConsent());
    const onConsent = (e: Event) => {
      const detail = (e as CustomEvent<{ status?: string }>).detail;
      if (detail?.status === "accepted" || hasMarketingConsent()) {
        setAllowed(true);
      } else if (detail?.status === "declined") {
        setAllowed(false);
      }
    };
    window.addEventListener(META_PIXEL_CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(META_PIXEL_CONSENT_EVENT, onConsent);
  }, []);

  useEffect(() => {
    if (!pixelId || !allowed) return;
    let cancelled = false;
    loadFbevents().then(() => {
      if (cancelled) return;
      initFbq(pixelId);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [pixelId, allowed]);

  useEffect(() => {
    if (!pixelId || !allowed || !ready) return;
    if (!shouldTrackPath(pathname)) return;

    const key = `${pathname}${searchParams?.toString() ? `?${searchParams}` : ""}`;
    if (lastPathRef.current === key) return;
    lastPathRef.current = key;
    metaTrackPageView(pathname || undefined);
  }, [pixelId, allowed, ready, pathname, searchParams]);

  if (!pixelId || !allowed) return null;

  return (
    <noscript>
      <img
        height={1}
        width={1}
        style={{ display: "none" }}
        src={`https://www.facebook.com/tr?id=${encodeURIComponent(pixelId)}&ev=PageView&noscript=1`}
        alt=""
      />
    </noscript>
  );
}

export function MetaPixel() {
  return (
    <Suspense fallback={null}>
      <MetaPixelInner />
    </Suspense>
  );
}
