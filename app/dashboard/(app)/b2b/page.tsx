import { requireHqSession } from "../../../../lib/dashboard/auth";
import { fetchCompanyHqBundle } from "../../../../lib/dashboard/company-hq";
import { fetchRevenueCommandCenter } from "../../../../lib/dashboard/revenue-command-center";
import { formatCompanyCount, formatCompanyMoney } from "../../../../lib/dashboard/company-plan";
import { NorthStarKpiCard, HqSectionFrame } from "../../components/CompanyHqUi";

export const metadata = { title: "B2B" };
export const dynamic = "force-dynamic";

export default async function HqB2bPage() {
  const session = await requireHqSession();
  const [bundle, commandCenter] = await Promise.all([
    fetchCompanyHqBundle(session.workspaceId),
    fetchRevenueCommandCenter(session.workspaceId).catch(() => null),
  ]);

  const saasStream = bundle.revenue.streams.find((s) => s.key === "saas");
  const companyDeals = commandCenter?.deals.filter((d) => d.scope === "company") ?? [];
  const openPipeline = companyDeals.filter((d) => d.stage !== "won" && d.stage !== "lost");

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[10px] tracking-[0.2em] uppercase text-[#9c7b8b]">INTERTEXE HQ</p>
        <h1 className="font-serif text-2xl sm:text-3xl mt-1">B2B / SaaS</h1>
        <p className="text-sm text-black/55 mt-2">
          {formatCompanyCount(bundle.b2b.activeClients)} active clients · SaaS target{" "}
          {formatCompanyMoney(saasStream?.target ?? 600_000)}
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-4">
        <NorthStarKpiCard kpi={bundle.northStar.b2bClients} />
        <div className="rounded-2xl border border-black/10 bg-white p-5">
          <p className="text-[10px] tracking-wide uppercase text-black/40">SaaS revenue YTD</p>
          <p className="text-3xl font-light tabular-nums mt-2">{formatCompanyMoney(saasStream?.current ?? 0)}</p>
          <p className="text-sm text-black/45 mt-1">
            Gap {formatCompanyMoney(saasStream?.gap ?? 0)} · {saasStream?.progressPct.toFixed(1)}% of target
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Weighted pipeline" value={formatCompanyMoney(bundle.b2b.weightedPipeline)} />
        <Stat label="Prospects engaged" value={String(bundle.b2b.prospects)} />
        <Stat label="Proposals sent" value={String(bundle.b2b.proposals)} />
        <Stat label="Pilots active" value={String(bundle.b2b.pilotsActive)} />
      </div>

      <HqSectionFrame title="Company pipeline" description="Deals in flight — company scope only">
        {openPipeline.length ? (
          <ul className="space-y-2 text-sm">
            {openPipeline.slice(0, 12).map((deal) => (
              <li key={deal.id} className="flex justify-between gap-3 border-b border-black/5 py-2">
                <span className="text-black/75">{deal.companyName}</span>
                <span className="text-black/45 shrink-0 capitalize">{deal.stage.replace(/_/g, " ")}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-black/45">No open company deals in pipeline.</p>
        )}
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
