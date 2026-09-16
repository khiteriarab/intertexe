import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { loadOrgIntegrations } from "../../../../../lib/enterprise/module-queries";
import { EntOpsPageHeader } from "../../../components/EntOpsModuleUi";
import { IntegrationsWorkspace } from "./IntegrationsWorkspace";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage({
  params,
}: {
  params: Promise<{ organization: string }>;
}) {
  const { organization } = await params;
  const { membership, client } = await requireOrganizationAccess(organization);
  const data = await loadOrgIntegrations(client, membership.organizationId, membership.slug);

  return (
    <div className="ent-opsmod-page ent-fade-in">
      <EntOpsPageHeader
        title="Integrations"
        subtitle="Connect sustainability providers, data imports, API credentials, and registry workflows."
      />
      <IntegrationsWorkspace rows={data.rows} slug={membership.slug} />
    </div>
  );
}
