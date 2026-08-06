/** Shared App Store helpers. */

export const APP_STORE_ID = "6770476520";

/** Canonical live App Store listing. */
export const DEFAULT_APP_STORE_URL = `https://apps.apple.com/us/app/id${APP_STORE_ID}`;

/** @deprecated Kept for old /download bookmarks. */
export const APP_DOWNLOAD_PATH = "/download";

/** Custom scheme — only after the App Store build with URL types ships. */
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

/**
 * Instagram / TikTok / Facebook / Snapchat in-app browsers.
 * These block App Store opens → “Action can't be completed”.
 */
export function isIosInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (!/iPhone|iPad|iPod/i.test(ua)) return false;
  // Keep this narrow — false positives break real Safari.
  return /Instagram|FBAN|FBAV|FB_IAB|FBIOS|TikTok|BytedanceWebview|musical_ly|Snapchat/i.test(
    ua
  );
}

export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent || "");
}

/**
 * Best href for the current browser:
 * - In-app WebView → x-safari-https (hand off to Safari → App Store)
 * - Otherwise → normal https App Store URL
 */
export function getAppStoreOpenUrl(explicit?: string): string {
  const httpsUrl = getAppStoreUrl(explicit);
  if (typeof window === "undefined") return httpsUrl;
  if (isIosInAppBrowser()) {
    return httpsUrl.replace(/^https:\/\//i, "x-safari-https://");
  }
  return httpsUrl;
}

/** Open the App Store using the safest method for this browser. */
export function openAppStore(explicit?: string): void {
  if (typeof window === "undefined") return;
  window.location.href = getAppStoreOpenUrl(explicit);
}

/** @deprecated Deep-link install hints — unused until Open App ships. */
export function readLikelyAppInstalled(): boolean {
  return false;
}

export function getAppCtaLabel(_likelyInstalled?: boolean): string {
  return "Download App";
}
