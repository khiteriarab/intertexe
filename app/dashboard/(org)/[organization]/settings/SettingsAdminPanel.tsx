"use client";

import { useEffect, useState } from "react";
import { planDisplayName } from "../../../../../lib/enterprise/pricing";
import { entButtonClass, entButtonGhostClass } from "../../../components/EnterpriseUi";

type Security = {
  mfa_required?: boolean;
  session_timeout_minutes?: number;
};

type Billing = {
  plan?: string;
  canPublish?: boolean;
  publishBlockReason?: string;
  publishedPassportCount?: number;
  paddleCheckoutAvailable?: boolean;
  upgradePriceId?: string | null;
  billingAccount?: { paddle_subscription_id?: string | null; invoice_status?: string | null };
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
  const [checkoutBusy, setCheckoutBusy] = useState(false);

  async function startPaddleCheckout() {
    setCheckoutBusy(true);
    try {
      const res = await fetch(`/api/dashboard/org/${slug}/billing/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: billing.upgradePriceId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Checkout failed");
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setCheckoutBusy(false);
    }
  }

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
        {billing.plan ? (
          <p className="text-xs text-[var(--ent-muted)] mb-3 uppercase tracking-wider">
            Plan · {planDisplayName(billing.plan)}
          </p>
        ) : null}
        {billing.meters?.length ? (
          <ul className="space-y-2 text-sm">
            {billing.meters.map((meter) => (
              <li key={meter.key} className="flex justify-between gap-4">
                <span>{meter.key.replaceAll("_", " ")}</span>
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
        {billing.publishBlockReason ? (
          <p className="text-xs text-amber-800 mt-4 leading-relaxed">{billing.publishBlockReason}</p>
        ) : billing.canPublish ? (
          <p className="text-xs text-emerald-700 mt-4">Passport publishing is available on this plan.</p>
        ) : null}
        {billing.paddleCheckoutAvailable && billing.plan === "free_snapshot" ? (
          <button
            type="button"
            className={`${entButtonClass} mt-4`}
            disabled={checkoutBusy}
            onClick={startPaddleCheckout}
            data-testid="btn-paddle-upgrade"
          >
            {checkoutBusy ? "Opening checkout…" : "Upgrade with Paddle"}
          </button>
        ) : billing.billingAccount?.paddle_subscription_id ? (
          <p className="text-xs text-[var(--ent-muted)] mt-4">
            Paddle subscription active
            {billing.billingAccount.invoice_status ? ` · ${billing.billingAccount.invoice_status}` : ""}.
          </p>
        ) : null}
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
