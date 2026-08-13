/**
 * Meta Pixel (browser) helpers.
 * Consent-gated via localStorage cookie_consent === "accepted".
 * First-touch UTMs/fbclid remain in UtmCapture — this is marketing only.
 *
 * Events that fire before fbevents.js finishes loading are queued and flushed
 * on ready — otherwise ViewContent/Search/Wishlist silently drop on hard loads.
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
export const META_PIXEL_READY_EVENT = "intertexe:meta-pixel-ready";

type PendingMetaEvent = {
  kind: "track" | "trackCustom";
  eventName: string;
  params?: Record<string, unknown>;
  eventId?: string;
};

const MAX_PENDING = 40;

/** Prefer globalThis.window so Node unit tests can inject a stub. */
function getBrowserWindow(): Window & { __intertexeMetaPixelPending?: PendingMetaEvent[] } | undefined {
  if (typeof globalThis === "undefined") return undefined;
  return (globalThis as { window?: Window & { __intertexeMetaPixelPending?: PendingMetaEvent[] } }).window;
}

function getPendingQueue(): PendingMetaEvent[] {
  const w = getBrowserWindow();
  if (!w) return [];
  if (!w.__intertexeMetaPixelPending) w.__intertexeMetaPixelPending = [];
  return w.__intertexeMetaPixelPending;
}

export function getMetaPixelId(): string | null {
  const id = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  return id || null;
}

export function hasMarketingConsent(): boolean {
  const w = getBrowserWindow();
  if (!w) return false;
  try {
    return w.localStorage.getItem(META_PIXEL_CONSENT_KEY) === "accepted";
  } catch {
    return false;
  }
}

export function isMetaPixelReady(): boolean {
  const w = getBrowserWindow();
  return Boolean(
    w &&
      w.__intertexeMetaPixelInitialized &&
      typeof w.fbq === "function" &&
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

function canQueueMetaEvent(): boolean {
  return Boolean(getBrowserWindow() && hasMarketingConsent() && getMetaPixelId());
}

function enqueueMetaEvent(item: PendingMetaEvent) {
  const pendingMetaEvents = getPendingQueue();
  if (pendingMetaEvents.length >= MAX_PENDING) pendingMetaEvents.shift();
  pendingMetaEvents.push(item);
}

function dispatchFbq(item: PendingMetaEvent) {
  const w = getBrowserWindow();
  if (!w?.fbq) return;
  if (item.kind === "trackCustom") {
    if (item.eventId) {
      w.fbq("trackCustom", item.eventName, item.params || {}, { eventID: item.eventId });
    } else {
      w.fbq("trackCustom", item.eventName, item.params || {});
    }
    return;
  }
  if (item.eventId) {
    w.fbq("track", item.eventName, item.params || {}, { eventID: item.eventId });
  } else {
    w.fbq("track", item.eventName, item.params || {});
  }
}

/** Flush queued events after Pixel init. Safe to call repeatedly. */
export function flushMetaPixelQueue() {
  if (!isMetaPixelReady()) return;
  const pendingMetaEvents = getPendingQueue();
  while (pendingMetaEvents.length > 0) {
    const item = pendingMetaEvents.shift();
    if (item) dispatchFbq(item);
  }
  const w = getBrowserWindow();
  try {
    w?.dispatchEvent(new Event(META_PIXEL_READY_EVENT));
  } catch {
    /* ignore */
  }
}

function fbqTrack(eventName: string, params?: Record<string, unknown>, opts?: FbqTrackOpts) {
  if (!canQueueMetaEvent()) return;
  const item: PendingMetaEvent = {
    kind: "track",
    eventName,
    params,
    eventId: opts?.eventId,
  };
  if (!isMetaPixelReady()) {
    enqueueMetaEvent(item);
    return;
  }
  dispatchFbq(item);
}

function fbqTrackCustom(eventName: string, params?: Record<string, unknown>, opts?: FbqTrackOpts) {
  if (!canQueueMetaEvent()) return;
  const item: PendingMetaEvent = {
    kind: "trackCustom",
    eventName,
    params,
    eventId: opts?.eventId,
  };
  if (!isMetaPixelReady()) {
    enqueueMetaEvent(item);
    return;
  }
  dispatchFbq(item);
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
