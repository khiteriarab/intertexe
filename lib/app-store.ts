/** Shared App Store / deep-link helpers for download CTAs. */

export const APP_STORE_ID = "6770476520";

export const DEFAULT_APP_STORE_URL = `https://apps.apple.com/app/id${APP_STORE_ID}`;

export function getAppStoreUrl(explicit?: string): string {
  const fromProp = (explicit || "").trim();
  if (fromProp) return fromProp;
  const fromEnv = (process.env.NEXT_PUBLIC_APP_STORE_URL || "").trim();
  if (fromEnv) return fromEnv;
  return DEFAULT_APP_STORE_URL;
}

/** Optional custom scheme once registered on the iOS app (e.g. `intertexe`). */
export function getAppUrlScheme(): string {
  return (process.env.NEXT_PUBLIC_APP_URL_SCHEME || "").trim().replace(/:\/\/*$/, "");
}

/**
 * Try to open the native app (custom scheme when set), then fall back to the App Store.
 * Mirrors NAP “OPEN” — installed users jump into the app; everyone else lands on the store.
 */
export function openAppOrStore(opts?: { path?: string; storeUrl?: string }): void {
  if (typeof window === "undefined") return;
  const storeUrl = getAppStoreUrl(opts?.storeUrl);
  const scheme = getAppUrlScheme();
  const path = (opts?.path || window.location.pathname || "/").replace(/^\//, "");

  if (!scheme) {
    window.location.href = storeUrl;
    return;
  }

  const deepLink = `${scheme}://${path}${window.location.search || ""}`;
  const started = Date.now();
  let left = false;

  const onHide = () => {
    left = true;
  };
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", onHide);

  window.location.href = deepLink;

  window.setTimeout(() => {
    document.removeEventListener("visibilitychange", onHide);
    window.removeEventListener("pagehide", onHide);
    if (!left && Date.now() - started < 2200 && !document.hidden) {
      window.location.href = storeUrl;
    }
  }, 1600);
}
