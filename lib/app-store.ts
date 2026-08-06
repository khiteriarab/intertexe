/** Shared App Store / deep-link helpers for download CTAs. */

export const APP_STORE_ID = "6770476520";

/** Canonical live App Store listing (Apple’s `id` form). */
export const DEFAULT_APP_STORE_URL = `https://apps.apple.com/app/id${APP_STORE_ID}`;

/**
 * Custom scheme on the iOS app (`intertexe://…`).
 * Only used when we already know the app is installed — probing an unregistered
 * scheme makes Safari show “address is invalid” / “Action can't be completed”.
 */
export const DEFAULT_APP_URL_SCHEME = "intertexe";

const LIKELY_INSTALLED_KEY = "intertexe-app-likely-installed";

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
  // Extract numeric app id from common Apple URL shapes.
  const idMatch = trimmed.match(/(?:id|\/app\/)(\d{8,12})\b/i) || trimmed.match(/\b(\d{8,12})\b/);
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

/** Custom scheme once registered on the iOS app (default: `intertexe`). */
export function getAppUrlScheme(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_APP_URL_SCHEME || "").trim().replace(/:\/\/*$/, "");
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

/** Button copy: installed users see Open; everyone else sees Download. */
export function getAppCtaLabel(likelyInstalled: boolean): string {
  return likelyInstalled ? "Open App" : "Download App";
}

/**
 * Always open the App Store in the same tab.
 * Avoid target=_blank — Safari often shows “Action can't be completed” for App Store links in a new tab.
 */
export function openAppStore(storeUrl?: string): void {
  if (typeof window === "undefined") return;
  window.location.assign(getAppStoreUrl(storeUrl));
}

/**
 * Open the native app only when we believe it’s installed; otherwise App Store.
 * Never probe `intertexe://` for Download.
 */
export function openAppOrStore(opts?: {
  path?: string;
  storeUrl?: string;
  /** Force scheme attempt even if we haven’t seen an install yet. */
  preferApp?: boolean;
}): void {
  if (typeof window === "undefined") return;
  const storeUrl = getAppStoreUrl(opts?.storeUrl);
  const preferApp = opts?.preferApp ?? readLikelyAppInstalled();
  const scheme = getAppUrlScheme();

  if (!preferApp || !scheme) {
    openAppStore(storeUrl);
    return;
  }

  const path = (opts?.path || window.location.pathname || "/")
    .replace(/^\//, "")
    .replace(/\/$/, "");
  const deepLink = path ? `${scheme}://${path}${window.location.search || ""}` : `${scheme}://`;
  const started = Date.now();
  let left = false;

  const onHide = () => {
    // Only count a real backgrounding — `blur` alone fires too often and falsely marks “installed”.
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
    clearLikelyAppInstalled();
    openAppStore(storeUrl);
    return;
  }

  window.setTimeout(() => {
    document.removeEventListener("visibilitychange", onHide);
    window.removeEventListener("pagehide", onHide);
    if (!left && Date.now() - started < 2200 && !document.hidden) {
      clearLikelyAppInstalled();
      openAppStore(storeUrl);
    }
  }, 1600);
}
