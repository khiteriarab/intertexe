import Link from "next/link";
import { requireHqSession } from "../../../lib/dashboard/auth";
import { fetchInsightsBundle } from "../../../lib/dashboard/insights";
import { fetchGoogleDiscoveryMetrics } from "../../../lib/dashboard/integration-metrics";
import {
  buildDeterministicInsights,
  listFounderActions,
  upsertFounderActionsFromInsights,
} from "../../../lib/dashboard/action-center";
import { buildGreeting, buildMorningPulse, insightToHighlight } from "../../../lib/dashboard/morning-briefing";
import {
  fetchNightlySyncOps,
  formatDuration,
  statusBadgeClass,
} from "../../../lib/dashboard/catalog-sync-ops";
import { fetchHqCommercePage, formatCount } from "../../../lib/dashboard/metrics";
import { getServerSupabase } from "../../../lib/supabase-service-client";
import { HqCard, HqPageHeader } from "../components/HqUi";
import { ActionCenterClient } from "./ActionCenterClient";

export const metadata = { title: "Morning Briefing" };
export const dynamic = "force-dynamic";

function greetingName(fullName: string | null, email: string) {
  if (fullName?.trim()) return fullName.trim().split(/\s+/)[0];
  if (email.includes("@")) return email.split("@")[0];
  return "there";
}

const MISSION_LANES = [
  {
    href: "/dashboard/acquisition",
    question: "How are people discovering INTERTEXE?",
    label: "Acquisition",
    blurb: "Website sessions, organic search, first-touch revenue.",
  },
  {
    href: "/dashboard/scanner",
    question: "Once they arrive, do they care?",
    label: "Engagement",
    blurb: "Scans, favorites, collections, return behavior.",
  },
  {
    href: "/dashboard/commerce",
    question: "Is the business making money?",
    label: "Commerce",
    blurb: "Affiliate clicks, commission, retailers, brands.",
  },
  {
    href: "/dashboard/operations",
    question: "Is the catalog healthy?",
    label: "Product",
    blurb: "Nightly sync, feed health, failed imports.",
  },
] as const;

export default async function HqOverviewPage() {
  const session = await requireHqSession();
  const supabase = getServerSupabase();
  const [{ metrics: m, live }, commerce, syncOps, google] = await Promise.all([
    fetchInsightsBundle(session.workspaceId),
    fetchHqCommercePage(session.workspaceId),
    fetchNightlySyncOps(),
    fetchGoogleDiscoveryMetrics(session.workspaceId),
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

  const pulse = buildMorningPulse({
    metrics: m,
    google,
    commerce,
    syncLatest: syncOps.latest,
    totalClicks7d,
    totalClicksPrev7d,
  });

  const deterministic = buildDeterministicInsights({
    metrics: m,
    google,
    insights: live,
    commerce,
    syncLatest: syncOps.latest,
    totalClicks7d,
    totalClicksPrev7d,
  });

  let actions: Awaited<ReturnType<typeof listFounderActions>> = [];
  if (supabase) {
    await upsertFounderActionsFromInsights(supabase, session.workspaceId, deterministic);
    actions = await listFounderActions(supabase, session.workspaceId);
  }

  const highlights = deterministic.slice(0, 7).map(insightToHighlight);
  const latest = syncOps.latest;
  const opsNeedsAttention = latest?.status === "failure" || latest?.status === "warning";
  const canAdmin = session.roles.some((r) => r === "founder" || r === "admin");

  return (
    <div>
      <HqPageHeader
        title="Today"
        description="Founder operating system for INTERTEXE — what changed, why it matters, what needs attention, and what to do next. Not a client SaaS dashboard."
        action={
          <a
            href="/api/dashboard/export?kind=overview"
            className="text-xs tracking-widest uppercase border border-black/15 px-3 py-2 hover:bg-black hover:text-white"
          >
            Export overview CSV
          </a>
        }
      />

      {commerce.revenueIsDemo ? (
        <div className="mb-6 border border-amber-700/30 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="text-[10px] tracking-[0.18em] uppercase text-amber-800/80 mb-1">Demo data</p>
          <p className="font-medium">Sample Rakuten rows are present and are not verified affiliate reporting.</p>
          <p className="text-amber-900/70 mt-1">
            <Link href="/dashboard/commerce" className="underline underline-offset-2">
              Replace with verified affiliate reporting →
            </Link>
          </p>
        </div>
      ) : null}

      <HqCard className="mb-6">
        <p className="text-[10px] tracking-[0.18em] uppercase text-black/40 mb-2">Morning briefing</p>
        <h2 className="text-2xl md:text-3xl font-medium tracking-tight">{buildGreeting(name)}</h2>
        <p className="text-sm text-black/55 mt-2 max-w-2xl leading-relaxed">
          Pulse uses explicit windows (Today / Trailing 7d). Week-over-week deltas omit % when the prior
          period is zero or incomplete.
        </p>
      </HqCard>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {pulse.map((item) => (
          <Link
            key={`${item.label}-${item.period}`}
            href={item.href || "/dashboard"}
            className="block bg-white border border-black/10 rounded-xl p-4 hover:border-black/25 transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] tracking-[0.14em] uppercase text-black/45">{item.label}</p>
              {item.period ? (
                <p className="text-[10px] tracking-[0.12em] uppercase text-black/35">{item.period}</p>
              ) : null}
            </div>
            <p className="text-2xl font-medium mt-2 tabular-nums">{item.value}</p>
            {item.hint ? <p className="text-xs text-black/45 mt-1 leading-snug">{item.hint}</p> : null}
          </Link>
        ))}
      </div>

      <HqCard className="mb-6" title="Action center">
        <p className="text-sm text-black/55 mb-4 leading-relaxed">
          Prioritized queue for running INTERTEXE — Critical, Growth, Operational, Monitor. Metrics tell
          you what happened; this is where you act.
        </p>
        <ActionCenterClient initialActions={actions} canAdmin={canAdmin} />
      </HqCard>

      <HqCard className="mb-6" title="Highlights">
        <ul className="space-y-4">
          {highlights.map((h) => (
            <li key={h.key} className="flex gap-3 text-sm leading-relaxed">
              <span
                className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                  h.tone === "attention"
                    ? "bg-red-600"
                    : h.tone === "positive"
                      ? "bg-emerald-600"
                      : "bg-black/35"
                }`}
                aria-hidden
              />
              <div className="min-w-0">
                <p className="font-medium text-black/85">{h.detail.title}</p>
                <p className="text-black/60 mt-1">
                  <span className="text-black/40">What changed:</span> {h.detail.whatChanged}
                </p>
                <p className="text-black/60 mt-1">
                  <span className="text-black/40">Why:</span> {h.detail.whyItChanged}
                </p>
                <p className="text-black/60 mt-1">
                  <span className="text-black/40">Attention:</span> {h.detail.attention}
                </p>
                <p className="text-black/70 mt-1">
                  <span className="text-black/40">Next:</span> {h.detail.recommendedAction}
                </p>
                <p className="text-[11px] text-black/40 mt-2">
                  Confidence {h.detail.confidence} · {h.detail.comparisonPeriod.replace(/_/g, " ")}
                  {h.href ? (
                    <>
                      {" · "}
                      <Link href={h.href} className="underline underline-offset-2 hover:text-black">
                        Open section
                      </Link>
                    </>
                  ) : null}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-black/35 mt-5">
          Updated {new Date(m.fetchedAt).toLocaleString()}
          {google.syncedAt ? ` · Web metrics ${new Date(google.syncedAt).toLocaleString()}` : ""}
        </p>
      </HqCard>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {MISSION_LANES.map((lane) => (
          <Link
            key={lane.href}
            href={lane.href}
            className="block bg-white border border-black/10 rounded-xl p-5 hover:border-black/25 transition-colors"
          >
            <p className="text-[10px] tracking-[0.14em] uppercase text-black/40">{lane.label}</p>
            <p className="text-base font-medium mt-2 text-black/90">{lane.question}</p>
            <p className="text-sm text-black/50 mt-2 leading-relaxed">{lane.blurb}</p>
          </Link>
        ))}
      </div>

      <HqCard
        title="Product health"
        className={opsNeedsAttention ? "border-amber-300 mb-6" : "mb-6"}
      >
        {latest ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`text-[11px] tracking-widest uppercase border px-2 py-1 ${statusBadgeClass(
                  latest.status
                )}`}
              >
                {latest.displayStatus || latest.status}
              </span>
              <span className="text-xs text-black/45">
                Last run {latest.finishedAt ? new Date(latest.finishedAt).toUTCString() : "—"}
              </span>
              <span className="text-xs text-black/45">Duration {formatDuration(latest.durationMs)}</span>
            </div>
            <p className="text-sm text-black/60">
              {formatCount(latest.filesProcessed ?? null)} files processed ·{" "}
              {formatCount(latest.designersSynced ?? null)} designers ·{" "}
              {formatCount(latest.rejected ?? null)} rejected
            </p>
            <Link
              href="/dashboard/operations"
              className="inline-block text-xs tracking-widest uppercase underline underline-offset-4"
            >
              Full sync history →
            </Link>
          </div>
        ) : (
          <p className="text-sm text-black/50">Awaiting first monitored nightly run.</p>
        )}
      </HqCard>
    </div>
  );
}
