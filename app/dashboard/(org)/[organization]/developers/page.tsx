import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { entitlementsForPlan, type PlanKey } from "../../../../../lib/enterprise/entitlements";
import { OrgSectionFrame } from "../section-frame";
import { ORG_PAGE_STATES } from "../../../../../lib/enterprise/page-states";

export const dynamic = "force-dynamic";

export default async function DevelopersPage({
  params,
}: {
  params: Promise<{ organization: string }>;
}) {
  const { membership } = await requireOrganizationAccess((await params).organization);
  const entitlement = entitlementsForPlan(membership.plan as PlanKey);
  return (
    <OrgSectionFrame
      title="Developers"
      description="API credentials, docs, webhooks, recent calls, and errors. Secret values are stored as hashes and are never sent to the browser."
      state={ORG_PAGE_STATES.developers}
      emptyTitle={entitlement.canUseApi ? "No API credentials" : "API access is not included on this plan"}
      emptyBody="When credentials are created, only a prefix is shown. The full secret is displayed once at creation time on the server response, then discarded."
    />
  );
}
