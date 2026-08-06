/** Shared App Store + Universal Links / deep-link helpers (NAP-style Open → Store). */

import { SITE_URL } from "./seo-international";

export const APP_STORE_ID = "6770476520";

/** Canonical live App Store listing (Apple’s `id` form). */
export const DEFAULT_APP_STORE_URL = `https://apps.apple.com/us/app/intertexe/id${APP_STORE_ID}`;

/** Custom scheme registered on the iOS app — required for same-domain Safari CTAs. */
export const DEFAULT_APP_URL_SCHEME = "intertexe";

/**
 * Deep-link Open App path is OFF until the App Store build with
 * Universal Links + `intertexe://` is public.
 * Always false for now — do not read env (avoids a Vercel flag re-enabling scheme probes).
 */
export function isAppDeepLinkReady(): boolean {
  return false;
}

const LIKELY_INSTALLED_KEY = "intertexe-app-likely-installed";
const PREFER_DOWNLOAD_KEY = "intertexe-cta-prefer-download";

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

/** Normalize any App Store URL to the stable https://apps.apple.com/app/id… form. */
export function normalizeAppStoreUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed || isPlaceholderEnv(trimmed)) return DEFAULT_APP_STORE_URL;
  const idMatch =
    trimmed.match(/(?:id|\/app\/)(\d{8,12})\b/i) || trimmed.match(/\b(\d{8,12})\b/);
  if (idMatch?.[1]) return `https://apps.apple.com/us/app/intertexe/id${idMatch[1]}`;
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

export function readLikelyAppInstalled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(LIKELY_INSTALLED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markAppLikelyInstalled(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LIKELY_INSTALLED_KEY, "1");
    sessionStorage.removeItem(PREFER_DOWNLOAD_KEY);
  } catch {
    // ignore
  }
}

export function clearLikelyAppInstalled(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LIKELY_INSTALLED_KEY);
  } catch {
    // ignore
  }
}

function markPreferDownloadThisSession(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PREFER_DOWNLOAD_KEY, "1");
  } catch {
    // ignore
  }
}

function readPreferDownloadThisSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(PREFER_DOWNLOAD_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * NAP-style label:
 * - Download App until deep-link build is public
 * - Then Open App when installed / default; Download App after a failed open this session
 */
export function getAppCtaLabel(likelyInstalled?: boolean): string {
  if (!isAppDeepLinkReady()) return "Download App";
  const installed =
    typeof likelyInstalled === "boolean" ? likelyInstalled : readLikelyAppInstalled();
  if (installed) return "Open App";
  if (readPreferDownloadThisSession()) return "Download App";
  return "Open App";
}

/** Path-only deep link target, e.g. `product/abc` or `scanner`. */
export function deepLinkPathFromLocation(path?: string): string {
  const raw =
    path ??
    (typeof window !== "undefined" ? window.location.pathname || "/" : "/");
  return raw.replace(/^\//, "").replace(/\/$/, "") || "";
}

/** https Universal Link for shared content (Messages, email, other sites). */
export function universalLinkForPath(path?: string): string {
  const cleaned = (path || "/").startsWith("/") ? path || "/" : `/${path}`;
  return `${SITE_URL}${cleaned === "/" ? "" : cleaned}`;
}

/**
 * Same-tab App Store open.
 * Prefer a real `<a href>` click when possible — JS assign can fail on iOS Safari.
 */
export function openAppStore(storeUrl?: string): void {
  if (typeof window === "undefined") return;
  const url = getAppStoreUrl(storeUrl);
  window.location.href = url;
}

/**
 * Permanent Open App architecture (Net-a-Porter style):
 * 1. Try custom scheme with content path (works from same-domain Safari CTAs)
 * 2. If the app claims it → remember install, stay in app
 * 3. If not → App Store (Apple shows Open if already installed)
 *
 * Universal Links handle shared https://www.intertexe.com/… URLs from other apps.
 * Same-domain Safari cannot use UL to leave the browser — scheme fills that gap.
 */
export function openAppOrStore(opts?: {
  path?: string;
  storeUrl?: string;
}): void {
  if (typeof window === "undefined") return;
  const storeUrl = getAppStoreUrl(opts?.storeUrl);
  // Pre–deep-link build: never probe intertexe:// (Safari “invalid address”).
  if (!isAppDeepLinkReady()) {
    openAppStore(storeUrl);
    return;
  }
  const scheme = getAppUrlScheme();
  const path = deepLinkPathFromLocation(opts?.path);
  const deepLink = path ? `${scheme}://${path}${window.location.search || ""}` : `${scheme}://`;

  const started = Date.now();
  let left = false;

  const onHide = () => {
    if (document.hidden) {
      left = true;
      markAppLikelyInstalled();
    }
  };
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", onHide);

  try {
    window.location.href = deepLink;
  } catch {
    markPreferDownloadThisSession();
    clearLikelyAppInstalled();
    openAppStore(storeUrl);
    return;
  }

  window.setTimeout(() => {
    document.removeEventListener("visibilitychange", onHide);
    window.removeEventListener("pagehide", onHide);
    if (!left && Date.now() - started < 2200 && !document.hidden) {
      markPreferDownloadThisSession();
      clearLikelyAppInstalled();
      openAppStore(storeUrl);
    }
  }, 1600);
}
