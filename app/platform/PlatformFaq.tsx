import Link from "next/link";
import type { ReactNode } from "react";
import { PrimaryLink } from "./platform-ui";

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
];

const MORE_FAQ: { q: string; a: ReactNode }[] = [
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
    <section id="faq" className="scroll-mt-28 platform-band platform-band--white">
      <div className="platform-band-inner">
        <p className="platform-band-kicker">FAQ</p>
        <h2 className="platform-band-title">Answers for a more transparent industry.</h2>
        <p className="platform-band-copy">
          Workspace, delivery, and compliance questions — without overclaiming certification or inventing product data.
        </p>
        <div className="max-w-3xl">
          {FAQ.map((item) => (
            <details key={item.q} name="platform-faq" className="group platform-faq-item">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 [&::-webkit-details-marker]:hidden">
                <span className="text-[1.05rem] font-medium text-[var(--platform-ink)] leading-snug">{item.q}</span>
                <span className="text-[var(--platform-quiet)] text-xl leading-none shrink-0 group-open:rotate-45 transition-transform">
                  +
                </span>
              </summary>
              <p className="mt-4 text-[1.05rem] text-[var(--platform-muted)] leading-relaxed max-w-2xl">{item.a}</p>
            </details>
          ))}
          {MORE_FAQ.map((item) => (
            <details key={item.q} name="platform-faq" className="group platform-faq-item">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 [&::-webkit-details-marker]:hidden">
                <span className="text-[1.05rem] font-medium text-[var(--platform-ink)] leading-snug">{item.q}</span>
                <span className="text-[var(--platform-quiet)] text-xl leading-none shrink-0 group-open:rotate-45 transition-transform">
                  +
                </span>
              </summary>
              <p className="mt-4 text-[1.05rem] text-[var(--platform-muted)] leading-relaxed max-w-2xl">{item.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-12">
          <PrimaryLink href="/platform/demo">See it live →</PrimaryLink>
        </div>
      </div>
    </section>
  );
}
