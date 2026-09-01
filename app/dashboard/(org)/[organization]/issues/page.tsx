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
import { EntIssueCompare, EntModulePage } from "../../../components/EnterpriseModuleUi";
import { IssueActions } from "./IssueActions";

export const dynamic = "force-dynamic";

type IssueRow = Awaited<ReturnType<typeof loadOrgIssues>>[number];
type IssueSegment = "open" | "review" | "resolved";

const SEGMENTS: Array<{ id: IssueSegment; label: string; match: (issue: IssueRow) => boolean }> = [
  {
    id: "open",
    label: "Open",
    match: (issue) => issue.status === "open" && !["conflict", "identifier"].includes(issue.issue_type),
  },
  {
    id: "review",
    label: "Needs review",
    match: (issue) =>
      issue.status === "open" && (issue.issue_type === "conflict" || issue.issue_type === "identifier" || issue.issue_type === "validation"),
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
  const isConflict = issue.issue_type === "conflict" || Boolean(issue.original_value && issue.interpreted_value);

  return (
    <article className="py-7 border-b border-[var(--ent-border)] last:border-b-0">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <EntIssuePill label={issueTypeLabel(issue.issue_type)} tone="neutral" />
        {open && blocking ? <EntIssuePill label="Blocks publish" tone="attention" /> : null}
        <span className="text-xs uppercase tracking-wide text-[var(--ent-muted-light)] ml-auto">
          {issue.severity}
        </span>
      </div>

      <h3 className="ent-serif text-[1.45rem] text-[var(--ent-ink)] leading-tight">{issue.title}</h3>

      <div className="grid md:grid-cols-3 gap-4 mt-5 text-sm">
        <div>
          <p className="text-[10px] tracking-[0.12em] uppercase text-[var(--ent-muted-light)] mb-1.5">What happened</p>
          <p className="text-[var(--ent-ink-soft)] leading-relaxed">
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
        </div>
        <div>
          <p className="text-[10px] tracking-[0.12em] uppercase text-[var(--ent-muted-light)] mb-1.5">Why it matters</p>
          <p className="text-[var(--ent-muted)] leading-relaxed">{issueWhyItMatters(issue)}</p>
        </div>
        <div>
          <p className="text-[10px] tracking-[0.12em] uppercase text-[var(--ent-muted-light)] mb-1.5">What to do</p>
          <p className="text-[var(--ent-muted)] leading-relaxed">{issueRecommendedAction(issue)}</p>
        </div>
      </div>

      {issue.identifier ? (
        <div className="mt-5 px-5 py-4 rounded-[var(--ent-radius-lg)] bg-[var(--ent-surface-muted)]/60 space-y-2">
          <p className="text-sm">
            Classification: <strong>{identifierClassLabel(issue.identifier.classification)}</strong>
          </p>
          <p className="text-sm text-[var(--ent-muted)]">
            Matched on {issue.identifier.matchOn || "identifier"} {issue.identifier.identifierValue || "—"}
          </p>
        </div>
      ) : isConflict && issue.original_value ? (
        <EntIssueCompare source={issue.original_value} interpreted={issue.interpreted_value || ""} variant="conflict" />
      ) : null}

      {open ? (
        <div className="mt-5 pt-4 border-t border-[var(--ent-border)]">
          <IssueActions slug={slug} issueId={issue.id} canMutate={canMutate} kind={issue.identifier ? "identifier" : "standard"} />
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
  searchParams,
}: {
  params: Promise<{ organization: string }>;
  searchParams?: Promise<{ segment?: string }>;
}) {
  const { organization } = await params;
  const query = (await searchParams) || {};
  const segment = (query.segment || "open") as IssueSegment;
  const activeSegment = SEGMENTS.some((item) => item.id === segment) ? segment : "open";

  const { membership, client } = await requireOrganizationAccess(organization);
  const issues = await loadOrgIssues(client, membership.organizationId);
  const canMutate = canMutateEnterprise(membership.role);
  const base = `/dashboard/${membership.slug}`;
  const openCount = issues.filter((issue) => issue.status === "open").length;
  const blockingCount = issues.filter((issue) => issueBlocksPublish(issue)).length;
  const resolvedCount = issues.filter((issue) => issue.status !== "open").length;
  const filtered = issues.filter(SEGMENTS.find((item) => item.id === activeSegment)!.match);

  return (
    <EntModulePage
      title="Issues"
      meta={
        <>
          <span>
            <strong>{openCount}</strong> open
          </span>
          <span>
            <strong>{blockingCount}</strong> blocking
          </span>
          <span>
            <strong>{resolvedCount}</strong> resolved
          </span>
        </>
      }
    >
      <div className="ent-segmented mb-8">
        {SEGMENTS.map((item) => {
          const count = issues.filter(item.match).length;
          const href = `${base}/issues${item.id === "open" ? "" : `?segment=${item.id}`}`;
          const active = item.id === activeSegment;
          return (
            <Link key={item.id} href={href} className={`ent-segmented-link ${active ? "ent-segmented-link-active" : ""}`}>
              {item.label}
              {count ? ` · ${count}` : ""}
            </Link>
          );
        })}
      </div>

      {issues.length === 0 ? (
        <EntEmptyState
          title="Empty inbox"
          body="After import, missing composition, origin, percentage totals, conflicts, and identifier collisions will list here with a recommended action."
          ctaHref={`${base}/products?import=1`}
          ctaLabel="Import products"
        />
      ) : filtered.length === 0 ? (
        <p className="text-sm text-[var(--ent-muted)] py-8">No issues in this segment.</p>
      ) : (
        <div>
          {filtered.map((issue) => (
            <IssueCard key={issue.id} issue={issue} base={base} slug={membership.slug} canMutate={canMutate} />
          ))}
        </div>
      )}
    </EntModulePage>
  );
}
