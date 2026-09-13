"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  commercialStatusLabel,
  type CommercialAccountStatus,
} from "../../../lib/enterprise/account-status";
import { orgUpgradeUrl } from "../../../lib/enterprise/org-routes";
import { planDisplayName } from "../../../lib/enterprise/pricing";
import { entButtonClass, entButtonGhostClass } from "./EnterpriseUi";

type BillingMeter = { key: string; used: number; limit: number | null; overLimit?: boolean };

type BillingPayload = {
  plan?: string;
  planLabel?: string;
  billingStatus?: string;
  billingProvider?: string | null;
  renewalDate?: string | null;
  cancelAtPeriodEnd?: boolean;
  gracePeriodUntil?: string | null;
  overLimitProducts?: boolean;
  overLimitPassports?: boolean;
  canPublish?: boolean;
  publishBlockReason?: string;
  paddleCheckoutAvailable?: boolean;
  canAdmin?: boolean;
  commercialStatus?: CommercialAccountStatus;
  billingAccount?: { paddle_subscription_id?: string | null; paddle_customer_id?: string | null };
  meters?: BillingMeter[];
};

function meterLabel(key: string): string {
  if (key === "products") return "Products";
  if (key === "hosted_passports") return "Hosted passports";
  return key.replaceAll("_", " ");
}

export function OrgBillingPanel({ slug }: { slug: string }) {
  const [billing, setBilling] = useState<BillingPayload>({});
  const [loading, setLoading] = useState(true);
  const [portalBusy, setPortalBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/dashboard/org/${slug}/billing`);
    const data = (await res.json().catch(() => ({}))) as BillingPayload & { message?: string };
    setLoading(false);
    if (!res.ok) {
      setError(data.message || "Could not load billing.");
      return;
    }
    setBilling(data);
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openPortal() {
    setPortalBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/org/${slug}/billing/portal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not open customer portal.");
      if (data.portalUrl) window.location.href = data.portalUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open customer portal.");
    } finally {
      setPortalBusy(false);
    }
  }

  if (loading) return <p className="text-sm text-[var(--ent-muted)]">Loading plan & usage…</p>;
  if (error && !billing.plan) return <p className="text-sm text-[var(--ent-muted)]">{error}</p>;

  const canAdmin = Boolean(billing.canAdmin);
  const showUpgrade =
    billing.commercialStatus === "pilot" ||
    billing.commercialStatus === "past_due" ||
    billing.overLimitProducts ||
    billing.overLimitPassports;

  return (
    <div className="space-y-8">
      <section className="ent-panel-nested p-6 md:p-8">
        <p className="ent-section-eyebrow">Current plan</p>
        <h2 className="ent-serif text-[1.75rem] text-[var(--ent-ink)] mt-2">
          {billing.planLabel || planDisplayName(billing.plan || "demo")}
        </h2>
        <p className="text-xs text-[var(--ent-muted)] mt-2 uppercase tracking-wider">
          {billing.commercialStatus ? commercialStatusLabel(billing.commercialStatus) : "Workspace"}
          {billing.billingStatus ? ` · ${billing.billingStatus}` : ""}
          {billing.billingProvider ? ` · ${billing.billingProvider}` : ""}
        </p>
        {billing.renewalDate ? (
          <p className="text-sm text-[var(--ent-muted)] mt-2">Next renewal · {billing.renewalDate}</p>
        ) : null}
        {billing.cancelAtPeriodEnd ? (
          <p className="text-sm text-amber-800 mt-2">Cancellation scheduled at period end</p>
        ) : null}
        {billing.gracePeriodUntil ? (
          <p className="text-sm text-amber-800 mt-2">Grace period until {billing.gracePeriodUntil.slice(0, 10)}</p>
        ) : null}
        {!canAdmin ? (
          <p className="text-xs text-[var(--ent-muted-light)] mt-4">
            Usage is visible to all members. Billing changes require a workspace owner or admin.
          </p>
        ) : null}
      </section>

      <section className="ent-panel-nested p-6 md:p-8">
        <p className="ent-section-eyebrow">Usage this period</p>
        {billing.meters?.length ? (
          <ul className="space-y-4 mt-4">
            {billing.meters.map((meter) => (
              <li key={meter.key}>
                <div className="flex justify-between gap-4 text-sm mb-1.5">
                  <span className="text-[var(--ent-ink-soft)]">{meterLabel(meter.key)}</span>
                  <span className={meter.overLimit ? "text-amber-800 font-medium" : "text-[var(--ent-muted)]"}>
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
          <p className="text-sm text-[var(--ent-muted)] mt-4">No usage recorded this period.</p>
        )}

        {billing.publishBlockReason ? (
          <p className="text-sm text-amber-800 mt-5 leading-relaxed">{billing.publishBlockReason}</p>
        ) : billing.canPublish ? (
          <p className="text-sm text-emerald-700 mt-5">Passport publishing available on this plan.</p>
        ) : null}
      </section>

      {(showUpgrade || canAdmin) && (
        <section className="flex flex-wrap gap-3">
          {showUpgrade && canAdmin ? (
            <Link href={orgUpgradeUrl(slug)} className={entButtonClass}>
              View plans & upgrade
            </Link>
          ) : showUpgrade ? (
            <p className="text-sm text-[var(--ent-muted)]">
              Ask your workspace owner to upgrade when you need more catalog capacity.
            </p>
          ) : null}
          {canAdmin && billing.billingAccount?.paddle_customer_id ? (
            <button type="button" className={entButtonGhostClass} disabled={portalBusy} onClick={() => void openPortal()}>
              {portalBusy ? "Opening…" : "Manage subscription"}
            </button>
          ) : null}
        </section>
      )}

      {error ? <p className="text-sm text-amber-800">{error}</p> : null}
    </div>
  );
}
