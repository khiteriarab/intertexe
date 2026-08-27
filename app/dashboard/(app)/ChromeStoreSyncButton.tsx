"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const STALE_MS = 6 * 60 * 60 * 1000;

export function ChromeStoreSyncButton({
  connected,
  usageReady,
  syncedAt,
}: {
  connected: boolean;
  usageReady: boolean;
  syncedAt: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoTried = useRef(false);

  const stale =
    connected &&
    usageReady &&
    (!syncedAt || Date.now() - Date.parse(syncedAt) > STALE_MS);

  async function sync() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/integrations/chrome_web_store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync" }),
        redirect: "manual",
      });
      if (res.status >= 300 && res.status < 400) {
        throw new Error("Session expired — sign in again, then retry.");
      }
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.ok === false) {
        throw new Error(json.error || json.message || "Chrome extension sync failed");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!stale || autoTried.current || busy) return;
    autoTried.current = true;
    void sync();
    // Intentionally run once when the snapshot is older than 6 hours.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stale]);

  if (!connected) {
    return (
      <a
        href="/dashboard/settings"
        className="text-[11px] tracking-widest uppercase underline underline-offset-4 shrink-0"
      >
        Connect Chrome →
      </a>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 shrink-0">
      {error ? <span className="text-[11px] text-red-700 max-w-[14rem] truncate">{error}</span> : null}
      <button
        type="button"
        onClick={() => void sync()}
        disabled={busy}
        className="text-[11px] tracking-widest uppercase underline underline-offset-4 disabled:opacity-40"
      >
        {busy ? "Updating…" : "Refresh extension"}
      </button>
    </span>
  );
}
