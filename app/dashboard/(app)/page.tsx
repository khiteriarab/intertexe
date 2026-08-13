import Link from "next/link";
import { requireHqSession } from "../../../lib/dashboard/auth";
import { fetchInsightsBundle } from "../../../lib/dashboard/insights";
import { fetchGoogleDiscoveryMetrics, fetchPinterestDiscoveryMetrics, fetchTikTokDiscoveryMetrics, fetchAppStoreDiscoveryMetrics } from "../../../lib/dashboard/integration-metrics";
import {
  buildDeterministicInsights,
  listFounderActions,
  upsertFounderActionsFromInsights,
} from "../../../lib/dashboard/action-center";
import { buildGreeting, buildMorningPulse } from "../../../lib/dashboard/morning-briefing";
import { fetchNightlySyncOps, statusBadgeClass } from "../../../lib/dashboard/catalog-sync-ops";
import { fetchCostSnapshot } from "../../../lib/dashboard/cost-observability";
import { fetchHqCommercePage } from "../../../lib/dashboard/metrics";
import { fetchEmailEngineBundle } from "../../../lib/dashboard/email-engine";
import { fetchPaidAcquisitionReport } from "../../../lib/dashboard/paid-acquisition";
import { fetchContentToday } from "../../../lib/dashboard/content-today";
import { PaidAcquisitionSection } from "../components/PaidAcquisitionSection";
import { formatMoneyUsd } from "../../../lib/dashboard/commerce-intelligence";
import { getServerSupabase } from "../../../lib/supabase-service-client";
import { HqCard, HqPageHeader } from "../components/HqUi";
import { ActionCenterClient } from "./ActionCenterClient";

export const metadata = { title: "Today" };
export const dynamic = "force-dynamic";

function greetingName(fullName: string | null, email: string) {
  if (fullName?.trim()) return fullName.trim().split(/\s+/)[0];
  if (email.includes("@")) return email.split("@")[0];
  return "there";
}

const MISSION_LANES = [
  { href: "/dashboard/acquisition", label: "Acquisition", question: "How are people finding us?" },
  { href: "/dashboard/scanner", label: "Engagement", question: "Do they care once here?" },
  { href: "/dashboard/commerce", label: "Commerce", question: "Are we making money?" },
  { href: "/dashboard/operations", label: "Product", question: "Is the catalog healthy?" },
] as const;

export default async function HqOverviewPage() {
  const session = await requireHqSession();
  const supabase = getServerSupabase();
  const [
    { metrics: m, live },
    commerce,
    syncOps,
    google,
    tiktok,
    pinterest,
    appStore,
    costSnap,
    emailEngine,
    paidAcquisition,
    contentToday,
  ] = await Promise.all([
    fetchInsightsBundle(session.workspaceId),
    fetchHqCommercePage(session.workspaceId),
    fetchNightlySyncOps(),
    fetchGoogleDiscoveryMetrics(session.workspaceId),
    fetchTikTokDiscoveryMetrics(session.workspaceId),
    fetchPinterestDiscoveryMetrics(session.workspaceId),
    fetchAppStoreDiscoveryMetrics(session.workspaceId),
    fetchCostSnapshot(),
    fetchEmailEngineBundle(),
    fetchPaidAcquisitionReport(),
    fetchContentToday(session.workspaceId),
  ]);

  const name = greetingName(session.fullName, session.email);
  const totalClicks7d =
    (m.clickoutsLast7d.value || 0) +
    (m.scannerClickoutsLast7d.value || 0) +
    (m.editorialClickoutsLast7d.value || 0);
  const totalClicksPrev7d =
    (m.clickoutsPrev7d.value || 0) +
    (m.scannerClickoutsPrev7d.value || 0) +
    (m.editorialClickoutsPrev7d.value || 0);

  let catalogHealth: {
    score?: number;
    threshold?: number;
    belowThreshold?: boolean;
    components?: Array<{ key: string; label: string; ok: boolean }>;
    verification?: { recommendation?: string; summary?: string };
    smokeOk?: boolean;
    blocked?: boolean;
    snapshotAgeDays?: number | null;
  } | null = null;

  if (supabase) {
    const [{ data: healthRow }, { data: blockedRow }, { data: snapRow }] = await Promise.all([
      supabase.from("system_status").select("value_json").eq("key", "catalog_health_score").maybeSingle(),
      supabase.from("system_status").select("value_json").eq("key", "catalog_publish_blocked").maybeSingle(),
      supabase
        .from("catalog_product_snapshots")
        .select("captured_at")
        .order("captured_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    const hv = (healthRow?.value_json || {}) as Record<string, unknown>;
    const bv = (blockedRow?.value_json || {}) as { blocked?: boolean };
    const capturedAt = snapRow?.captured_at ? Date.parse(String(snapRow.captured_at)) : NaN;
    const snapshotAgeDays = Number.isFinite(capturedAt)
      ? (Date.now() - capturedAt) / 86400000
      : null;
    catalogHealth = {
      score: typeof hv.score === "number" ? hv.score : undefined,
      threshold: typeof hv.threshold === "number" ? hv.threshold : 95,
      belowThreshold: Boolean(hv.belowThreshold),
      components: Array.isArray(hv.components)
        ? (hv.components as Array<{ key: string; label: string; ok: boolean }>)
        : [],
      verification: (hv.verification as { recommendation?: string; summary?: string }) || undefined,
      smokeOk: typeof hv.smokeOk === "boolean" ? hv.smokeOk : undefined,
      blocked: Boolean(bv.blocked),
      snapshotAgeDays,
    };
  }

  const pulse = buildMorningPulse({
    metrics: m,
    google,
    tiktok,
    pinterest,
    appStore,
    commerce,
    syncLatest: syncOps.latest,
    totalClicks7d,
    totalClicksPrev7d,
    catalogHealth,
  });

  const deterministic = buildDeterministicInsights({
    metrics: m,
    google,
    tiktok,
    pinterest,
    insights: live,
    commerce,
    syncLatest: syncOps.latest,
    totalClicks7d,
    totalClicksPrev7d,
    catalogHealth,
    cost: {
      budgetUsd: costSnap.budgetUsd,
      projectedMonthEndUsd: costSnap.proxy.projectedMonthEndUsd,
      observedSpendUsd: costSnap.proxy.observedSpendUsd,
      warmCronEnabled: costSnap.killSwitches.warmCronEnabled,
      warmCronScheduled: costSnap.killSwitches.warmCronScheduled,
      staleLocks: costSnap.alerts.staleLocks,
      longestJobMs: costSnap.longestJobs[0]?.maxDurationMs || 0,
      longestJobName: costSnap.longestJobs[0]?.job || null,
    },
  });

  let actions: Awaited<ReturnType<typeof listFounderActions>> = [];
  if (supabase) {
    await upsertFounderActionsFromInsights(supabase, session.workspaceId, deterministic);
    actions = await listFounderActions(supabase, session.workspaceId);
  }

  const latest = syncOps.latest;
  const opsNeedsAttention = latest?.status === "failure" || latest?.status === "warning";
  const canAdmin = session.roles.some((r) => r === "founder" || r === "admin");
  const top = actions[0] || null;
  const goal = commerce.revenueGoal;
  const recs = commerce.revenueRecommendations || [];

  return (
    <div>
      <HqPageHeader
        title="Today"
        description="Decide what to do in the next five minutes. Integrations stay in Settings."
      />

      <HqCard className="mb-6">
        <p className="text-[10px] tracking-[0.18em] uppercase text-black/40 mb-2">Founder OS</p>
        <h2 className="text-2xl md:text-3xl font-medium tracking-tight">{buildGreeting(name)}</h2>
        {top ? (
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <p className="text-sm text-black/60 leading-relaxed flex-1">
              <span className="text-black/40">Focus:</span> {top.title}
            </p>
            {top.href ? (
              <a
                href={top.href}
                className="inline-flex justify-center text-[11px] tracking-widest uppercase bg-black text-white px-4 py-2.5 hover:bg-black/85 shrink-0"
              >
                Start now
              </a>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-black/55 mt-3">
            No critical queue — skim the pulse, then move on.
          </p>
        )}
        <p className="text-[11px] text-black/35 mt-4">
          Updated {new Date(m.fetchedAt).toLocaleString()}
          {google.syncedAt ? ` · Web ${new Date(google.syncedAt).toLocaleString()}` : ""}
          {tiktok.syncedAt ? ` · TikTok ${new Date(tiktok.syncedAt).toLocaleString()}` : ""}
          {pinterest.syncedAt ? ` · Pinterest ${new Date(pinterest.syncedAt).toLocaleString()}` : ""}
        </p>
      </HqCard>

      <HqCard className="mb-6" title="$1M revenue path">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-3">
          <div>
            <p className="text-2xl font-medium tabular-nums tracking-tight">
              {goal.mode === "demo" || goal.mode === "disconnected"
                ? "—"
                : formatMoneyUsd(goal.progressUsd)}
              <span className="text-sm font-normal text-black/40">
                {" "}
                / {formatMoneyUsd(goal.goalUsd)}
              </span>
            </p>
            <p className="text-[11px] text-black/45 mt-1">
              {goal.mode === "demo"
                ? "Demo revenue only — connect verified reporting"
                : goal.mode === "disconnected"
                  ? "No verified sales yet — import Rakuten to start the clock"
                  : goal.mode === "ytd"
                    ? `YTD commission · shoppers spent ${formatMoneyUsd(goal.salesYtd ?? goal.sales30d)}${goal.takeRatePct != null ? ` · ${goal.takeRatePct}% take` : ""} · 30d commission ${formatMoneyUsd(goal.commission30d)} · run-rate ${formatMoneyUsd(goal.runRateUsd)}/yr`
                    : `Annualized from 30d commission ${formatMoneyUsd(goal.commission30d)} · shoppers spent ${formatMoneyUsd(goal.sales30d)}${goal.takeRatePct != null ? ` · ${goal.takeRatePct}% take` : ""}${goal.daysToGoal != null ? ` · ~${goal.daysToGoal} days at current pace` : ""}`}
            </p>
          </div>
          <Link
            href="/dashboard/commerce#revenue-goal"
            className="text-[11px] tracking-widest uppercase underline underline-offset-4 shrink-0"
          >
            Commerce detail →
          </Link>
        </div>
        {goal.mode !== "demo" && goal.mode !== "disconnected" ? (
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="border border-black/10 rounded-lg px-3 py-2.5">
              <p className="text-[10px] tracking-widest uppercase text-black/35">Shopper spend</p>
              <p className="text-sm font-medium tabular-nums mt-1">
                {formatMoneyUsd(goal.mode === "ytd" ? (goal.salesYtd ?? goal.sales30d) : goal.sales30d)}
              </p>
              <p className="text-[10px] text-black/40 mt-0.5">
                {goal.mode === "ytd" ? "YTD GMV" : "30d GMV"}
              </p>
            </div>
            <div className="border border-black/10 rounded-lg px-3 py-2.5">
              <p className="text-[10px] tracking-widest uppercase text-black/35">Our commission</p>
              <p className="text-sm font-medium tabular-nums mt-1">
                {formatMoneyUsd(goal.progressUsd)}
              </p>
              <p className="text-[10px] text-black/40 mt-0.5">
                {goal.mode === "ytd" ? "YTD toward $1M" : "annualized toward $1M"}
              </p>
            </div>
          </div>
        ) : null}
        <div className="h-2 rounded-full bg-black/5 overflow-hidden">
          <div
            className="h-full rounded-full bg-black transition-[width]"
            style={{ width: `${Math.min(100, Math.max(0, goal.pct))}%` }}
          />
        </div>
        <p className="text-[11px] text-black/40 mt-2 tabular-nums">{goal.pct}% of $1M commission goal</p>
        <p className="text-[11px] text-black/45 mt-3">
          Diagnose leaks in{" "}
          <Link
            href="/dashboard/commerce#performance-funnel"
            className="underline underline-offset-4"
          >
            scans → views → clicks → sales
          </Link>
          .
        </p>
      </HqCard>

      <HqCard className="mb-6" title="Make money today">
        <p className="text-[11px] text-black/45 mb-3">
          Three concrete moves — each links to an Action Center theme / Commerce surface.
        </p>
        <ol className="space-y-3">
          {recs.map((rec, idx) => (
            <li key={rec.fingerprint} className="border border-black/10 rounded-lg p-3.5">
              <div className="flex items-start gap-3">
                <span className="text-[10px] tracking-widest uppercase text-black/35 tabular-nums pt-0.5">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug">{rec.title}</p>
                  <p className="text-[12px] text-black/55 mt-1 leading-relaxed">{rec.detail}</p>
                  <a
                    href={rec.href}
                    className="inline-block mt-2 text-[11px] tracking-widest uppercase underline underline-offset-4"
                  >
                    Work on this →
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </HqCard>

      <HqCard className="mb-6" title="Action center">
        <ActionCenterClient initialActions={actions} canAdmin={canAdmin} />
      </HqCard>

      <PaidAcquisitionSection report={paidAcquisition} compact />

      <HqCard className="mb-6" title="Email today">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm">
          {emailEngine.today.byProgram.map((row) => (
            <div key={row.emailType} className="flex items-baseline justify-between gap-2 border-b border-black/5 py-1.5">
              <span className="text-black/55">{row.label}</span>
              <span className="tabular-nums font-medium">
                {row.status === "ACTIVE" ? row.sentToday ?? 0 : "—"}
              </span>
            </div>
          ))}
          <div className="flex items-baseline justify-between gap-2 border-b border-black/5 py-1.5">
            <span className="text-black/55">Delivered</span>
            <span className="tabular-nums font-medium">{emailEngine.today.deliveredToday}</span>
          </div>
          <div className="flex items-baseline justify-between gap-2 border-b border-black/5 py-1.5">
            <span className="text-black/55">Bounced</span>
            <span className="tabular-nums font-medium">{emailEngine.today.bouncedToday}</span>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-[11px] text-black/40">
            From <code className="text-[10px]">email_deliveries</code> · UTC day
          </p>
          <Link
            href="/dashboard/email"
            className="text-[11px] tracking-widest uppercase underline underline-offset-4 shrink-0"
          >
            Email Engine →
          </Link>
        </div>
      </HqCard>

      <HqCard className="mb-6" title="Content today">
        <div className="grid grid-cols-2 gap-x-4 text-sm">
          <div className="flex items-baseline justify-between gap-2 border-b border-black/5 py-1.5">
            <span className="text-black/55">Due today</span>
            <span className="tabular-nums font-medium">{contentToday.dueToday}</span>
          </div>
          <div className="flex items-baseline justify-between gap-2 border-b border-black/5 py-1.5">
            <span className="text-black/55">In pipeline</span>
            <span className="tabular-nums font-medium">{contentToday.inPipeline}</span>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-[11px] text-black/40">
            {contentToday.tableReady
              ? "hq_content_items · UTC day"
              : "Apply hq_content_items migration to activate"}
          </p>
          <Link
            href="/dashboard/content"
            className="text-[11px] tracking-widest uppercase underline underline-offset-4 shrink-0"
          >
            Content →
          </Link>
        </div>
      </HqCard>

      <div className="mb-2 flex items-end justify-between gap-3">
        <p className="text-[10px] tracking-[0.18em] uppercase text-black/40">Pulse</p>
        <p className="text-[10px] text-black/35">Today · Trailing 7d · safe WoW deltas</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-8">
        {pulse.map((item) => (
          <Link
            key={`${item.label}-${item.period}`}
            href={item.href || "/dashboard"}
            className={`block rounded-xl border p-3.5 hover:border-black/25 transition-colors ${
              item.attention ? "border-amber-300 bg-amber-50/40" : "border-black/10 bg-white"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] tracking-[0.12em] uppercase text-black/45 truncate">
                {item.label}
              </p>
              {item.period ? (
                <p className="text-[10px] text-black/35 shrink-0">{item.period}</p>
              ) : null}
            </div>
            <p className="text-xl font-medium mt-1.5 tabular-nums">{item.value}</p>
            {item.hint ? (
              <p className="text-[11px] text-black/45 mt-1 leading-snug line-clamp-2">{item.hint}</p>
            ) : null}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
        {MISSION_LANES.map((lane) => (
          <Link
            key={lane.href}
            href={lane.href}
            className="block rounded-xl border border-black/10 bg-white px-3.5 py-3 hover:border-black/25 transition-colors"
          >
            <p className="text-[10px] tracking-[0.14em] uppercase text-black/40">{lane.label}</p>
            <p className="text-sm font-medium mt-1 text-black/85 leading-snug">{lane.question}</p>
          </Link>
        ))}
      </div>

      {opsNeedsAttention && latest ? (
        <HqCard title="Product health" className="border-amber-300">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`text-[11px] tracking-widest uppercase border px-2 py-1 ${statusBadgeClass(
                latest.status
              )}`}
            >
              {latest.displayStatus || latest.status}
            </span>
            <Link
              href="/dashboard/operations"
              className="text-xs tracking-widest uppercase underline underline-offset-4"
            >
              Review sync →
            </Link>
          </div>
        </HqCard>
      ) : null}
    </div>
  );
}
