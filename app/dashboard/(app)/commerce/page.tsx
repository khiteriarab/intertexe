import { requireHqSession } from "../../../../lib/dashboard/auth";
import { fetchHqCommercePage, formatCount } from "../../../../lib/dashboard/metrics";
import {
  formatMoneyUsd,
  type PerformanceFunnelStage,
} from "../../../../lib/dashboard/commerce-intelligence";
import { HqCard, HqEmptyState, HqMetricGrid, HqPageHeader } from "../../components/HqUi";
import { RevenueImportClient } from "./RevenueImportClient";

export const metadata = { title: "Commerce" };
export const dynamic = "force-dynamic";

function formatFunnelValue(stage: PerformanceFunnelStage): string {
  if (stage.value == null) return "—";
  if (stage.kind === "money") return formatMoneyUsd(stage.value);
  if (stage.kind === "percent") return `${stage.value}%`;
  return formatCount(stage.value);
}

function ProductTable({
  title,
  rows,
  empty,
  mode,
}: {
  title: string;
  rows: Array<{
    key: string;
    product: string;
    brand: string;
    orders: number;
    sales: number;
    commission: number;
    rpc: number | null;
    clicks: number | null;
    category: string;
  }>;
  empty: string;
  mode: "sales" | "commission" | "rpc";
}) {
  return (
    <HqCard title={title}>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[10px] uppercase tracking-wider text-black/40">
              <tr>
                <th className="py-2 pr-3 font-medium">Product</th>
                <th className="py-2 pr-3 font-medium">Cat</th>
                <th className="py-2 pr-3 font-medium">Orders</th>
                <th className="py-2 pr-3 font-medium">Sales</th>
                <th className="py-2 pr-3 font-medium">Comm</th>
                <th className="py-2 font-medium">{mode === "rpc" ? "RPC" : "Clicks"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-t border-black/5">
                  <td className="py-2 pr-3">
                    <p className="leading-snug">{r.product}</p>
                    <p className="text-[11px] text-black/45">{r.brand}</p>
                  </td>
                  <td className="py-2 pr-3 text-black/55">{r.category}</td>
                  <td className="py-2 pr-3 tabular-nums">{r.orders}</td>
                  <td className="py-2 pr-3 tabular-nums">{formatMoneyUsd(r.sales)}</td>
                  <td className="py-2 pr-3 tabular-nums">{formatMoneyUsd(r.commission)}</td>
                  <td className="py-2 tabular-nums">
                    {mode === "rpc"
                      ? r.rpc == null
                        ? "—"
                        : formatMoneyUsd(r.rpc)
                      : r.clicks == null
                        ? "—"
                        : formatCount(r.clicks)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-black/50">{empty}</p>
      )}
    </HqCard>
  );
}

export default async function HqCommercePage() {
  const session = await requireHqSession();
  const data = await fetchHqCommercePage(session.workspaceId);
  const clicks7d = (data.shop7d || 0) + (data.scanner7d || 0) + (data.editorial7d || 0);
  const money = formatMoneyUsd;
  const goal = data.revenueGoal;

  return (
    <div>
      <HqPageHeader
        title="Commerce"
        description="Is the business making money? Affiliate clicks, verified commission, categories, editorial, and brands."
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

      <div id="revenue-goal" className="mb-6 scroll-mt-24">
        <HqCard title="$1M revenue path">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-3">
            <div>
              <p className="text-2xl font-medium tabular-nums">
                {goal.mode === "demo" || goal.mode === "disconnected" ? "—" : money(goal.progressUsd)}
                <span className="text-sm font-normal text-black/40"> / {money(goal.goalUsd)}</span>
              </p>
              <p className="text-[11px] text-black/45 mt-1">
                {goal.mode === "ytd"
                  ? `YTD commission · shoppers spent ${money(goal.salesYtd ?? goal.sales30d)}${goal.takeRatePct != null ? ` · ${goal.takeRatePct}% take` : ""} · 30d commission ${money(goal.commission30d)} · run-rate ${money(goal.runRateUsd)}/yr`
                  : goal.mode === "annualized_30d"
                    ? `Annualized from 30d commission ${money(goal.commission30d)} · shoppers spent ${money(goal.sales30d)}${goal.takeRatePct != null ? ` · ${goal.takeRatePct}% take` : ""}${goal.daysToGoal != null ? ` · ~${goal.daysToGoal}d to goal` : ""}`
                    : goal.mode === "demo"
                      ? "Demo excluded from goal progress"
                      : "Connect verified revenue to track the path"}
              </p>
            </div>
            <p className="text-sm tabular-nums text-black/55">{goal.pct}%</p>
          </div>
          {goal.mode !== "demo" && goal.mode !== "disconnected" ? (
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="border border-black/10 rounded-lg px-3 py-2.5">
                <p className="text-[10px] tracking-widest uppercase text-black/35">Shopper spend</p>
                <p className="text-sm font-medium tabular-nums mt-1">
                  {money(goal.mode === "ytd" ? (goal.salesYtd ?? goal.sales30d) : goal.sales30d)}
                </p>
                <p className="text-[10px] text-black/40 mt-0.5">
                  {goal.mode === "ytd" ? "YTD GMV" : "30d GMV"}
                </p>
              </div>
              <div className="border border-black/10 rounded-lg px-3 py-2.5">
                <p className="text-[10px] tracking-widest uppercase text-black/35">Our commission</p>
                <p className="text-sm font-medium tabular-nums mt-1">{money(goal.progressUsd)}</p>
                <p className="text-[10px] text-black/40 mt-0.5">
                  {goal.mode === "ytd" ? "YTD toward $1M" : "annualized toward $1M"}
                </p>
              </div>
            </div>
          ) : null}
          <div className="h-2 rounded-full bg-black/5 overflow-hidden">
            <div className="h-full rounded-full bg-black" style={{ width: `${Math.min(100, goal.pct)}%` }} />
          </div>
          <p className="text-[11px] text-black/40 mt-2 tabular-nums">{goal.pct}% of $1M commission goal</p>
        </HqCard>
      </div>

      <div id="performance-funnel" className="mb-6 scroll-mt-24">
        <HqCard title="Performance funnel">
          <div className="flex items-end justify-between gap-3 mb-3">
            <p className="text-[11px] text-black/45">
              Attention → buy → money · {data.performanceFunnel.windowLabel}
            </p>
            <p className="text-[10px] tracking-widest uppercase text-black/35 shrink-0">
              Complements revenue totals
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] uppercase tracking-wider text-black/40">
                <tr>
                  <th className="py-2 pr-3 font-medium">Stage</th>
                  <th className="py-2 pr-3 font-medium text-right">Value</th>
                  <th className="py-2 font-medium text-right">vs prior</th>
                </tr>
              </thead>
              <tbody>
                {data.performanceFunnel.stages.map((stage) => (
                  <tr key={stage.id} className="border-t border-black/5">
                    <td className="py-2.5 pr-3">{stage.label}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums font-medium">
                      {formatFunnelValue(stage)}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-black/45">
                      {stage.dropOffFromPrior == null ? "—" : `${stage.dropOffFromPrior}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[12px] text-black/55 mt-4 leading-relaxed">
            {data.performanceFunnel.diagnosis}
          </p>
        </HqCard>
      </div>

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
            hint: data.revenueIsDemo ? "Not verified" : data.revenueConnected ? undefined : "Import revenue report",
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
            hint: `Editorial ${formatCount(data.editorial7d)} · Shop ${formatCount(data.shop7d)} · Scanner ${formatCount(data.scanner7d)}`,
          },
        ]}
      />

      <div id="channel-clicks" className="mt-4 grid sm:grid-cols-3 gap-3 scroll-mt-24">
        {[
          { label: "Editorial clicks (7d)", value: data.editorial7d },
          { label: "Shop clicks (7d)", value: data.shop7d },
          { label: "Scanner clicks (7d)", value: data.scanner7d },
        ].map((row) => (
          <div key={row.label} className="border border-black/10 rounded-xl bg-white p-3.5">
            <p className="text-[10px] uppercase tracking-wider text-black/40">{row.label}</p>
            <p className="text-xl font-medium tabular-nums mt-1">{formatCount(row.value)}</p>
          </div>
        ))}
      </div>

      <div id="u1-health" className="mt-4 scroll-mt-24">
        {(data.nullU1Tx30d || 0) + (data.txWithU130d || 0) > 0 ? (
          <p className="text-sm text-black/55">
            u1 join: {formatCount(data.txWithU130d)} with identity / {formatCount(data.nullU1Tx30d)} blank in
            30d
            {(data.unmatchedTx30d || 0) > 0 ? ` · ${data.unmatchedTx30d} unmatched SKU/product_id` : ""}.
          </p>
        ) : (data.unmatchedTx30d || 0) > 0 ? (
          <p className="text-sm text-black/55">
            {data.unmatchedTx30d} verified transactions in 30d lack product_id and SKU — material/brand revenue
            matching will stay incomplete until reconciliation improves.
          </p>
        ) : null}
      </div>

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

      <div id="commerce-intelligence" className="scroll-mt-24" />

      <div id="category-performance" className="mt-6 mb-6 scroll-mt-24">
        <HqCard title="Category performance (30d verified)">
          {data.categoryPerformance.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-[10px] uppercase tracking-wider text-black/40">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Category</th>
                    <th className="py-2 pr-3 font-medium">Orders</th>
                    <th className="py-2 pr-3 font-medium">Sales</th>
                    <th className="py-2 pr-3 font-medium">Commission</th>
                    <th className="py-2 font-medium">Share of sales</th>
                  </tr>
                </thead>
                <tbody>
                  {data.categoryPerformance.map((row) => (
                    <tr key={row.category} className="border-t border-black/5">
                      <td className="py-2 pr-3 font-medium">{row.category}</td>
                      <td className="py-2 pr-3 tabular-nums">{row.orders}</td>
                      <td className="py-2 pr-3 tabular-nums">{money(row.sales)}</td>
                      <td className="py-2 pr-3 tabular-nums">{money(row.commission)}</td>
                      <td className="py-2 tabular-nums">{Math.round(row.shareOfSales * 100)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-black/50">
              Import verified transactions to see Shoes / Clothing / Accessories mix.
            </p>
          )}
        </HqCard>
      </div>

      <div id="top-products" className="grid md:grid-cols-3 gap-4 mb-6 scroll-mt-24">
        <ProductTable
          title="Top by sales"
          rows={data.topProductsBySales}
          empty="No product-level sales yet."
          mode="sales"
        />
        <ProductTable
          title="Top by commission"
          rows={data.topProductsByCommission}
          empty="No commission rows yet."
          mode="commission"
        />
        <ProductTable
          title="Highest RPC"
          rows={data.topProductsByRpc}
          empty="Need overlapping clicks + sales for RPC."
          mode="rpc"
        />
      </div>

      <div id="editorial-analytics" className="mb-6 scroll-mt-24">
        <HqCard title="Editorial analytics (/khiteri & edits)">
          <p className="text-[11px] text-black/45 mb-3">
            Clicks from editorial_clickouts. Orders/sales are best-effort joins on product name — directional
            until denser u1→edit attribution.
          </p>
          {data.editorialPerformance.length ? (
            <div className="space-y-4">
              {data.editorialPerformance.map((edit) => (
                <div key={edit.key} className="border border-black/10 rounded-lg p-3.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium">
                      /{edit.editSlug}
                      {edit.editMonth ? (
                        <span className="text-black/45 font-normal"> · {edit.editMonth}</span>
                      ) : null}
                    </p>
                    <p className="text-[11px] text-black/45 tabular-nums">
                      {formatCount(edit.clicks)} clicks · {formatCount(edit.orders)} matched orders ·{" "}
                      {money(edit.sales)} sales · {money(edit.commission)} comm
                      {edit.conversionRate != null
                        ? ` · ${(edit.conversionRate * 100).toFixed(1)}% match rate`
                        : ""}
                    </p>
                  </div>
                  {edit.topProducts.length ? (
                    <ul className="mt-2 space-y-1 text-sm">
                      {edit.topProducts.map((p) => (
                        <li key={`${p.brand}-${p.product}`} className="flex justify-between gap-3">
                          <span className="truncate">
                            {p.brand} · {p.product}
                          </span>
                          <span className="tabular-nums text-black/55 shrink-0">{p.clicks}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-black/50">No editorial clickouts in the last 30d sample.</p>
          )}
        </HqCard>
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
