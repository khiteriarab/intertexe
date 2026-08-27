import { OrgSectionFrame } from "../section-frame";
import { ORG_PAGE_STATES } from "../../../../../lib/enterprise/page-states";
import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";

export const dynamic = "force-dynamic";

export default async function RegulationsPage({
  params,
}: {
  params: Promise<{ organization: string }>;
}) {
  await requireOrganizationAccess((await params).organization);
  return (
    <OrgSectionFrame
      title="Regulations"
      description="Actionable catalog impact only. Rules live in versioned database records and cannot be activated by AI interpretation alone. INTERTEXE does not certify official compliance."
      state={ORG_PAGE_STATES.regulations}
      emptyTitle="No regulatory evaluations"
      emptyBody="When an authorized INTERTEXE reviewer activates a ruleset, products are evaluated into No Action, Update Required, or Manual Review. Old evaluations are not rewritten."
    />
  );
}
