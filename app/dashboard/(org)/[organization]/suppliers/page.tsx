import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { entitlementsForPlan, type PlanKey } from "../../../../../lib/enterprise/entitlements";
import { OrgSectionFrame } from "../section-frame";
import { ORG_PAGE_STATES } from "../../../../../lib/enterprise/page-states";

export const dynamic = "force-dynamic";

export default async function SuppliersPage({
  params,
}: {
  params: Promise<{ organization: string }>;
}) {
  const { organization } = await params;
  const { membership } = await requireOrganizationAccess(organization);
  const entitlement = entitlementsForPlan(membership.plan as PlanKey);
  return (
    <OrgSectionFrame
      title="Suppliers"
      description="Supplier contributors only see requests assigned to them. Submissions enter review before becoming canonical product information."
      state={ORG_PAGE_STATES.suppliers}
      emptyTitle={entitlement.canUseSuppliers ? "No supplier requests" : "Not included on this plan"}
      emptyBody={
        entitlement.canUseSuppliers
          ? "Create a request from a product's missing fields. This workflow is not live until catalog processing exists."
          : "Supplier workflows are not included in the free snapshot. Upgrade in place to the Founding DPP Pilot."
      }
    />
  );
}
