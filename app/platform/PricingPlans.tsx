import Link from "next/link";
import { Body, Eyebrow, Heading, SERIF } from "./platform-ui";

const PLANS = [
  {
    step: "1. Try it",
    title: "Free 10-Product Material Snapshot",
    price: "€0",
    popular: false,
    copy: "A free snapshot of 10 of your products. See what INTERTEXE finds and where the gaps are.",
    points: [
      "Material normalization",
      "Data completeness score",
      "Key issues and missing information",
      "DPP readiness overview",
      "Limited peer benchmark",
      "Inside a real INTERTEXE workspace",
    ],
    href: "/platform/request?intent=snapshot&cta=pricing_snapshot",
    cta: "Request my snapshot",
  },
  {
    step: "2. Prove it",
    title: "Founding Pilot",
    price: "$5,000",
    popular: true,
    copy: "100 complex products or 500 structured rows. 50% to start / 50% on completion. Target 10-business-day delivery and one revision.",
    points: [
      "Material Intelligence analysis",
      "Data normalization and conflict detection",
      "Missing-data register and provenance",
      "Human review",
      "Benchmarking snapshot",
      "DPP data preparation and initial passport generation",
      "QR identities and downloadable structured data",
    ],
    href: "/platform/request?intent=founding_pilot&cta=pricing_pilot",
    cta: "Request the Founding Pilot",
  },
  {
    step: "3. Run it",
    title: "INTERTEXE Platform",
    price: "From $499/month",
    popular: false,
    copy: "Material intelligence, benchmarking, DPP management and ongoing catalog monitoring. Talk to us about your catalog — we will recommend what makes sense.",
    points: [
      "Ongoing material intelligence",
      "Benchmarking and data quality monitoring",
      "DPP management and publishing",
      "Regulatory monitoring and impact updates",
      "APIs and integrations",
      "Larger catalogs and custom work — talk to us",
    ],
    href: "/platform/request?intent=api_access&cta=pricing_platform",
    cta: "Talk to us about your catalog",
  },
] as const;

const VALUES = [
  {
    title: "Your data is safe",
    copy: "Your data stays yours. We never share or resell it.",
    icon: "shield",
  },
  {
    title: "Start small",
    copy: "Prove value quickly, then scale on your terms.",
    icon: "lock",
  },
  {
    title: "Fast turnaround",
    copy: "Target 10 business days for the Founding Pilot.",
    icon: "clock",
  },
  {
    title: "Built for fashion",
    copy: "Fashion materials, compositions and complexity — our focus.",
    icon: "people",
  },
] as const;

export function PricingPlans() {
  return (
    <section id="pricing" className="bg-[#f7f5f1] border-t border-[#e8e3da] pt-10 sm:pt-16 md:pt-24 pb-2">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="grid lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)] gap-8 lg:gap-12 mb-12 sm:mb-16 items-start">
          <div>
            <Eyebrow>Try it. Prove it. Run it.</Eyebrow>
            <Heading className="mb-4">See INTERTEXE with your own products.</Heading>
            <Body className="max-w-xl">
              Send a few products. See what INTERTEXE finds. Then decide how to go further. No generic demo first —
              start with your data.
            </Body>
          </div>
          <aside className="rounded-xl border border-[#e8e3da] bg-white p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-[#152238]" aria-hidden="true">
                <CalloutIcon />
              </span>
              <div>
                <p className="text-[10px] tracking-[0.16em] uppercase text-[#9c7b8b] mb-2">Your data. Your insights.</p>
                <p className="text-sm text-[#5c5854] font-light leading-relaxed">
                  INTERTEXE analyzes your actual product and material data and shows you what is there, what is
                  missing, and what it takes to make those products passport-ready.
                </p>
              </div>
            </div>
          </aside>
        </div>

        <div className="grid md:grid-cols-3 gap-5 mb-6 items-stretch">
          {PLANS.map((plan) => (
            <article
              key={plan.title}
              className={`flex flex-col rounded-xl overflow-hidden bg-white ${
                plan.popular ? "border-2 border-[#152238] shadow-[0_24px_50px_rgba(21,34,56,0.08)]" : "border border-[#e8e3da]"
              }`}
            >
              {plan.popular ? (
                <p className="bg-[#152238] text-white text-center text-[10px] tracking-[0.18em] uppercase py-2.5">
                  Most popular
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
                  className="inline-flex w-full items-center justify-center text-[11px] tracking-[0.14em] uppercase bg-[#152238] text-white px-5 py-3.5 hover:bg-[#0f1a2c] min-h-[44px] rounded-md mt-auto"
                >
                  {plan.cta}
                </Link>
              </div>
            </article>
          ))}
        </div>

        <p className="text-xs text-[#8a847c] max-w-3xl leading-relaxed mb-12">
          The Founding Pilot is implementation, analysis, software and a finished material-data project — not a
          €29/month DPP-tool subscription. Platform pricing depends on catalog size, API volume and support. We do
          not publish a three-tier grid before we know what drives cost.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 pt-10 border-t border-[#e8e3da] pb-10 sm:pb-12">
          {VALUES.map((item) => (
            <div key={item.title}>
              <span className="mb-3 flex h-8 items-center text-[#152238]" aria-hidden="true">
                <ValueIcon name={item.icon} />
              </span>
              <p className="text-[10px] tracking-[0.16em] uppercase text-[#152238] mb-2">{item.title}</p>
              <p className="text-sm text-[#5c5854] font-light leading-relaxed">{item.copy}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CheckMark() {
  return (
    <svg className="mt-0.5 h-4 w-4 shrink-0 text-[#152238]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function CalloutIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M13 13.5 17 17.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M7 9h4M9 7v4" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function ValueIcon({ name }: { name: (typeof VALUES)[number]["icon"] }) {
  const common = {
    width: 28,
    height: 28,
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.4,
  };
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
