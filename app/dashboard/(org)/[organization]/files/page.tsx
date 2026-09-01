import Link from "next/link";
import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { formatRelativeActivityTime } from "../../../../../lib/enterprise/display-format";
import { loadOrgFiles } from "../../../../../lib/enterprise/module-queries";
import {
  EntEmptyState,
  EntModuleMetrics,
  EntModulePage,
  EntModuleSection,
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
    >
      <EntModuleMetrics
        items={[
          { label: "Catalog imports", value: data.summary.imports },
          { label: "Source records", value: data.summary.sourceRecords },
          { label: "Stored files", value: data.summary.files },
        ]}
      />

      {data.rows.length === 0 ? (
        <EntEmptyState
          title="No source files have been added yet"
          body="Import a catalog CSV from Products. INTERTEXE stores immutable source records for provenance — original binary files may not be retained."
          ctaHref={`${base}/products`}
          ctaLabel="Go to Products"
        />
      ) : (
        <EntModuleSection title="Source and import records">
          <ul className="divide-y divide-[var(--ent-border)]">
            {data.rows.map((row) => (
              <li key={`${row.kind}-${row.id}`} className="py-5 md:py-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] tracking-[0.08em] uppercase text-[var(--ent-muted-light)]">
                      {row.kind.replace("_", " ")}
                      {row.status ? ` · ${row.status}` : ""}
                    </p>
                    <p className="text-[16px] font-medium text-[var(--ent-ink)] mt-1">{row.label}</p>
                    {row.detail ? <p className="text-sm text-[var(--ent-muted)] mt-1">{row.detail}</p> : null}
                    {row.productName && row.productId ? (
                      <Link href={`${base}/products/${row.productId}`} className={`${entLinkClass} mt-2 inline-flex`}>
                        {row.productName} →
                      </Link>
                    ) : null}
                  </div>
                  <time className="text-xs text-[var(--ent-muted-light)]">
                    {formatRelativeActivityTime(row.createdAt)}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        </EntModuleSection>
      )}
    </EntModulePage>
  );
}
