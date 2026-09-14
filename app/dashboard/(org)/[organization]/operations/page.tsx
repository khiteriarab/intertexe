import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { loadOperationsDashboard } from "../../../../../lib/enterprise/operations-dashboard";
import { OperationsDashboard } from "./OperationsDashboard";

export const dynamic = "force-dynamic";

export default async function OperationsPage({
  params,
}: {
  params: Promise<{ organization: string }>;
}) {
  const { organization } = await params;
  const { membership, client } = await requireOrganizationAccess(organization);
  const data = await loadOperationsDashboard(client, membership.organizationId, membership.slug);

  return (
    <OperationsDashboard data={data} slug={membership.slug} plan={membership.plan} />
  );
}
