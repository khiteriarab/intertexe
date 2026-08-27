import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { HqCard } from "../../../components/HqUi";
import { OrgSectionFrame } from "../section-frame";
import { ORG_PAGE_STATES } from "../../../../../lib/enterprise/page-states";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ organization: string }>;
}) {
  await requireOrganizationAccess((await params).organization);
  return (
    <OrgSectionFrame
      title="Analytics"
      description="Operational, material, and passport-engagement analytics. Consumer INTERTEXE identity is never copied into Enterprise."
      state={ORG_PAGE_STATES.analytics}
    >
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <HqCard title="Operational">
          <p className="text-sm text-black/55">
            Products, passport coverage, open issues, resolution time, supplier response, publishing
            velocity.
          </p>
        </HqCard>
        <HqCard title="Material Intelligence">
          <p className="text-sm text-black/55">
            Catalog material distribution, fibers, components, natural/synthetic split, trends.
          </p>
        </HqCard>
        <HqCard title="Passport engagement">
          <p className="text-sm text-black/55">
            Privacy-safe scans, popular products, sections viewed. No individual consumer identity.
          </p>
        </HqCard>
      </div>
    </OrgSectionFrame>
  );
}
