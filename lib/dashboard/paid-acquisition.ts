/**
 * Paid acquisition funnel — first-party truth from user_preferences + product tables.
 * Ad-platform spend/impressions/clicks come from hq_integration_metric_snapshots (nightly sync).
 */
import { getServerSupabase } from "../supabase-service-client";
import {
  parseAdsSnapshotMetrics,
  type ParsedAdsSnapshot,
} from "./integrations/ads-platform-metrics";

export type PaidPlatformId = "tiktok" | "meta" | "google" | "other_paid" | "organic" | "unknown";

export type TrackingComponentStatus =
  | "WORKING"
  | "PARTIAL"
  | "NOT_IMPLEMENTED"
  | "NEEDS_EXTERNAL_CONFIG";

export type UserAttributionRow = {
  userId: string;
  registeredAt: string | null;
  firstTouchAt: string | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  ttclid: string | null;
  fbclid: string | null;
  gclid: string | null;
  platform: string | null;
};

export type PaidFunnelCounts = {
  accounts: number;
  firstScans: number;
  activatedUsers: number;
  favorites: number;
  affiliateClicks: number;
  purchasers: number;
  revenue: number;
  commission: number;
};

export type PaidPlatformSummary = PaidFunnelCounts & {
  platform: PaidPlatformId;
  label: string;
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
  reach: number | null;
  attributedInstalls: number | null;
  costPerInstall: number | null;
  costPerAccount: number | null;
  costPerActivated: number | null;
  roas: number | null;
  trackingNote: string;
  adsConnected: boolean;
  adsError: string | null;
};

export type PaidCreativeRow = PaidFunnelCounts & {
  platform: "tiktok" | "meta";
  campaign: string;
  creative: string;
  spend: number | null;
};

export type PaidAcquisitionReport = {
  generatedAt: string;
  today: {
    tiktok: PaidPlatformSummary;
    meta: PaidPlatformSummary;
    organic: PaidPlatformSummary;
  };
  trailing30d: {
    tiktok: PaidPlatformSummary;
    meta: PaidPlatformSummary;
  };
  creatives: PaidCreativeRow[];
  trackingStatus: {
    tiktok: Record<string, TrackingComponentStatus>;
    meta: Record<string, TrackingComponentStatus>;
    intertexe: Record<string, TrackingComponentStatus>;
  };
  error?: string;
};

const TIKTOK_SOURCE = /tiktok|tt_ads|tiktokads/i;
const META_SOURCE = /facebook|meta|instagram|fb_ads|ig_ads/i;
const GOOGLE_SOURCE = /google|gads|adwords|youtube/i;

export function classifyPaidPlatform(row: {
  first_touch_source?: string | null;
  first_touch_medium?: string | null;
  ttclid?: string | null;
  fbclid?: string | null;
  gclid?: string | null;
}): PaidPlatformId {
  const source = (row.first_touch_source || "").trim().toLowerCase();
  const medium = (row.first_touch_medium || "").trim().toLowerCase();
  const isPaidMedium = medium === "paid" || medium === "cpc" || medium === "ppc" || medium.includes("ads");

  if (row.ttclid || TIKTOK_SOURCE.test(source)) return "tiktok";
  if (row.fbclid || META_SOURCE.test(source)) return "meta";
  if (row.gclid || GOOGLE_SOURCE.test(source)) return "google";

  if (isPaidMedium && source) {
    if (TIKTOK_SOURCE.test(source)) return "tiktok";
    if (META_SOURCE.test(source)) return "meta";
    if (GOOGLE_SOURCE.test(source)) return "google";
    return "other_paid";
  }

  if (source && source !== "unknown") return "organic";
  return "unknown";
}

export function creativeKey(row: UserAttributionRow): { campaign: string; creative: string } {
  return {
    campaign: (row.campaign || "").trim() || "(no campaign)",
    creative: (row.content || "").trim() || "(no creative tag)",
  };
}

function emptyFunnel(): PaidFunnelCounts {
  return {
    accounts: 0,
    firstScans: 0,
    activatedUsers: 0,
    favorites: 0,
    affiliateClicks: 0,
    purchasers: 0,
    revenue: 0,
    commission: 0,
  };
}

function bumpFunnel(
  bucket: PaidFunnelCounts,
  meta: {
    hasScan: boolean;
    favCount: number;
    clickCount: number;
    purchased: boolean;
    sales: number;
    commission: number;
  }
) {
  bucket.accounts += 1;
  if (meta.hasScan) {
    bucket.firstScans += 1;
    bucket.activatedUsers += 1;
  }
  bucket.favorites += meta.favCount;
  bucket.affiliateClicks += meta.clickCount;
  if (meta.purchased) {
    bucket.purchasers += 1;
    bucket.revenue += meta.sales;
    bucket.commission += meta.commission;
  }
}

function withEconomics(
  platform: PaidPlatformId,
  label: string,
  counts: PaidFunnelCounts,
  ads: ParsedAdsSnapshot | null,
  trackingNote: string
): PaidPlatformSummary {
  const period = ads?.today.spend != null ? ads.today : ads?.last7d || ads?.last30d || null;
  const spend = period?.spend ?? null;
  const impressions = period?.impressions ?? null;
  const clicks = period?.clicks ?? null;
  const reach = period?.reach ?? null;

  return {
    platform,
    label,
    ...counts,
    spend,
    impressions,
    clicks,
    reach,
    attributedInstalls: null,
    costPerInstall: null,
    costPerAccount: spend != null && counts.accounts > 0 ? spend / counts.accounts : null,
    costPerActivated:
      spend != null && counts.activatedUsers > 0 ? spend / counts.activatedUsers : null,
    roas: spend != null && spend > 0 && counts.commission > 0 ? counts.commission / spend : null,
    trackingNote,
    adsConnected: Boolean(ads?.connected),
    adsError: ads?.error || null,
  };
}

async function fetchAdsSnapshots(
  workspaceId: string | null | undefined
): Promise<{ meta: ParsedAdsSnapshot | null; tiktok: ParsedAdsSnapshot | null }> {
  if (!workspaceId) return { meta: null, tiktok: null };
  const supabase = getServerSupabase();
  if (!supabase) return { meta: null, tiktok: null };

  const { data } = await supabase
    .from("hq_integration_metric_snapshots")
    .select("provider, metrics, metric_date, created_at")
    .eq("workspace_id", workspaceId)
    .in("provider", ["meta", "tiktok"])
    .order("metric_date", { ascending: false })
    .limit(10);

  const latestMeta = (data || []).find((r) => r.provider === "meta");
  const latestTiktok = (data || []).find((r) => r.provider === "tiktok");

  return {
    meta: latestMeta
      ? parseAdsSnapshotMetrics("meta", latestMeta.metrics as Record<string, unknown>)
      : null,
    tiktok: latestTiktok
      ? parseAdsSnapshotMetrics("tiktok", latestTiktok.metrics as Record<string, unknown>)
      : null,
  };
}

function adsTrackingNote(platform: "meta" | "tiktok", ads: ParsedAdsSnapshot | null): string {
  if (ads?.connected) {
    const p = ads.today.spend != null ? ads.today : ads.last7d;
    const parts: string[] = [];
    if (p.spend != null) parts.push(`Spend synced from ${platform === "meta" ? "Meta Ads" : "TikTok Ads"}.`);
    if (p.impressions != null) parts.push(`${p.impressions.toLocaleString()} impressions in window.`);
    parts.push("Account/scan/revenue rows are first-party INTERTEXE only.");
    return parts.join(" ");
  }
  if (ads?.error) return ads.error;
  if (platform === "meta") {
    return "Connect Meta in Settings → Integrations, set META_ADS_ACCOUNT_ID, and reconnect for ads_read.";
  }
  return "Set TIKTOK_ADS_ACCESS_TOKEN + TIKTOK_ADS_ADVERTISER_ID in Vercel, then Sync Now on TikTok.";
}

function isOnOrAfter(iso: string | null | undefined, floorIso: string): boolean {
  if (!iso) return false;
  return iso >= floorIso;
}

function startOfTodayUtc(): string {
  const d = new Date();
  return `${d.toISOString().slice(0, 10)}T00:00:00.000Z`;
}

function thirtyDaysAgoIso(): string {
  return new Date(Date.now() - 30 * 86400000).toISOString();
}

export async function fetchPaidAcquisitionReport(
  workspaceId?: string | null
): Promise<PaidAcquisitionReport> {
  const supabase = getServerSupabase();
  const generatedAt = new Date().toISOString();
  const todayFloor = startOfTodayUtc();
  const d30 = thirtyDaysAgoIso();
  const adsSnapshots = await fetchAdsSnapshots(workspaceId);

  const trackingStatus: PaidAcquisitionReport["trackingStatus"] = {
    tiktok: {
      click: adsSnapshots.tiktok?.connected ? "WORKING" : "PARTIAL",
      install: "NOT_IMPLEMENTED",
      account: "PARTIAL",
      scan: "WORKING",
      save: "WORKING",
      affiliate_click: "WORKING",
      purchase: "PARTIAL",
    },
    meta: {
      click: adsSnapshots.meta?.connected ? "WORKING" : "NOT_IMPLEMENTED",
      install: "NOT_IMPLEMENTED",
      account: "PARTIAL",
      scan: "WORKING",
      save: "WORKING",
      affiliate_click: "WORKING",
      purchase: "PARTIAL",
    },
    intertexe: {
      click: "PARTIAL",
      install: "NOT_IMPLEMENTED",
      account: "PARTIAL",
      scan: "WORKING",
      save: "WORKING",
      affiliate_click: "WORKING",
      purchase: "PARTIAL",
    },
  };

  const empty: PaidAcquisitionReport = {
    generatedAt,
    today: {
      tiktok: withEconomics(
        "tiktok",
        "TikTok",
        emptyFunnel(),
        adsSnapshots.tiktok,
        adsTrackingNote("tiktok", adsSnapshots.tiktok)
      ),
      meta: withEconomics(
        "meta",
        "Meta",
        emptyFunnel(),
        adsSnapshots.meta,
        adsTrackingNote("meta", adsSnapshots.meta)
      ),
      organic: withEconomics("organic", "Organic / other", emptyFunnel(), null, "First-party only."),
    },
    trailing30d: {
      tiktok: withEconomics(
        "tiktok",
        "TikTok",
        emptyFunnel(),
        adsSnapshots.tiktok
          ? {
              ...adsSnapshots.tiktok,
              today: adsSnapshots.tiktok.last30d,
            }
          : null,
        adsTrackingNote("tiktok", adsSnapshots.tiktok)
      ),
      meta: withEconomics(
        "meta",
        "Meta",
        emptyFunnel(),
        adsSnapshots.meta
          ? {
              ...adsSnapshots.meta,
              today: adsSnapshots.meta.last30d,
            }
          : null,
        adsTrackingNote("meta", adsSnapshots.meta)
      ),
    },
    creatives: [],
    trackingStatus,
  };

  if (!supabase) return { ...empty, error: "supabase_unavailable" };

  try {
    const { data: usersRaw, error: usersErr } = await supabase
      .from("user_preferences")
      .select(
        `user_id, first_touch_at,
         first_touch_source, first_touch_medium, first_touch_campaign, first_touch_content,
         ttclid, fbclid, gclid, acquisition_platform`
      )
      .limit(10000);

    if (usersErr?.message?.includes("first_touch_source") || usersErr?.code === "42703") {
      return { ...empty, error: "attribution_columns_missing" };
    }
    if (usersErr) return { ...empty, error: usersErr.message };

    const users: UserAttributionRow[] = (usersRaw || []).map((u: any) => ({
      userId: String(u.user_id),
      registeredAt: u.first_touch_at || null,
      firstTouchAt: u.first_touch_at || null,
      source: u.first_touch_source || null,
      medium: u.first_touch_medium || null,
      campaign: u.first_touch_campaign || null,
      content: u.first_touch_content || null,
      ttclid: u.ttclid || null,
      fbclid: u.fbclid || null,
      gclid: u.gclid || null,
      platform: u.acquisition_platform || null,
    }));

    const userIds = users.map((u) => u.userId).filter(Boolean);

    const creativeSpend = new Map<string, number>();
    for (const row of adsSnapshots.meta?.campaigns || []) {
      creativeSpend.set(`meta::${row.campaign}`, row.spend || 0);
    }
    for (const row of adsSnapshots.tiktok?.campaigns || []) {
      creativeSpend.set(`tiktok::${row.campaign}`, row.spend || 0);
    }

    if (!userIds.length) {
      return {
        ...empty,
        creatives: Array.from(creativeSpend.entries()).map(([key, spend]) => {
          const [platform, campaign] = key.split("::");
          return {
            platform: platform as "meta" | "tiktok",
            campaign,
            creative: "(platform)",
            spend,
            ...emptyFunnel(),
          };
        }),
      };
    }

    const [scansRes, favsRes, shopClicks, scannerClicks, editorialClicks, txRes] = await Promise.all([
      supabase.from("scan_history").select("user_id").in("user_id", userIds).limit(50000),
      supabase.from("product_favorites").select("user_id").in("user_id", userIds).limit(50000),
      supabase.from("user_product_clickouts").select("user_id").in("user_id", userIds).limit(50000),
      supabase.from("scanner_clickouts").select("user_id").in("user_id", userIds).limit(50000),
      supabase.from("editorial_clickouts").select("user_id").in("user_id", userIds).limit(50000),
      supabase
        .from("hq_affiliate_transactions")
        .select("u1, sales_amount, commission_amount, status, raw")
        .not("u1", "is", null)
        .limit(10000),
    ]);

    const scanUsers = new Set<string>();
    for (const r of scansRes.data || []) {
      const uid = String((r as any).user_id || "");
      if (uid) scanUsers.add(uid);
    }

    const favCountByUser = new Map<string, number>();
    for (const r of favsRes.data || []) {
      const uid = String((r as any).user_id || "");
      if (!uid) continue;
      favCountByUser.set(uid, (favCountByUser.get(uid) || 0) + 1);
    }

    const clickCountByUser = new Map<string, number>();
    for (const rows of [shopClicks.data, scannerClicks.data, editorialClicks.data]) {
      for (const r of rows || []) {
        const uid = String((r as any).user_id || "");
        if (!uid) continue;
        clickCountByUser.set(uid, (clickCountByUser.get(uid) || 0) + 1);
      }
    }

    type TxAgg = { sales: number; commission: number; count: number };
    const txByUser = new Map<string, TxAgg>();
    for (const row of txRes.data || []) {
      const st = String((row as any).status || "").toLowerCase();
      if (st === "demo") continue;
      if ((row as any).raw && typeof (row as any).raw === "object" && (row as any).raw.demo) continue;
      const uid = String((row as any).u1 || "").trim();
      if (!uid) continue;
      const cur = txByUser.get(uid) || { sales: 0, commission: 0, count: 0 };
      cur.sales += Number((row as any).sales_amount) || 0;
      cur.commission += Number((row as any).commission_amount) || 0;
      cur.count += 1;
      txByUser.set(uid, cur);
    }

    const todayBuckets = {
      tiktok: emptyFunnel(),
      meta: emptyFunnel(),
      organic: emptyFunnel(),
    };
    const d30Buckets = {
      tiktok: emptyFunnel(),
      meta: emptyFunnel(),
    };
    const creativeMap = new Map<string, PaidCreativeRow>();

    for (const u of users) {
      const channel = classifyPaidPlatform(u);
      const regAt = u.firstTouchAt || u.registeredAt;
      const tx = txByUser.get(u.userId);
      const meta = {
        hasScan: scanUsers.has(u.userId),
        favCount: favCountByUser.get(u.userId) || 0,
        clickCount: clickCountByUser.get(u.userId) || 0,
        purchased: Boolean(tx && tx.count > 0),
        sales: tx?.sales || 0,
        commission: tx?.commission || 0,
      };

      if (isOnOrAfter(regAt, todayFloor)) {
        if (channel === "tiktok") bumpFunnel(todayBuckets.tiktok, meta);
        else if (channel === "meta") bumpFunnel(todayBuckets.meta, meta);
        else bumpFunnel(todayBuckets.organic, meta);
      }

      if (isOnOrAfter(regAt, d30)) {
        if (channel === "tiktok") bumpFunnel(d30Buckets.tiktok, meta);
        else if (channel === "meta") bumpFunnel(d30Buckets.meta, meta);
      }

      if (channel === "tiktok" || channel === "meta") {
        const { campaign, creative } = creativeKey(u);
        const key = `${channel}::${campaign}::${creative}`;
        const row =
          creativeMap.get(key) ||
          ({
            platform: channel,
            campaign,
            creative,
            spend: creativeSpend.get(`${channel}::${campaign}`) ?? null,
            ...emptyFunnel(),
          } satisfies PaidCreativeRow);
        bumpFunnel(row, meta);
        creativeMap.set(key, row);
      }
    }

    return {
      generatedAt,
      today: {
        tiktok: withEconomics(
          "tiktok",
          "TikTok",
          todayBuckets.tiktok,
          adsSnapshots.tiktok,
          adsTrackingNote("tiktok", adsSnapshots.tiktok)
        ),
        meta: withEconomics(
          "meta",
          "Meta",
          todayBuckets.meta,
          adsSnapshots.meta,
          adsTrackingNote("meta", adsSnapshots.meta)
        ),
        organic: withEconomics(
          "organic",
          "Organic / other",
          todayBuckets.organic,
          null,
          "Non-paid first-touch."
        ),
      },
      trailing30d: {
        tiktok: withEconomics(
          "tiktok",
          "TikTok",
          d30Buckets.tiktok,
          adsSnapshots.tiktok
            ? { ...adsSnapshots.tiktok, today: adsSnapshots.tiktok.last30d }
            : null,
          adsTrackingNote("tiktok", adsSnapshots.tiktok)
        ),
        meta: withEconomics(
          "meta",
          "Meta",
          d30Buckets.meta,
          adsSnapshots.meta
            ? { ...adsSnapshots.meta, today: adsSnapshots.meta.last30d }
            : null,
          adsTrackingNote("meta", adsSnapshots.meta)
        ),
      },
      creatives: Array.from(creativeMap.values()).sort(
        (a, b) => (b.spend || 0) - (a.spend || 0) || b.accounts - a.accounts
      ),
      trackingStatus,
    };
  } catch (e: any) {
    return { ...empty, error: e?.message || "paid_acquisition_failed" };
  }
}
