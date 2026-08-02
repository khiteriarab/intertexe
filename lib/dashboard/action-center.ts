import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  GoogleDiscoveryMetrics,
  PinterestDiscoveryMetrics,
  TikTokDiscoveryMetrics,
} from "./integration-metrics";
import type { HqInsight } from "./insights";
import type { NightlySyncRun } from "./catalog-sync-ops";
import type { HqOverviewMetrics } from "./metrics";
import { computePeriodDelta } from "./period-delta";

export type ActionPriority = "critical" | "growth" | "operational" | "monitor";
export type ActionStatus = "open" | "in_progress" | "done" | "cancelled";
export type ActionConfidence = "high" | "medium" | "low";

export type FounderAction = {
  id: string;
  title: string;
  status: ActionStatus;
  priority: ActionPriority;
  category: ActionPriority;
  due_at: string | null;
  snoozed_until: string | null;
  completed_at: string | null;
  assignee_internal_user_id: string | null;
  fingerprint: string | null;
  evidence: Record<string, unknown>;
  expected_impact: string | null;
  href: string | null;
  source: string;
  comparison_period: string | null;
  confidence: ActionConfidence | null;
  created_at: string;
  updated_at: string;
};

export type DeterministicInsight = {
  fingerprint: string;
  title: string;
  whatChanged: string;
  whyItChanged: string;
  attention: string;
  recommendedAction: string;
  evidence: Record<string, unknown>;
  comparisonPeriod: string;
  confidence: ActionConfidence;
  priority: ActionPriority;
  href: string;
  expectedImpact: string;
};

type TaskRow = {
  id: string;
  title: string;
  status: ActionStatus;
  due_at: string | null;
  assignee_internal_user_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

function count(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString();
}

function metaOf(row: TaskRow) {
  return (row.metadata || {}) as Record<string, unknown>;
}

function rowToAction(row: TaskRow): FounderAction {
  const meta = metaOf(row);
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    priority: (meta.priority as ActionPriority) || "monitor",
    category: (meta.category as ActionPriority) || (meta.priority as ActionPriority) || "monitor",
    due_at: row.due_at,
    snoozed_until: typeof meta.snoozed_until === "string" ? meta.snoozed_until : null,
    completed_at: typeof meta.completed_at === "string" ? meta.completed_at : null,
    assignee_internal_user_id: row.assignee_internal_user_id,
    fingerprint: row.entity_id,
    evidence: (meta.evidence as Record<string, unknown>) || {},
    expected_impact: typeof meta.expected_impact === "string" ? meta.expected_impact : null,
    href: typeof meta.href === "string" ? meta.href : null,
    source: typeof meta.source === "string" ? meta.source : "manual",
    comparison_period: typeof meta.comparison_period === "string" ? meta.comparison_period : null,
    confidence: (meta.confidence as ActionConfidence) || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** Deterministic founder insights — no invented causes. */
export function buildDeterministicInsights(input: {
  metrics: HqOverviewMetrics;
  google: GoogleDiscoveryMetrics;
  tiktok?: TikTokDiscoveryMetrics;
  pinterest?: PinterestDiscoveryMetrics;
  insights: HqInsight[];
  commerce: {
    revenueConnected?: boolean;
    revenueIsDemo?: boolean;
    commission7d?: number | null;
    sales7d?: number | null;
    salesToday?: number | null;
    transactionsToday?: number | null;
    unmatchedTx30d?: number | null;
    lastSaleDate?: string | null;
    nullU1Tx30d?: number | null;
    txWithU130d?: number | null;
    editorial7d?: number | null;
    shop7d?: number | null;
    scanner7d?: number | null;
    topRevenueAdvertisers?: Array<{ brand: string; commission: number; sales: number }>;
    categoryPerformance?: Array<{ category: string; sales: number; commission: number; shareOfSales: number }>;
    topProductsByCommission?: Array<{ product: string; brand: string; commission: number; orders: number }>;
  };
  syncLatest?: NightlySyncRun | null;
  totalClicks7d: number;
  totalClicksPrev7d?: number | null;
  catalogHealth?: {
    score?: number;
    threshold?: number;
    belowThreshold?: boolean;
    components?: Array<{ key: string; label: string; ok: boolean }>;
    verification?: { recommendation?: string; summary?: string };
    smokeOk?: boolean;
    blocked?: boolean;
    snapshotAgeDays?: number | null;
  } | null;
  cost?: {
    budgetUsd?: number;
    projectedMonthEndUsd?: number;
    observedSpendUsd?: number;
    warmCronEnabled?: boolean;
    warmCronScheduled?: boolean;
    staleLocks?: boolean;
    longestJobMs?: number;
    longestJobName?: string | null;
  } | null;
}): DeterministicInsight[] {
  const { metrics: m, google, tiktok, pinterest, commerce, syncLatest, catalogHealth, cost } = input;
  const out: DeterministicInsight[] = [];

  const sessionsDelta = google.deltas.sessions7d;
  if (google.connected && sessionsDelta.complete && sessionsDelta.absolute != null) {
    if (sessionsDelta.absolute > 0 && (sessionsDelta.percent == null || sessionsDelta.percent >= 10)) {
      out.push({
        fingerprint: "web_sessions_up_7d",
        title: "Website sessions increased (trailing 7d)",
        whatChanged: `Sessions ${count(sessionsDelta.current)} ${sessionsDelta.label}.`,
        whyItChanged:
          "Cause not attributed yet — GA4 source/medium and Search Console queries show where demand arrived, not why it moved.",
        attention: "Confirm acquisition channels converting into registrations and first scans.",
        recommendedAction:
          "Review Acquisition → Web discovery (sources + landing pages), then compare to Today registrations/scans.",
        evidence: {
          ga4Sessions7d: sessionsDelta.current,
          ga4SessionsPrev7d: sessionsDelta.previous,
          topSource: google.ga4TopSources[0]?.sourceMedium || null,
        },
        comparisonPeriod: "trailing_7d_vs_prior_7d",
        confidence: "high",
        priority: "growth",
        href: "/dashboard/acquisition",
        expectedImpact: "Protect or amplify the channel driving new web demand.",
      });
    } else if (
      sessionsDelta.absolute < 0 &&
      (sessionsDelta.percent == null || sessionsDelta.percent <= -10)
    ) {
      out.push({
        fingerprint: "web_sessions_down_7d",
        title: "Website sessions declined (trailing 7d)",
        whatChanged: `Sessions ${count(sessionsDelta.current)} ${sessionsDelta.label}.`,
        whyItChanged:
          "Decline is measured in GA4; root cause is not proven. Check organic impressions and top sources for supporting evidence.",
        attention: "Web demand soft — risk to top-of-funnel for INTERTEXE.",
        recommendedAction: "Inspect Search Console impressions/CTR and GA4 source/medium for the drop.",
        evidence: {
          ga4Sessions7d: sessionsDelta.current,
          ga4SessionsPrev7d: sessionsDelta.previous,
          gscImpressions7d: google.gscImpressions7d,
          gscImpressionsPrev7d: google.gscImpressionsPrev7d,
        },
        comparisonPeriod: "trailing_7d_vs_prior_7d",
        confidence: "high",
        priority: "critical",
        href: "/dashboard/acquisition",
        expectedImpact: "Recover discovery before downstream scans and commerce soften.",
      });
    }
  }

  const clickDelta = google.deltas.gscClicks7d;
  if (google.connected && clickDelta.complete && (clickDelta.absolute || 0) > 0) {
    out.push({
      fingerprint: "organic_clicks_up_7d",
      title: "Organic search clicks increased",
      whatChanged: `Search clicks ${count(clickDelta.current)} ${clickDelta.label}.`,
      whyItChanged: google.gscTopQueries[0]?.query
        ? `Top query in window: “${google.gscTopQueries[0].query}”. Causation beyond Search Console not claimed.`
        : "Search Console shows higher clicks; query-level driver listed when available.",
      attention: "Organic interest is rising — ensure landing pages and catalog match intent.",
      recommendedAction:
        "Open Acquisition → top queries/pages and feature matching material rails if intent is clear.",
      evidence: {
        gscClicks7d: clickDelta.current,
        gscClicksPrev7d: clickDelta.previous,
        topQuery: google.gscTopQueries[0] || null,
      },
      comparisonPeriod: "trailing_7d_vs_prior_7d",
      confidence: "high",
      priority: "growth",
      href: "/dashboard/acquisition",
      expectedImpact: "Convert organic intent into scans and affiliate clicks.",
    });
  }

  const scanDelta = computePeriodDelta(m.scansLast7d.value, m.scansPrev7d.value, {
    periodLabel: "vs prior 7d",
  });
  if (scanDelta.complete && scanDelta.absolute != null && scanDelta.absolute !== 0) {
    out.push({
      fingerprint: scanDelta.absolute > 0 ? "scans_up_7d" : "scans_down_7d",
      title: scanDelta.absolute > 0 ? "Scans increased (trailing 7d)" : "Scans declined (trailing 7d)",
      whatChanged: `Scans ${count(scanDelta.current)} ${scanDelta.label}.`,
      whyItChanged:
        "Measured from scan_history. Material leader listed when sample exists; campaign cause is not assumed.",
      attention:
        scanDelta.absolute < 0
          ? "Engagement soft — product habit may be slipping."
          : "Engagement strengthening — protect the habit loop.",
      recommendedAction:
        scanDelta.absolute < 0
          ? "Check Engagement recent scans and acquisition web→app handoff."
          : "Review top materials and consider editorial amplification.",
      evidence: {
        scansLast7d: scanDelta.current,
        scansPrev7d: scanDelta.previous,
        topMaterial: m.topMaterialsLast30d[0] || null,
      },
      comparisonPeriod: "trailing_7d_vs_prior_7d",
      confidence: "high",
      priority: scanDelta.absolute < 0 ? "critical" : "growth",
      href: "/dashboard/scanner",
      expectedImpact: "Scans are the core engagement signal for material intelligence.",
    });
  }

  if (commerce.revenueIsDemo) {
    out.push({
      fingerprint: "revenue_demo_only",
      title: "Revenue is demo data only",
      whatChanged: "Commerce shows sample Rakuten rows, not verified affiliate reporting.",
      whyItChanged: "Demo import still present in hq_affiliate_transactions.",
      attention: "Commercial conclusions from revenue are unsafe until replaced.",
      recommendedAction: "Import a verified Rakuten transaction report under Commerce.",
      evidence: { revenueIsDemo: true },
      comparisonPeriod: "current",
      confidence: "high",
      priority: "critical",
      href: "/dashboard/commerce",
      expectedImpact: "Enable trustworthy commission and retailer decisions.",
    });
  } else if (commerce.revenueConnected && !commerce.revenueIsDemo) {
    const salesToday = commerce.salesToday ?? 0;
    const sales7d = commerce.sales7d ?? 0;
    const clicks7d =
      (commerce.editorial7d || 0) + (commerce.shop7d || 0) + (commerce.scanner7d || 0);
    const topAdv = commerce.topRevenueAdvertisers?.[0] || null;
    const nullU1 = commerce.nullU1Tx30d ?? 0;
    const withU1 = commerce.txWithU130d ?? 0;
    const txTotal = nullU1 + withU1;
    const nullU1Rate = txTotal > 0 ? nullU1 / txTotal : 0;

    if (salesToday <= 0) {
      out.push({
        fingerprint: "no_sales_today",
        title: "No verified sales recorded today",
        whatChanged: `Sales today $0 · last sale ${commerce.lastSaleDate || "unknown"} · 7d sales $${Math.round(sales7d).toLocaleString()}.`,
        whyItChanged:
          "Rakuten report lag can delay same-day visibility; still treat a quiet day as a push day until a transaction lands.",
        attention: "Daily sales goal is unmet until a verified transaction appears.",
        recommendedAction: topAdv
          ? `Push ${topAdv.brand} hard today — it led commission in the last 30d. Feature it in /khiteri + shop rails, then recheck Commerce after the afternoon revenue pull.`
          : "Ship one high-intent push today (editorial MyTheresa/shop rail) and verify clickouts have u1 before evening.",
        evidence: {
          salesToday,
          sales7d,
          lastSaleDate: commerce.lastSaleDate,
          topAdvertiser: topAdv,
          editorialClicks7d: commerce.editorial7d ?? null,
        },
        comparisonPeriod: "calendar_today",
        confidence: "medium",
        priority: "critical",
        href: "/dashboard/commerce",
        expectedImpact: "Create a measurable chance at a same-day or next-day affiliate order.",
      });
    }

    if (sales7d <= 0 && clicks7d > 0) {
      out.push({
        fingerprint: "clicks_without_sales_7d",
        title: "Affiliate clicks with zero sales (7d)",
        whatChanged: `${clicks7d.toLocaleString()} clickouts in 7d and $0 verified sales.`,
        whyItChanged:
          "Could be cookie window lag, weak retailer mix, or missing u1/attribution — not proven from this signal alone.",
        attention: "Traffic is not converting into reportable commission.",
        recommendedAction:
          "Prioritize the retailer with historically highest AOV (often MyTheresa), refresh editorial CTAs, and confirm outbound links carry u1.",
        evidence: {
          clicks7d,
          editorial7d: commerce.editorial7d,
          shop7d: commerce.shop7d,
          scanner7d: commerce.scanner7d,
          sales7d,
        },
        comparisonPeriod: "trailing_7d",
        confidence: "medium",
        priority: "growth",
        href: "/dashboard/commerce",
        expectedImpact: "Convert existing demand into commission instead of burning clicks.",
      });
    }

    if (topAdv && (commerce.editorial7d || 0) >= 5 && salesToday <= 0) {
      out.push({
        fingerprint: "double_down_top_advertiser",
        title: `Double down on ${topAdv.brand} today`,
        whatChanged: `${topAdv.brand} leads 30d commission ($${Math.round(topAdv.commission).toLocaleString()}) with ${(commerce.editorial7d || 0).toLocaleString()} editorial clicks in 7d.`,
        whyItChanged:
          "Measured from verified transactions + editorial_clickouts — correlation, not proof that today's push will convert.",
        attention: "Highest-leverage commerce surface is editorial → top advertiser.",
        recommendedAction: `Update /khiteri with fresh ${topAdv.brand} SKUs and share the edit; track clickouts with u1 so the next order joins.`,
        evidence: {
          advertiser: topAdv.brand,
          commission30d: topAdv.commission,
          sales30d: topAdv.sales,
          editorial7d: commerce.editorial7d,
        },
        comparisonPeriod: "trailing_30d_commission",
        confidence: "medium",
        priority: "growth",
        href: "/khiteri",
        expectedImpact: "Exploit the path that already produced large MyTheresa-sized baskets.",
      });
    }

    const shoeCat = commerce.categoryPerformance?.find((c) => c.category === "Shoes");
    if (shoeCat && shoeCat.shareOfSales >= 0.35 && shoeCat.sales > 0) {
      out.push({
        fingerprint: "double_down_shoes",
        title: "Shoes are the money category — lean in",
        whatChanged: `Shoes are ${Math.round(shoeCat.shareOfSales * 100)}% of verified sales ($${Math.round(shoeCat.sales).toLocaleString()}) in the import window.`,
        whyItChanged:
          "Category inferred from product names on verified affiliate rows — directional until catalog category joins are denser.",
        attention: "Apparel-heavy edits may under-index vs what actually pays.",
        recommendedAction:
          "Stock /khiteri and shop rails with sandals, mules, and heels that match sold styles; demote low-RPC apparel.",
        evidence: {
          shareOfSales: shoeCat.shareOfSales,
          sales: shoeCat.sales,
          commission: shoeCat.commission,
          topProduct: commerce.topProductsByCommission?.[0] || null,
        },
        comparisonPeriod: "trailing_30d",
        confidence: "medium",
        priority: "growth",
        href: "/dashboard/commerce#category-performance",
        expectedImpact: "Concentrate inventory and editorial energy where GMV already concentrates.",
      });
    }

    if (txTotal >= 3 && nullU1Rate >= 0.5) {
      out.push({
        fingerprint: "affiliate_u1_blind",
        title: "Most sales lack joinable u1",
        whatChanged: `${nullU1}/${txTotal} transactions in 30d have blank/null u1 — first-touch and user join stay dark.`,
        whyItChanged:
          "Rakuten only returns u1 when the outbound click included it. Editorial was previously shipping raw affiliate URLs.",
        attention: "Cannot exploit what converted without identity on the click.",
        recommendedAction:
          "Confirm shop, scanner, and /khiteri clickouts append u1; re-import revenue and watch null-u1 rate fall.",
        evidence: { nullU1Tx30d: nullU1, txWithU130d: withU1, nullU1Rate },
        comparisonPeriod: "trailing_30d",
        confidence: "high",
        priority: "operational",
        href: "/dashboard/commerce",
        expectedImpact: "Turn anonymous commissions into repeatable growth loops.",
      });
    } else if ((commerce.unmatchedTx30d || 0) > 0) {
      out.push({
        fingerprint: "unmatched_affiliate_tx",
        title: "Unmatched affiliate transactions need investigation",
        whatChanged: `${commerce.unmatchedTx30d} unmatched transactions in 30d.`,
        whyItChanged: "Transactions lack SKU/product join — cause may be feed mapping or missing u1.",
        attention: "Revenue attribution incomplete.",
        recommendedAction: "Investigate unmatched rows in Commerce.",
        evidence: { unmatchedTx30d: commerce.unmatchedTx30d },
        comparisonPeriod: "trailing_30d",
        confidence: "medium",
        priority: "operational",
        href: "/dashboard/commerce",
        expectedImpact: "Improve attributed commission accuracy.",
      });
    }
  } else if ((commerce.unmatchedTx30d || 0) > 0) {
    out.push({
      fingerprint: "unmatched_affiliate_tx",
      title: "Unmatched affiliate transactions need investigation",
      whatChanged: `${commerce.unmatchedTx30d} unmatched transactions in 30d.`,
      whyItChanged: "Transactions lack SKU/product join — cause may be feed mapping or missing u1.",
      attention: "Revenue attribution incomplete.",
      recommendedAction: "Investigate unmatched rows in Commerce.",
      evidence: { unmatchedTx30d: commerce.unmatchedTx30d },
      comparisonPeriod: "trailing_30d",
      confidence: "medium",
      priority: "operational",
      href: "/dashboard/commerce",
      expectedImpact: "Improve attributed commission accuracy.",
    });
  }

  if (syncLatest?.status === "failure") {
    out.push({
      fingerprint: "catalog_sync_failed",
      title: "Nightly catalog sync failed",
      whatChanged: `Latest sync status: ${syncLatest.displayStatus || syncLatest.status}.`,
      whyItChanged: "Failure recorded by ops monitor — root cause is in sync logs, not inferred here.",
      attention: "Product availability and merchandising may be stale.",
      recommendedAction: "Open Product health / Operations and clear the sync failure.",
      evidence: {
        status: syncLatest.status,
        finishedAt: syncLatest.finishedAt || null,
        rejected: syncLatest.rejected ?? null,
      },
      comparisonPeriod: "latest_run",
      confidence: "high",
      priority: "critical",
      href: "/dashboard/operations",
      expectedImpact: "Restore catalog freshness before lost clicks/revenue.",
    });
  } else if (syncLatest?.status === "warning") {
    out.push({
      fingerprint: "catalog_sync_warning",
      title: "Nightly catalog sync finished with warnings",
      whatChanged: `Latest sync status: ${syncLatest.displayStatus || syncLatest.status}.`,
      whyItChanged: "Warnings recorded by ops monitor — inspect logs for rejected files.",
      attention: "Catalog may be partially stale.",
      recommendedAction: "Review Operations warnings and rejected file counts.",
      evidence: {
        status: syncLatest.status,
        rejected: syncLatest.rejected ?? null,
        warnings: syncLatest.warnings || [],
      },
      comparisonPeriod: "latest_run",
      confidence: "high",
      priority: "operational",
      href: "/dashboard/operations",
      expectedImpact: "Keep feed health from degrading availability.",
    });
  }

  if (catalogHealth?.blocked) {
    out.push({
      fingerprint: "catalog_publish_blocked",
      title: "Catalog publish is blocked",
      whatChanged: "Drop guard or post-promote verification blocked catalog changes.",
      whyItChanged: "Deterministic safety gate — live catalog must not shrink unsafely.",
      attention: "Do not re-enable nightly inactive until cleared.",
      recommendedAction: "Open Operations, review catalog_health_score, restore snapshot if needed.",
      evidence: { catalogHealth },
      comparisonPeriod: "current",
      confidence: "high",
      priority: "critical",
      href: "/dashboard/operations",
      expectedImpact: "Prevent another live-catalog wipe.",
    });
  }

  if (catalogHealth?.belowThreshold) {
    out.push({
      fingerprint: "catalog_health_below_threshold",
      title: `Catalog Health ${catalogHealth.score ?? "—"}% (below ${catalogHealth.threshold ?? 95}%)`,
      whatChanged: catalogHealth.verification?.summary || "One or more catalog health components failed.",
      whyItChanged: "Computed from products, designers, merchants, rails, sale, feeds, and smoke tests.",
      attention: "Customer experience may be degraded even if totals look fine.",
      recommendedAction: "Review failing health components, run /api/cron/catalog-promote-verify, consider rollback.",
      evidence: {
        score: catalogHealth.score,
        components: catalogHealth.components || [],
        smokeOk: catalogHealth.smokeOk ?? null,
        recommendation: catalogHealth.verification?.recommendation || null,
      },
      comparisonPeriod: "current",
      confidence: "high",
      priority: "critical",
      href: "/dashboard/operations",
      expectedImpact: "Restore a single health indicator before diving into details.",
    });
  }

  if (
    catalogHealth?.verification?.recommendation === "rollback" ||
    catalogHealth?.verification?.recommendation === "review"
  ) {
    out.push({
      fingerprint: `catalog_ai_verify_${catalogHealth.verification.recommendation}`,
      title:
        catalogHealth.verification.recommendation === "rollback"
          ? "AI catalog verification recommends rollback"
          : "AI catalog verification needs review",
      whatChanged: catalogHealth.verification.summary || "Advisory verification flagged the promotion.",
      whyItChanged: "Advisory second pair of eyes — promotion gates remain deterministic.",
      attention: "Confirm before trusting the new catalog version.",
      recommendedAction:
        catalogHealth.verification.recommendation === "rollback"
          ? "Roll back to previous snapshot and keep publish blocked."
          : "Review diffs in Operations, then approve or roll back.",
      evidence: { verification: catalogHealth.verification },
      comparisonPeriod: "latest_promote",
      confidence: "medium",
      priority: catalogHealth.verification.recommendation === "rollback" ? "critical" : "operational",
      href: "/dashboard/operations",
      expectedImpact: "Catch abnormal catalog deltas that count gates might miss.",
    });
  }

  if (catalogHealth?.snapshotAgeDays != null && catalogHealth.snapshotAgeDays > 2) {
    out.push({
      fingerprint: "catalog_snapshot_stale",
      title: "Catalog LKG snapshot is stale",
      whatChanged: `Last row-level snapshot is ${Math.round(catalogHealth.snapshotAgeDays)} days old.`,
      whyItChanged: "No recent pre-promote snapshot was captured.",
      attention: "Rollback would restore an outdated state.",
      recommendedAction: "Run /api/cron/catalog-snapshot before the next feed cycle.",
      evidence: { snapshotAgeDays: catalogHealth.snapshotAgeDays },
      comparisonPeriod: "current",
      confidence: "high",
      priority: "operational",
      href: "/dashboard/operations",
      expectedImpact: "Guarantee a fresh restore point.",
    });
  }

  if (!google.connected) {
    out.push({
      fingerprint: "google_not_connected",
      title: "Web discovery is dark",
      whatChanged: "Google Analytics / Search Console not connected.",
      whyItChanged: "No OAuth connection for provider=google in this workspace.",
      attention: "Cannot answer how people discover INTERTEXE on the web.",
      recommendedAction: "Connect Google under Settings → Integrations.",
      evidence: { connected: false },
      comparisonPeriod: "current",
      confidence: "high",
      priority: "operational",
      href: "/dashboard/settings",
      expectedImpact: "Illuminate top-of-funnel demand on Today and Acquisition.",
    });
  }

  if (!tiktok?.connected) {
    out.push({
      fingerprint: "tiktok_not_connected",
      title: "TikTok discovery is dark",
      whatChanged: "TikTok Login Kit not connected.",
      whyItChanged: "No OAuth connection for provider=tiktok in this workspace.",
      attention: "Cannot see organic TikTok views feeding the private /khiteri link.",
      recommendedAction: "Connect TikTok under Settings → Integrations, then Sync Now.",
      evidence: { connected: false },
      comparisonPeriod: "current",
      confidence: "high",
      priority: "operational",
      href: "/dashboard/settings",
      expectedImpact: "Measure TikTok reach next to Google on Acquisition and Today.",
    });
  } else {
    const viewsDelta = tiktok.deltas.viewsSample;
    if (
      viewsDelta.complete &&
      viewsDelta.absolute != null &&
      viewsDelta.absolute > 0 &&
      (viewsDelta.percent == null || viewsDelta.percent >= 15)
    ) {
      const top = tiktok.topVideos[0];
      out.push({
        fingerprint: "tiktok_views_up",
        title: "TikTok sample views increased",
        whatChanged: `Sample views ${count(viewsDelta.current)} ${viewsDelta.label}.`,
        whyItChanged: top
          ? `Top video in sample: “${top.title}” (${count(top.viewCount)} views). Cause beyond Display API not claimed.`
          : "Lifetime totals on listed videos rose vs prior sync; posting cadence may also differ.",
        attention: "Organic TikTok demand is rising — push the converting private link while attention is warm.",
        recommendedAction:
          "Review Acquisition → Social discovery (TikTok), then post or reshare the winning angle with the private /khiteri link.",
        evidence: {
          viewsSample: viewsDelta.current,
          viewsSamplePrev: viewsDelta.previous,
          topVideo: top || null,
          videosPosted7d: tiktok.videosPosted7d,
        },
        comparisonPeriod: "vs_prior_sync",
        confidence: "medium",
        priority: "growth",
        href: "/dashboard/acquisition",
        expectedImpact: "Convert TikTok attention into affiliate clickouts and sales.",
      });
    } else if (
      viewsDelta.complete &&
      viewsDelta.absolute != null &&
      viewsDelta.absolute < 0 &&
      (viewsDelta.percent == null || viewsDelta.percent <= -15)
    ) {
      out.push({
        fingerprint: "tiktok_views_down",
        title: "TikTok sample views declined",
        whatChanged: `Sample views ${count(viewsDelta.current)} ${viewsDelta.label}.`,
        whyItChanged:
          "Display API only exposes lifetime views on recent videos — decline may mean weaker recent posts or sample composition change.",
        attention: "TikTok reach soft — risk to the private-link acquisition path.",
        recommendedAction:
          "Check Acquisition → top TikTok videos and ship a fresh post pointing at the private /khiteri link.",
        evidence: {
          viewsSample: viewsDelta.current,
          viewsSamplePrev: viewsDelta.previous,
          videosPosted7d: tiktok.videosPosted7d,
        },
        comparisonPeriod: "vs_prior_sync",
        confidence: "medium",
        priority: "critical",
        href: "/dashboard/acquisition",
        expectedImpact: "Recover TikTok demand before affiliate sales go quiet.",
      });
    }

    if ((tiktok.videosPosted7d ?? 0) === 0 && tiktok.connected) {
      out.push({
        fingerprint: "tiktok_no_posts_7d",
        title: "No TikTok videos posted in 7d",
        whatChanged: `Videos posted (7d): ${count(tiktok.videosPosted7d)} · prior 7d ${count(tiktok.videosPostedPrev7d)}.`,
        whyItChanged: "Measured from create_time on the Display API video list sample.",
        attention: "Quiet posting window on the channel that feeds the private editorial link.",
        recommendedAction: "Publish at least one TikTok with the private /khiteri link today.",
        evidence: {
          videosPosted7d: tiktok.videosPosted7d,
          videosPostedPrev7d: tiktok.videosPostedPrev7d,
        },
        comparisonPeriod: "trailing_7d",
        confidence: "high",
        priority: "growth",
        href: "/dashboard/acquisition",
        expectedImpact: "Keep the TikTok → private link → sale loop alive.",
      });
    }
  }

  if (!pinterest?.connected) {
    out.push({
      fingerprint: "pinterest_not_connected",
      title: "Pinterest discovery is dark",
      whatChanged: "Pinterest Business OAuth not connected.",
      whyItChanged: "No OAuth connection for provider=pinterest in this workspace.",
      attention: "Cannot see organic Pinterest impressions and outbound clicks.",
      recommendedAction: "Connect Pinterest under Settings → Integrations, then Sync Now.",
      evidence: { connected: false },
      comparisonPeriod: "current",
      confidence: "high",
      priority: "operational",
      href: "/dashboard/settings",
      expectedImpact: "Measure Pinterest reach next to Google and TikTok on Acquisition.",
    });
  } else {
    const impDelta = pinterest.deltas.impressions7d;
    if (
      impDelta.complete &&
      impDelta.absolute != null &&
      impDelta.absolute > 0 &&
      (impDelta.percent == null || impDelta.percent >= 15)
    ) {
      const top = pinterest.topPins[0];
      out.push({
        fingerprint: "pinterest_impressions_up",
        title: "Pinterest impressions increased (7d)",
        whatChanged: `Impressions ${count(impDelta.current)} ${impDelta.label}.`,
        whyItChanged: top
          ? `Top pin by impressions: “${top.title || top.pinId}” (${count(top.impression)}). Causation beyond Pinterest analytics not claimed.`
          : "Organic user_account analytics show higher impressions vs prior 7d.",
        attention: "Pinterest demand is rising — lean into pins that drive outbound clicks.",
        recommendedAction:
          "Review Acquisition → Social discovery (Pinterest) and amplify top pins with INTERTEXE product links.",
        evidence: {
          impressions7d: impDelta.current,
          impressionsPrev7d: impDelta.previous,
          outboundClicks7d: pinterest.outboundClicks7d,
          topPin: top || null,
        },
        comparisonPeriod: "trailing_7d_vs_prior_7d",
        confidence: "high",
        priority: "growth",
        href: "/dashboard/acquisition",
        expectedImpact: "Convert Pinterest attention into affiliate clickouts.",
      });
    } else if (
      impDelta.complete &&
      impDelta.absolute != null &&
      impDelta.absolute < 0 &&
      (impDelta.percent == null || impDelta.percent <= -15)
    ) {
      out.push({
        fingerprint: "pinterest_impressions_down",
        title: "Pinterest impressions declined (7d)",
        whatChanged: `Impressions ${count(impDelta.current)} ${impDelta.label}.`,
        whyItChanged: "Measured from Pinterest user_account analytics; root cause not proven here.",
        attention: "Organic Pinterest reach soft.",
        recommendedAction: "Check top pins on Acquisition and refresh underperforming creatives.",
        evidence: {
          impressions7d: impDelta.current,
          impressionsPrev7d: impDelta.previous,
          outboundClicks7d: pinterest.outboundClicks7d,
        },
        comparisonPeriod: "trailing_7d_vs_prior_7d",
        confidence: "high",
        priority: "critical",
        href: "/dashboard/acquisition",
        expectedImpact: "Recover Pinterest discovery before outbound clicks drop further.",
      });
    }
  }

  if (cost) {
    const projected = Number(cost.projectedMonthEndUsd || 0);
    const budget = Number(cost.budgetUsd || 30);
    if (projected > 50) {
      out.push({
        fingerprint: "vercel_projected_spend_over_50",
        title: "Projected Vercel spend exceeds $50",
        whatChanged: `Proxy projected month-end spend is $${projected.toFixed(2)} (budget $${budget.toFixed(0)}).`,
        whyItChanged:
          "Derived from observed job wall-clock durations × assumed 1GB Fluid memory rate. Not a live Vercel invoice line-item.",
        attention: "Infrastructure cost risk.",
        recommendedAction:
          "Confirm WARM_CRON_ENABLED=0, keep warm cron unscheduled, and review longest jobs on Product → Infrastructure.",
        evidence: {
          projectedMonthEndUsd: projected,
          observedSpendUsd: cost.observedSpendUsd ?? null,
          budgetUsd: budget,
          warmCronEnabled: Boolean(cost.warmCronEnabled),
        },
        comparisonPeriod: "month_to_date_proxy",
        confidence: "medium",
        priority: "critical",
        href: "/dashboard/operations",
        expectedImpact: "Prevent another Fluid Provisioned Memory invoice spike.",
      });
    } else if (projected > 30 || projected > budget) {
      out.push({
        fingerprint: "vercel_projected_spend_over_30",
        title: "Projected Vercel spend exceeds $30",
        whatChanged: `Proxy projected month-end spend is $${projected.toFixed(2)} (budget $${budget.toFixed(0)}).`,
        whyItChanged:
          "Derived from observed job wall-clock durations × assumed 1GB Fluid memory rate. Not a live Vercel invoice line-item.",
        attention: "Cost watch.",
        recommendedAction: "Review longest-running crons and keep expensive background work disabled if storefront is healthy.",
        evidence: {
          projectedMonthEndUsd: projected,
          observedSpendUsd: cost.observedSpendUsd ?? null,
          budgetUsd: budget,
        },
        comparisonPeriod: "month_to_date_proxy",
        confidence: "medium",
        priority: "operational",
        href: "/dashboard/operations",
        expectedImpact: "Keep monthly infra near the $20–$30 target band.",
      });
    }

    if (cost.warmCronEnabled || cost.warmCronScheduled) {
      out.push({
        fingerprint: "vercel_warm_cron_enabled",
        title: "Warm cron is enabled — known cost driver",
        whatChanged:
          "WARM_CRON_ENABLED is on and/or /api/cron/warm is scheduled. Prior incident: every-2-minute fan-out to catalog/sale/scan drove Fluid Provisioned Memory.",
        whyItChanged: "Configuration state from cost snapshot kill switches.",
        attention: "Immediate cost risk.",
        recommendedAction: "Set WARM_CRON_ENABLED=0 and keep warm out of vercel.json crons.",
        evidence: {
          warmCronEnabled: Boolean(cost.warmCronEnabled),
          warmCronScheduled: Boolean(cost.warmCronScheduled),
        },
        comparisonPeriod: "config",
        confidence: "high",
        priority: "critical",
        href: "/dashboard/operations",
        expectedImpact: "Eliminate the primary provisioned-memory amplifier.",
      });
    }

    if (cost.staleLocks) {
      out.push({
        fingerprint: "vercel_stale_job_lock",
        title: "Stale background job lock detected",
        whatChanged: "A job_lock:* row is older than its maxAgeMs — a prior run may have crashed without releasing.",
        whyItChanged: "Lock age exceeds configured max from job-guard.",
        attention: "Possible stuck or overlapping cron.",
        recommendedAction: "Inspect Product → Infrastructure locks and clear the stale lock if the job is not running.",
        evidence: { staleLocks: true },
        comparisonPeriod: "live",
        confidence: "high",
        priority: "operational",
        href: "/dashboard/operations",
        expectedImpact: "Prevent overlapping Fluid instances from stacking memory charges.",
      });
    }

    if ((cost.longestJobMs || 0) >= 60_000) {
      out.push({
        fingerprint: "vercel_long_running_job",
        title: "A background job ran longer than 60s",
        whatChanged: `${cost.longestJobName || "unknown"} max duration ${Math.round(
          (cost.longestJobMs || 0) / 1000
        )}s.`,
        whyItChanged:
          "Wall-clock duration is billed as Fluid Provisioned Memory even while waiting on Supabase/HTTP/FTP.",
        attention: "Long I/O-bound job.",
        recommendedAction: "Cap retries, add checkpoints, or move the workload off Vercel Functions.",
        evidence: {
          job: cost.longestJobName || null,
          maxDurationMs: cost.longestJobMs || null,
        },
        comparisonPeriod: "observed_jobs",
        confidence: "high",
        priority: "operational",
        href: "/dashboard/operations",
        expectedImpact: "Reduce GB-hours from I/O waits.",
      });
    }
  }

  for (const i of input.insights.filter((x) => x.severity === "critical").slice(0, 2)) {
    out.push({
      fingerprint: `rule_${i.key}`,
      title: i.title,
      whatChanged: i.explanation,
      whyItChanged: "Raised by deterministic product rules from overview metrics.",
      attention: i.title,
      recommendedAction: i.recommendedAction,
      evidence: i.supportingMetric || {},
      comparisonPeriod: "rule_window",
      confidence: "medium",
      priority: "monitor",
      href: "/dashboard/insights",
      expectedImpact: "Surface secondary product risks.",
    });
  }

  return out;
}

const PRIORITY_RANK: Record<ActionPriority, number> = {
  critical: 0,
  growth: 1,
  operational: 2,
  monitor: 3,
};

/**
 * Persist actions on existing hq_tasks using metadata + entity_id fingerprint.
 * Column migration 20260725_hq_founder_action_center.sql remains optional hardening.
 */
export async function upsertFounderActionsFromInsights(
  supabase: SupabaseClient,
  workspaceId: string,
  insights: DeterministicInsight[]
) {
  for (const insight of insights) {
    if (insight.priority === "monitor") continue;

    const { data: existing } = await supabase
      .from("hq_tasks")
      .select("id, status, metadata, entity_id")
      .eq("workspace_id", workspaceId)
      .eq("entity_type", "founder_action")
      .eq("entity_id", insight.fingerprint)
      .maybeSingle();

    const existingMeta = ((existing as TaskRow | null)?.metadata || {}) as Record<string, unknown>;
    if (existing?.id) {
      if (existing.status === "done" || existing.status === "cancelled") continue;
      const snoozed = existingMeta.snoozed_until;
      if (typeof snoozed === "string" && Date.parse(snoozed) > Date.now()) continue;
      await supabase
        .from("hq_tasks")
        .update({
          title: insight.title,
          metadata: {
            ...existingMeta,
            priority: insight.priority,
            category: insight.priority,
            evidence: {
              ...insight.evidence,
              whatChanged: insight.whatChanged,
              whyItChanged: insight.whyItChanged,
              attention: insight.attention,
              recommendedAction: insight.recommendedAction,
            },
            expected_impact: insight.expectedImpact,
            href: insight.href,
            source: "rule",
            comparison_period: insight.comparisonPeriod,
            confidence: insight.confidence,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("hq_tasks").insert({
        workspace_id: workspaceId,
        title: insight.title,
        status: "open",
        due_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        entity_type: "founder_action",
        entity_id: insight.fingerprint,
        metadata: {
          priority: insight.priority,
          category: insight.priority,
          evidence: {
            ...insight.evidence,
            whatChanged: insight.whatChanged,
            whyItChanged: insight.whyItChanged,
            attention: insight.attention,
            recommendedAction: insight.recommendedAction,
          },
          expected_impact: insight.expectedImpact,
          href: insight.href,
          source: "rule",
          comparison_period: insight.comparisonPeriod,
          confidence: insight.confidence,
        },
      });
    }
  }
}

export async function listFounderActions(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<FounderAction[]> {
  const { data, error } = await supabase
    .from("hq_tasks")
    .select(
      "id, title, status, due_at, assignee_internal_user_id, entity_type, entity_id, metadata, created_at, updated_at"
    )
    .eq("workspace_id", workspaceId)
    .eq("entity_type", "founder_action")
    .order("updated_at", { ascending: false })
    .limit(80);
  if (error) throw new Error(error.message);
  const rows = (data || []) as TaskRow[];
  return rows
    .map(rowToAction)
    .filter((r) => {
      if (r.status === "done" || r.status === "cancelled") return false;
      if (r.snoozed_until && Date.parse(r.snoozed_until) > Date.now()) return false;
      return true;
    })
    .sort((a, b) => {
      const pa = PRIORITY_RANK[a.priority] ?? 9;
      const pb = PRIORITY_RANK[b.priority] ?? 9;
      if (pa !== pb) return pa - pb;
      return Date.parse(b.updated_at) - Date.parse(a.updated_at);
    });
}

export async function updateFounderAction(
  supabase: SupabaseClient,
  workspaceId: string,
  actionId: string,
  patch: {
    status?: ActionStatus;
    snoozed_until?: string | null;
    assignee_internal_user_id?: string | null;
  }
) {
  const { data: existing, error: loadErr } = await supabase
    .from("hq_tasks")
    .select("id, metadata, status")
    .eq("workspace_id", workspaceId)
    .eq("id", actionId)
    .eq("entity_type", "founder_action")
    .maybeSingle();
  if (loadErr) throw new Error(loadErr.message);
  if (!existing) return null;

  const meta = { ...((existing.metadata || {}) as Record<string, unknown>) };
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.status) {
    updates.status = patch.status;
    meta.completed_at = patch.status === "done" ? new Date().toISOString() : null;
  }
  if ("snoozed_until" in patch) meta.snoozed_until = patch.snoozed_until;
  if ("assignee_internal_user_id" in patch) {
    updates.assignee_internal_user_id = patch.assignee_internal_user_id;
  }
  updates.metadata = meta;

  const { data, error } = await supabase
    .from("hq_tasks")
    .update(updates)
    .eq("workspace_id", workspaceId)
    .eq("id", actionId)
    .select(
      "id, title, status, due_at, assignee_internal_user_id, entity_type, entity_id, metadata, created_at, updated_at"
    )
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToAction(data as TaskRow) : null;
}
