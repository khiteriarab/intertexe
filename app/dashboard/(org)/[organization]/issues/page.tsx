import Link from "next/link";
import { canMutateEnterprise, requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import {
  issueAffectedField,
  issueBlocksPublish,
  issueRecommendedAction,
  issueTypeLabel,
  issueWhyItMatters,
} from "../../../../../lib/enterprise/issue-copy";
import { identifierClassLabel } from "../../../../../lib/enterprise/identity-reconciliation";
import { loadOrgIssues } from "../../../../../lib/enterprise/queries";
import { formatOperatorTime, formatReviewerLine } from "../../../../../lib/enterprise/reviewer-display";
import { HqPageHeader } from "../../../components/HqUi";
import { IssueActions } from "./IssueActions";

export const dynamic = "force-dynamic";

export default async function IssuesPage({
  params,
}: {
  params: Promise<{ organization: string }>;
}) {
  const { organization } = await params;
  const { membership, client } = await requireOrganizationAccess(organization);
  const issues = await loadOrgIssues(client, membership.organizationId);
  const canMutate = canMutateEnterprise(membership.role);
  const openCount = issues.filter((issue) => issue.status === "open").length;
  const blockingCount = issues.filter((issue) => issueBlocksPublish(issue)).length;
  const base = `/dashboard/${membership.slug}`;

  return (
    <div>
      <HqPageHeader
        title="Issues"
        description="What INTERTEXE found in your catalog, why it matters, and what you can do. Blocking findings must be resolved before a passport can publish."
      />
      <p className="text-sm text-black/60 mb-4">
        {issues.length === 0
          ? "No findings yet. Import a catalog on Products — validation and identifier collisions appear here."
          : `${openCount} open · ${blockingCount} blocking publish. Review evidence, then take the recommended action.`}
      </p>
      <div className="space-y-4">
        {issues.length === 0 ? (
          <div className="bg-white border border-black/10 rounded-xl p-6 text-sm text-black/55">
            Empty inbox. After import, missing composition, origin, percentage totals, conflicts, and
            identifier collisions will list here with a recommended action.
          </div>
        ) : (
          issues.map((issue) => {
            const blocking = issueBlocksPublish(issue);
            return (
              <article
                key={issue.id}
                className="bg-white border border-black/10 rounded-xl p-5 space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-black/45">
                      {issueTypeLabel(issue.issue_type)}
                      {blocking ? " · Blocks publish" : " · Does not block publish"}
                    </p>
                    <h2 className="text-base font-medium mt-1">{issue.title}</h2>
                    <p className="text-sm text-black/60 mt-1">
                      {issue.product_id ? (
                        <Link className="underline" href={`${base}/products/${issue.product_id}`}>
                          {issue.productName || issue.productSku || "Product"}
                        </Link>
                      ) : (
                        "No product attached"
                      )}
                      {issue.productSku ? ` · ${issue.productSku}` : ""}
                      {" · "}
                      {issueAffectedField(issue)}
                    </p>
                  </div>
                  <p className="text-xs uppercase tracking-wide text-black/45">
                    {issue.severity} · {issue.status.replaceAll("_", " ")}
                  </p>
                </div>
                <p className="text-sm">{issueWhyItMatters(issue)}</p>
                {issue.identifier ? (
                  <div className="text-sm bg-[#f6f5f3] rounded-lg p-3 space-y-1">
                    <p>
                      Classification:{" "}
                      <strong>{identifierClassLabel(issue.identifier.classification)}</strong>
                    </p>
                    <p>
                      Matched on {issue.identifier.matchOn || "identifier"}{" "}
                      <span className="font-mono">{issue.identifier.identifierValue || "—"}</span>
                    </p>
                    <p>
                      Incoming: {issue.identifier.incoming.name || "row"}{" "}
                      {issue.identifier.incoming.sku ? `(${issue.identifier.incoming.sku})` : ""}
                      {issue.identifier.incoming.rowIndex != null
                        ? ` · source row ${issue.identifier.incoming.rowIndex + 1}`
                        : ""}
                    </p>
                    <p>
                      Matched: {issue.identifier.matched?.name || issue.interpreted_value || "catalog product"}{" "}
                      {issue.identifier.matched?.sku ? `(${issue.identifier.matched.sku})` : ""}
                    </p>
                    <p className="text-xs text-black/50">
                      Both original source rows stay stored. Confirming same product archives this extra
                      catalog record; it does not rewrite source files.
                    </p>
                  </div>
                ) : (
                  <dl className="grid sm:grid-cols-2 gap-2 text-sm">
                    <div>
                      <dt className="text-black/45">Source evidence</dt>
                      <dd>{issue.original_value || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-black/45">Interpreted value</dt>
                      <dd>{issue.interpreted_value || "—"}</dd>
                    </div>
                  </dl>
                )}
                <p className="text-sm text-black/60">
                  Recommended: {issueRecommendedAction(issue)}
                </p>
                {issue.status === "open" ? (
                  <IssueActions
                    slug={membership.slug}
                    issueId={issue.id}
                    canMutate={canMutate}
                    kind={issue.identifier ? "identifier" : "standard"}
                  />
                ) : (
                  <p className="text-sm text-black/55">
                    {issue.resolver
                      ? `Resolved by ${formatReviewerLine(issue.resolver, issue.resolvedAt)}`
                      : `Closed ${formatOperatorTime(issue.resolvedAt || issue.updated_at)}`}
                    {issue.identifier?.resolution?.action
                      ? ` · ${issue.identifier.resolution.action.replaceAll("_", " ")}`
                      : ""}
                  </p>
                )}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
