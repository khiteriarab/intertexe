"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  PUBLIC_PRICING_PLANS,
  PRICING_FEATURE_GROUPS,
  PRICING_FAQ,
  PRICING_BILLING_POINTS,
  PRICING_IMPLEMENTATION_STAGES,
  cellDisplay,
  formatImplementation,
  formatMonthlyPrice,
  formatUsd,
  formatEurEstimate,
  rowDiffers,
  type PublicPlanId,
} from "../../../lib/enterprise-marketing/saas-pricing";
import { marketingPath } from "../../../lib/enterprise-marketing/paths";
import { Body, Eyebrow, Heading, PrimaryLink, SecondaryLink, SERIF } from "../platform-ui";

type Currency = "USD" | "EUR";

const PLAN_ORDER: PublicPlanId[] = ["foundation", "intelligence", "enterprise"];

export function PricingExperience() {
  const [currency, setCurrency] = useState<Currency>("USD");
  const [diffOnly, setDiffOnly] = useState(false);
  const [mobilePlan, setMobilePlan] = useState<PublicPlanId>("intelligence");

  return (
    <div className="saas-pricing">
      <section className="saas-pricing-hero">
        <div className="platform-lux-wrap">
          <div className="saas-pricing-hero-copy">
            <Eyebrow>Pricing</Eyebrow>
            <Heading className="mb-4">Plans for product intelligence at every stage.</Heading>
            <Body className="mb-0">
              Monthly USD subscription with a clear commitment and one-time implementation. EUR figures are
              approximate references only.
            </Body>
          </div>

          <div className="saas-pricing-currency" role="group" aria-label="Display currency">
            <button
              type="button"
              className={currency === "USD" ? "is-active" : undefined}
              aria-pressed={currency === "USD"}
              onClick={() => setCurrency("USD")}
            >
              USD
            </button>
            <button
              type="button"
              className={currency === "EUR" ? "is-active" : undefined}
              aria-pressed={currency === "EUR"}
              onClick={() => setCurrency("EUR")}
            >
              EUR est.
            </button>
          </div>
        </div>
      </section>

      <section className="saas-pricing-plans" aria-label="Plan tiers">
        <div className="platform-lux-wrap">
          <div className="saas-pricing-cards">
            {PUBLIC_PRICING_PLANS.map((plan) => (
              <article
                key={plan.id}
                className={`saas-pricing-card${plan.featured ? " is-featured" : ""}`}
              >
                {plan.featured ? <p className="saas-pricing-card-badge">Most chosen</p> : null}
                <h3 className="saas-pricing-card-name" style={SERIF}>
                  {plan.name}
                </h3>
                <p className="saas-pricing-card-desc">{plan.description}</p>
                <p className="saas-pricing-card-price">
                  {formatMonthlyPrice(plan, currency)}
                  {plan.monthlyUSD != null && currency === "EUR" ? (
                    <span className="saas-pricing-card-price-note"> approx.</span>
                  ) : null}
                </p>
                <p className="saas-pricing-card-meta">
                  {plan.commitmentMonths}-month commitment · {formatImplementation(plan, currency)}
                </p>
                <p className="saas-pricing-card-ideal">{plan.idealCustomer}</p>
                <ul className="saas-pricing-card-highlights">
                  {plan.highlights.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <Link href={plan.cta.href} className="saas-pricing-card-cta">
                  {plan.cta.label}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="saas-pricing-impl" aria-labelledby="pricing-impl-heading">
        <div className="platform-lux-wrap">
          <div className="saas-pricing-section-head">
            <Eyebrow>Implementation</Eyebrow>
            <Heading id="pricing-impl-heading" className="mb-4">
              Implementation that gets your data ready to work.
            </Heading>
            <Body className="mb-0">
              The fee is professional services — migration, configuration, and launch — not a random setup
              charge for an empty workspace.
            </Body>
          </div>

          <ol className="saas-pricing-stages">
            {PRICING_IMPLEMENTATION_STAGES.map((stage) => (
              <li key={stage.step}>
                <span className="saas-pricing-stage-num">{stage.step}</span>
                <div>
                  <h3 className="saas-pricing-stage-title">{stage.title}</h3>
                  <p className="saas-pricing-stage-copy">{stage.copy}</p>
                </div>
              </li>
            ))}
          </ol>

          <ul className="saas-pricing-impl-fees">
            {PUBLIC_PRICING_PLANS.map((plan) => (
              <li key={plan.id}>
                <span className="saas-pricing-impl-name">{plan.name} implementation</span>
                <span className="saas-pricing-impl-fee">
                  {plan.id === "enterprise"
                    ? currency === "EUR"
                      ? `custom, typically from ${formatEurEstimate(plan.implementationFromUSD ?? 5_000)}`
                      : "custom, typically from $5,000"
                    : formatImplementation(plan, currency).replace(" one-time", "")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="saas-pricing-compare" aria-labelledby="pricing-compare-heading">
        <div className="platform-lux-wrap">
          <div className="saas-pricing-section-head saas-pricing-compare-head">
            <div>
              <Eyebrow>Compare</Eyebrow>
              <Heading id="pricing-compare-heading" className="mb-4">
                What differs by plan.
              </Heading>
              <Body className="mb-0">
                Full capability matrix. On smaller screens, pick a plan and read capabilities vertically.
              </Body>
            </div>
            <label className="saas-pricing-diff-toggle">
              <input
                type="checkbox"
                checked={diffOnly}
                onChange={(e) => setDiffOnly(e.target.checked)}
              />
              Show differences only
            </label>
          </div>

          <div
            className="saas-pricing-plan-tabs"
            role="tablist"
            aria-label="Select a plan to compare"
          >
            {PLAN_ORDER.map((id) => {
              const plan = PUBLIC_PRICING_PLANS.find((p) => p.id === id)!;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  id={`pricing-tab-${id}`}
                  aria-selected={mobilePlan === id}
                  aria-controls={`pricing-panel-${id}`}
                  className={mobilePlan === id ? "is-active" : undefined}
                  onClick={() => setMobilePlan(id)}
                >
                  {plan.name}
                </button>
              );
            })}
          </div>

          <div
            className="saas-pricing-mobile-panel"
            role="tabpanel"
            id={`pricing-panel-${mobilePlan}`}
            aria-labelledby={`pricing-tab-${mobilePlan}`}
          >
            {PRICING_FEATURE_GROUPS.map((group) => {
              const rows = diffOnly ? group.rows.filter(rowDiffers) : group.rows;
              if (rows.length === 0) return null;
              return (
                <div key={group.id} className="saas-pricing-mobile-group">
                  <h4>{group.label}</h4>
                  <ul>
                    {rows.map((row) => (
                      <li
                        key={row.id}
                        className={
                          row.values[mobilePlan] === "unavailable" ? "is-unavailable" : undefined
                        }
                      >
                        <span className="saas-pricing-mobile-label">
                          {row.label}
                          {row.tooltip ? (
                            <span className="saas-pricing-tooltip" title={row.tooltip}>
                              i
                            </span>
                          ) : null}
                        </span>
                        <span className="saas-pricing-mobile-value">
                          {cellDisplay(row.values[mobilePlan])}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <div className="saas-pricing-table-wrap">
            <table className="saas-pricing-table">
              <thead>
                <tr>
                  <th scope="col">Capability</th>
                  {PLAN_ORDER.map((id) => {
                    const plan = PUBLIC_PRICING_PLANS.find((p) => p.id === id)!;
                    return (
                      <th key={id} scope="col">
                        {plan.name}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {PRICING_FEATURE_GROUPS.map((group) => {
                  const rows = diffOnly ? group.rows.filter(rowDiffers) : group.rows;
                  if (rows.length === 0) return null;
                  return (
                    <FragmentGroup key={group.id} label={group.label}>
                      {rows.map((row) => (
                        <tr key={row.id}>
                          <th scope="row">
                            <span>{row.label}</span>
                            {row.tooltip ? (
                              <span className="saas-pricing-tooltip" title={row.tooltip}>
                                i
                              </span>
                            ) : null}
                          </th>
                          {PLAN_ORDER.map((id) => (
                            <td
                              key={id}
                              data-value={row.values[id]}
                              className={
                                row.values[id] === "unavailable" ? "is-unavailable" : undefined
                              }
                            >
                              {cellDisplay(row.values[id])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </FragmentGroup>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="saas-pricing-billing" aria-labelledby="pricing-billing-heading">
        <div className="platform-lux-wrap">
          <Eyebrow>Billing</Eyebrow>
          <Heading id="pricing-billing-heading" className="mb-4">
            How billing works.
          </Heading>
          <div className="saas-pricing-billing-grid">
            {PRICING_BILLING_POINTS.map((point) => (
              <article key={point.title}>
                <h3>{point.title}</h3>
                <p>
                  {point.title === "USD pricing" && currency === "EUR"
                    ? `${point.copy} Example: ${formatUsd(499)} ≈ ${formatEurEstimate(499)}/mo.`
                    : point.copy}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="saas-pricing-faq" aria-labelledby="pricing-faq-heading">
        <div className="platform-lux-wrap saas-pricing-faq-grid">
          <div>
            <Eyebrow>FAQ</Eyebrow>
            <Heading id="pricing-faq-heading" className="mb-4">
              Questions procurement actually asks.
            </Heading>
            <Body className="mb-0">
              Commitment, allowances, currency, and integrations — answered without inventing checkout
              behaviour.
            </Body>
          </div>
          <div>
            {PRICING_FAQ.map((item) => (
              <details key={item.q} name="saas-pricing-faq" className="saas-pricing-faq-row">
                <summary>
                  <span>{item.q}</span>
                  <span aria-hidden>+</span>
                </summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="saas-pricing-close">
        <div className="platform-lux-wrap saas-pricing-close-inner">
          <Heading className="mb-4">Ready to choose a path?</Heading>
          <Body className="mb-8">
            Tell us which tier fits. We will confirm scope, implementation, and next steps — no self-serve
            checkout on this page.
          </Body>
          <div className="saas-pricing-close-actions">
            <PrimaryLink href={marketingPath("request?intent=saas&cta=pricing_close")}>
              Talk to INTERTEXE
            </PrimaryLink>
            <SecondaryLink href={marketingPath("demo")}>See it live</SecondaryLink>
          </div>
        </div>
      </section>
    </div>
  );
}

function FragmentGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <>
      <tr className="saas-pricing-group-row">
        <th scope="colgroup" colSpan={4}>
          {label}
        </th>
      </tr>
      {children}
    </>
  );
}
