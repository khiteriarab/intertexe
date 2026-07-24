import { requireHqSession } from "../../../lib/dashboard/auth";
import {
  buildExecutiveBriefing,
  fetchInsightsBundle,
} from "../../../lib/dashboard/insights";
import { formatCount, formatDelta } from "../../../lib/dashboard/metrics";
import { HqCard, HqPageHeader } from "../components/HqUi";

export const metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

function greetingName(fullName: string | null, email: string) {
  if (fullName?.trim()) return fullName.trim().split(/\s+/)[0];
  if (email.includes("@")) return email.split("@")[0];
  return "there";
}

function line(label: string, value: number | null, hint?: string | null) {
  return (
    <li className="flex items-baseline justify-between gap-3">
      <span>{label}</span>
      <span className="tabular-nums font-medium text-black/85">
        {formatCount(value)}
        {hint ? <span className="ml-2 text-xs font-normal text-black/40">{hint}</span> : null}
      </span>
    </li>
  );
}

export default async function HqOverviewPage() {
  const session = await requireHqSession();
  const { metrics: m, live } = await fetchInsightsBundle(session.workspaceId);
  const name = greetingName(session.fullName, session.email);
  const briefing = buildExecutiveBriefing(name, m, live);

  const scanWow = formatDelta(m.scansLast7d.value, m.scansPrev7d.value);
  const totalClicks7d =
    (m.clickoutsLast7d.value || 0) +
    (m.scannerClickoutsLast7d.value || 0) +
    (m.editorialClickoutsLast7d.value || 0);

  const leadingMaterial = m.topMaterialsLast30d[0];
  const actions = live.slice(0, 4).map((i) => i.recommendedAction);

  return (
    <div>
      <HqPageHeader
        title="Command center"
        description="Live signals from scans, consumers, and affiliate clickouts. Revenue stays blank until Rakuten reports are connected."
        action={
          <a
            href="/api/dashboard/export?kind=overview"
            className="text-xs tracking-widest uppercase border border-black/15 px-3 py-2 hover:bg-black hover:text-white"
          >
            Export overview CSV
          </a>
        }
      />

      <HqCard className="mb-6">
        <p className="text-[10px] tracking-[0.18em] uppercase text-black/40 mb-3">Daily briefing</p>
        <h2 className="text-2xl md:text-3xl font-medium tracking-tight">
          {briefing[0]}
        </h2>
        <p className="text-sm text-black/55 mt-3 max-w-2xl leading-relaxed">
          {briefing.slice(1).join(" ")}
        </p>

        <div className="mt-8 grid md:grid-cols-3 gap-6 border-t border-black/10 pt-6">
          <div>
            <p className="text-[10px] tracking-[0.14em] uppercase text-black/40">Activity</p>
            <ul className="mt-3 space-y-2 text-sm text-black/70">
              {line("Scans today", m.scansToday.value)}
              {line("Scans yesterday", m.scansYesterday.value)}
              {line("Scans (7d)", m.scansLast7d.value, scanWow)}
              {line("Known consumers", m.usersTotal.value)}
              {line("New accounts today", m.usersToday.value)}
            </ul>
          </div>
          <div>
            <p className="text-[10px] tracking-[0.14em] uppercase text-black/40">Signals</p>
            <ul className="mt-3 space-y-2 text-sm text-black/70">
              {line("Shop clickouts (7d)", m.clickoutsLast7d.value)}
              {line("Scanner clickouts (7d)", m.scannerClickoutsLast7d.value)}
              {line("Editorial clickouts (7d)", m.editorialClickoutsLast7d.value)}
              {line("Favorites", m.favoritesTotal.value)}
              {line("Collections / boards", (m.collectionsTotal.value || 0) + (m.boardsTotal.value || 0))}
              <li className="flex items-baseline justify-between gap-3">
                <span>Affiliate revenue</span>
                <span className="text-xs text-black/40">Not connected</span>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-[10px] tracking-[0.14em] uppercase text-black/40">Recommended actions</p>
            <ul className="mt-3 space-y-2 text-sm text-black/70 list-disc pl-4">
              {actions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
            <p className="text-[11px] text-black/35 mt-4">
              Updated {new Date(m.fetchedAt).toLocaleString()} · {formatCount(totalClicks7d)} affiliate clicks (7d)
            </p>
          </div>
        </div>
      </HqCard>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <HqCard title="Material momentum (30d sample)">
          {m.topMaterialsLast30d.length ? (
            <ul className="space-y-2 text-sm">
              {m.topMaterialsLast30d.map((row) => (
                <li key={row.material} className="flex justify-between gap-3">
                  <span>{row.material}</span>
                  <span className="tabular-nums text-black/60">{row.scans}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-black/50">No fiber_primary sample yet.</p>
          )}
          <a href="/dashboard/materials" className="inline-block mt-4 text-xs tracking-widest uppercase underline underline-offset-4">
            Material Intelligence →
          </a>
        </HqCard>
        <HqCard title="Brand momentum (30d sample)">
          {m.topBrandsLast30d.length ? (
            <ul className="space-y-2 text-sm">
              {m.topBrandsLast30d.map((row) => (
                <li key={row.brand} className="flex justify-between gap-3">
                  <span>{row.brand}</span>
                  <span className="tabular-nums text-black/60">{row.scans}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-black/50">No brand sample yet.</p>
          )}
          <a href="/dashboard/brands" className="inline-block mt-4 text-xs tracking-widest uppercase underline underline-offset-4">
            Brand Intelligence →
          </a>
        </HqCard>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <HqCard title="Recent scans">
          {m.recentScans.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-[10px] uppercase tracking-wider text-black/40">
                  <tr>
                    <th className="py-2 pr-3 font-medium">When</th>
                    <th className="py-2 pr-3 font-medium">Brand</th>
                    <th className="py-2 pr-3 font-medium">Material</th>
                    <th className="py-2 font-medium">NFP</th>
                  </tr>
                </thead>
                <tbody>
                  {m.recentScans.map((s) => (
                    <tr key={s.id} className="border-t border-black/5">
                      <td className="py-2 pr-3 text-black/50 whitespace-nowrap">
                        {s.scanned_at ? new Date(s.scanned_at).toLocaleString() : "—"}
                      </td>
                      <td className="py-2 pr-3">{s.brand || "—"}</td>
                      <td className="py-2 pr-3">{s.fiber_primary || "—"}</td>
                      <td className="py-2 tabular-nums">{s.natural_percent ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-black/50">No recent scans returned.</p>
          )}
        </HqCard>
        <HqCard title="Recent affiliate clicks">
          {m.recentClickouts.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-[10px] uppercase tracking-wider text-black/40">
                  <tr>
                    <th className="py-2 pr-3 font-medium">When</th>
                    <th className="py-2 pr-3 font-medium">Source</th>
                    <th className="py-2 font-medium">Brand / product</th>
                  </tr>
                </thead>
                <tbody>
                  {m.recentClickouts.map((c) => (
                    <tr key={`${c.source}-${c.id}`} className="border-t border-black/5">
                      <td className="py-2 pr-3 text-black/50 whitespace-nowrap">
                        {c.clicked_at ? new Date(c.clicked_at).toLocaleString() : "—"}
                      </td>
                      <td className="py-2 pr-3 capitalize">{c.source}</td>
                      <td className="py-2">
                        {c.brand || c.product_name || c.product_id || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-black/50">No recent clickouts returned.</p>
          )}
        </HqCard>
      </div>
    </div>
  );
}
