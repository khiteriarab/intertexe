"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PublishPassportButton({
  slug,
  productId,
  canMutate,
  publishReady = true,
}: {
  slug: string;
  productId: string;
  canMutate: boolean;
  publishReady?: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!canMutate) return null;

  async function onPublish() {
    setBusy(true);
    const res = await fetch(`/api/dashboard/org/${slug}/passports/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(data.message || "Publish blocked.");
      return;
    }
    setMessage(`Published ${data.publicId} v${data.version}`);
    router.refresh();
  }

  return (
    <div className="mt-4 pt-4 border-t border-white/10">
      <button
        type="button"
        disabled={busy || !publishReady}
        onClick={onPublish}
        className="inline-flex w-full justify-center items-center rounded-[var(--ent-radius-lg)] px-5 py-3 text-sm font-semibold bg-[var(--ent-charcoal)] text-[var(--ent-cream)] hover:bg-[#1f1a14] transition-colors disabled:opacity-50"
      >
        Publish passport
      </button>
      {!publishReady ? (
        <p className="text-xs text-white/50 mt-2">Approve required fields and clear publish blockers first.</p>
      ) : null}
      {message ? <p className="text-sm text-white/60 mt-2">{message}</p> : null}
    </div>
  );
}
