import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { listApprovalRequests } from "../../../../../lib/enterprise/approvals";
import { EntOpsPageHeader } from "../../../components/EntOpsModuleUi";
import { ApprovalsWorkspace } from "./ApprovalsWorkspace";

export const dynamic = "force-dynamic";

function isToday(iso: string | null | undefined): boolean {
  if (!iso) return false;
  return new Date(iso).toDateString() === new Date().toDateString();
}

export default async function ApprovalsPage({
  params,
}: {
  params: Promise<{ organization: string }>;
}) {
  const { organization } = await params;
  const { membership, client } = await requireOrganizationAccess(organization);
  const pending = await listApprovalRequests(client, membership.organizationId, "pending");
  const decided = await listApprovalRequests(client, membership.organizationId).then((rows) =>
    rows.filter((r) => r.status !== "pending")
  );

  const reviewedToday = decided.filter((r) => isToday(r.decided_at)).length;
  const approved = decided.filter((r) => r.status === "approved").length;
  const approvalRate = decided.length ? Math.round((approved / decided.length) * 100) : 100;

  const turnaroundMs = decided
    .filter((r) => r.decided_at && r.created_at)
    .map((r) => new Date(r.decided_at!).getTime() - new Date(r.created_at).getTime())
    .filter((ms) => ms > 0);
  const avgTurnaroundHours = turnaroundMs.length
    ? Math.round(turnaroundMs.reduce((a, b) => a + b, 0) / turnaroundMs.length / 3_600_000)
    : null;

  return (
    <div className="ent-opsmod-page">
      <EntOpsPageHeader
        title="Approvals"
        subtitle="Explicit review requests with approver, comment, and history."
      />
      <ApprovalsWorkspace
        organization={membership.slug}
        pending={pending}
        decided={decided}
        kpis={{
          pending: pending.length,
          reviewedToday,
          approvalRate,
          avgTurnaroundHours,
        }}
      />
    </div>
  );
}
