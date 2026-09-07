"use client";

import { FormEvent, useEffect, useState } from "react";
import { formatOperatorTime } from "../../../../../lib/enterprise/reviewer-display";
import { entButtonClass, entButtonGhostClass, entInputClass } from "../../../components/EnterpriseUi";

type Credential = {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  last_used_at: string | null;
};

type Webhook = {
  id: string;
  url: string;
  label: string | null;
  events: string[] | null;
  active: boolean;
  last_success_at: string | null;
  last_failure_at: string | null;
  created_at: string;
};

export function DevelopersClient({ slug, canManage }: { slug: string; canManage: boolean }) {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [keyName, setKeyName] = useState("Production API key");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    const res = await fetch(`/api/dashboard/org/${slug}/developers/credentials`);
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setMessage(data.message || "Could not load developer settings.");
      return;
    }
    setCredentials(data.credentials || []);
    setWebhooks(data.webhooks || []);
  }

  useEffect(() => {
    if (canManage) void refresh();
    else setLoading(false);
  }, [canManage, slug]);

  async function createKey(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    setCreatedSecret(null);
    const res = await fetch(`/api/dashboard/org/${slug}/developers/credentials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "api_key", name: keyName }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.message || "Could not create API key.");
      return;
    }
    setCreatedSecret(data.secret || data.token || null);
    await refresh();
  }

  async function createWebhook(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    const res = await fetch(`/api/dashboard/org/${slug}/developers/credentials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "webhook", url: webhookUrl, label: "Primary webhook" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.message || "Could not create webhook.");
      return;
    }
    setCreatedSecret(data.secret || null);
    setWebhookUrl("");
    await refresh();
  }

  async function revoke(kind: "api_key" | "webhook", id: string) {
    if (!window.confirm("Revoke this credential?")) return;
    await fetch(`/api/dashboard/org/${slug}/developers/credentials?kind=${kind}&id=${id}`, {
      method: "DELETE",
    });
    await refresh();
  }

  if (!canManage) {
    return (
      <p className="text-sm text-[var(--ent-muted)]">
        API credential management requires an owner, admin, or developer role.
      </p>
    );
  }

  if (loading) return <p className="text-sm text-[var(--ent-muted)]">Loading credentials…</p>;

  return (
    <div className="space-y-6">
      {createdSecret ? (
        <div className="rounded-xl border border-[var(--ent-petrol)]/30 bg-[var(--ent-surface-muted)] p-4">
          <p className="text-sm font-medium">Copy this secret now — it will not be shown again.</p>
          <code className="block mt-2 text-xs break-all">{createdSecret}</code>
        </div>
      ) : null}
      {message ? <p className="text-sm text-[var(--ent-raspberry)]">{message}</p> : null}

      <div>
        <h4 className="text-sm font-semibold mb-3">API keys</h4>
        {credentials.length === 0 ? (
          <p className="text-sm text-[var(--ent-muted)] mb-3">No API credentials yet.</p>
        ) : (
          <ul className="space-y-3 mb-4">
            {credentials.map((cred) => (
              <li key={cred.id} className="ent-panel-nested px-5 py-4 flex justify-between gap-4">
                <div>
                  <p className="font-medium text-[var(--ent-ink)]">{cred.name}</p>
                  <p className="font-mono text-xs text-[var(--ent-muted)] mt-2">Prefix {cred.prefix}···</p>
                  <p className="text-sm text-[var(--ent-muted-light)] mt-2">
                    Created {formatOperatorTime(cred.created_at)}
                    {cred.last_used_at ? ` · Last used ${formatOperatorTime(cred.last_used_at)}` : ""}
                  </p>
                </div>
                <button type="button" className={entButtonGhostClass} onClick={() => revoke("api_key", cred.id)}>
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={createKey} className="flex flex-wrap gap-2">
          <input value={keyName} onChange={(e) => setKeyName(e.target.value)} className={entInputClass} />
          <button type="submit" className={entButtonClass}>
            Create API key
          </button>
        </form>
      </div>

      <div>
        <h4 className="text-sm font-semibold mb-3">Webhooks</h4>
        {webhooks.length === 0 ? (
          <p className="text-sm text-[var(--ent-muted)] mb-3">No webhooks configured.</p>
        ) : (
          <ul className="space-y-3 mb-4">
            {webhooks.map((hook) => (
              <li key={hook.id} className="ent-panel-nested px-5 py-4 flex justify-between gap-4">
                <div>
                  <p className="font-medium text-[var(--ent-ink)]">{hook.label || hook.url}</p>
                  <p className="text-xs text-[var(--ent-muted)] mt-1 break-all">{hook.url}</p>
                  <p className="text-xs text-[var(--ent-muted-light)] mt-2">
                    {hook.last_success_at
                      ? `Last success ${formatOperatorTime(hook.last_success_at)}`
                      : "Not delivered yet"}
                  </p>
                </div>
                <button type="button" className={entButtonGhostClass} onClick={() => revoke("webhook", hook.id)}>
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={createWebhook} className="flex flex-wrap gap-2">
          <input
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://example.com/webhooks/intertexe"
            className={`${entInputClass} min-w-[16rem] flex-1`}
          />
          <button type="submit" className={entButtonClass} disabled={!webhookUrl.trim()}>
            Add webhook
          </button>
        </form>
      </div>
    </div>
  );
}
