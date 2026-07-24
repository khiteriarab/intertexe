import { requireHqSession } from "../../../../lib/dashboard/auth";
import { fetchInsightsBundle } from "../../../../lib/dashboard/insights";
import { HqCard, HqEmptyState, HqPageHeader } from "../../components/HqUi";

export const metadata = { title: "Insights" };
export const dynamic = "force-dynamic";

export default async function DashboardInsightsPage() {
  const session = await requireHqSession();
  const { live, stored } = await fetchInsightsBundle(session.workspaceId);

  return (
    <div>
      <HqPageHeader
        title="Insights"
        description="Rule-based signals from live scanner, commerce, and DPP metrics. Conversational AI builds on this layer next."
      />

      <div className="grid gap-3 mb-8">
        {live.map((insight) => (
          <HqCard key={insight.key}>
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <div>
                <p className="text-[10px] tracking-[0.14em] uppercase text-black/40">{insight.severity}</p>
                <h2 className="text-base font-medium mt-1">{insight.title}</h2>
                <p className="text-sm text-black/60 mt-2 leading-relaxed">{insight.explanation}</p>
                <p className="text-sm mt-3">
                  <span className="text-black/40">Recommended: </span>
                  {insight.recommendedAction}
                </p>
              </div>
              <span className="text-[10px] tracking-[0.12em] uppercase border border-black/10 px-2 py-1 rounded-full self-start">
                Live
              </span>
            </div>
          </HqCard>
        ))}
      </div>

      <HqCard title="Stored insight history">
        {stored.length ? (
          <ul className="space-y-3 text-sm">
            {stored.map((row: any) => (
              <li key={row.id} className="border-b border-black/5 pb-3">
                <div className="flex justify-between gap-3">
                  <p className="font-medium">{row.title}</p>
                  <span className="text-xs uppercase text-black/40">{row.status}</span>
                </div>
                <p className="text-black/55 mt-1">{row.explanation}</p>
              </li>
            ))}
          </ul>
        ) : (
          <HqEmptyState
            title="No stored insights yet"
            body="Live rules will persist new insights into hq_generated_insights as they fire."
          />
        )}
      </HqCard>
    </div>
  );
}
