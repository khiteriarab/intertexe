import Link from "next/link";
import type { ReactNode } from "react";
import { PrimaryLink, SERIF } from "./platform-ui";

const FAQ: { q: string; a: ReactNode; icon: "catalog" | "demand" | "resolve" | "deliver" | "living" | "compliance" }[] = [
  {
    q: "What is actually in the catalog?",
    icon: "catalog",
    a: "Overview shows products, completeness, material mix, and what still needs attention — on your governed sample or live catalog after onboarding.",
  },
  {
    q: "How is consumer demand observed?",
    icon: "demand",
    a: "Material Benchmark includes conversion signals by material cohort vs peer medians. Observed shopper demand in brand workspaces is developing — aggregate only, never competitor dumps.",
  },
  {
    q: "How does INTERTEXE resolve conflicting data?",
    icon: "resolve",
    a: "The Issues inbox lists composition conflicts, invalid totals, and missing fields. Original source strings stay on the row — conflicts are surfaced, never overwritten silently.",
  },
  {
    q: "How can we deliver this to consumers?",
    icon: "deliver",
    a: "Three modes from one record: INTERTEXE Hosted, white-label on your domain, or headless API into your existing app and website.",
  },
  {
    q: "Why is INTERTEXE a living system?",
    icon: "living",
    a: "After the first passports, the catalog stays in a material intelligence workspace — issues, benchmark, and publication update from the same governed record.",
  },
  {
    q: "How does INTERTEXE support compliance?",
    icon: "compliance",
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

function FaqIcon({ kind }: { kind: (typeof FAQ)[number]["icon"] }) {
  const cls = "h-5 w-5 text-[var(--platform-primary)]";
  if (kind === "catalog") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />
      </svg>
    );
  }
  if (kind === "demand") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path d="M12 22c4-4 8-7.5 8-12a8 8 0 1 0-16 0c0 4.5 4 8 8 12Z" />
      </svg>
    );
  }
  if (kind === "resolve") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <ellipse cx="12" cy="6" rx="7" ry="3" />
        <path d="M5 6v4c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
      </svg>
    );
  }
  if (kind === "deliver") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <rect x="3" y="4" width="18" height="13" rx="2" />
        <path d="M7 20h10" />
      </svg>
    );
  }
  if (kind === "living") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path d="M21 12a9 9 0 1 1-3-6.7" />
        <path d="M21 3v6h-6" />
      </svg>
    );
  }
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M12 3 3 7v6c0 5 4.5 8 9 8s9-3 9-8V7l-9-4Z" />
    </svg>
  );
}

export function PlatformFaq() {
  return (
    <section id="faq" className="scroll-mt-28 platform-abstract-band itx-abstract-motif border-t border-[#e8e3da] py-12 sm:py-16 lg:py-24">
      <div className="max-w-6xl lg:max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
        <div className="grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-8 sm:gap-10 lg:gap-14 items-start">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-[10px] tracking-[0.22em] uppercase text-[var(--platform-quiet)] mb-5">FAQ</p>
            <h2 className="text-[1.75rem] sm:text-[2.5rem] font-light text-[var(--platform-primary)] mb-4 leading-[1.12]" style={SERIF}>
              Answers for a more transparent industry.
            </h2>
            <p className="text-[15px] text-[var(--platform-muted)] font-light leading-relaxed mb-8">
              Workspace, delivery, and compliance questions — without overclaiming certification or inventing product
              data.
            </p>
            <PrimaryLink href="/platform/demo">See it live →</PrimaryLink>
          </div>
          <div>
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {FAQ.map((item) => (
                <details
                  key={item.q}
                  name="platform-faq-grid"
                  className="group rounded-xl border border-[var(--platform-border)] bg-white p-4 sm:p-5 shadow-[0_8px_24px_rgba(22,21,19,0.04)]"
                >
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-3 [&::-webkit-details-marker]:hidden">
                    <span className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--platform-highlight)] border border-[var(--platform-border)] shrink-0">
                        <FaqIcon kind={item.icon} />
                      </span>
                      <span className="text-sm font-medium text-[var(--platform-ink)] leading-snug pt-1" style={SERIF}>
                        {item.q}
                      </span>
                    </span>
                    <span className="text-[var(--platform-quiet)] text-lg leading-none shrink-0 group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <p className="mt-4 pl-11 text-sm text-[var(--platform-muted)] leading-relaxed">{item.a}</p>
                </details>
              ))}
            </div>
            <div className="border-t border-[var(--platform-border)]">
              {MORE_FAQ.map((item) => (
                <details key={item.q} name="platform-faq-more" className="group border-b border-[var(--platform-border)]">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[var(--platform-ink)] [&::-webkit-details-marker]:hidden">
                    <span className="text-sm leading-snug" style={SERIF}>
                      {item.q}
                    </span>
                    <span className="text-[var(--platform-quiet)] group-open:rotate-180 transition-transform">▾</span>
                  </summary>
                  <p className="pb-4 pr-8 text-sm text-[var(--platform-muted)] leading-relaxed">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
