import {
  ONBOARDING_FEE_LABEL,
  onboardingFeePriceLabel,
  SAAS_ARR_600K_MODEL,
  SAAS_TIERS,
} from "../../../lib/enterprise/pricing";

/** Shared tier comparison — HQ B2B page and enterprise org upsell panels. */
export function SaasPricingTiers({ showArrModel = false }: { showArrModel?: boolean }) {
  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-black/10 bg-[#faf8f5] p-5 sm:p-6">
        <p className="text-[10px] tracking-[0.16em] uppercase text-black/40">Onboarding</p>
        <p className="font-serif text-xl mt-2">{ONBOARDING_FEE_LABEL} · {onboardingFeePriceLabel()}</p>
        <p className="text-sm text-black/55 mt-2 leading-relaxed">
          Implementation and analysis — not a monthly subscription. 100 complex products or 500 structured rows,
          material intelligence, DPP prep, QR identities, and a finished data project (~10 business days).
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {SAAS_TIERS.map((tier) => (
          <article key={tier.key} className="rounded-xl border border-black/10 bg-white p-5 flex flex-col">
            <p className="text-[10px] tracking-[0.14em] uppercase text-black/40">{tier.name}</p>
            <p className="text-2xl font-light tabular-nums mt-2">{tier.priceLabel}</p>
            <p className="text-sm text-black/55 mt-2 leading-relaxed">{tier.headline}</p>
            <ul className="mt-4 space-y-2 text-sm text-black/65 flex-1">
              {tier.features.map((f) => (
                <li key={f}>· {f}</li>
              ))}
            </ul>
            {tier.notIncluded.length ? (
              <p className="text-[11px] text-black/40 mt-4 leading-relaxed">
                Not included: {tier.notIncluded.join(" · ")}
              </p>
            ) : null}
          </article>
        ))}
      </div>

      {showArrModel ? (
        <div className="rounded-xl border border-black/10 bg-white p-5">
          <p className="text-[10px] tracking-[0.14em] uppercase text-black/40">$600K SaaS ARR model</p>
          <p className="text-sm text-black/55 mt-2 leading-relaxed">
            Target ${SAAS_ARR_600K_MODEL.targetMrrUsd.toLocaleString("en-US")} MRR (
            ${SAAS_ARR_600K_MODEL.targetArrUsd.toLocaleString("en-US")} ARR) — roughly{" "}
            {SAAS_ARR_600K_MODEL.totalCustomers} customers, not hundreds:
          </p>
          <ul className="mt-3 space-y-1 text-sm tabular-nums">
            {SAAS_ARR_600K_MODEL.mix.map((row) => (
              <li key={row.tier}>
                {row.customers} {row.tier} × ${row.monthlyUsd}/mo = $
                {(row.customers * row.monthlyUsd).toLocaleString("en-US")}/mo
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-black/40 mt-3">{SAAS_ARR_600K_MODEL.note}</p>
        </div>
      ) : null}
    </div>
  );
}
