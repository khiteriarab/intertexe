import Link from "next/link";
import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { formatOperatorTime } from "../../../../../lib/enterprise/reviewer-display";
import { loadOrgDevelopers } from "../../../../../lib/enterprise/module-queries";
import {
  EntCodePanel,
  EntEmptyState,
  EntModulePage,
  EntVisualPanel,
  entLinkClass,
} from "../../../components/EnterpriseModuleUi";
import { entButtonGhostClass } from "../../../components/EnterpriseUi";

export const dynamic = "force-dynamic";

export default async function DevelopersPage({
  params,
}: {
  params: Promise<{ organization: string }>;
}) {
  const { organization } = await params;
  const { membership, client } = await requireOrganizationAccess(organization);
  const data = await loadOrgDevelopers(client, membership.organizationId, membership.role);

  return (
    <EntModulePage
      title="Developers"
      description="Technical identifiers and integration references. Secrets are never displayed here."
      zone="stone"
    >
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
          {!data.canSeeCredentials ? (
            <p className="text-sm text-[var(--ent-muted)]">API credential management requires an owner, admin, or developer role.</p>
          ) : data.credentials.length === 0 ? (
            <EntEmptyState
              title="No API credentials configured"
              body="Organization API key management is not exposed in this workspace yet. Contact INTERTEXE when you need programmatic access."
            />
          ) : (
            <ul className="space-y-3">
              {data.credentials.map((cred) => (
                <li key={cred.id} className="ent-panel-nested px-5 py-4">
                  <p className="font-medium text-[var(--ent-ink)]">{cred.name}</p>
                  <p className="font-mono text-xs text-[var(--ent-muted)] mt-2">
                    Prefix {cred.prefix}···
                  </p>
                  <p className="text-sm text-[var(--ent-muted-light)] mt-2">
                    Created {formatOperatorTime(cred.created_at)}
                    {cred.last_used_at ? ` · Last used ${formatOperatorTime(cred.last_used_at)}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </EntVisualPanel>

        <EntVisualPanel tone="stone" title="Webhooks">
          <div className="ent-panel-nested px-6 py-8 text-center">
            <p className="ent-display text-[3rem] leading-none text-[var(--ent-petrol-deep)]">{data.webhookCount}</p>
            <p className="text-sm text-[var(--ent-muted)] mt-2">
              {data.webhookCount === 1 ? "Webhook configured" : "Webhooks configured"}
            </p>
            <p className="text-xs text-[var(--ent-muted-light)] mt-4 max-w-xs mx-auto">
              Endpoint URLs and secrets are not shown here.
            </p>
          </div>
        </EntVisualPanel>
      </div>
    </EntModulePage>
  );
}
