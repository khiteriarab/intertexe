/**
 * Paid acquisition funnel — first-party truth from user_preferences + product tables.
 * Ad-platform spend/install metrics are NOT fabricated; see trackingStatus.
 */
import { getServerSupabase } from "../supabase-service-client";

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
  attributedInstalls: number | null;
  costPerInstall: number | null;
  costPerAccount: number | null;
  costPerActivated: number | null;
  roas: number | null;
  trackingNote: string;
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
  trackingNote: string
): PaidPlatformSummary {
  return {
    platform,
    label,
    ...counts,
    spend: null,
    attributedInstalls: null,
    costPerInstall: null,
    costPerAccount: null,
    costPerActivated: null,
    roas: null,
    trackingNote,
  };
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

export async function fetchPaidAcquisitionReport(): Promise<PaidAcquisitionReport> {
  const supabase = getServerSupabase();
  const generatedAt = new Date().toISOString();
  const todayFloor = startOfTodayUtc();
  const d30 = thirtyDaysAgoIso();

  const trackingStatus: PaidAcquisitionReport["trackingStatus"] = {
    tiktok: {
      click: "PARTIAL",
      install: "NOT_IMPLEMENTED",
      account: "PARTIAL",
      scan: "WORKING",
      save: "WORKING",
      affiliate_click: "WORKING",
      purchase: "PARTIAL",
    },
    meta: {
      click: "NOT_IMPLEMENTED",
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
        "Spend/install attribution requires TikTok App Events + SKAN or an MMP — not connected."
      ),
      meta: withEconomics(
        "meta",
        "Meta",
        emptyFunnel(),
        "Meta Ads / CAPI not connected. HQ Meta OAuth is organic Instagram only."
      ),
      organic: withEconomics("organic", "Organic / other", emptyFunnel(), "First-party only."),
    },
    trailing30d: {
      tiktok: withEconomics(
        "tiktok",
        "TikTok",
        emptyFunnel(),
        "Promote → App Store direct links do not pass UTMs into the app."
      ),
      meta: withEconomics("meta", "Meta", emptyFunnel(), "Connect Meta Ads + app events for paid install attribution."),
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
    if (!userIds.length) return empty;

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
            spend: null,
            ...emptyFunnel(),
          } satisfies PaidCreativeRow);
        bumpFunnel(row, meta);
        creativeMap.set(key, row);
      }
    }

    const tiktokNote =
      "HQ TikTok OAuth is Display API (organic). Promote spend/installs live in TikTok Ads Manager only.";
    const metaNote = "Meta OAuth not connected in production. No Meta Ads API or app events.";

    return {
      generatedAt,
      today: {
        tiktok: withEconomics("tiktok", "TikTok", todayBuckets.tiktok, tiktokNote),
        meta: withEconomics("meta", "Meta", todayBuckets.meta, metaNote),
        organic: withEconomics("organic", "Organic / other", todayBuckets.organic, "Non-paid first-touch."),
      },
      trailing30d: {
        tiktok: withEconomics("tiktok", "TikTok", d30Buckets.tiktok, tiktokNote),
        meta: withEconomics("meta", "Meta", d30Buckets.meta, metaNote),
      },
      creatives: [...creativeMap.values()].sort(
        (a, b) => b.accounts - a.accounts || b.activatedUsers - a.activatedUsers
      ),
      trackingStatus,
    };
  } catch (e: any) {
    return { ...empty, error: e?.message || "paid_acquisition_failed" };
  }
}
