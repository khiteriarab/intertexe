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
  planLabel?: string;
  billingStatus?: string;
  billingProvider?: string | null;
  gracePeriodUntil?: string | null;
  renewalDate?: string | null;
  cancelAtPeriodEnd?: boolean;
  overLimitProducts?: boolean;
  overLimitPassports?: boolean;
  canPublish?: boolean;
  publishBlockReason?: string;
  paddleCheckoutAvailable?: boolean;
  checkoutPrices?: {
    subscriptionPriceId: string | null;
    implementationPriceId: string | null;
  };
  billingAccount?: {
    paddle_subscription_id?: string | null;
    invoice_status?: string | null;
    billing_status?: string | null;
  };
  meters?: Array<{ key: string; used: number; limit: number | null; overLimit?: boolean }>;
};

type ScimStatus = {
  enabled: boolean;
  endpoint?: string | null;
  tokenHint?: string | null;
};

function meterLabel(key: string): string {
  if (key === "products") return "Products";
  if (key === "hosted_passports") return "Hosted passports";
  return key.replaceAll("_", " ");
}

export function SettingsAdminPanel({ slug, canAdmin }: { slug: string; canAdmin: boolean }) {
  const [security, setSecurity] = useState<Security>({});
  const [billing, setBilling] = useState<Billing>({});
  const [scim, setScim] = useState<ScimStatus>({ enabled: false });
  const [scimToken, setScimToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutBusy, setCheckoutBusy] = useState<string | null>(null);

  async function startPaddleCheckout(plan: "platform" | "professional" | "implementation") {
    setCheckoutBusy(plan);
    try {
      const priceId =
        plan === "platform"
          ? billing.checkoutPrices?.subscriptionPriceId
          : plan === "professional"
            ? billing.checkoutPrices?.subscriptionPriceId
            : billing.checkoutPrices?.implementationPriceId;
      const res = await fetch(`/api/dashboard/org/${slug}/billing/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, priceId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Checkout failed");
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setCheckoutBusy(null);
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

  const showCheckout =
    billing.paddleCheckoutAvailable &&
    (billing.plan === "demo" ||
      billing.plan === "free_snapshot" ||
      billing.plan === "platform" ||
      billing.plan === "founding_pilot");

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
        <h3 className="text-sm font-semibold mb-1">Billing & plan</h3>
        <p className="text-xs text-[var(--ent-muted)] mb-4">Owner/admin only · entitlements managed in INTERTEXE</p>

        {billing.plan ? (
          <div className="mb-4">
            <p className="text-lg font-semibold text-[var(--ent-ink)]">
              {billing.planLabel || planDisplayName(billing.plan)}
            </p>
            <p className="text-xs text-[var(--ent-muted)] mt-1 uppercase tracking-wider">
              Status · {billing.billingStatus || "none"}
              {billing.billingProvider ? ` · ${billing.billingProvider}` : ""}
            </p>
            {billing.renewalDate ? (
              <p className="text-xs text-[var(--ent-muted)] mt-1">Next renewal · {billing.renewalDate}</p>
            ) : null}
            {billing.cancelAtPeriodEnd ? (
              <p className="text-xs text-amber-800 mt-1">Cancellation scheduled at period end</p>
            ) : null}
            {billing.gracePeriodUntil ? (
              <p className="text-xs text-amber-800 mt-1">Grace period until {billing.gracePeriodUntil.slice(0, 10)}</p>
            ) : null}
          </div>
        ) : null}

        {billing.meters?.length ? (
          <ul className="space-y-3 text-sm border-t border-[var(--ent-border)] pt-4">
            {billing.meters.map((meter) => (
              <li key={meter.key}>
                <div className="flex justify-between gap-4 mb-1">
                  <span>{meterLabel(meter.key)}</span>
                  <span className={meter.overLimit ? "text-amber-800" : "text-[var(--ent-muted)]"}>
                    {meter.used}
                    {meter.limit != null ? ` / ${meter.limit}` : ""}
                  </span>
                </div>
                {meter.limit != null ? (
                  <div className="h-1.5 rounded-full bg-[var(--ent-surface-muted)] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${meter.overLimit ? "bg-amber-600" : "bg-[var(--ent-charcoal)]"}`}
                      style={{ width: `${Math.min(100, (meter.used / meter.limit) * 100)}%` }}
                    />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--ent-muted)]">No usage recorded this period.</p>
        )}

        {billing.overLimitProducts || billing.overLimitPassports ? (
          <p className="text-xs text-amber-800 mt-4 leading-relaxed">
            Usage exceeds current plan limits. Existing records are preserved — reduce usage or contact INTERTEXE to
            upgrade.
          </p>
        ) : null}

        {billing.publishBlockReason ? (
          <p className="text-xs text-amber-800 mt-4 leading-relaxed">{billing.publishBlockReason}</p>
        ) : billing.canPublish ? (
          <p className="text-xs text-emerald-700 mt-4">Passport publishing available on this plan.</p>
        ) : null}

        {showCheckout ? (
          <div className="flex flex-wrap gap-2 mt-4">
            {(billing.plan === "demo" || billing.plan === "free_snapshot" || billing.plan === "founding_pilot") && (
              <>
                <button
                  type="button"
                  className={entButtonClass}
                  disabled={checkoutBusy !== null}
                  onClick={() => startPaddleCheckout("platform")}
                  data-testid="btn-paddle-platform"
                >
                  {checkoutBusy === "platform" ? "Opening…" : "Subscribe · Platform"}
                </button>
                <button
                  type="button"
                  className={entButtonGhostClass}
                  disabled={checkoutBusy !== null}
                  onClick={() => startPaddleCheckout("professional")}
                  data-testid="btn-paddle-professional"
                >
                  {checkoutBusy === "professional" ? "Opening…" : "Subscribe · Professional"}
                </button>
              </>
            )}
            <button
              type="button"
              className={entButtonGhostClass}
              disabled={checkoutBusy !== null}
              onClick={() => startPaddleCheckout("implementation")}
              data-testid="btn-paddle-implementation"
            >
              {checkoutBusy === "implementation" ? "Opening…" : "Implementation fee"}
            </button>
          </div>
        ) : billing.billingAccount?.paddle_subscription_id ? (
          <p className="text-xs text-[var(--ent-muted)] mt-4">
            Paddle subscription active
            {billing.billingAccount.invoice_status ? ` · ${billing.billingAccount.invoice_status}` : ""}. Manage payment
            method in Paddle customer portal when configured.
          </p>
        ) : billing.plan === "enterprise" ? (
          <p className="text-xs text-[var(--ent-muted)] mt-4">
            Enterprise contract · contact your INTERTEXE account team to adjust entitlements.
          </p>
        ) : null}

        <p className="text-xs text-[var(--ent-muted-light)] mt-4">
          Need Enterprise, custom limits, or invoice billing?{" "}
          <a href="/platform/request?intent=enterprise" className="underline">
            Contact sales
          </a>
        </p>
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
