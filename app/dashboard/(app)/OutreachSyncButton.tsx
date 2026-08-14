"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function OutreachSyncButton({ connected }: { connected: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
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

  async function sync() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/outreach/sync", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || json.error || "Sync failed");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2 shrink-0">
      {error ? <span className="text-[11px] text-red-700 max-w-[14rem] truncate">{error}</span> : null}
      <button
        type="button"
        onClick={sync}
        disabled={busy}
        className="text-[11px] tracking-widest uppercase underline underline-offset-4 disabled:opacity-40"
      >
        {busy ? "Syncing…" : "Sync Gmail"}
      </button>
    </span>
  );
}
