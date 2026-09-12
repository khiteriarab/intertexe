import { requireHqSession } from "../../../../lib/dashboard/auth";
import { fetchCompanyHqBundle } from "../../../../lib/dashboard/company-hq";
import { formatCompanyCount, formatCompanyMoney } from "../../../../lib/dashboard/company-plan";
import { WeeklyReviewTable, HqSectionFrame } from "../../components/CompanyHqUi";

export const metadata = { title: "Weekly Review" };
export const dynamic = "force-dynamic";

export default async function HqWeeklyReviewPage() {
  const session = await requireHqSession();
  const bundle = await fetchCompanyHqBundle(session.workspaceId);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[10px] tracking-[0.2em] uppercase text-[#9c7b8b]">INTERTEXE HQ</p>
        <h1 className="font-serif text-2xl sm:text-3xl mt-1">Weekly founder review</h1>
        <p className="text-sm text-black/55 mt-2">
          This week vs target — pace recalculates as performance changes
        </p>
      </header>

      <HqSectionFrame title="This week">
        <WeeklyReviewTable bundle={bundle} />
      </HqSectionFrame>

      <HqSectionFrame title="Next week required pace" description="Based on remaining annual gap">
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-black/45">Members / week</p>
            <p className="text-xl font-light tabular-nums mt-1">
              +{formatCompanyCount(bundle.northStar.members.requiredPerWeek)}
            </p>
          </div>
          <div>
            <p className="text-black/45">Revenue / month</p>
            <p className="text-xl font-light tabular-nums mt-1">
              {formatCompanyMoney(bundle.revenue.requiredPerMonth)}
            </p>
          </div>
        </div>
      </HqSectionFrame>
    </div>
  );
}
