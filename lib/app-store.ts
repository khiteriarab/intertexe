/** Shared App Store helpers — including TikTok/Instagram in-app browser escape. */

export const APP_STORE_ID = "6770476520";

/** Canonical live App Store listing. */
export const DEFAULT_APP_STORE_URL = `https://apps.apple.com/us/app/id${APP_STORE_ID}`;

/** Same-site hop Safari can open, then redirect to the App Store. */
export const APP_DOWNLOAD_PATH = "/download";

export const DEFAULT_APP_URL_SCHEME = "intertexe";

export function isAppDeepLinkReady(): boolean {
  return false;
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
  if (idMatch?.[1]) return `https://apps.apple.com/us/app/id${idMatch[1]}`;
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

export function getAppUrlScheme(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_APP_URL_SCHEME || "")
    .trim()
    .replace(/:\/\/*$/, "");
  if (fromEnv) return fromEnv;
  return DEFAULT_APP_URL_SCHEME;
}

/** Absolute https URL for /download on this origin. */
export function getDownloadHopUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${APP_DOWNLOAD_PATH}`;
  }
  return `https://www.intertexe.com${APP_DOWNLOAD_PATH}`;
}

/** Convert https://… → x-safari-https://… (opens real Safari from a WebView). */
export function toSafariHttpsUrl(httpsUrl: string): string {
  return httpsUrl.replace(/^https:\/\//i, "x-safari-https://");
}

/**
 * TikTok / Instagram / Facebook / Snapchat (and ByteDance) in-app browsers.
 * These block App Store opens unless we hand off to Safari.
 */
export function isIosInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (!/iPhone|iPad|iPod/i.test(ua)) return false;
  return /Instagram|FBAN|FBAV|FB_IAB|FBIOS|TikTok|tiktok|Bytedance|ByteWebView|ByteLocale|musical_ly|Aweme|TTWebView|Snapchat/i.test(
    ua
  );
}

export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent || "");
}

/**
 * Href for the Download button.
 * In TikTok/IG WebViews this is x-safari-https so a normal tap leaves the WebView.
 */
export function getAppStoreOpenUrl(explicit?: string): string {
  const httpsUrl = getAppStoreUrl(explicit);
  if (typeof window === "undefined") return httpsUrl;
  if (isIosInAppBrowser()) {
    // Prefer hopping through our /download in Safari — TikTok is less likely
    // to block opening Safari to our domain than to apps.apple.com directly.
    return toSafariHttpsUrl(getDownloadHopUrl());
  }
  return httpsUrl;
}

/**
 * Programmatic open — used when we need fallbacks after a tap.
 * Returns true if an in-app escape sequence was started.
 */
export function openAppStore(explicit?: string): boolean {
  if (typeof window === "undefined") return false;
  const store = getAppStoreUrl(explicit);

  if (!isIosInAppBrowser()) {
    window.location.href = store;
    return false;
  }

  const safariStore = toSafariHttpsUrl(store);
  const safariHop = toSafariHttpsUrl(getDownloadHopUrl());

  // 1) Leave WebView → Safari → our /download → App Store
  window.location.href = safariHop;

  // 2) If still here, try Safari → App Store directly
  window.setTimeout(() => {
    if (!document.hidden) {
      window.location.href = safariStore;
    }
  }, 700);

  return true;
}

export function readLikelyAppInstalled(): boolean {
  return false;
}

export function getAppCtaLabel(_likelyInstalled?: boolean): string {
  return "Download App";
}
