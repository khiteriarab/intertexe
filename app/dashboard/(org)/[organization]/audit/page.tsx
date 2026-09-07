import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { loadAuditLogs } from "../../../../../lib/enterprise/audit-query";
import { EntModulePage } from "../../../components/EnterpriseModuleUi";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AuditPage({
  params,
}: {
  params: Promise<{ organization: string }>;
}) {
  const { organization } = await params;
  const { membership, client } = await requireOrganizationAccess(organization);
  if (!["owner", "admin"].includes(membership.role)) notFound();
  const items = await loadAuditLogs(client, membership.organizationId);

  return (
    <EntModulePage title="Audit log" subtitle="Immutable record of who changed what, when.">
      <div className="rounded-xl border border-[var(--ent-border)] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--ent-surface-alt)]">
            <tr>
              <th className="text-left p-3">When</th>
              <th className="text-left p-3">Actor</th>
              <th className="text-left p-3">Action</th>
              <th className="text-left p-3">Object</th>
              <th className="text-left p-3">Change</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id} className="border-t border-[var(--ent-border)] align-top">
                <td className="p-3 whitespace-nowrap">{new Date(row.created_at).toLocaleString()}</td>
                <td className="p-3">{row.actor}</td>
                <td className="p-3">{row.action}</td>
                <td className="p-3">{row.object_type}</td>
                <td className="p-3 text-[var(--ent-muted)]">
                  {[row.previous_ref, row.resulting_ref].filter(Boolean).join(" → ") || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </EntModulePage>
  );
}
