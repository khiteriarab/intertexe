import { requireHqSession } from "../../../../lib/dashboard/auth";
import { fetchCompanyHqBundle } from "../../../../lib/dashboard/company-hq";
import { fetchUserGrowthEngineBundle } from "../../../../lib/dashboard/user-growth-engine";
import { formatCompanyCount } from "../../../../lib/dashboard/company-plan";
import { NorthStarKpiCard, HqSectionFrame } from "../../components/CompanyHqUi";
import { UserGrowthDashboard } from "../email/UserGrowthDashboard";

export const metadata = { title: "Members" };
export const dynamic = "force-dynamic";

export default async function HqMembersPage() {
  const session = await requireHqSession();
  const [bundle, growth] = await Promise.all([
    fetchCompanyHqBundle(session.workspaceId),
    fetchUserGrowthEngineBundle(session.workspaceId),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[10px] tracking-[0.2em] uppercase text-[#9c7b8b]">INTERTEXE HQ</p>
        <h1 className="font-serif text-2xl sm:text-3xl mt-1">Member growth</h1>
        <p className="text-sm text-black/55 mt-2">
          {formatCompanyCount(bundle.members.total)} today · target {formatCompanyCount(bundle.plan.members)} by{" "}
          {new Date(bundle.plan.deadlineIso).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </p>
      </header>

      <div className="max-w-md">
        <NorthStarKpiCard kpi={bundle.northStar.members} />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="This week" value={`+${formatCompanyCount(bundle.members.d7)}`} />
        <Stat label="This month" value={`+${formatCompanyCount(bundle.members.d30)}`} />
        <Stat label="Required / day" value={`+${formatCompanyCount(bundle.members.requiredPerDay)}`} />
        <Stat label="Forecast hit date" value={bundle.members.forecastHitDate || "—"} />
      </div>

      <HqSectionFrame title="Growth scoreboard" description="Dynamic pace from live member count">
        <UserGrowthDashboard bundle={growth} />
      </HqSectionFrame>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4">
      <p className="text-[10px] tracking-wide uppercase text-black/40">{label}</p>
      <p className="text-xl font-light tabular-nums mt-1">{value}</p>
    </div>
  );
}
