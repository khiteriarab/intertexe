"use client";

import type { CompanyHqBundle } from "../../../lib/dashboard/company-hq";
import { formatCompanyCount, formatCompanyMoney } from "../../../lib/dashboard/company-plan";
import {
  AcquisitionFunnelViz,
  HqSectionFrame,
  MilestonesGrid,
  NorthStarKpiCard,
  RevenueStreamBars,
  WeeklyReviewTable,
} from "./CompanyHqUi";
import { HorizonToggle, useCompanyHorizon } from "./CompanyHqHorizon";

export function CompanyHqOverview({ bundle }: { bundle: CompanyHqBundle }) {
  const { horizon, setHorizon, plan, northStar, requiredPerMonth, memberForecast } =
    useCompanyHorizon(bundle);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[10px] tracking-[0.2em] uppercase text-[#9c7b8b]">INTERTEXE HQ</p>
          <h1 className="font-serif text-2xl sm:text-3xl mt-1">Company operating system</h1>
          <p className="text-sm text-black/55 mt-2 max-w-2xl">
            {plan.label} — business performance only. Personal metrics live in Founder Personal.
          </p>
        </div>
        <HorizonToggle horizon={horizon} setHorizon={setHorizon} />
      </div>

      <section>
        <p className="text-[10px] tracking-[0.18em] uppercase text-black/35 mb-3">North star KPIs</p>
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <NorthStarKpiCard kpi={northStar.revenue} />
          <NorthStarKpiCard kpi={northStar.members} />
          <NorthStarKpiCard kpi={northStar.b2bClients} />
          <NorthStarKpiCard kpi={northStar.press} />
          <NorthStarKpiCard kpi={northStar.speaking} />
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        <HqSectionFrame
          title="Revenue mix"
          description={`YTD ${formatCompanyMoney(bundle.revenue.totalYtd)} · ${formatCompanyMoney(requiredPerMonth)}/mo required`}
          href="/dashboard/revenue"
        >
          <RevenueStreamBars streams={bundle.revenue.streams} />
        </HqSectionFrame>

        <HqSectionFrame
          title="Users & members"
          description={`${formatCompanyCount(bundle.members.total)} users · Founder Welcome ${formatCompanyCount(bundle.members.founderWelcomeTotal)} · forecast ${memberForecast || "—"}`}
          href="/dashboard/members"
        >
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Metric label="Email lifecycle users" value={formatCompanyCount(bundle.members.emailUsers)} />
            <Metric label="Registered accounts" value={formatCompanyCount(bundle.members.registeredUsers)} />
            <Metric label="This week" value={`+${formatCompanyCount(bundle.members.d7)}`} />
            <Metric label="Required / day" value={`+${formatCompanyCount(bundle.members.requiredPerDay)}`} />
          </div>
          <p className="text-[11px] text-black/40 mt-3">
            Users = Founder Welcome + lifecycle emails (Day 4/10/25, Weekly Edit, etc.) merged with registered accounts.
          </p>
        </HqSectionFrame>
      </div>

      <HqSectionFrame title="Acquisition funnel" description="Volume and conversion between stages" href="/dashboard/acquisition">
        <AcquisitionFunnelViz bundle={bundle} />
        {bundle.acquisition.bestSource ? (
          <p className="text-[11px] text-black/45 mt-4">
            Best source: <span className="text-black/70">{bundle.acquisition.bestSource}</span>
            {bundle.acquisition.worstSource ? (
              <>
                {" "}
                · Weakest: <span className="text-black/70">{bundle.acquisition.worstSource}</span>
              </>
            ) : null}
          </p>
        ) : null}
      </HqSectionFrame>

      <div className="grid lg:grid-cols-3 gap-6">
        <HqSectionFrame title="B2B / SaaS" href="/dashboard/b2b">
          <div className="space-y-2 text-sm tabular-nums">
            <Row label="Active clients" value={String(bundle.b2b.activeClients)} />
            <Row label="Weighted pipeline" value={formatCompanyMoney(bundle.b2b.weightedPipeline)} />
            <Row label="Prospects engaged" value={String(bundle.b2b.prospects)} />
            <Row label="Proposals" value={String(bundle.b2b.proposals)} />
          </div>
        </HqSectionFrame>
        <HqSectionFrame title="Affiliate commerce" href="/dashboard/affiliate">
          <div className="space-y-2 text-sm tabular-nums">
            <Row label="Orders (7d)" value={String(bundle.revenue.affiliateOrders)} />
            <Row label="MTD commission" value={formatCompanyMoney(bundle.revenue.totalMtd)} />
            <Row label="Avg commission" value={formatCompanyMoney(bundle.revenue.affiliateCommissionAvg ?? 0)} />
          </div>
        </HqSectionFrame>
        <HqSectionFrame title="Product / data" href="/dashboard/product">
          <div className="space-y-2 text-sm tabular-nums">
            <Row label="Catalog products" value={String(bundle.product.catalogProducts ?? "—")} />
            <Row label="Scans (7d)" value={String(bundle.product.scans7d ?? "—")} />
            <Row label="Clickouts (7d)" value={String(bundle.product.clickouts7d ?? "—")} />
            <Row label="DPP ready" value={String(bundle.product.dppReady ?? "—")} />
          </div>
        </HqSectionFrame>
      </div>

      <HqSectionFrame title="Weekly founder review" description="This week vs target — recalculated every load" href="/dashboard/weekly-review">
        <WeeklyReviewTable bundle={bundle} />
      </HqSectionFrame>

      <section>
        <p className="text-[10px] tracking-[0.18em] uppercase text-black/35 mb-3">Year 1 milestones</p>
        <MilestonesGrid bundle={bundle} />
      </section>

      <p className="text-[11px] text-black/40">
        Updated {new Date(bundle.fetchedAt).toLocaleString()} · Company scope only ·{" "}
        <a href="/dashboard/command-center" className="underline underline-offset-2">
          Founder Personal
        </a>{" "}
        for @khiteri revenue
      </p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-black/8 px-3 py-2.5">
      <p className="text-[10px] tracking-wide uppercase text-black/40">{label}</p>
      <p className="text-lg font-medium tabular-nums mt-1">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-black/55">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
