"use client";

import { useMemo, useState } from "react";
import type { FounderAction } from "../../../lib/dashboard/action-center";

const PRIORITY_LABEL: Record<string, string> = {
  critical: "Critical",
  growth: "Growth",
  operational: "Ops",
  monitor: "Monitor",
};

const PRIORITY_STYLE: Record<string, string> = {
  critical: "border-red-200 bg-red-50/40",
  growth: "border-emerald-200 bg-emerald-50/30",
  operational: "border-amber-200 bg-amber-50/40",
  monitor: "border-black/10 bg-[#fafaf8]",
};

const BADGE_STYLE: Record<string, string> = {
  critical: "border-red-200 text-red-900 bg-red-50",
  growth: "border-emerald-200 text-emerald-900 bg-emerald-50",
  operational: "border-amber-200 text-amber-950 bg-amber-50",
  monitor: "border-black/15 text-black/60",
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
  const [expanded, setExpanded] = useState(false);

  const nextAction = actions[0] || null;
  const rest = actions.slice(1);
  const visibleRest = expanded ? rest : rest.slice(0, 2);
  const hiddenCount = Math.max(0, rest.length - visibleRest.length);

  const counts = useMemo(() => {
    const c = { critical: 0, growth: 0, operational: 0, monitor: 0 };
    for (const a of actions) {
      const key = (a.priority || "monitor") as keyof typeof c;
      if (key in c) c[key] += 1;
    }
    return c;
  }, [actions]);

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
      <div className="rounded-lg border border-dashed border-black/15 px-4 py-6 text-center">
        <p className="text-sm font-medium text-black/80">Nothing needs you right now</p>
        <p className="text-sm text-black/50 mt-1 leading-relaxed">
          When web demand, scans, revenue, or catalog sync require a decision, it will land here first.
        </p>
      </div>
    );
  }

  function ActionCard({
    action,
    featured,
  }: {
    action: FounderAction;
    featured?: boolean;
  }) {
    const evidence = action.evidence || {};
    const nextStep =
      typeof evidence.recommendedAction === "string"
        ? evidence.recommendedAction
        : action.expected_impact || "Review evidence and decide.";
    const what =
      typeof evidence.whatChanged === "string" ? evidence.whatChanged : null;

    return (
      <div
        className={`rounded-xl border p-4 ${PRIORITY_STYLE[action.priority] || PRIORITY_STYLE.monitor} ${
          featured ? "shadow-sm" : ""
        }`}
      >
        {featured ? (
          <p className="text-[10px] tracking-[0.16em] uppercase text-black/45 mb-2">Do this next</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span
            className={`text-[10px] tracking-[0.12em] uppercase border px-2 py-0.5 ${
              BADGE_STYLE[action.priority] || BADGE_STYLE.monitor
            }`}
          >
            {PRIORITY_LABEL[action.priority] || action.priority}
          </span>
          {action.confidence ? (
            <span className="text-[10px] tracking-[0.12em] uppercase text-black/40">
              {action.confidence} confidence
            </span>
          ) : null}
        </div>
        <p className={`font-medium text-black/90 ${featured ? "text-base" : "text-sm"}`}>
          {action.title}
        </p>
        {what ? <p className="text-sm text-black/55 mt-1.5 leading-relaxed">{what}</p> : null}
        <p className="text-sm text-black/80 mt-2 leading-relaxed">
          <span className="text-black/40">Next:</span> {nextStep}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {action.href ? (
            <a
              href={action.href}
              className="text-[11px] tracking-widest uppercase bg-black text-white px-3 py-2 hover:bg-black/85"
            >
              Work on this
            </a>
          ) : null}
          {canAdmin ? (
            <>
              <button
                type="button"
                disabled={busy === action.id}
                onClick={() => void mutate(action.id, { action: "complete" })}
                className="text-[11px] tracking-widest uppercase border border-black/20 px-3 py-2 hover:bg-black hover:text-white disabled:opacity-50"
              >
                Done
              </button>
              <button
                type="button"
                disabled={busy === action.id}
                onClick={() => void mutate(action.id, { action: "snooze", days: 1 })}
                className="text-[11px] tracking-widest uppercase border border-black/15 px-3 py-2 text-black/60 hover:text-black disabled:opacity-50"
              >
                Later
              </button>
              <button
                type="button"
                disabled={busy === action.id}
                onClick={() => void mutate(action.id, { action: "dismiss" })}
                className="text-[11px] tracking-widest uppercase px-2 py-2 text-black/40 hover:text-black disabled:opacity-50"
              >
                Dismiss
              </button>
            </>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 text-[11px] tracking-[0.12em] uppercase text-black/45">
        <span>{actions.length} open</span>
        {counts.critical ? <span className="text-red-800">{counts.critical} critical</span> : null}
        {counts.growth ? <span className="text-emerald-800">{counts.growth} growth</span> : null}
        {counts.operational ? <span className="text-amber-900">{counts.operational} ops</span> : null}
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {nextAction ? <ActionCard action={nextAction} featured /> : null}

      {visibleRest.map((a) => (
        <ActionCard key={a.id} action={a} />
      ))}

      {hiddenCount > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-xs tracking-widest uppercase text-black/50 hover:text-black"
        >
          Show {hiddenCount} more →
        </button>
      ) : null}
      {expanded && rest.length > 2 ? (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-xs tracking-widest uppercase text-black/50 hover:text-black"
        >
          Show less
        </button>
      ) : null}
    </div>
  );
}
