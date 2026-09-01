import Link from "next/link";
import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { entitlementsForPlan, type PlanKey } from "../../../../../lib/enterprise/entitlements";
import { listOrganizationInvitations } from "../../../../../lib/enterprise/founder-invitations";
import { loadOrgMemberDirectory } from "../../../../../lib/enterprise/reviewer-display";
import { OrgTeamPanel } from "../../../components/OrgTeamPanel";
import { HqCard } from "../section-frame";
import { OrgSectionFrame } from "../section-frame";
import { ORG_PAGE_STATES } from "../../../../../lib/enterprise/page-states";

export const dynamic = "force-dynamic";

export default async function OrganizationSettingsPage({
  params,
}: {
  params: Promise<{ organization: string }>;
}) {
  const { organization } = await params;
  const { membership, client } = await requireOrganizationAccess(organization);
  const entitlement = entitlementsForPlan(membership.plan as PlanKey, {});
  const base = `/dashboard/${membership.slug}`;
  const canInvite = ["owner", "admin"].includes(membership.role);
  const [members, invitations] = await Promise.all([
    loadOrgMemberDirectory(client, membership.organizationId),
    canInvite ? listOrganizationInvitations(client, membership.organizationId) : Promise.resolve([]),
  ]);

  return (
    <OrgSectionFrame
      brandLine
      title="Settings"
      description="Organization identity, team access, and workspace preferences for this INTERTEXE workspace."
      state={ORG_PAGE_STATES.settings}
    >
      <div className="ent-settings-banner mb-6">
        <p className="text-sm text-[var(--ent-ink-soft)]">
          Workspace settings for <strong>{membership.name}</strong>. API credentials live under Developers; external
          systems under Integrations.
        </p>
        <div className="flex flex-wrap gap-4 mt-3">
          <Link href={`${base}/workflows`} className="ent-link-subtle">
            Workflow assignments →
          </Link>
          <Link href={`${base}/developers`} className="ent-link-subtle">
            Developers →
          </Link>
          <Link href={`${base}/integrations`} className="ent-link-subtle">
            Integrations →
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <HqCard title="Organization" tone="blush">
          <dl className="text-sm space-y-4">
            <div>
              <dt className="text-[var(--ent-muted-light)] text-xs mb-1">Name</dt>
              <dd className="text-[var(--ent-ink)] font-medium">{membership.name}</dd>
            </div>
            <div>
              <dt className="text-[var(--ent-muted-light)] text-xs mb-1">Slug</dt>
              <dd className="font-mono text-xs text-[var(--ent-ink-soft)]">{membership.slug}</dd>
            </div>
            <div>
              <dt className="text-[var(--ent-muted-light)] text-xs mb-1">Your role</dt>
              <dd className="text-[var(--ent-ink-soft)] capitalize">{membership.role.replaceAll("_", " ")}</dd>
            </div>
          </dl>
        </HqCard>
        <HqCard title="Entitlements" tone="butter">
          <dl className="text-sm space-y-4">
            <div>
              <dt className="text-[var(--ent-muted-light)] text-xs mb-1">Plan</dt>
              <dd className="text-[var(--ent-ink-soft)] capitalize">{membership.plan.replaceAll("_", " ")}</dd>
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

      <div className="grid lg:grid-cols-2 gap-6">
        <HqCard title="Team & roles" tone="cream">
          <OrgTeamPanel slug={membership.slug} invitations={invitations} canInvite={canInvite} />
        </HqCard>
        <HqCard title="Active members" tone="stone">
          <ul className="divide-y divide-[var(--ent-border)]">
            {Array.from(members.values()).map((member) => (
              <li key={member.id || member.name} className="py-3 flex items-center justify-between gap-4 text-sm">
                <div>
                  <p className="font-medium text-[var(--ent-ink)]">{member.name}</p>
                  {member.email ? (
                    <p className="text-xs text-[var(--ent-muted-light)] mt-0.5">{member.email}</p>
                  ) : null}
                </div>
                <span className="text-xs text-[var(--ent-muted)] capitalize">
                  {member.role?.replaceAll("_", " ") || "member"}
                </span>
              </li>
            ))}
          </ul>
        </HqCard>
      </div>
    </OrgSectionFrame>
  );
}
