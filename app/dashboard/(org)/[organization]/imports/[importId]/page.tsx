import { requireOrganizationAccess } from "../../../../../../lib/enterprise/access";
import { loadImportDetail } from "../../../../../../lib/enterprise/import-ops";
import { EntModulePage } from "../../../../components/EnterpriseModuleUi";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ImportDetailPage({
  params,
}: {
  params: Promise<{ organization: string; importId: string }>;
}) {
  const { organization, importId } = await params;
  const { membership, client } = await requireOrganizationAccess(organization);
  const detail = await loadImportDetail(client, membership.organizationId, importId);
  if (!detail) notFound();

  const summary = (detail.import.summary || {}) as Record<string, number | undefined>;

  return (
    <EntModulePage title={detail.import.original_filename || "Import detail"} subtitle={`Status: ${detail.import.status}`}>
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        {[
          ["Rows", summary.rowsTotal],
          ["Products", summary.productsTouched],
          ["Issues", summary.issuesCreated],
          ["Errors", detail.errors.length],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-[var(--ent-border)] p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--ent-muted)]">{label}</p>
            <p className="text-2xl font-semibold mt-1">{value ?? "—"}</p>
          </div>
        ))}
      </div>

      {detail.errors.length > 0 ? (
        <div className="rounded-xl border border-[var(--ent-border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--ent-surface-alt)]">
              <tr>
                <th className="text-left p-3">Row</th>
                <th className="text-left p-3">Field</th>
                <th className="text-left p-3">Code</th>
                <th className="text-left p-3">Message</th>
              </tr>
            </thead>
            <tbody>
              {detail.errors.map((err) => (
                <tr key={err.id} className="border-t border-[var(--ent-border)]">
                  <td className="p-3">{err.row_number}</td>
                  <td className="p-3">{err.field_key || "—"}</td>
                  <td className="p-3">{err.error_code}</td>
                  <td className="p-3">{err.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-[var(--ent-muted)]">No row-level errors recorded for this import.</p>
      )}
    </EntModulePage>
  );
}
