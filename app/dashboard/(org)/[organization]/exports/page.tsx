import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { EntModulePage } from "../../../components/EnterpriseModuleUi";
import { ExportsClient } from "./ExportsClient";

export const dynamic = "force-dynamic";

export default async function ExportsPage({
  params,
}: {
  params: Promise<{ organization: string }>;
}) {
  const { organization } = await params;
  const { membership } = await requireOrganizationAccess(organization);
  return (
    <EntModulePage title="Exports" subtitle="Download governed snapshots of your workspace data.">
      <ExportsClient organization={membership.slug} />
    </EntModulePage>
  );
}
