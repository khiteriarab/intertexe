import Link from "next/link";
import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { loadOrgIntegrations } from "../../../../../lib/enterprise/module-queries";
import {
  EntEmptyState,
  EntIntegrationState,
  EntModulePage,
  EntModuleSection,
  entLinkClass,
} from "../../../components/EnterpriseModuleUi";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage({
  params,
}: {
  params: Promise<{ organization: string }>;
}) {
  const { organization } = await params;
  const { membership, client } = await requireOrganizationAccess(organization);
  const { rows } = await loadOrgIntegrations(client, membership.organizationId, membership.slug);

  const connected = rows.filter((r) => r.state === "connected").length;

  return (
    <EntModulePage
      title="Integrations"
      description="Connections and import paths available to this organization today."
    >
      {connected === 0 ? (
        <EntEmptyState
          title="No external connections are configured"
          body="CSV catalog import is available from Products. API credentials and webhooks can be configured when your organization needs them."
          ctaHref={`/dashboard/${membership.slug}/products`}
          ctaLabel="Go to Products"
        />
      ) : null}

      <EntModuleSection title="Available integrations">
        <ul className="divide-y divide-[var(--ent-border)]">
          {rows.map((row) => (
            <li key={row.id} className="py-5 md:py-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] tracking-[0.08em] uppercase text-[var(--ent-muted-light)]">{row.category}</p>
                <p className="text-[16px] font-medium text-[var(--ent-ink)] mt-1">{row.label}</p>
                <p className="text-sm text-[var(--ent-muted)] mt-1">{row.detail}</p>
                {row.href ? (
                  <Link href={row.href} className={`${entLinkClass} mt-3 inline-flex`}>
                    Open →
                  </Link>
                ) : null}
              </div>
              <EntIntegrationState state={row.state} />
            </li>
          ))}
        </ul>
      </EntModuleSection>
    </EntModulePage>
  );
}
