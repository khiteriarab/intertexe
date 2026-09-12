import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { buildGettingStartedSteps } from "../../../../../lib/enterprise/getting-started";
import { loadOrgOverview } from "../../../../../lib/enterprise/queries";
import { EntOnboardingFlow } from "../../../components/EntOnboardingFlow";

export const dynamic = "force-dynamic";

export default async function OrganizationOnboardingPage({
  params,
}: {
  params: Promise<{ organization: string }>;
}) {
  const { organization } = await params;
  const { membership, client } = await requireOrganizationAccess(organization);
  const overview = await loadOrgOverview(client, membership.organizationId);
  const base = `/dashboard/${membership.slug}`;
  const steps = buildGettingStartedSteps(overview);

  return (
    <EntOnboardingFlow
      base={base}
      orgSlug={membership.slug}
      orgName={membership.name}
      steps={steps}
    />
  );
}
