"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { OrgWorkflowData, WorkflowStageId } from "../../../lib/enterprise/workflow";
import { formatOperatorTime } from "../../../lib/enterprise/reviewer-display";

export function EntWorkflowBoard({
  slug,
  data,
  canEdit,
}: {
  slug: string;
  data: OrgWorkflowData;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const memberOptions = useMemo(
    () => data.members.filter((member) => member.id),
    [data.members]
  );

  async function saveAssignment(stageId: WorkflowStageId, patch: { profileId?: string | null; dueDate?: string | null }) {
    if (!canEdit) return;
    setPending(stageId);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/org/${slug}/workflow`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments: { [stageId]: patch } }),
      });
      const payload = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setError(typeof payload.message === "string" ? payload.message : "Could not save assignment.");
        return;
      }
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  return (
    <div>
      {error ? <p className="mb-4 text-sm text-[var(--ent-raspberry)]">{error}</p> : null}
      <div className="grid gap-4">
        {data.stages.map((stage, index) => {
          const assignee = memberOptions.find((m) => m.id === stage.assignment.profileId);
          return (
            <article
              key={stage.id}
              className={`ent-workflow-stage ent-workflow-stage-${stage.status}`}
              data-assignment-scope="stage"
              data-stage-id={stage.id}
            >
              <div className="flex flex-col lg:flex-row lg:items-start gap-5">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <span className="ent-workflow-step">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="ent-workflow-title">{stage.label}</h3>
                      <span className={`ent-workflow-status ent-workflow-status-${stage.status}`}>
                        {stage.status}
                      </span>
                      {stage.count != null && stage.count > 0 ? (
                        <span className="ent-module-badge">{stage.count}</span>
                      ) : null}
                    </div>
                    <p className="text-sm text-[var(--ent-muted)] mt-2 leading-relaxed">{stage.description}</p>
                    <Link href={stage.href} className="ent-link-subtle inline-flex mt-3">
                      Open stage →
                    </Link>
                  </div>
                </div>

                <div className="lg:w-[320px] shrink-0 ent-workflow-assign-panel">
                  <p className="ent-section-eyebrow mb-3">Assignment</p>
                  <label className="block text-xs font-semibold text-[var(--ent-muted)] mb-1.5">
                    Owner
                    <select
                      className="ent-select mt-1.5 w-full text-sm"
                      disabled={!canEdit || pending === stage.id}
                      value={stage.assignment.profileId || ""}
                      onChange={(event) =>
                        void saveAssignment(stage.id, {
                          profileId: event.target.value || null,
                        })
                      }
                    >
                      <option value="">Unassigned</option>
                      {memberOptions.map((member) => (
                        <option key={member.id!} value={member.id!}>
                          {member.name}
                          {member.role ? ` · ${member.role.replaceAll("_", " ")}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs font-semibold text-[var(--ent-muted)] mt-4 mb-1.5">
                    Due date
                    <input
                      type="date"
                      className="ent-input mt-1.5 w-full text-sm"
                      disabled={!canEdit || pending === stage.id}
                      value={stage.assignment.dueDate?.slice(0, 10) || ""}
                      onChange={(event) =>
                        void saveAssignment(stage.id, {
                          dueDate: event.target.value ? `${event.target.value}T12:00:00.000Z` : null,
                        })
                      }
                    />
                  </label>
                  {assignee ? (
                    <p className="text-xs text-[var(--ent-muted-light)] mt-3">
                      Assigned to {assignee.name}
                      {stage.assignment.dueDate
                        ? ` · due ${formatOperatorTime(stage.assignment.dueDate).split(",")[0]}`
                        : ""}
                    </p>
                  ) : (
                    <p className="text-xs text-[var(--ent-muted-light)] mt-3">
                      Often owned by {stage.roleHint.replaceAll("_", " ")} — any member with edit access can be assigned
                    </p>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function EntWorkflowCalendar({ events }: { events: OrgWorkflowData["calendarEvents"] }) {
  const grouped = useMemo(() => {
    const map = new Map<string, typeof events>();
    for (const event of events) {
      const key = event.date.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(event);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 14);
  }, [events]);

  if (!grouped.length) {
    return (
      <div className="ent-widget-card p-6">
        <p className="text-sm text-[var(--ent-muted)]">No dated workflow events yet. Imports, activity, and due dates will appear here.</p>
      </div>
    );
  }

  return (
    <div className="ent-widget-card p-6 md:p-8">
      <p className="ent-section-eyebrow">Timeline</p>
      <h3 className="ent-widget-title">Workflow calendar</h3>
      <ul className="mt-6 space-y-5">
        {grouped.map(([date, rows]) => (
          <li key={date}>
            <p className="text-xs font-bold tracking-[0.08em] uppercase text-[var(--ent-muted-light)] mb-2">
              {formatOperatorTime(`${date}T12:00:00.000Z`).split(",")[0]}
            </p>
            <ul className="space-y-2">
              {rows.map((event) => (
                <li key={event.id}>
                  {event.href ? (
                    <Link href={event.href} className="ent-calendar-event group">
                      <span className={`ent-calendar-dot ent-calendar-dot-${event.kind}`} />
                      <span className="flex-1 text-sm font-medium text-[var(--ent-ink)] group-hover:text-[var(--ent-petrol-deep)]">
                        {event.title}
                      </span>
                      <span className="text-xs text-[var(--ent-muted-light)]">
                        {formatOperatorTime(event.date).split(", ").slice(1).join(", ") || "All day"}
                      </span>
                    </Link>
                  ) : (
                    <div className="ent-calendar-event">
                      <span className={`ent-calendar-dot ent-calendar-dot-${event.kind}`} />
                      <span className="flex-1 text-sm font-medium text-[var(--ent-ink)]">{event.title}</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
