"use client";

import { FormEvent, useEffect, useState } from "react";
import { HqCard, HqEmptyState, HqPageHeader } from "../../components/HqUi";

type Item = {
  id: string;
  concept: string;
  hook: string | null;
  platform: string | null;
  filmed: boolean;
  edited: boolean;
  scheduled: boolean;
  posted: boolean;
  publish_at: string | null;
  batch_id: string | null;
};

export default function ContentCalendarClient() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [concept, setConcept] = useState("");
  const [hook, setHook] = useState("");
  const [platform, setPlatform] = useState("tiktok");
  const [publishAt, setPublishAt] = useState("");
  const [batchId, setBatchId] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/content");
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load");
      setItems(data.items || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concept,
          hook,
          platform,
          publishAt: publishAt || null,
          batchId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save");
      setConcept("");
      setHook("");
      setPublishAt("");
      setBatchId("");
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(id: string, field: "filmed" | "edited" | "scheduled" | "posted", value: boolean) {
    const res = await fetch(`/api/dashboard/content/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.message || "Failed to update");
      return;
    }
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...data.item } : item)));
  }

  const today = new Date().toISOString().slice(0, 10);
  const dueToday = items.filter((i) => i.publish_at && i.publish_at.slice(0, 10) === today && !i.posted).length;
  const inPipeline = items.filter((i) => !i.posted).length;

  return (
    <div>
      <HqPageHeader
        title="Content"
        description="Concept → hook → platform → film → edit → schedule → post. Daily production, not a social CRM."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-black/10 rounded-xl p-4">
          <p className="text-[10px] tracking-[0.14em] uppercase text-black/45">Due today</p>
          <p className="text-2xl font-medium mt-2 tabular-nums">{dueToday}</p>
        </div>
        <div className="bg-white border border-black/10 rounded-xl p-4">
          <p className="text-[10px] tracking-[0.14em] uppercase text-black/45">In pipeline</p>
          <p className="text-2xl font-medium mt-2 tabular-nums">{inPipeline}</p>
        </div>
      </div>

      <HqCard className="mb-6" title="Add piece">
        <form onSubmit={onCreate} className="grid gap-3 md:grid-cols-2">
          <label className="text-xs text-black/55 md:col-span-2">
            Concept
            <input
              className="mt-1 w-full border border-black/15 rounded-md px-3 py-2 text-sm"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              required
            />
          </label>
          <label className="text-xs text-black/55 md:col-span-2">
            Hook
            <input
              className="mt-1 w-full border border-black/15 rounded-md px-3 py-2 text-sm"
              value={hook}
              onChange={(e) => setHook(e.target.value)}
            />
          </label>
          <label className="text-xs text-black/55">
            Platform
            <select
              className="mt-1 w-full border border-black/15 rounded-md px-3 py-2 text-sm"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
            >
              <option value="tiktok">TikTok</option>
              <option value="instagram">Instagram</option>
              <option value="pinterest">Pinterest</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="text-xs text-black/55">
            Publish date
            <input
              type="date"
              className="mt-1 w-full border border-black/15 rounded-md px-3 py-2 text-sm"
              value={publishAt}
              onChange={(e) => setPublishAt(e.target.value)}
            />
          </label>
          <label className="text-xs text-black/55 md:col-span-2">
            Batch (optional)
            <input
              className="mt-1 w-full border border-black/15 rounded-md px-3 py-2 text-sm"
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              placeholder="e.g. August batch 1"
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="text-xs tracking-widest uppercase border border-black/20 px-4 py-2 hover:bg-black hover:text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Add"}
          </button>
        </form>
      </HqCard>

      {error ? <p className="text-sm text-red-700 mb-4">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-black/45">Loading…</p>
      ) : items.length === 0 ? (
        <HqEmptyState
          title="No content pieces yet"
          body="Add the next concept. Check filmed / edited / scheduled / posted as the piece moves."
        />
      ) : (
        <HqCard>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] uppercase tracking-wider text-black/40">
                <tr>
                  <th className="py-2 pr-3 font-medium">Concept</th>
                  <th className="py-2 pr-3 font-medium">Platform</th>
                  <th className="py-2 pr-3 font-medium">Date</th>
                  <th className="py-2 pr-3 font-medium">Filmed</th>
                  <th className="py-2 pr-3 font-medium">Edited</th>
                  <th className="py-2 pr-3 font-medium">Scheduled</th>
                  <th className="py-2 font-medium">Posted</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-black/5">
                    <td className="py-2 pr-3">
                      <p className="font-medium">{item.concept}</p>
                      {item.hook ? <p className="text-xs text-black/45 mt-0.5">{item.hook}</p> : null}
                    </td>
                    <td className="py-2 pr-3 uppercase text-xs text-black/60">{item.platform || "—"}</td>
                    <td className="py-2 pr-3 text-black/55 whitespace-nowrap">
                      {item.publish_at ? item.publish_at.slice(0, 10) : "—"}
                    </td>
                    {(["filmed", "edited", "scheduled", "posted"] as const).map((field) => (
                      <td key={field} className="py-2 pr-3">
                        <input
                          type="checkbox"
                          checked={Boolean(item[field])}
                          onChange={(e) => void toggle(item.id, field, e.target.checked)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </HqCard>
      )}
    </div>
  );
}
