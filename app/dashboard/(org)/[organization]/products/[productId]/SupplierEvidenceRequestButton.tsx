"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

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
          className="text-[10px] tracking-wide uppercase border border-black/15 px-2 py-1"
        >
          Request from supplier
        </button>
      ) : (
        <form onSubmit={onSubmit} className="space-y-2 border border-black/10 rounded p-2">
          <p className="text-xs text-black/55">Scoped request for: {issueTitle}</p>
          <input
            required
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
            placeholder="Supplier name"
            className="border border-black/15 rounded px-2 py-1 text-xs w-full"
          />
          <input
            value={supplierEmail}
            onChange={(e) => setSupplierEmail(e.target.value)}
            placeholder="Supplier email (optional)"
            className="border border-black/15 rounded px-2 py-1 text-xs w-full"
          />
          <input
            type="date"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            className="border border-black/15 rounded px-2 py-1 text-xs w-full"
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes for supplier"
            className="border border-black/15 rounded px-2 py-1 text-xs w-full"
            rows={2}
          />
          <div className="flex gap-1">
            <button
              type="submit"
              disabled={busy || !supplierName.trim()}
              className="text-[10px] tracking-wide uppercase border border-black/15 px-2 py-1 disabled:opacity-40"
            >
              Send request
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setOpen(false)}
              className="text-[10px] tracking-wide uppercase border border-black/15 px-2 py-1"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {message ? <p className="text-xs text-red-700 mt-1">{message}</p> : null}
    </div>
  );
}
