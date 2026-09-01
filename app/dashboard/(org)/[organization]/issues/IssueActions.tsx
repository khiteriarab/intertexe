"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  entButtonClass,
  entButtonGhostClass,
  entInputClass,
} from "../../../components/EnterpriseUi";

export function IssueActions({
  slug,
  issueId,
  canMutate,
  kind = "standard",
}: {
  slug: string;
  issueId: string;
  canMutate: boolean;
  kind?: "standard" | "identifier";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [corrected, setCorrected] = useState("");
  if (!canMutate) return null;

  async function post(body: Record<string, string>) {
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
      return;
    }
    router.refresh();
  }

  async function onCorrect(event: FormEvent) {
    event.preventDefault();
    await post({ action: "correct_identifier", correctedIdentifier: corrected });
  }

  if (kind === "identifier") {
    return (
      <div className="space-y-3 min-w-[16rem]">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => post({ action: "confirm_same_product" })}
            className={entButtonGhostClass}
          >
            Confirm same product
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => post({ action: "treat_as_separate" })}
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
          <button
            type="submit"
            disabled={busy || !corrected.trim()}
            className={entButtonClass}
          >
            Correct identifier
          </button>
        </form>
        {message ? <p className="text-xs text-[var(--ent-raspberry)]">{message}</p> : null}
      </div>
    );
  }

  return (
    <span className="flex flex-wrap gap-2">
      {(["resolved", "rejected", "not_applicable"] as const).map((status) => (
        <button
          key={status}
          type="button"
          disabled={busy}
          onClick={() => post({ status })}
          className={entButtonGhostClass}
        >
          {status.replaceAll("_", " ")}
        </button>
      ))}
      {message ? (
        <span className="text-xs text-[var(--ent-raspberry)] w-full">{message}</span>
      ) : null}
    </span>
  );
}
