"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function TikTokOrganicLogClient({
  canAdmin,
  username,
  lastFollowerCount,
}: {
  canAdmin: boolean;
  username: string | null;
  lastFollowerCount: number | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canAdmin) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    try {
      const res = await fetch("/api/dashboard/tiktok-organic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: String(fd.get("username") || "intertexe"),
          followerCount: fd.get("followerCount"),
          views7d: fd.get("views7d"),
          likes7d: fd.get("likes7d"),
          videosPosted7d: fd.get("videosPosted7d"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Save failed");
      setMessage("Saved. Follower growth vs 7 days ago appears after you log again next week.");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 border-t border-black/10 pt-4">
      <p className="text-[10px] tracking-[0.14em] uppercase text-black/40 mb-2">
        Log from TikTok Analytics
      </p>
      <p className="text-sm text-black/55 leading-relaxed mb-3">
        TikTok will not approve Login Kit for this HQ dashboard. Open Analytics, copy today’s
        numbers, and save them here. Paid ads still sync separately when the ads token is set.
      </p>
      <div className="flex flex-wrap gap-2 mb-4">
        <a
          href="https://www.tiktok.com/tiktokstudio/analytics"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs tracking-widest uppercase bg-black text-white px-3 py-2"
        >
          Open TikTok Analytics
        </a>
        <a
          href={`https://www.tiktok.com/@${(username || "intertexe").replace(/^@/, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs tracking-widest uppercase border border-black/15 px-3 py-2 hover:bg-black hover:text-white"
        >
          Open @{username || "intertexe"}
        </a>
        <a
          href="https://ads.tiktok.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs tracking-widest uppercase border border-black/15 px-3 py-2 hover:bg-black hover:text-white"
        >
          Ads Manager
        </a>
      </div>
      {canAdmin ? (
        <form onSubmit={onSubmit} className="grid sm:grid-cols-2 gap-2">
          <input
            name="username"
            defaultValue={username || "intertexe"}
            placeholder="Username"
            className="border border-black/15 rounded-lg px-2 py-1.5 text-sm"
          />
          <input
            name="followerCount"
            required
            inputMode="numeric"
            defaultValue={lastFollowerCount != null ? String(lastFollowerCount) : ""}
            placeholder="Followers (today)"
            className="border border-black/15 rounded-lg px-2 py-1.5 text-sm"
          />
          <input
            name="views7d"
            inputMode="numeric"
            placeholder="Video views (last 7 days)"
            className="border border-black/15 rounded-lg px-2 py-1.5 text-sm"
          />
          <input
            name="likes7d"
            inputMode="numeric"
            placeholder="Likes (last 7 days)"
            className="border border-black/15 rounded-lg px-2 py-1.5 text-sm"
          />
          <input
            name="videosPosted7d"
            inputMode="numeric"
            placeholder="Videos posted (last 7 days)"
            className="border border-black/15 rounded-lg px-2 py-1.5 text-sm"
          />
          <button
            type="submit"
            disabled={busy}
            className="text-xs tracking-widest uppercase bg-black text-white px-3 py-2 rounded-lg disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save to HQ"}
          </button>
        </form>
      ) : (
        <p className="text-sm text-black/45">Founder/admin can log Analytics numbers into HQ.</p>
      )}
      {message ? <p className="text-sm text-emerald-800 mt-2">{message}</p> : null}
      {error ? <p className="text-sm text-red-700 mt-2">{error}</p> : null}
    </div>
  );
}
