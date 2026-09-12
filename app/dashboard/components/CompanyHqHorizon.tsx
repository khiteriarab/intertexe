"use client";

import { useMemo, useState } from "react";
import type { CompanyHqBundle } from "../../../lib/dashboard/company-hq";
import {
  COMPANY_HORIZON_PLANS,
  computeKpiSnapshot,
  forecastHitDate,
  type PlanHorizon,
} from "../../../lib/dashboard/company-plan";

export function useCompanyHorizon(bundle: CompanyHqBundle) {
  const [horizon, setHorizon] = useState<PlanHorizon>(bundle.horizon);

  const view = useMemo(() => {
    const plan = COMPANY_HORIZON_PLANS[horizon];
    const northStar = {
      revenue: computeKpiSnapshot({
        key: "revenue",
        label: "Total Revenue",
        current: bundle.revenue.totalYtd,
        target: plan.revenueMin,
        stretch: plan.revenueStretch,
        deadlineIso: plan.deadlineIso,
        asOfIso: bundle.fetchedAt,
      }),
      members: computeKpiSnapshot({
        key: "members",
        label: "Members / Users",
        current: bundle.members.total,
        target: plan.members,
        deadlineIso: plan.deadlineIso,
        asOfIso: bundle.fetchedAt,
        weeklyActual: bundle.members.d7,
      }),
      b2bClients: computeKpiSnapshot({
        key: "b2b",
        label: "B2B / SaaS Brand Clients",
        current: bundle.b2b.activeClients,
        target: plan.b2bClients,
        deadlineIso: plan.deadlineIso,
        asOfIso: bundle.fetchedAt,
      }),
      press: computeKpiSnapshot({
        key: "press",
        label: "Press Features",
        current: bundle.press.total,
        target: plan.pressFeatures,
        deadlineIso: plan.deadlineIso,
        asOfIso: bundle.fetchedAt,
      }),
      speaking: computeKpiSnapshot({
        key: "speaking",
        label: "Speaking Engagements",
        current: bundle.speaking.total,
        target: plan.speakingEngagements,
        deadlineIso: plan.deadlineIso,
        asOfIso: bundle.fetchedAt,
      }),
    };

    const monthsLeft = Math.max(
      1,
      Math.ceil(
        (new Date(plan.deadlineIso).getTime() - new Date(bundle.fetchedAt).getTime()) /
          (30 * 24 * 60 * 60 * 1000)
      )
    );
    const revenueGap = Math.max(0, plan.revenueMin - bundle.revenue.totalYtd);
    const requiredPerMonth = Math.ceil(revenueGap / monthsLeft);
    const memberForecast = forecastHitDate(
      bundle.members.total,
      plan.members,
      bundle.members.d7,
      bundle.fetchedAt
    );

    return { plan, northStar, requiredPerMonth, memberForecast };
  }, [bundle, horizon]);

  return { horizon, setHorizon, ...view };
}

export function HorizonToggle({
  horizon,
  setHorizon,
}: {
  horizon: PlanHorizon;
  setHorizon: (h: PlanHorizon) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-black/10 bg-white p-1">
      {(
        [
          ["year1", "1 Year"],
          ["year2", "2 Year"],
          ["year3", "3 Year"],
        ] as const
      ).map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => setHorizon(key)}
          className={`px-3 py-1.5 text-xs rounded-md ${
            horizon === key ? "bg-black text-white" : "text-black/55 hover:bg-black/[0.04]"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
