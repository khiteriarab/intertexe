import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { listApprovalRequests } from "../../../../../lib/enterprise/approvals";
import { EntModulePage } from "../../../components/EnterpriseModuleUi";
import { ApprovalsClient } from "./ApprovalsClient";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage({
  params,
}: {
  params: Promise<{ organization: string }>;
}) {
  const { organization } = await params;
  const { membership, client } = await requireOrganizationAccess(organization);
  const pending = await listApprovalRequests(client, membership.organizationId, "pending");
  const decided = await listApprovalRequests(client, membership.organizationId);

  return (
    <EntModulePage title="Approvals" subtitle="Explicit review requests with approver, comment, and history.">
      <ApprovalsClient organization={membership.slug} pending={pending} decided={decided.filter((r) => r.status !== "pending")} />
    </EntModulePage>
  );
}
