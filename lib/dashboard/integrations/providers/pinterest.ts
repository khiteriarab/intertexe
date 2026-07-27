import type { ProviderAdapter, TokenBundle } from "../types";

/** Prefer OAuth-prefixed names; accept shorter aliases from Vercel. */
function pinterestAppId(): string | undefined {
  return (
    process.env.PINTEREST_OAUTH_APP_ID?.trim() ||
    process.env.PINTEREST_APP_ID?.trim() ||
    undefined
  );
}

function pinterestAppSecret(): string | undefined {
  return (
    process.env.PINTEREST_OAUTH_APP_SECRET?.trim() ||
    process.env.PINTEREST_APP_SECRET?.trim() ||
    undefined
  );
}

function requirePinterestAppId(): string {
  const v = pinterestAppId();
  if (!v) throw new Error("PINTEREST_OAUTH_APP_ID (or PINTEREST_APP_ID) is not configured");
  return v;
}

function requirePinterestAppSecret(): string {
  const v = pinterestAppSecret();
  if (!v) throw new Error("PINTEREST_OAUTH_APP_SECRET (or PINTEREST_APP_SECRET) is not configured");
  return v;
}

/**
 * Organic Pinterest scopes for Founder OS discovery.
 * ads:read can be added later for paid analytics without a schema change.
 */
const SCOPES = ["user_accounts:read", "pins:read", "boards:read"].join(",");

const ORGANIC_METRICS = [
  "IMPRESSION",
  "PIN_CLICK",
  "OUTBOUND_CLICK",
  "SAVE",
  "ENGAGEMENT",
].join(",");

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

export type PinterestTopPinMetric = {
  pinId: string;
  title: string | null;
  link: string | null;
  impression: number;
  pinClick: number;
  outboundClick: number;
  save: number;
  engagement: number;
};

export const pinterestAdapter: ProviderAdapter = {
  id: "pinterest",

  isConfigured() {
    return Boolean(pinterestAppId() && pinterestAppSecret());
  },

  getAuthorizationUrl({ state, redirectUri }) {
    const params = new URLSearchParams({
      client_id: requirePinterestAppId(),
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SCOPES,
      state,
    });
    return `https://www.pinterest.com/oauth/?${params}`;
  },

  async exchangeCode({ code, redirectUri }) {
    const basic = Buffer.from(
      `${requirePinterestAppId()}:${requirePinterestAppSecret()}`
    ).toString("base64");
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      // Continuous refresh (60d, refreshable indefinitely) — required for new apps.
      continuous_refresh: "true",
    });
    const res = await fetch("https://api.pinterest.com/v5/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const json = (await res.json()) as Record<string, unknown>;
    if (!res.ok || !json.access_token) {
      throw new Error(String(json.message || json.error || "Pinterest token exchange failed"));
    }
    return mapPinterestToken(json);
  },

  async refreshAccessToken(refreshToken: string) {
    const basic = Buffer.from(
      `${requirePinterestAppId()}:${requirePinterestAppSecret()}`
    ).toString("base64");
    const res = await fetch("https://api.pinterest.com/v5/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });
    const json = (await res.json()) as Record<string, unknown>;
    if (!res.ok || !json.access_token) {
      throw new Error(String(json.message || json.error || "Pinterest refresh failed"));
    }
    return mapPinterestToken(json);
  },

  async enrichAccount(accessToken: string) {
    const user = await fetchJson(
      "https://api.pinterest.com/v5/user_account",
      accessToken
    );
    if (!user.ok) return {};
    const u = user.json as Record<string, unknown>;
    return {
      accountLabel: String(u.username || u.business_name || "") || null,
      externalAccountId: u.id != null ? String(u.id) : null,
    };
  },

  async syncMetrics({ accessToken }) {
    const end = daysAgo(1); // Pinterest analytics often lag; end at yesterday UTC
    const start7 = daysAgo(7);
    const startPrev = daysAgo(14);
    const endPrev = daysAgo(8);

    const [userRes, analytics7, analyticsPrev, topPinsRes, pinsRes] = await Promise.all([
      fetchJson("https://api.pinterest.com/v5/user_account", accessToken),
      fetchUserAnalytics(accessToken, fmtDate(start7), fmtDate(end)),
      fetchUserAnalytics(accessToken, fmtDate(startPrev), fmtDate(endPrev)),
      fetchTopPins(accessToken, fmtDate(start7), fmtDate(end)),
      fetchJson("https://api.pinterest.com/v5/pins?page_size=25", accessToken),
    ]);

    const user = userRes.ok ? (userRes.json as Record<string, unknown>) : {};
    const summary7 = analytics7.summary;
    const summaryPrev = analyticsPrev.summary;
    const pinItems = pinsRes.ok
      ? Array.isArray((pinsRes.json as { items?: unknown[] }).items)
        ? ((pinsRes.json as { items: unknown[] }).items as Record<string, unknown>[])
        : []
      : [];

    const metrics: Record<string, unknown> = {
      syncedAt: new Date().toISOString(),
      apiSurface: "pinterest_v5_organic",
      periods: {
        trailing7d: { startDate: fmtDate(start7), endDate: fmtDate(end) },
        prior7d: { startDate: fmtDate(startPrev), endDate: fmtDate(endPrev) },
      },
      username: user.username ? String(user.username) : null,
      businessName: user.business_name ? String(user.business_name) : null,
      accountType: user.account_type ? String(user.account_type) : null,
      profileImage: user.profile_image ? String(user.profile_image) : null,
      followerCount: numOrNull(user.follower_count),
      followingCount: numOrNull(user.following_count),
      pinCount: numOrNull(user.pin_count),
      boardCount: numOrNull(user.board_count),
      // Organic analytics (user_account/analytics)
      impressions7d: summary7.IMPRESSION ?? null,
      pinClicks7d: summary7.PIN_CLICK ?? null,
      outboundClicks7d: summary7.OUTBOUND_CLICK ?? null,
      saves7d: summary7.SAVE ?? null,
      engagement7d: summary7.ENGAGEMENT ?? null,
      impressionsPrev7d: summaryPrev.IMPRESSION ?? null,
      pinClicksPrev7d: summaryPrev.PIN_CLICK ?? null,
      outboundClicksPrev7d: summaryPrev.OUTBOUND_CLICK ?? null,
      savesPrev7d: summaryPrev.SAVE ?? null,
      engagementPrev7d: summaryPrev.ENGAGEMENT ?? null,
      topPins: topPinsRes.pins.slice(0, 10),
      pinsSampleCount: pinItems.length,
      recentPins: pinItems.slice(0, 10).map((p) => ({
        id: p.id != null ? String(p.id) : "",
        title: p.title != null ? String(p.title) : null,
        link: p.link != null ? String(p.link) : null,
        createdAt: p.created_at != null ? String(p.created_at) : null,
      })),
      extensions: {
        adsAnalyticsReady: false,
        note: "Organic user_account analytics. Ads analytics (ads:read) can land in extensions later.",
      },
    };

    const errors: string[] = [];
    if (!userRes.ok) errors.push(`user_account: ${userRes.error || userRes.status}`);
    if (analytics7.error) errors.push(`analytics_7d: ${analytics7.error}`);
    if (analyticsPrev.error) errors.push(`analytics_prev7d: ${analyticsPrev.error}`);
    if (topPinsRes.error) errors.push(`top_pins: ${topPinsRes.error}`);
    if (!pinsRes.ok) errors.push(`pins: ${pinsRes.error || pinsRes.status}`);
    if (errors.length) metrics.pinterestError = errors.join(" · ").slice(0, 500);

    return {
      metrics,
      raw: {
        user: userRes.json,
        analytics7d: analytics7.raw,
        analyticsPrev7d: analyticsPrev.raw,
        topPins: topPinsRes.raw,
        pins: pinsRes.json,
      },
    };
  },
};

async function fetchUserAnalytics(accessToken: string, startDate: string, endDate: string) {
  const url = new URL("https://api.pinterest.com/v5/user_account/analytics");
  url.searchParams.set("start_date", startDate);
  url.searchParams.set("end_date", endDate);
  url.searchParams.set("metric_types", ORGANIC_METRICS);
  const res = await fetchJson(url.toString(), accessToken);
  if (!res.ok) {
    return { summary: {} as Record<string, number | null>, error: res.error || String(res.status), raw: res.json };
  }
  return { summary: sumAnalyticsSummaries(res.json), error: null as string | null, raw: res.json };
}

async function fetchTopPins(accessToken: string, startDate: string, endDate: string) {
  const url = new URL("https://api.pinterest.com/v5/user_account/analytics/top_pins");
  url.searchParams.set("start_date", startDate);
  url.searchParams.set("end_date", endDate);
  url.searchParams.set("sort_by", "IMPRESSION");
  url.searchParams.set("metric_types", ORGANIC_METRICS);
  url.searchParams.set("num_of_pins", "10");
  const res = await fetchJson(url.toString(), accessToken);
  if (!res.ok) {
    return { pins: [] as PinterestTopPinMetric[], error: res.error || String(res.status), raw: res.json };
  }
  return { pins: parseTopPins(res.json), error: null as string | null, raw: res.json };
}

function sumAnalyticsSummaries(json: unknown): Record<string, number | null> {
  const out: Record<string, number> = {};
  if (!json || typeof json !== "object") return emptyMetricMap();
  for (const value of Object.values(json as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;
    const summary = (value as { summary_metrics?: Record<string, unknown> }).summary_metrics;
    if (!summary || typeof summary !== "object") continue;
    for (const [k, v] of Object.entries(summary)) {
      const n = Number(v);
      if (!Number.isFinite(n)) continue;
      out[k] = (out[k] || 0) + n;
    }
  }
  return {
    IMPRESSION: out.IMPRESSION ?? null,
    PIN_CLICK: out.PIN_CLICK ?? null,
    OUTBOUND_CLICK: out.OUTBOUND_CLICK ?? null,
    SAVE: out.SAVE ?? null,
    ENGAGEMENT: out.ENGAGEMENT ?? null,
  };
}

function emptyMetricMap(): Record<string, number | null> {
  return {
    IMPRESSION: null,
    PIN_CLICK: null,
    OUTBOUND_CLICK: null,
    SAVE: null,
    ENGAGEMENT: null,
  };
}

function parseTopPins(json: unknown): PinterestTopPinMetric[] {
  if (!json || typeof json !== "object") return [];
  const root = json as Record<string, unknown>;
  const candidates =
    (Array.isArray(root.pins) && root.pins) ||
    (Array.isArray(root.items) && root.items) ||
    (Array.isArray(root.data) && root.data) ||
    [];
  const out: PinterestTopPinMetric[] = [];
  for (const raw of candidates as Record<string, unknown>[]) {
    const metrics =
      (raw.metrics as Record<string, unknown>) ||
      (raw.summary_metrics as Record<string, unknown>) ||
      {};
    const pinId = String(raw.pin_id || raw.id || "");
    if (!pinId) continue;
    out.push({
      pinId,
      title: raw.title != null ? String(raw.title) : null,
      link: raw.link != null ? String(raw.link) : null,
      impression: Number(metrics.IMPRESSION || 0),
      pinClick: Number(metrics.PIN_CLICK || 0),
      outboundClick: Number(metrics.OUTBOUND_CLICK || 0),
      save: Number(metrics.SAVE || 0),
      engagement: Number(metrics.ENGAGEMENT || 0),
    });
  }
  return out;
}

async function fetchJson(url: string, accessToken: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  const errObj = json && typeof json === "object" ? (json as Record<string, unknown>) : {};
  return {
    ok: res.ok,
    status: res.status,
    json,
    error: res.ok
      ? null
      : String(errObj.message || errObj.error || `HTTP ${res.status}`),
  };
}

function mapPinterestToken(json: Record<string, unknown>): TokenBundle {
  const expiresIn = Number(json.expires_in || 2592000);
  return {
    accessToken: String(json.access_token),
    refreshToken: json.refresh_token ? String(json.refresh_token) : null,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
    tokenType: String(json.token_type || "bearer"),
    scopes: String(json.scope || SCOPES)
      .split(/[,\s]+/)
      .filter(Boolean),
    metadata: {
      refreshTokenExpiresAt: json.refresh_token_expires_in
        ? new Date(Date.now() + Number(json.refresh_token_expires_in) * 1000).toISOString()
        : null,
      continuousRefresh: true,
    },
  };
}

function numOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
