import { requireHqSession } from "../../../../lib/dashboard/auth";
import { fetchCompanyHqBundle } from "../../../../lib/dashboard/company-hq";
import { formatCompanyMoney } from "../../../../lib/dashboard/company-plan";
import { RevenueStreamBars, HqSectionFrame } from "../../components/CompanyHqUi";

export const metadata = { title: "Revenue" };
export const dynamic = "force-dynamic";

export default async function HqRevenuePage() {
  const session = await requireHqSession();
  const bundle = await fetchCompanyHqBundle(session.workspaceId);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[10px] tracking-[0.2em] uppercase text-[#9c7b8b]">INTERTEXE HQ</p>
        <h1 className="font-serif text-2xl sm:text-3xl mt-1">Revenue dashboard</h1>
        <p className="text-sm text-black/55 mt-2">
          Year 1 target {formatCompanyMoney(bundle.plan.revenueMin)} · stretch{" "}
          {formatCompanyMoney(bundle.plan.revenueStretch)} · company scope only
        </p>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="YTD" value={formatCompanyMoney(bundle.revenue.totalYtd)} />
        <Stat label="MTD" value={formatCompanyMoney(bundle.revenue.totalMtd)} />
        <Stat label="Required / month" value={formatCompanyMoney(bundle.revenue.requiredPerMonth)} />
        <Stat label="Gap to target" value={formatCompanyMoney(bundle.northStar.revenue.gap)} />
      </div>

      <HqSectionFrame title="Revenue mix by stream" description="Current vs Year 1 target by stream">
        <RevenueStreamBars streams={bundle.revenue.streams} />
      </HqSectionFrame>

      <div className="grid md:grid-cols-2 gap-6">
        <HqSectionFrame title="Affiliate performance">
          <dl className="space-y-2 text-sm">
            <Row label="Orders (7d)" value={String(bundle.revenue.affiliateOrders)} />
            <Row label="Avg commission" value={formatCompanyMoney(bundle.revenue.affiliateCommissionAvg ?? 0)} />
            <Row label="Avg order value" value={formatCompanyMoney(bundle.revenue.affiliateAov ?? 0)} />
          </dl>
        </HqSectionFrame>
        <HqSectionFrame title="B2B / SaaS booked">
          <dl className="space-y-2 text-sm">
            <Row label="SaaS booked YTD" value={formatCompanyMoney(bundle.revenue.streams[0]?.current ?? 0)} />
            <Row label="Pilots booked" value={formatCompanyMoney(bundle.revenue.streams[2]?.current ?? 0)} />
            <Row label="Other B2B" value={formatCompanyMoney(bundle.revenue.streams[3]?.current ?? 0)} />
          </dl>
        </HqSectionFrame>
      </div>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-black/55">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}
