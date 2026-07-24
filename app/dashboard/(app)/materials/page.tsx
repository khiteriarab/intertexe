import { requireHqSession } from "../../../../lib/dashboard/auth";
import { fetchHqOverviewMetrics, formatCount } from "../../../../lib/dashboard/metrics";
import { fetchMaterialRevenue } from "../../../../lib/dashboard/material-revenue";
import { HqCard, HqEmptyState, HqPageHeader } from "../../components/HqUi";

export const metadata = { title: "Material Intelligence" };
export const dynamic = "force-dynamic";

export default async function HqMaterialIntelligencePage() {
  const session = await requireHqSession();
  const [m, revenue] = await Promise.all([
    fetchHqOverviewMetrics(),
    fetchMaterialRevenue(session.workspaceId, 30),
  ]);
  const materials = m.topMaterialsLast30d;
  const money = (n: number) =>
    n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  const revenueByMaterial = new Map(
    revenue.rows.map((r) => [r.material.toLowerCase(), r])
  );

  return (
    <div>
      <HqPageHeader
        title="Material Intelligence"
        description="Scan leadership plus commission by material when Rakuten transactions match catalog SKUs/IDs."
      />

      <HqCard className="mb-4">
        <p className="text-[10px] tracking-[0.14em] uppercase text-black/40 mb-2">Live now</p>
        <p className="text-sm text-black/70 leading-relaxed">
          {revenue.revenueConnected
            ? `Matched commission (30d): ${money(revenue.matchedCommission)}. Unmatched: ${money(
                revenue.unmatchedCommission
              )} (no catalog material link yet).`
            : "Top scanned materials from the last 30 days. Import Rakuten revenue under Commerce to answer “does linen make money?”"}
        </p>
      </HqCard>

      {revenue.rows.length ? (
        <HqCard title="Commission by material (30d)" className="mb-6">
          <ul className="space-y-2 text-sm">
            {revenue.rows.map((row) => (
              <li key={row.material} className="flex justify-between gap-3 border-b border-black/5 pb-2">
                <span>
                  {row.material}
                  <span className="text-xs text-black/40 ml-2">{row.matchedTx} tx</span>
                </span>
                <span className="tabular-nums">
                  {money(row.commission)}
                  <span className="text-black/40 ml-2">sales {money(row.sales)}</span>
                </span>
              </li>
            ))}
          </ul>
        </HqCard>
      ) : null}

      {materials.length ? (
        <div className="grid md:grid-cols-2 gap-3 mb-6">
          {materials.map((row) => {
            const rev = revenueByMaterial.get(row.material.toLowerCase());
            return (
              <HqCard key={row.material}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-medium">{row.material}</p>
                    <p className="text-xs text-black/45 mt-1">Scan leadership · 30d sample</p>
                  </div>
                  <span className="text-lg tabular-nums font-medium">{formatCount(row.scans)}</span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-black/55">
                  <div>
                    <dt>Commission (30d)</dt>
                    <dd className="text-sm mt-0.5">
                      {rev ? (
                        <span className="text-black/85 tabular-nums">{money(rev.commission)}</span>
                      ) : (
                        <span className="text-black/40">No matched tx</span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Sales (30d)</dt>
                    <dd className="text-sm mt-0.5">
                      {rev ? (
                        <span className="text-black/85 tabular-nums">{money(rev.sales)}</span>
                      ) : (
                        <span className="text-black/40">—</span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Matched orders</dt>
                    <dd className="text-sm mt-0.5">{rev ? rev.matchedTx : "—"}</dd>
                  </div>
                  <div>
                    <dt>Scan → revenue</dt>
                    <dd className="text-sm mt-0.5 text-black/40">
                      {rev ? "Linked via catalog" : "Awaiting SKU match"}
                    </dd>
                  </div>
                </dl>
              </HqCard>
            );
          })}
        </div>
      ) : (
        <HqEmptyState
          title="No material scan sample yet"
          body="fiber_primary on scan_history fills this surface as scans land."
        />
      )}
    </div>
  );
}
