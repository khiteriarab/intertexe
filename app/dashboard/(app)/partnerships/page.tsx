import { requireHqSession } from "../../../../lib/dashboard/auth";
import { fetchCompanyHqBundle } from "../../../../lib/dashboard/company-hq";
import { fetchFounderToday } from "../../../../lib/dashboard/command-center";
import { formatCompanyMoney } from "../../../../lib/dashboard/company-plan";
import { HqSectionFrame } from "../../components/CompanyHqUi";

export const metadata = { title: "Partnerships" };
export const dynamic = "force-dynamic";

export default async function HqPartnershipsPage() {
  const session = await requireHqSession();
  const [bundle, founder] = await Promise.all([
    fetchCompanyHqBundle(session.workspaceId),
    fetchFounderToday(session.workspaceId),
  ]);

  const bd = founder.bd;

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[10px] tracking-[0.2em] uppercase text-[#9c7b8b]">INTERTEXE HQ</p>
        <h1 className="font-serif text-2xl sm:text-3xl mt-1">Partnerships</h1>
        <p className="text-sm text-black/55 mt-2">
          Retailers, brands, media, events, and strategic relationships
        </p>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Active pipeline value" value={formatCompanyMoney(bundle.b2b.pipelineValue)} />
        <Stat label="Press contacts" value={String(bd.opportunities.press + bd.introQueue.press)} />
        <Stat label="Brand opportunities" value={String(bd.opportunities.brand)} />
        <Stat label="Contacted this week" value={String(bd.weekContacted)} />
      </div>

      <HqSectionFrame title="Pipeline stages" description="Active · Pending · Contacted · Negotiating · Closed · Lost">
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-[10px] tracking-wide uppercase text-black/40 mb-2">Opportunities</p>
            <ul className="space-y-1 text-black/65">
              <li>Brand: {bd.opportunities.brand}</li>
              <li>Influencer: {bd.opportunities.influencer}</li>
              <li>Organization: {bd.opportunities.organization}</li>
              <li>Press: {bd.opportunities.press}</li>
            </ul>
          </div>
          <div>
            <p className="text-[10px] tracking-wide uppercase text-black/40 mb-2">Intro queue</p>
            <ul className="space-y-1 text-black/65">
              <li>Brand: {bd.introQueue.brand}</li>
              <li>Business: {bd.introQueue.business}</li>
              <li>Press: {bd.introQueue.press}</li>
              <li>Influencer: {bd.introQueue.influencer}</li>
            </ul>
          </div>
        </div>
      </HqSectionFrame>
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

