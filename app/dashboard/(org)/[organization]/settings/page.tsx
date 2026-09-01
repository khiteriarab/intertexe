import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { entitlementsForPlan, type PlanKey } from "../../../../../lib/enterprise/entitlements";
import { HqCard } from "../section-frame";
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
      brandLine
      title="Settings"
      description="Organization identity, plan entitlements, and notification preferences. Plan changes upgrade this organization in place."
      state={ORG_PAGE_STATES.settings}
    >
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <HqCard title="Organization">
          <dl className="text-sm space-y-4">
            <div>
              <dt className="text-[var(--ent-muted-light)] text-xs mb-1">Name</dt>
              <dd className="text-[var(--ent-ink)]">{membership.name}</dd>
            </div>
            <div>
              <dt className="text-[var(--ent-muted-light)] text-xs mb-1">Slug</dt>
              <dd className="font-mono text-xs text-[var(--ent-ink-soft)]">{membership.slug}</dd>
            </div>
            <div>
              <dt className="text-[var(--ent-muted-light)] text-xs mb-1">Your role</dt>
              <dd className="text-[var(--ent-ink-soft)]">{membership.role.replaceAll("_", " ")}</dd>
            </div>
          </dl>
        </HqCard>
        <HqCard title="Entitlements">
          <dl className="text-sm space-y-4">
            <div>
              <dt className="text-[var(--ent-muted-light)] text-xs mb-1">Plan</dt>
              <dd className="text-[var(--ent-ink-soft)]">{membership.plan.replaceAll("_", " ")}</dd>
            </div>
            <div>
              <dt className="text-[var(--ent-muted-light)] text-xs mb-1">Product allowance</dt>
              <dd className="text-[var(--ent-ink-soft)]">{entitlement.productAllowance ?? "Unlimited"}</dd>
            </div>
            <div>
              <dt className="text-[var(--ent-muted-light)] text-xs mb-1">Passport publishing</dt>
              <dd className="text-[var(--ent-ink-soft)]">
                {entitlement.canPublishPassports ? "Allowed when publishability passes" : "Not included"}
              </dd>
            </div>
          </dl>
        </HqCard>
      </div>
    </OrgSectionFrame>
  );
}
