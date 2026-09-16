import { Suspense } from "react";
import Link from "next/link";
import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { loadOrgImpactDashboard } from "../../../../../lib/sustainability/queries";
import { EntOpsKpiRow, EntOpsPageHeader } from "../../../components/EntOpsModuleUi";
import { ImpactWorkspace } from "./ImpactWorkspace";

export const dynamic = "force-dynamic";

export default async function ImpactPage({
  params,
}: {
  params: Promise<{ organization: string }>;
}) {
  const { organization } = await params;
  const { membership, client } = await requireOrganizationAccess(organization);
  const base = `/dashboard/${membership.slug}`;
  const data = await loadOrgImpactDashboard(client, membership.organizationId, membership.slug);
  const { overview } = data;

  return (
    <div className="ent-opsmod-page ent-fade-in">
      <EntOpsPageHeader
        title="Impact"
        subtitle="Environmental impact from connected sustainability providers — linked to product records."
        action={
          <Link href={`${base}/integrations`} className="ent-link-subtle text-sm">
            Integrations →
          </Link>
        }
      />

      <EntOpsKpiRow
        items={[
          {
            id: "products",
            label: "Products with impact",
            value: overview.productsWithImpact,
            hint: `${overview.productCount} in catalog`,
          },
          {
            id: "coverage",
            label: "Primary-data coverage",
            value: overview.primaryDataCoveragePct != null ? `${overview.primaryDataCoveragePct}%` : "—",
            hint: "Measured share",
          },
          {
            id: "evidence",
            label: "Evidence verified",
            value: overview.evidenceStatus.required
              ? `${overview.evidenceStatus.verified}/${overview.evidenceStatus.required}`
              : "—",
            hint: "Required records",
          },
          {
            id: "providers",
            label: "Providers connected",
            value: overview.providerConnections.filter((c) => c.credentialsConfigured).length,
            hint: "Worldly · Green Story · ecoinvent",
          },
        ]}
      />

      <Suspense fallback={<p className="text-sm text-[var(--ent-muted)]">Loading impact workspace…</p>}>
        <ImpactWorkspace data={data} base={base} />
      </Suspense>
    </div>
  );
}
