import Link from "next/link";
import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { formatOperatorTime } from "../../../../../lib/enterprise/reviewer-display";
import { loadOrgDevelopers } from "../../../../../lib/enterprise/module-queries";
import {
  EntEmptyState,
  EntModulePage,
  EntModuleSection,
  entLabelClass,
  entLinkClass,
} from "../../../components/EnterpriseModuleUi";

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
      description="Technical identifiers and integration references for this organization. Secrets are never displayed here."
    >
      <EntModuleSection title="Organization">
        <dl className="grid sm:grid-cols-2 gap-6 text-sm max-w-2xl">
          <div>
            <dt className={entLabelClass}>Organization ID</dt>
            <dd className="font-mono text-xs text-[var(--ent-ink-soft)] mt-1 break-all">{data.organization?.id || membership.organizationId}</dd>
          </div>
          <div>
            <dt className={entLabelClass}>Slug</dt>
            <dd className="font-mono text-xs text-[var(--ent-ink-soft)] mt-1">{data.organization?.slug || membership.slug}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className={entLabelClass}>Public passport resolver</dt>
            <dd className="font-mono text-xs text-[var(--ent-ink-soft)] mt-1 break-all">{data.publicPassportExample}</dd>
          </div>
        </dl>
      </EntModuleSection>

      <EntModuleSection title="Documentation">
        <Link href={data.docsUrl} className={entLinkClass} target="_blank" rel="noreferrer">
          INTERTEXE platform documentation →
        </Link>
      </EntModuleSection>

      <EntModuleSection title="API credentials">
        {!data.canSeeCredentials ? (
          <p className="text-sm text-[var(--ent-muted)]">API credential management requires an owner, admin, or developer role.</p>
        ) : data.credentials.length === 0 ? (
          <EntEmptyState
            title="No API credentials configured"
            body="Organization API key management is not exposed in this workspace yet. Contact INTERTEXE when you need programmatic access."
          />
        ) : (
          <ul className="divide-y divide-[var(--ent-border)]">
            {data.credentials.map((cred) => (
              <li key={cred.id} className="py-4">
                <p className="font-medium text-[var(--ent-ink)]">{cred.name}</p>
                <p className="text-sm text-[var(--ent-muted)] mt-1">
                  Prefix {cred.prefix}··· · Created {formatOperatorTime(cred.created_at)}
                  {cred.last_used_at ? ` · Last used ${formatOperatorTime(cred.last_used_at)}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </EntModuleSection>

      <EntModuleSection title="Webhooks">
        <p className="text-sm text-[var(--ent-muted)]">
          {data.webhookCount > 0
            ? `${data.webhookCount} webhook${data.webhookCount === 1 ? "" : "s"} configured. Endpoint URLs and secrets are not shown here.`
            : "No outbound webhooks configured for this organization."}
        </p>
      </EntModuleSection>
    </EntModulePage>
  );
}
