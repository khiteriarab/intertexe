"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HqCard } from "../../components/HqUi";

type Workspace = { id: string; slug: string; name: string };
type Invite = { id: string; email: string; role_key: string; status: string; token: string; expires_at: string };
type Member = { id: string; email: string; full_name: string | null; is_active: boolean };
type Client = {
  id: string;
  name: string;
  company: string | null;
  email: string;
  plan: string;
  monthly_limit: number;
  is_active: boolean;
};
type ApiKey = {
  id: string;
  client_id: string;
  key_prefix: string;
  last_four: string;
  status: string;
  environment: string;
};
type Lead = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company: string;
  intent: string;
  created_at: string;
};
type UsageSummary = {
  window: string;
  requests: number;
  matches: number;
  notFound: number;
  errors: number;
  notFoundRate: number;
  errorRate: number;
};

export function SettingsAdminClient({
  workspaceName,
  workspaceSlug,
  workspaces,
  canAdmin,
}: {
  workspaceName: string;
  workspaceSlug: string;
  workspaces: Workspace[];
  canAdmin: boolean;
}) {
  const router = useRouter();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("analyst");
  const [wsName, setWsName] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!canAdmin) return;
    const [inv, plat] = await Promise.all([
      fetch("/api/dashboard/invites").then((r) => r.json()),
      fetch("/api/dashboard/material-api-clients").then((r) => r.json()),
    ]);
    setInvites(inv.invites || []);
    setMembers(inv.members || []);
    setClients(plat.clients || []);
    setApiKeys(plat.keys || []);
    setLeads(plat.leads || []);
    setUsage(plat.usage || null);
  }

  useEffect(() => {
    void load();
  }, [canAdmin]);

  async function switchWorkspace(workspaceId: string) {
    await fetch("/api/dashboard/workspaces", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId }),
    });
    router.refresh();
  }

  async function createWorkspace(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const res = await fetch("/api/dashboard/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: wsName }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.message || "Create failed");
      return;
    }
    setMessage(`Created workspace ${data.workspace.slug}`);
    setWsName("");
    await switchWorkspace(data.workspace.id);
  }

  async function createInvite(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const res = await fetch("/api/dashboard/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, roleKey: inviteRole }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.message || "Invite failed");
      return;
    }
    setMessage(`Invite ready: ${data.acceptUrl}`);
    setInviteEmail("");
    await load();
  }

  async function createClient(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const res = await fetch("/api/dashboard/material-api-clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: clientName, email: clientEmail, plan: "founding_pilot" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.message || "Client create failed");
      return;
    }
    setMessage(
      data.rawKey
        ? `Raw key (shown once): ${data.rawKey}`
        : `API client created for ${data.client?.name || clientName}`
    );
    setClientName("");
    setClientEmail("");
    await load();
  }

  return (
    <div className="space-y-6 mt-6">
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {message ? <p className="text-sm text-black/60 break-all">{message}</p> : null}

      <HqCard title="Workspaces">
        <p className="text-sm text-black/55 mb-3">
          Active: <span className="font-medium text-black/80">{workspaceName}</span> ({workspaceSlug})
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          {workspaces.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => switchWorkspace(w.id)}
              className={`text-xs tracking-widest uppercase border px-3 py-2 ${
                w.slug === workspaceSlug ? "bg-black text-white border-black" : "border-black/15 hover:bg-black/5"
              }`}
            >
              {w.name}
            </button>
          ))}
        </div>
        {canAdmin ? (
          <form onSubmit={createWorkspace} className="flex flex-col sm:flex-row gap-2">
            <input
              value={wsName}
              onChange={(e) => setWsName(e.target.value)}
              placeholder="New client workspace name"
              className="flex-1 border border-black/15 rounded-lg px-3 py-2 text-sm"
              required
            />
            <button type="submit" className="bg-black text-white text-xs tracking-widest uppercase px-4 py-2 rounded-lg">
              Create workspace
            </button>
          </form>
        ) : null}
      </HqCard>

      {canAdmin ? (
        <>
          <HqCard title="Team invites">
            <form onSubmit={createInvite} className="grid sm:grid-cols-3 gap-2 mb-4">
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@brand.com"
                className="border border-black/15 rounded-lg px-3 py-2 text-sm sm:col-span-1"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="border border-black/15 rounded-lg px-3 py-2 text-sm"
              >
                <option value="admin">Admin</option>
                <option value="marketing">Marketing</option>
                <option value="partnerships">Partnerships</option>
                <option value="editorial">Editorial</option>
                <option value="analyst">Analyst</option>
                <option value="read_only">Read only</option>
              </select>
              <button type="submit" className="bg-black text-white text-xs tracking-widest uppercase px-4 py-2 rounded-lg">
                Send invite link
              </button>
            </form>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-black/40 mb-2">Members</p>
                <ul className="space-y-1">
                  {members.map((m) => (
                    <li key={m.id} className="flex justify-between gap-2">
                      <span>{m.full_name || m.email}</span>
                      <span className="text-black/40">{m.is_active ? "active" : "inactive"}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-black/40 mb-2">Pending invites</p>
                <ul className="space-y-1">
                  {invites.filter((i) => i.status === "pending").map((i) => (
                    <li key={i.id} className="flex justify-between gap-2">
                      <span>
                        {i.email} · {i.role_key}
                      </span>
                    </li>
                  ))}
                  {!invites.some((i) => i.status === "pending") ? (
                    <li className="text-black/40">None</li>
                  ) : null}
                </ul>
              </div>
            </div>
          </HqCard>

          <HqCard title="Material Intelligence API">
            <p className="text-sm text-black/55 mb-4">
              Founder-issued keys for <span className="font-mono text-xs">GET /api/v1/composition/{"{gtin}"}</span>.
              Raw keys are hashed. They are shown once.
            </p>
            {usage ? (
              <p className="text-xs text-black/50 mb-4">
                Last {usage.window}: {usage.requests} requests · {usage.matches} matches · {usage.notFound}{" "}
                not found · {usage.errors} errors
              </p>
            ) : null}
            <form onSubmit={createClient} className="grid sm:grid-cols-3 gap-2 mb-4">
              <input
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Client name"
                className="border border-black/15 rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="email"
                required
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="ops@brand.com"
                className="border border-black/15 rounded-lg px-3 py-2 text-sm"
              />
              <button type="submit" className="bg-black text-white text-xs tracking-widest uppercase px-4 py-2 rounded-lg">
                Create API key
              </button>
            </form>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-[10px] uppercase tracking-wider text-black/40">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Name</th>
                    <th className="py-2 pr-3 font-medium">Plan</th>
                    <th className="py-2 pr-3 font-medium">Limit</th>
                    <th className="py-2 font-medium">Keys</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => (
                    <tr key={c.id} className="border-t border-black/5">
                      <td className="py-2 pr-3">
                        {c.name}
                        <div className="text-xs text-black/40">{c.email}</div>
                      </td>
                      <td className="py-2 pr-3 capitalize">{c.plan}</td>
                      <td className="py-2 pr-3 tabular-nums">{c.monthly_limit}/mo</td>
                      <td className="py-2 font-mono text-xs">
                        {apiKeys
                          .filter((k) => k.client_id === c.id)
                          .map((k) => (
                            <div key={k.id} className="flex items-center gap-2 mb-1">
                              <span>
                                {k.key_prefix}…{k.last_four} ({k.status})
                              </span>
                              {k.status === "active" ? (
                                <button
                                  type="button"
                                  className="underline text-[10px] uppercase tracking-wider"
                                  onClick={async () => {
                                    await fetch("/api/dashboard/material-api-clients", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ action: "revoke", keyId: k.id }),
                                    });
                                    await load();
                                  }}
                                >
                                  Revoke
                                </button>
                              ) : null}
                            </div>
                          ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!clients.length ? <p className="text-sm text-black/45 mt-3">No API clients yet.</p> : null}
            </div>
            {leads.length ? (
              <div className="mt-6">
                <p className="text-[10px] uppercase tracking-wider text-black/40 mb-2">Snapshot leads</p>
                <ul className="text-sm space-y-1">
                  {leads.slice(0, 12).map((lead) => (
                    <li key={lead.id}>
                      {lead.company} · {lead.intent} · {lead.email}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </HqCard>
        </>
      ) : null}
    </div>
  );
}
