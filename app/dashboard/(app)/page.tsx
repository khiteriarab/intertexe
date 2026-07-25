import Link from "next/link";
import { requireHqSession } from "../../../lib/dashboard/auth";
import { fetchInsightsBundle } from "../../../lib/dashboard/insights";
import { fetchGoogleDiscoveryMetrics } from "../../../lib/dashboard/integration-metrics";
import {
  buildGreeting,
  buildMorningHighlights,
  buildMorningPulse,
} from "../../../lib/dashboard/morning-briefing";
import {
  fetchNightlySyncOps,
  formatDuration,
  statusBadgeClass,
} from "../../../lib/dashboard/catalog-sync-ops";
import { fetchHqCommercePage, formatCount } from "../../../lib/dashboard/metrics";
import { HqCard, HqPageHeader } from "../components/HqUi";

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

  const pulse = buildMorningPulse({
    metrics: m,
    google,
    commerce,
    syncLatest: syncOps.latest,
    totalClicks7d,
  });
  const highlights = buildMorningHighlights({
    metrics: m,
    google,
    insights: live,
    commerce,
    syncLatest: syncOps.latest,
    totalClicks7d,
  });

  const latest = syncOps.latest;
  const opsNeedsAttention =
    latest?.status === "failure" || latest?.status === "warning";

  return (
    <div>
      <HqPageHeader
        title="Today"
        description="How is INTERTEXE performing — growth, engagement, commerce, and product health. Integrations stay in Settings; this page answers the mission."
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
          Read the pulse, then the highlights. Drill into Acquisition, Engagement, Commerce, or Product when a
          number needs a decision.
        </p>
      </HqCard>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {pulse.map((item) => (
          <Link
            key={item.label}
            href={item.href || "/dashboard"}
            className="block bg-white border border-black/10 rounded-xl p-4 hover:border-black/25 transition-colors"
          >
            <p className="text-[10px] tracking-[0.14em] uppercase text-black/45">{item.label}</p>
            <p className="text-2xl font-medium mt-2 tabular-nums">{item.value}</p>
            {item.hint ? <p className="text-xs text-black/45 mt-1">{item.hint}</p> : null}
          </Link>
        ))}
      </div>

      <HqCard className="mb-6" title="Highlights">
        <ul className="space-y-3">
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
              <div>
                <p className="text-black/80">{h.text}</p>
                {h.href ? (
                  <Link
                    href={h.href}
                    className="inline-block mt-1 text-[11px] tracking-widest uppercase text-black/45 hover:text-black underline-offset-2 hover:underline"
                  >
                    Open →
                  </Link>
                ) : null}
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

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <HqCard title="Engagement signal (30d materials)">
          {m.topMaterialsLast30d.length ? (
            <ul className="space-y-2 text-sm">
              {m.topMaterialsLast30d.slice(0, 5).map((row) => (
                <li key={row.material} className="flex justify-between gap-3">
                  <span>{row.material}</span>
                  <span className="tabular-nums text-black/60">{row.scans}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-black/50">No fiber_primary sample yet.</p>
          )}
          <Link
            href="/dashboard/scanner"
            className="inline-block mt-4 text-xs tracking-widest uppercase underline underline-offset-4"
          >
            Engagement / Scanner →
          </Link>
        </HqCard>

        <HqCard title="Recent scans">
          {m.recentScans.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-[10px] uppercase tracking-wider text-black/40">
                  <tr>
                    <th className="py-2 pr-3 font-medium">When</th>
                    <th className="py-2 pr-3 font-medium">Brand</th>
                    <th className="py-2 font-medium">Material</th>
                  </tr>
                </thead>
                <tbody>
                  {m.recentScans.slice(0, 6).map((s) => (
                    <tr key={s.id} className="border-t border-black/5">
                      <td className="py-2 pr-3 text-black/50 whitespace-nowrap">
                        {s.scanned_at ? new Date(s.scanned_at).toLocaleString() : "—"}
                      </td>
                      <td className="py-2 pr-3">{s.brand || "—"}</td>
                      <td className="py-2">{s.fiber_primary || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-black/50">No recent scans returned.</p>
          )}
        </HqCard>
      </div>

      <HqCard
        title="Product health"
        className={opsNeedsAttention ? "border-amber-300" : undefined}
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
              Full sync history & founder reports →
            </Link>
          </div>
        ) : (
          <p className="text-sm text-black/50">
            Awaiting first monitored nightly run.{" "}
            <Link href="/dashboard/operations" className="underline underline-offset-2">
              Operations →
            </Link>
          </p>
        )}
      </HqCard>
    </div>
  );
}
