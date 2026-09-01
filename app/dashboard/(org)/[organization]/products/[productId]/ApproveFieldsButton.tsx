"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { entButtonClass, entInputClass } from "../../../../components/EnterpriseUi";

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
    <div className="space-y-3">
      <label className="block text-sm text-white/70">
        Review reason
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          className={`mt-2 w-full ${entInputClass} bg-white/95`}
          placeholder="Why these identity and composition values are accepted"
        />
      </label>
      <button
        type="button"
        disabled={busy || reason.trim().length < 8}
        onClick={onApprove}
        className="inline-flex w-full justify-center items-center rounded-[var(--ent-radius-lg)] px-5 py-3 text-sm font-medium bg-white text-[var(--ent-charcoal)] hover:bg-[var(--ent-butter-soft)] transition-colors disabled:opacity-50"
      >
        Approve identity and composition
      </button>
      {message ? <p className="text-sm text-white/60">{message}</p> : null}
    </div>
  );
}
