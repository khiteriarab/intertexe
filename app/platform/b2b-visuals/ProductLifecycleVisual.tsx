"use client";

import Image from "next/image";
import { PASSPORT_CASE_STUDY } from "../../../lib/enterprise/passport-case-study";
import { PlatformCaseStudyQr } from "./PlatformCaseStudyQr";
import { SERIF } from "../platform-ui";

const FLOW_STEPS = [
  "Raw data",
  "INTERTEXE",
  "Governed record",
  "Passport",
  "Experience",
  "QR",
  "Scan",
  "Consumer page",
] as const;

export function ProductLifecycleVisual() {
  return (
    <figure className="m-0">
      <div className="platform-abstract-band rounded-2xl border border-[var(--platform-border)] overflow-hidden shadow-[0_24px_60px_rgba(44,38,32,0.08)]">
        <div className="relative p-6 sm:p-8 lg:p-10">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            aria-hidden
            style={{
              backgroundImage:
                "repeating-linear-gradient(-18deg, transparent, transparent 22px, rgba(196,165,116,0.08) 22px, rgba(196,165,116,0.08) 23px)",
            }}
          />
          <div className="relative grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] gap-8 lg:gap-12 items-start">
            <div>
              <p className="text-[10px] tracking-[0.2em] uppercase text-[var(--platform-accent)] mb-3">
                Live case study · Customer Zero
              </p>
              <h3 className="text-2xl sm:text-[1.75rem] font-light text-[var(--platform-primary)] mb-3" style={SERIF}>
                Scan the QR. See the full product lifecycle your customer would see.
              </h3>
              <p className="text-sm text-[var(--platform-muted)] leading-relaxed mb-2">
                <span className="font-medium text-[var(--platform-primary)]">{PASSPORT_CASE_STUDY.productName}</span>
                {" · "}
                {PASSPORT_CASE_STUDY.composition}
              </p>
              <p className="text-sm text-[var(--platform-muted)] leading-relaxed mb-6">
                Every stage below is governed data in obelisk-core — traceability tiers, public fields, evidence, and
                approval state. Not marketing copy. The same record powers hosted passports, white-label domains, and
                headless API responses.
              </p>
              <ol className="space-y-0">
                {PASSPORT_CASE_STUDY.lifecycleStages.map((item, index) => (
                  <li key={item.stage} className="relative pl-6 pb-4 last:pb-0">
                    {index < PASSPORT_CASE_STUDY.lifecycleStages.length - 1 ? (
                      <span
                        className="absolute left-[7px] top-5 bottom-0 w-px bg-[var(--platform-accent)]/35"
                        aria-hidden
                      />
                    ) : null}
                    <span
                      className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-[var(--platform-accent)] bg-white"
                      aria-hidden
                    />
                    <p className="text-[10px] tracking-[0.14em] uppercase text-[var(--platform-quiet)]">{item.stage}</p>
                    <p className="text-sm font-medium text-[var(--platform-primary)] mt-0.5">{item.detail}</p>
                    {item.location ? (
                      <p className="text-xs text-[var(--platform-muted)] mt-0.5">{item.location}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-xl border border-[var(--platform-border)] bg-white/90 backdrop-blur-sm p-5 sm:p-6">
              <p className="text-[10px] tracking-[0.18em] uppercase text-[var(--platform-quiet)] mb-4">
                30-second sales demonstration
              </p>
              <div className="flex flex-wrap gap-2 mb-6">
                {FLOW_STEPS.map((step, index) => (
                  <span key={step} className="inline-flex items-center gap-2">
                    <span className="text-[10px] tracking-[0.08em] uppercase px-2.5 py-1.5 rounded-full border border-[var(--platform-border)] bg-[var(--platform-highlight)] text-[var(--platform-primary)]">
                      {step}
                    </span>
                    {index < FLOW_STEPS.length - 1 ? (
                      <span className="text-[var(--platform-accent)] text-xs hidden sm:inline" aria-hidden>
                        →
                      </span>
                    ) : null}
                  </span>
                ))}
              </div>
              <div className="grid sm:grid-cols-2 gap-4 items-start">
                <div className="rounded-lg border border-[var(--platform-border)] overflow-hidden relative aspect-[4/5] bg-[var(--platform-highlight)]">
                  <Image
                    src={PASSPORT_CASE_STUDY.imageUrl}
                    alt={PASSPORT_CASE_STUDY.productName}
                    fill
                    className="object-cover"
                    sizes="240px"
                    unoptimized
                  />
                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-[#161513]/75 to-transparent">
                    <p className="text-[10px] tracking-[0.14em] uppercase text-white/70">Consumer passport</p>
                    <p className="text-sm text-white font-light mt-1" style={SERIF}>
                      {PASSPORT_CASE_STUDY.template} template
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  <PlatformCaseStudyQr compact />
                  <p className="text-xs text-[var(--platform-muted)] leading-relaxed">
                    Point your iPhone at the QR beside your laptop. You will see the real product photograph, full
                    lifecycle journey, composition, care, and circularity guidance — exactly as your customer would.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-xs text-[var(--platform-quiet)] leading-relaxed">
        Customer Zero pilot product {PASSPORT_CASE_STUDY.styleCode}. INTERTEXE surfaces only governed, approved data —
        unavailable stages remain explicitly marked on the passport.
      </figcaption>
    </figure>
  );
}
