"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReviewerIdentity } from "../../../../../lib/enterprise/reviewer-display";
import {
  entButtonClass,
  entButtonGhostClass,
  entInputClass,
  entSelectClass,
} from "../../../components/EnterpriseUi";

export function IssueActions({
  slug,
  issueId,
  issueTitle,
  canMutate,
  kind = "standard",
  members = [],
  assignee,
}: {
  slug: string;
  issueId: string;
  issueTitle: string;
  canMutate: boolean;
  kind?: "standard" | "identifier";
  members?: ReviewerIdentity[];
  assignee?: ReviewerIdentity | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [corrected, setCorrected] = useState("");
  const [assigneeId, setAssigneeId] = useState(assignee?.id || "");
  const [showAssign, setShowAssign] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [supplierName, setSupplierName] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [note, setNote] = useState("");

  if (!canMutate) return null;

  async function postIssue(body: Record<string, unknown>) {
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/dashboard/org/${slug}/issues/${issueId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage(data.message || "Update failed.");
      return false;
    }
    router.refresh();
    return true;
  }

  async function onCorrect(event: FormEvent) {
    event.preventDefault();
    await postIssue({ action: "correct_identifier", correctedIdentifier: corrected });
  }

  async function onAssign(event: FormEvent) {
    event.preventDefault();
    await postIssue({ action: "assign", assigneeId: assigneeId || null });
  }

  async function onNote(event: FormEvent) {
    event.preventDefault();
    const ok = await postIssue({ action: "note", note });
    if (ok) {
      setNote("");
      setShowNote(false);
    }
  }

  async function onSupplierRequest(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/dashboard/org/${slug}/issues/${issueId}/supplier-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierName,
        supplierEmail: supplierEmail || undefined,
        notes: `Evidence request for: ${issueTitle}`,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage(data.message || "Supplier request failed.");
      return;
    }
    setShowRequest(false);
    router.refresh();
  }

  if (kind === "identifier") {
    return (
      <div className="space-y-3 min-w-[16rem]">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => postIssue({ action: "confirm_same_product" })}
            className={entButtonGhostClass}
          >
            Confirm same product
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => postIssue({ action: "treat_as_separate" })}
            className={entButtonGhostClass}
          >
            Treat as separate
          </button>
        </div>
        <form onSubmit={onCorrect} className="flex flex-wrap items-center gap-2">
          <input
            value={corrected}
            onChange={(e) => setCorrected(e.target.value)}
            placeholder="Corrected identifier"
            className={`${entInputClass} min-w-[10rem]`}
          />
          <button type="submit" disabled={busy || !corrected.trim()} className={entButtonClass}>
            Correct identifier
          </button>
        </form>
        {message ? <p className="text-xs text-[var(--ent-raspberry)]">{message}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={entButtonGhostClass}
          disabled={busy}
          onClick={() => {
            setShowAssign((v) => !v);
            setShowNote(false);
            setShowRequest(false);
          }}
        >
          Assign owner
        </button>
        <button
          type="button"
          className={entButtonGhostClass}
          disabled={busy}
          onClick={() => {
            setShowRequest((v) => !v);
            setShowNote(false);
            setShowAssign(false);
          }}
        >
          Request update
        </button>
        <button
          type="button"
          className={entButtonGhostClass}
          disabled={busy}
          onClick={() => {
            setShowNote((v) => !v);
            setShowRequest(false);
            setShowAssign(false);
          }}
        >
          Leave note
        </button>
      </div>

      {showAssign ? (
        <form onSubmit={onAssign} className="flex flex-wrap items-center gap-2">
          <select
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            className={`${entSelectClass} min-w-[12rem]`}
          >
            <option value="">Unassigned</option>
            {members.map((member) => (
              <option key={member.id || member.name} value={member.id || ""}>
                {member.name}
              </option>
            ))}
          </select>
          <button type="submit" disabled={busy} className={entButtonClass}>
            Save owner
          </button>
          {assignee?.name ? (
            <span className="text-xs text-[var(--ent-muted-light)]">Current: {assignee.name}</span>
          ) : null}
        </form>
      ) : null}

      {showRequest ? (
        <form onSubmit={onSupplierRequest} className="space-y-2 max-w-md">
          <input
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
            placeholder="Supplier name"
            className={`${entInputClass} w-full`}
            required
          />
          <input
            value={supplierEmail}
            onChange={(e) => setSupplierEmail(e.target.value)}
            placeholder="Supplier email (optional)"
            className={`${entInputClass} w-full`}
            type="email"
          />
          <button type="submit" disabled={busy || !supplierName.trim()} className={entButtonClass}>
            Send evidence request
          </button>
        </form>
      ) : null}

      {showNote ? (
        <form onSubmit={onNote} className="space-y-2 max-w-md">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add an internal note for your team…"
            rows={3}
            className={`${entInputClass} w-full resize-y min-h-[5rem]`}
          />
          <button type="submit" disabled={busy || note.trim().length < 2} className={entButtonClass}>
            Save note
          </button>
        </form>
      ) : null}

      <div className="flex flex-wrap gap-2 pt-1 border-t border-[var(--ent-border)]/70">
        {(["resolved", "rejected", "not_applicable"] as const).map((status) => (
          <button
            key={status}
            type="button"
            disabled={busy}
            onClick={() => postIssue({ status })}
            className={entButtonGhostClass}
          >
            {status.replaceAll("_", " ")}
          </button>
        ))}
      </div>

      {message ? <p className="text-xs text-[var(--ent-raspberry)]">{message}</p> : null}
    </div>
  );

}
