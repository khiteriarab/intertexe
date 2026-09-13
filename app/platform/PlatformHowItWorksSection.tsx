import Link from "next/link";
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

export function PlatformHowItWorksSection() {
  return (
    <section id="how-it-works" className="scroll-mt-28 platform-abstract-band itx-abstract-motif py-12 sm:py-16 lg:py-24 border-b border-[#e8e3da]/60">
      <div className="max-w-6xl lg:max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
        <div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-10 lg:gap-14 items-start mb-10 lg:mb-14">
          <div>
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
            <ul className="mt-8 grid sm:grid-cols-3 gap-4 text-[11px] tracking-[0.1em] uppercase text-[var(--platform-muted)]">
              {[
                ["Standardize", "Any data, any format"],
                ["Govern", "Your rules, your brand"],
                ["Deliver", "Ready for consumers"],
              ].map(([label, detail]) => (
                <li key={label} className="border-t border-[var(--platform-border)] pt-3">
                  <span className="block text-[var(--platform-primary)] mb-1">{label}</span>
                  <span className="normal-case tracking-normal text-[12px] text-[var(--platform-quiet)]">{detail}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="platform-how-stepper" aria-hidden>
            {STEPS.map((step, index) => (
              <div key={step.n} className="platform-how-stepper-item">
                <span className="platform-how-stepper-num">{step.n}</span>
                <span className="platform-how-stepper-label">{step.title}</span>
                {index < STEPS.length - 1 ? <span className="platform-how-stepper-line" /> : null}
              </div>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-4 lg:gap-5">
          {STEPS.map((step) => (
            <article
              key={step.n}
              className="platform-how-card rounded-2xl border border-[var(--platform-border)] bg-white overflow-hidden shadow-[0_16px_40px_rgba(22,21,19,0.05)]"
            >
              <div className="relative aspect-[4/5] bg-[#f0ebe4]">
                <img src={step.image} alt={step.imageAlt} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                <span className="absolute top-3 left-3 text-[10px] tracking-[0.14em] uppercase px-2 py-1 rounded-full bg-white/90 border border-[var(--platform-border)] text-[var(--platform-primary)]">
                  {step.n} {step.title}
                </span>
              </div>
              <div className="p-4 sm:p-5">
                <p className="text-sm text-[var(--platform-muted)] leading-relaxed mb-3">{step.copy}</p>
                <Link
                  href="/platform/demo#journey"
                  className="text-[10px] tracking-[0.12em] uppercase text-[var(--platform-accent)] underline underline-offset-4"
                >
                  Learn about {step.title} →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
