import type { ProviderAdapter, TokenBundle } from "../types";

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`${name} is not configured`);
  return v;
}

const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/webmasters.readonly",
].join(" ");

export const googleAdapter: ProviderAdapter = {
  id: "google",

  isConfigured() {
    return Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET);
  },

  getAuthorizationUrl({ state, redirectUri }) {
    const params = new URLSearchParams({
      client_id: requireEnv("GOOGLE_OAUTH_CLIENT_ID"),
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SCOPES,
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  },

  async exchangeCode({ code, redirectUri }) {
    const body = new URLSearchParams({
      code,
      client_id: requireEnv("GOOGLE_OAUTH_CLIENT_ID"),
      client_secret: requireEnv("GOOGLE_OAUTH_CLIENT_SECRET"),
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const json = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      throw new Error(String(json.error_description || json.error || "Google token exchange failed"));
    }
    return mapGoogleToken(json);
  },

  async refreshAccessToken(refreshToken: string) {
    const body = new URLSearchParams({
      client_id: requireEnv("GOOGLE_OAUTH_CLIENT_ID"),
      client_secret: requireEnv("GOOGLE_OAUTH_CLIENT_SECRET"),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const json = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      throw new Error(String(json.error_description || json.error || "Google refresh failed"));
    }
    return { ...mapGoogleToken(json), refreshToken };
  },

  async enrichAccount(accessToken: string) {
    const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return {};
    const u = (await res.json()) as { email?: string; id?: string; name?: string };
    return {
      accountLabel: u.email || u.name || null,
      externalAccountId: u.id || null,
    };
  },

  async syncMetrics({ accessToken, metadata }) {
    const propertyId = String(metadata.ga4PropertyId || process.env.GA4_PROPERTY_ID || "").trim();
    const siteUrlConfigured = Boolean(
      String(metadata.searchConsoleSiteUrl || process.env.SEARCH_CONSOLE_SITE_URL || "").trim()
    );
    const siteUrl = String(
      metadata.searchConsoleSiteUrl || process.env.SEARCH_CONSOLE_SITE_URL || "https://www.intertexe.com/"
    ).trim();

    const setupWarnings: string[] = [];
    const metrics: Record<string, unknown> = { syncedAt: new Date().toISOString() };
    const raw: Record<string, unknown> = {};

    if (propertyId) {
      const end = new Date();
      const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      const gaRes = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            dateRanges: [{ startDate: fmt(start), endDate: fmt(end) }],
            metrics: [{ name: "sessions" }, { name: "activeUsers" }, { name: "screenPageViews" }],
          }),
        }
      );
      const gaJson = await gaRes.json();
      raw.ga4 = gaJson;
      if (gaRes.ok) {
        const values = gaJson?.rows?.[0]?.metricValues || [];
        metrics.ga4Sessions7d = Number(values[0]?.value || 0);
        metrics.ga4Users7d = Number(values[1]?.value || 0);
        metrics.ga4PageViews7d = Number(values[2]?.value || 0);
      } else {
        const msg =
          gaJson?.error?.message ||
          "GA4 report failed — confirm GA4_PROPERTY_ID and that this Google account can access the property";
        metrics.ga4Error = msg;
        setupWarnings.push(msg);
      }
    } else {
      const msg =
        "Setup required: set GA4_PROPERTY_ID in Vercel Production (or connection metadata.ga4PropertyId) to pull Analytics";
      metrics.ga4Note = msg;
      setupWarnings.push(msg);
    }

    if (!siteUrlConfigured) {
      const msg =
        "Setup note: SEARCH_CONSOLE_SITE_URL is unset — defaulting to https://www.intertexe.com/. Set it in Vercel if your Search Console property URL differs.";
      metrics.gscSetupNote = msg;
      setupWarnings.push(msg);
    }

    const scEnd = new Date();
    const scStart = new Date(scEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
    const scRes = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate: scStart.toISOString().slice(0, 10),
          endDate: scEnd.toISOString().slice(0, 10),
          dimensions: ["query"],
          rowLimit: 10,
        }),
      }
    );
    const scJson = await scRes.json();
    raw.searchConsole = scJson;
    if (scRes.ok) {
      const rows = Array.isArray(scJson.rows) ? scJson.rows : [];
      metrics.gscClicks7d = rows.reduce((s: number, r: { clicks?: number }) => s + Number(r.clicks || 0), 0);
      metrics.gscImpressions7d = rows.reduce(
        (s: number, r: { impressions?: number }) => s + Number(r.impressions || 0),
        0
      );
      metrics.gscTopQueries = rows.slice(0, 5).map((r: { keys?: string[]; clicks?: number }) => ({
        query: r.keys?.[0],
        clicks: r.clicks,
      }));
    } else {
      const msg =
        scJson?.error?.message ||
        `Search Console query failed for ${siteUrl} — confirm SEARCH_CONSOLE_SITE_URL and site ownership`;
      metrics.gscError = msg;
      setupWarnings.push(msg);
    }

    if (setupWarnings.length) {
      metrics.setupWarnings = setupWarnings;
    }

    return { metrics, raw };
  },
};

function mapGoogleToken(json: Record<string, unknown>): TokenBundle {
  const expiresIn = Number(json.expires_in || 3600);
  return {
    accessToken: String(json.access_token),
    refreshToken: json.refresh_token ? String(json.refresh_token) : null,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
    tokenType: String(json.token_type || "Bearer"),
    scopes: String(json.scope || "")
      .split(/\s+/)
      .filter(Boolean),
  };
}
