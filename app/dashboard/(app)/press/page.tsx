import { requireHqSession } from "../../../../lib/dashboard/auth";
import { fetchCompanyHqBundle } from "../../../../lib/dashboard/company-hq";
import { NorthStarKpiCard, HqSectionFrame } from "../../components/CompanyHqUi";

export const metadata = { title: "Press" };
export const dynamic = "force-dynamic";

export default async function HqPressPage() {
  const session = await requireHqSession();
  const bundle = await fetchCompanyHqBundle(session.workspaceId);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[10px] tracking-[0.2em] uppercase text-[#9c7b8b]">INTERTEXE HQ</p>
        <h1 className="font-serif text-2xl sm:text-3xl mt-1">Press + visibility</h1>
        <p className="text-sm text-black/55 mt-2">
          Year 1 target {bundle.plan.pressFeatures} meaningful press features
        </p>
      </header>

      <div className="max-w-md">
        <NorthStarKpiCard kpi={bundle.northStar.press} />
      </div>

      <HqSectionFrame title="Press pipeline" description="Contacts and opportunities in BD funnel">
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-[10px] tracking-wide uppercase text-black/40">Published features</p>
            <p className="text-2xl font-light tabular-nums mt-1">{bundle.press.total}</p>
          </div>
          <div>
            <p className="text-[10px] tracking-wide uppercase text-black/40">Press contacts in pipeline</p>
            <p className="text-2xl font-light tabular-nums mt-1">{bundle.press.contacts}</p>
          </div>
        </div>
        <p className="text-sm text-black/45 mt-4">
          Log publications, reach, resulting traffic, and sign-ups here as the press tracker ships.
        </p>
      </HqSectionFrame>
    </div>
  );
}
