import { requireHqSession } from "../../../../lib/dashboard/auth";
import { fetchHqCommercePage, fetchHqOverviewMetrics, formatCount } from "../../../../lib/dashboard/metrics";
import { HqCard, HqEmptyState, HqPageHeader } from "../../components/HqUi";

export const metadata = { title: "Brand Intelligence" };
export const dynamic = "force-dynamic";

export default async function HqBrandIntelligencePage() {
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

  const brands = [...byBrand.entries()]
    .map(([brand, v]) => ({ brand, ...v }))
    .sort((a, b) => b.scans + b.clicks - (a.scans + a.clicks))
    .slice(0, 24);

  return (
    <div>
      <HqPageHeader
        title="Brand Intelligence"
        description="Brand scorecards from scans and affiliate clicks — the seed of a product brands will pay for."
      />

      {brands.length ? (
        <HqCard>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] uppercase tracking-wider text-black/40">
                <tr>
                  <th className="py-2 pr-3 font-medium">Brand</th>
                  <th className="py-2 pr-3 font-medium">Scans (30d sample)</th>
                  <th className="py-2 pr-3 font-medium">Clicks (30d sample)</th>
                  <th className="py-2 font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {brands.map((b) => (
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
          title="No brand sample yet"
          body="Needs scan brands and/or scanner/editorial clickouts with brand fields."
        />
      )}
    </div>
  );
}
