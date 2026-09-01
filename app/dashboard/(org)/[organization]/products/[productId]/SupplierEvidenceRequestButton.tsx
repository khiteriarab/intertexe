"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { entButtonGhostClass, entInputClass } from "../../../../components/EnterpriseUi";

export function SupplierEvidenceRequestButton({
  slug,
  issueId,
  issueTitle,
  canMutate,
}: {
  slug: string;
  issueId: string;
  issueTitle: string;
  canMutate: boolean;
  issueType?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [supplierName, setSupplierName] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [notes, setNotes] = useState("");

  if (!canMutate) return null;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/dashboard/org/${slug}/issues/${issueId}/supplier-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierName,
        supplierEmail,
        dueAt: dueAt || undefined,
        notes,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage(data.message || "Request failed.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="mt-2">
      {!open ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => setOpen(true)}
          className={entButtonGhostClass + " text-xs py-2 px-3"}
        >
          Request from supplier
        </button>
      ) : (
        <form onSubmit={onSubmit} className="ent-panel-nested p-4 space-y-3">
          <p className="text-xs text-[var(--ent-muted)]">Scoped request for: {issueTitle}</p>
          <input
            required
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
            placeholder="Supplier name"
            className={`w-full text-sm ${entInputClass}`}
          />
          <input
            value={supplierEmail}
            onChange={(e) => setSupplierEmail(e.target.value)}
            placeholder="Supplier email (optional)"
            className={`w-full text-sm ${entInputClass}`}
          />
          <input
            type="date"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            className={`w-full text-sm ${entInputClass}`}
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes for supplier"
            className={`w-full text-sm ${entInputClass}`}
            rows={2}
          />
          <div className="flex gap-2">
            <button type="submit" disabled={busy || !supplierName.trim()} className={entButtonGhostClass}>
              Send request
            </button>
            <button type="button" disabled={busy} onClick={() => setOpen(false)} className={entButtonGhostClass}>
              Cancel
            </button>
          </div>
        </form>
      )}
      {message ? <p className="text-xs text-[var(--ent-raspberry)] mt-1">{message}</p> : null}
    </div>
  );
}
