"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  PRICING_MODULES,
  estimateModules,
  formatEur,
  type PricingModuleKey,
} from "../../../lib/enterprise/pricing-modules";
import { SERIF } from "../platform-ui";

export function PricingModuleSelector({ checkoutEnabled }: { checkoutEnabled: boolean }) {
  const [selected, setSelected] = useState<PricingModuleKey[]>(["product_intelligence"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const estimate = useMemo(() => estimateModules(selected), [selected]);
  const selectedModules = PRICING_MODULES.filter((m) => selected.includes(m.key));

  const toggle = (key: PricingModuleKey) => {
    setError("");
    setSelected((current) =>
      current.includes(key) ? current.filter((k) => k !== key) : [...current, key],
    );
  };

  const proposalHref = `/platform/request?intent=saas&cta=pricing_modules${
    selected.length ? `&modules=${selected.join(",")}` : ""
  }`;

  const canCheckout = checkoutEnabled && selected.length > 0 && !estimate.requiresProposal;

  const startCheckout = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/platform/pricing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modules: selected }),
      });
      const json = (await res.json()) as { checkoutUrl?: string; message?: string };
      if (!res.ok || !json.checkoutUrl) {
        setError(json.message || "Checkout is unavailable right now.");
        return;
      }
      window.location.href = json.checkoutUrl;
    } catch {
      setError("Could not reach checkout. Request a proposal instead.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pricing-config">
      <ul className="pricing-config-list">
        {PRICING_MODULES.map((mod) => {
          const isSelected = selected.includes(mod.key);
          return (
            <li key={mod.key}>
              <button
                type="button"
                role="checkbox"
                aria-checked={isSelected}
                className={`pricing-config-row ${isSelected ? "is-selected" : ""}`}
                onClick={() => toggle(mod.key)}
              >
                <span className="pricing-config-box" aria-hidden>
                  {isSelected ? "✓" : ""}
                </span>
                <span className="pricing-config-copy">
                  <span className="pricing-config-name">{mod.name}</span>
                  <span className="pricing-config-summary">{mod.summary}</span>
                </span>
                <span className="pricing-config-price">
                  {mod.startingEur === null ? (
                    <span className="pricing-config-custom">Custom</span>
                  ) : (
                    <>
                      <span className="pricing-config-price-prefix">Starting</span>{" "}
                      <strong>{formatEur(mod.startingEur)}</strong>
                      <span className="pricing-config-price-term"> / year</span>
                    </>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <aside className="pricing-config-summary-card" aria-live="polite">
        <p className="pricing-config-summary-kicker">Select modules to estimate pricing</p>
        <p className="pricing-config-total" style={SERIF}>
          {estimate.totalEur > 0 ? formatEur(estimate.totalEur) : "Custom"}
        </p>
        <p className="pricing-config-total-term">{estimate.totalEur > 0 ? "/ year" : "scoped in your proposal"}</p>
        <p className="pricing-config-count">
          {selected.length} {selected.length === 1 ? "module" : "modules"} selected
        </p>

        <dl className="pricing-config-lines">
          {selectedModules.map((mod) => (
            <div key={mod.key}>
              <dt>{mod.name}</dt>
              <dd>
                {mod.startingEur === null ? "Custom" : `Starting ${formatEur(mod.startingEur)} / year`}
              </dd>
            </div>
          ))}
        </dl>

        <p className="pricing-config-note">
          Starting prices cover priced modules only. Connected Product Lifecycle is scoped with you. Your written
          proposal also covers catalogue volume, reporting entities and supply-chain depth.
        </p>

        {error ? <p className="pricing-config-error">{error}</p> : null}

        {canCheckout ? (
          <button type="button" className="pricing-config-cta" onClick={startCheckout} disabled={busy}>
            {busy ? "Opening checkout…" : "Continue to checkout"}
            <span aria-hidden>→</span>
          </button>
        ) : null}

        <Link
          href={proposalHref}
          className={canCheckout ? "pricing-config-secondary" : "pricing-config-cta"}
        >
          Get custom proposal
          <span aria-hidden>→</span>
        </Link>
      </aside>
    </div>
  );
}
