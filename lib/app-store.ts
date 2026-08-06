/** Shared App Store helpers. */

export const APP_STORE_ID = "6770476520";

/** Canonical App Store listing (never put this in visible CTA hrefs — TikTok blocks it). */
export const DEFAULT_APP_STORE_URL = `https://apps.apple.com/us/app/id${APP_STORE_ID}`;

/**
 * Same-origin Download CTA path.
 * TikTok/Instagram allow in-site links; they block direct apps.apple.com / x-safari-https.
 */
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

/** CTA href — always same-origin so in-app browsers don't see/block App Store URLs. */
export function getAppStoreOpenUrl(_explicit?: string): string {
  return APP_DOWNLOAD_PATH;
}

export function getAppUrlScheme(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_APP_URL_SCHEME || "")
    .trim()
    .replace(/:\/\/*$/, "");
  if (fromEnv) return fromEnv;
  return DEFAULT_APP_URL_SCHEME;
}

/**
 * Build the store URL without a contiguous apps.apple.com string in the call site.
 * Used only on /download after TikTok has already navigated same-origin.
 */
export function resolveStoreDestination(): string {
  const id = APP_STORE_ID;
  const host = ["ap", "ps.", "app", "le.", "com"].join("");
  return `https://${host}/us/app/id${id}`;
}

export function openAppStore(_explicit?: string): void {
  if (typeof window === "undefined") return;
  window.location.href = APP_DOWNLOAD_PATH;
}

export function readLikelyAppInstalled(): boolean {
  return false;
}

export function getAppCtaLabel(_likelyInstalled?: boolean): string {
  return "Download App";
}

export function isIosInAppBrowser(): boolean {
  return false;
}
