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
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!canMutate) return null;

  async function onApprove() {
    setBusy(true);
    const res = await fetch(`/api/dashboard/org/${slug}/products/${productId}/approve`, {
      method: "POST",
    });
    const data = await res.json();
    setBusy(false);
    setMessage(res.ok ? "Fields locked as approved." : data.message || "Approve failed.");
    if (res.ok) router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={onApprove}
        className="text-xs tracking-widest uppercase bg-black text-white px-4 py-2 disabled:opacity-50"
      >
        Approve identity and composition
      </button>
      {message ? <p className="text-sm text-black/55 mt-2">{message}</p> : null}
    </div>
  );
}
