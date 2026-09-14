"use client";

import { useMemo, useState } from "react";
import {
  EntOpsEmptyState,
  EntOpsKpiRow,
  EntOpsPanel,
  EntOpsStatusPill,
} from "../../../components/EntOpsModuleUi";
import { entLinkClass } from "../../../components/EnterpriseUi";

type Approval = {
  id: string;
  title: string;
  status: string;
  subject_type: string;
  subject_id: string;
  detail: string | null;
  request_comment: string | null;
  decision_comment: string | null;
  created_at: string;
  decided_at: string | null;
  requested_by: string | null;
  decided_by: string | null;
};

const APPROVAL_RULES = [
  {
    id: "composition",
    icon: "⚗",
    title: "Composition changes require approval",
    description: "Material mix updates route to a reviewer before canonical fields are locked.",
  },
  {
    id: "publish",
    icon: "⬡",
    title: "Publish requests route to admin",
    description: "Passport publication requires an explicit approver with publish permissions.",
  },
  {
    id: "supplier",
    icon: "🌿",
    title: "Supplier evidence routes to sustainability",
    description: "Evidence submissions from suppliers require sustainability review before acceptance.",
  },
] as const;

export function ApprovalsWorkspace({
  organization,
  pending,
  decided,
  kpis,
}: {
  organization: string;
  pending: Approval[];
  decided: Approval[];
  kpis: {
    pending: number;
    reviewedToday: number;
    approvalRate: number;
    avgTurnaroundHours: number | null;
  };
}) {
  const [selectedId, setSelectedId] = useState<string | null>(pending[0]?.id ?? null);
  const [filter, setFilter] = useState("all");

  const selected = useMemo(
    () => pending.find((item) => item.id === selectedId) ?? pending[0] ?? null,
    [pending, selectedId]
  );

  const history = useMemo(() => {
    let rows = decided;
    if (filter !== "all") rows = rows.filter((r) => r.subject_type === filter);
    return rows.slice(0, 12);
  }, [decided, filter]);

  async function decide(id: string, status: "approved" | "rejected") {
    const decisionComment = window.prompt(status === "approved" ? "Approval comment (optional)" : "Rejection reason") || "";
    await fetch(`/api/dashboard/org/${organization}/approvals`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approvalRequestId: id, status, decisionComment }),
    });
    window.location.reload();
  }

  return (
    <div className="ent-opsmod-page">
      <EntOpsKpiRow
        items={[
          {
            id: "pending",
            label: "Pending approvals",
            value: kpis.pending,
            hint: kpis.pending > 0 ? "Awaiting decision" : "Queue clear",
            icon: "⏳",
          },
          {
            id: "today",
            label: "Reviewed today",
            value: kpis.reviewedToday,
            hint: kpis.reviewedToday > 0 ? "Recent activity" : "No decisions today",
            icon: "📋",
          },
          {
            id: "rate",
            label: "Approval rate",
            value: `${kpis.approvalRate}%`,
            hint: "Across decided requests",
            icon: "🛡",
          },
          {
            id: "turnaround",
            label: "Avg. turnaround",
            value: kpis.avgTurnaroundHours != null ? `${kpis.avgTurnaroundHours}h` : "—",
            hint: "Decision time",
            icon: "⏱",
          },
        ]}
      />

      <div className="ent-opsmod-approvals-top">
        <EntOpsPanel
          title="Pending approvals"
          action={
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="ent-select ent-opsmod-filter"
              aria-label="Request type filter"
            >
              <option value="all">All request types</option>
              <option value="product_fields">Field approval</option>
              <option value="passport_publish">Publish</option>
              <option value="import_release">Import</option>
            </select>
          }
          className="ent-opsmod-approvals-pending"
        >
          {pending.length === 0 ? (
            <EntOpsEmptyState
              icon="✓"
              title="No pending approvals right now"
              body="When a field change or publish request needs review, it will appear here for explicit approval."
              ctaHref={`/dashboard/${organization}/settings`}
              ctaLabel="View approval rules →"
            />
          ) : (
            <ul className="ent-opsmod-approval-list">
              {pending.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`ent-opsmod-approval-row ${selected?.id === item.id ? "is-selected" : ""}`}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <p className="ent-opsmod-approval-title">{item.title}</p>
                    {item.detail ? <p className="ent-opsmod-approval-detail">{item.detail}</p> : null}
                    <EntOpsStatusPill tone="open">Pending</EntOpsStatusPill>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </EntOpsPanel>

        <EntOpsPanel title="Selected decision" className="ent-opsmod-approvals-detail">
          {!selected ? (
            <EntOpsEmptyState
              icon="ℹ"
              title="Select a request to view details"
              body="Changes, comments, and decision history appear here when you select a pending approval."
            />
          ) : (
            <div className="ent-opsmod-decision-detail">
              <EntOpsStatusPill tone="open">Pending review</EntOpsStatusPill>
              <h3 className="ent-serif ent-opsmod-detail-title mt-3">{selected.title}</h3>
              {selected.detail ? <p className="ent-opsmod-detail-body">{selected.detail}</p> : null}
              {selected.request_comment ? (
                <blockquote className="ent-opsmod-quote">{selected.request_comment}</blockquote>
              ) : null}
              <p className="ent-opsmod-detail-meta">
                Requested {new Date(selected.created_at).toLocaleString("en-GB")}
              </p>
              <div className="ent-opsmod-action-row mt-4">
                <button type="button" className="ent-opsmod-btn-primary ent-opsmod-btn-inline" onClick={() => decide(selected.id, "approved")}>
                  Approve
                </button>
                <button type="button" className="ent-opsmod-btn-secondary" onClick={() => decide(selected.id, "rejected")}>
                  Reject
                </button>
              </div>
            </div>
          )}
        </EntOpsPanel>
      </div>

      <div className="ent-opsmod-approvals-bottom">
        <EntOpsPanel title="Approval history" className="ent-opsmod-approvals-history">
          {history.length === 0 ? (
            <p className="text-sm text-[var(--ent-muted)]">No approval history yet.</p>
          ) : (
            <>
              <div className="ent-opsmod-table-wrap">
                <table className="ent-opsmod-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Request</th>
                      <th>Subject</th>
                      <th>Decision by</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((item) => (
                      <tr key={item.id}>
                        <td>{item.decided_at ? new Date(item.decided_at).toLocaleDateString("en-GB") : "—"}</td>
                        <td>{item.title}</td>
                        <td className="ent-opsmod-table-muted">{item.subject_type.replaceAll("_", " ")}</td>
                        <td className="ent-opsmod-table-muted">{item.decided_by ? "Reviewer" : "—"}</td>
                        <td>
                          <EntOpsStatusPill tone={item.status === "approved" ? "approved" : "neutral"}>
                            {item.status}
                          </EntOpsStatusPill>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="ent-opsmod-table-footer">
                Showing {history.length} of {decided.length} recent approvals ·{" "}
                <a href={`/dashboard/${organization}/audit`} className={entLinkClass}>
                  View all history →
                </a>
              </p>
            </>
          )}
        </EntOpsPanel>

        <EntOpsPanel
          title="Approval rules"
          action={
            <a href={`/dashboard/${organization}/settings`} className={entLinkClass}>
              Manage rules →
            </a>
          }
          className="ent-opsmod-approvals-rules"
        >
          <ul className="ent-opsmod-rule-list">
            {APPROVAL_RULES.map((rule) => (
              <li key={rule.id}>
                <a href={`/dashboard/${organization}/settings`} className="ent-opsmod-rule-card">
                  <span className="ent-opsmod-rule-icon" aria-hidden>
                    {rule.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="ent-opsmod-rule-title">{rule.title}</span>
                    <span className="ent-opsmod-rule-desc">{rule.description}</span>
                  </span>
                  <span className="ent-opsmod-rule-chevron" aria-hidden>
                    ›
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </EntOpsPanel>
      </div>
    </div>
  );
}
