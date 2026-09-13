import type { Metadata } from "next";
import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { OrgBillingPanel } from "../../../components/OrgBillingPanel";
import { EntModulePage } from "../../../components/EnterpriseModuleUi";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Billing · INTERTEXE",
  robots: { index: false, follow: false },
};

/** Customer SaaS billing — org workspace only, not founder HQ. */
export default async function BillingPage({ params }: { params: Promise<{ organization: string }> }) {
  const { organization } = await params;
  const { membership } = await requireOrganizationAccess(organization);

  return (
    <EntModulePage
      title="Billing"
      subtitle="Plan, usage, and subscription for this workspace. All members can see usage; owners manage checkout."
    >
      <OrgBillingPanel slug={membership.slug} />
    </EntModulePage>
  );
}
