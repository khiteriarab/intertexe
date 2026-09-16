import Link from "next/link";
import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { loadPlatformIntelligenceForOrg } from "../../../../../lib/enterprise/platform-intelligence";
import { EntIntelligenceWorkspace } from "../../../components/EntIntelligenceWorkspace";
import { EntModulePage } from "../../../components/EnterpriseModuleUi";
import { ORG_PAGE_STATES } from "../../../../../lib/enterprise/page-states";

export const dynamic = "force-dynamic";

export default async function IntelligencePage({
  params,
}: {
  params: Promise<{ organization: string }>;
}) {
  const { organization } = await params;
  const { membership, client } = await requireOrganizationAccess(organization);
  const base = `/dashboard/${membership.slug}`;
  const data = await loadPlatformIntelligenceForOrg(
    client,
    membership.organizationId,
    membership.slug,
    membership.plan
  );

  return (
    <EntModulePage
      title="Intelligence"
      subtitle="Brief, recommended actions, material benchmark, demand forecast, and evidence confidence — assembled from your live workspace."
      state={ORG_PAGE_STATES.intelligence}
      action={
        <Link href={`${base}/benchmarking`} className="ent-link-subtle text-sm">
          Open benchmarking →
        </Link>
      }
    >
      <EntIntelligenceWorkspace data={data} base={base} variant="full" />
    </EntModulePage>
  );
}
