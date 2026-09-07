"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { entButtonClass, entButtonGhostClass } from "../../../components/EnterpriseUi";

type IssueOption = { id: string; title: string; status: string };

export function IssuesBulkBar({
  slug,
  issues,
  canMutate,
}: {
  slug: string;
  issues: IssueOption[];
  canMutate: boolean;
}) {
  const router = useRouter();
  const openIssues = useMemo(() => issues.filter((issue) => issue.status === "open"), [issues]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!canMutate || openIssues.length === 0) return null;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === openIssues.length ? new Set() : new Set(openIssues.map((issue) => issue.id))
    );
  }

  async function bulkResolve(action: "resolve" | "not_applicable") {
    if (!selected.size) return;
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/dashboard/org/${slug}/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "resolve_issues",
        issueIds: Array.from(selected),
        issueAction: action,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage(data.message || "Bulk update failed.");
      return;
    }
    setSelected(new Set());
    router.refresh();
  }

  return (
    <div className="mb-6 rounded-xl border border-[var(--ent-border)] bg-[var(--ent-surface-muted)]/40 p-4">
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <button type="button" className={entButtonGhostClass} onClick={toggleAll} disabled={busy}>
          {selected.size === openIssues.length ? "Clear selection" : `Select all open (${openIssues.length})`}
        </button>
        <span className="text-sm text-[var(--ent-muted)]">{selected.size} selected</span>
        <div className="flex flex-wrap gap-2 ml-auto">
          <button
            type="button"
            className={entButtonClass}
            disabled={busy || selected.size === 0}
            onClick={() => bulkResolve("resolve")}
          >
            Resolve selected
          </button>
          <button
            type="button"
            className={entButtonGhostClass}
            disabled={busy || selected.size === 0}
            onClick={() => bulkResolve("not_applicable")}
          >
            Mark not applicable
          </button>
        </div>
      </div>
      <ul className="space-y-2 max-h-48 overflow-y-auto">
        {openIssues.map((issue) => (
          <li key={issue.id} className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.has(issue.id)}
              onChange={() => toggle(issue.id)}
              className="mt-1"
            />
            <span className="text-[var(--ent-ink-soft)] line-clamp-1">{issue.title}</span>
          </li>
        ))}
      </ul>
      {message ? <p className="text-sm text-[var(--ent-raspberry)] mt-3">{message}</p> : null}
    </div>
  );
}
