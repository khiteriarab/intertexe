"use client";

import { FormEvent, useState } from "react";

type SnapshotOrg = {
  id: string;
  slug: string;
  name: string;
  plan: string;
  snapshot_stage: string | null;
  product_allowance: number | null;
};

export function SnapshotAdminClient({
  configured,
  initial,
}: {
  configured: boolean;
  initial: SnapshotOrg[];
}) {
  const [orgs, setOrgs] = useState(initial);
  const [companyName, setCompanyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [hqDealId, setHqDealId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/dashboard/enterprise/snapshots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyName, contactEmail, hqDealId }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(data.message || "Could not create workspace.");
      return;
    }
    setMessage(
      `Created ${data.organization.slug}. Invite link generated — email is not auto-sent.`
    );
    setCompanyName("");
    setContactEmail("");
    const refresh = await fetch("/api/dashboard/enterprise/snapshots");
    const next = await refresh.json();
    setOrgs(next.organizations || []);
  }

  async function convert(id: string) {
    setBusy(true);
    const res = await fetch(`/api/dashboard/enterprise/snapshots/${id}/convert`, { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(data.message || "Upgrade failed.");
      return;
    }
    setMessage(`Upgraded ${data.slug} to founding pilot in place.`);
    const refresh = await fetch("/api/dashboard/enterprise/snapshots");
    const next = await refresh.json();
    setOrgs(next.organizations || []);
  }

  const inProgress = orgs.filter((org) =>
    ["invited", "upload_pending", "uploaded", "processing"].includes(org.snapshot_stage || "")
  );
  const followUp = orgs.filter((org) =>
    ["results_ready", "prospect_viewed", "follow_up_due", "pilot_offered"].includes(
      org.snapshot_stage || ""
    )
  );

  return (
    <div className="space-y-6">
      {!configured ? (
        <p className="text-sm text-black/60">
          Enterprise backend is not linked. Snapshot workspaces cannot be created until
          obelisk-core credentials are set.
        </p>
      ) : null}

      <form onSubmit={onCreate} className="bg-white border border-black/10 rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-medium">Create snapshot workspace</h2>
        <label className="block text-sm">
          Company name
          <input
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="mt-1 w-full border border-black/15 rounded-lg px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Primary contact email
          <input
            type="email"
            required
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="mt-1 w-full border border-black/15 rounded-lg px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          HQ deal ID (optional)
          <input
            value={hqDealId}
            onChange={(e) => setHqDealId(e.target.value)}
            className="mt-1 w-full border border-black/15 rounded-lg px-3 py-2 font-mono text-xs"
          />
        </label>
        <button
          type="submit"
          disabled={busy || !configured}
          className="text-xs tracking-widest uppercase bg-black text-white px-4 py-2 disabled:opacity-50"
        >
          Create snapshot workspace
        </button>
        {message ? <p className="text-sm text-black/60">{message}</p> : null}
      </form>

      <section className="bg-white border border-black/10 rounded-xl p-5">
        <h2 className="text-sm font-medium mb-3">Snapshots in progress</h2>
        {inProgress.length === 0 ? (
          <p className="text-sm text-black/50">None.</p>
        ) : (
          <ul className="text-sm space-y-2">
            {inProgress.map((org) => (
              <li key={org.id}>
                {org.name} · {org.snapshot_stage} · /dashboard/{org.slug}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white border border-black/10 rounded-xl p-5">
        <h2 className="text-sm font-medium mb-3">Snapshots ready for follow-up</h2>
        {followUp.length === 0 ? (
          <p className="text-sm text-black/50">None.</p>
        ) : (
          <ul className="text-sm space-y-2">
            {followUp.map((org) => (
              <li key={org.id} className="flex items-center justify-between gap-3">
                <span>
                  {org.name} · {org.snapshot_stage}
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => convert(org.id)}
                  className="text-xs tracking-widest uppercase border border-black/15 px-3 py-1"
                >
                  Convert to pilot
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
