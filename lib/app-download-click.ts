import { collectClientFirstTouch } from "../app/components/UtmCapture";
import { APP_DOWNLOAD_CLICK_EVENT } from "./app-download-channel";
import { getOrCreateSessionId, readAuthToken } from "./session";

export { APP_DOWNLOAD_CLICK_EVENT, classifyAppDownloadChannel } from "./app-download-channel";
export type { AppDownloadClickChannel } from "./app-download-channel";

const DEDUPE_KEY = "itx_app_dl_click_at";
const DEDUPE_MS = 120 * 1000;

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
const CLICK_KEYS = ["gclid", "ttclid", "fbclid", "msclkid"] as const;

function recentlyTracked(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  try {
    const raw = sessionStorage.getItem(DEDUPE_KEY);
    const at = raw ? Number(raw) : 0;
    return Number.isFinite(at) && Date.now() - at < DEDUPE_MS;
  } catch {
    return false;
  }
}

function markTracked() {
  try {
    sessionStorage.setItem(DEDUPE_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

function pickAttr(url: URL, cookies: Record<string, string>, key: string): string | undefined {
  return url.searchParams.get(key) || cookies[key] || undefined;
}

/** Fire-and-forget. Never await from click/navigation handlers. */
export function trackAppDownloadClick(input: {
  ctaLocation: string;
  destination?: "open" | "app_store";
  sourcePage?: string;
}): void {
  if (typeof window === "undefined") return;
  if (recentlyTracked()) return;
  markTracked();

  const url = new URL(window.location.href);
  const cookies = collectClientFirstTouch();
  const sessionId = getOrCreateSessionId();
  const token = readAuthToken();
  const utm: Record<string, string> = {};
  for (const key of [...UTM_KEYS, ...CLICK_KEYS]) {
    const v = pickAttr(url, cookies, key);
    if (v) utm[key] = v.slice(0, 200);
  }

  const ctaLocation =
    input.ctaLocation || url.searchParams.get("itx_cta") || "open_landing";
  const payload = {
    eventName: APP_DOWNLOAD_CLICK_EVENT,
    sessionId,
    ctaLocation: ctaLocation.slice(0, 80),
    sourcePage: (input.sourcePage || document.referrer || url.pathname).slice(0, 500),
    landingPath: `${url.pathname}${url.search}`.slice(0, 500),
    destination: input.destination || "open",
    ...utm,
  };

  const body = JSON.stringify(payload);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    void fetch("/api/events/app-download-click", {
      method: "POST",
      headers,
      body,
      keepalive: true,
    });
  } catch {
    try {
      navigator.sendBeacon?.(
        "/api/events/app-download-click",
        new Blob([body], { type: "application/json" })
      );
    } catch {
      // ignore — never block navigation
    }
  }
}
