/**
 * Catalog promotion safety: gates, production smoke tests, health score, AI verification.
 * Extends existing ops-monitor / action-center — does not replace them.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  collectCatalogCounts,
  latestCatalogSnapshot,
  type SnapshotCounts,
  type CatalogSnapshotHeader,
} from "./catalog-snapshot";

type Untyped = SupabaseClient<any, "public", any>;

export type SmokeCheck = {
  name: string;
  ok: boolean;
  status?: number;
  detail?: string;
  ms: number;
};

export type CatalogHealthComponent = {
  key: string;
  label: string;
  ok: boolean;
  weight: number;
  detail?: string;
};

export type CatalogHealthScore = {
  score: number;
  threshold: number;
  belowThreshold: boolean;
  components: CatalogHealthComponent[];
  checkedAt: string;
};

export type DiffClass = "expected" | "needs_review" | "critical";

export type CatalogDiffFinding = {
  area: string;
  summary: string;
  classification: DiffClass;
  before?: number | string | null;
  after?: number | string | null;
  deltaPct?: number | null;
};

export type AiCatalogVerification = {
  recommendation: "approve" | "review" | "rollback";
  summary: string;
  findings: CatalogDiffFinding[];
  advisory: true;
};

export type PromoteGateResult = {
  ready: boolean;
  blockers: string[];
  warnings: string[];
  counts: SnapshotCounts;
  previous: CatalogSnapshotHeader | null;
};

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  "https://www.intertexe.com";

const HEALTH_THRESHOLD = Number(process.env.CATALOG_HEALTH_SCORE_THRESHOLD || 95);
const MAX_DISPLAYABLE_DROP_PCT = Number(process.env.RAKUTEN_MAX_CATALOG_DROP_PCT || 5);
const MAX_MERCHANT_DROP_PCT = Number(process.env.CATALOG_MAX_MERCHANT_DROP_PCT || 25);
const MAX_BRAND_DROP_PCT = Number(process.env.CATALOG_MAX_BRAND_DROP_PCT || 40);

async function timedFetch(path: string, init?: RequestInit): Promise<SmokeCheck> {
  const name = path;
  const url = path.startsWith("http") ? path : `${SITE.replace(/\/$/, "")}${path}`;
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      ...init,
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
      headers: {
        Accept: "text/html,application/json",
        "User-Agent": "intertexe-catalog-smoke/1.0",
        ...(init?.headers || {}),
      },
    });
    const ms = Date.now() - t0;
    const ok = res.status >= 200 && res.status < 400;
    let detail = `HTTP ${res.status}`;
    if (ok) {
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("json")) {
        const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
        const products = body?.products;
        if (Array.isArray(products) && products.length === 0) {
          return { name, ok: false, status: res.status, detail: "empty products[]", ms };
        }
        if (body && body.ok === false) {
          return { name, ok: false, status: res.status, detail: String(body.error || "ok=false"), ms };
        }
      } else {
        const text = await res.text();
        if (text.length < 200) {
          return { name, ok: false, status: res.status, detail: "response too small", ms };
        }
        if (/Please reload and try again|Directory is updating/i.test(text)) {
          return { name, ok: false, status: res.status, detail: "error/empty UI copy", ms };
        }
      }
      detail = `HTTP ${res.status}`;
    }
    return { name, ok, status: res.status, detail, ms };
  } catch (err) {
    return {
      name,
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
      ms: Date.now() - t0,
    };
  }
}

/** Production smoke: customer surfaces must return real content after promote. */
export async function runCatalogSmokeTests(): Promise<{
  ok: boolean;
  checks: SmokeCheck[];
}> {
  const checks: SmokeCheck[] = [];

  checks.push(await timedFetch("/"));
  checks.push(await timedFetch("/api/catalog?mode=search&q=linen&limit=8&region=us&skipCount=1"));
  checks.push(await timedFetch("/api/catalog?mode=brand&slug=dissh&limit=12&offset=0&region=us&skipCount=1"));
  checks.push(await timedFetch("/api/catalog?mode=collection&slug=white-edit&limit=8&region=us&skipCount=1"));
  checks.push(await timedFetch("/api/sale?limit=12&offset=0&region=us&skipCount=1"));
  checks.push(await timedFetch("/api/catalog?mode=search&q=cotton&limit=4&region=us&skipCount=1"));
  checks.push(await timedFetch("/khiteri"));

  // Product detail: use first sale/search hit when available
  const saleCheck = checks.find((c) => c.name.includes("/api/sale"));
  if (saleCheck?.ok) {
    try {
      const res = await fetch(`${SITE.replace(/\/$/, "")}/api/sale?limit=1&offset=0&region=us&skipCount=1`, {
        signal: AbortSignal.timeout(15000),
        headers: { Accept: "application/json", "User-Agent": "intertexe-catalog-smoke/1.0" },
      });
      const body = (await res.json()) as { products?: Array<{ productId?: string; id?: string }> };
      const pid = body.products?.[0]?.productId || body.products?.[0]?.id;
      if (pid) {
        checks.push(await timedFetch(`/api/catalog?mode=product&id=${encodeURIComponent(String(pid))}&region=us`));
      } else {
        checks.push({ name: "product_detail", ok: false, detail: "no product id from sale", ms: 0 });
      }
    } catch (err) {
      checks.push({
        name: "product_detail",
        ok: false,
        detail: err instanceof Error ? err.message : String(err),
        ms: 0,
      });
    }
  } else {
    checks.push({ name: "product_detail", ok: false, detail: "skipped — sale smoke failed", ms: 0 });
  }

  // Scanner: fiber lookup endpoint if present; otherwise soft-pass with note
  const scanner = await timedFetch("/api/scan/lookup?composition=100%25%20Cotton");
  if (scanner.status === 404) {
    checks.push({
      name: "scanner_lookup",
      ok: true,
      detail: "lookup route absent — skipped",
      ms: scanner.ms,
      status: 404,
    });
  } else {
    checks.push({ ...scanner, name: "scanner_lookup" });
  }

  return { ok: checks.every((c) => c.ok), checks };
}

/** Deterministic promotion gates vs previous snapshot. */
export async function evaluatePromoteGates(
  supabase: Untyped,
  opts?: { requirePrevious?: boolean }
): Promise<PromoteGateResult> {
  const counts = await collectCatalogCounts(supabase);
  const previous = await latestCatalogSnapshot(supabase);
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (opts?.requirePrevious && !previous) {
    blockers.push("No previous catalog snapshot — take a baseline before promote");
  }

  if (counts.displayableCount < 50) {
    blockers.push(`Displayable catalog critically low: ${counts.displayableCount}`);
  }

  if (previous) {
    const prevDisp = previous.displayableCount || 0;
    if (prevDisp > 50) {
      const dropPct = (100 * (prevDisp - counts.displayableCount)) / prevDisp;
      if (dropPct > MAX_DISPLAYABLE_DROP_PCT) {
        blockers.push(
          `Displayable drop ${dropPct.toFixed(1)}% exceeds ${MAX_DISPLAYABLE_DROP_PCT}% (was ${prevDisp}, now ${counts.displayableCount})`
        );
      } else if (dropPct > MAX_DISPLAYABLE_DROP_PCT / 2) {
        warnings.push(`Displayable drop ${dropPct.toFixed(1)}% approaching threshold`);
      }
    }

    const prevMeta = previous.meta || {};
    const prevMerchants = (prevMeta.byMerchant || {}) as Record<string, number>;
    for (const [mid, prevCount] of Object.entries(prevMerchants)) {
      if (prevCount < 50) continue;
      const nowCount = counts.byMerchant[mid] || 0;
      const dropPct = (100 * (prevCount - nowCount)) / prevCount;
      if (dropPct > MAX_MERCHANT_DROP_PCT) {
        blockers.push(
          `Merchant ${mid} drop ${dropPct.toFixed(1)}% (was ${prevCount}, now ${nowCount})`
        );
      }
    }

    const prevBrands = (prevMeta.byBrandTop || []) as Array<{ brand: string; count: number }>;
    const nowBrandMap = Object.fromEntries(counts.byBrandTop.map((b) => [b.brand, b.count]));
    for (const row of prevBrands.slice(0, 20)) {
      if (row.count < 30) continue;
      const nowCount = nowBrandMap[row.brand] || 0;
      const dropPct = (100 * (row.count - nowCount)) / row.count;
      if (dropPct > MAX_BRAND_DROP_PCT) {
        blockers.push(
          `Designer ${row.brand} drop ${dropPct.toFixed(1)}% (was ${row.count}, now ${nowCount})`
        );
      }
    }

    const prevSale = Number(prevMeta.saleCount || 0);
    if (prevSale > 100 && counts.saleCount < prevSale * 0.5) {
      warnings.push(
        `Sale inventory fell sharply: ${prevSale} → ${counts.saleCount}`
      );
    }
  }

  // Publish-blocked flag
  const { data: blockedRow } = await supabase
    .from("system_status")
    .select("value_json")
    .eq("key", "catalog_publish_blocked")
    .maybeSingle();
  const blocked = Boolean((blockedRow?.value_json as { blocked?: boolean } | null)?.blocked);
  if (blocked) {
    blockers.push("system_status.catalog_publish_blocked is true");
  }

  return {
    ready: blockers.length === 0,
    blockers,
    warnings,
    counts,
    previous,
  };
}

/** Single Founder Dashboard health score (0–100). */
export async function computeCatalogHealthScore(
  supabase: Untyped,
  smoke?: { ok: boolean; checks: SmokeCheck[] }
): Promise<CatalogHealthScore> {
  const counts = await collectCatalogCounts(supabase);
  const previous = await latestCatalogSnapshot(supabase);
  const smokeResult = smoke || (await runCatalogSmokeTests());

  const { data: syncRow } = await supabase
    .from("system_status")
    .select("value_json")
    .eq("key", "rakuten_nightly_sync_latest")
    .maybeSingle();
  const syncStatus = String(
    (syncRow?.value_json as { status?: string } | null)?.status || ""
  ).toLowerCase();

  const { count: railCount } = await supabase
    .from("homepage_feed_items")
    // No `id` column on this table — `select('id')` yields a null count.
    .select("rail_key", { count: "exact", head: true });

  const components: CatalogHealthComponent[] = [
    {
      key: "products",
      label: "Products",
      weight: 20,
      ok: counts.displayableCount >= 500,
      detail: `displayable=${counts.displayableCount}`,
    },
    {
      key: "designers",
      label: "Designers",
      weight: 10,
      ok: counts.brandCount >= 50,
      detail: `brands=${counts.brandCount}`,
    },
    {
      key: "merchants",
      label: "Merchants",
      weight: 10,
      ok: counts.merchantCount >= 3,
      detail: `merchants=${counts.merchantCount}`,
    },
    {
      key: "homepage_rails",
      label: "Homepage Rails",
      weight: 10,
      ok: Number(railCount || 0) >= 20,
      detail: `rail_items=${railCount || 0}`,
    },
    {
      key: "materials",
      label: "Materials",
      weight: 5,
      ok: smokeResult.checks.some((c) => c.name.includes("white-edit") && c.ok),
      detail: "collection smoke",
    },
    {
      key: "editorial",
      label: "Editorial",
      weight: 5,
      ok: smokeResult.checks.some((c) => c.name.includes("/khiteri") && c.ok),
      detail: "/khiteri",
    },
    {
      key: "search",
      label: "Search",
      weight: 10,
      ok: smokeResult.checks.some((c) => c.name.includes("mode=search") && c.ok),
    },
    {
      key: "scanner",
      label: "Scanner",
      weight: 5,
      ok: smokeResult.checks.some((c) => c.name.includes("scanner") && c.ok),
    },
    {
      key: "sale",
      label: "Sale",
      weight: 10,
      ok: counts.saleCount >= 50 && smokeResult.checks.some((c) => c.name.includes("/api/sale") && c.ok),
      detail: `sale=${counts.saleCount}`,
    },
    {
      key: "feeds",
      label: "Feeds",
      weight: 15,
      ok: syncStatus !== "failure",
      detail: syncStatus || "unknown",
    },
  ];

  // Snapshot freshness
  if (previous) {
    const ageH = (Date.now() - Date.parse(previous.capturedAt)) / 3600000;
    if (ageH > 72) {
      components.push({
        key: "snapshot",
        label: "Snapshot",
        weight: 5,
        ok: false,
        detail: `age_h=${ageH.toFixed(0)}`,
      });
    } else {
      components.push({
        key: "snapshot",
        label: "Snapshot",
        weight: 5,
        ok: true,
        detail: `age_h=${ageH.toFixed(0)}`,
      });
    }
  } else {
    components.push({
      key: "snapshot",
      label: "Snapshot",
      weight: 5,
      ok: false,
      detail: "missing",
    });
  }

  const totalWeight = components.reduce((s, c) => s + c.weight, 0) || 1;
  const earned = components.reduce((s, c) => s + (c.ok ? c.weight : 0), 0);
  const score = Math.round((100 * earned) / totalWeight);

  return {
    score,
    threshold: HEALTH_THRESHOLD,
    belowThreshold: score < HEALTH_THRESHOLD,
    components,
    checkedAt: new Date().toISOString(),
  };
}

/** Advisory AI-style verification — deterministic classification; does not replace gates. */
export function buildAiCatalogVerification(input: {
  previous: CatalogSnapshotHeader | null;
  counts: SnapshotCounts;
  smokeOk: boolean;
  gates: PromoteGateResult;
  health: CatalogHealthScore;
}): AiCatalogVerification {
  const findings: CatalogDiffFinding[] = [];

  if (input.previous) {
    const prev = input.previous.displayableCount;
    const now = input.counts.displayableCount;
    const deltaPct = prev > 0 ? (100 * (now - prev)) / prev : 0;
    let classification: DiffClass = "expected";
    if (Math.abs(deltaPct) > MAX_DISPLAYABLE_DROP_PCT) classification = "critical";
    else if (Math.abs(deltaPct) > MAX_DISPLAYABLE_DROP_PCT / 2) classification = "needs_review";
    findings.push({
      area: "displayable_products",
      summary: `Displayable ${prev} → ${now} (${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(1)}%)`,
      classification,
      before: prev,
      after: now,
      deltaPct,
    });

    const prevSale = Number(input.previous.meta?.saleCount || 0);
    if (prevSale > 0) {
      const saleDelta = (100 * (input.counts.saleCount - prevSale)) / prevSale;
      findings.push({
        area: "sale_inventory",
        summary: `Sale ${prevSale} → ${input.counts.saleCount}`,
        classification: saleDelta < -50 ? "needs_review" : "expected",
        before: prevSale,
        after: input.counts.saleCount,
        deltaPct: saleDelta,
      });
    }

    const prevMerchants = (input.previous.meta?.byMerchant || {}) as Record<string, number>;
    for (const [mid, prevCount] of Object.entries(prevMerchants)) {
      if (prevCount < 50) continue;
      const nowCount = input.counts.byMerchant[mid] || 0;
      const d = (100 * (nowCount - prevCount)) / prevCount;
      if (d < -MAX_MERCHANT_DROP_PCT) {
        findings.push({
          area: `merchant:${mid}`,
          summary: `Merchant ${mid} ${prevCount} → ${nowCount}`,
          classification: "critical",
          before: prevCount,
          after: nowCount,
          deltaPct: d,
        });
      }
    }
  } else {
    findings.push({
      area: "baseline",
      summary: "No previous snapshot to compare — treat as first baseline",
      classification: "needs_review",
    });
  }

  if (!input.smokeOk) {
    findings.push({
      area: "smoke_tests",
      summary: "One or more production smoke checks failed",
      classification: "critical",
    });
  }

  if (input.health.belowThreshold) {
    findings.push({
      area: "health_score",
      summary: `Catalog Health ${input.health.score}% below ${input.health.threshold}%`,
      classification: "critical",
      after: input.health.score,
    });
  }

  for (const b of input.gates.blockers) {
    findings.push({ area: "gate", summary: b, classification: "critical" });
  }
  for (const w of input.gates.warnings) {
    findings.push({ area: "gate", summary: w, classification: "needs_review" });
  }

  const critical = findings.some((f) => f.classification === "critical");
  const review = findings.some((f) => f.classification === "needs_review");

  let recommendation: AiCatalogVerification["recommendation"] = "approve";
  if (critical || !input.gates.ready || !input.smokeOk) recommendation = "rollback";
  else if (review || input.health.belowThreshold) recommendation = "review";

  const summary =
    recommendation === "approve"
      ? "Catalog delta looks within normal bounds; smoke and gates passed."
      : recommendation === "review"
        ? "Catalog changed in ways that need founder review before trusting nightly automation."
        : "Critical catalog or smoke failure — roll back to previous snapshot and block publish.";

  return { recommendation, summary, findings, advisory: true };
}

/** Persist health + verification for Founder Dashboard / Action Center. */
export async function persistCatalogHealthState(
  supabase: Untyped,
  payload: {
    health: CatalogHealthScore;
    smoke: { ok: boolean; checks: SmokeCheck[] };
    verification: AiCatalogVerification;
    gates: PromoteGateResult;
  }
): Promise<void> {
  const at = new Date().toISOString();
  await supabase.from("system_status").upsert({
    key: "catalog_health_score",
    value_json: {
      ...payload.health,
      smokeOk: payload.smoke.ok,
      smokeChecks: payload.smoke.checks,
      verification: payload.verification,
      gates: {
        ready: payload.gates.ready,
        blockers: payload.gates.blockers,
        warnings: payload.gates.warnings,
      },
      at,
    },
    updated_at: at,
  });
}
