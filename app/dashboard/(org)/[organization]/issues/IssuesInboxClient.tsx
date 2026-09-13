"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { OrgIssueRow } from "../../../../../lib/enterprise/queries";
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
  isOriginConflictIssue,
  issueSeverityLabel,
  issueWorkflowStatus,
  normalizeIssueSeverity,
} from "../../../../../lib/enterprise/issue-ui";
import {
  EntIssuePill,
  EntPriorityPill,
  EntProductPlaceholder,
  EntIssueStatusPill,
  entLinkClass,
} from "../../../components/EnterpriseUi";
import { EntIssueCompare } from "../../../components/EnterpriseModuleUi";
import { IssueActions } from "./IssueActions";
import { IssuesBulkBar } from "./IssuesBulkBar";

export type InboxIssue = OrgIssueRow & {
  productStyleCode?: string | null;
  productImageUrl?: string | null;
};

type Segment = "open" | "review" | "resolved";

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

export function IssuesInboxClient({
  issues,
  slug,
  base,
  canMutate,
  initialSegment = "open",
}: {
  issues: InboxIssue[];
  slug: string;
  base: string;
  canMutate: boolean;
  initialSegment?: Segment;
}) {
  const [segment, setSegment] = useState<Segment>(
    SEGMENTS.some((s) => s.id === initialSegment) ? initialSegment : "open"
  );

  const filtered = useMemo(() => issues.filter(SEGMENTS.find((s) => s.id === segment)!.match), [issues, segment]);

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

      <div className="ent-segmented mb-5 md:mb-6">
        {SEGMENTS.map((item) => {
          const count = issues.filter(item.match).length;
          const active = item.id === segment;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setSegment(item.id);
                const next = issues.filter(item.match)[0];
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
        <p className="text-sm text-[var(--ent-muted)] py-8">No issues in this segment.</p>
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
}: {
  issue: InboxIssue;
  base: string;
  slug: string;
  canMutate: boolean;
}) {
  const open = issue.status === "open";
  const workflow = issueWorkflowStatus(issue);
  const isConflict =
    issue.issue_type === "conflict" || Boolean(issue.original_value && issue.interpreted_value);
  const originConflict = isOriginConflictIssue(issue.title, issue.issue_type);
  const compositionConflict = isCompositionConflictIssue(issue.title, issue.issue_type);

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

      {originConflict && issue.original_value && issue.interpreted_value ? (
        <div className="mt-5">
          <p className="text-[10px] tracking-[0.12em] uppercase text-[var(--ent-muted-light)] mb-3">
            Country of origin
          </p>
          <div className="ent-origin-compare">
            <OriginSourceCard label="Source A" value={issue.original_value} />
            <OriginSourceCard label="Source B" value={issue.interpreted_value} />
          </div>
          <p className="ent-inbox-unresolved mt-3">Unresolved — conflicting origin data. INTERTEXE does not overwrite either source.</p>
        </div>
      ) : isConflict && issue.original_value ? (
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

      {open ? (
        <div className="mt-6 pt-5 border-t border-[var(--ent-border)]">
          <IssueActions
            slug={slug}
            issueId={issue.id}
            canMutate={canMutate}
            kind={issue.identifier ? "identifier" : "standard"}
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

function OriginSourceCard({ label, value }: { label: string; value: string }) {
  const flag = countryFlagEmoji(value);
  return (
    <div className="ent-inbox-panel">
      <p className="ent-inbox-panel-kicker">{label}</p>
      <p className="text-sm mt-2 flex items-center gap-2">
        {flag ? <span className="text-lg leading-none" aria-hidden>{flag}</span> : null}
        <span>{value}</span>
      </p>
    </div>
  );
}
