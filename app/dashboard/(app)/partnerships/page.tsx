import { HqCard, HqEmptyState, HqPageHeader } from "../../components/HqUi";
import { requireHqSession } from "../../../../lib/dashboard/auth";

export const metadata = { title: "Partnerships" };

export default async function HqPartnershipsPage() {
  await requireHqSession();
  return (
    <div>
      <HqPageHeader
        title="Partnerships"
        description="Lightweight CRM for brands, retailers, influencers, press, investors, and institutions."
      />
      <HqCard className="mb-4">
        <p className="text-[10px] tracking-[0.14em] uppercase text-black/40 mb-2">Pipeline</p>
        <p className="text-sm text-black/70 leading-relaxed">
          Identified → Researching → Ready to contact → Contacted → Responded → Meeting → Proposal → Negotiating →
          Contract → Active → Follow up later → Lost
        </p>
      </HqCard>
      <HqEmptyState
        title="CRM workspace"
        body="Kanban, contacts, overdue follow-ups, and revenue attribution ship in Phase 2. Nested under Settings in the primary IA so intelligence modules stay primary."
        ctaHref="/dashboard/settings"
        ctaLabel="Back to settings"
      />
    </div>
  );
}
