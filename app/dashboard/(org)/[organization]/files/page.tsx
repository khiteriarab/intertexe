import Link from "next/link";
import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { formatRelativeActivityTime } from "../../../../../lib/enterprise/display-format";
import { loadOrgFiles } from "../../../../../lib/enterprise/module-queries";
import {
  EntEmptyState,
  EntHeroEmpty,
  EntModuleList,
  EntModuleMetrics,
  EntModulePage,
  entLinkClass,
} from "../../../components/EnterpriseModuleUi";

export const dynamic = "force-dynamic";

export default async function FilesPage({
  params,
}: {
  params: Promise<{ organization: string }>;
}) {
  const { organization } = await params;
  const { membership, client } = await requireOrganizationAccess(organization);
  const data = await loadOrgFiles(client, membership.organizationId);
  const base = `/dashboard/${membership.slug}`;

  return (
    <EntModulePage
      title="Files"
      description="Source imports, immutable source records, and stored files linked to this organization."
      zone="stone"
    >
      {data.rows.length > 0 ? (
        <EntModuleMetrics
          tone="cream"
          items={[
            { label: "Catalog imports", value: data.summary.imports },
            { label: "Source records", value: data.summary.sourceRecords },
            { label: "Stored files", value: data.summary.files },
          ]}
        />
      ) : null}

      {data.rows.length === 0 ? (
        <EntHeroEmpty
          title="No source files have been added yet."
          body="Import a catalog CSV from Products. INTERTEXE stores immutable source records for provenance — original binary files may not be retained."
          ctaHref={`${base}/products`}
          ctaLabel="Go to Products"
          tone="cream"
          motif="grid"
        />
      ) : (
        <EntModuleList
          tone="blush"
          items={data.rows.map((row) => ({
            key: `${row.kind}-${row.id}`,
            primary: row.label,
            secondary: [row.kind.replace("_", " "), row.status, row.detail].filter(Boolean).join(" · ") || undefined,
            meta: formatRelativeActivityTime(row.createdAt) || undefined,
            href: row.productId ? `${base}/products/${row.productId}` : undefined,
            trailing: row.productName ? (
              <span className="text-sm text-[var(--ent-muted)]">{row.productName}</span>
            ) : undefined,
          }))}
        />
      )}
    </EntModulePage>
  );
}
