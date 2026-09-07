import Link from "next/link";
import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { loadImportHistory } from "../../../../../lib/enterprise/import-ops";
import { EntModulePage } from "../../../components/EnterpriseModuleUi";

export const dynamic = "force-dynamic";

export default async function ImportsPage({
  params,
}: {
  params: Promise<{ organization: string }>;
}) {
  const { organization } = await params;
  const { membership, client } = await requireOrganizationAccess(organization);
  const items = await loadImportHistory(client, membership.organizationId);

  return (
    <EntModulePage title="Import center" subtitle="Upload history, row counts, and errors.">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href={`/dashboard/${membership.slug}/products?import=1`}
          className="ent-btn ent-btn-primary text-sm"
        >
          + Import catalog
        </Link>
      </div>
      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-[var(--ent-muted)]">No imports yet. Upload a catalog from Products.</p>
        ) : (
          items.map((item) => (
            <Link
              key={item.id}
              href={`/dashboard/${membership.slug}/imports/${item.id}`}
              className="block rounded-xl border border-[var(--ent-border)] p-4 hover:bg-[var(--ent-surface-alt)] transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-[var(--ent-ink)]">{item.filename}</p>
                  <p className="text-xs text-[var(--ent-muted)] mt-1">
                    {new Date(item.createdAt).toLocaleString()} · {item.status}
                  </p>
                </div>
                <div className="text-right text-xs text-[var(--ent-muted)]">
                  {item.summary.productsTouched != null ? (
                    <p>{item.summary.productsTouched} products</p>
                  ) : null}
                  {item.errorCount > 0 ? <p className="text-red-600">{item.errorCount} errors</p> : null}
                </div>
              </div>
              {item.errorMessage ? (
                <p className="text-xs text-red-600 mt-2">{item.errorMessage}</p>
              ) : null}
            </Link>
          ))
        )}
      </div>
    </EntModulePage>
  );
}
