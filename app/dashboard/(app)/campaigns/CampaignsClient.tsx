"use client";

import { FormEvent, useEffect, useState } from "react";
import { HqCard, HqEmptyState, HqPageHeader } from "../../components/HqUi";

type Campaign = {
  id: string;
  name: string;
  status: string;
  channel: string | null;
  objective: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  budget: number | null;
  created_at: string;
};

type Attribution = {
  registrationsAttributed: number;
  firstScansAttributed: number;
  clicksAttributed: number;
  byCampaign: Array<{
    utm_campaign: string;
    utm_source: string | null;
    signups: number;
    scans: number;
    clicks: number;
  }>;
};

export default function DashboardCampaignsClient({
  attribution,
}: {
  attribution: Attribution;
}) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [channel, setChannel] = useState("tiktok");
  const [objective, setObjective] = useState("registrations");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/campaigns");
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load");
      setCampaigns(data.campaigns || []);
    } catch (e: any) {
      setError(e.message || "Failed to load");
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
      const res = await fetch("/api/dashboard/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          channel,
          objective,
          status: "active",
          utmSource: channel,
          utmCampaign: name.toLowerCase().replace(/\s+/g, "-"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Create failed");
      setName("");
      await load();
    } catch (err: any) {
      setError(err.message || "Create failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <HqPageHeader
        title="Campaigns"
        description="Track whether campaigns produce behavior — registrations, first scans, clicks — not just traffic."
        action={
          <a
            href="/api/dashboard/export?kind=overview"
            className="text-xs tracking-widest uppercase border border-black/15 px-3 py-2 hover:bg-black hover:text-white"
          >
            Export overview CSV
          </a>
        }
      />

      <HqCard title="Create campaign" className="mb-6">
        <form onSubmit={onCreate} className="grid md:grid-cols-4 gap-3 items-end">
          <label className="text-sm md:col-span-2">
            <span className="text-xs uppercase tracking-wider text-black/45">Name</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full border border-black/15 rounded-lg px-3 py-2"
              placeholder="Barcelona TikTok"
            />
          </label>
          <label className="text-sm">
            <span className="text-xs uppercase tracking-wider text-black/45">Channel</span>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="mt-1 w-full border border-black/15 rounded-lg px-3 py-2"
            >
              <option value="tiktok">TikTok</option>
              <option value="instagram">Instagram</option>
              <option value="pinterest">Pinterest</option>
              <option value="email">Email</option>
              <option value="event">Event</option>
              <option value="influencer">Influencer</option>
              <option value="other">Other</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={saving}
            className="bg-black text-white text-xs tracking-widest uppercase py-2.5 rounded-lg disabled:opacity-60"
          >
            {saving ? "Saving…" : "Add campaign"}
          </button>
          <label className="text-sm md:col-span-4">
            <span className="text-xs uppercase tracking-wider text-black/45">Objective</span>
            <input
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              className="mt-1 w-full border border-black/15 rounded-lg px-3 py-2"
            />
          </label>
        </form>
        {error ? <p className="text-sm text-red-700 mt-3">{error}</p> : null}
      </HqCard>

      {loading ? (
        <p className="text-sm text-black/50">Loading campaigns…</p>
      ) : campaigns.length === 0 ? (
        <HqEmptyState
          title="No campaigns yet"
          body="Create your first campaign to attach UTM values and compare registrations vs first scans later."
        />
      ) : (
        <HqCard>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] uppercase tracking-wider text-black/40">
                <tr>
                  <th className="py-2 pr-3 font-medium">Name</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">Channel</th>
                  <th className="py-2 pr-3 font-medium">UTM</th>
                  <th className="py-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} className="border-t border-black/5">
                    <td className="py-2 pr-3 font-medium">{c.name}</td>
                    <td className="py-2 pr-3 capitalize">{c.status}</td>
                    <td className="py-2 pr-3 capitalize">{c.channel || "—"}</td>
                    <td className="py-2 pr-3 font-mono text-xs">
                      {c.utm_source || "—"} / {c.utm_campaign || "—"}
                    </td>
                    <td className="py-2 text-black/50 whitespace-nowrap">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </HqCard>
      )}

      <div className="grid md:grid-cols-2 gap-4 mt-6">
        <HqCard title="Attribution (30d)">
          <p className="text-sm text-black/60 leading-relaxed">
            Live from <span className="font-mono text-xs">hq_customer_events</span> when UTM cookies/params are
            present on signup and clickouts. Scans attribute via iOS → scan_history trigger.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-black/70">
            <li className="flex justify-between gap-3">
              <span>Registrations attributed</span>
              <span className="tabular-nums">{attribution.registrationsAttributed}</span>
            </li>
            <li className="flex justify-between gap-3">
              <span>Scans attributed</span>
              <span className="tabular-nums">{attribution.firstScansAttributed}</span>
            </li>
            <li className="flex justify-between gap-3">
              <span>Affiliate clicks attributed</span>
              <span className="tabular-nums">{attribution.clicksAttributed}</span>
            </li>
          </ul>
          {attribution.byCampaign.length ? (
            <ul className="mt-4 space-y-2 text-xs text-black/55 border-t border-black/5 pt-3">
              {attribution.byCampaign.slice(0, 8).map((row) => (
                <li key={`${row.utm_source}-${row.utm_campaign}`} className="flex justify-between gap-2">
                  <span className="font-mono">
                    {row.utm_source || "—"} / {row.utm_campaign}
                  </span>
                  <span>
                    {row.signups}s · {row.scans}scan · {row.clicks}clk
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </HqCard>
        <HqCard title="How to use UTMs">
          <p className="text-sm text-black/60 leading-relaxed">
            Put the campaign’s UTM source/campaign on landing links (TikTok bio, stories, email). The site stores
            first-touch UTMs in cookies; signup and clickout APIs write them into Dashboard events.
          </p>
        </HqCard>
      </div>
    </div>
  );
}
