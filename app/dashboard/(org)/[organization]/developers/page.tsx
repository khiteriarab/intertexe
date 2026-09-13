import Link from "next/link";
import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { entitlementsForPlan, type PlanKey } from "../../../../../lib/enterprise/entitlements";
import { loadOrgDevelopers } from "../../../../../lib/enterprise/module-queries";
import { EntUpgradePrompt } from "../../../components/EntUpgradePrompt";
import {
  EntCodePanel,
  EntModulePage,
  EntVisualPanel,
  entLinkClass,
} from "../../../components/EnterpriseModuleUi";
import { entButtonGhostClass } from "../../../components/EnterpriseUi";
import { DevelopersClient } from "./DevelopersClient";

export const dynamic = "force-dynamic";

export default async function DevelopersPage({
  params,
}: {
  params: Promise<{ organization: string }>;
}) {
  const { organization } = await params;
  const { membership, client } = await requireOrganizationAccess(organization);
  const data = await loadOrgDevelopers(client, membership.organizationId, membership.role);
  const entitlements = entitlementsForPlan(membership.plan as PlanKey, {
    productAllowance: membership.productAllowance,
  });

  return (
    <EntModulePage title="Developers">
      {!entitlements.canUseHeadlessApi ? (
        <div className="mb-8">
          <EntUpgradePrompt
            slug={membership.slug}
            plan={membership.plan}
            feature="Headless passport API"
            title="Headless API requires Enterprise"
            body="Standard API access is included on Professional. Programmatic passport delivery, custom volume, and headless resolver access require Enterprise."
          />
        </div>
      ) : null}
      <div className="grid lg:grid-cols-2 gap-5 md:gap-6 mb-6">
        <EntVisualPanel tone="cream" title="Organization identifiers">
          <div className="space-y-4">
            <EntCodePanel label="Organization ID" value={data.organization?.id || membership.organizationId} />
            <EntCodePanel label="Slug" value={data.organization?.slug || membership.slug} />
          </div>
        </EntVisualPanel>

        <EntVisualPanel tone="petrol" title="Public passport resolver">
          <EntCodePanel label="Resolver pattern" value={data.publicPassportExample} />
          <p className="text-sm text-white/60 mt-5 leading-relaxed">
            Replace {"{public_id}"} with a published passport identifier. Published snapshots are immutable.
          </p>
          <Link href={data.docsUrl} className={`${entButtonGhostClass} mt-6 inline-flex border-white/20 text-white hover:bg-white/10`} target="_blank" rel="noreferrer">
            Platform documentation →
          </Link>
        </EntVisualPanel>
      </div>

      <div className="grid lg:grid-cols-2 gap-5 md:gap-6">
        <EntVisualPanel tone="butter" title="API credentials">
          <DevelopersClient slug={membership.slug} canManage={data.canSeeCredentials} />
        </EntVisualPanel>

        <EntVisualPanel tone="stone" title="Webhooks">
          <p className="text-xs text-[var(--ent-muted-light)] mb-4">
            Create and revoke webhooks in the API credentials panel.
          </p>
          <div className="ent-panel-nested px-6 py-8 text-center">
            <p className="ent-display text-[3rem] leading-none text-[var(--ent-petrol-deep)]">{data.webhookCount}</p>
            <p className="text-sm text-[var(--ent-muted)] mt-2">
              {data.webhookCount === 1 ? "Webhook configured" : "Webhooks configured"}
            </p>
          </div>
        </EntVisualPanel>
      </div>
    </EntModulePage>
  );
}
