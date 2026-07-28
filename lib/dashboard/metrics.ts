import { getServerSupabase } from "../supabase-service-client";
import { formatPeriodDelta } from "./period-delta";
import {
  buildCategoryPerformance,
  buildEditorialPerformance,
  buildProductMoneyRows,
  buildRevenueGoalProgress,
  buildRevenueRecommendations,
  type CategoryPerformanceRow,
  type EditorialPerformanceRow,
  type ProductMoneyRow,
  type RevenueGoalProgress,
  type RevenueRecommendation,
} from "./commerce-intelligence";

export type HqCountResult = {
  value: number | null;
  error?: string;
};

const OVERVIEW_METRICS_TTL_MS = 30_000;
let overviewMetricsMemo: { at: number; data: HqOverviewMetrics } | null = null;

async function exactCount(
  table: string,
  build?: (q: any) => any
): Promise<HqCountResult> {
  const supabase = getServerSupabase();
  if (!supabase) return { value: null, error: "supabase_unavailable" };
  try {
    let q = supabase.from(table).select("id", { count: "exact", head: true });
    if (build) q = build(q);
    const { count, error } = await q;
    if (error) return { value: null, error: error.message };
    return { value: count ?? 0 };
  } catch (e: any) {
    return { value: null, error: e?.message || "count_failed" };
  }
}

/** Some tables use user_id as PK without id column. */
async function exactCountAny(
  table: string,
  column: string,
  build?: (q: any) => any
): Promise<HqCountResult> {
  const supabase = getServerSupabase();
  if (!supabase) return { value: null, error: "supabase_unavailable" };
  try {
    let q = supabase.from(table).select(column, { count: "exact", head: true });
    if (build) q = build(q);
    const { count, error } = await q;
    if (error) return { value: null, error: error.message };
    return { value: count ?? 0 };
  } catch (e: any) {
    return { value: null, error: e?.message || "count_failed" };
  }
}

export function startOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function daysAgo(n: number): Date {
  const x = startOfDay();
  x.setDate(x.getDate() - n);
  return x;
}

export function iso(d: Date): string {
  return d.toISOString();
}

export function formatCount(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("en-US");
}

export function formatDelta(current: number | null, previous: number | null): string | null {
  return formatPeriodDelta(current, previous, { periodLabel: "vs prior period" });
}

export type HqOverviewMetrics = {
  usersTotal: HqCountResult;
  usersYesterday: HqCountResult;
  usersToday: HqCountResult;
  scansTotal: HqCountResult;
  scansYesterday: HqCountResult;
  scansToday: HqCountResult;
  scansLast7d: HqCountResult;
  scansPrev7d: HqCountResult;
  favoritesTotal: HqCountResult;
  collectionsTotal: HqCountResult;
  boardsTotal: HqCountResult;
  clickoutsYesterday: HqCountResult;
  clickoutsToday: HqCountResult;
  clickoutsLast7d: HqCountResult;
  clickoutsPrev7d: HqCountResult;
  scannerClickoutsLast7d: HqCountResult;
  scannerClickoutsPrev7d: HqCountResult;
  editorialClickoutsLast7d: HqCountResult;
  editorialClickoutsPrev7d: HqCountResult;
  catalogProducts: HqCountResult;
  dppReady: HqCountResult;
  topMaterialsLast30d: Array<{ material: string; scans: number }>;
  topBrandsLast30d: Array<{ brand: string; scans: number }>;
  recentScans: Array<{
    id: string;
    scanned_at: string | null;
    brand: string | null;
    product_name: string | null;
    composition: string | null;
    natural_percent: number | null;
    fiber_primary: string | null;
    scan_source: string | null;
    user_id: string | null;
  }>;
  recentClickouts: Array<{
    id: string;
    clicked_at: string | null;
    product_id: string | null;
    user_id: string | null;
    source: string;
    brand?: string | null;
    product_name?: string | null;
  }>;
  fetchedAt: string;
};

function aggregateField(
  rows: Array<Record<string, unknown>>,
  key: string,
  limit = 8
): Array<{ key: string; count: number }> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const raw = String(row[key] || "")
      .trim()
      .toLowerCase();
    if (!raw || raw === "unknown" || raw === "null") continue;
    const label = raw.replace(/\b\w/g, (c) => c.toUpperCase());
    map.set(label, (map.get(label) || 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k, count]) => ({ key: k, count }));
}

export async function fetchHqOverviewMetrics(): Promise<HqOverviewMetrics> {
  const cached = overviewMetricsMemo;
  if (cached && Date.now() - cached.at < OVERVIEW_METRICS_TTL_MS) {
    return cached.data;
  }

  const supabase = getServerSupabase();
  const today = startOfDay();
  const yesterday = daysAgo(1);
  const d7 = daysAgo(7);
  const d14 = daysAgo(14);
  const d30 = daysAgo(30);

  const empty: HqOverviewMetrics = {
    usersTotal: { value: null },
    usersYesterday: { value: null },
    usersToday: { value: null },
    scansTotal: { value: null },
    scansYesterday: { value: null },
    scansToday: { value: null },
    scansLast7d: { value: null },
    scansPrev7d: { value: null },
    favoritesTotal: { value: null },
    collectionsTotal: { value: null },
    boardsTotal: { value: null },
    clickoutsYesterday: { value: null },
    clickoutsToday: { value: null },
    clickoutsLast7d: { value: null },
    clickoutsPrev7d: { value: null },
    scannerClickoutsLast7d: { value: null },
    scannerClickoutsPrev7d: { value: null },
    editorialClickoutsLast7d: { value: null },
    editorialClickoutsPrev7d: { value: null },
    catalogProducts: { value: null },
    dppReady: { value: null },
    topMaterialsLast30d: [],
    topBrandsLast30d: [],
    recentScans: [],
    recentClickouts: [],
    fetchedAt: new Date().toISOString(),
  };

  if (!supabase) return { ...empty, usersTotal: { value: null, error: "supabase_unavailable" } };

  const [
    usersTotal,
    scansTotal,
    scansToday,
    scansYesterday,
    scansLast7d,
    scansPrev7d,
    favoritesTotal,
    collectionsTotal,
    boardsTotal,
    clickoutsToday,
    clickoutsYesterday,
    clickoutsLast7d,
    clickoutsPrev7d,
    scannerClickoutsLast7d,
    scannerClickoutsPrev7d,
    editorialClickoutsLast7d,
    editorialClickoutsPrev7d,
    catalogProducts,
    dppReady,
    recentScansRes,
    materialSampleRes,
    brandSampleRes,
    shopClickoutsRes,
    scannerClickoutsRes,
    editorialClickoutsRes,
    legacyUsersToday,
    legacyUsersYesterday,
  ] = await Promise.all([
    exactCountAny("user_preferences", "user_id"),
    exactCount("scan_history"),
    exactCount("scan_history", (q) => q.gte("scanned_at", iso(today))),
    exactCount("scan_history", (q) => q.gte("scanned_at", iso(yesterday)).lt("scanned_at", iso(today))),
    exactCount("scan_history", (q) => q.gte("scanned_at", iso(d7))),
    exactCount("scan_history", (q) => q.gte("scanned_at", iso(d14)).lt("scanned_at", iso(d7))),
    exactCount("product_favorites"),
    exactCount("user_collections"),
    exactCount("outfit_boards"),
    exactCount("user_product_clickouts", (q) => q.gte("clicked_at", iso(today))),
    exactCount("user_product_clickouts", (q) => q.gte("clicked_at", iso(yesterday)).lt("clicked_at", iso(today))),
    exactCount("user_product_clickouts", (q) => q.gte("clicked_at", iso(d7))),
    exactCount("user_product_clickouts", (q) => q.gte("clicked_at", iso(d14)).lt("clicked_at", iso(d7))),
    exactCount("scanner_clickouts", (q) => q.gte("clicked_at", iso(d7))),
    exactCount("scanner_clickouts", (q) => q.gte("clicked_at", iso(d14)).lt("clicked_at", iso(d7))),
    exactCount("editorial_clickouts", (q) => q.gte("clicked_at", iso(d7))),
    exactCount("editorial_clickouts", (q) => q.gte("clicked_at", iso(d14)).lt("clicked_at", iso(d7))),
    exactCount("products", (q) => q.eq("approved", "yes").eq("is_active", true)),
    exactCount("products", (q) => q.eq("dpp_ready", true)),
    supabase
      .from("scan_history")
      .select("id, scanned_at, brand, product_name, composition, natural_percent, fiber_primary, scan_source, user_id, detected_brand")
      .order("scanned_at", { ascending: false })
      .limit(12),
    supabase
      .from("scan_history")
      .select("fiber_primary")
      .gte("scanned_at", iso(d30))
      .not("fiber_primary", "is", null)
      .limit(500),
    supabase
      .from("scan_history")
      .select("brand, detected_brand")
      .gte("scanned_at", iso(d30))
      .limit(500),
    supabase
      .from("user_product_clickouts")
      .select("id, clicked_at, product_id, user_id")
      .order("clicked_at", { ascending: false })
      .limit(8),
    supabase
      .from("scanner_clickouts")
      .select("id, clicked_at, product_id, user_id, brand_slug, product_name")
      .order("clicked_at", { ascending: false })
      .limit(8),
    supabase
      .from("editorial_clickouts")
      .select("id, clicked_at, user_id, brand_name, product_name")
      .order("clicked_at", { ascending: false })
      .limit(8),
    // Legacy users table may not have reliable auth coverage; best-effort.
    exactCount("users", (q) => q.gte("created_at", iso(today))),
    exactCount("users", (q) => q.gte("created_at", iso(yesterday)).lt("created_at", iso(today))),
  ]);

  const topMaterials = aggregateField(
    (materialSampleRes.data || []) as Array<Record<string, unknown>>,
    "fiber_primary"
  ).map((x) => ({ material: x.key, scans: x.count }));

  const brandRows = ((brandSampleRes.data || []) as Array<Record<string, unknown>>).map((row) => ({
    brand: String(row.brand || row.detected_brand || "").trim(),
  }));
  const topBrands = aggregateField(brandRows, "brand").map((x) => ({ brand: x.key, scans: x.count }));

  const recentClickouts: HqOverviewMetrics["recentClickouts"] = [
    ...((shopClickoutsRes.data || []) as any[]).map((r) => ({
      id: r.id,
      clicked_at: r.clicked_at,
      product_id: r.product_id,
      user_id: r.user_id,
      source: "shop",
    })),
    ...((scannerClickoutsRes.data || []) as any[]).map((r) => ({
      id: r.id,
      clicked_at: r.clicked_at,
      product_id: r.product_id,
      user_id: r.user_id,
      source: "scanner",
      brand: r.brand_slug,
      product_name: r.product_name,
    })),
    ...((editorialClickoutsRes.data || []) as any[]).map((r) => ({
      id: r.id,
      clicked_at: r.clicked_at,
      product_id: null,
      user_id: r.user_id,
      source: "editorial",
      brand: r.brand_name,
      product_name: r.product_name,
    })),
  ]
    .sort((a, b) => String(b.clicked_at || "").localeCompare(String(a.clicked_at || "")))
    .slice(0, 12);

  const result: HqOverviewMetrics = {
    usersTotal,
    usersYesterday: legacyUsersYesterday.value != null ? legacyUsersYesterday : { value: null },
    usersToday: legacyUsersToday.value != null ? legacyUsersToday : { value: null },
    scansTotal,
    scansYesterday,
    scansToday,
    scansLast7d,
    scansPrev7d,
    favoritesTotal,
    collectionsTotal,
    boardsTotal,
    clickoutsYesterday,
    clickoutsToday,
    clickoutsLast7d,
    clickoutsPrev7d,
    scannerClickoutsLast7d,
    scannerClickoutsPrev7d,
    editorialClickoutsLast7d,
    editorialClickoutsPrev7d,
    catalogProducts,
    dppReady,
    topMaterialsLast30d: topMaterials,
    topBrandsLast30d: topBrands,
    recentScans: ((recentScansRes.data || []) as any[]).map((r) => ({
      id: r.id,
      scanned_at: r.scanned_at,
      brand: r.brand || r.detected_brand,
      product_name: r.product_name,
      composition: r.composition,
      natural_percent: r.natural_percent,
      fiber_primary: r.fiber_primary,
      scan_source: r.scan_source,
      user_id: r.user_id,
    })),
    recentClickouts,
    fetchedAt: new Date().toISOString(),
  };
  overviewMetricsMemo = { at: Date.now(), data: result };
  return result;
}

export type HqConsumerRow = {
  userId: string;
  scans: number;
  favorites: number;
  lastScanAt: string | null;
  country: string | null;
  acquisitionSource: string;
  firstTouchCampaign: string | null;
  firstLandingPage: string | null;
};

export async function fetchHqConsumerRows(limit = 40): Promise<{
  rows: HqConsumerRow[];
  error?: string;
}> {
  const supabase = getServerSupabase();
  if (!supabase) return { rows: [], error: "supabase_unavailable" };

  try {
    let prefs: any[] | null = null;
    let error: { message: string } | null = null;

    {
      const withAttr = await supabase
        .from("user_preferences")
        .select(
          "user_id, country_code, updated_at, first_touch_source, first_touch_medium, first_touch_campaign, first_landing_page"
        )
        .order("updated_at", { ascending: false })
        .limit(limit);
      if (withAttr.error?.message?.includes("first_touch_source") || withAttr.error?.code === "42703") {
        const fallback = await supabase
          .from("user_preferences")
          .select("user_id, country_code, updated_at")
          .order("updated_at", { ascending: false })
          .limit(limit);
        prefs = fallback.data;
        error = fallback.error;
      } else {
        prefs = withAttr.data;
        error = withAttr.error;
      }
    }

    if (error) return { rows: [], error: error.message };
    const userIds = (prefs || []).map((p: any) => String(p.user_id)).filter(Boolean);
    if (!userIds.length) return { rows: [] };

    const { displayAcquisitionSource } = await import("./attribution");

    const [scans, favorites] = await Promise.all([
      supabase
        .from("scan_history")
        .select("user_id, scanned_at")
        .in("user_id", userIds)
        .order("scanned_at", { ascending: false })
        .limit(800),
      supabase
        .from("product_favorites")
        .select("user_id")
        .in("user_id", userIds)
        .limit(2000),
    ]);

    const scanCount = new Map<string, number>();
    const lastScan = new Map<string, string>();
    for (const row of scans.data || []) {
      const uid = String((row as any).user_id || "");
      if (!uid) continue;
      scanCount.set(uid, (scanCount.get(uid) || 0) + 1);
      if (!lastScan.has(uid) && (row as any).scanned_at) {
        lastScan.set(uid, String((row as any).scanned_at));
      }
    }

    const favCount = new Map<string, number>();
    for (const row of favorites.data || []) {
      const uid = String((row as any).user_id || "");
      if (!uid) continue;
      favCount.set(uid, (favCount.get(uid) || 0) + 1);
    }

    const rows: HqConsumerRow[] = (prefs || []).map((p: any) => ({
      userId: String(p.user_id),
      scans: scanCount.get(String(p.user_id)) || 0,
      favorites: favCount.get(String(p.user_id)) || 0,
      lastScanAt: lastScan.get(String(p.user_id)) || null,
      country: p.country_code || null,
      acquisitionSource: displayAcquisitionSource({
        first_touch_source: p.first_touch_source,
        first_touch_medium: p.first_touch_medium,
        first_touch_campaign: p.first_touch_campaign,
      }),
      firstTouchCampaign: p.first_touch_campaign || null,
      firstLandingPage: p.first_landing_page || null,
    }));

    rows.sort((a, b) => b.scans - a.scans || b.favorites - a.favorites);
    return { rows };
  } catch (e: any) {
    return { rows: [], error: e?.message || "consumers_failed" };
  }
}

export async function fetchHqScannerPage() {
  const supabase = getServerSupabase();
  const today = startOfDay();
  const d7 = daysAgo(7);
  const d30 = daysAgo(30);

  if (!supabase) {
    return {
      totals: {
        all: null as number | null,
        today: null as number | null,
        last7d: null as number | null,
      },
      bySource: [] as Array<{ source: string; count: number }>,
      recent: [] as any[],
      topMaterials: [] as Array<{ material: string; scans: number }>,
      error: "supabase_unavailable",
    };
  }

  const [all, todayCount, last7d, recent, sample] = await Promise.all([
    exactCount("scan_history"),
    exactCount("scan_history", (q) => q.gte("scanned_at", iso(today))),
    exactCount("scan_history", (q) => q.gte("scanned_at", iso(d7))),
    supabase
      .from("scan_history")
      .select(
        "id, scanned_at, brand, detected_brand, product_name, composition, natural_percent, fiber_primary, scan_source, label_type, user_id, upc_code"
      )
      .order("scanned_at", { ascending: false })
      .limit(40),
    supabase
      .from("scan_history")
      .select("scan_source, fiber_primary")
      .gte("scanned_at", iso(d30))
      .limit(800),
  ]);

  const bySource = aggregateField((sample.data || []) as any[], "scan_source");
  const topMaterials = aggregateField((sample.data || []) as any[], "fiber_primary").map((x) => ({
    material: x.key,
    scans: x.count,
  }));

  return {
    totals: { all: all.value, today: todayCount.value, last7d: last7d.value },
    bySource: bySource.map((x) => ({ source: x.key || "unknown", count: x.count })),
    recent: recent.data || [],
    topMaterials,
    error: all.error || recent.error?.message,
  };
}

export async function fetchHqCommercePage(workspaceId?: string) {
  const d7 = daysAgo(7);
  const d30 = daysAgo(30);
  const supabase = getServerSupabase();
  if (!supabase) {
    return {
      shop7d: null as number | null,
      scanner7d: null as number | null,
      editorial7d: null as number | null,
      topBrands: [] as Array<{ brand: string; clicks: number }>,
      recent: [] as any[],
      recentTransactions: [] as any[],
      revenueConnected: false,
      commission7d: null as number | null,
      sales7d: null as number | null,
      salesToday: null as number | null,
      transactions7d: null as number | null,
      transactionsToday: null as number | null,
      commission30d: null as number | null,
      sales30d: null as number | null,
      salesYtd: null as number | null,
      topRevenueAdvertisers: [] as Array<{ brand: string; commission: number; sales: number }>,
      lastSaleDate: null as string | null,
      nullU1Tx30d: null as number | null,
      txWithU130d: null as number | null,
      topProductsBySales: [] as ProductMoneyRow[],
      topProductsByCommission: [] as ProductMoneyRow[],
      topProductsByRpc: [] as ProductMoneyRow[],
      categoryPerformance: [] as CategoryPerformanceRow[],
      editorialPerformance: [] as EditorialPerformanceRow[],
      revenueGoal: buildRevenueGoalProgress({ revenueConnected: false }),
      revenueRecommendations: buildRevenueRecommendations({ revenueConnected: false }),
      error: "supabase_unavailable",
    };
  }

  const [shop7d, scanner7d, editorial7d, scannerSample, editorialSample, shopRecent, scannerRecent] =
    await Promise.all([
      exactCount("user_product_clickouts", (q) => q.gte("clicked_at", iso(d7))),
      exactCount("scanner_clickouts", (q) => q.gte("clicked_at", iso(d7))),
      exactCount("editorial_clickouts", (q) => q.gte("clicked_at", iso(d7))),
      supabase
        .from("scanner_clickouts")
        .select("brand_slug, product_name, clicked_at, converted, conversion_value")
        .gte("clicked_at", iso(d30))
        .limit(500),
      supabase
        .from("editorial_clickouts")
        .select("brand_name, product_name, clicked_at, edit_slug, edit_month, product_slot")
        .gte("clicked_at", iso(d30))
        .limit(500),
      supabase
        .from("user_product_clickouts")
        .select("id, product_id, user_id, clicked_at")
        .order("clicked_at", { ascending: false })
        .limit(20),
      supabase
        .from("scanner_clickouts")
        .select("id, brand_slug, product_name, product_id, user_id, clicked_at, converted")
        .order("clicked_at", { ascending: false })
        .limit(20),
    ]);

  const brandRows = [
    ...((scannerSample.data || []) as any[]).map((r) => ({ brand: r.brand_slug })),
    ...((editorialSample.data || []) as any[]).map((r) => ({ brand: r.brand_name })),
  ];
  const topBrands = aggregateField(brandRows, "brand").map((x) => ({ brand: x.key, clicks: x.count }));

  const recent = [
    ...((shopRecent.data || []) as any[]).map((r) => ({ ...r, source: "shop" })),
    ...((scannerRecent.data || []) as any[]).map((r) => ({
      ...r,
      source: "scanner",
      brand: r.brand_slug,
    })),
  ]
    .sort((a, b) => String(b.clicked_at || "").localeCompare(String(a.clicked_at || "")))
    .slice(0, 30);

  const todayIso = iso(new Date());
  let revenueConnected = false;
  let revenueIsDemo = false;
  let commission7d: number | null = null;
  let sales7d: number | null = null;
  let salesToday: number | null = null;
  let transactions7d: number | null = null;
  let transactionsToday: number | null = null;
  let commission30d: number | null = null;
  let sales30d: number | null = null;
  let recentTransactions: any[] = [];
  let topRevenueAdvertisers: Array<{ brand: string; commission: number; sales: number }> = [];
  let unmatchedTx30d: number | null = null;
  let lastSaleDate: string | null = null;
  let nullU1Tx30d: number | null = null;
  let txWithU130d: number | null = null;
  let salesYtd: number | null = null;
  let activeTxForIntel: any[] = [];

  if (workspaceId) {
    const ytdStart = `${new Date().getUTCFullYear()}-01-01T00:00:00.000Z`;
    const [{ data: txRows, error: txErr }, ytdRes] = await Promise.all([
      supabase
        .from("hq_affiliate_transactions")
        .select(
          "id, transaction_date, advertiser_name, product_name, product_id, sku, sales_amount, commission_amount, currency, status, order_id, raw, external_transaction_id, u1"
        )
        .eq("workspace_id", workspaceId)
        .gte("transaction_date", iso(d30))
        .order("transaction_date", { ascending: false })
        .limit(500),
      supabase
        .from("hq_affiliate_transactions")
        .select("sales_amount, status, raw, external_transaction_id")
        .eq("workspace_id", workspaceId)
        .gte("transaction_date", ytdStart)
        .limit(2000),
    ]);

    if (!txErr && txRows) {
      const isDemoRow = (r: any) =>
        r.status === "demo" || r.raw?.is_demo === true || String(r.external_transaction_id || "").startsWith("TX-");
      const isBlankU1 = (r: any) => {
        const v = r.u1 ?? r.raw?.u1 ?? r.raw?.member_id_u1;
        if (v == null) return true;
        const s = String(v).trim().toLowerCase();
        return !s || s === "null" || s === "undefined" || s === "none";
      };
      const demoRows = txRows.filter(isDemoRow);
      const verifiedRows = txRows.filter((r) => !isDemoRow(r));
      revenueIsDemo = verifiedRows.length === 0 && demoRows.length > 0;
      // Verified revenue only — never mix demo into commercial totals shown as live.
      const activeRows = revenueIsDemo ? [] : verifiedRows;
      activeTxForIntel = activeRows;
      revenueConnected = activeRows.length > 0;
      const in7 = activeRows.filter((r) => r.transaction_date && r.transaction_date >= iso(d7));
      const inToday = activeRows.filter(
        (r) => r.transaction_date && String(r.transaction_date).slice(0, 10) >= todayIso.slice(0, 10)
      );
      transactions7d = revenueIsDemo ? demoRows.filter((r) => r.transaction_date && r.transaction_date >= iso(d7)).length : in7.length;
      transactionsToday = revenueIsDemo ? null : inToday.length;
      commission7d = revenueIsDemo
        ? null
        : in7.reduce((s, r) => s + Number(r.commission_amount || 0), 0);
      sales7d = revenueIsDemo ? null : in7.reduce((s, r) => s + Number(r.sales_amount || 0), 0);
      salesToday = revenueIsDemo
        ? null
        : inToday.reduce((s, r) => s + Number(r.sales_amount || 0), 0);
      commission30d = revenueIsDemo
        ? null
        : activeRows.reduce((s, r) => s + Number(r.commission_amount || 0), 0);
      sales30d = revenueIsDemo
        ? null
        : activeRows.reduce((s, r) => s + Number(r.sales_amount || 0), 0);
      recentTransactions = (revenueIsDemo ? demoRows : activeRows).slice(0, 30).map((r) => ({
        ...r,
        is_demo: isDemoRow(r),
      }));
      unmatchedTx30d = activeRows.filter((r) => !r.product_id && !r.sku).length;
      nullU1Tx30d = activeRows.filter(isBlankU1).length;
      txWithU130d = activeRows.length - (nullU1Tx30d || 0);
      lastSaleDate = activeRows[0]?.transaction_date
        ? String(activeRows[0].transaction_date).slice(0, 10)
        : null;
      const byAdv = new Map<string, { commission: number; sales: number }>();
      for (const r of activeRows) {
        const key = r.advertiser_name || "Unknown";
        const cur = byAdv.get(key) || { commission: 0, sales: 0 };
        cur.commission += Number(r.commission_amount || 0);
        cur.sales += Number(r.sales_amount || 0);
        byAdv.set(key, cur);
      }
      topRevenueAdvertisers = [...byAdv.entries()]
        .map(([brand, v]) => ({ brand, ...v }))
        .sort((a, b) => b.commission - a.commission)
        .slice(0, 10);
    }

    if (!ytdRes.error && ytdRes.data) {
      const isDemoRow = (r: any) =>
        r.status === "demo" || r.raw?.is_demo === true || String(r.external_transaction_id || "").startsWith("TX-");
      const verified = (ytdRes.data as any[]).filter((r) => !isDemoRow(r));
      if (verified.length) {
        salesYtd = verified.reduce((s, r) => s + Number(r.sales_amount || 0), 0);
      }
    }

    if (!revenueConnected && !revenueIsDemo) {
      const { count } = await supabase
        .from("hq_affiliate_transactions")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .neq("status", "demo");
      revenueConnected = (count || 0) > 0;
    }
  }

  const editorialRows = (editorialSample.data || []) as any[];
  const clickSamplesForIntel = [
    ...editorialRows.map((r) => ({
      product_name: r.product_name,
      brand_name: r.brand_name,
      edit_slug: r.edit_slug,
      edit_month: r.edit_month,
    })),
    ...((scannerSample.data || []) as any[]).map((r) => ({
      product_name: r.product_name,
      brand_slug: r.brand_slug,
    })),
  ];
  const productMoney = buildProductMoneyRows(activeTxForIntel, clickSamplesForIntel, 8);
  const categories = buildCategoryPerformance(activeTxForIntel);
  const editorialPerformance = buildEditorialPerformance(editorialRows, activeTxForIntel);
  const revenueGoal = buildRevenueGoalProgress({
    revenueConnected,
    revenueIsDemo,
    sales30d,
    salesYtd,
  });
  const revenueRecommendations = buildRevenueRecommendations({
    revenueConnected,
    revenueIsDemo,
    salesToday,
    sales7d,
    sales30d,
    commission30d,
    editorial7d: editorial7d.value,
    shop7d: shop7d.value,
    scanner7d: scanner7d.value,
    nullU1Tx30d,
    txWithU130d,
    topRevenueAdvertisers,
    categories,
    topByCommission: productMoney.byCommission,
    goal: revenueGoal,
  });

  return {
    shop7d: shop7d.value,
    scanner7d: scanner7d.value,
    editorial7d: editorial7d.value,
    topBrands,
    recent,
    recentTransactions,
    revenueConnected,
    revenueIsDemo,
    commission7d,
    sales7d,
    salesToday,
    transactions7d,
    transactionsToday,
    commission30d,
    sales30d,
    salesYtd,
    topRevenueAdvertisers,
    unmatchedTx30d,
    lastSaleDate,
    nullU1Tx30d,
    txWithU130d,
    topProductsBySales: productMoney.bySales as ProductMoneyRow[],
    topProductsByCommission: productMoney.byCommission as ProductMoneyRow[],
    topProductsByRpc: productMoney.byRpc as ProductMoneyRow[],
    categoryPerformance: categories as CategoryPerformanceRow[],
    editorialPerformance: editorialPerformance as EditorialPerformanceRow[],
    revenueGoal: revenueGoal as RevenueGoalProgress,
    revenueRecommendations: revenueRecommendations as RevenueRecommendation[],
    error: shop7d.error,
  };
}

export async function fetchHqDppPage() {
  const [approved, dppReady, withOrigin, withCare, withComposition] = await Promise.all([
    exactCount("products", (q) => q.eq("approved", "yes")),
    exactCount("products", (q) => q.eq("dpp_ready", true)),
    exactCount("products", (q) => q.eq("approved", "yes").not("country_of_origin", "is", null)),
    exactCount("products", (q) => q.eq("approved", "yes").not("care_instructions", "is", null)),
    exactCount("products", (q) => q.eq("approved", "yes").not("composition", "is", null)),
  ]);

  const pct = (part: number | null, whole: number | null) => {
    if (part == null || whole == null || whole === 0) return null;
    return Math.round((part / whole) * 1000) / 10;
  };

  return {
    approved: approved.value,
    dppReady: dppReady.value,
    withOrigin: withOrigin.value,
    withCare: withCare.value,
    withComposition: withComposition.value,
    dppReadyPct: pct(dppReady.value, approved.value),
    originPct: pct(withOrigin.value, approved.value),
    carePct: pct(withCare.value, approved.value),
    compositionPct: pct(withComposition.value, approved.value),
    error: approved.error,
  };
}
