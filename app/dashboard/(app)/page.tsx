import { requireHqSession } from "../../../lib/dashboard/auth";
import {
  buildExecutiveBriefing,
  fetchInsightsBundle,
} from "../../../lib/dashboard/insights";
import { fetchHqCommercePage, formatCount, formatDelta } from "../../../lib/dashboard/metrics";
import { HqCard, HqPageHeader } from "../components/HqUi";

export const metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

function greetingName(fullName: string | null, email: string) {
  if (fullName?.trim()) return fullName.trim().split(/\s+/)[0];
  if (email.includes("@")) return email.split("@")[0];
  return "there";
}

function todayLine(label: string, value: number | null, hint?: string | null) {
  return (
    <li className="flex items-baseline justify-between gap-3">
      <span className="text-black/65">{label}</span>
      <span className="tabular-nums font-medium text-black/85">
        {formatCount(value)}
        {hint ? <span className="ml-2 text-xs font-normal text-black/40">{hint}</span> : null}
      </span>
    </li>
  );
}

export default async function HqOverviewPage() {
  const session = await requireHqSession();
  const [{ metrics: m, live }, commerce] = await Promise.all([
    fetchInsightsBundle(session.workspaceId),
    fetchHqCommercePage(session.workspaceId),
  ]);
  const name = greetingName(session.fullName, session.email);
  const briefing = buildExecutiveBriefing(name, m, live, {
    revenueConnected: commerce.revenueConnected,
    revenueIsDemo: commerce.revenueIsDemo,
    commission7d: commerce.commission7d,
  });

  const scanWow = formatDelta(m.scansLast7d.value, m.scansPrev7d.value);
  const totalClicks7d =
    (m.clickoutsLast7d.value || 0) +
    (m.scannerClickoutsLast7d.value || 0) +
    (m.editorialClickoutsLast7d.value || 0);

  const changes = live.filter((i) => i.severity !== "info").slice(0, 4);
  const changeList = changes.length ? changes : live.slice(0, 4);

  const founderActions = [
    ...live.slice(0, 4).map((i) => ({
      key: i.key,
      text: i.recommendedAction,
      href:
        i.key.includes("revenue") || i.key.includes("clicks_without")
          ? "/dashboard/commerce"
          : i.key.includes("material")
            ? "/dashboard/materials"
            : i.key.includes("scan") || i.key.includes("regs")
              ? "/dashboard/scanner"
              : i.key.includes("dpp")
                ? "/dashboard/dpp"
                : i.key.includes("campaign")
                  ? "/dashboard/campaigns"
                  : "/dashboard/insights",
    })),
  ];
  if (commerce.revenueIsDemo) {
    founderActions.unshift({
      key: "replace_demo_revenue",
      text: "Replace demo revenue with a verified Rakuten transaction report",
      href: "/dashboard/commerce",
    });
  } else if ((commerce.unmatchedTx30d || 0) > 0) {
    founderActions.unshift({
      key: "unmatched_tx",
      text: `Investigate ${commerce.unmatchedTx30d} unmatched affiliate transactions (no SKU/product)`,
      href: "/dashboard/commerce",
    });
  }

  const verifiedRevenueLabel = commerce.revenueIsDemo
    ? "Demo only"
    : commerce.revenueConnected
      ? commerce.commission7d != null
        ? commerce.commission7d.toLocaleString(undefined, {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0,
          })
        : "Connected"
      : "Not connected";

  return (
    <div>
      <HqPageHeader
        title="Today"
        description="What changed, why it matters, and what needs attention. Internal alpha — treat revenue as verified only when labeled."
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
            Verified revenue totals stay blank until a real report is imported.{" "}
            <a href="/dashboard/commerce" className="underline underline-offset-2">
              Replace with verified affiliate reporting →
            </a>
          </p>
        </div>
      ) : null}

      <HqCard className="mb-6">
        <p className="text-[10px] tracking-[0.18em] uppercase text-black/40 mb-3">Founder briefing</p>
        <h2 className="text-2xl md:text-3xl font-medium tracking-tight">{briefing[0]}</h2>
        <p className="text-sm text-black/55 mt-3 max-w-2xl leading-relaxed">
          {briefing.slice(1).join(" ")}
        </p>
      </HqCard>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <HqCard title="Today">
          <ul className="space-y-2.5 text-sm">
            {todayLine("Registrations", m.usersToday.value)}
            {todayLine("Known consumers", m.usersTotal.value)}
            {todayLine("Scans", m.scansToday.value, scanWow)}
            {todayLine("Affiliate clicks (7d)", totalClicks7d)}
            <li className="flex items-baseline justify-between gap-3">
              <span className="text-black/65">Verified revenue (7d)</span>
              <span
                className={`tabular-nums font-medium ${
                  commerce.revenueIsDemo ? "text-amber-800" : "text-black/85"
                }`}
              >
                {verifiedRevenueLabel}
              </span>
            </li>
          </ul>
        </HqCard>

        <HqCard title="Important changes">
          {changeList.length ? (
            <ul className="space-y-3 text-sm">
              {changeList.map((i) => (
                <li key={i.key}>
                  <p className="font-medium text-black/85">{i.title}</p>
                  <p className="text-black/50 mt-0.5 leading-relaxed">{i.explanation}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-black/50">No material changes yet this period.</p>
          )}
        </HqCard>

        <HqCard title="Founder actions">
          <ul className="space-y-2.5 text-sm list-disc pl-4 text-black/70">
            {founderActions.slice(0, 5).map((a) => (
              <li key={a.key}>
                <a href={a.href} className="hover:text-black underline-offset-2 hover:underline">
                  {a.text}
                </a>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-black/35 mt-4">
            Updated {new Date(m.fetchedAt).toLocaleString()}
          </p>
        </HqCard>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <HqCard title="Material signal (30d sample)">
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
          <a
            href="/dashboard/materials"
            className="inline-block mt-4 text-xs tracking-widest uppercase underline underline-offset-4"
          >
            Material Intelligence →
          </a>
        </HqCard>
        <HqCard title="Attention: recent scans">
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
    </div>
  );
}
