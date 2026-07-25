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

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

type GaRow = {
  dimensionValues?: Array<{ value?: string }>;
  metricValues?: Array<{ value?: string }>;
};

async function ga4Report(
  accessToken: string,
  propertyId: string,
  body: Record<string, unknown>,
  label: string
) {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      redirect: "manual",
    }
  );
  const json = await readGoogleJson(res, label);
  return { ok: res.ok, json };
}

async function gscQuery(
  accessToken: string,
  siteUrl: string,
  body: Record<string, unknown>,
  label: string
) {
  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      redirect: "manual",
    }
  );
  const json = await readGoogleJson(res, label);
  return { ok: res.ok, json };
}

function metricAt(row: GaRow | undefined, idx: number) {
  return Number(row?.metricValues?.[idx]?.value || 0);
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
      metadata.searchConsoleSiteUrl ||
        process.env.SEARCH_CONSOLE_SITE_URL ||
        "sc-domain:intertexe.com"
    ).trim();

    const setupWarnings: string[] = [];
    const periods = {
      today: { startDate: fmtDate(daysAgo(0)), endDate: fmtDate(daysAgo(0)) },
      trailing7d: { startDate: fmtDate(daysAgo(6)), endDate: fmtDate(daysAgo(0)) },
      prior7d: { startDate: fmtDate(daysAgo(13)), endDate: fmtDate(daysAgo(7)) },
      trailing30d: { startDate: fmtDate(daysAgo(29)), endDate: fmtDate(daysAgo(0)) },
    };

    const metrics: Record<string, unknown> = {
      syncedAt: new Date().toISOString(),
      ga4PropertyIdUsed: propertyId || null,
      searchConsoleSiteUrlUsed: siteUrl,
      periods,
      comparisonNote:
        "trailing7d vs prior7d are matching 7-day windows. Percent changes omitted when prior=0 or data incomplete.",
    };
    const raw: Record<string, unknown> = {};

    if (propertyId) {
      const totals = await ga4Report(
        accessToken,
        propertyId,
        {
          dateRanges: [
            { startDate: periods.trailing7d.startDate, endDate: periods.trailing7d.endDate },
            { startDate: periods.prior7d.startDate, endDate: periods.prior7d.endDate },
            { startDate: periods.today.startDate, endDate: periods.today.endDate },
            { startDate: periods.trailing30d.startDate, endDate: periods.trailing30d.endDate },
          ],
          metrics: [
            { name: "sessions" },
            { name: "activeUsers" },
            { name: "screenPageViews" },
            { name: "engagementRate" },
            { name: "conversions" },
          ],
        },
        `GA4 totals (properties/${propertyId})`
      );
      raw.ga4Totals = totals.json;

      if (totals.ok) {
        const rows = (totals.json.rows || []) as GaRow[];
        // With multiple dateRanges and no dimensions, GA4 returns one row with metricValues
        // duplicated per range OR separate rows — handle both via totals.json.rows + metricHeaders.
        const rangeCount = 4;
        const metricCount = 5;
        if (rows.length === 1 && (rows[0].metricValues || []).length >= rangeCount * metricCount) {
          const mv = rows[0].metricValues || [];
          const pick = (rangeIdx: number, metricIdx: number) =>
            Number(mv[rangeIdx * metricCount + metricIdx]?.value || 0);
          metrics.ga4Sessions7d = pick(0, 0);
          metrics.ga4Users7d = pick(0, 1);
          metrics.ga4PageViews7d = pick(0, 2);
          metrics.ga4EngagementRate7d = pick(0, 3);
          metrics.ga4Conversions7d = pick(0, 4);
          metrics.ga4SessionsPrev7d = pick(1, 0);
          metrics.ga4UsersPrev7d = pick(1, 1);
          metrics.ga4PageViewsPrev7d = pick(1, 2);
          metrics.ga4EngagementRatePrev7d = pick(1, 3);
          metrics.ga4ConversionsPrev7d = pick(1, 4);
          metrics.ga4SessionsToday = pick(2, 0);
          metrics.ga4UsersToday = pick(2, 1);
          metrics.ga4PageViewsToday = pick(2, 2);
          metrics.ga4Sessions30d = pick(3, 0);
          metrics.ga4Users30d = pick(3, 1);
          metrics.ga4PageViews30d = pick(3, 2);
        } else {
          // Fallback: one request per range if multi-range shape unexpected
          const windows: Array<{ key: string; range: { startDate: string; endDate: string } }> = [
            { key: "7d", range: periods.trailing7d },
            { key: "prev7d", range: periods.prior7d },
            { key: "today", range: periods.today },
            { key: "30d", range: periods.trailing30d },
          ];
          for (const w of windows) {
            const one = await ga4Report(
              accessToken,
              propertyId,
              {
                dateRanges: [w.range],
                metrics: [
                  { name: "sessions" },
                  { name: "activeUsers" },
                  { name: "screenPageViews" },
                  { name: "engagementRate" },
                  { name: "conversions" },
                ],
              },
              `GA4 ${w.key}`
            );
            raw[`ga4_${w.key}`] = one.json;
            if (!one.ok) {
              const errObj = one.json.error as { message?: string } | undefined;
              const msg = errObj?.message || `GA4 ${w.key} failed`;
              metrics.ga4Error = msg;
              setupWarnings.push(msg);
              continue;
            }
            const row = ((one.json.rows || []) as GaRow[])[0];
            const sessions = metricAt(row, 0);
            const users = metricAt(row, 1);
            const pageviews = metricAt(row, 2);
            const eng = metricAt(row, 3);
            const conv = metricAt(row, 4);
            if (w.key === "7d") {
              metrics.ga4Sessions7d = sessions;
              metrics.ga4Users7d = users;
              metrics.ga4PageViews7d = pageviews;
              metrics.ga4EngagementRate7d = eng;
              metrics.ga4Conversions7d = conv;
            } else if (w.key === "prev7d") {
              metrics.ga4SessionsPrev7d = sessions;
              metrics.ga4UsersPrev7d = users;
              metrics.ga4PageViewsPrev7d = pageviews;
              metrics.ga4EngagementRatePrev7d = eng;
              metrics.ga4ConversionsPrev7d = conv;
            } else if (w.key === "today") {
              metrics.ga4SessionsToday = sessions;
              metrics.ga4UsersToday = users;
              metrics.ga4PageViewsToday = pageviews;
            } else {
              metrics.ga4Sessions30d = sessions;
              metrics.ga4Users30d = users;
              metrics.ga4PageViews30d = pageviews;
            }
          }
        }
      } else {
        // Retry without engagementRate/conversions — some properties lack those metrics.
        const basic = await ga4Report(
          accessToken,
          propertyId,
          {
            dateRanges: [
              { startDate: periods.trailing7d.startDate, endDate: periods.trailing7d.endDate },
              { startDate: periods.prior7d.startDate, endDate: periods.prior7d.endDate },
            ],
            metrics: [{ name: "sessions" }, { name: "activeUsers" }, { name: "screenPageViews" }],
          },
          `GA4 basic totals (properties/${propertyId})`
        );
        raw.ga4Basic = basic.json;
        if (basic.ok) {
          setupWarnings.push(
            "GA4 engagementRate/conversions unavailable for this property — using sessions/users/pageviews only."
          );
          const windows = [
            { key: "7d" as const, range: periods.trailing7d },
            { key: "prev7d" as const, range: periods.prior7d },
          ];
          for (const w of windows) {
            const one = await ga4Report(
              accessToken,
              propertyId,
              {
                dateRanges: [w.range],
                metrics: [{ name: "sessions" }, { name: "activeUsers" }, { name: "screenPageViews" }],
              },
              `GA4 basic ${w.key}`
            );
            const row = ((one.json.rows || []) as GaRow[])[0];
            if (w.key === "7d") {
              metrics.ga4Sessions7d = metricAt(row, 0);
              metrics.ga4Users7d = metricAt(row, 1);
              metrics.ga4PageViews7d = metricAt(row, 2);
            } else {
              metrics.ga4SessionsPrev7d = metricAt(row, 0);
              metrics.ga4UsersPrev7d = metricAt(row, 1);
              metrics.ga4PageViewsPrev7d = metricAt(row, 2);
            }
          }
        } else {
          const errObj = (totals.json.error || basic.json.error) as { message?: string } | undefined;
          const msg =
            errObj?.message ||
            `GA4 report failed for properties/${propertyId} — confirm GA4_PROPERTY_ID and account access`;
          metrics.ga4Error = msg;
          setupWarnings.push(msg);
        }
      }

      // Landing pages (trailing 7d)
      const landings = await ga4Report(
        accessToken,
        propertyId,
        {
          dateRanges: [periods.trailing7d],
          dimensions: [{ name: "landingPagePlusQueryString" }],
          metrics: [{ name: "sessions" }, { name: "activeUsers" }, { name: "engagementRate" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: 8,
        },
        `GA4 landings (properties/${propertyId})`
      );
      raw.ga4Landings = landings.json;
      if (landings.ok) {
        metrics.ga4TopLandingPages = ((landings.json.rows || []) as GaRow[]).map((r) => ({
          page: r.dimensionValues?.[0]?.value || "(not set)",
          sessions: metricAt(r, 0),
          users: metricAt(r, 1),
          engagementRate: metricAt(r, 2),
        }));
      } else {
        // Retry without engagementRate
        const landingsBasic = await ga4Report(
          accessToken,
          propertyId,
          {
            dateRanges: [periods.trailing7d],
            dimensions: [{ name: "landingPagePlusQueryString" }],
            metrics: [{ name: "sessions" }, { name: "activeUsers" }],
            orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
            limit: 8,
          },
          `GA4 landings basic`
        );
        raw.ga4LandingsBasic = landingsBasic.json;
        if (landingsBasic.ok) {
          metrics.ga4TopLandingPages = ((landingsBasic.json.rows || []) as GaRow[]).map((r) => ({
            page: r.dimensionValues?.[0]?.value || "(not set)",
            sessions: metricAt(r, 0),
            users: metricAt(r, 1),
          }));
        }
      }

      // Source / medium
      const sources = await ga4Report(
        accessToken,
        propertyId,
        {
          dateRanges: [periods.trailing7d],
          dimensions: [{ name: "sessionSourceMedium" }],
          metrics: [{ name: "sessions" }, { name: "activeUsers" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: 8,
        },
        `GA4 sources (properties/${propertyId})`
      );
      raw.ga4Sources = sources.json;
      if (sources.ok) {
        metrics.ga4TopSources = ((sources.json.rows || []) as GaRow[]).map((r) => ({
          sourceMedium: r.dimensionValues?.[0]?.value || "(not set)",
          sessions: metricAt(r, 0),
          users: metricAt(r, 1),
        }));
      }
    } else {
      const msg =
        "Setup required: set GA4_PROPERTY_ID in Vercel Production (numeric ID, e.g. 525510203)";
      metrics.ga4Note = msg;
      setupWarnings.push(msg);
    }

    if (!siteUrlConfigured) {
      setupWarnings.push(
        "SEARCH_CONSOLE_SITE_URL unset — defaulting to sc-domain:intertexe.com. Set explicitly in Vercel if needed."
      );
    }

    // Search Console: queries + pages for trailing and prior 7d
    async function scWindow(
      label: string,
      range: { startDate: string; endDate: string },
      dimension: "query" | "page"
    ) {
      return gscQuery(
        accessToken,
        siteUrl,
        {
          startDate: range.startDate,
          endDate: range.endDate,
          dimensions: [dimension],
          rowLimit: 10,
        },
        `Search Console ${dimension} ${label}`
      );
    }

    const [scQueries7d, scQueriesPrev, scPages7d, scPagesPrev] = await Promise.all([
      scWindow("7d", periods.trailing7d, "query"),
      scWindow("prev7d", periods.prior7d, "query"),
      scWindow("7d", periods.trailing7d, "page"),
      scWindow("prev7d", periods.prior7d, "page"),
    ]);
    raw.searchConsoleQueries7d = scQueries7d.json;
    raw.searchConsoleQueriesPrev7d = scQueriesPrev.json;
    raw.searchConsolePages7d = scPages7d.json;
    raw.searchConsolePagesPrev7d = scPagesPrev.json;

    function mapGscRows(json: Record<string, unknown>, keyName: "query" | "page") {
      const rows = Array.isArray(json.rows) ? json.rows : [];
      return rows.map(
        (r: {
          keys?: string[];
          clicks?: number;
          impressions?: number;
          ctr?: number;
          position?: number;
        }) => ({
          [keyName]: r.keys?.[0] || "",
          clicks: Number(r.clicks || 0),
          impressions: Number(r.impressions || 0),
          ctr: Number(r.ctr || 0),
          position: Number(r.position || 0),
        })
      );
    }

    function sumGsc(json: Record<string, unknown>) {
      const rows = Array.isArray(json.rows) ? json.rows : [];
      return {
        clicks: rows.reduce((s: number, r: { clicks?: number }) => s + Number(r.clicks || 0), 0),
        impressions: rows.reduce(
          (s: number, r: { impressions?: number }) => s + Number(r.impressions || 0),
          0
        ),
      };
    }

    if (scQueries7d.ok) {
      const mapped = mapGscRows(scQueries7d.json, "query");
      const totals = sumGsc(scQueries7d.json);
      metrics.gscClicks7d = totals.clicks;
      metrics.gscImpressions7d = totals.impressions;
      metrics.gscTopQueries = mapped.slice(0, 8);
      const ctrDenom = totals.impressions;
      metrics.gscCtr7d = ctrDenom > 0 ? totals.clicks / ctrDenom : null;
      const posRows = mapped.filter((r) => Number(r.position) > 0);
      metrics.gscAvgPosition7d = posRows.length
        ? posRows.reduce((s, r) => s + Number(r.position), 0) / posRows.length
        : null;
    } else {
      const errObj = scQueries7d.json.error as { message?: string } | undefined;
      const msg =
        errObj?.message ||
        `Search Console query failed for ${siteUrl} — confirm SEARCH_CONSOLE_SITE_URL and site ownership`;
      metrics.gscError = msg;
      setupWarnings.push(msg);
    }

    if (scQueriesPrev.ok) {
      const totals = sumGsc(scQueriesPrev.json);
      metrics.gscClicksPrev7d = totals.clicks;
      metrics.gscImpressionsPrev7d = totals.impressions;
      metrics.gscTopQueriesPrev7d = mapGscRows(scQueriesPrev.json, "query").slice(0, 8);
    }

    if (scPages7d.ok) {
      metrics.gscTopPages = mapGscRows(scPages7d.json, "page").slice(0, 8);
    }
    if (scPagesPrev.ok) {
      metrics.gscTopPagesPrev7d = mapGscRows(scPagesPrev.json, "page").slice(0, 8);
    }

    // Meaningful query changes (appear in both or surge)
    if (Array.isArray(metrics.gscTopQueries) && Array.isArray(metrics.gscTopQueriesPrev7d)) {
      const prevMap = new Map(
        (metrics.gscTopQueriesPrev7d as Array<{ query: string; clicks: number }>).map((r) => [
          r.query,
          r,
        ])
      );
      metrics.gscQueryChanges = (
        metrics.gscTopQueries as Array<{
          query: string;
          clicks: number;
          impressions: number;
          ctr: number;
          position: number;
        }>
      )
        .map((q) => {
          const prev = prevMap.get(q.query);
          return {
            query: q.query,
            clicks7d: q.clicks,
            clicksPrev7d: prev?.clicks ?? null,
            deltaClicks: prev ? q.clicks - prev.clicks : null,
          };
        })
        .filter((q) => q.deltaClicks != null && q.deltaClicks !== 0)
        .slice(0, 5);
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
