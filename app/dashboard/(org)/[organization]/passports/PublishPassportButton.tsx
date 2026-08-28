"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PublishPassportButton({
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
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={onPublish}
        className="text-xs tracking-widest uppercase border border-black/20 px-4 py-2 disabled:opacity-50"
      >
        Publish passport
      </button>
      {message ? <p className="text-sm text-black/55 mt-2">{message}</p> : null}
    </div>
  );
}
