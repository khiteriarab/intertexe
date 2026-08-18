/**
 * First-touch attribution — shared website + future iOS schema.
 * Profile fields are written once at registration and never overwritten.
 */
import { emitHqCustomerEvent } from "./events";

export type UtmBag = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
};

export type FirstTouchAttribution = UtmBag & {
  first_referrer?: string;
  first_landing_page?: string;
  first_session_id?: string;
  ga_client_id?: string;
  gclid?: string;
  ttclid?: string;
  fbclid?: string;
  msclkid?: string;
  acquisition_platform?: "website" | "ios" | "chrome_extension";
  attribution_extra?: Record<string, unknown>;
};

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

const CLICK_KEYS = ["gclid", "ttclid", "fbclid", "msclkid"] as const;

function clean(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t ? t.slice(0, 2000) : undefined;
}

function readCookie(cookieHeader: string, key: string): string | undefined {
  const m = cookieHeader.match(new RegExp(`(?:^|;\\s*)${key}=([^;]+)`));
  if (!m?.[1]) return undefined;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

export function extractUtmFromBody(body: Record<string, unknown> | null | undefined): UtmBag {
  if (!body) return {};
  const pick = (a: string, b?: string) => clean(body[a] ?? (b ? body[b] : undefined));
  return {
    utm_source: pick("utm_source", "utmSource"),
    utm_medium: pick("utm_medium", "utmMedium"),
    utm_campaign: pick("utm_campaign", "utmCampaign"),
    utm_content: pick("utm_content", "utmContent"),
    utm_term: pick("utm_term", "utmTerm"),
  };
}

export function extractUtmFromRequest(request: Request, body?: Record<string, unknown>): UtmBag {
  return extractFirstTouchFromRequest(request, body);
}

/** Full first-touch bag for registration (cookies > query > body > headers). */
export function extractFirstTouchFromRequest(
  request: Request,
  body?: Record<string, unknown>
): FirstTouchAttribution {
  const url = new URL(request.url);
  const cookieHeader = request.headers.get("cookie") || "";
  const fromCookie: Record<string, string | undefined> = {};
  for (const key of [...UTM_KEYS, ...CLICK_KEYS]) {
    fromCookie[key] = clean(readCookie(cookieHeader, key));
  }
  fromCookie.first_referrer = clean(readCookie(cookieHeader, "first_referrer"));
  fromCookie.first_landing_page = clean(readCookie(cookieHeader, "first_landing_page"));
  fromCookie.ga_client_id = clean(readCookie(cookieHeader, "ga_client_id"));

  const fromQuery: Record<string, string | undefined> = {};
  for (const key of [...UTM_KEYS, ...CLICK_KEYS]) {
    fromQuery[key] = clean(url.searchParams.get(key));
  }

  const fromBody = body ? extractUtmFromBody(body) : {};
  const bodyClick: Record<string, string | undefined> = {};
  if (body) {
    for (const key of CLICK_KEYS) {
      bodyClick[key] = clean(body[key]);
    }
    bodyClick.first_referrer = clean(body.first_referrer ?? body.referrer);
    bodyClick.first_landing_page = clean(body.first_landing_page ?? body.landing_page);
    bodyClick.ga_client_id = clean(body.ga_client_id ?? body.gaClientId);
    bodyClick.first_session_id = clean(body.first_session_id ?? body.sessionId);
  }

  const sessionHeader = clean(request.headers.get("x-session-id"));
  const referrerHeader = clean(request.headers.get("referer") || request.headers.get("referrer"));

  const merged: FirstTouchAttribution = {
    utm_source: fromCookie.utm_source || fromQuery.utm_source || fromBody.utm_source,
    utm_medium: fromCookie.utm_medium || fromQuery.utm_medium || fromBody.utm_medium,
    utm_campaign: fromCookie.utm_campaign || fromQuery.utm_campaign || fromBody.utm_campaign,
    utm_content: fromCookie.utm_content || fromQuery.utm_content || fromBody.utm_content,
    utm_term: fromCookie.utm_term || fromQuery.utm_term || fromBody.utm_term,
    gclid: fromCookie.gclid || fromQuery.gclid || bodyClick.gclid,
    ttclid: fromCookie.ttclid || fromQuery.ttclid || bodyClick.ttclid,
    fbclid: fromCookie.fbclid || fromQuery.fbclid || bodyClick.fbclid,
    msclkid: fromCookie.msclkid || fromQuery.msclkid || bodyClick.msclkid,
    first_referrer:
      fromCookie.first_referrer || bodyClick.first_referrer || referrerHeader,
    first_landing_page: fromCookie.first_landing_page || bodyClick.first_landing_page,
    ga_client_id: fromCookie.ga_client_id || bodyClick.ga_client_id,
    first_session_id: sessionHeader || bodyClick.first_session_id,
    acquisition_platform: "website",
  };

  const platformRaw =
    typeof body?.acquisition_platform === "string" ? body.acquisition_platform.trim().toLowerCase() : "";
  if (
    platformRaw === "chrome_extension" ||
    platformRaw === "ios" ||
    platformRaw === "website"
  ) {
    merged.acquisition_platform = platformRaw;
  }

  // Infer a channel label when UTMs missing but click id present
  if (!merged.utm_source) {
    if (merged.ttclid) merged.utm_source = "tiktok";
    else if (merged.gclid) merged.utm_source = "google";
    else if (merged.fbclid) merged.utm_source = "facebook";
    else if (merged.msclkid) merged.utm_source = "bing";
  }

  if (body?.attribution_extra && typeof body.attribution_extra === "object") {
    merged.attribution_extra = body.attribution_extra as Record<string, unknown>;
  }

  return merged;
}

/** Map first-touch bag → user_preferences columns (only set once). */
export function firstTouchToPreferenceColumns(ft: FirstTouchAttribution): Record<string, unknown> {
  const hasAny =
    ft.utm_source ||
    ft.utm_medium ||
    ft.utm_campaign ||
    ft.first_referrer ||
    ft.first_landing_page ||
    ft.ga_client_id ||
    ft.gclid ||
    ft.ttclid ||
    ft.fbclid ||
    ft.msclkid ||
    ft.first_session_id ||
    (ft.acquisition_platform && ft.acquisition_platform !== "website") ||
    Boolean(ft.attribution_extra?.signup_source);

  return {
    first_touch_source: ft.utm_source || null,
    first_touch_medium: ft.utm_medium || null,
    first_touch_campaign: ft.utm_campaign || null,
    first_touch_content: ft.utm_content || null,
    first_touch_term: ft.utm_term || null,
    first_referrer: ft.first_referrer || null,
    first_landing_page: ft.first_landing_page || null,
    first_session_id: ft.first_session_id || null,
    ga_client_id: ft.ga_client_id || null,
    gclid: ft.gclid || null,
    ttclid: ft.ttclid || null,
    fbclid: ft.fbclid || null,
    msclkid: ft.msclkid || null,
    first_touch_at: hasAny ? new Date().toISOString() : null,
    acquisition_platform: ft.acquisition_platform || "website",
    attribution_extra: ft.attribution_extra || {},
  };
}

export function displayAcquisitionSource(row: {
  first_touch_source?: string | null;
  first_touch_medium?: string | null;
  first_touch_campaign?: string | null;
}): string {
  if (!row.first_touch_source && !row.first_touch_medium && !row.first_touch_campaign) {
    return "Unknown";
  }
  const parts = [row.first_touch_source, row.first_touch_medium, row.first_touch_campaign].filter(
    Boolean
  );
  return parts.join(" / ") || "Unknown";
}

export async function emitAttributedEvent(input: {
  eventName: string;
  eventCategory?: string;
  customerId?: string | null;
  source?: string;
  sessionId?: string;
  productId?: string;
  campaignId?: string;
  utm?: UtmBag;
  metadata?: Record<string, unknown>;
}) {
  const utm = input.utm || {};
  return emitHqCustomerEvent({
    customerId: input.customerId,
    eventName: input.eventName,
    eventCategory: input.eventCategory,
    source: input.source,
    sessionId: input.sessionId,
    productId: input.productId,
    campaignId: input.campaignId,
    metadata: {
      ...utm,
      ...(input.metadata || {}),
    },
  });
}
