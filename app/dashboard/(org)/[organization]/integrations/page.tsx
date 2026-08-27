import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { HqCard } from "../../../components/HqUi";
import { OrgSectionFrame } from "../section-frame";
import { ORG_PAGE_STATES } from "../../../../../lib/enterprise/page-states";

export const dynamic = "force-dynamic";

const AVAILABLE = [
  { name: "CSV", note: "Import mapping + preview before commit" },
  { name: "XLSX", note: "Same mapping pipeline as CSV" },
  { name: "JSON", note: "Structured row ingest" },
  { name: "API", note: "Credentials live in Developers — secrets never rendered" },
];

const LATER = ["Shopify", "PLM", "PIM", "ERP", "GS1 registry sync"];

export default async function IntegrationsPage({
  params,
}: {
  params: Promise<{ organization: string }>;
}) {
  await requireOrganizationAccess((await params).organization);
  return (
    <OrgSectionFrame
      title="Integrations"
      description="V1 ingest formats. Unavailable connectors are listed as coming later — they are not simulated."
      state={ORG_PAGE_STATES.integrations}
    >
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <HqCard title="Available">
          <ul className="text-sm space-y-2">
            {AVAILABLE.map((item) => (
              <li key={item.name}>
                <span className="font-medium">{item.name}</span>
                <span className="text-black/50"> — {item.note}</span>
              </li>
            ))}
          </ul>
        </HqCard>
        <HqCard title="Coming later">
          <ul className="text-sm space-y-2 text-black/55">
            {LATER.map((item) => (
              <li key={item}>{item} — unavailable</li>
            ))}
          </ul>
        </HqCard>
      </div>
    </OrgSectionFrame>
  );
}
