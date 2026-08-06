/** Shared App Store / deep-link helpers for download CTAs. */

export const APP_STORE_ID = "6770476520";

/** Canonical live App Store listing. */
export const DEFAULT_APP_STORE_URL = `https://apps.apple.com/app/${APP_STORE_ID}`;

/** Custom scheme registered on the iOS app (`intertexe://…`). */
export const DEFAULT_APP_URL_SCHEME = "intertexe";

const LIKELY_INSTALLED_KEY = "intertexe-app-likely-installed";

export function getAppStoreUrl(explicit?: string): string {
  const fromProp = (explicit || "").trim();
  if (fromProp && !isPlaceholderEnv(fromProp)) return fromProp;
  const fromEnv = (process.env.NEXT_PUBLIC_APP_STORE_URL || "").trim();
  if (fromEnv && !isPlaceholderEnv(fromEnv)) return fromEnv;
  return DEFAULT_APP_STORE_URL;
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

/** Button copy: installed users see Open; everyone else sees Download. */
export function getAppCtaLabel(likelyInstalled: boolean): string {
  return likelyInstalled ? "Open App" : "Download App";
}

/**
 * Try to open the native app via custom scheme, then fall back to the App Store.
 * If the scheme opens the app (tab hides), we remember that for future “Open App” labels.
 */
export function openAppOrStore(opts?: { path?: string; storeUrl?: string }): void {
  if (typeof window === "undefined") return;
  const storeUrl = getAppStoreUrl(opts?.storeUrl);
  const scheme = getAppUrlScheme();
  const path = (opts?.path || window.location.pathname || "/")
    .replace(/^\//, "")
    .replace(/\/$/, "");

  if (!scheme) {
    window.location.href = storeUrl;
    return;
  }

  const deepLink = path ? `${scheme}://${path}${window.location.search || ""}` : `${scheme}://`;
  const started = Date.now();
  let left = false;

  const onHide = () => {
    left = true;
    markAppLikelyInstalled();
  };
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", onHide);
  window.addEventListener("blur", onHide);

  window.location.href = deepLink;

  window.setTimeout(() => {
    document.removeEventListener("visibilitychange", onHide);
    window.removeEventListener("pagehide", onHide);
    window.removeEventListener("blur", onHide);
    if (!left && Date.now() - started < 2200 && !document.hidden) {
      window.location.href = storeUrl;
    }
  }, 1600);
}
