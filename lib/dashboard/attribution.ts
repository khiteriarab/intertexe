import { emitHqCustomerEvent } from "./events";

export type UtmBag = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
};

export function extractUtmFromBody(body: Record<string, unknown> | null | undefined): UtmBag {
  if (!body) return {};
  const pick = (a: string, b?: string) => {
    const v = body[a] ?? (b ? body[b] : undefined);
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
  };
  return {
    utm_source: pick("utm_source", "utmSource"),
    utm_medium: pick("utm_medium", "utmMedium"),
    utm_campaign: pick("utm_campaign", "utmCampaign"),
    utm_content: pick("utm_content", "utmContent"),
    utm_term: pick("utm_term", "utmTerm"),
  };
}

export function extractUtmFromRequest(request: Request, body?: Record<string, unknown>): UtmBag {
  const url = new URL(request.url);
  const fromQuery: UtmBag = {
    utm_source: url.searchParams.get("utm_source") || undefined,
    utm_medium: url.searchParams.get("utm_medium") || undefined,
    utm_campaign: url.searchParams.get("utm_campaign") || undefined,
    utm_content: url.searchParams.get("utm_content") || undefined,
    utm_term: url.searchParams.get("utm_term") || undefined,
  };
  const fromBody = extractUtmFromBody(body);
  const cookieHeader = request.headers.get("cookie") || "";
  const fromCookie: UtmBag = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const) {
    const m = cookieHeader.match(new RegExp(`(?:^|;\\s*)${key}=([^;]+)`));
    if (m?.[1]) fromCookie[key] = decodeURIComponent(m[1]);
  }
  return { ...fromCookie, ...fromQuery, ...fromBody };
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
