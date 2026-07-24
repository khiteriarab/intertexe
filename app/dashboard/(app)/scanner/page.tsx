import { requireHqSession } from "../../../../lib/dashboard/auth";
import { fetchHqScannerPage, formatCount } from "../../../../lib/dashboard/metrics";
import { HqCard, HqEmptyState, HqMetricGrid, HqPageHeader } from "../../components/HqUi";

export const metadata = { title: "Scanner" };
export const dynamic = "force-dynamic";

export default async function HqScannerPage() {
  await requireHqSession();
  const data = await fetchHqScannerPage();

  return (
    <div>
      <HqPageHeader
        title="Scanner"
        description="The data collection engine for material intelligence — live from scan_history."
      />

      <HqMetricGrid
        items={[
          { label: "Total scans", value: formatCount(data.totals.all) },
          { label: "Scans today", value: formatCount(data.totals.today) },
          { label: "Scans (7d)", value: formatCount(data.totals.last7d) },
          {
            label: "Sources sampled",
            value: formatCount(data.bySource.length),
            hint: "Last 30d sample",
          },
        ]}
      />

      <div className="grid md:grid-cols-2 gap-4 mt-6 mb-6">
        <HqCard title="Scan sources (30d sample)">
          {data.bySource.length ? (
            <ul className="space-y-2 text-sm">
              {data.bySource.map((row) => (
                <li key={row.source} className="flex justify-between gap-3">
                  <span className="capitalize">{row.source || "unknown"}</span>
                  <span className="tabular-nums text-black/60">{row.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-black/50">No source sample.</p>
          )}
        </HqCard>
        <HqCard title="Top materials scanned (30d sample)">
          {data.topMaterials.length ? (
            <ul className="space-y-2 text-sm">
              {data.topMaterials.map((row) => (
                <li key={row.material} className="flex justify-between gap-3">
                  <span>{row.material}</span>
                  <span className="tabular-nums text-black/60">{row.scans}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-black/50">No fiber_primary sample.</p>
          )}
        </HqCard>
      </div>

      {data.recent.length ? (
        <HqCard title="Recent scans">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] uppercase tracking-wider text-black/40">
                <tr>
                  <th className="py-2 pr-3 font-medium">When</th>
                  <th className="py-2 pr-3 font-medium">Brand</th>
                  <th className="py-2 pr-3 font-medium">Source</th>
                  <th className="py-2 pr-3 font-medium">Label</th>
                  <th className="py-2 pr-3 font-medium">Material</th>
                  <th className="py-2 font-medium">NFP</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map((s: any) => (
                  <tr key={s.id} className="border-t border-black/5">
                    <td className="py-2 pr-3 text-black/50 whitespace-nowrap">
                      {s.scanned_at ? new Date(s.scanned_at).toLocaleString() : "—"}
                    </td>
                    <td className="py-2 pr-3">{s.brand || s.detected_brand || "—"}</td>
                    <td className="py-2 pr-3 capitalize">{s.scan_source || "—"}</td>
                    <td className="py-2 pr-3">{s.label_type || "—"}</td>
                    <td className="py-2 pr-3">{s.fiber_primary || "—"}</td>
                    <td className="py-2 tabular-nums">{s.natural_percent ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </HqCard>
      ) : (
        <HqEmptyState
          title="No scan rows returned"
          body={data.error || "scan_history may be empty or the database timed out."}
        />
      )}
    </div>
  );
}
