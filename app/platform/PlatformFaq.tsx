import Link from "next/link";
import type { ReactNode } from "react";
import { PrimaryLink, SERIF } from "./platform-ui";

const FAQ: { q: string; a: ReactNode }[] = [
  {
    q: "What is actually in the catalog?",
    a: "Overview shows products, completeness, material mix, and what still needs attention — on your governed sample or live catalog after onboarding.",
  },
  {
    q: "How is consumer demand observed?",
    a: "Material Benchmark includes conversion signals by material cohort vs peer medians. Observed shopper demand in brand workspaces is developing — aggregate only, never competitor dumps.",
  },
  {
    q: "How does INTERTEXE resolve conflicting data?",
    a: "The Issues inbox lists composition conflicts, invalid totals, and missing fields. Original source strings stay on the row — conflicts are surfaced, never overwritten silently.",
  },
  {
    q: "How can we deliver this to consumers?",
    a: "Three modes from one record: INTERTEXE Hosted, white-label on your domain, or headless API into your existing app and website.",
  },
  {
    q: "Why is INTERTEXE a living system?",
    a: "After the first passports, the catalog stays in a material intelligence workspace — issues, benchmark, and publication update from the same governed record.",
  },
  {
    q: "How does INTERTEXE support compliance?",
    a: "Regulatory monitor tracks requirement changes and preparation status — not legal certification. INTERTEXE does not fabricate product data; unknown information stays unknown.",
  },
  {
    q: "What is INTERTEXE — a data layer, a DPP company, or a consumer app?",
    a: "Product intelligence infrastructure for fashion. We govern product data, publish passports, and deliver approved information through hosted pages, your domain, or headless API.",
  },
  {
    q: "Do consumers need the INTERTEXE app?",
    a: "No. Consumers scan a QR or open a link — they see your product experience. The INTERTEXE shopping app is separate infrastructure.",
  },
  {
    q: "Can I see a live example before buying?",
    a: (
      <>
        Yes. Scan the case study QR on{" "}
        <Link href="/platform/demo#live-passport" className="underline underline-offset-4">
          /platform/demo
        </Link>{" "}
        or explore the Material Intelligence API on{" "}
        <Link href="/platform/api" className="underline underline-offset-4">
          /platform/api
        </Link>
        .
      </>
    ),
  },
];

export function PlatformFaq() {
  return (
    <section id="faq" className="scroll-mt-28 platform-faq-lux">
      <div className="platform-lux-wrap platform-faq-lux-grid">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="platform-kicker mb-5">FAQ</p>
          <h2 className="platform-display mb-4" style={SERIF}>
            Answers for a more transparent industry.
          </h2>
          <p className="platform-copy mb-8">
            Workspace, delivery, and compliance questions — without overclaiming certification or inventing product data.
          </p>
          <PrimaryLink href="/platform/demo">See it live →</PrimaryLink>
        </div>
        <div>
          {FAQ.map((item) => (
            <details key={item.q} name="platform-faq" className="platform-faq-row group">
              <summary>
                <span>{item.q}</span>
                <span className="platform-faq-toggle" aria-hidden>
                  +
                </span>
              </summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
