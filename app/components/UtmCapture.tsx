/**
 * Capture first-touch UTMs + click IDs + referrer + landing page into cookies.
 * First-touch semantics: only write if the cookie is not already set.
 */
"use client";

import { useEffect } from "react";

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
const CLICK_KEYS = ["gclid", "ttclid", "fbclid", "msclkid"] as const;
const MAX_AGE = 60 * 60 * 24 * 90; // 90 days

function hasCookie(name: string): boolean {
  return document.cookie.split(";").some((c) => c.trim().startsWith(`${name}=`));
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${MAX_AGE}; samesite=lax`;
}

/** Parse GA4 client_id from the _ga cookie (G-XXXXXXXX.YYYY.ZZZZ → YYYY.ZZZZ). */
export function readGaClientIdFromCookie(): string | null {
  try {
    const m = document.cookie.match(/(?:^|;\s*)_ga=([^;]+)/);
    if (!m?.[1]) return null;
    const raw = decodeURIComponent(m[1]);
    const parts = raw.split(".");
    if (parts.length >= 4) return `${parts[2]}.${parts[3]}`;
    return raw;
  } catch {
    return null;
  }
}

export function collectClientFirstTouch(): Record<string, string> {
  const out: Record<string, string> = {};
  const read = (name: string) => {
    const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
    if (!m?.[1]) return;
    try {
      out[name] = decodeURIComponent(m[1]);
    } catch {
      out[name] = m[1];
    }
  };
  for (const k of [...UTM_KEYS, ...CLICK_KEYS]) read(k);
  read("first_referrer");
  read("first_landing_page");
  read("ga_client_id");
  const ga = readGaClientIdFromCookie();
  if (ga && !out.ga_client_id) out.ga_client_id = ga;
  return out;
}

export function UtmCapture() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      let wrote = false;

      for (const key of [...UTM_KEYS, ...CLICK_KEYS]) {
        const v = params.get(key);
        if (!v) continue;
        if (!hasCookie(key)) {
          setCookie(key, v);
          wrote = true;
        }
      }

      if (!hasCookie("first_landing_page")) {
        const path = `${window.location.pathname}${window.location.search || ""}`;
        setCookie("first_landing_page", path.slice(0, 2000));
        wrote = true;
      }

      if (!hasCookie("first_referrer") && document.referrer) {
        try {
          const refHost = new URL(document.referrer).hostname;
          if (refHost && !refHost.includes("intertexe.com")) {
            setCookie("first_referrer", document.referrer.slice(0, 2000));
            wrote = true;
          }
        } catch {
          /* ignore */
        }
      }

      // Persist GA client id when available (may arrive after gtag loads)
      const stampGa = () => {
        const ga = readGaClientIdFromCookie();
        if (ga && !hasCookie("ga_client_id")) setCookie("ga_client_id", ga);
      };
      stampGa();
      const t = window.setTimeout(stampGa, 2500);

      if (wrote && !hasCookie("utm_first_touch")) {
        setCookie("utm_first_touch", String(Date.now()));
      }

      return () => window.clearTimeout(t);
    } catch {
      /* ignore */
    }
  }, []);
  return null;
}
