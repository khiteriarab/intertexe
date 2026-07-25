import type { SupabaseClient } from "@supabase/supabase-js";
import type { GoogleDiscoveryMetrics } from "./integration-metrics";
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
  insights: HqInsight[];
  commerce: {
    revenueConnected?: boolean;
    revenueIsDemo?: boolean;
    commission7d?: number | null;
    unmatchedTx30d?: number | null;
  };
  syncLatest?: NightlySyncRun | null;
  totalClicks7d: number;
  totalClicksPrev7d?: number | null;
}): DeterministicInsight[] {
  const { metrics: m, google, commerce, syncLatest } = input;
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
