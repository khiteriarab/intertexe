/**
 * Meta Ads + TikTok Ads metrics for HQ snapshots and paid-acquisition reports.
 * Organic OAuth tokens (Instagram / Display API) are separate from ads spend APIs.
 */

export type AdsPeriodMetrics = {
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
  reach: number | null;
  cpc: number | null;
  cpm: number | null;
  ctr: number | null;
};

export type AdsCampaignRow = {
  campaign: string;
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
};

export type ParsedAdsSnapshot = {
  connected: boolean;
  apiSurface: string | null;
  syncedAt: string | null;
  error: string | null;
  today: AdsPeriodMetrics;
  last7d: AdsPeriodMetrics;
  last30d: AdsPeriodMetrics;
  campaigns: AdsCampaignRow[];
};

const EMPTY_PERIOD: AdsPeriodMetrics = {
  spend: null,
  impressions: null,
  clicks: null,
  reach: null,
  cpc: null,
  cpm: null,
  ctr: null,
};

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function sumInsightRows(rows: Array<Record<string, unknown>>): AdsPeriodMetrics {
  if (!rows.length) return { ...EMPTY_PERIOD };
  let spend = 0;
  let impressions = 0;
  let clicks = 0;
  let reach = 0;
  let hasSpend = false;
  let hasImpressions = false;
  let hasClicks = false;
  let hasReach = false;

  for (const row of rows) {
    const s = num(row.spend);
    const i = num(row.impressions);
    const c = num(row.clicks);
    const r = num(row.reach);
    if (s != null) {
      spend += s;
      hasSpend = true;
    }
    if (i != null) {
      impressions += i;
      hasImpressions = true;
    }
    if (c != null) {
      clicks += c;
      hasClicks = true;
    }
    if (r != null) {
      reach += r;
      hasReach = true;
    }
  }

  const out: AdsPeriodMetrics = {
    spend: hasSpend ? spend : null,
    impressions: hasImpressions ? impressions : null,
    clicks: hasClicks ? clicks : null,
    reach: hasReach ? reach : null,
    cpc: null,
    cpm: null,
    ctr: null,
  };
  if (out.clicks != null && out.clicks > 0 && out.spend != null) out.cpc = out.spend / out.clicks;
  if (out.impressions != null && out.impressions > 0 && out.spend != null) {
    out.cpm = (out.spend / out.impressions) * 1000;
  }
  if (out.impressions != null && out.impressions > 0 && out.clicks != null) {
    out.ctr = out.clicks / out.impressions;
  }
  return out;
}

function normalizeAdAccountId(raw: string | null | undefined): string | null {
  const v = (raw || "").trim();
  if (!v) return null;
  return v.startsWith("act_") ? v : `act_${v.replace(/^act_/, "")}`;
}

/** Parse ads fields stored in hq_integration_metric_snapshots.metrics by nightly sync. */
export function parseAdsSnapshotMetrics(
  provider: "meta" | "tiktok",
  metrics: Record<string, unknown> | null | undefined
): ParsedAdsSnapshot {
  const m = metrics || {};
  const apiSurface =
    typeof m.adsApiSurface === "string"
      ? m.adsApiSurface
      : provider === "meta"
        ? "meta_ads_api"
        : "tiktok_ads_api";

  const connected = Boolean(m.adsConnected);
  const pickPeriod = (prefix: string): AdsPeriodMetrics => ({
    spend: num(m[`${prefix}Spend`]),
    impressions: num(m[`${prefix}Impressions`]),
    clicks: num(m[`${prefix}Clicks`]),
    reach: num(m[`${prefix}Reach`]),
    cpc: num(m[`${prefix}Cpc`]),
    cpm: num(m[`${prefix}Cpm`]),
    ctr: num(m[`${prefix}Ctr`]),
  });

  const campaigns = Array.isArray(m.adsCampaigns)
    ? (m.adsCampaigns as AdsCampaignRow[])
    : [];

  return {
    connected,
    apiSurface: connected ? apiSurface : null,
    syncedAt: typeof m.syncedAt === "string" ? m.syncedAt : null,
    error: typeof m.adsError === "string" ? m.adsError : null,
    today: pickPeriod("adsToday"),
    last7d: pickPeriod("ads7d"),
    last30d: pickPeriod("ads30d"),
    campaigns,
  };
}

async function fetchMetaInsightsForPreset(
  adAccountId: string,
  accessToken: string,
  datePreset: string,
  level?: "campaign"
): Promise<{ rows: Array<Record<string, unknown>>; error: string | null; raw: unknown }> {
  const fields =
    level === "campaign"
      ? "campaign_name,spend,impressions,clicks,reach,cpc,cpm,ctr"
      : "spend,impressions,clicks,reach,cpc,cpm,ctr";
  const params = new URLSearchParams({
    fields,
    date_preset: datePreset,
    access_token: accessToken,
  });
  if (level) params.set("level", level);

  const res = await fetch(`https://graph.facebook.com/v21.0/${adAccountId}/insights?${params}`);
  const json = await res.json();
  if (!res.ok || json.error) {
    return {
      rows: [],
      error: String(json.error?.message || json.error || "Meta Ads insights failed"),
      raw: json,
    };
  }
  return { rows: (json.data || []) as Array<Record<string, unknown>>, error: null, raw: json };
}

/** Resolve ad account id from env or /me/adaccounts. */
export async function resolveMetaAdAccountId(
  accessToken: string,
  metadata: Record<string, unknown>
): Promise<string | null> {
  const fromEnv = normalizeAdAccountId(process.env.META_ADS_ACCOUNT_ID);
  if (fromEnv) return fromEnv;
  const fromMeta = normalizeAdAccountId(String(metadata.adAccountId || ""));
  if (fromMeta) return fromMeta;

  const res = await fetch(
    `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_id&limit=5&access_token=${encodeURIComponent(accessToken)}`
  );
  const json = await res.json();
  const first = (json.data || [])[0];
  if (first?.id) return normalizeAdAccountId(String(first.id));
  return null;
}

/** Pull Meta Ads Manager spend/impressions/clicks into snapshot metrics. */
export async function syncMetaAdsMetrics(
  accessToken: string,
  metadata: Record<string, unknown>
): Promise<{ metrics: Record<string, unknown>; raw: Record<string, unknown> }> {
  const out: Record<string, unknown> = {
    adsConnected: false,
    adsApiSurface: "meta_ads_api",
  };
  const raw: Record<string, unknown> = {};

  const adAccountId = await resolveMetaAdAccountId(accessToken, metadata);
  if (!adAccountId) {
    out.adsError =
      "Meta Ads account not configured. Set META_ADS_ACCOUNT_ID in Vercel or reconnect Meta with ads_read.";
    return { metrics: out, raw };
  }
  out.adAccountIdUsed = adAccountId;

  const [todayRes, d7Res, d30Res, campaignRes] = await Promise.all([
    fetchMetaInsightsForPreset(adAccountId, accessToken, "today"),
    fetchMetaInsightsForPreset(adAccountId, accessToken, "last_7d"),
    fetchMetaInsightsForPreset(adAccountId, accessToken, "last_30d"),
    fetchMetaInsightsForPreset(adAccountId, accessToken, "last_30d", "campaign"),
  ]);

  raw.adsToday = todayRes.raw;
  raw.ads7d = d7Res.raw;
  raw.ads30d = d30Res.raw;
  raw.adsCampaigns = campaignRes.raw;

  const err = todayRes.error || d7Res.error || d30Res.error;
  if (err && !todayRes.rows.length && !d7Res.rows.length && !d30Res.rows.length) {
    out.adsError = err.includes("ads_read")
      ? `${err} Reconnect Instagram/Meta in HQ Settings after adding ads_read scope.`
      : err;
    return { metrics: out, raw };
  }

  const today = sumInsightRows(todayRes.rows);
  const last7d = sumInsightRows(d7Res.rows);
  const last30d = sumInsightRows(d30Res.rows);

  out.adsConnected = true;
  out.adsError = err || null;
  assignPeriod(out, "adsToday", today);
  assignPeriod(out, "ads7d", last7d);
  assignPeriod(out, "ads30d", last30d);

  out.adsCampaigns = campaignRes.rows
    .map((row) => ({
      campaign: String(row.campaign_name || "(unnamed)"),
      spend: num(row.spend),
      impressions: num(row.impressions),
      clicks: num(row.clicks),
    }))
    .filter((r) => (r.spend || 0) > 0 || (r.impressions || 0) > 0 || (r.clicks || 0) > 0)
    .sort((a, b) => (b.spend || 0) - (a.spend || 0))
    .slice(0, 25);

  return { metrics: out, raw };
}

function assignPeriod(target: Record<string, unknown>, prefix: string, p: AdsPeriodMetrics) {
  target[`${prefix}Spend`] = p.spend;
  target[`${prefix}Impressions`] = p.impressions;
  target[`${prefix}Clicks`] = p.clicks;
  target[`${prefix}Reach`] = p.reach;
  target[`${prefix}Cpc`] = p.cpc;
  target[`${prefix}Cpm`] = p.cpm;
  target[`${prefix}Ctr`] = p.ctr;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** TikTok Marketing API — uses long-lived token from Ads Manager (server env). */
export async function syncTikTokAdsMetrics(): Promise<{
  metrics: Record<string, unknown>;
  raw: Record<string, unknown>;
}> {
  const out: Record<string, unknown> = {
    adsConnected: false,
    adsApiSurface: "tiktok_ads_api",
  };
  const raw: Record<string, unknown> = {};

  const accessToken = (process.env.TIKTOK_ADS_ACCESS_TOKEN || "").trim();
  const advertiserId = (process.env.TIKTOK_ADS_ADVERTISER_ID || "").trim();

  if (!accessToken || !advertiserId) {
    out.adsError =
      "Set TIKTOK_ADS_ACCESS_TOKEN and TIKTOK_ADS_ADVERTISER_ID in Vercel Production (from TikTok Ads Manager → Tools).";
    return { metrics: out, raw };
  }

  const today = new Date();
  const d7 = new Date(Date.now() - 7 * 86400000);
  const d30 = new Date(Date.now() - 30 * 86400000);

  const [todayRes, d7Res, d30Res, campaignRes] = await Promise.all([
    fetchTikTokAdsReport(accessToken, advertiserId, isoDate(today), isoDate(today)),
    fetchTikTokAdsReport(accessToken, advertiserId, isoDate(d7), isoDate(today)),
    fetchTikTokAdsReport(accessToken, advertiserId, isoDate(d30), isoDate(today)),
    fetchTikTokAdsReport(accessToken, advertiserId, isoDate(d30), isoDate(today), "campaign"),
  ]);

  raw.adsToday = todayRes.raw;
  raw.ads7d = d7Res.raw;
  raw.ads30d = d30Res.raw;
  raw.adsCampaigns = campaignRes.raw;

  if (todayRes.error && d7Res.error && d30Res.error) {
    out.adsError = todayRes.error;
    return { metrics: out, raw };
  }

  out.adsConnected = true;
  out.adsError = todayRes.error || d7Res.error || d30Res.error || null;
  out.tiktokAdvertiserIdUsed = advertiserId;
  assignPeriod(out, "adsToday", todayRes.totals);
  assignPeriod(out, "ads7d", d7Res.totals);
  assignPeriod(out, "ads30d", d30Res.totals);
  out.adsCampaigns = campaignRes.campaigns;

  return { metrics: out, raw };
}

async function fetchTikTokAdsReport(
  accessToken: string,
  advertiserId: string,
  startDate: string,
  endDate: string,
  groupBy?: "campaign"
): Promise<{
  totals: AdsPeriodMetrics;
  campaigns: AdsCampaignRow[];
  error: string | null;
  raw: unknown;
}> {
  const empty = { totals: { ...EMPTY_PERIOD }, campaigns: [] as AdsCampaignRow[], error: null, raw: null };

  const dimensions = groupBy === "campaign" ? ["campaign_id"] : ["stat_time_day"];
  const res = await fetch("https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Access-Token": accessToken,
    },
    body: JSON.stringify({
      advertiser_id: advertiserId,
      report_type: "BASIC",
      dimensions,
      metrics: ["spend", "impressions", "clicks", "cpc", "cpm", "ctr", "reach"],
      data_level: "AUCTION_ADVERTISER",
      start_date: startDate,
      end_date: endDate,
      page_size: 1000,
    }),
  });

  const json = await res.json();
  empty.raw = json;

  const code = Number(json.code);
  if (!res.ok || (Number.isFinite(code) && code !== 0)) {
    return {
      ...empty,
      error: String(json.message || json.msg || "TikTok Ads report failed"),
    };
  }

  const list = (json.data?.list || json.data?.data?.list || []) as Array<{
    dimensions?: Record<string, string>;
    metrics?: Record<string, string | number>;
  }>;

  if (groupBy === "campaign") {
    const campaigns: AdsCampaignRow[] = list
      .map((row) => {
        const m = row.metrics || {};
        const id = row.dimensions?.campaign_id || "";
        return {
          campaign: id ? `Campaign ${id}` : "(unnamed)",
          spend: num(m.spend),
          impressions: num(m.impressions),
          clicks: num(m.clicks),
        };
      })
      .filter((r) => (r.spend || 0) > 0 || (r.impressions || 0) > 0)
      .sort((a, b) => (b.spend || 0) - (a.spend || 0))
      .slice(0, 25);
    return { totals: sumTikTokRows(list), campaigns, error: null, raw: json };
  }

  return { totals: sumTikTokRows(list), campaigns: [], error: null, raw: json };
}

function sumTikTokRows(
  list: Array<{ metrics?: Record<string, string | number> }>
): AdsPeriodMetrics {
  const rows = list.map((row) => {
    const m = row.metrics || {};
    return {
      spend: m.spend,
      impressions: m.impressions,
      clicks: m.clicks,
      reach: m.reach,
      cpc: m.cpc,
      cpm: m.cpm,
      ctr: m.ctr,
    };
  });
  return sumInsightRows(rows);
}
