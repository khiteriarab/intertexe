import { requireHqSession } from "../../../../lib/dashboard/auth";
import { fetchHqCommercePage, formatCount } from "../../../../lib/dashboard/metrics";
import { HqCard, HqEmptyState, HqMetricGrid, HqPageHeader } from "../../components/HqUi";
import { RevenueImportClient } from "./RevenueImportClient";

export const metadata = { title: "Commerce" };
export const dynamic = "force-dynamic";

export default async function HqCommercePage() {
  const session = await requireHqSession();
  const data = await fetchHqCommercePage(session.workspaceId);
  const clicks7d = (data.shop7d || 0) + (data.scanner7d || 0) + (data.editorial7d || 0);
  const money = (n: number | null) =>
    n == null
      ? "—"
      : n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  return (
    <div>
      <HqPageHeader
        title="Commerce"
        description="Is the business making money? Affiliate clicks, verified commission, retailers, and brands."
        action={
          <a
            href="/api/dashboard/export?kind=commerce"
            className="text-xs tracking-widest uppercase border border-black/15 px-3 py-2 hover:bg-black hover:text-white"
          >
            Export clickouts CSV
          </a>
        }
      />

      {data.revenueIsDemo ? (
        <div className="mb-6 border border-amber-700/30 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="text-[10px] tracking-[0.18em] uppercase text-amber-800/80 mb-1">Demo data</p>
          <p className="font-medium">Sample transactions are shown below for wiring only.</p>
          <p className="text-amber-900/70 mt-1">
            They are excluded from verified commission and sales totals. Replace with verified affiliate reporting.
          </p>
        </div>
      ) : null}

      <HqMetricGrid
        items={[
          {
            label: "Verified sales (30d)",
            value: data.revenueIsDemo ? "—" : money(data.sales30d),
            hint: data.revenueIsDemo
              ? "Replace with verified reporting"
              : data.revenueConnected
                ? "Includes all imported Rakuten orders in window"
                : "Not connected",
          },
          {
            label: "Verified commission (30d)",
            value: data.revenueIsDemo ? "Demo only" : money(data.commission30d),
            hint: data.revenueIsDemo
              ? "Not verified"
              : data.revenueConnected
                ? undefined
                : "Import revenue report",
          },
          {
            label: "Verified sales (7d)",
            value: data.revenueIsDemo ? "—" : money(data.sales7d),
            hint: data.revenueIsDemo
              ? "Replace with verified reporting"
              : data.revenueConnected
                ? `${formatCount(data.transactions7d)} tx this week`
                : "Not connected",
          },
          {
            label: "All clicks (7d)",
            value: formatCount(clicks7d),
            hint: `Shop ${formatCount(data.shop7d)}`,
          },
        ]}
      />

      {(data.unmatchedTx30d || 0) > 0 ? (
        <p className="mt-4 text-sm text-black/55">
          {data.unmatchedTx30d} verified transactions in 30d lack product_id and SKU — material/brand revenue
          matching will stay incomplete until reconciliation improves.
        </p>
      ) : null}

      <div className="mt-6">
        <RevenueImportClient
          revenueConnected={data.revenueConnected}
          revenueIsDemo={data.revenueIsDemo}
          commission7d={data.commission7d}
          sales7d={data.sales7d}
          transactions7d={data.transactions7d}
          commission30d={data.commission30d}
          sales30d={data.sales30d}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <HqCard title="Top brands by click (30d sample)">
          {data.topBrands.length ? (
            <ul className="space-y-2 text-sm">
              {data.topBrands.map((row) => (
                <li key={row.brand} className="flex justify-between gap-3">
                  <span>{row.brand}</span>
                  <span className="tabular-nums text-black/60">{row.clicks}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-black/50">No brand click sample yet.</p>
          )}
        </HqCard>
        <HqCard title="Top advertisers by verified commission (30d)">
          {data.topRevenueAdvertisers.length ? (
            <ul className="space-y-2 text-sm">
              {data.topRevenueAdvertisers.map((row) => (
                <li key={row.brand} className="flex justify-between gap-3">
                  <span>{row.brand}</span>
                  <span className="tabular-nums text-black/60">{money(row.commission)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-black/50">
              {data.revenueIsDemo
                ? "Demo rows are excluded from advertiser rankings."
                : "Import a Rakuten report to rank revenue by advertiser."}
            </p>
          )}
        </HqCard>
      </div>

      {data.recentTransactions.length ? (
        <HqCard
          title={data.revenueIsDemo ? "Demo affiliate transactions" : "Recent affiliate transactions"}
          className="mb-6"
        >
          {data.revenueIsDemo ? (
            <p className="text-sm text-amber-900/80 mb-3">
              Demo data — do not use these amounts for commercial decisions.
            </p>
          ) : null}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] uppercase tracking-wider text-black/40">
                <tr>
                  <th className="py-2 pr-3 font-medium">When</th>
                  <th className="py-2 pr-3 font-medium">Advertiser</th>
                  <th className="py-2 pr-3 font-medium">Product</th>
                  <th className="py-2 pr-3 font-medium">Sales</th>
                  <th className="py-2 pr-3 font-medium">Commission</th>
                  <th className="py-2 font-medium">Flag</th>
                </tr>
              </thead>
              <tbody>
                {data.recentTransactions.map((r: any) => (
                  <tr key={r.id} className="border-t border-black/5">
                    <td className="py-2 pr-3 text-black/50 whitespace-nowrap">
                      {r.transaction_date ? new Date(r.transaction_date).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-2 pr-3">{r.advertiser_name || "—"}</td>
                    <td className="py-2 pr-3">{r.product_name || r.order_id || "—"}</td>
                    <td className="py-2 pr-3 tabular-nums">
                      {money(r.sales_amount != null ? Number(r.sales_amount) : null)}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {money(r.commission_amount != null ? Number(r.commission_amount) : null)}
                    </td>
                    <td className="py-2">
                      {r.is_demo ? (
                        <span className="text-[10px] tracking-widest uppercase text-amber-800">Demo</span>
                      ) : !r.product_id && !r.sku ? (
                        <span className="text-[10px] tracking-widest uppercase text-black/40">Unmatched</span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </HqCard>
      ) : null}

      {data.recent.length ? (
        <HqCard title="Recent clickouts">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] uppercase tracking-wider text-black/40">
                <tr>
                  <th className="py-2 pr-3 font-medium">When</th>
                  <th className="py-2 pr-3 font-medium">Source</th>
                  <th className="py-2 pr-3 font-medium">Brand / product</th>
                  <th className="py-2 font-medium">Converted</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map((r: any) => (
                  <tr key={`${r.source}-${r.id}`} className="border-t border-black/5">
                    <td className="py-2 pr-3 text-black/50 whitespace-nowrap">
                      {r.clicked_at ? new Date(r.clicked_at).toLocaleString() : "—"}
                    </td>
                    <td className="py-2 pr-3 capitalize">{r.source}</td>
                    <td className="py-2 pr-3">{r.brand || r.product_name || r.product_id || "—"}</td>
                    <td className="py-2">{r.converted === true ? "Yes" : r.converted === false ? "No" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </HqCard>
      ) : (
        <HqEmptyState title="No clickouts returned" body={data.error || "Affiliate click tables may be empty."} />
      )}
    </div>
  );
}
