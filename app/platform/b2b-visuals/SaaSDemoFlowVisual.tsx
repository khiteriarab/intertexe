"use client";

import Image from "next/image";
import Link from "next/link";
import { PASSPORT_CASE_STUDY, caseStudyPassportUrl } from "../../../lib/enterprise/passport-case-study";
import { PlatformCaseStudyQr } from "./PlatformCaseStudyQr";
import { SERIF } from "../platform-ui";

const FLOW = [
  { step: "01", label: "SaaS workspace", detail: "Govern, publish, and configure the passport experience" },
  { step: "02", label: "QR carrier", detail: "Print, tag, or display the scannable identity" },
  { step: "03", label: "Consumer page", detail: "Exactly what your customer sees after scan" },
] as const;

export function SaaSDemoFlowVisual({ compact = false }: { compact?: boolean }) {
  const passportHref = `/p/${PASSPORT_CASE_STUDY.publicId}`;

  return (
    <figure className="m-0">
      <div className="platform-abstract-band rounded-2xl border border-[var(--platform-border)] overflow-hidden shadow-[0_24px_60px_rgba(44,38,32,0.08)]">
        <div className="relative p-6 sm:p-8 lg:p-10">
          <div className="flex flex-wrap gap-3 mb-8">
            {FLOW.map((item, index) => (
              <span key={item.step} className="inline-flex items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--platform-border)] bg-white/90 px-3 py-2 text-[10px] tracking-[0.1em] uppercase text-[var(--platform-primary)]">
                  <span className="text-[var(--platform-accent)]">{item.step}</span>
                  {item.label}
                </span>
                {index < FLOW.length - 1 ? (
                  <span className="text-[var(--platform-accent)] text-sm hidden md:inline" aria-hidden>
                    →
                  </span>
                ) : null}
              </span>
            ))}
          </div>

          <div className={`grid gap-6 lg:gap-8 items-stretch ${compact ? "lg:grid-cols-[1fr_auto_0.85fr]" : "lg:grid-cols-[1.15fr_auto_0.9fr]"}`}>
            <div className="rounded-xl border border-[var(--platform-border)] bg-white overflow-hidden shadow-sm">
              <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-[var(--platform-border)] bg-[#faf8f5]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ddd5cb]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#ddd5cb]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#ddd5cb]" />
                <span className="ml-2 text-[10px] tracking-[0.14em] uppercase text-[var(--platform-quiet)]">
                  INTERTEXE workspace · Publish
                </span>
              </div>
              <div className="relative aspect-[16/10] bg-[#f7f5f1]">
                <Image
                  src="/platform/hero-workspace-desktop.png"
                  alt="INTERTEXE enterprise workspace on desktop"
                  fill
                  className="object-cover object-left-top"
                  sizes="(max-width: 1024px) 100vw, 520px"
                />
                <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-[240px] rounded-lg border border-[var(--platform-border)] bg-white/95 backdrop-blur-sm p-3 shadow-lg">
                  <p className="text-[9px] tracking-[0.14em] uppercase text-[var(--platform-quiet)] mb-1">Publishing</p>
                  <div className="flex gap-3 items-center">
                    <div className="relative h-14 w-11 shrink-0 rounded overflow-hidden bg-[var(--platform-highlight)]">
                      <Image
                        src={PASSPORT_CASE_STUDY.imageUrl}
                        alt={PASSPORT_CASE_STUDY.productName}
                        fill
                        className="object-cover"
                        sizes="44px"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--platform-primary)] truncate" style={SERIF}>
                        {PASSPORT_CASE_STUDY.productName}
                      </p>
                      <p className="text-[10px] text-[var(--platform-muted)] mt-0.5">{PASSPORT_CASE_STUDY.composition}</p>
                      <p className="text-[10px] tracking-[0.1em] uppercase text-emerald-700 mt-1">Published · QR active</p>
                    </div>
                  </div>
                </div>
              </div>
              {!compact ? (
                <p className="px-4 py-3 text-xs text-[var(--platform-muted)] border-t border-[var(--platform-border)] leading-relaxed">
                  {FLOW[0].detail}. Sample product: {PASSPORT_CASE_STUDY.sku}.
                </p>
              ) : null}
            </div>

            <div className="flex flex-col items-center justify-center gap-3 py-2">
              <span className="hidden lg:block text-[var(--platform-accent)] text-2xl" aria-hidden>
                →
              </span>
              <PlatformCaseStudyQr compact />
              <p className="text-[10px] tracking-[0.12em] uppercase text-[var(--platform-quiet)] text-center max-w-[140px]">
                Scan with iPhone
              </p>
            </div>

            <div className="rounded-xl border border-[var(--platform-border)] bg-white p-4 sm:p-5 flex flex-col">
              <p className="text-[10px] tracking-[0.18em] uppercase text-[var(--platform-quiet)] mb-4">
                Consumer passport
              </p>
              <div className="mx-auto w-full max-w-[240px] rounded-[28px] border-[6px] border-[#161513] bg-[#161513] p-2 shadow-[0_20px_50px_rgba(22,21,19,0.18)]">
                <div className="rounded-[22px] overflow-hidden bg-[#f5f0e8]">
                  <div className="relative aspect-[4/5]">
                    <Image
                      src={PASSPORT_CASE_STUDY.imageUrl}
                      alt={PASSPORT_CASE_STUDY.productName}
                      fill
                      className="object-cover"
                      sizes="240px"
                    />
                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-[#161513]/85 to-transparent">
                      <p className="text-[9px] tracking-[0.12em] uppercase text-white/60">{PASSPORT_CASE_STUDY.brand}</p>
                      <p className="text-sm text-white font-light mt-1" style={SERIF}>
                        {PASSPORT_CASE_STUDY.productName}
                      </p>
                      <p className="text-[10px] text-white/75 mt-1">{PASSPORT_CASE_STUDY.composition}</p>
                    </div>
                  </div>
                  <div className="p-4 space-y-2">
                    <p className="text-[9px] tracking-[0.14em] uppercase text-[var(--platform-quiet)]">Product journey</p>
                    {PASSPORT_CASE_STUDY.lifecycleStages.slice(0, 4).map((stage) => (
                      <div key={stage.stage} className="flex justify-between gap-2 text-[11px] text-[var(--platform-muted)] border-t border-[var(--platform-border)] pt-2">
                        <span>{stage.stage}</span>
                        <span className="text-right truncate">{stage.detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <Link
                href={passportHref}
                className="mt-4 text-center text-[11px] tracking-[0.12em] uppercase underline underline-offset-4"
                style={{ color: "var(--platform-accent)" }}
              >
                Open live passport →
              </Link>
              <p className="text-[10px] text-[var(--platform-muted)] mt-3 text-center font-mono break-all leading-relaxed">
                {caseStudyPassportUrl().replace(/^https?:\/\//, "")}
              </p>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-xs text-[var(--platform-quiet)] leading-relaxed">
        Desktop SaaS → QR carrier → consumer passport. Case study {PASSPORT_CASE_STUDY.styleCode} ·{" "}
        {PASSPORT_CASE_STUDY.productName}. Scan the QR to verify the live page.
      </figcaption>
    </figure>
  );
}
