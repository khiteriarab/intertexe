"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ApproveFieldsButton({
  slug,
  productId,
  canMutate,
}: {
  slug: string;
  productId: string;
  canMutate: boolean;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!canMutate) return null;

  async function onApprove() {
    setBusy(true);
    const res = await fetch(`/api/dashboard/org/${slug}/products/${productId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    setBusy(false);
    setMessage(res.ok ? "Fields locked as approved." : data.message || "Approve failed.");
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm">
        Review reason
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          className="mt-1 w-full border border-black/15 rounded-lg px-3 py-2 text-sm"
          placeholder="Why these identity and composition values are accepted"
        />
      </label>
      <button
        type="button"
        disabled={busy || reason.trim().length < 8}
        onClick={onApprove}
        className="text-xs tracking-widest uppercase bg-black text-white px-4 py-2 disabled:opacity-50"
      >
        Approve identity and composition
      </button>
      {message ? <p className="text-sm text-black/55">{message}</p> : null}
    </div>
  );
}
