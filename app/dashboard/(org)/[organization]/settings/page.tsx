import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { entitlementsForPlan, type PlanKey } from "../../../../../lib/enterprise/entitlements";
import { HqCard } from "../../../components/HqUi";
import { OrgSectionFrame } from "../section-frame";
import { ORG_PAGE_STATES } from "../../../../../lib/enterprise/page-states";

export const dynamic = "force-dynamic";

export default async function OrganizationSettingsPage({
  params,
}: {
  params: Promise<{ organization: string }>;
}) {
  const { membership } = await requireOrganizationAccess((await params).organization);
  const entitlement = entitlementsForPlan(membership.plan as PlanKey, {});
  return (
    <OrgSectionFrame
      title="Settings"
      description="Organization identity, plan entitlements, and notification preferences. Plan changes upgrade this organization in place."
      state={ORG_PAGE_STATES.settings}
    >
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <HqCard title="Organization">
          <dl className="text-sm space-y-2">
            <div>
              <dt className="text-black/45">Name</dt>
              <dd>{membership.name}</dd>
            </div>
            <div>
              <dt className="text-black/45">Slug</dt>
              <dd className="font-mono text-xs">{membership.slug}</dd>
            </div>
            <div>
              <dt className="text-black/45">Your role</dt>
              <dd>{membership.role.replaceAll("_", " ")}</dd>
            </div>
          </dl>
        </HqCard>
        <HqCard title="Entitlements">
          <dl className="text-sm space-y-2">
            <div>
              <dt className="text-black/45">Plan</dt>
              <dd>{membership.plan.replaceAll("_", " ")}</dd>
            </div>
            <div>
              <dt className="text-black/45">Product allowance</dt>
              <dd>{entitlement.productAllowance ?? "Unlimited"}</dd>
            </div>
            <div>
              <dt className="text-black/45">Passport publishing</dt>
              <dd>{entitlement.canPublishPassports ? "Allowed when publishability passes" : "Not included"}</dd>
            </div>
          </dl>
        </HqCard>
      </div>
    </OrgSectionFrame>
  );
}
