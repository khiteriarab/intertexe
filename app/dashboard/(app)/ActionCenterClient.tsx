"use client";

import { useState } from "react";
import type { FounderAction } from "../../../lib/dashboard/action-center";

const PRIORITY_LABEL: Record<string, string> = {
  critical: "Critical",
  growth: "Growth opportunity",
  operational: "Operational issue",
  monitor: "Monitor",
};

export function ActionCenterClient({
  initialActions,
  canAdmin,
}: {
  initialActions: FounderAction[];
  canAdmin: boolean;
}) {
  const [actions, setActions] = useState(initialActions);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function mutate(id: string, body: Record<string, unknown>) {
    if (!canAdmin) return;
    setBusy(id);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/actions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Update failed");
      if (body.action === "assign_me") {
        setActions((prev) =>
          prev.map((a) =>
            a.id === id
              ? {
                  ...a,
                  assignee_internal_user_id:
                    data.action?.assignee_internal_user_id || a.assignee_internal_user_id,
                }
              : a
          )
        );
      } else {
        setActions((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(null);
    }
  }

  if (!actions.length) {
    return (
      <p className="text-sm text-black/50">
        No open actions. Deterministic rules will enqueue Critical / Growth / Operational items as
        signals appear.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {actions.map((a) => {
        const evidence = a.evidence || {};
        return (
          <div key={a.id} className="border border-black/10 rounded-lg p-4 bg-[#fafaf8]">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[10px] tracking-[0.12em] uppercase border border-black/15 px-2 py-0.5">
                {PRIORITY_LABEL[a.priority] || a.priority}
              </span>
              {a.confidence ? (
                <span className="text-[10px] tracking-[0.12em] uppercase text-black/40">
                  Confidence {a.confidence}
                </span>
              ) : null}
              {a.comparison_period ? (
                <span className="text-[10px] tracking-[0.12em] uppercase text-black/40">
                  {a.comparison_period.replace(/_/g, " ")}
                </span>
              ) : null}
            </div>
            <p className="text-sm font-medium text-black/90">{a.title}</p>
            {typeof evidence.whatChanged === "string" ? (
              <p className="text-sm text-black/60 mt-1 leading-relaxed">{evidence.whatChanged}</p>
            ) : null}
            {typeof evidence.attention === "string" ? (
              <p className="text-sm text-black/70 mt-1">
                <span className="text-black/40">Attention:</span> {evidence.attention}
              </p>
            ) : null}
            {a.expected_impact ? (
              <p className="text-xs text-black/45 mt-2">Expected impact: {a.expected_impact}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {a.href ? (
                <a
                  href={a.href}
                  className="text-[11px] tracking-widest uppercase border border-black/15 px-2.5 py-1.5 hover:bg-black hover:text-white"
                >
                  Open evidence
                </a>
              ) : null}
              {canAdmin ? (
                <>
                  <button
                    type="button"
                    disabled={busy === a.id}
                    onClick={() => void mutate(a.id, { action: "complete" })}
                    className="text-[11px] tracking-widest uppercase border border-black/15 px-2.5 py-1.5 hover:bg-black hover:text-white disabled:opacity-50"
                  >
                    Complete
                  </button>
                  <button
                    type="button"
                    disabled={busy === a.id}
                    onClick={() => void mutate(a.id, { action: "snooze", days: 3 })}
                    className="text-[11px] tracking-widest uppercase border border-black/15 px-2.5 py-1.5 hover:bg-black hover:text-white disabled:opacity-50"
                  >
                    Snooze 3d
                  </button>
                  <button
                    type="button"
                    disabled={busy === a.id}
                    onClick={() => void mutate(a.id, { action: "assign_me" })}
                    className="text-[11px] tracking-widest uppercase border border-black/15 px-2.5 py-1.5 hover:bg-black hover:text-white disabled:opacity-50"
                  >
                    Assign me
                  </button>
                  <button
                    type="button"
                    disabled={busy === a.id}
                    onClick={() => void mutate(a.id, { action: "dismiss" })}
                    className="text-[11px] tracking-widest uppercase border border-black/15 px-2.5 py-1.5 text-black/50 hover:text-black disabled:opacity-50"
                  >
                    Dismiss
                  </button>
                </>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
