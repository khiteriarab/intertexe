"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { OrgIssueRow } from "../../../../../lib/enterprise/queries";
import type { ReviewerIdentity } from "../../../../../lib/enterprise/reviewer-display";
import {
  issueAffectedField,
  issueBlocksPublish,
  issueRecommendedAction,
  issueTypeLabel,
  issueWhyItMatters,
} from "../../../../../lib/enterprise/issue-copy";
import { identifierClassLabel } from "../../../../../lib/enterprise/identity-reconciliation";
import {
  countryFlagEmoji,
  formatIssueRelativeTime,
  isCompositionConflictIssue,
  isOriginIssue,
  issueSeverityLabel,
  issueWithinPeriod,
  issueWorkflowStatus,
  normalizeIssueSeverity,
  parseIssueNotes,
} from "../../../../../lib/enterprise/issue-ui";
import {
  EntIssuePill,
  EntPriorityPill,
  EntProductPlaceholder,
  EntIssueStatusPill,
  entLinkClass,
  entSelectClass,
} from "../../../components/EnterpriseUi";
import { EntIssueCompare } from "../../../components/EnterpriseModuleUi";
import { IssueActions } from "./IssueActions";
import { IssuesBulkBar } from "./IssuesBulkBar";

export type InboxIssue = OrgIssueRow & {
  productImageUrl?: string | null;
};

type Segment = "open" | "review" | "resolved";

type IssueFilters = {
  issueType: string;
  priority: string;
  status: string;
  period: string;
};

const SEGMENTS: Array<{ id: Segment; label: string; match: (issue: InboxIssue) => boolean }> = [
  {
    id: "open",
    label: "Open",
    match: (issue) => issue.status === "open" && !["conflict", "identifier"].includes(issue.issue_type),
  },
  {
    id: "review",
    label: "Needs review",
    match: (issue) =>
      issue.status === "open" &&
      (issue.issue_type === "conflict" || issue.issue_type === "identifier" || issue.issue_type === "validation"),
  },
  { id: "resolved", label: "Resolved", match: (issue) => issue.status !== "open" },
];

const ISSUE_TYPES = [
  "",
  "missing_data",
  "conflict",
  "validation",
  "evidence",
  "identifier",
  "supplier",
  "regulatory",
  "review_required",
];

const PRIORITIES = ["", "critical", "high", "medium", "low"];
const STATUSES = ["", "open", "assigned", "resolved", "rejected", "not_applicable"];
const PERIODS = [
  { value: "12m", label: "Last 12 months" },
  { value: "90d", label: "Last 90 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
];

function applyFilters(issues: InboxIssue[], filters: IssueFilters): InboxIssue[] {
  return issues.filter((issue) => {
    if (filters.issueType && issue.issue_type !== filters.issueType) return false;
    if (filters.priority && normalizeIssueSeverity(issue.severity) !== filters.priority) return false;
    if (filters.status && issue.status !== filters.status) return false;
    if (!issueWithinPeriod(issue.updated_at || issue.created_at, filters.period)) return false;
    return true;
  });
}

function IssuesFilterBar({
  filters,
  onChange,
}: {
  filters: IssueFilters;
  onChange: (next: IssueFilters) => void;
}) {
  return (
    <div className="ent-inbox-filters mb-5 md:mb-6">
      <select
        value={filters.issueType}
        onChange={(e) => onChange({ ...filters, issueType: e.target.value })}
        className={`${entSelectClass} ent-inbox-filter-select`}
        aria-label="Issue type"
      >
        <option value="">All issue types</option>
        {ISSUE_TYPES.filter(Boolean).map((type) => (
          <option key={type} value={type}>
            {issueTypeLabel(type)}
          </option>
        ))}
      </select>
      <select
        value={filters.priority}
        onChange={(e) => onChange({ ...filters, priority: e.target.value })}
        className={`${entSelectClass} ent-inbox-filter-select`}
        aria-label="Priority"
      >
        <option value="">All priorities</option>
        {PRIORITIES.filter(Boolean).map((priority) => (
          <option key={priority} value={priority}>
            {issueSeverityLabel(priority)}
          </option>
        ))}
      </select>
      <select
        value={filters.status}
        onChange={(e) => onChange({ ...filters, status: e.target.value })}
        className={`${entSelectClass} ent-inbox-filter-select`}
        aria-label="Status"
      >
        <option value="">All status</option>
        {STATUSES.filter(Boolean).map((status) => (
          <option key={status} value={status}>
            {status.replaceAll("_", " ")}
          </option>
        ))}
      </select>
      <select
        value={filters.period}
        onChange={(e) => onChange({ ...filters, period: e.target.value })}
        className={`${entSelectClass} ent-inbox-filter-select`}
        aria-label="Time period"
      >
        {PERIODS.map((period) => (
          <option key={period.value} value={period.value}>
            {period.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function IssuesInboxClient({
  issues,
  slug,
  base,
  canMutate,
  members,
  initialSegment = "open",
  initialIssueType = "",
}: {
  issues: InboxIssue[];
  slug: string;
  base: string;
  canMutate: boolean;
  members: ReviewerIdentity[];
  initialSegment?: Segment;
  initialIssueType?: string;
}) {
  const [segment, setSegment] = useState<Segment>(
    SEGMENTS.some((s) => s.id === initialSegment) ? initialSegment : "open"
  );
  const [filters, setFilters] = useState<IssueFilters>({
    issueType: initialIssueType,
    priority: "",
    status: "",
    period: "12m",
  });

  const filtered = useMemo(() => {
    const inSegment = issues.filter(SEGMENTS.find((s) => s.id === segment)!.match);
    return applyFilters(inSegment, filters);
  }, [issues, segment, filters]);

  const [selectedId, setSelectedId] = useState<string | null>(filtered[0]?.id ?? null);

  useEffect(() => {
    if (!filtered.length) {
      setSelectedId(null);
      return;
    }
    if (!filtered.some((issue) => issue.id === selectedId)) {
      setSelectedId(filtered[0]?.id ?? null);
    }
  }, [filtered, selectedId]);

  const selected = useMemo(
    () => filtered.find((i) => i.id === selectedId) ?? filtered[0] ?? null,
    [filtered, selectedId]
  );

  const openCount = issues.filter((i) => i.status === "open").length;
  const highCount = issues.filter(
    (i) => i.status === "open" && ["critical", "high"].includes(normalizeIssueSeverity(i.severity))
  ).length;
  const resolvedCount = issues.filter((i) => i.status !== "open").length;
  const resolvedRate = issues.length ? Math.round((resolvedCount / issues.length) * 100) : 0;

  return (
    <div className="ent-inbox">
      <div className="ent-inbox-stats">
        <div className="ent-inbox-stat">
          <span className="ent-inbox-stat-dot ent-inbox-stat-dot-open" aria-hidden />
          <div>
            <p className="ent-inbox-stat-value">{openCount}</p>
            <p className="ent-inbox-stat-label">Open issues</p>
          </div>
        </div>
        <div className="ent-inbox-stat">
          <span className="ent-inbox-stat-dot ent-inbox-stat-dot-high" aria-hidden />
          <div>
            <p className="ent-inbox-stat-value">{highCount}</p>
            <p className="ent-inbox-stat-label">High priority</p>
          </div>
        </div>
        <div className="ent-inbox-stat">
          <span className="ent-inbox-stat-dot ent-inbox-stat-dot-resolved" aria-hidden />
          <div>
            <p className="ent-inbox-stat-value">{resolvedRate}%</p>
            <p className="ent-inbox-stat-label">Resolved rate</p>
          </div>
        </div>
      </div>

      <IssuesFilterBar filters={filters} onChange={setFilters} />

      <div className="ent-segmented mb-5 md:mb-6">
        {SEGMENTS.map((item) => {
          const count = applyFilters(
            issues.filter(item.match),
            filters
          ).length;
          const active = item.id === segment;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setSegment(item.id);
                const next = applyFilters(issues.filter(item.match), filters)[0];
                setSelectedId(next?.id ?? null);
              }}
              className={`ent-segmented-link ${active ? "ent-segmented-link-active" : ""}`}
            >
              {item.label}
              {count ? ` · ${count}` : ""}
            </button>
          );
        })}
      </div>

      {segment !== "resolved" && filtered.length ? (
        <IssuesBulkBar
          slug={slug}
          canMutate={canMutate}
          issues={filtered.map((issue) => ({ id: issue.id, title: issue.title, status: issue.status }))}
        />
      ) : null}

      {filtered.length === 0 ? (
        <p className="text-sm text-[var(--ent-muted)] py-8">No issues match these filters.</p>
      ) : (
        <div className="ent-inbox-split">
          <div className="ent-inbox-list" role="listbox" aria-label="Issues">
            {filtered.map((issue) => {
              const active = selected?.id === issue.id;
              const workflow = issueWorkflowStatus(issue);
              const blocking = issueBlocksPublish(issue);
              return (
                <button
                  key={issue.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => setSelectedId(issue.id)}
                  className={`ent-inbox-row ${active ? "ent-inbox-row-active" : ""}`}
                >
                  <EntProductPlaceholder
                    imageUrl={issue.productImageUrl}
                    alt={issue.productName || issue.productSku || "Product"}
                  />
                  <div className="ent-inbox-row-body min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <EntPriorityPill severity={issue.severity} />
                      <EntIssueStatusPill tone={workflow.tone} label={workflow.label} />
                      {blocking ? <EntIssuePill label="Blocks publish" tone="blocking" /> : null}
                    </div>
                    <p className="text-sm font-medium text-[var(--ent-ink)] truncate">
                      {issue.productName || issue.productSku || "Unlinked product"}
                    </p>
                    <p className="text-xs text-[var(--ent-muted)] truncate mt-0.5">{issue.title}</p>
                    <p className="text-[10px] text-[var(--ent-muted-light)] mt-1.5">
                      {issueTypeLabel(issue.issue_type, issue.detail)} · {formatIssueRelativeTime(issue.updated_at || issue.created_at)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {selected ? (
            <IssueDetailPanel
              key={selected.id}
              issue={selected}
              base={base}
              slug={slug}
              canMutate={canMutate}
              members={members}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

function IssueDetailPanel({
  issue,
  base,
  slug,
  canMutate,
  members,
}: {
  issue: InboxIssue;
  base: string;
  slug: string;
  canMutate: boolean;
  members: ReviewerIdentity[];
}) {
  const open = issue.status === "open" || issue.status === "assigned";
  const workflow = issueWorkflowStatus(issue);
  const isConflict =
    issue.issue_type === "conflict" || Boolean(issue.original_value && issue.interpreted_value);
  const originIssue = isOriginIssue(issue);
  const compositionConflict = isCompositionConflictIssue(issue.title, issue.issue_type);
  const notes = parseIssueNotes(issue.detail);

  return (
    <aside className="ent-inbox-detail">
      <div className="ent-inbox-detail-header">
        <EntProductPlaceholder
          imageUrl={issue.productImageUrl}
          alt={issue.productName || issue.productSku || "Product"}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <EntPriorityPill severity={issue.severity} showLabel />
            <EntIssueStatusPill tone={workflow.tone} label={workflow.label} />
            <EntIssuePill label={issueTypeLabel(issue.issue_type, issue.detail)} tone="neutral" />
          </div>
          <h3 className="ent-serif text-[1.35rem] text-[var(--ent-ink)] leading-tight">{issue.title}</h3>
          <p className="text-sm text-[var(--ent-muted)] mt-1">
            {issue.product_id ? (
              <Link className={entLinkClass} href={`${base}/products/${issue.product_id}`}>
                {issue.productName || issue.productSku || "Product"}
              </Link>
            ) : (
              "No product attached"
            )}
            {issue.productSku ? ` · ${issue.productSku}` : ""}
          </p>
          {issue.assignee?.name ? (
            <p className="text-xs text-[var(--ent-muted-light)] mt-2">Owner: {issue.assignee.name}</p>
          ) : null}
        </div>
      </div>

      <div className="ent-inbox-detail-grid">
        <DetailBlock label="What happened" body={issueAffectedField(issue)} />
        <DetailBlock label="Why it matters" body={issueWhyItMatters(issue)} />
        <DetailBlock label="Recommended action" body={issueRecommendedAction(issue)} />
      </div>

      {issue.identifier ? (
        <div className="ent-inbox-panel mt-5">
          <p className="ent-inbox-panel-kicker">Identifier collision</p>
          <p className="text-sm mt-2">
            Classification: <strong>{identifierClassLabel(issue.identifier.classification)}</strong>
          </p>
          <p className="text-sm text-[var(--ent-muted)] mt-1">
            Matched on {issue.identifier.matchOn || "identifier"} · {issue.identifier.identifierValue || "—"}
          </p>
        </div>
      ) : null}

      {originIssue ? (
        <div className="mt-5">
          <p className="text-[10px] tracking-[0.12em] uppercase text-[var(--ent-muted-light)] mb-3">
            Country of origin
          </p>
          {issue.original_value && issue.interpreted_value ? (
            <div className="ent-origin-compare">
              <OriginSourceCard label="Current approved" value={issue.original_value} />
              <OriginSourceCard label="Incoming source" value={issue.interpreted_value} variant="incoming" />
            </div>
          ) : issue.original_value || issue.interpreted_value || issue.productOrigin ? (
            <OriginSourceCard
              label="Recorded origin"
              value={issue.original_value || issue.interpreted_value || issue.productOrigin || ""}
            />
          ) : (
            <div className="ent-inbox-panel">
              <p className="ent-inbox-panel-kicker">Not recorded</p>
              <p className="text-sm text-[var(--ent-muted)] mt-2">
                Manufacturing country is missing from the governed record.
              </p>
            </div>
          )}
          {issue.original_value && issue.interpreted_value ? (
            <p className="ent-inbox-unresolved mt-3">
              Unresolved — conflicting origin data. INTERTEXE does not overwrite either source.
            </p>
          ) : null}
        </div>
      ) : null}

      {!originIssue && isConflict && issue.original_value ? (
        <div className="mt-5">
          <p className="text-[10px] tracking-[0.12em] uppercase text-[var(--ent-muted-light)] mb-3">
            {compositionConflict ? "Composition data" : "Source comparison"}
          </p>
          <EntIssueCompare
            source={issue.original_value}
            interpreted={issue.interpreted_value || ""}
            variant="conflict"
          />
          {issue.interpreted_value ? (
            <div className="ent-inbox-panel ent-inbox-panel-recommended mt-3">
              <p className="ent-inbox-panel-kicker">Normalized record · Recommended</p>
              <p className="ent-serif text-[1.15rem] text-[var(--ent-ink)] mt-2 leading-snug">
                Review both sources, then accept incoming or keep the locked value.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {notes.length ? (
        <div className="mt-5">
          <p className="text-[10px] tracking-[0.12em] uppercase text-[var(--ent-muted-light)] mb-3">Notes</p>
          <ul className="space-y-2">
            {notes.map((entry) => (
              <li key={`${entry.at}-${entry.text}`} className="ent-inbox-panel">
                <p className="text-sm text-[var(--ent-ink-soft)]">{entry.text}</p>
                <p className="text-[10px] text-[var(--ent-muted-light)] mt-1.5">
                  {entry.authorName} · {formatIssueRelativeTime(entry.at)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {open ? (
        <div className="mt-6 pt-5 border-t border-[var(--ent-border)]">
          <IssueActions
            slug={slug}
            issueId={issue.id}
            issueTitle={issue.title}
            canMutate={canMutate}
            kind={issue.identifier ? "identifier" : "standard"}
            members={members}
            assignee={issue.assignee}
          />
        </div>
      ) : (
        <p className="text-sm text-[var(--ent-muted)] mt-6">
          Resolved {formatIssueRelativeTime(issue.resolvedAt || issue.updated_at)}
          {issue.resolver?.name ? ` · ${issue.resolver.name}` : ""}
        </p>
      )}
    </aside>
  );
}

function DetailBlock({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <p className="text-[10px] tracking-[0.12em] uppercase text-[var(--ent-muted-light)] mb-1.5">{label}</p>
      <p className="text-sm text-[var(--ent-muted)] leading-relaxed">{body}</p>
    </div>
  );
}

function OriginSourceCard({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: string;
  variant?: "default" | "incoming";
}) {
  const flag = countryFlagEmoji(value);
  return (
    <div className={`ent-inbox-panel ${variant === "incoming" ? "ent-inbox-panel-incoming" : ""}`}>
      <p className="ent-inbox-panel-kicker">{label}</p>
      <p className="text-sm mt-2 flex items-center gap-2">
        {flag ? (
          <span className="text-xl leading-none" aria-hidden>
            {flag}
          </span>
        ) : null}
        <span>{value}</span>
      </p>
    </div>
  );
}
