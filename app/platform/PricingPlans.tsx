import Link from "next/link";
import {
  FOUNDING_PILOT_PRICE_USD,
  PLATFORM_MONTHLY_USD,
  PROFESSIONAL_MONTHLY_USD,
  SAAS_TIERS,
} from "../../lib/enterprise/pricing";
import { Body, Eyebrow, Heading, SERIF } from "./platform-ui";

const ENTRY = [
  {
    step: "1. Try it",
    title: "Free 10-Product Material Snapshot",
    price: "€0",
    popular: false,
    copy: "See what INTERTEXE finds in your material data — inside a real workspace.",
    points: [
      "Material normalization & completeness score",
      "Issues register & DPP readiness overview",
      "Limited Material Benchmark preview",
      "10 products · preview QR after identity is provisioned",
    ],
    href: "/platform/request?intent=snapshot&cta=pricing_snapshot",
    cta: "Request my snapshot",
  },
  {
    step: "2. Prove it",
    title: "Founding Pilot",
    price: `$${FOUNDING_PILOT_PRICE_USD.toLocaleString("en-US")}`,
    popular: true,
    copy: "Implementation and onboarding — not a monthly subscription. Target ~10 business days.",
    points: [
      "100 complex products or 500 structured rows",
      "Material intelligence, normalization & human review",
      "Material Benchmark snapshot & DPP data preparation",
      "QR identities, passport generation & structured export",
      "50% to start · 50% on completion",
    ],
    href: "/platform/request?intent=founding_pilot&cta=pricing_pilot",
    cta: "Request the Founding Pilot",
  },
] as const;

const VALUES = [
  { title: "Infrastructure, not a tool", copy: "You pay for product intelligence and identity infrastructure — hosted, white-label, or via API.", icon: "shield" },
  { title: "Volume-aware", copy: "Plans include managed product and passport allowances that grow with your catalog.", icon: "lock" },
  { title: "Start with proof", copy: "Snapshot free, pilot proves value, then subscribe to operate at scale.", icon: "clock" },
  { title: "Built for fashion", copy: "Materials, compositions, and regulatory complexity — our focus.", icon: "people" },
] as const;

export function PricingPlans() {
  return (
    <section id="pricing" className="bg-[#f7f5f1] border-t border-[#e8e3da] pt-10 sm:pt-16 md:pt-24 pb-2">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="grid lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)] gap-8 lg:gap-12 mb-12 sm:mb-16 items-start">
          <div>
            <Eyebrow>Try it · Prove it · Run it</Eyebrow>
            <Heading className="mb-4">Product intelligence infrastructure — priced for how you consume it.</Heading>
            <Body className="max-w-xl">
              A brand pays INTERTEXE to operate the intelligence and identity layer behind its products — through our
              hosted experience, a white-label passport, or a headless API inside its own app.
            </Body>
          </div>
          <aside className="rounded-xl border border-[#e8e3da] bg-white p-5 sm:p-6">
            <p className="text-[10px] tracking-[0.16em] uppercase text-[#9c7b8b] mb-2">Commercial path</p>
            <p className="text-sm text-[#5c5854] font-light leading-relaxed">
              Free snapshot → ${FOUNDING_PILOT_PRICE_USD.toLocaleString("en-US")} pilot (onboarding) → Platform (
              ${PLATFORM_MONTHLY_USD}/mo) · Professional (${PROFESSIONAL_MONTHLY_USD.toLocaleString("en-US")}/mo) ·
              Enterprise (custom).
            </p>
          </aside>
        </div>

        <div className="grid md:grid-cols-2 gap-5 mb-10 items-stretch">
          {ENTRY.map((plan) => (
            <EntryCard key={plan.title} plan={plan} />
          ))}
        </div>

        <div className="mb-6">
          <p className="text-[10px] tracking-[0.18em] uppercase text-[#9c7b8b] mb-4">3. Run it — monthly SaaS</p>
          <div className="grid md:grid-cols-3 gap-5 items-stretch">
            {SAAS_TIERS.map((tier) => (
              <article
                key={tier.key}
                className={`flex flex-col rounded-xl overflow-hidden bg-white border ${
                  tier.key === "professional"
                    ? "border-2 border-[var(--platform-primary)] shadow-[0_24px_50px_rgba(44,38,32,0.08)]"
                    : "border-[#e8e3da]"
                }`}
              >
                {tier.key === "professional" ? (
                  <p className="bg-[var(--platform-primary)] text-white text-center text-[10px] tracking-[0.18em] uppercase py-2.5">
                    Most brands start here
                  </p>
                ) : (
                  <p className="h-[38px] border-b border-[#eeeae4]" aria-hidden="true" />
                )}
                <div className="p-6 sm:p-7 flex flex-col flex-1">
                  <h3 className="text-xl sm:text-[1.35rem] leading-snug mb-2 text-[#161513]" style={SERIF}>
                    {tier.name}
                  </h3>
                  <p className="text-3xl font-light mb-3 text-[#161513]" style={SERIF}>
                    {tier.priceLabel}
                  </p>
                  <p className="text-sm text-[#5c5854] leading-relaxed mb-5">{tier.headline}</p>
                  <ul className="space-y-2.5 mb-6 flex-1">
                    {tier.features.map((point) => (
                      <li key={point} className="flex items-start gap-2.5 text-sm text-[#5c5854] leading-relaxed">
                        <CheckMark />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                  {tier.notIncluded.length ? (
                    <p className="text-[11px] text-[#8a847c] mb-5 leading-relaxed">
                      {tier.notIncluded.join(" · ")}
                    </p>
                  ) : null}
                  <Link
                    href={`/platform/request?intent=${tier.key === "enterprise" ? "enterprise" : "saas"}&tier=${tier.key}&cta=pricing_${tier.key}`}
                    className="inline-flex w-full items-center justify-center text-[11px] tracking-[0.14em] uppercase bg-[var(--platform-primary)] text-white px-5 py-3.5 hover:bg-[var(--platform-primary-hover)] min-h-[44px] rounded-md mt-auto"
                  >
                    {tier.key === "enterprise" ? "Talk to sales" : `Choose ${tier.name}`}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>

        <p className="text-xs text-[#8a847c] max-w-3xl leading-relaxed mb-12">
          The Founding Pilot is a fixed-fee implementation project — analysis, software, and finished material data.
          Monthly plans are priced by managed product volume and passport hosting. Headless passport API, SSO, custom
          domains, and ERP integrations require Enterprise. Pilot fees, enterprise contracts, API usage, NFC/RFID, and
          hosting overages are additional to SaaS ARR.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 pt-10 border-t border-[#e8e3da] pb-10 sm:pb-12">
          {VALUES.map((item) => (
            <div key={item.title}>
              <span className="mb-3 flex h-8 items-center text-[var(--platform-primary)]" aria-hidden="true">
                <ValueIcon name={item.icon} />
              </span>
              <p className="text-[10px] tracking-[0.16em] uppercase text-[var(--platform-primary)] mb-2">{item.title}</p>
              <p className="text-sm text-[#5c5854] font-light leading-relaxed">{item.copy}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function EntryCard({ plan }: { plan: (typeof ENTRY)[number] }) {
  return (
    <article
      className={`flex flex-col rounded-xl overflow-hidden bg-white ${
        plan.popular ? "border-2 border-[var(--platform-primary)] shadow-[0_24px_50px_rgba(44,38,32,0.08)]" : "border border-[#e8e3da]"
      }`}
    >
      {plan.popular ? (
        <p className="bg-[var(--platform-primary)] text-white text-center text-[10px] tracking-[0.18em] uppercase py-2.5">
          Most popular entry
        </p>
      ) : (
        <p className="h-[38px] border-b border-[#eeeae4]" aria-hidden="true" />
      )}
      <div className="p-6 sm:p-7 flex flex-col flex-1">
        <p className="text-[10px] tracking-[0.16em] uppercase text-[#9c7b8b] mb-3">{plan.step}</p>
        <h3 className="text-xl sm:text-[1.35rem] leading-snug mb-3 text-[#161513]" style={SERIF}>
          {plan.title}
        </h3>
        <p className="text-3xl sm:text-4xl font-light mb-4 text-[#161513]" style={SERIF}>
          {plan.price}
        </p>
        <p className="text-sm text-[#5c5854] leading-relaxed mb-6">{plan.copy}</p>
        <ul className="space-y-2.5 mb-8 flex-1">
          {plan.points.map((point) => (
            <li key={point} className="flex items-start gap-2.5 text-sm text-[#5c5854] leading-relaxed">
              <CheckMark />
              <span>{point}</span>
            </li>
          ))}
        </ul>
        <Link
          href={plan.href}
          className="inline-flex w-full items-center justify-center text-[11px] tracking-[0.14em] uppercase bg-[var(--platform-primary)] text-white px-5 py-3.5 hover:bg-[var(--platform-primary-hover)] min-h-[44px] rounded-md mt-auto"
        >
          {plan.cta}
        </Link>
      </div>
    </article>
  );
}

function CheckMark() {
  return (
    <svg className="mt-0.5 h-4 w-4 shrink-0 text-[var(--platform-primary)]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function ValueIcon({ name }: { name: (typeof VALUES)[number]["icon"] }) {
  const common = { width: 28, height: 28, fill: "none" as const, stroke: "currentColor", strokeWidth: 1.4 };
  if (name === "shield") {
    return (
      <svg {...common} viewBox="0 0 28 28">
        <path d="M14 4 7 7v7c0 5 3.2 8.5 7 10 3.8-1.5 7-5 7-10V7l-7-3z" />
        <path d="M10.5 14.2 13 16.7 18 11.2" />
      </svg>
    );
  }
  if (name === "lock") {
    return (
      <svg {...common} viewBox="0 0 28 28">
        <rect x="7" y="13" width="14" height="11" rx="1.5" />
        <path d="M10 13V10a4 4 0 0 1 8 0v3" />
      </svg>
    );
  }
  if (name === "clock") {
    return (
      <svg {...common} viewBox="0 0 28 28">
        <circle cx="14" cy="14" r="9" />
        <path d="M14 9v5.5l3.5 2" />
      </svg>
    );
  }
  return (
    <svg {...common} viewBox="0 0 28 28">
      <circle cx="10" cy="10" r="3" />
      <circle cx="18" cy="10" r="3" />
      <path d="M5.5 20c.7-3 2.8-4.5 4.5-4.5S14 17 14.7 20" />
      <path d="M13.3 20c.7-3 2.8-4.5 4.5-4.5S22.6 17 23.3 20" />
    </svg>
  );
}
