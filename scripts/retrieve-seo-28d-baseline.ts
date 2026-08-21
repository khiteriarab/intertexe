/**
 * Bounded 28-day SEO + commerce baseline.
 * Totals from Search Console with no dimensions (do not sum top-N rows).
 * Does not scan the product catalog. Does not print tokens.
 *
 * Usage (from intertexe-website):
 *   npx tsx scripts/retrieve-seo-28d-baseline.ts
 */
import { createHash, createDecipheriv } from "crypto";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile(filename: string) {
  try {
    const text = readFileSync(join(root, filename), "utf8");
    for (const line of text.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#") || !t.includes("=")) continue;
      const eq = t.indexOf("=");
      const key = t.slice(0, eq).trim();
      let val = t.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[key] == null) process.env[key] = val;
    }
  } catch {
    // optional
  }
}

loadEnvFile(".env.development.local");
loadEnvFile(".env.local");

const ALGO = "aes-256-gcm";
const BRANDED_RE = /\binter\s*-?\s*texe\b|\bintertexe\b|\binterexe\b|\bitx\b/i;

type GscRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

type Totals = {
  clicks: number;
  impressions: number;
  ctr: number | null;
  position: number | null;
};

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return ymd(d);
}

function inclusiveDays(start: string, end: string): number {
  const a = Date.parse(`${start}T00:00:00.000Z`);
  const b = Date.parse(`${end}T00:00:00.000Z`);
  return Math.round((b - a) / 86400000) + 1;
}

function windowEnding(end: string, days = 28): { startDate: string; endDate: string; days: number } {
  const startDate = addDays(end, -(days - 1));
  return { startDate, endDate: end, days: inclusiveDays(startDate, end) };
}

function decryptSecret(payload: string): string {
  const raw = process.env.HQ_TOKEN_ENCRYPTION_KEY?.trim() || "";
  if (!raw) throw new Error("HQ_TOKEN_ENCRYPTION_KEY missing");
  const key = createHash("sha256").update(raw).digest();
  const [ivB64, tagB64, dataB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Invalid encrypted payload");
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) throw new Error("Supabase env missing");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function googleJson(res: Response, label: string): Promise<Record<string, unknown>> {
  const text = await res.text();
  try {
    return text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    const prefix = text.slice(0, 160).replace(/\s+/g, " ").trim();
    throw new Error(`${label} HTTP ${res.status} non-JSON: ${prefix}`);
  }
}

async function refreshGoogle(refreshToken: string): Promise<string> {
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || "",
    client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || "",
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = await googleJson(res, "Google refresh");
  if (!res.ok) {
    throw new Error(String(json.error_description || json.error || "Google refresh failed"));
  }
  return String(json.access_token);
}

async function gscQuery(
  accessToken: string,
  siteUrl: string,
  body: Record<string, unknown>
): Promise<{ ok: boolean; json: Record<string, unknown> }> {
  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
  const json = await googleJson(res, "GSC query");
  return { ok: res.ok, json };
}

async function ga4Report(
  accessToken: string,
  propertyId: string,
  body: Record<string, unknown>
): Promise<{ ok: boolean; json: Record<string, unknown> }> {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
  const json = await googleJson(res, "GA4 report");
  return { ok: res.ok, json };
}

function rowMetrics(r: GscRow) {
  return {
    clicks: Number(r.clicks || 0),
    impressions: Number(r.impressions || 0),
    ctr: Number(r.ctr || 0),
    position: Number(r.position || 0),
  };
}

function totalsFromUndimensioned(json: Record<string, unknown>): Totals {
  const rows = Array.isArray(json.rows) ? (json.rows as GscRow[]) : [];
  const r = rows[0];
  if (!r) return { clicks: 0, impressions: 0, ctr: null, position: null };
  const m = rowMetrics(r);
  return {
    clicks: m.clicks,
    impressions: m.impressions,
    ctr: m.impressions > 0 ? m.clicks / m.impressions : m.ctr || null,
    position: m.position || null,
  };
}

function classifyPage(page: string): "product" | "category" | "editorial" | "home" | "other" {
  try {
    const u = new URL(page);
    const p = u.pathname.replace(/\/+$/, "") || "/";
    if (p === "/") return "home";
    if (p.startsWith("/product/") || p === "/product") return "product";
    if (
      p.startsWith("/materials") ||
      p.startsWith("/material/") ||
      p.startsWith("/designers") ||
      p.startsWith("/designer/") ||
      p.startsWith("/shop") ||
      p.startsWith("/collections") ||
      p.startsWith("/collection/")
    ) {
      return "category";
    }
    if (
      p.startsWith("/guides") ||
      p.startsWith("/methodology") ||
      p.startsWith("/journal") ||
      p.startsWith("/edit") ||
      p.startsWith("/khiteri") ||
      p.startsWith("/about")
    ) {
      return "editorial";
    }
    return "other";
  } catch {
    return "other";
  }
}

function isBrandedQuery(q: string): boolean {
  return BRANDED_RE.test(q);
}

function classifyAcquisition(row: {
  first_touch_source?: string | null;
  first_touch_medium?: string | null;
  gclid?: string | null;
  ttclid?: string | null;
  fbclid?: string | null;
}): "google_organic" | "google_paid" | "other_organic" | "other_paid" | "unknown" {
  const source = String(row.first_touch_source || "").trim().toLowerCase();
  const medium = String(row.first_touch_medium || "").trim().toLowerCase();
  const paidMedium = medium === "cpc" || medium === "ppc" || medium === "paid" || medium.includes("ads");
  if (row.gclid || paidMedium && /google|gads|adwords|youtube/.test(source)) return "google_paid";
  if (row.ttclid || row.fbclid) return "other_paid";
  if (paidMedium) return "other_paid";
  const googleSource = source === "google" || source === "google.com" || source.endsWith(".google.com");
  const organicMedium = medium === "organic" || medium === "" || medium === "(none)" || medium === "none";
  if (googleSource && organicMedium) return "google_organic";
  if (medium === "organic" || source === "organic") return "other_organic";
  if (!source || source === "unknown") return "unknown";
  return "unknown";
}

async function fetchWindowGsc(
  token: string,
  siteUrl: string,
  range: { startDate: string; endDate: string }
) {
  const [totalsRes, queryRes, pageRes, deviceRes, countryRes] = await Promise.all([
    gscQuery(token, siteUrl, {
      startDate: range.startDate,
      endDate: range.endDate,
      aggregationType: "auto",
      rowLimit: 1,
    }),
    gscQuery(token, siteUrl, {
      startDate: range.startDate,
      endDate: range.endDate,
      dimensions: ["query"],
      rowLimit: 25000,
    }),
    gscQuery(token, siteUrl, {
      startDate: range.startDate,
      endDate: range.endDate,
      dimensions: ["page"],
      rowLimit: 25000,
    }),
    gscQuery(token, siteUrl, {
      startDate: range.startDate,
      endDate: range.endDate,
      dimensions: ["device"],
      rowLimit: 10,
    }),
    gscQuery(token, siteUrl, {
      startDate: range.startDate,
      endDate: range.endDate,
      dimensions: ["country"],
      rowLimit: 50,
    }),
  ]);

  const errors: string[] = [];
  for (const [name, res] of [
    ["totals", totalsRes],
    ["query", queryRes],
    ["page", pageRes],
    ["device", deviceRes],
    ["country", countryRes],
  ] as const) {
    if (!res.ok) {
      const err = res.json.error as { message?: string } | undefined;
      errors.push(`${name}: ${err?.message || "failed"}`);
    }
  }

  const totals = totalsFromUndimensioned(totalsRes.json);
  const queries = (Array.isArray(queryRes.json.rows) ? (queryRes.json.rows as GscRow[]) : []).map((r) => ({
    query: r.keys?.[0] || "",
    ...rowMetrics(r),
  }));
  const branded = { clicks: 0, impressions: 0, queries: 0 };
  const nonBranded = { clicks: 0, impressions: 0, queries: 0 };
  for (const q of queries) {
    const bucket = isBrandedQuery(q.query) ? branded : nonBranded;
    bucket.clicks += q.clicks;
    bucket.impressions += q.impressions;
    bucket.queries += 1;
  }

  const pages = (Array.isArray(pageRes.json.rows) ? (pageRes.json.rows as GscRow[]) : []).map((r) => ({
    page: r.keys?.[0] || "",
    type: classifyPage(r.keys?.[0] || ""),
    ...rowMetrics(r),
  }));
  const byType: Record<string, { clicks: number; impressions: number; pages: number }> = {};
  for (const p of pages) {
    const b = (byType[p.type] ||= { clicks: 0, impressions: 0, pages: 0 });
    b.clicks += p.clicks;
    b.impressions += p.impressions;
    b.pages += 1;
  }

  const mapDim = (json: Record<string, unknown>, key: string) =>
    (Array.isArray(json.rows) ? (json.rows as GscRow[]) : []).map((r) => ({
      [key]: r.keys?.[0] || "",
      ...rowMetrics(r),
    }));

  return {
    errors,
    totals,
    brandedVsNonBranded: {
      branded: {
        ...branded,
        ctr: branded.impressions > 0 ? branded.clicks / branded.impressions : null,
      },
      nonBranded: {
        ...nonBranded,
        ctr: nonBranded.impressions > 0 ? nonBranded.clicks / nonBranded.impressions : null,
      },
      queryRowCoverage: {
        rowClicks: branded.clicks + nonBranded.clicks,
        rowImpressions: branded.impressions + nonBranded.impressions,
        note: "Query rows can undercount vs undimensioned totals because anonymized queries are omitted.",
      },
    },
    topQueries: [...queries].sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions).slice(0, 25),
    topNonBrandedQueries: queries
      .filter((q) => !isBrandedQuery(q.query))
      .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
      .slice(0, 20),
    topLandingPages: [...pages].sort((a, b) => b.clicks - a.clicks).slice(0, 20),
    clicksByPageType: byType,
    device: mapDim(deviceRes.json, "device"),
    country: mapDim(countryRes.json, "country").sort((a, b) => b.clicks - a.clicks).slice(0, 15),
  };
}

async function countExact(
  supabase: ReturnType<typeof supabaseAdmin>,
  table: string,
  column: string,
  startIso: string,
  endExclusiveIso: string,
  extra?: (q: any) => any
) {
  let q = supabase.from(table).select("id", { count: "exact", head: true }).gte(column, startIso).lt(column, endExclusiveIso);
  if (extra) q = extra(q);
  const { count, error } = await q;
  return { count: count ?? 0, error: error?.message || null };
}

async function main() {
  const retrievedAt = new Date().toISOString();
  const latestEnd = addDays(ymd(new Date()), -3);
  const latest = windowEnding(latestEnd, 28);
  const prior = windowEnding(addDays(latest.startDate, -1), 28);
  const email = windowEnding("2026-08-13", 28);

  const siteUrl = (process.env.SEARCH_CONSOLE_SITE_URL || "sc-domain:intertexe.com").trim();
  const ga4PropertyId = (process.env.GA4_PROPERTY_ID || "").replace(/^properties\//, "").trim();

  const supabase = supabaseAdmin();
  const { data: ws } = await supabase.from("hq_workspaces").select("id, slug").eq("slug", "intertexe").maybeSingle();
  const workspaceId = ws?.id || null;

  let googleStatus: Record<string, unknown> = { connected: false };
  let token: string | null = null;
  if (workspaceId) {
    const { data: conn, error } = await supabase
      .from("hq_oauth_connections")
      .select("status, account_label, scopes, refresh_token_enc, last_sync_at, last_sync_status, last_sync_error, metadata")
      .eq("workspace_id", workspaceId)
      .eq("provider", "google")
      .maybeSingle();
    googleStatus = {
      connected: conn?.status === "connected",
      status: conn?.status || "missing",
      accountLabel: conn?.account_label || null,
      scopesPresent: Array.isArray(conn?.scopes) ? conn.scopes.length : 0,
      lastSyncAt: conn?.last_sync_at || null,
      lastSyncStatus: conn?.last_sync_status || null,
      lastSyncError: conn?.last_sync_error || null,
      connectionError: error?.message || null,
    };
    if (conn?.refresh_token_enc) {
      try {
        token = await refreshGoogle(decryptSecret(String(conn.refresh_token_enc)));
      } catch (e) {
        googleStatus.refreshError = e instanceof Error ? e.message : String(e);
      }
    }
  }

  const { data: snap } = workspaceId
    ? await supabase
        .from("hq_integration_metric_snapshots")
        .select("metric_date, metrics, created_at")
        .eq("workspace_id", workspaceId)
        .eq("provider", "google")
        .order("metric_date", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  const snapMetrics = (snap?.metrics || {}) as Record<string, unknown>;
  const hqSnapshot = snap
    ? {
        metricDate: snap.metric_date,
        createdAt: snap.created_at,
        gscClicks7d: snapMetrics.gscClicks7d ?? null,
        gscImpressions7d: snapMetrics.gscImpressions7d ?? null,
        gscCtr7d: snapMetrics.gscCtr7d ?? null,
        gscAvgPosition7d: snapMetrics.gscAvgPosition7d ?? null,
        note: "HQ currently sums top-10 query rows for 7d. That undercounts site totals. Do not use as the 28-day baseline.",
      }
    : null;

  const windows: Record<string, unknown> = {};
  if (token) {
    windows.email28d = {
      label: "Reconstructed GSC email window (14 Aug 2026: past 28 days)",
      ...email,
      gsc: await fetchWindowGsc(token, siteUrl, email),
    };
    windows.latest28d = {
      label: "Latest complete-ish 28 days (end = today UTC minus 3 days for GSC lag)",
      ...latest,
      gsc: await fetchWindowGsc(token, siteUrl, latest),
    };
    windows.prior28d = {
      label: "Prior matching 28-day window immediately before latest28d",
      ...prior,
      gsc: await fetchWindowGsc(token, siteUrl, prior),
    };
  }

  let ga4: Record<string, unknown> | null = null;
  if (token && ga4PropertyId) {
    const range = { startDate: latest.startDate, endDate: latest.endDate };
    const organicFilter = {
      filter: {
        fieldName: "sessionSourceMedium",
        stringFilter: { matchType: "EXACT", value: "google / organic" },
      },
    };
    const [sessions, landings, events] = await Promise.all([
      ga4Report(token, ga4PropertyId, {
        dateRanges: [range],
        dimensions: [{ name: "sessionSourceMedium" }],
        metrics: [{ name: "sessions" }, { name: "engagedSessions" }, { name: "screenPageViews" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 15,
      }),
      ga4Report(token, ga4PropertyId, {
        dateRanges: [range],
        dimensions: [{ name: "landingPagePlusQueryString" }],
        metrics: [{ name: "sessions" }],
        dimensionFilter: organicFilter,
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 15,
      }),
      ga4Report(token, ga4PropertyId, {
        dateRanges: [range],
        dimensions: [{ name: "eventName" }],
        metrics: [{ name: "eventCount" }],
        orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
        limit: 25,
      }),
    ]);
    const mapRows = (json: Record<string, unknown>, dims: string[]) =>
      (Array.isArray(json.rows) ? (json.rows as any[]) : []).map((r) => {
        const out: Record<string, unknown> = {};
        dims.forEach((d, i) => {
          out[d] = r.dimensionValues?.[i]?.value || "";
        });
        (r.metricValues || []).forEach((m: { value?: string }, i: number) => {
          out[`m${i}`] = Number(m.value || 0);
        });
        return out;
      });
    ga4 = {
      window: range,
      sourceMedium: sessions.ok
        ? mapRows(sessions.json, ["sessionSourceMedium"]).map((r) => ({
            sourceMedium: r.sessionSourceMedium,
            sessions: r.m0,
            engagedSessions: r.m1,
            pageViews: r.m2,
          }))
        : { error: (sessions.json.error as { message?: string } | undefined)?.message || "failed" },
      googleOrganicLandings: landings.ok
        ? mapRows(landings.json, ["landingPage"]).map((r) => ({
            landingPage: r.landingPage,
            sessions: r.m0,
          }))
        : { error: (landings.json.error as { message?: string } | undefined)?.message || "failed" },
      topEvents: events.ok
        ? mapRows(events.json, ["eventName"]).map((r) => ({ eventName: r.eventName, eventCount: r.m0 }))
        : { error: (events.json.error as { message?: string } | undefined)?.message || "failed" },
    };
  }

  const startIso = `${latest.startDate}T00:00:00.000Z`;
  const endExclusiveIso = `${addDays(latest.endDate, 1)}T00:00:00.000Z`;
  const emailStartIso = `${email.startDate}T00:00:00.000Z`;
  const emailEndExclusiveIso = `${addDays(email.endDate, 1)}T00:00:00.000Z`;

  async function commerceFor(start: string, endEx: string) {
    const [shop, scanner, editorial, views, txs] = await Promise.all([
      countExact(supabase, "user_product_clickouts", "clicked_at", start, endEx),
      countExact(supabase, "scanner_clickouts", "clicked_at", start, endEx),
      countExact(supabase, "editorial_clickouts", "clicked_at", start, endEx),
      countExact(supabase, "user_product_views", "viewed_at", start, endEx),
      supabase
        .from("hq_affiliate_transactions")
        .select("u1, sales_amount, commission_amount, status, transaction_date, click_date, advertiser_name, raw")
        .gte("transaction_date", start)
        .lt("transaction_date", endEx)
        .limit(5000),
    ]);

    const { data: shopRows } = await supabase
      .from("user_product_clickouts")
      .select("user_id, clicked_at")
      .gte("clicked_at", start)
      .lt("clicked_at", endEx)
      .limit(10000);
    const { data: scannerRows } = await supabase
      .from("scanner_clickouts")
      .select("user_id, clicked_at")
      .gte("clicked_at", start)
      .lt("clicked_at", endEx)
      .limit(10000);
    const { data: editorialRows } = await supabase
      .from("editorial_clickouts")
      .select("user_id, clicked_at")
      .gte("clicked_at", start)
      .lt("clicked_at", endEx)
      .limit(10000);

    const userIds = [
      ...new Set(
        [...(shopRows || []), ...(scannerRows || []), ...(editorialRows || [])]
          .map((r: { user_id?: string | null }) => String(r.user_id || ""))
          .filter(Boolean)
      ),
    ];

    const attr = new Map<string, ReturnType<typeof classifyAcquisition>>();
    if (userIds.length) {
      const { data: prefs } = await supabase
        .from("user_preferences")
        .select("user_id, first_touch_source, first_touch_medium, gclid, ttclid, fbclid")
        .in("user_id", userIds)
        .limit(10000);
      for (const p of prefs || []) {
        attr.set(String((p as any).user_id), classifyAcquisition(p as any));
      }
    }

    const buckets = {
      google_organic: 0,
      google_paid: 0,
      other_organic: 0,
      other_paid: 0,
      unknown: 0,
      anonymous: 0,
    };
    const bump = (uid: string | null | undefined) => {
      if (!uid) {
        buckets.anonymous += 1;
        return;
      }
      buckets[attr.get(String(uid)) || "unknown"] += 1;
    };
    for (const r of shopRows || []) bump((r as any).user_id);
    for (const r of scannerRows || []) bump((r as any).user_id);
    for (const r of editorialRows || []) bump((r as any).user_id);

    let commissionAll = 0;
    let salesAll = 0;
    let commissionOrganicUsers = 0;
    let txsAll = 0;
    let txsOrganicUsers = 0;
    const organicUserIds = new Set(
      [...attr.entries()].filter(([, v]) => v === "google_organic" || v === "other_organic").map(([k]) => k)
    );
    for (const row of txs.data || []) {
      const st = String((row as any).status || "").toLowerCase();
      if (st === "demo") continue;
      if ((row as any).raw?.demo) continue;
      txsAll += 1;
      const commission = Number((row as any).commission_amount || 0);
      const sales = Number((row as any).sales_amount || 0);
      commissionAll += commission;
      salesAll += sales;
      const u1 = String((row as any).u1 || "");
      if (u1 && organicUserIds.has(u1)) {
        txsOrganicUsers += 1;
        commissionOrganicUsers += commission;
      }
    }

    return {
      productViews: views,
      retailerClicks: {
        shop: shop.count,
        scanner: scanner.count,
        editorial: editorial.count,
        total: shop.count + scanner.count + editorial.count,
        errors: [shop.error, scanner.error, editorial.error].filter(Boolean),
      },
      retailerClicksByFirstTouch: buckets,
      attributionNote:
        "First-touch on the account, not last-click session. Anonymous clickouts cannot be classified as organic Google. Do not treat all commission as SEO.",
      affiliate: {
        transactions: txsAll,
        salesAmount: salesAll,
        commissionAmount: commissionAll,
        transactionsOnOrganicFirstTouchUsers: txsOrganicUsers,
        commissionOnOrganicFirstTouchUsers: commissionOrganicUsers,
        queryError: txs.error?.message || null,
      },
    };
  }

  const commerce = {
    latest28d: { ...latest, ...(await commerceFor(startIso, endExclusiveIso)) },
    email28d: { ...email, ...(await commerceFor(emailStartIso, emailEndExclusiveIso)) },
  };

  const out = {
    retrievedAt,
    property: {
      searchConsoleSiteUrl: siteUrl,
      ga4PropertyIdSet: Boolean(ga4PropertyId),
      workspaceSlug: "intertexe",
    },
    comparisonRule:
      "Always compare matching 28-day windows (inclusive dates). Do not compare a partial August to a full month. GSC usually lags 2–3 days; latest28d ends today UTC minus 3 days.",
    commercialPath: "Google click → product view → retailer click → affiliate commission",
    nextTarget: "Qualified non-branded clicks and retailer-click revenue, not impressions alone.",
    googleOAuth: googleStatus,
    hqSnapshot,
    windows,
    ga4,
    commerce,
  };

  const artifactDir = join(root, "docs/artifacts");
  mkdirSync(artifactDir, { recursive: true });
  const artifactPath = join(artifactDir, `seo-28d-baseline-${ymd(new Date())}.json`);
  writeFileSync(artifactPath, JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ wrote: artifactPath, googleOAuth: googleStatus, hasWindows: Boolean(token) }, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
