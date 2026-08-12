/**
 * Meta Pixel (browser) helpers.
 * Consent-gated via localStorage cookie_consent === "accepted".
 * First-touch UTMs/fbclid remain in UtmCapture — this is marketing only.
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
    __intertexeMetaPixelInitialized?: boolean;
  }
}

export const META_PIXEL_CONSENT_KEY = "cookie_consent";
export const META_PIXEL_CONSENT_EVENT = "intertexe:cookie-consent";

export function getMetaPixelId(): string | null {
  const id = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  return id || null;
}

export function hasMarketingConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(META_PIXEL_CONSENT_KEY) === "accepted";
  } catch {
    return false;
  }
}

export function isMetaPixelReady(): boolean {
  return Boolean(
    typeof window !== "undefined" &&
      window.__intertexeMetaPixelInitialized &&
      typeof window.fbq === "function" &&
      hasMarketingConsent() &&
      getMetaPixelId()
  );
}

/** Stable event_id for future Pixel+CAPI deduplication. */
export function newMetaEventId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${rand}`.slice(0, 100);
}

type FbqTrackOpts = {
  eventId?: string;
};

function fbqTrack(eventName: string, params?: Record<string, unknown>, opts?: FbqTrackOpts) {
  if (!isMetaPixelReady() || !window.fbq) return;
  if (opts?.eventId) {
    window.fbq("track", eventName, params || {}, { eventID: opts.eventId });
  } else {
    window.fbq("track", eventName, params || {});
  }
}

function fbqTrackCustom(eventName: string, params?: Record<string, unknown>, opts?: FbqTrackOpts) {
  if (!isMetaPixelReady() || !window.fbq) return;
  if (opts?.eventId) {
    window.fbq("trackCustom", eventName, params || {}, { eventID: opts.eventId });
  } else {
    window.fbq("trackCustom", eventName, params || {});
  }
}

export function metaTrackPageView(path?: string) {
  fbqTrack("PageView", path ? { page_path: path } : undefined, {
    eventId: newMetaEventId("pv"),
  });
}

export function metaTrackViewContent(params: {
  contentIds: string[];
  contentName?: string;
  contentType?: string;
  value?: number | null;
  currency?: string;
}) {
  fbqTrack(
    "ViewContent",
    {
      content_ids: params.contentIds,
      content_name: params.contentName,
      content_type: params.contentType || "product",
      value: params.value ?? undefined,
      currency: params.currency || "USD",
    },
    { eventId: newMetaEventId("vc") }
  );
}

export function metaTrackSearch(params: { searchString: string; resultCount?: number }) {
  fbqTrack(
    "Search",
    {
      search_string: params.searchString.slice(0, 200),
      ...(params.resultCount != null ? { result_count: params.resultCount } : {}),
    },
    { eventId: newMetaEventId("search") }
  );
}

export function metaTrackAddToWishlist(params: {
  contentIds: string[];
  contentName?: string;
  value?: number | null;
  currency?: string;
}) {
  fbqTrack(
    "AddToWishlist",
    {
      content_ids: params.contentIds,
      content_name: params.contentName,
      content_type: "product",
      value: params.value ?? undefined,
      currency: params.currency || "USD",
    },
    { eventId: newMetaEventId("wish") }
  );
}

/** WEB account creation only — never iOS. */
export function metaTrackCompleteRegistration(params?: { method?: string; status?: boolean }) {
  fbqTrack(
    "CompleteRegistration",
    {
      content_name: "account",
      status: params?.status !== false,
      method: params?.method || "email",
    },
    { eventId: newMetaEventId("reg") }
  );
}

export function metaTrackCustom(eventName: string, params?: Record<string, unknown>) {
  fbqTrackCustom(eventName, params, { eventId: newMetaEventId("c") });
}

export function metaTrackRetailerClick(params: {
  productId: string;
  brandName?: string;
  value?: number;
  currency?: string;
  source?: string;
}) {
  metaTrackCustom("retailer_click", {
    content_ids: [params.productId],
    content_type: "product",
    brand_name: params.brandName,
    value: params.value,
    currency: params.currency || "USD",
    source: params.source,
  });
}

export function metaTrackScanStarted(mode: string) {
  metaTrackCustom("intertexe_scan_started", { scan_mode: mode });
}

export function metaTrackScanCompleted(params: {
  mode?: string;
  matched?: boolean;
  naturalPercent?: number;
}) {
  metaTrackCustom("intertexe_scan_completed", {
    scan_mode: params.mode,
    matched: params.matched,
    natural_fiber_percent: params.naturalPercent,
  });
}

export function metaTrackTxMatchUsed(params?: { matched?: boolean }) {
  metaTrackCustom("tx_match_used", { matched: params?.matched ?? true });
}
