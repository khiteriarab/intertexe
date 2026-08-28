"use client";

import { FormEvent, useEffect, useState, type ReactNode } from "react";

type InvitationSummary = {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  status: "pending" | "accepted" | "expired" | "revoked";
};

type SnapshotOrg = {
  id: string;
  slug: string;
  name: string;
  plan: string;
  kind?: string;
  snapshot_stage: string | null;
  product_allowance: number | null;
  invitations?: InvitationSummary[];
};

type SecretReveal = {
  label: string;
  value: string;
  transitional?: boolean;
};

function formatWhen(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

function InvitationPanel({
  org,
  busy,
  onRefresh,
  onMessage,
  latestInviteUrl,
  onLatestInviteUrl,
}: {
  org: SnapshotOrg;
  busy: boolean;
  onRefresh: () => Promise<void>;
  onMessage: (text: string) => void;
  latestInviteUrl: string | null;
  onLatestInviteUrl: (url: string | null) => void;
}) {
  const invitations = org.invitations || [];
  const latest = invitations[0];
  const inviteUrl = latestInviteUrl || null;

  async function regenerate() {
    const email = latest?.email || window.prompt("Contact email for the new invite");
    if (!email) return;
    const res = await fetch(`/api/dashboard/enterprise/snapshots/${org.id}/invitation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "regenerate", email, role: latest?.role || "owner" }),
    });
    const data = await res.json();
    if (!res.ok) {
      onMessage(data.message || "Could not regenerate invite.");
      return;
    }
    onLatestInviteUrl(data.inviteUrl || null);
    onMessage(`Regenerated invite for ${org.slug}. Copy the link below.`);
    await onRefresh();
  }

  async function revoke() {
    const res = await fetch(`/api/dashboard/enterprise/snapshots/${org.id}/invitation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "revoke", email: latest?.email }),
    });
    const data = await res.json();
    if (!res.ok) {
      onMessage(data.message || "Could not revoke invite.");
      return;
    }
    onLatestInviteUrl(null);
    onMessage(`Revoked pending invites for ${org.slug}.`);
    await onRefresh();
  }

  return (
    <div className="mt-3 border-t border-black/10 pt-3 space-y-2">
      <h3 className="text-xs font-medium uppercase tracking-wider text-black/50">Workspace invite</h3>
      {inviteUrl ? (
        <div className="rounded-lg border border-black/10 bg-black/[0.02] p-3 space-y-2">
          <p className="text-xs text-black/55">Copy this invite link once. It is not stored after you leave this page.</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="text-xs break-all flex-1 min-w-[12rem]">{inviteUrl}</code>
            <button
              type="button"
              disabled={busy}
              onClick={() => copyText(inviteUrl).then(() => onMessage("Invite link copied."))}
              className="text-[10px] tracking-wide uppercase border border-black/15 px-2 py-1"
            >
              Copy invite link
            </button>
          </div>
        </div>
      ) : null}
      {latest ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-black/70">
          <dt className="text-black/45">Email</dt>
          <dd>{latest.email}</dd>
          <dt className="text-black/45">Status</dt>
          <dd className="capitalize">{latest.status}</dd>
          <dt className="text-black/45">Expires</dt>
          <dd>{formatWhen(latest.expiresAt)}</dd>
          <dt className="text-black/45">Accepted</dt>
          <dd>{formatWhen(latest.acceptedAt)}</dd>
        </dl>
      ) : (
        <p className="text-xs text-black/50">No invitations yet.</p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={regenerate}
          className="text-[10px] tracking-wide uppercase border border-black/15 px-2 py-1"
        >
          Regenerate invite
        </button>
        <button
          type="button"
          disabled={busy || latest?.status !== "pending"}
          onClick={revoke}
          className="text-[10px] tracking-wide uppercase border border-black/15 px-2 py-1 disabled:opacity-40"
        >
          Revoke pending invite
        </button>
      </div>
    </div>
  );
}

function ProvisionPanel({
  org,
  busy,
  setBusy,
  onRefresh,
  onMessage,
  onSecret,
}: {
  org: SnapshotOrg;
  busy: boolean;
  setBusy: (value: boolean) => void;
  onRefresh: () => Promise<void>;
  onMessage: (text: string) => void;
  onSecret: (secret: SecretReveal | null) => void;
}) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("product_manager");
  const [confirmCrossOrg, setConfirmCrossOrg] = useState(false);
  const [crossOrgHint, setCrossOrgHint] = useState<string | null>(null);

  async function onProvision(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setCrossOrgHint(null);
    onSecret(null);
    const res = await fetch(`/api/dashboard/enterprise/snapshots/${org.id}/provision-operator`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, fullName, role, confirmCrossOrg }),
    });
    const data = await res.json();
    setBusy(false);
    if (res.status === 409 && data.code === "cross_org_membership") {
      const names = (data.otherOrganizations || []).map((row: { slug: string }) => row.slug).join(", ");
      setCrossOrgHint(`Operator already belongs to: ${names}. Confirm cross-org access below and retry.`);
      setConfirmCrossOrg(true);
      onMessage(data.message || "Cross-org confirmation required.");
      return;
    }
    if (!res.ok) {
      onMessage(data.message || "Could not provision operator.");
      return;
    }
    onMessage(data.message || "Operator provisioned.");
    if (data.setupLink) {
      onSecret({ label: "Password setup link (copy once)", value: data.setupLink });
    } else if (data.transitionalPassword) {
      onSecret({
        label: "Transitional one-time password (copy once)",
        value: data.transitionalPassword,
        transitional: true,
      });
    }
    await onRefresh();
  }

  return (
    <form onSubmit={onProvision} className="mt-3 border-t border-black/10 pt-3 space-y-2">
      <h3 className="text-xs font-medium uppercase tracking-wider text-black/50">Provision operator</h3>
      <p className="text-xs text-black/55">
        Creates the Enterprise Auth user, profile, and active membership. Never creates HQ access or staff identity links.
      </p>
      <label className="block text-xs">
        Email
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full border border-black/15 rounded-lg px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-xs">
        Full name
        <input
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="mt-1 w-full border border-black/15 rounded-lg px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-xs">
        Role
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="mt-1 w-full border border-black/15 rounded-lg px-3 py-2 text-sm"
        >
          <option value="product_manager">Product manager</option>
          <option value="owner">Owner</option>
          <option value="admin">Admin</option>
          <option value="reviewer">Reviewer</option>
          <option value="read_only">Read only</option>
        </select>
      </label>
      {crossOrgHint ? (
        <label className="flex items-start gap-2 text-xs text-amber-900">
          <input
            type="checkbox"
            checked={confirmCrossOrg}
            onChange={(e) => setConfirmCrossOrg(e.target.checked)}
            className="mt-1"
          />
          <span>{crossOrgHint}</span>
        </label>
      ) : null}
      <button
        type="submit"
        disabled={busy}
        className="text-[10px] tracking-wide uppercase border border-black/15 px-3 py-1"
      >
        Provision operator
      </button>
    </form>
  );
}

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
  const [latestInviteByOrg, setLatestInviteByOrg] = useState<Record<string, string>>({});
  const [secretReveal, setSecretReveal] = useState<SecretReveal | null>(null);

  useEffect(() => {
    if (configured) void refreshOrgs();
  }, [configured]);

  async function refreshOrgs() {
    const refresh = await fetch("/api/dashboard/enterprise/snapshots");
    const next = await refresh.json();
    setOrgs(next.organizations || []);
  }

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setSecretReveal(null);
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
    if (data.inviteUrl && data.organization?.id) {
      setLatestInviteByOrg((prev) => ({ ...prev, [data.organization.id]: data.inviteUrl }));
    }
    setMessage(`Created ${data.organization.slug}. Copy the invite link below — email is not auto-sent.`);
    setCompanyName("");
    setContactEmail("");
    await refreshOrgs();
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
    await refreshOrgs();
  }

  const inProgress = orgs.filter((org) =>
    ["invited", "upload_pending", "uploaded", "processing"].includes(org.snapshot_stage || "")
  );
  const followUp = orgs.filter((org) =>
    ["results_ready", "prospect_viewed", "follow_up_due", "pilot_offered"].includes(org.snapshot_stage || "")
  );
  const converted = orgs.filter((org) => org.snapshot_stage === "converted" || org.plan === "founding_pilot");

  function renderOrgCard(org: SnapshotOrg, actions?: ReactNode) {
    return (
      <li key={org.id} className="border border-black/10 rounded-lg p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-medium">{org.name}</p>
            <p className="text-xs text-black/55">
              /dashboard/{org.slug} · {org.plan}
              {org.snapshot_stage ? ` · ${org.snapshot_stage}` : ""}
            </p>
          </div>
          {actions}
        </div>
        <InvitationPanel
          org={org}
          busy={busy}
          onRefresh={refreshOrgs}
          onMessage={setMessage}
          latestInviteUrl={latestInviteByOrg[org.id] || null}
          onLatestInviteUrl={(url) =>
            setLatestInviteByOrg((prev) => {
              const next = { ...prev };
              if (url) next[org.id] = url;
              else delete next[org.id];
              return next;
            })
          }
        />
        <ProvisionPanel
          org={org}
          busy={busy}
          setBusy={setBusy}
          onRefresh={refreshOrgs}
          onMessage={setMessage}
          onSecret={setSecretReveal}
        />
      </li>
    );
  }

  return (
    <div className="space-y-6">
      {!configured ? (
        <p className="text-sm text-black/60">
          Enterprise backend is not linked. Snapshot workspaces cannot be created until obelisk-core credentials are set.
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
      </form>

      {secretReveal ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-2">
          <p className="text-sm font-medium">{secretReveal.label}</p>
          {secretReveal.transitional ? (
            <p className="text-xs text-amber-900">Transitional Phase 1 credential. Share once, then ask the operator to change it.</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <code className="text-xs break-all flex-1">{secretReveal.value}</code>
            <button
              type="button"
              onClick={() => copyText(secretReveal.value).then(() => setMessage("Credential copied."))}
              className="text-[10px] tracking-wide uppercase border border-black/15 px-2 py-1"
            >
              Copy
            </button>
          </div>
        </div>
      ) : null}

      {message ? <p className="text-sm text-black/60">{message}</p> : null}

      <section className="bg-white border border-black/10 rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-medium">Snapshots in progress</h2>
        {inProgress.length === 0 ? (
          <p className="text-sm text-black/50">None.</p>
        ) : (
          <ul className="space-y-3">{inProgress.map((org) => renderOrgCard(org))}</ul>
        )}
      </section>

      <section className="bg-white border border-black/10 rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-medium">Snapshots ready for follow-up</h2>
        {followUp.length === 0 ? (
          <p className="text-sm text-black/50">None.</p>
        ) : (
          <ul className="space-y-3">
            {followUp.map((org) =>
              renderOrgCard(
                org,
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => convert(org.id)}
                  className="text-xs tracking-widest uppercase border border-black/15 px-3 py-1"
                >
                  Convert to pilot
                </button>
              )
            )}
          </ul>
        )}
      </section>

      {converted.length ? (
        <section className="bg-white border border-black/10 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-medium">Converted pilots</h2>
          <ul className="space-y-3">{converted.map((org) => renderOrgCard(org))}</ul>
        </section>
      ) : null}
    </div>
  );
}
