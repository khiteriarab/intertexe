import { requireHqSession } from "../../../../lib/dashboard/auth";
import { fetchHqCommercePage, fetchHqOverviewMetrics, formatCount } from "../../../../lib/dashboard/metrics";
import { HqCard, HqEmptyState, HqPageHeader } from "../../components/HqUi";

/** HQ analytics over consumer fashion labels (scans/clicks) — not enterprise organizations. */
export const metadata = { title: "Retail Brand Intelligence" };
export const dynamic = "force-dynamic";

export default async function HqRetailBrandIntelligencePage() {
  await requireHqSession();
  const [scans, commerce] = await Promise.all([fetchHqOverviewMetrics(), fetchHqCommercePage()]);

  const byBrand = new Map<string, { scans: number; clicks: number }>();
  for (const row of scans.topBrandsLast30d) {
    byBrand.set(row.brand, { scans: row.scans, clicks: byBrand.get(row.brand)?.clicks || 0 });
  }
  for (const row of commerce.topBrands) {
    const prev = byBrand.get(row.brand) || { scans: 0, clicks: 0 };
    byBrand.set(row.brand, { scans: prev.scans, clicks: prev.clicks + row.clicks });
  }

  const retailBrands = [...byBrand.entries()]
    .map(([brand, v]) => ({ brand, ...v }))
    .sort((a, b) => b.scans + b.clicks - (a.scans + a.clicks))
    .slice(0, 24);

  return (
    <div>
      <HqPageHeader
        title="Retail Brand Intelligence"
        description="Consumer fashion label scorecards from scans and affiliate clicks — not SaaS organization accounts."
      />

      {retailBrands.length ? (
        <HqCard>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] uppercase tracking-wider text-black/40">
                <tr>
                  <th className="py-2 pr-3 font-medium">Retail brand</th>
                  <th className="py-2 pr-3 font-medium">Scans (30d sample)</th>
                  <th className="py-2 pr-3 font-medium">Clicks (30d sample)</th>
                  <th className="py-2 font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {retailBrands.map((b) => (
                  <tr key={b.brand} className="border-t border-black/5">
                    <td className="py-2 pr-3 font-medium">{b.brand}</td>
                    <td className="py-2 pr-3 tabular-nums">{formatCount(b.scans)}</td>
                    <td className="py-2 pr-3 tabular-nums">{formatCount(b.clicks)}</td>
                    <td className="py-2 text-black/40">—</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </HqCard>
      ) : (
        <HqEmptyState
          title="No retail brand sample yet"
          body="Needs scan brands and/or scanner/editorial clickouts with consumer brand fields."
        />
      )}
    </div>
  );
}
