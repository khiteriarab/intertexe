import Link from "next/link";
import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { formatRelativeActivityTime } from "../../../../../lib/enterprise/display-format";
import { loadOrgSuppliers } from "../../../../../lib/enterprise/module-queries";
import {
  EntHeroEmpty,
  EntModuleList,
  EntModuleMetrics,
  EntModulePage,
  EntModuleSection,
  entLinkClass,
} from "../../../components/EnterpriseModuleUi";

export const dynamic = "force-dynamic";

export default async function SuppliersPage({
  params,
}: {
  params: Promise<{ organization: string }>;
}) {
  const { organization } = await params;
  const { membership, client } = await requireOrganizationAccess(organization);
  const data = await loadOrgSuppliers(client, membership.organizationId);
  const base = `/dashboard/${membership.slug}`;

  return (
    <EntModulePage
      title="Suppliers"
      description="Supplier and evidence relationships from requests, evidence records, and open issues."
      zone="blush"
    >
      {data.suppliers.length > 0 ? (
        <EntModuleMetrics
          items={[
            { label: "Total suppliers", value: data.summary.total },
            { label: "With linked products", value: data.summary.withProducts },
            { label: "Open requests", value: data.summary.openRequests },
            { label: "Open supplier issues", value: data.summary.openSupplierIssues, accent: data.summary.openSupplierIssues > 0 },
          ]}
        />
      ) : null}

      {data.suppliers.length === 0 ? (
        <EntHeroEmpty
          title="No supplier relationships yet."
          body="Suppliers appear when you request evidence on a product issue, or when supplier records are created through your workflow."
          ctaHref={`${base}/issues`}
          ctaLabel="Review issues"
          tone="blush"
          motif="rings"
        />
      ) : (
        <EntModuleSection title="Supplier list" subtitle="Linked products, evidence status, and recent activity">
          <EntModuleList
            items={data.suppliers.map((supplier) => ({
              key: supplier.id,
              primary: supplier.name,
              secondary: [
                supplier.email,
                supplier.productCount ? `${supplier.productCount} product${supplier.productCount === 1 ? "" : "s"}` : null,
                supplier.outstandingCount ? `${supplier.outstandingCount} outstanding` : null,
              ].filter(Boolean).join(" · ") || undefined,
              meta: supplier.lastActivityAt
                ? `Last activity ${formatRelativeActivityTime(supplier.lastActivityAt)}`
                : undefined,
              trailing: supplier.productIds[0] ? (
                <Link href={`${base}/products/${supplier.productIds[0]}`} className={entLinkClass}>
                  View product →
                </Link>
              ) : undefined,
            }))}
          />
        </EntModuleSection>
      )}
    </EntModulePage>
  );
}
