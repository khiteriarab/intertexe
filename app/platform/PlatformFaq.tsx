import Link from "next/link";
import type { ReactNode } from "react";
import { SERIF } from "./platform-ui";

const FAQ: { q: string; a: ReactNode }[] = [
  {
    q: "Is INTERTEXE a Digital Product Passport company?",
    a: "DPP regulation is why many brands start. INTERTEXE is a material-intelligence system: it structures catalog data, shows what is wrong or missing, benchmarks material strategy, and then publishes passports from that same record. Passport generation is an outcome, not the whole product.",
  },
  {
    q: "Does INTERTEXE generate the Digital Product Passport?",
    a: "Yes — once the underlying record is structured and the required fields are present. INTERTEXE determines what is still missing for the applicable passport requirements, the brand or supplier supplies those fields, and INTERTEXE generates the passport record, persistent product identity and QR. Material Intelligence is live in the public demo. Passport generation, identity/QR and publication are delivered through the Founding Pilot and the platform now being built.",
  },
  {
    q: "Do consumers need the INTERTEXE app?",
    a: "No. Passport experiences can be opened from the web or a QR on the product. The architecture supports brand-owned interfaces and API integrations. The INTERTEXE scanner is not required.",
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
    q: "What happens as DPP requirements evolve?",
    a: "A regulatory monitor evaluates tracked requirement changes against the catalog and shows preparation status: unaffected, already complete, missing data, or review needed. Brands do not start over. That is operational software, not legal advice.",
  },
];

export function PlatformFaq() {
  return (
    <section className="bg-[#f7f5f1] border-t border-[#e8e3da]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-10 sm:py-16 md:py-24">
        <h2 className="mb-2 text-[1.75rem] sm:text-3xl md:text-4xl font-light text-[#152238]" style={SERIF}>
          FAQ
        </h2>
        <p className="text-sm text-[#8a847c] mb-8">
          Workspace questions for{" "}
          <span className="text-[#152238]">intertexe.com/platform/discover</span>.
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
