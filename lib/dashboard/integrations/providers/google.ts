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

/** Parse Google API JSON without throwing opaque DOCTYPE errors. Never logs secrets. */
async function readGoogleJson(
  res: Response,
  label: string
): Promise<Record<string, unknown>> {
  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();
  const prefix = text.slice(0, 200).replace(/\s+/g, " ").trim();
  try {
    return text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    throw new Error(
      `${label} returned non-JSON (HTTP ${res.status}, content-type=${contentType || "unknown"}). Body starts: ${prefix}`
    );
  }
}

function normalizeGa4PropertyId(raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  return v.startsWith("properties/") ? v.slice("properties/".length) : v;
}

export const googleAdapter: ProviderAdapter = {
  id: "google",

  isConfigured() {
    return Boolean(
      process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() && process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim()
    );
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
      redirect: "manual",
    });
    const json = await readGoogleJson(res, "Google token exchange");
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
      redirect: "manual",
    });
    const json = await readGoogleJson(res, "Google token refresh");
    if (!res.ok) {
      throw new Error(String(json.error_description || json.error || "Google refresh failed"));
    }
    return { ...mapGoogleToken(json), refreshToken };
  },

  async enrichAccount(accessToken: string) {
    const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
      redirect: "manual",
    });
    if (!res.ok) return {};
    const u = (await readGoogleJson(res, "Google userinfo")) as {
      email?: string;
      id?: string;
      name?: string;
    };
    return {
      accountLabel: u.email || u.name || null,
      externalAccountId: u.id || null,
    };
  },

  async syncMetrics({ accessToken, metadata }) {
    const propertyId = normalizeGa4PropertyId(
      String(metadata.ga4PropertyId || process.env.GA4_PROPERTY_ID || "")
    );
    const siteUrlConfigured = Boolean(
      String(metadata.searchConsoleSiteUrl || process.env.SEARCH_CONSOLE_SITE_URL || "").trim()
    );
    const siteUrl = String(
      metadata.searchConsoleSiteUrl || process.env.SEARCH_CONSOLE_SITE_URL || "https://www.intertexe.com/"
    ).trim();

    const setupWarnings: string[] = [];
    const metrics: Record<string, unknown> = {
      syncedAt: new Date().toISOString(),
      ga4PropertyIdUsed: propertyId || null,
      searchConsoleSiteUrlUsed: siteUrl,
    };
    const raw: Record<string, unknown> = {};

    // Discover what this connected Google account can actually access (for diagnostics).
    try {
      const summaryRes = await fetch(
        "https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          redirect: "manual",
        }
      );
      const summaryJson = await readGoogleJson(summaryRes, "GA4 accountSummaries");
      raw.ga4AccountSummaries = summaryJson;
      if (summaryRes.ok) {
        const accessible: Array<{ propertyId: string; displayName: string; property: string }> = [];
        for (const account of (summaryJson.accountSummaries as Array<Record<string, unknown>>) || []) {
          for (const prop of (account.propertySummaries as Array<Record<string, unknown>>) || []) {
            const resource = String(prop.property || "");
            const id = resource.startsWith("properties/")
              ? resource.slice("properties/".length)
              : resource;
            if (!id) continue;
            accessible.push({
              propertyId: id,
              property: resource || `properties/${id}`,
              displayName: String(prop.displayName || id),
            });
          }
        }
        metrics.ga4AccessibleProperties = accessible;
        if (propertyId && !accessible.some((p) => p.propertyId === propertyId)) {
          setupWarnings.push(
            `Connected account cannot access configured GA4_PROPERTY_ID=${propertyId}. Accessible property IDs: ${
              accessible.map((p) => `${p.propertyId} (${p.displayName})`).join(", ") || "none"
            }`
          );
        }
      }
    } catch (e) {
      metrics.ga4DiscoveryError = e instanceof Error ? e.message : String(e);
    }

    try {
      const sitesRes = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
        headers: { Authorization: `Bearer ${accessToken}` },
        redirect: "manual",
      });
      const sitesJson = await readGoogleJson(sitesRes, "Search Console sites.list");
      raw.searchConsoleSites = sitesJson;
      if (sitesRes.ok) {
        const entries = Array.isArray(sitesJson.siteEntry) ? sitesJson.siteEntry : [];
        const accessibleSites = entries.map((e: { siteUrl?: string; permissionLevel?: string }) => ({
          siteUrl: e.siteUrl,
          permissionLevel: e.permissionLevel,
        }));
        metrics.gscAccessibleSites = accessibleSites;
        const ok = accessibleSites.some(
          (s: { siteUrl?: string }) =>
            String(s.siteUrl || "").replace(/\/$/, "") === siteUrl.replace(/\/$/, "") ||
            String(s.siteUrl || "") === siteUrl
        );
        if (!ok) {
          setupWarnings.push(
            `Connected account cannot access Search Console site ${siteUrl}. Accessible sites: ${
              accessibleSites.map((s: { siteUrl?: string }) => s.siteUrl).join(", ") || "none"
            }`
          );
        }
      }
    } catch (e) {
      metrics.gscDiscoveryError = e instanceof Error ? e.message : String(e);
    }

    if (propertyId) {
      const end = new Date();
      const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      const gaUrl = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;
      const gaRes = await fetch(gaUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: fmt(start), endDate: fmt(end) }],
          metrics: [{ name: "sessions" }, { name: "activeUsers" }, { name: "screenPageViews" }],
        }),
        redirect: "manual",
      });
      const gaJson = await readGoogleJson(gaRes, `GA4 runReport (properties/${propertyId})`);
      raw.ga4 = gaJson;
      if (gaRes.ok) {
        const values =
          (gaJson as { rows?: Array<{ metricValues?: Array<{ value?: string }> }> })?.rows?.[0]
            ?.metricValues || [];
        metrics.ga4Sessions7d = Number(values[0]?.value || 0);
        metrics.ga4Users7d = Number(values[1]?.value || 0);
        metrics.ga4PageViews7d = Number(values[2]?.value || 0);
      } else {
        const errObj = gaJson.error as { message?: string } | undefined;
        const msg =
          errObj?.message ||
          `GA4 report failed for properties/${propertyId} — confirm GA4_PROPERTY_ID and that this Google account can access the property`;
        metrics.ga4Error = msg;
        setupWarnings.push(msg);
      }
    } else {
      const msg =
        "Setup required: set GA4_PROPERTY_ID in Vercel Production (numeric ID, e.g. 123456789)";
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
    const scUrl = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
    const scRes = await fetch(scUrl, {
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
      redirect: "manual",
    });
    const scJson = await readGoogleJson(scRes, `Search Console query (${siteUrl})`);
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
      const errObj = scJson.error as { message?: string } | undefined;
      const msg =
        errObj?.message ||
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
