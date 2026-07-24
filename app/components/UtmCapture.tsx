/**
 * Capture first-touch UTMs into cookies so signup / clickouts can attribute later.
 * Mount once in the consumer ClientApp shell (not on /dashboard or /platform).
 */
"use client";

import { useEffect } from "react";

const KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

export function UtmCapture() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      let wrote = false;
      for (const key of KEYS) {
        const v = params.get(key);
        if (!v) continue;
        document.cookie = `${key}=${encodeURIComponent(v)}; path=/; max-age=${60 * 60 * 24 * 90}; samesite=lax`;
        wrote = true;
      }
      if (wrote && !document.cookie.includes("utm_first_touch=")) {
        document.cookie = `utm_first_touch=${Date.now()}; path=/; max-age=${60 * 60 * 24 * 90}; samesite=lax`;
      }
    } catch {
      /* ignore */
    }
  }, []);
  return null;
}
