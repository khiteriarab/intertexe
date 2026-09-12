"use client";

import { SERIF } from "../platform-ui";

const LIFECYCLE_STAGES = [
  { stage: "Raw material", detail: "Flax", location: "France" },
  { stage: "Fabric", detail: "100% linen", location: "Woven in Italy" },
  { stage: "Manufacturing", detail: "Dress assembled", location: "Portugal" },
  { stage: "Distribution", detail: "European distribution", location: "" },
  { stage: "Sale", detail: "Retail", location: "Barcelona" },
  { stage: "Ownership", detail: "Wash cold · air dry · repair guidance", location: "" },
  { stage: "Next life", detail: "Repair → Resell → Donate → Recycle", location: "" },
] as const;

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
          <div className="relative grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-8 lg:gap-12 items-start">
            <div>
              <p className="text-[10px] tracking-[0.2em] uppercase text-[var(--platform-accent)] mb-3">Example · Linen dress</p>
              <h3 className="text-2xl sm:text-[1.75rem] font-light text-[var(--platform-primary)] mb-3" style={SERIF}>
                One structured product journey — not webpage copy.
              </h3>
              <p className="text-sm text-[var(--platform-muted)] leading-relaxed mb-6">
                Each stage is governed data in obelisk-core: evidence, source, public/private status, and approval
                state. The same record powers passports, hosted experiences, white-label domains, and headless API
                responses.
              </p>
              <ol className="space-y-0">
                {LIFECYCLE_STAGES.map((item, index) => (
                  <li key={item.stage} className="relative pl-6 pb-4 last:pb-0">
                    {index < LIFECYCLE_STAGES.length - 1 ? (
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
                30-second demonstration
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
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-lg border border-[var(--platform-border)] overflow-hidden">
                  <div className="aspect-[4/5] bg-gradient-to-br from-[#e8e0d4] via-[#f0ebe3] to-[#d9cbb8] relative">
                    <div
                      className="absolute inset-0 opacity-30"
                      aria-hidden
                      style={{
                        backgroundImage:
                          "radial-gradient(circle at 30% 20%, rgba(201,169,98,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(212,196,168,0.5) 0%, transparent 45%)",
                      }}
                    />
                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-[#161513]/70 to-transparent">
                      <p className="text-[10px] tracking-[0.14em] uppercase text-white/70">Consumer preview</p>
                      <p className="text-sm text-white font-light mt-1" style={SERIF}>
                        Linen dress · Editorial
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col justify-center gap-4 p-2">
                  <div className="rounded-lg border border-[var(--platform-border)] p-4 text-center bg-[var(--platform-highlight)]">
                    <div className="mx-auto w-16 h-16 border border-[var(--platform-border)] bg-white grid grid-cols-4 grid-rows-4 gap-0.5 p-1.5 mb-2">
                      {Array.from({ length: 16 }).map((_, i) => (
                        <span
                          key={i}
                          className={`block ${i % 3 === 0 ? "bg-[var(--platform-primary)]" : "bg-[var(--platform-border)]"}`}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] tracking-[0.12em] uppercase text-[var(--platform-muted)]">Scannable QR</p>
                    <p className="font-mono text-[10px] text-[var(--platform-primary)] mt-1">intertexe.com/p/abc123</p>
                  </div>
                  <p className="text-xs text-[var(--platform-muted)] leading-relaxed text-center sm:text-left">
                    Scan beside your desk. See the real photograph, real composition, and every lifecycle stage you
                    approved — in about thirty seconds.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-xs text-[var(--platform-quiet)] leading-relaxed">
        Illustrative product journey. INTERTEXE does not fabricate care, origin, or circularity data — only surfaces what
        your governed record contains.
      </figcaption>
    </figure>
  );
}
