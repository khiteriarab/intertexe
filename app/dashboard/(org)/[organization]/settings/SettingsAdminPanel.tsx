"use client";

import { useEffect, useState } from "react";
import { entButtonClass, entButtonGhostClass } from "../../../components/EnterpriseUi";

type Security = {
  mfa_required?: boolean;
  session_timeout_minutes?: number;
};

type Billing = {
  periodStart?: string;
  periodEnd?: string;
  meters?: Array<{ key: string; used: number; limit: number | null }>;
};

type ScimStatus = {
  enabled: boolean;
  endpoint?: string | null;
  tokenHint?: string | null;
};

export function SettingsAdminPanel({ slug, canAdmin }: { slug: string; canAdmin: boolean }) {
  const [security, setSecurity] = useState<Security>({});
  const [billing, setBilling] = useState<Billing>({});
  const [scim, setScim] = useState<ScimStatus>({ enabled: false });
  const [scimToken, setScimToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [secRes, billRes, scimRes] = await Promise.all([
      fetch(`/api/dashboard/org/${slug}/admin?section=security`),
      fetch(`/api/dashboard/org/${slug}/admin?section=billing`),
      fetch(`/api/dashboard/org/${slug}/admin?section=scim`),
    ]);
    const sec = await secRes.json().catch(() => ({}));
    const bill = await billRes.json().catch(() => ({}));
    const sc = await scimRes.json().catch(() => ({}));
    setLoading(false);
    if (secRes.ok) setSecurity(sec.security || {});
    if (billRes.ok) setBilling(bill);
    if (scimRes.ok) setScim(sc.scim || { enabled: false });
  }

  useEffect(() => {
    if (canAdmin) void load();
    else setLoading(false);
  }, [canAdmin, slug]);

  async function saveSecurity(patch: Security) {
    await fetch(`/api/dashboard/org/${slug}/admin`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "security", patch }),
    });
    await load();
  }

  async function toggleScim(enable: boolean) {
    const res = await fetch(`/api/dashboard/org/${slug}/admin`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "scim", action: enable ? "enable" : "disable" }),
    });
    const data = await res.json().catch(() => ({}));
    if (enable && data.token) setScimToken(data.token);
    await load();
  }

  if (!canAdmin) return null;
  if (loading) return <p className="text-sm text-[var(--ent-muted)]">Loading admin settings…</p>;

  return (
    <div className="grid lg:grid-cols-2 gap-6 mt-6">
      <section className="rounded-xl border border-[var(--ent-border)] p-5">
        <h3 className="text-sm font-semibold mb-3">Security</h3>
        <label className="flex items-center gap-2 text-sm mb-3">
          <input
            type="checkbox"
            checked={Boolean(security.mfa_required)}
            onChange={(e) => saveSecurity({ ...security, mfa_required: e.target.checked })}
          />
          Require MFA for organization members
        </label>
        <p className="text-xs text-[var(--ent-muted-light)]">
          Session timeout: {security.session_timeout_minutes || 720} minutes
        </p>
      </section>

      <section className="rounded-xl border border-[var(--ent-border)] p-5">
        <h3 className="text-sm font-semibold mb-3">Usage & billing</h3>
        {billing.meters?.length ? (
          <ul className="space-y-2 text-sm">
            {billing.meters.map((meter) => (
              <li key={meter.key} className="flex justify-between gap-4">
                <span>{meter.key}</span>
                <span className="text-[var(--ent-muted)]">
                  {meter.used}
                  {meter.limit != null ? ` / ${meter.limit}` : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--ent-muted)]">No usage meters recorded this period.</p>
        )}
      </section>

      <section className="rounded-xl border border-[var(--ent-border)] p-5 lg:col-span-2">
        <h3 className="text-sm font-semibold mb-3">SCIM provisioning</h3>
        <p className="text-sm text-[var(--ent-muted)] mb-3">
          {scim.enabled ? "SCIM is enabled for this organization." : "SCIM is not enabled."}
        </p>
        {scimToken ? (
          <div className="mb-3 rounded-lg bg-[var(--ent-surface-muted)] p-3 text-xs break-all">
            Bearer token (copy now): {scimToken}
          </div>
        ) : null}
        <div className="flex gap-2">
          {!scim.enabled ? (
            <button type="button" className={entButtonClass} onClick={() => toggleScim(true)}>
              Enable SCIM
            </button>
          ) : (
            <button type="button" className={entButtonGhostClass} onClick={() => toggleScim(false)}>
              Disable SCIM
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
