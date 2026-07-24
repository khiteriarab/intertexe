import { fetchHqOverviewMetrics, type HqOverviewMetrics } from "./metrics";
import { getServerSupabase } from "../supabase-service-client";

export type HqInsight = {
  key: string;
  title: string;
  explanation: string;
  severity: "info" | "warning" | "critical";
  recommendedAction: string;
  supportingMetric: Record<string, unknown>;
};

export function buildRuleInsights(m: HqOverviewMetrics): HqInsight[] {
  const out: HqInsight[] = [];

  if (m.scansLast7d.value != null && m.scansPrev7d.value != null) {
    const curr = m.scansLast7d.value;
    const prev = m.scansPrev7d.value || 0;
    if (prev > 0) {
      const lift = ((curr - prev) / prev) * 100;
      if (lift >= 20) {
        out.push({
          key: "scans_wow_up",
          title: "Scan activity up week over week",
          explanation: `Scans rose ${lift.toFixed(0)}% vs the prior 7 days (${curr} vs ${prev}).`,
          severity: "info",
          recommendedAction: "Capture the moment with a material editorial tied to the leading fiber.",
          supportingMetric: { scansLast7d: curr, scansPrev7d: prev, liftPct: lift },
        });
      } else if (lift <= -20) {
        out.push({
          key: "scans_wow_down",
          title: "Scan activity down week over week",
          explanation: `Scans fell ${Math.abs(lift).toFixed(0)}% vs the prior 7 days (${curr} vs ${prev}).`,
          severity: "warning",
          recommendedAction: "Check scanner reliability and push a care-label reminder campaign.",
          supportingMetric: { scansLast7d: curr, scansPrev7d: prev, liftPct: lift },
        });
      }
    } else if (curr > 0) {
      out.push({
        key: "scans_new_baseline",
        title: "Scanner baseline established",
        explanation: `${curr} scans in the last 7 days with little prior comparison volume.`,
        severity: "info",
        recommendedAction: "Keep event quality high so Material Intelligence compounds cleanly.",
        supportingMetric: { scansLast7d: curr },
      });
    }
  }

  const clicks7d =
    (m.clickoutsLast7d.value || 0) +
    (m.scannerClickoutsLast7d.value || 0) +
    (m.editorialClickoutsLast7d.value || 0);
  // Note: revenue connection is checked in Executive AI / Commerce; this rule stays until import lands.
  if (clicks7d > 0) {
    out.push({
      key: "clicks_without_revenue",
      title: "Affiliate clicks need revenue reconciliation",
      explanation: `${clicks7d} affiliate clicks in 7 days. Import Rakuten transactions in Commerce to close the loop.`,
      severity: "warning",
      recommendedAction: "Upload the latest Rakuten transaction report under Commerce.",
      supportingMetric: { clicks7d },
    });
  }

  if (m.usersToday.value != null && m.scansToday.value != null) {
    if (m.usersToday.value > 0 && m.scansToday.value === 0) {
      out.push({
        key: "regs_without_scans",
        title: "Registrations without same-day scans",
        explanation: `${m.usersToday.value} new account(s) today and 0 scans so far.`,
        severity: "warning",
        recommendedAction: "Improve onboarding → first-scan prompt in the app.",
        supportingMetric: {
          usersToday: m.usersToday.value,
          scansToday: m.scansToday.value,
        },
      });
    }
  }

  const leading = m.topMaterialsLast30d[0];
  if (leading) {
    out.push({
      key: `material_leader_${leading.material.toLowerCase()}`,
      title: `${leading.material} is leading recent scans`,
      explanation: `${leading.material} tops the 30-day scan sample with ${leading.scans} observations.`,
      severity: "info",
      recommendedAction: `Publish a ${leading.material} editorial and feature matching Natural Fiber rails.`,
      supportingMetric: leading,
    });
  }

  if (m.dppReady.value != null && m.catalogProducts.value != null && m.catalogProducts.value > 0) {
    const pct = (m.dppReady.value / m.catalogProducts.value) * 100;
    if (pct < 5) {
      out.push({
        key: "dpp_coverage_low",
        title: "DPP-ready coverage is still low",
        explanation: `Only ${pct.toFixed(1)}% of active approved products are marked dpp_ready.`,
        severity: "critical",
        recommendedAction: "Prioritize origin + care backfill for top brands selling into the EU.",
        supportingMetric: {
          dppReady: m.dppReady.value,
          catalogProducts: m.catalogProducts.value,
          pct,
        },
      });
    }
  }

  if ((m.collectionsTotal.value || 0) > 0) {
    out.push({
      key: "collections_signal",
      title: "Collections are being created",
      explanation: `${m.collectionsTotal.value} collections exist — historically a retention-positive behavior.`,
      severity: "info",
      recommendedAction: "Measure 30-day retention for collection creators vs non-creators next.",
      supportingMetric: { collections: m.collectionsTotal.value, boards: m.boardsTotal.value },
    });
  }

  if (!out.length) {
    out.push({
      key: "awaiting_volume",
      title: "Waiting for stronger signal volume",
      explanation: "Rule engine is live. Insights densify as scans, clickouts, and accounts grow.",
      severity: "info",
      recommendedAction: "Keep scanner and clickout emitters healthy.",
      supportingMetric: {},
    });
  }

  return out;
}

export async function syncInsightsToDb(workspaceId: string, insights: HqInsight[]) {
  const supabase = getServerSupabase();
  if (!supabase || !workspaceId) return;
  for (const insight of insights.slice(0, 12)) {
    const { data: existing } = await supabase
      .from("hq_generated_insights")
      .select("id, status")
      .eq("workspace_id", workspaceId)
      .eq("title", insight.title)
      .in("status", ["new", "reviewed", "in_progress"])
      .limit(1)
      .maybeSingle();
    if (existing?.id) continue;
    await supabase.from("hq_generated_insights").insert({
      workspace_id: workspaceId,
      title: insight.title,
      explanation: insight.explanation,
      supporting_metric: insight.supportingMetric,
      severity: insight.severity,
      recommended_action: insight.recommendedAction,
      status: "new",
      detected_at: new Date().toISOString(),
    });
  }
}

export async function fetchInsightsBundle(workspaceId: string) {
  const metrics = await fetchHqOverviewMetrics();
  let live = buildRuleInsights(metrics);

  const supabase = getServerSupabase();
  let revenueConnected = false;
  let revenueIsDemo = false;
  if (supabase && workspaceId) {
    const { count: verifiedCount } = await supabase
      .from("hq_affiliate_transactions")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .neq("status", "demo");
    revenueConnected = (verifiedCount || 0) > 0;

    if (!revenueConnected) {
      const { count: demoCount } = await supabase
        .from("hq_affiliate_transactions")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("status", "demo");
      revenueIsDemo = (demoCount || 0) > 0;
    }
  }
  if (revenueIsDemo) {
    live = live.filter((i) => i.key !== "clicks_without_revenue");
    live.unshift({
      key: "revenue_demo_only",
      title: "Revenue is demo data only",
      explanation:
        "Sample Rakuten rows are loaded for UI wiring. They must not drive commercial conclusions.",
      severity: "critical",
      recommendedAction: "Import a verified Rakuten transaction report under Commerce.",
      supportingMetric: {},
    });
  } else if (revenueConnected) {
    live = live.filter((i) => i.key !== "clicks_without_revenue");
    live.unshift({
      key: "revenue_connected",
      title: "Affiliate revenue is flowing",
      explanation: "Rakuten transaction imports are present — Commerce can reconcile clicks to commission.",
      severity: "info",
      recommendedAction: "Ask Executive AI which advertisers drive the most commission this month.",
      supportingMetric: {},
    });
  }

  await syncInsightsToDb(workspaceId, live);

  let stored: any[] = [];
  if (supabase) {
    const { data } = await supabase
      .from("hq_generated_insights")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("detected_at", { ascending: false })
      .limit(40);
    stored = data || [];
  }

  return { metrics, live, stored, revenueConnected, revenueIsDemo };
}

export function buildExecutiveBriefing(
  name: string,
  metrics: HqOverviewMetrics,
  insights: HqInsight[],
  revenue?: { revenueConnected?: boolean; revenueIsDemo?: boolean; commission7d?: number | null }
): string[] {
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const revenueLine = revenue?.revenueIsDemo
    ? "Revenue: demo data only — replace with verified affiliate reporting."
    : revenue?.revenueConnected
      ? `Verified commission (7d): ${
          revenue.commission7d != null
            ? revenue.commission7d.toLocaleString(undefined, {
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 0,
              })
            : "connected"
        }.`
      : "Verified revenue: not connected.";
  const lines = [
    `${hello}, ${name}.`,
    `Scans today: ${metrics.scansToday.value ?? "—"}. Yesterday: ${metrics.scansYesterday.value ?? "—"}.`,
    `Affiliate clicks (7d): ${
      (metrics.clickoutsLast7d.value || 0) +
      (metrics.scannerClickoutsLast7d.value || 0) +
      (metrics.editorialClickoutsLast7d.value || 0)
    }. ${revenueLine}`,
  ];
  if (metrics.topMaterialsLast30d[0]) {
    lines.push(
      `${metrics.topMaterialsLast30d[0].material} leads recent material scans (${metrics.topMaterialsLast30d[0].scans} in sample).`
    );
  }
  const top = insights.filter((i) => i.severity !== "info").slice(0, 2);
  for (const i of top.length ? top : insights.slice(0, 2)) {
    lines.push(`${i.title} — ${i.recommendedAction}`);
  }
  return lines;
}
