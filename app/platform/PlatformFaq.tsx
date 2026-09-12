import Link from "next/link";
import type { ReactNode } from "react";
import { SERIF } from "./platform-ui";

const FAQ: { q: string; a: ReactNode }[] = [
  {
    q: "What is INTERTEXE — a data layer, a DPP company, or a consumer app?",
    a: "INTERTEXE is product intelligence infrastructure for fashion. We govern your product data, publish passports, and deliver approved information to consumers — through INTERTEXE-hosted pages, your branded domain, or headless API into your existing app. We don't just organize DPP fields; we turn governed data into the digital product experience your customer actually sees.",
  },
  {
    q: "Is INTERTEXE a Digital Product Passport company?",
    a: "DPP regulation is why many brands start. INTERTEXE is a material-intelligence system: it structures catalog data, shows what is wrong or missing, benchmarks material strategy, and then publishes passports from that same record. Passport generation is an outcome, not the whole product.",
  },
  {
    q: "Does INTERTEXE generate the Digital Product Passport?",
    a: "Yes — once the underlying record is structured and the required fields are present. INTERTEXE determines what is still missing for the applicable passport requirements, the brand or supplier supplies those fields, and INTERTEXE generates the passport record, persistent product identity and QR. Material Intelligence is live in the public demo. Passport generation, identity/QR and publication are delivered through the onboarding fee engagement and the platform now being built.",
  },
  {
    q: "Do consumers need the INTERTEXE app?",
    a: "No. Consumers scan a QR or open a link — they see your product experience, not a requirement to download anything. You choose delivery: INTERTEXE-hosted passport, white-label on your domain, or headless API into your own app and website. The INTERTEXE shopping app is separate strategic infrastructure, not what enterprise customers buy.",
  },
  {
    q: "We already have an app. Why would we send customers to INTERTEXE?",
    a: "You don't have to. Headless API delivery lets your developers pull approved passport data — product, journey, care, circularity — and render it inside your existing digital ecosystem. INTERTEXE owns the data cloud and intelligence; your brand owns the presentation. Large brands often use all three: QR on garment, API in app, white-label on web — all reading from one governed record.",
  },
  {
    q: "What are the delivery options for consumer-facing passports?",
    a: "Three modes, not mutually exclusive: INTERTEXE Hosted (Editorial, Trace, Essential, Circular templates — included in Platform plans), White Label (your branded passport domain — Professional/Enterprise), and Headless API (structured passport JSON for your app or website — Enterprise). Hosted is zero development; headless is maximum control.",
  },
  {
    q: "Can I see a live example before buying?",
    a: "Yes. Scan the case study QR on intertexe.com/platform — it opens a published Customer Zero passport with real product photography and a full governed lifecycle (raw material through next life). That is exactly what your customers would see when they scan a garment QR.",
  },
  {
    q: "What data do we need to start?",
    a: "Existing data. CSV, Excel, JSON, a PLM/PIM export or a supplier file. INTERTEXE identifies what can be used and what remains missing.",
  },
  {
    q: "What happens if our data is incomplete?",
    a: "Unknown information stays unknown. INTERTEXE produces an actionable missing-data register. It does not fabricate product data.",
  },
  {
    q: "Can INTERTEXE work with our PIM, PLM or ERP?",
    a: "Start with file import (CSV, Excel, JSON) or a managed catalog after qualification. Broader systems integration and brand APIs are part of the platform architecture and scoped after the pilot. We do not claim pre-built connectors that are not live.",
  },
  {
    q: "How does INTERTEXE handle confidential information?",
    a: (
      <>
        Do not upload confidential catalogs on the public form. Secure transfer is arranged after qualification. See{" "}
        <Link href="/privacy" className="underline underline-offset-4">
          Privacy
        </Link>{" "}
        and{" "}
        <Link href="/terms" className="underline underline-offset-4">
          Terms
        </Link>
        .
      </>
    ),
  },
  {
    q: "Is INTERTEXE a compliance certification service?",
    a: "No. INTERTEXE is software for preparation, generation, publication and maintenance. It does not provide legal certification, an official DPP score, or a guarantee of regulatory compliance. The EU Registry remains the registry for passport identifiers.",
  },
  {
    q: "What is Material Benchmark?",
    a: "Material Benchmark is INTERTEXE's peer comparison layer — like subscription analytics for SaaS, but for fabric and material strategy. Brands compare fiber mix, completeness, passport readiness, and conversion signals against governed peer segments in their market. You see what material compositions are outperforming or underperforming vs peers, sliced by category and cohort. Individual competitor catalogs and shopper identity are never exposed — only aggregate medians from approved datasets.",
  },
  {
    q: "What happens as DPP requirements evolve?",
    a: "A regulatory monitor evaluates tracked requirement changes against the catalog and shows preparation status: unaffected, already complete, missing data, or review needed. Brands do not start over. That is operational software, not legal advice.",
  },
];

export function PlatformFaq() {
  return (
    <section className="platform-abstract-band itx-abstract-motif border-t border-[#e8e3da]">
      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-10 sm:py-16 md:py-24">
        <h2 className="mb-2 text-[1.75rem] sm:text-3xl md:text-4xl font-light text-[var(--platform-primary)]" style={SERIF}>
          FAQ
        </h2>
        <p className="text-sm text-[#8a847c] mb-8">
          Workspace questions for{" "}
          <span className="text-[var(--platform-primary)]">intertexe.com/platform/discover</span>.
        </p>
        <div className="border-t border-[#e8e3da]">
          {FAQ.map((item) => (
            <details key={item.q} name="platform-faq" className="group border-b border-[#e8e3da]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[#161513] [&::-webkit-details-marker]:hidden">
                <span className="text-base sm:text-lg font-normal leading-snug" style={SERIF}>
                  {item.q}
                </span>
                <svg
                  className="h-4 w-4 shrink-0 text-[#8a847c] transition-transform duration-200 group-open:rotate-180"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path d="M3 5.5 8 10.5 13 5.5" stroke="currentColor" strokeWidth="1.2" />
                </svg>
              </summary>
              <p className="pb-5 pr-8 text-sm text-[#5c5854] leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
