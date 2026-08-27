import { canMutateEnterprise, requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { loadOrgIssues } from "../../../../../lib/enterprise/queries";
import { HqPageHeader } from "../../../components/HqUi";
import { ORG_PAGE_STATES } from "../../../../../lib/enterprise/page-states";
import { StateBadge } from "../StateBadge";
import { IssueActions } from "./IssueActions";

export const dynamic = "force-dynamic";

export default async function IssuesPage({
  params,
}: {
  params: Promise<{ organization: string }>;
}) {
  const { organization } = await params;
  const { membership } = await requireOrganizationAccess(organization);
  const issues = await loadOrgIssues(membership.organizationId);
  const canMutate = canMutateEnterprise(membership.role);

  return (
    <div>
      <HqPageHeader
        title="Issues"
        description="Open findings from import, normalization, and validation. Resolve, reject, or mark not applicable. Other inbox actions remain later-stage."
        action={<StateBadge state={ORG_PAGE_STATES.issues} />}
      />
      <p className="text-xs text-black/45 mb-4">
        Available Phase 1 actions: Resolve, Reject, Mark not applicable. Evidence upload, supplier requests, and assignment remain later.
      </p>
      <div className="overflow-x-auto bg-white border border-black/10 rounded-xl">
        <table className="min-w-full text-sm">
          <caption className="sr-only">Organization issues inbox</caption>
          <thead>
            <tr className="text-left text-[10px] tracking-[0.12em] uppercase text-black/45 border-b border-black/10">
              {["Type", "Title", "Severity", "Original", "Interpretation", "Status", "Action"].map((col) => (
                <th key={col} className="px-3 py-2 font-medium">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {issues.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-black/50">
                  No issues. Findings appear after import, normalization, and validation.
                </td>
              </tr>
            ) : (
              issues.map((issue) => (
                <tr key={issue.id} className="border-t border-black/5">
                  <td className="px-3 py-2">{issue.issue_type}</td>
                  <td className="px-3 py-2">{issue.title}</td>
                  <td className="px-3 py-2">{issue.severity}</td>
                  <td className="px-3 py-2">{issue.original_value || "—"}</td>
                  <td className="px-3 py-2">{issue.interpreted_value || "—"}</td>
                  <td className="px-3 py-2">{issue.status}</td>
                  <td className="px-3 py-2">
                    {issue.status === "open" ? (
                      <IssueActions slug={membership.slug} issueId={issue.id} canMutate={canMutate} />
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
