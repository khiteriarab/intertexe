/** Shared App Store + Universal Link helpers. */

export const APP_STORE_ID = "6770476520";

/** Canonical live App Store listing. */
export const DEFAULT_APP_STORE_URL = `https://apps.apple.com/app/id${APP_STORE_ID}`;

/** Explicit App Store-only hop (not claimed in AASA). */
export const APP_DOWNLOAD_PATH = "/download";

/** Smart-link wrapper claimed in AASA — opens app if installed, else /open → App Store. */
export const APP_UNIVERSAL_OPEN_PATH = "/open";

export const DEFAULT_APP_URL_SCHEME = "intertexe";

/** Public site origin used for Universal Link CTAs. */
export const APP_UNIVERSAL_ORIGIN = "https://www.intertexe.com";

/**
 * Live App Store 1.0.1 includes UL routing for claimed AASA paths.
 * Flip only after production AASA components are live on origin (+ Apple CDN).
 */
export function isAppDeepLinkReady(): boolean {
  return true;
}

function isPlaceholderEnv(value: string): boolean {
  const v = value.toLowerCase();
  return (
    !v ||
    v === "#" ||
    v.includes("[sensitive]") ||
    v.includes("your-") ||
    v.includes("example")
  );
}

export function normalizeAppStoreUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed || isPlaceholderEnv(trimmed)) return DEFAULT_APP_STORE_URL;
  const idMatch =
    trimmed.match(/(?:id|\/app\/)(\d{8,12})\b/i) || trimmed.match(/\b(\d{8,12})\b/);
  if (idMatch?.[1]) return `https://apps.apple.com/app/id${idMatch[1]}`;
  if (/^https?:\/\/apps\.apple\.com\//i.test(trimmed)) return trimmed;
  return DEFAULT_APP_STORE_URL;
}

export function getAppStoreUrl(explicit?: string): string {
  const fromProp = (explicit || "").trim();
  if (fromProp && !isPlaceholderEnv(fromProp)) return normalizeAppStoreUrl(fromProp);
  const fromEnv = (process.env.NEXT_PUBLIC_APP_STORE_URL || "").trim();
  if (fromEnv && !isPlaceholderEnv(fromEnv)) return normalizeAppStoreUrl(fromEnv);
  return DEFAULT_APP_STORE_URL;
}

/**
 * Build an HTTPS Universal Link that opens INTERTEXE when installed.
 * Falls back to the /open web page → App Store when not installed.
 *
 * Prefer destinations the live binary can route:
 * /scanner, /product/*, /shop, /designers/*, /collections/*, /capture, /sale, /account
 * Do not use /inspirations/* (1.0.1 has no handler).
 */
export type OpenUrlExtra = {
  cta?: string;
  params?: Record<string, string | undefined | null>;
};

export function getUniversalOpenUrl(nextPath?: string, extra?: OpenUrlExtra): string {
  const next = (nextPath || "/").trim() || "/";
  const normalized = next.startsWith("/") ? next : `/${next}`;
  const params = new URLSearchParams();
  if (normalized && normalized !== "/") {
    params.set("next", normalized);
  }
  if (extra?.cta) params.set("itx_cta", extra.cta.slice(0, 80));
  if (extra?.params) {
    for (const [key, value] of Object.entries(extra.params)) {
      const v = (value || "").trim();
      if (!key || !v || params.has(key)) continue;
      params.set(key, v.slice(0, 200));
    }
  }
  const qs = params.toString();
  return `${APP_UNIVERSAL_ORIGIN}${APP_UNIVERSAL_OPEN_PATH}${qs ? `?${qs}` : ""}`;
}

/** Path + search from a site URL or path. Leaves /open wrappers untouched. */
export function hrefToSitePath(href: string): string {
  const trimmed = String(href || "").trim();
  if (!trimmed) return "/";
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const url = new URL(trimmed);
      const host = url.hostname.replace(/^www\./, "");
      if (host === "intertexe.com") {
        return `${url.pathname}${url.search}` || "/";
      }
    }
  } catch {
    /* fall through */
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

/**
 * After the custom-scheme hop, send shoppers to the web item — not the App Store —
 * when the destination is a catalog page. Download/open-app CTAs still go to the store.
 */
export function shouldOpenFallbackToWeb(nextPath: string, cta?: string | null): boolean {
  const path = (nextPath || "/").split("?")[0] || "/";
  const ctaKey = String(cta || "");
  if (ctaKey === "chrome_extension_open" || path.startsWith("/capture")) return true;
  if (ctaKey.endsWith("_app") || ctaKey.includes("download")) return false;
  return /^(?:\/product\/|\/shop|\/collections|\/designers|\/sale|\/materials|\/edits)/.test(path);
}

/**
 * App Store listing only. Download / “iOS App” CTAs must not hop through
 * /open or intertexe:// (desktop browsers treat that as an unknown link).
 */
export function getAppStoreOpenUrl(
  _nextPath?: string,
  explicitStoreUrl?: string,
  _extra?: OpenUrlExtra
): string {
  return getAppStoreUrl(explicitStoreUrl);
}

export function getAppUrlScheme(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_APP_URL_SCHEME || "")
    .trim()
    .replace(/:\/\/*$/, "");
  if (fromEnv) return fromEnv;
  return DEFAULT_APP_URL_SCHEME;
}

/**
 * Custom URL scheme for when Universal Links are swallowed (Gmail in-app browser).
 * Live 1.0.1 registers `intertexe://` and opens the app.
 */
export function getAppSchemeOpenUrl(nextPath?: string): string {
  const scheme = getAppUrlScheme();
  const next = (nextPath || "/").trim() || "/";
  const normalized = next.startsWith("/") ? next : `/${next}`;
  if (normalized && normalized !== "/") {
    return `${scheme}://open?next=${encodeURIComponent(normalized)}`;
  }
  return `${scheme}://`;
}

/**
 * Product deep link. `intertexe://open?next=/product/{id}` is the Shop tab and
 * ignores `next`. The live binary routes `/product/:id`, so the complementary
 * app URL is `intertexe://product/{id}`.
 */
export function getAppSchemeProductUrl(productId: string): string {
  const scheme = getAppUrlScheme();
  const id = encodeURIComponent(String(productId || "").trim());
  return `${scheme}://product/${id}`;
}

export function openAppStore(explicit?: string): void {
  if (typeof window === "undefined") return;
  window.location.href = getAppStoreUrl(explicit);
}

export function readLikelyAppInstalled(): boolean {
  return false;
}

export function getAppCtaLabel(_likelyInstalled?: boolean): string {
  return "Download App";
}
