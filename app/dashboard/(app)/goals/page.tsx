import { requireHqSession } from "../../../../lib/dashboard/auth";
import { fetchCompanyHqBundle } from "../../../../lib/dashboard/company-hq";
import {
  COMPANY_HORIZON_PLANS,
  formatCompanyCount,
  formatCompanyMoney,
} from "../../../../lib/dashboard/company-plan";
import { MilestonesGrid, HqSectionFrame } from "../../components/CompanyHqUi";
import { GoalsEditor } from "./GoalsEditor";

export const metadata = { title: "Goals" };
export const dynamic = "force-dynamic";

export default async function HqGoalsPage() {
  const session = await requireHqSession();
  const bundle = await fetchCompanyHqBundle(session.workspaceId);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[10px] tracking-[0.2em] uppercase text-[#9c7b8b]">INTERTEXE HQ</p>
        <h1 className="font-serif text-2xl sm:text-3xl mt-1">Company goals</h1>
        <p className="text-sm text-black/55 mt-2">
          1 / 2 / 3 year planning horizons — Year 2 and 3 targets are editable
        </p>
      </header>

      <div className="grid lg:grid-cols-3 gap-4">
        {(["year1", "year2", "year3"] as const).map((key) => {
          const plan = COMPANY_HORIZON_PLANS[key];
          return (
            <article key={key} className="rounded-xl border border-black/10 bg-white p-5">
              <p className="text-[10px] tracking-[0.16em] uppercase text-black/40">{plan.label}</p>
              <ul className="mt-3 space-y-2 text-sm text-black/65">
                <li>Revenue min {formatCompanyMoney(plan.revenueMin)}</li>
                <li>Stretch {formatCompanyMoney(plan.revenueStretch)}</li>
                <li>{formatCompanyCount(plan.members)} members</li>
                <li>{plan.b2bClients} B2B clients</li>
                <li>{plan.pressFeatures} press features</li>
                <li>{plan.speakingEngagements} speaking engagements</li>
              </ul>
            </article>
          );
        })}
      </div>

      <GoalsEditor />

      <section>
        <p className="text-[10px] tracking-[0.18em] uppercase text-black/35 mb-3">Year 1 milestones</p>
        <MilestonesGrid bundle={bundle} />
      </section>

      <HqSectionFrame title="Longer-term vision">
        <ul className="space-y-2 text-sm text-black/65">
          <li>Year 2: international B2B expansion, 50K+ members, core operating team</li>
          <li>Year 3: 100K+ members, established international portfolio, marquee keynote</li>
        </ul>
      </HqSectionFrame>
    </div>
  );
}
