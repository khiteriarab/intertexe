import { requireHqSession } from "../../../../lib/dashboard/auth";
import { fetchCompanyHqBundle } from "../../../../lib/dashboard/company-hq";
import { formatCompanyMoney } from "../../../../lib/dashboard/company-plan";
import { HqSectionFrame } from "../../components/CompanyHqUi";

export const metadata = { title: "Pilots" };
export const dynamic = "force-dynamic";

export default async function HqPilotsPage() {
  const session = await requireHqSession();
  const bundle = await fetchCompanyHqBundle(session.workspaceId);
  const pilotStream = bundle.revenue.streams.find((s) => s.key === "pilots");

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[10px] tracking-[0.2em] uppercase text-[#9c7b8b]">INTERTEXE HQ</p>
        <h1 className="font-serif text-2xl sm:text-3xl mt-1">Paid pilots</h1>
        <p className="text-sm text-black/55 mt-2">Year 1 target {formatCompanyMoney(pilotStream?.target ?? 100_000)}</p>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Pilot revenue YTD" value={formatCompanyMoney(pilotStream?.current ?? 0)} />
        <Stat label="Gap remaining" value={formatCompanyMoney(pilotStream?.gap ?? 0)} />
        <Stat label="Active pilots" value={String(bundle.b2b.pilotsActive)} />
        <Stat label="Completed" value={String(bundle.b2b.pilotsCompleted)} />
      </div>

      <HqSectionFrame title="Pilot-to-SaaS conversion" description="Track conversion as pilots complete">
        <p className="text-sm text-black/55">
          {bundle.b2b.activeClients} converted clients from {bundle.b2b.pilotsCompleted} completed pilots.
          Conversion rate updates as more pilots close.
        </p>
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
