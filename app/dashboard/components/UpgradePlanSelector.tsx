"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ONBOARDING_FEE_LABEL,
  SAAS_TIERS,
  onboardingFeePriceLabel,
  planDisplayName,
  type SaasTierKey,
} from "../../../lib/enterprise/pricing";
import { entButtonClass, entButtonGhostClass } from "./EnterpriseUi";

type ActivatedPlan = "professional" | "platform" | null;

export function UpgradePlanSelector({
  slug,
  currentPlan,
  productCount,
  activated,
  paddleAvailable,
}: {
  slug: string;
  currentPlan: string;
  productCount: number;
  activated: ActivatedPlan;
  paddleAvailable: boolean;
}) {
  const [selected, setSelected] = useState<SaasTierKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tier = useMemo(
    () => (selected ? SAAS_TIERS.find((t) => t.key === selected) ?? null : null),
    [selected]
  );

  async function startCheckout(plan: SaasTierKey) {
    if (plan === "enterprise") return;
    setBusy(true);
    setError(null);
    try {
      const origin = window.location.origin;
      const res = await fetch(`/api/dashboard/org/${slug}/billing/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          includeImplementation: true,
          successUrl: `${origin}/dashboard/${slug}?activated=${plan}`,
          cancelUrl: `${origin}/dashboard/${slug}/upgrade?cancel=1`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Checkout failed");
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setBusy(false);
    }
  }

  if (activated) {
    const tierDef = SAAS_TIERS.find((t) => t.key === activated);
    return (
      <div className="ent-upgrade-confirmation">
        <p className="ent-section-eyebrow">Plan activated</p>
        <h2 className="ent-serif text-[2rem] text-[var(--ent-ink)] mt-2">
          {tierDef?.name ?? planDisplayName(activated)} activated
        </h2>
        <p className="text-sm text-[var(--ent-muted)] mt-3 max-w-xl leading-relaxed">
          Your workspace now supports up to {tierDef?.productAllowance?.toLocaleString("en-US") ?? "your contracted"}{" "}
          products. You currently have {productCount} in catalog.
        </p>
        <div className="flex flex-wrap gap-3 mt-8">
          <Link href={`/dashboard/${slug}/products?import=1`} className={entButtonClass}>
            Import products
          </Link>
          <Link href={`/dashboard/${slug}`} className={entButtonGhostClass}>
            Back to overview
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="ent-upgrade-intro">
        <p className="ent-section-eyebrow">Upgrade</p>
        <h1 className="ent-serif text-[2rem] md:text-[2.35rem] text-[var(--ent-ink)] leading-tight">
          Continue with a paid plan
        </h1>
        <p className="text-sm text-[var(--ent-muted)] mt-3 max-w-2xl leading-relaxed">
          You’ve seen INTERTEXE on your products. Choose Professional or Platform to expand beyond the 10-product pilot.
          Pricing is shown here only — not on the public website.
        </p>
        {currentPlan !== "professional" && currentPlan !== "platform" ? (
          <p className="text-xs text-[var(--ent-muted-light)] mt-2">
            Current workspace · {planDisplayName(currentPlan)}
          </p>
        ) : null}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {SAAS_TIERS.map((item) => {
          const isCurrent = item.key === currentPlan || (currentPlan === "saas" && item.key === "professional");
          const isSelected = selected === item.key;
          return (
            <article
              key={item.key}
              className={`ent-upgrade-tier ${isSelected ? "ent-upgrade-tier-selected" : ""} ${item.key === "platform" ? "ent-upgrade-tier-featured" : ""}`}
            >
              {item.key === "platform" ? (
                <p className="ent-upgrade-tier-badge">Most brands scale here</p>
              ) : (
                <p className="ent-upgrade-tier-badge ent-upgrade-tier-badge-spacer" aria-hidden />
              )}
              <div className="p-5 md:p-6 flex flex-col flex-1">
                <p className="text-[10px] tracking-[0.14em] uppercase text-[var(--ent-muted-light)]">{item.name}</p>
                <p className="ent-serif text-[1.75rem] text-[var(--ent-ink)] mt-2 tabular-nums">{item.priceLabel}</p>
                <p className="text-sm text-[var(--ent-muted)] mt-2 leading-relaxed">{item.headline}</p>
                <ul className="mt-4 space-y-2 text-sm text-[var(--ent-ink-soft)] flex-1">
                  {item.features.map((f) => (
                    <li key={f} className="leading-relaxed">
                      · {f}
                    </li>
                  ))}
                </ul>
                {item.notIncluded.length ? (
                  <p className="text-[11px] text-[var(--ent-muted-light)] mt-4 leading-relaxed">
                    {item.notIncluded.join(" · ")}
                  </p>
                ) : null}
                {item.key === "enterprise" ? (
                  <Link
                    href="/platform/request?intent=enterprise&cta=upgrade_enterprise"
                    className={`${entButtonGhostClass} w-full justify-center mt-6`}
                  >
                    Contact sales
                  </Link>
                ) : (
                  <button
                    type="button"
                    className={`${item.key === "platform" ? entButtonClass : entButtonGhostClass} w-full justify-center mt-6`}
                    disabled={isCurrent || busy || !paddleAvailable}
                    onClick={() => setSelected(item.key)}
                  >
                    {isCurrent ? "Current plan" : isSelected ? "Selected" : `Choose ${item.name}`}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {tier && tier.key !== "enterprise" ? (
        <div className="ent-upgrade-summary">
          <p className="ent-section-eyebrow mb-4">Order summary</p>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--ent-muted)]">{tier.name} subscription</dt>
              <dd className="font-medium tabular-nums text-[var(--ent-ink)]">{tier.priceLabel}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--ent-muted)]">{ONBOARDING_FEE_LABEL} (one-time)</dt>
              <dd className="font-medium tabular-nums text-[var(--ent-ink)]">{onboardingFeePriceLabel()}</dd>
            </div>
          </dl>
          <p className="text-xs text-[var(--ent-muted-light)] mt-4 leading-relaxed">
            Tax/VAT calculated at checkout by Paddle. Implementation is a one-time onboarding fee — not a recurring
            subscription tier. Entitlements unlock after Paddle confirms payment (webhook), not when the browser returns.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <button
              type="button"
              className={entButtonClass}
              disabled={busy || !paddleAvailable}
              onClick={() => startCheckout(tier.key)}
            >
              {busy ? "Opening secure checkout…" : `Continue to checkout · ${tier.name}`}
            </button>
            <button type="button" className={entButtonGhostClass} onClick={() => setSelected(null)} disabled={busy}>
              Change plan
            </button>
          </div>
          {error ? <p className="text-sm text-[var(--ent-raspberry)] mt-3">{error}</p> : null}
          {!paddleAvailable ? (
            <p className="text-sm text-[var(--ent-muted)] mt-3">
              Paddle checkout is not configured in this environment. Contact INTERTEXE to complete upgrade.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
