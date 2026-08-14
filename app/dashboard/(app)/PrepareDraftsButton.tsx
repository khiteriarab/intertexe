"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PrepareResult = {
  ok?: boolean;
  created?: number;
  message?: string;
  needsReconnect?: boolean;
  byType?: {
    influencer?: { created: number; templateSubject: string | null };
    customer?: { created: number; templateSubject: string | null };
  };
  samples?: Array<{ type: string; email: string; firstName: string; subject: string }>;
  errors?: string[];
};

export function PrepareDraftsButton({ connected }: { connected: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PrepareResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!connected) {
    return (
      <a
        href="/dashboard/settings"
        className="text-[11px] tracking-widest uppercase underline underline-offset-4 shrink-0"
      >
        Connect Gmail →
      </a>
    );
  }

  async function prepare() {
    const confirmed = window.confirm(
      "Create up to 40 influencer + 40 customer Gmail drafts from your two template drafts?\n\n" +
        "• Influencers ← “you might love what we built…”\n" +
        "• Customers ← “i think you'd love the intertexe clothing app…”\n\n" +
        "Drafts get the correct To: email and {firstname} filled in.\n" +
        "Nothing is sent — you review and press Send in Gmail."
    );
    if (!confirmed) return;

    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/dashboard/outreach/prepare-drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limitPerType: 40 }),
      });
      const json = (await res.json().catch(() => ({}))) as PrepareResult;
      if (json.needsReconnect) {
        setError(json.message || "Reconnect Gmail in Settings to allow draft creation.");
        setResult(json);
        return;
      }
      if (!res.ok || !json.ok) {
        throw new Error(json.message || json.errors?.[0] || "Prepare drafts failed");
      }
      setResult(json);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Prepare drafts failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1 max-w-md">
      {error ? (
        <p className="text-[11px] text-red-700 text-right leading-snug">
          {error}
          {/reconnect/i.test(error) ? (
            <>
              {" "}
              <a href="/dashboard/settings" className="underline underline-offset-2">
                Settings →
              </a>
            </>
          ) : null}
        </p>
      ) : null}
      {result?.ok ? (
        <p className="text-[11px] text-black/55 text-right leading-snug">
          {result.message}
          {result.byType ? (
            <>
              {" "}
              Influencers {result.byType.influencer?.created ?? 0} · Customers{" "}
              {result.byType.customer?.created ?? 0}.
            </>
          ) : null}
        </p>
      ) : null}
      <button
        type="button"
        onClick={prepare}
        disabled={busy}
        className="text-[11px] tracking-widest uppercase underline underline-offset-4 disabled:opacity-40"
      >
        {busy ? "Preparing drafts…" : "Prepare 40+40 drafts"}
      </button>
    </div>
  );
}
