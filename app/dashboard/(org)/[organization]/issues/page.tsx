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
import {
  EntEmptyState,
  EntIssuePill,
  entLinkClass,
} from "../../../components/EnterpriseUi";
import { EntIssueCompare, EntModulePage, EntVisualPanel } from "../../../components/EnterpriseModuleUi";
import { IssueActions } from "./IssueActions";

export const dynamic = "force-dynamic";

type IssueRow = Awaited<ReturnType<typeof loadOrgIssues>>[number];

const GROUP_TONES: Record<string, "blush" | "butter" | "cream" | "stone"> = {
  missing: "butter",
  conflict: "blush",
  review: "cream",
  resolved: "stone",
};

const ISSUE_GROUPS: Array<{ id: string; label: string; match: (issue: IssueRow) => boolean }> = [
  {
    id: "missing",
    label: "Missing information",
    match: (issue) => issue.issue_type === "missing_data",
  },
  {
    id: "conflict",
    label: "Conflict",
    match: (issue) => issue.issue_type === "conflict" || issue.issue_type === "identifier",
  },
  {
    id: "review",
    label: "Needs review",
    match: (issue) =>
      !["missing_data", "conflict", "identifier"].includes(issue.issue_type) && issue.status === "open",
  },
  {
    id: "resolved",
    label: "Resolved",
    match: (issue) => issue.status !== "open",
  },
];

function IssueCard({
  issue,
  base,
  slug,
  canMutate,
}: {
  issue: IssueRow;
  base: string;
  slug: string;
  canMutate: boolean;
}) {
  const blocking = issueBlocksPublish(issue);
  const open = issue.status === "open";

  return (
    <article className="ent-panel-nested px-5 py-6 md:px-7 md:py-8 mb-4 last:mb-0">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <EntIssuePill label={issueTypeLabel(issue.issue_type)} tone="neutral" />
          {open && blocking ? <EntIssuePill label="Blocks publish" tone="attention" /> : null}
        </div>
        <p className="text-xs uppercase tracking-wide text-[var(--ent-muted-light)]">
          {issue.severity} · {issue.status.replaceAll("_", " ")}
        </p>
      </div>

      <h3 className="ent-heading text-[1.35rem] text-[var(--ent-ink)]">{issue.title}</h3>

      <p className="text-sm text-[var(--ent-muted)] mt-2">
        {issue.product_id ? (
          <Link className={entLinkClass} href={`${base}/products/${issue.product_id}`}>
            {issue.productName || issue.productSku || "Product"}
          </Link>
        ) : (
          "No product attached"
        )}
        {issue.productSku ? ` · ${issue.productSku}` : ""}
        {" · "}
        {issueAffectedField(issue)}
      </p>

      <p className="text-sm leading-relaxed text-[var(--ent-ink-soft)] mt-4">{issueWhyItMatters(issue)}</p>

      {issue.identifier ? (
        <div className="rounded-[var(--ent-radius-lg)] bg-[var(--ent-gradient-stone)] px-5 py-4 mt-5 space-y-2">
          <p className="text-sm">
            Classification: <strong>{identifierClassLabel(issue.identifier.classification)}</strong>
          </p>
          <p className="text-sm">
            Matched on {issue.identifier.matchOn || "identifier"}{" "}
            <span className="font-mono text-xs">{issue.identifier.identifierValue || "—"}</span>
          </p>
          <p className="text-xs text-[var(--ent-muted-light)]">
            Both original source rows stay stored. Confirming same product archives the extra catalog record.
          </p>
        </div>
      ) : !issue.identifier && issue.original_value ? (
        <EntIssueCompare source={issue.original_value} interpreted={issue.interpreted_value || ""} />
      ) : null}

      <p className="text-sm text-[var(--ent-muted)] mt-5">
        Recommended: {issueRecommendedAction(issue)}
      </p>

      {open ? (
        <div className="mt-5 pt-4 border-t border-[var(--ent-border)]/80">
          <IssueActions
            slug={slug}
            issueId={issue.id}
            canMutate={canMutate}
            kind={issue.identifier ? "identifier" : "standard"}
          />
        </div>
      ) : (
        <p className="text-sm text-[var(--ent-muted)] mt-5">
          {issue.resolver
            ? `Resolved by ${formatReviewerLine(issue.resolver, issue.resolvedAt)}`
            : `Closed ${formatOperatorTime(issue.resolvedAt || issue.updated_at)}`}
        </p>
      )}
    </article>
  );
}

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
    <EntModulePage
      zone="cream"
      title="Issues"
      description="What INTERTEXE found in your catalog, why it matters, and what you can do."
    >
      <p className="text-sm text-[var(--ent-muted)] -mt-4 mb-8">
        {issues.length === 0
          ? "No findings yet. Import a catalog on Products — validation and identifier collisions appear here."
          : `${openCount} open · ${blockingCount} blocking publish`}
      </p>

      {issues.length === 0 ? (
        <EntEmptyState
          title="Empty inbox"
          body="After import, missing composition, origin, percentage totals, conflicts, and identifier collisions will list here with a recommended action."
          ctaHref={`${base}/products`}
          ctaLabel="Go to Products"
        />
      ) : (
        <div className="space-y-8 md:space-y-10">
          {ISSUE_GROUPS.map((group) => {
            const groupIssues = issues.filter(group.match);
            if (groupIssues.length === 0) return null;
            return (
              <EntVisualPanel
                key={group.id}
                tone={GROUP_TONES[group.id] || "cream"}
                title={group.label}
                subtitle={`${groupIssues.length} item${groupIssues.length === 1 ? "" : "s"}`}
                padding="normal"
              >
                {groupIssues.map((issue) => (
                  <IssueCard key={issue.id} issue={issue} base={base} slug={membership.slug} canMutate={canMutate} />
                ))}
              </EntVisualPanel>
            );
          })}
        </div>
      )}
    </EntModulePage>
  );
}
