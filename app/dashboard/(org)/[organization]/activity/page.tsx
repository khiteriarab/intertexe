import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { OrgSectionFrame } from "../section-frame";
import { ORG_PAGE_STATES } from "../../../../../lib/enterprise/page-states";

export const dynamic = "force-dynamic";

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ organization: string }>;
}) {
  await requireOrganizationAccess((await params).organization);
  return (
    <OrgSectionFrame
      title="Activity"
      description="Human-readable operational history. Security events live in the separate audit log, visible to owners and admins according to role."
      state={ORG_PAGE_STATES.activity}
      emptyTitle="No activity yet"
      emptyBody="Imports, approvals, supplier submissions, and passport publications will appear here after those workflows run."
    />
  );
}
