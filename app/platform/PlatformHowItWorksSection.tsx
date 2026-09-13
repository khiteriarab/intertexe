import { Body, Eyebrow, Heading, PrimaryLink, SecondaryLink } from "./platform-ui";

const STEPS = [
  {
    n: "01",
    title: "Connect",
    copy: "Bring in your data from any source — CSV, ERP, PLM, spreadsheets, and supplier files.",
    image: "/platform/understand-ingest-laptop.jpg",
    imageAlt: "Supplier and ERP data ingested into INTERTEXE",
  },
  {
    n: "02",
    title: "Normalize",
    copy: "Standardize fields and fiber formats while preserving the original source string on every row.",
    image: "/platform/understand-structure-laptop.jpg",
    imageAlt: "Messy source composition normalized in INTERTEXE",
  },
  {
    n: "03",
    title: "Resolve",
    copy: "Match, enrich, and resolve conflicts into one governed material record.",
    image: "/platform/understand-diagnose-laptop.jpg",
    imageAlt: "Issues inbox surfacing composition conflicts",
  },
  {
    n: "04",
    title: "Understand",
    copy: "Turn data into insights — benchmark fiber mix and passport readiness against peers.",
    image: "/platform/compare-benchmark.png",
    imageAlt: "Material Benchmark dashboard",
  },
  {
    n: "05",
    title: "Publish",
    copy: "Create product passports and consumer experiences from the same approved record.",
    image: "/platform/act-passport.png",
    imageAlt: "Publish passport with QR and mobile preview",
  },
] as const;

const PILLARS = [
  ["Standardize", "Any data, any format"],
  ["Govern", "Your rules, your brand"],
  ["Deliver", "Ready for consumers"],
] as const;

function EditorialStepCard({ step }: { step: (typeof STEPS)[number] }) {
  return (
    <article className="platform-editorial-step">
      <div className="platform-editorial-step-visual">
        <img src={step.image} alt={step.imageAlt} className="platform-editorial-step-image" loading="lazy" />
      </div>
      <p className="platform-editorial-step-badge">{step.n} {step.title}</p>
      <p className="platform-editorial-step-copy">{step.copy}</p>
    </article>
  );
}

export function PlatformHowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-28 platform-abstract-band itx-abstract-motif py-12 sm:py-16 lg:py-24 border-b border-[#e8e3da]/60"
    >
      <div className="max-w-6xl lg:max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
        <div className="max-w-2xl mb-8 lg:mb-10">
          <Eyebrow>How INTERTEXE works</Eyebrow>
          <Heading className="mb-4">From raw data to the scan moment.</Heading>
          <Body className="mb-8">
            Govern one record, publish passports, and deliver consumer experiences through hosted pages, your domain,
            or your app — without rebuilding data per channel.
          </Body>
          <div className="flex flex-col sm:flex-row gap-3">
            <PrimaryLink href="/platform/request?intent=snapshot&cta=how_it_works">Start with 10 products</PrimaryLink>
            <SecondaryLink href="/platform/demo">See it live</SecondaryLink>
          </div>
        </div>

        <ul className="platform-editorial-pillars grid sm:grid-cols-3 gap-6 sm:gap-8 mb-12 lg:mb-16">
          {PILLARS.map(([label, detail]) => (
            <li key={label} className="border-t border-[var(--platform-border)] pt-4">
              <span className="block text-[11px] tracking-[0.12em] uppercase text-[var(--platform-primary)] mb-1.5">
                {label}
              </span>
              <span className="block text-[14px] text-[var(--platform-quiet)] font-light">{detail}</span>
            </li>
          ))}
        </ul>

        <div className="platform-editorial-step-grid">
          {STEPS.map((step) => (
            <EditorialStepCard key={step.n} step={step} />
          ))}
        </div>
      </div>
    </section>
  );
}
