import { requireHqSession } from "../../../../lib/dashboard/auth";
import { fetchCompanyHqBundle } from "../../../../lib/dashboard/company-hq";
import { NorthStarKpiCard, HqSectionFrame } from "../../components/CompanyHqUi";

export const metadata = { title: "Speaking" };
export const dynamic = "force-dynamic";

export default async function HqSpeakingPage() {
  const session = await requireHqSession();
  const bundle = await fetchCompanyHqBundle(session.workspaceId);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[10px] tracking-[0.2em] uppercase text-[#9c7b8b]">INTERTEXE HQ</p>
        <h1 className="font-serif text-2xl sm:text-3xl mt-1">Speaking engagements</h1>
        <p className="text-sm text-black/55 mt-2">
          Year 1 target {bundle.plan.speakingEngagements} · milestone: Copenhagen Fashion Week
        </p>
      </header>

      <div className="max-w-md">
        <NorthStarKpiCard kpi={bundle.northStar.speaking} />
      </div>

      <HqSectionFrame title="Speaking log" description="Event, audience, topic, and measurable outcomes">
        <p className="text-sm text-black/45">
          {bundle.speaking.total} confirmed · {bundle.speaking.contacts} opportunities tracked. Add events with date,
          location, audience size, and resulting leads or press.
        </p>
      </HqSectionFrame>
    </div>
  );
}
