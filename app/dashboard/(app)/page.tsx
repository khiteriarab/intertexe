import Link from "next/link";
import { requireHqSession } from "../../../lib/dashboard/auth";
import { fetchInsightsBundle } from "../../../lib/dashboard/insights";
import { fetchGoogleDiscoveryMetrics, fetchTikTokDiscoveryMetrics } from "../../../lib/dashboard/integration-metrics";
import {
  buildDeterministicInsights,
  listFounderActions,
  upsertFounderActionsFromInsights,
} from "../../../lib/dashboard/action-center";
import { buildGreeting, buildMorningPulse } from "../../../lib/dashboard/morning-briefing";
import { fetchNightlySyncOps, statusBadgeClass } from "../../../lib/dashboard/catalog-sync-ops";
import { fetchHqCommercePage } from "../../../lib/dashboard/metrics";
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
  const [{ metrics: m, live }, commerce, syncOps, google, tiktok] = await Promise.all([
    fetchInsightsBundle(session.workspaceId),
    fetchHqCommercePage(session.workspaceId),
    fetchNightlySyncOps(),
    fetchGoogleDiscoveryMetrics(session.workspaceId),
    fetchTikTokDiscoveryMetrics(session.workspaceId),
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
    tiktok,
    commerce,
    syncLatest: syncOps.latest,
    totalClicks7d,
    totalClicksPrev7d,
  });

  const deterministic = buildDeterministicInsights({
    metrics: m,
    google,
    tiktok,
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

  const latest = syncOps.latest;
  const opsNeedsAttention = latest?.status === "failure" || latest?.status === "warning";
  const canAdmin = session.roles.some((r) => r === "founder" || r === "admin");
  const top = actions[0] || null;

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
        </p>
      </HqCard>

      <HqCard className="mb-6" title="Action center">
        <ActionCenterClient initialActions={actions} canAdmin={canAdmin} />
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
