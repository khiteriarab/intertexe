"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function IssueActions({
  slug,
  issueId,
  canMutate,
}: {
  slug: string;
  issueId: string;
  canMutate: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  if (!canMutate) return null;

  async function setStatus(status: "resolved" | "rejected" | "not_applicable") {
    setBusy(true);
    await fetch(`/api/dashboard/org/${slug}/issues/${issueId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <span className="flex flex-wrap gap-1">
      {(["resolved", "rejected", "not_applicable"] as const).map((status) => (
        <button
          key={status}
          type="button"
          disabled={busy}
          onClick={() => setStatus(status)}
          className="text-[10px] tracking-wide uppercase border border-black/15 px-2 py-1"
        >
          {status.replaceAll("_", " ")}
        </button>
      ))}
    </span>
  );
}
