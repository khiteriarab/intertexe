import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { loadOrgIntegrations } from "../../../../../lib/enterprise/module-queries";
import {
  EntEmptyState,
  EntIntegrationTile,
  EntModulePage,
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
    <EntModulePage title="Integrations">
      {connected === 0 ? (
        <div className="mb-8">
          <EntEmptyState
            title="No external connections are configured"
            body="CSV catalog import is available from Products. API credentials and webhooks can be configured when your organization needs them."
            ctaHref={`/dashboard/${membership.slug}/products`}
            ctaLabel="Go to Products"
          />
        </div>
      ) : null}

      <div className="grid sm:grid-cols-2 gap-5 md:gap-6">
        {rows.map((row, index) => (
          <EntIntegrationTile
            key={row.id}
            category={row.category}
            label={row.label}
            detail={row.detail}
            state={row.state}
            href={row.href}
            featured={index === 0 || row.id === "eu-registry"}
          />
        ))}
      </div>
    </EntModulePage>
  );
}
