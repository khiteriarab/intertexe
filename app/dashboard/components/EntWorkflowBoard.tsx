"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { OrgWorkflowData, WorkflowStageId } from "../../../lib/enterprise/workflow";
import { formatOperatorTime } from "../../../lib/enterprise/reviewer-display";
import { EntOpsPanel, EntOpsStatusPill } from "./EntOpsModuleUi";
import { entLinkClass } from "./EnterpriseUi";

function statusLabel(status: "complete" | "active" | "upcoming"): string {
  if (status === "complete") return "Complete";
  if (status === "active") return "Active";
  return "Queued";
}

function statusTone(status: "complete" | "active" | "upcoming") {
  if (status === "complete") return "complete" as const;
  if (status === "active") return "active" as const;
  return "queued" as const;
}

export function EntWorkflowBoard({
  slug,
  data,
  canEdit,
  displayStageIds,
}: {
  slug: string;
  data: OrgWorkflowData;
  canEdit: boolean;
  displayStageIds?: WorkflowStageId[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stages = useMemo(() => {
    if (!displayStageIds?.length) return data.stages;
    const allowed = new Set(displayStageIds);
    return data.stages.filter((stage) => allowed.has(stage.id));
  }, [data.stages, displayStageIds]);

  const completeCount = stages.filter((s) => s.status === "complete").length;

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
    <EntOpsPanel
      title="Passport workflow"
      subtitle="Stage assignments"
      action={
        <span className="ent-opsmod-progress-label">
          {completeCount} of {stages.length} complete
        </span>
      }
    >
      {error ? <p className="mb-4 text-sm text-[var(--ent-raspberry)]">{error}</p> : null}
      <ol className="ent-opsmod-workflow-rail">
        {stages.map((stage, index) => {
          const assignee = memberOptions.find((m) => m.id === stage.assignment.profileId);
          const isLast = index === stages.length - 1;
          return (
            <li key={stage.id} className={`ent-opsmod-workflow-item ${isLast ? "is-last" : ""}`}>
              <article
                className={`ent-opsmod-workflow-stage ent-opsmod-workflow-stage--${stage.status}`}
                data-stage-id={stage.id}
              >
                <div className="ent-opsmod-workflow-main">
                  <span className="ent-opsmod-workflow-step" aria-hidden>
                    {stage.status === "complete" ? "✓" : index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="ent-opsmod-workflow-title">{stage.label}</h3>
                      <EntOpsStatusPill tone={statusTone(stage.status)}>{statusLabel(stage.status)}</EntOpsStatusPill>
                      {stage.count != null && stage.count > 0 ? (
                        <span className="ent-opsmod-count-badge">{stage.count}</span>
                      ) : null}
                    </div>
                    <p className="ent-opsmod-workflow-desc">{stage.description}</p>
                    <Link href={stage.href} className={`${entLinkClass} ent-opsmod-stage-link`}>
                      Open stage →
                    </Link>
                  </div>
                </div>

                <div className="ent-opsmod-workflow-assign">
                  <p className="ent-opsmod-assign-label">Assignment</p>
                  <label className="ent-opsmod-field">
                    <span>Owner</span>
                    <select
                      className="ent-select ent-opsmod-select"
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
                  <label className="ent-opsmod-field">
                    <span>Due date</span>
                    <input
                      type="date"
                      className="ent-input ent-opsmod-select"
                      disabled={!canEdit || pending === stage.id}
                      value={stage.assignment.dueDate?.slice(0, 10) || ""}
                      onChange={(event) =>
                        void saveAssignment(stage.id, {
                          dueDate: event.target.value ? `${event.target.value}T12:00:00.000Z` : null,
                        })
                      }
                    />
                  </label>
                  <p className="ent-opsmod-assign-hint">
                    {assignee
                      ? `Assigned to ${assignee.name}${
                          stage.assignment.dueDate
                            ? ` · due ${formatOperatorTime(stage.assignment.dueDate).split(",")[0]}`
                            : ""
                        }`
                      : `Often owned by ${stage.roleHint.replaceAll("_", " ")} — any member with edit access can be assigned.`}
                  </p>
                </div>
              </article>
            </li>
          );
        })}
      </ol>
    </EntOpsPanel>
  );
}

function calendarDotClass(kind: OrgWorkflowData["calendarEvents"][number]["kind"]): string {
  if (kind === "supplier" || kind === "due") return "attention";
  if (kind === "publish") return "complete";
  if (kind === "import") return "progress";
  return "neutral";
}

export function EntWorkflowCalendar({
  events,
  base,
}: {
  events: OrgWorkflowData["calendarEvents"];
  base: string;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, typeof events>();
    for (const event of events) {
      if (!event?.date || event.date === "null" || event.date === "undefined") continue;
      const parsed = new Date(event.date);
      if (Number.isNaN(parsed.getTime())) continue;
      const key = event.date.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(event);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12);
  }, [events]);

  return (
    <EntOpsPanel
      title="Timeline"
      subtitle="Recent workflow events"
      action={
        <Link href={`${base}/activity`} className={entLinkClass}>
          View activity feed →
        </Link>
      }
    >
      {!grouped.length ? (
        <p className="text-sm text-[var(--ent-muted)]">
          No dated workflow events yet. Imports, activity, and due dates will appear here.
        </p>
      ) : (
        <ul className="ent-opsmod-timeline">
          {grouped.map(([date, rows]) => (
            <li key={date}>
              <p className="ent-opsmod-timeline-date">
                {formatOperatorTime(`${date}T12:00:00.000Z`).split(",")[0].toUpperCase()}
              </p>
              <ul className="ent-opsmod-timeline-events">
                {rows.map((event) => {
                  const timeLabel = formatOperatorTime(event.date).split(", ").slice(1).join(", ") || "All day";
                  const content = (
                    <>
                      <span className={`ent-opsmod-timeline-dot ent-opsmod-timeline-dot--${calendarDotClass(event.kind)}`} />
                      <span className="ent-opsmod-timeline-title">{event.title}</span>
                      <span className="ent-opsmod-timeline-time">{timeLabel}</span>
                    </>
                  );
                  return (
                    <li key={event.id}>
                      {event.href ? (
                        <Link href={event.href} className="ent-opsmod-timeline-row">
                          {content}
                        </Link>
                      ) : (
                        <div className="ent-opsmod-timeline-row">{content}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
      <Link href={`${base}/activity`} className={`${entLinkClass} ent-opsmod-timeline-footer`}>
        View full timeline →
      </Link>
    </EntOpsPanel>
  );
}
