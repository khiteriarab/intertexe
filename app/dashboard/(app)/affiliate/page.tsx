import Link from "next/link";
import { requireHqSession } from "../../../../lib/dashboard/auth";
import { fetchCompanyHqBundle } from "../../../../lib/dashboard/company-hq";
import { fetchHqCommercePage } from "../../../../lib/dashboard/metrics";
import { formatCompanyMoney } from "../../../../lib/dashboard/company-plan";
import { HqSectionFrame } from "../../components/CompanyHqUi";

export const metadata = { title: "Affiliate" };
export const dynamic = "force-dynamic";

export default async function HqAffiliatePage() {
  const session = await requireHqSession();
  const [bundle, commerce] = await Promise.all([
    fetchCompanyHqBundle(session.workspaceId),
    fetchHqCommercePage(session.workspaceId),
  ]);

  const affiliateStream = bundle.revenue.streams.find((s) => s.key === "affiliate");
  const topProducts = commerce.topProductsByCommission.slice(0, 5);
  const topRetailers = commerce.topRevenueAdvertisers.slice(0, 5);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[10px] tracking-[0.2em] uppercase text-[#9c7b8b]">INTERTEXE HQ</p>
        <h1 className="font-serif text-2xl sm:text-3xl mt-1">Affiliate commerce</h1>
        <p className="text-sm text-black/55 mt-2">
          Year 1 target {formatCompanyMoney(affiliateStream?.target ?? 250_000)} · live transaction data
        </p>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="YTD commission" value={formatCompanyMoney(affiliateStream?.current ?? 0)} />
        <Stat label="Gap remaining" value={formatCompanyMoney(affiliateStream?.gap ?? 0)} />
        <Stat label="Orders (7d)" value={String(bundle.revenue.affiliateOrders)} />
        <Stat label="Avg commission" value={formatCompanyMoney(bundle.revenue.affiliateCommissionAvg ?? 0)} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <HqSectionFrame title="Top products">
          {topProducts.length ? (
            <ul className="space-y-2 text-sm">
              {topProducts.map((p) => (
                <li key={p.key} className="flex justify-between gap-3">
                  <span className="text-black/70 truncate">{p.product}</span>
                  <span className="tabular-nums shrink-0">{formatCompanyMoney(p.commission)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-black/45">No product data yet.</p>
          )}
        </HqSectionFrame>
        <HqSectionFrame title="Top retailers">
          {topRetailers.length ? (
            <ul className="space-y-2 text-sm">
              {topRetailers.map((r) => (
                <li key={r.brand} className="flex justify-between gap-3">
                  <span className="text-black/70">{r.brand}</span>
                  <span className="tabular-nums shrink-0">{formatCompanyMoney(r.commission)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-black/45">No retailer data yet.</p>
          )}
        </HqSectionFrame>
      </div>

      <p className="text-sm text-black/45">
        Full commerce analytics in{" "}
        <Link href="/dashboard/commerce" className="underline underline-offset-2">
          Commerce Ops
        </Link>
        .
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4">
      <p className="text-[10px] tracking-wide uppercase text-black/40">{label}</p>
      <p className="text-2xl font-light tabular-nums mt-1">{value}</p>
    </div>
  );
}
