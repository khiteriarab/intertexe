/**
 * First-touch acquisition reports + customer journey timeline.
 * Never fabricates attribution — missing first-touch → "Unknown".
 */
import { getServerSupabase } from "../supabase-service-client";
import { displayAcquisitionSource } from "./attribution";

export type TimelineStep = {
  key: string;
  label: string;
  at: string | null;
  detail?: string | null;
  status: "done" | "pending" | "unknown";
};

export type ConsumerProfile = {
  userId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  country: string | null;
  registeredAt: string | null;
  acquisitionSource: string;
  firstTouch: {
    source: string | null;
    medium: string | null;
    campaign: string | null;
    content: string | null;
    term: string | null;
    referrer: string | null;
    landingPage: string | null;
    sessionId: string | null;
    gaClientId: string | null;
    gclid: string | null;
    ttclid: string | null;
    fbclid: string | null;
    msclkid: string | null;
    at: string | null;
    platform: string | null;
    extra: Record<string, unknown>;
  };
  counts: {
    scans: number;
    favorites: number;
    clickouts: number;
    purchases: number;
  };
  revenue: {
    sales: number;
    commission: number;
  };
  timeline: TimelineStep[];
  error?: string;
};

export type AcquisitionBucket = {
  key: string;
  label: string;
  customers: number;
  purchasers: number;
  sales: number;
  commission: number;
  avgOrder: number | null;
  avgDaysToPurchase: number | null;
  avgScansBeforePurchase: number | null;
  avgFavoritesBeforePurchase: number | null;
  lifetimeValue: number | null;
};

export type AcquisitionReport = {
  bySource: AcquisitionBucket[];
  byCampaign: AcquisitionBucket[];
  byLandingPage: AcquisitionBucket[];
  byInfluencer: AcquisitionBucket[];
  byQrCode: AcquisitionBucket[];
  totals: {
    customers: number;
    withAttribution: number;
    unknown: number;
    purchasers: number;
    sales: number;
    commission: number;
  };
  error?: string;
};

function moneyAvg(sales: number, n: number): number | null {
  if (!n) return null;
  return sales / n;
}

function avg(nums: number[]): number | null {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function daysBetween(a: string | null | undefined, b: string | null | undefined): number | null {
  if (!a || !b) return null;
  const t0 = Date.parse(a);
  const t1 = Date.parse(b);
  if (!Number.isFinite(t0) || !Number.isFinite(t1) || t1 < t0) return null;
  return (t1 - t0) / (1000 * 60 * 60 * 24);
}

function bucketKey(raw: string | null | undefined, fallback = "Unknown"): string {
  const t = (raw || "").trim();
  return t || fallback;
}

function emptyBucket(key: string, label?: string): AcquisitionBucket {
  return {
    key,
    label: label || key,
    customers: 0,
    purchasers: 0,
    sales: 0,
    commission: 0,
    avgOrder: null,
    avgDaysToPurchase: null,
    avgScansBeforePurchase: null,
    avgFavoritesBeforePurchase: null,
    lifetimeValue: null,
  };
}

function finalizeBuckets(map: Map<string, AcquisitionBucket & { _days: number[]; _scans: number[]; _favs: number[] }>) {
  return [...map.values()]
    .map((b) => {
      const { _days, _scans, _favs, ...rest } = b;
      return {
        ...rest,
        avgOrder: moneyAvg(rest.sales, rest.purchasers),
        avgDaysToPurchase: avg(_days),
        avgScansBeforePurchase: avg(_scans),
        avgFavoritesBeforePurchase: avg(_favs),
        lifetimeValue: moneyAvg(rest.sales, rest.customers),
      };
    })
    .sort((a, b) => b.sales - a.sales || b.customers - a.customers);
}

export async function fetchHqConsumerProfile(userId: string): Promise<ConsumerProfile> {
  const supabase = getServerSupabase();
  const empty: ConsumerProfile = {
    userId,
    email: null,
    firstName: null,
    lastName: null,
    country: null,
    registeredAt: null,
    acquisitionSource: "Unknown",
    firstTouch: {
      source: null,
      medium: null,
      campaign: null,
      content: null,
      term: null,
      referrer: null,
      landingPage: null,
      sessionId: null,
      gaClientId: null,
      gclid: null,
      ttclid: null,
      fbclid: null,
      msclkid: null,
      at: null,
      platform: null,
      extra: {},
    },
    counts: { scans: 0, favorites: 0, clickouts: 0, purchases: 0 },
    revenue: { sales: 0, commission: 0 },
    timeline: [],
  };

  if (!supabase) return { ...empty, error: "supabase_unavailable" };

  try {
    let pref: any = null;
    {
      const withAttr = await supabase
        .from("user_preferences")
        .select(
          `user_id, email, first_name, last_name, country_code, created_at, updated_at,
           first_touch_source, first_touch_medium, first_touch_campaign, first_touch_content, first_touch_term,
           first_referrer, first_landing_page, first_session_id, ga_client_id,
           gclid, ttclid, fbclid, msclkid, first_touch_at, acquisition_platform, attribution_extra`
        )
        .eq("user_id", userId)
        .maybeSingle();
      if (withAttr.error?.message?.includes("first_touch_source") || withAttr.error?.code === "42703") {
        const fallback = await supabase
          .from("user_preferences")
          .select("user_id, email, first_name, last_name, country_code, created_at, updated_at")
          .eq("user_id", userId)
          .maybeSingle();
        if (fallback.error) return { ...empty, error: fallback.error.message };
        pref = fallback.data;
      } else if (withAttr.error) {
        return { ...empty, error: withAttr.error.message };
      } else {
        pref = withAttr.data;
      }
    }

    if (!pref) return { ...empty, error: "consumer_not_found" };

    const [
      scansRes,
      favsRes,
      shopClicks,
      scannerClicks,
      editorialClicks,
      eventsRes,
      txRes,
    ] = await Promise.all([
      supabase
        .from("scan_history")
        .select("id, scanned_at, brand, product_name, scan_source")
        .eq("user_id", userId)
        .order("scanned_at", { ascending: true })
        .limit(200),
      supabase
        .from("product_favorites")
        .select("id, created_at, product_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(200),
      supabase
        .from("user_product_clickouts")
        .select("id, clicked_at, product_id")
        .eq("user_id", userId)
        .order("clicked_at", { ascending: true })
        .limit(100),
      supabase
        .from("scanner_clickouts")
        .select("id, clicked_at, product_id, brand_slug")
        .eq("user_id", userId)
        .order("clicked_at", { ascending: true })
        .limit(100),
      supabase
        .from("editorial_clickouts")
        .select("id, clicked_at, product_id")
        .eq("user_id", userId)
        .order("clicked_at", { ascending: true })
        .limit(100),
      supabase
        .from("hq_customer_events")
        .select("event_name, event_category, event_timestamp, source, metadata")
        .eq("customer_id", userId)
        .order("event_timestamp", { ascending: true })
        .limit(100),
      supabase
        .from("hq_affiliate_transactions")
        .select(
          "id, transaction_date, advertiser_name, sales_amount, commission_amount, product_name, sku, u1, status"
        )
        .eq("u1", userId)
        .order("transaction_date", { ascending: true })
        .limit(50),
    ]);

    const scans = scansRes.data || [];
    const favs = favsRes.data || [];
    const clicks = [
      ...(shopClicks.data || []).map((c: any) => ({ ...c, kind: "shop" })),
      ...(scannerClicks.data || []).map((c: any) => ({ ...c, kind: "scanner" })),
      ...(editorialClicks.data || []).map((c: any) => ({ ...c, kind: "editorial" })),
    ].sort((a, b) => String(a.clicked_at || "").localeCompare(String(b.clicked_at || "")));
    const txs = (txRes.data || []).filter((t: any) => {
      const st = String(t.status || "").toLowerCase();
      return st !== "demo" && !(t.raw && typeof t.raw === "object" && (t.raw as any).demo);
    });

    const firstTouch = {
      source: pref.first_touch_source || null,
      medium: pref.first_touch_medium || null,
      campaign: pref.first_touch_campaign || null,
      content: pref.first_touch_content || null,
      term: pref.first_touch_term || null,
      referrer: pref.first_referrer || null,
      landingPage: pref.first_landing_page || null,
      sessionId: pref.first_session_id || null,
      gaClientId: pref.ga_client_id || null,
      gclid: pref.gclid || null,
      ttclid: pref.ttclid || null,
      fbclid: pref.fbclid || null,
      msclkid: pref.msclkid || null,
      at: pref.first_touch_at || null,
      platform: pref.acquisition_platform || null,
      extra: (pref.attribution_extra as Record<string, unknown>) || {},
    };

    const acquisitionSource = displayAcquisitionSource({
      first_touch_source: firstTouch.source,
      first_touch_medium: firstTouch.medium,
      first_touch_campaign: firstTouch.campaign,
    });

    const registeredAt = pref.first_touch_at || pref.created_at || pref.updated_at || null;
    const sourceLabel = firstTouch.source
      ? firstTouch.source.charAt(0).toUpperCase() + firstTouch.source.slice(1)
      : acquisitionSource === "Unknown"
        ? "Unknown source"
        : acquisitionSource;

    const timeline: TimelineStep[] = [
      {
        key: "source",
        label: sourceLabel,
        at: firstTouch.at || registeredAt,
        detail: firstTouch.campaign
          ? `Campaign: ${firstTouch.campaign}`
          : firstTouch.referrer
            ? `Referrer: ${firstTouch.referrer}`
            : acquisitionSource === "Unknown"
              ? "No first-touch captured at registration"
              : null,
        status: firstTouch.source || firstTouch.referrer || firstTouch.landingPage ? "done" : "unknown",
      },
      {
        key: "landing",
        label: "Landing page",
        at: firstTouch.at || registeredAt,
        detail: firstTouch.landingPage || null,
        status: firstTouch.landingPage ? "done" : "unknown",
      },
      {
        key: "registration",
        label: "Registration",
        at: registeredAt,
        detail: firstTouch.platform ? `via ${firstTouch.platform}` : null,
        status: registeredAt ? "done" : "pending",
      },
      {
        key: "first_scan",
        label: "First scan",
        at: scans[0]?.scanned_at || null,
        detail: scans[0]
          ? [scans[0].brand, scans[0].product_name].filter(Boolean).join(" · ") || scans[0].scan_source
          : null,
        status: scans[0] ? "done" : "pending",
      },
      {
        key: "first_favorite",
        label: "First favorite",
        at: favs[0]?.created_at || null,
        detail: favs[0]?.product_id ? `Product ${favs[0].product_id}` : null,
        status: favs[0] ? "done" : "pending",
      },
      {
        key: "affiliate_click",
        label: "Affiliate click",
        at: clicks[0]?.clicked_at || null,
        detail: clicks[0]
          ? `${clicks[0].kind}${clicks[0].product_id ? ` · ${clicks[0].product_id}` : ""}`
          : null,
        status: clicks[0] ? "done" : "pending",
      },
      {
        key: "purchase",
        label: "Rakuten purchase",
        at: txs[0]?.transaction_date || null,
        detail: txs[0]
          ? [
              txs[0].advertiser_name,
              txs[0].sales_amount != null
                ? `$${Number(txs[0].sales_amount).toFixed(2)}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")
          : "Linked only when Rakuten u1 matches this user id",
        status: txs[0] ? "done" : "pending",
      },
    ];

    // Append notable later events chronologically (post-registration touches)
    for (const ev of eventsRes.data || []) {
      const name = String((ev as any).event_name || "");
      if (!name || name === "signup") continue;
      timeline.push({
        key: `event_${name}_${(ev as any).event_timestamp}`,
        label: name.replace(/_/g, " "),
        at: (ev as any).event_timestamp || null,
        detail: (ev as any).source || null,
        status: "done",
      });
    }

    const sales = txs.reduce((s: number, t: any) => s + (Number(t.sales_amount) || 0), 0);
    const commission = txs.reduce((s: number, t: any) => s + (Number(t.commission_amount) || 0), 0);

    return {
      userId,
      email: pref.email || null,
      firstName: pref.first_name || null,
      lastName: pref.last_name || null,
      country: pref.country_code || null,
      registeredAt,
      acquisitionSource,
      firstTouch,
      counts: {
        scans: scans.length,
        favorites: favs.length,
        clickouts: clicks.length,
        purchases: txs.length,
      },
      revenue: { sales, commission },
      timeline: timeline.sort((a, b) => {
        if (!a.at && !b.at) return 0;
        if (!a.at) return 1;
        if (!b.at) return -1;
        return String(a.at).localeCompare(String(b.at));
      }),
    };
  } catch (e: any) {
    return { ...empty, error: e?.message || "profile_failed" };
  }
}

export async function fetchHqAcquisitionReport(): Promise<AcquisitionReport> {
  const supabase = getServerSupabase();
  const empty: AcquisitionReport = {
    bySource: [],
    byCampaign: [],
    byLandingPage: [],
    byInfluencer: [],
    byQrCode: [],
    totals: {
      customers: 0,
      withAttribution: 0,
      unknown: 0,
      purchasers: 0,
      sales: 0,
      commission: 0,
    },
  };
  if (!supabase) return { ...empty, error: "supabase_unavailable" };

  try {
    let users: any[] = [];
    {
      const withAttr = await supabase
        .from("user_preferences")
        .select(
          `user_id, first_touch_source, first_touch_medium, first_touch_campaign, first_touch_content,
           first_landing_page, first_touch_at, created_at, attribution_extra`
        )
        .limit(5000);
      if (withAttr.error?.message?.includes("first_touch_source") || withAttr.error?.code === "42703") {
        const fallback = await supabase
          .from("user_preferences")
          .select("user_id, created_at")
          .limit(5000);
        if (fallback.error) return { ...empty, error: fallback.error.message };
        users = fallback.data || [];
      } else if (withAttr.error) {
        return { ...empty, error: withAttr.error.message };
      } else {
        users = withAttr.data || [];
      }
    }
    const userIds = users.map((u: any) => String(u.user_id)).filter(Boolean);

    const [scansRes, favsRes, txRes] = await Promise.all([
      userIds.length
        ? supabase.from("scan_history").select("user_id, scanned_at").in("user_id", userIds).limit(20000)
        : Promise.resolve({ data: [] as any[] }),
      userIds.length
        ? supabase.from("product_favorites").select("user_id, created_at").in("user_id", userIds).limit(20000)
        : Promise.resolve({ data: [] as any[] }),
      supabase
        .from("hq_affiliate_transactions")
        .select("u1, sales_amount, commission_amount, transaction_date, status, raw")
        .not("u1", "is", null)
        .limit(5000),
    ]);

    const scansByUser = new Map<string, string[]>();
    for (const row of scansRes.data || []) {
      const uid = String((row as any).user_id || "");
      if (!uid) continue;
      const arr = scansByUser.get(uid) || [];
      if ((row as any).scanned_at) arr.push(String((row as any).scanned_at));
      scansByUser.set(uid, arr);
    }

    const favsByUser = new Map<string, string[]>();
    for (const row of favsRes.data || []) {
      const uid = String((row as any).user_id || "");
      if (!uid) continue;
      const arr = favsByUser.get(uid) || [];
      if ((row as any).created_at) arr.push(String((row as any).created_at));
      favsByUser.set(uid, arr);
    }

    type TxAgg = { sales: number; commission: number; firstPurchaseAt: string | null; count: number };
    const txByUser = new Map<string, TxAgg>();
    for (const row of txRes.data || []) {
      const st = String((row as any).status || "").toLowerCase();
      if (st === "demo") continue;
      if ((row as any).raw && typeof (row as any).raw === "object" && (row as any).raw.demo) continue;
      const uid = String((row as any).u1 || "").trim();
      if (!uid) continue;
      const cur = txByUser.get(uid) || { sales: 0, commission: 0, firstPurchaseAt: null, count: 0 };
      cur.sales += Number((row as any).sales_amount) || 0;
      cur.commission += Number((row as any).commission_amount) || 0;
      cur.count += 1;
      const td = (row as any).transaction_date ? String((row as any).transaction_date) : null;
      if (td && (!cur.firstPurchaseAt || td < cur.firstPurchaseAt)) cur.firstPurchaseAt = td;
      txByUser.set(uid, cur);
    }

    type Acc = AcquisitionBucket & { _days: number[]; _scans: number[]; _favs: number[] };
    const sources = new Map<string, Acc>();
    const campaigns = new Map<string, Acc>();
    const landings = new Map<string, Acc>();
    const influencers = new Map<string, Acc>();
    const qrs = new Map<string, Acc>();

    const bump = (
      map: Map<string, Acc>,
      key: string,
      label: string,
      meta: {
        purchased: boolean;
        sales: number;
        commission: number;
        days: number | null;
        scansBefore: number | null;
        favsBefore: number | null;
      }
    ) => {
      const b = map.get(key) || { ...emptyBucket(key, label), _days: [], _scans: [], _favs: [] };
      b.customers += 1;
      if (meta.purchased) {
        b.purchasers += 1;
        b.sales += meta.sales;
        b.commission += meta.commission;
        if (meta.days != null) b._days.push(meta.days);
        if (meta.scansBefore != null) b._scans.push(meta.scansBefore);
        if (meta.favsBefore != null) b._favs.push(meta.favsBefore);
      }
      map.set(key, b);
    };

    let withAttribution = 0;
    let unknown = 0;
    let purchasers = 0;
    let salesTotal = 0;
    let commissionTotal = 0;

    for (const u of users) {
      const uid = String((u as any).user_id);
      const source = bucketKey((u as any).first_touch_source);
      const campaign = bucketKey((u as any).first_touch_campaign);
      const landing = bucketKey((u as any).first_landing_page);
      const content = bucketKey((u as any).first_touch_content);
      const extra = ((u as any).attribution_extra || {}) as Record<string, unknown>;
      const qr = bucketKey(
        typeof extra.qr_code_id === "string"
          ? extra.qr_code_id
          : typeof extra.qr_code === "string"
            ? extra.qr_code
            : null
      );

      if (source === "Unknown") unknown += 1;
      else withAttribution += 1;

      const tx = txByUser.get(uid);
      const purchased = Boolean(tx && tx.count > 0);
      const regAt = (u as any).first_touch_at || (u as any).created_at || null;
      const days = purchased ? daysBetween(regAt, tx!.firstPurchaseAt) : null;
      const purchaseAt = tx?.firstPurchaseAt || null;
      const scans = (scansByUser.get(uid) || []).filter((t) => !purchaseAt || t <= purchaseAt);
      const favs = (favsByUser.get(uid) || []).filter((t) => !purchaseAt || t <= purchaseAt);

      const meta = {
        purchased,
        sales: tx?.sales || 0,
        commission: tx?.commission || 0,
        days,
        scansBefore: purchased ? scans.length : null,
        favsBefore: purchased ? favs.length : null,
      };

      if (purchased) {
        purchasers += 1;
        salesTotal += meta.sales;
        commissionTotal += meta.commission;
      }

      bump(sources, source, source, meta);
      bump(campaigns, campaign, campaign, meta);
      bump(landings, landing, landing, meta);
      if (content !== "Unknown") bump(influencers, content, content, meta);
      if (qr !== "Unknown") bump(qrs, qr, qr, meta);
    }

    return {
      bySource: finalizeBuckets(sources),
      byCampaign: finalizeBuckets(campaigns),
      byLandingPage: finalizeBuckets(landings),
      byInfluencer: finalizeBuckets(influencers),
      byQrCode: finalizeBuckets(qrs),
      totals: {
        customers: users.length,
        withAttribution,
        unknown,
        purchasers,
        sales: salesTotal,
        commission: commissionTotal,
      },
    };
  } catch (e: any) {
    return { ...empty, error: e?.message || "acquisition_report_failed" };
  }
}
