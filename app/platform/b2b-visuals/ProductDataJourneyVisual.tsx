"use client";

import Link from "next/link";
import { useState, type RefObject } from "react";
import { useReducedMotion, useScrollSteps } from "../b2b-motion";
import { SERIF } from "../platform-ui";

const IDENTITY_ID = "INTX-ITX-4102";

const STAGES = [
  {
    n: "01",
    title: "Connect",
    copy: "CSV, ERP, supplier files and product feeds — without replacing your stack.",
    panel: (
      <div className="space-y-2 text-sm">
        <p className="text-[10px] uppercase tracking-[0.12em] text-[#8a847c]">Incoming</p>
        <p className="font-mono text-xs bg-[#f7f5f1] border border-[#e8e3da] px-3 py-2">products_export.csv</p>
        <p className="font-mono text-xs bg-[#f7f5f1] border border-[#e8e3da] px-3 py-2">erp_composition_v2.json</p>
        <p className="font-mono text-xs bg-[#f7f5f1] border border-[#e8e3da] px-3 py-2">supplier_line_sheet.xlsx</p>
      </div>
    ),
  },
  {
    n: "02",
    title: "Normalize",
    copy: "Standardize fibers, fields and formats while preserving original source strings.",
    panel: (
      <div className="text-sm">
        <p className="font-mono text-xs text-[#8a847c] mb-2">92 SE · 8 EA</p>
        <p className="text-[var(--platform-accent)] mb-2" aria-hidden>
          ↓
        </p>
        <p className="font-mono text-xs text-[var(--platform-primary)] bg-[var(--platform-highlight)] px-3 py-2">Silk 92% · Elastane 8%</p>
      </div>
    ),
  },
  {
    n: "03",
    title: "Resolve",
    copy: "Surface missing composition, conflicting values and evidence requirements.",
    panel: (
      <ul className="space-y-2 text-xs text-[#5c5854]">
        <li className="flex gap-2 items-start">
          <span className="text-[#9c7b8b] shrink-0">!</span>
          Missing composition — 12 SKUs
        </li>
        <li className="flex gap-2 items-start">
          <span className="text-[#9c7b8b] shrink-0">≠</span>
          Conflicting cotton % — ERP vs supplier
        </li>
        <li className="flex gap-2 items-start">
          <span className="text-[#9c7b8b] shrink-0">◎</span>
          Evidence required — label photo
        </li>
      </ul>
    ),
  },
  {
    n: "04",
    title: "Understand",
    copy: "Material mix, benchmarking and passport readiness from the same record.",
    panel: (
      <div className="space-y-3 text-xs">
        <div>
          <p className="text-[10px] uppercase tracking-[0.1em] text-[#8a847c] mb-1">Material mix</p>
          <div className="flex h-2 rounded-sm overflow-hidden" aria-hidden>
            <span className="bg-[#d9cbb8]" style={{ width: "36%" }} />
            <span className="bg-[#7d9bb8]" style={{ width: "28%" }} />
            <span className="bg-[#9c7b8b]" style={{ width: "36%" }} />
          </div>
        </div>
        <p>
          <span className="text-[#8a847c]">Benchmark ·</span> Natural fiber 57% vs peer 46%
        </p>
        <p>
          <span className="text-[#8a847c]">Readiness ·</span> 62% passport preparation
        </p>
      </div>
    ),
  },
  {
    n: "05",
    title: "Publish",
    copy: "Create persistent product identity, version the passport, connect a data carrier, and expose approved public data through a stable resolver.",
    panel: (
      <div className="text-xs space-y-2.5">
        <p className="font-mono text-[var(--platform-primary)]">{IDENTITY_ID} · identity created</p>
        <p className="text-[#5c5854]">Passport v2 published · 92% Silk · 8% Elastane</p>
        <div className="flex flex-wrap gap-2">
          <span className="border border-[var(--platform-accent)]/40 text-[var(--platform-primary)] px-2 py-1 text-[10px] uppercase tracking-[0.08em]">
            QR connected
          </span>
          <span className="border border-[#e8e3da] text-[#8a847c] px-2 py-1 text-[10px] uppercase tracking-[0.08em]">
            NFC · compatible
          </span>
        </div>
        <p className="font-mono text-[10px] text-[#8a847c]">intertexe.com/p/{IDENTITY_ID.toLowerCase()}</p>
      </div>
    ),
  },
] as const;

const MODULES = ["Overview", "Products", "Issues", "Benchmarking", "Passports", "Readiness", "Regulatory"] as const;

function StagePanel({ index, activeStep, reduced }: { index: number; activeStep: number; reduced: boolean }) {
  const stage = STAGES[index];
  const active = reduced || index <= activeStep;
  return (
    <article
      className={`transition-opacity duration-500 ${active ? "opacity-100" : "opacity-40 lg:opacity-100"}`}
      aria-current={index === activeStep ? "step" : undefined}
    >
      <p className="text-[11px] tracking-[0.22em] uppercase text-[#9c7b8b] mb-2 tabular-nums">{stage.n}</p>
      <h3 className="text-lg sm:text-xl font-light mb-2 text-[#161513]" style={SERIF}>
        {stage.title}
      </h3>
      <p className="text-sm text-[#5c5854] leading-relaxed mb-4">{stage.copy}</p>
      <div
        className={`rounded-lg border bg-white p-4 min-h-[120px] transition-colors ${
          index === activeStep ? "border-[var(--platform-accent)]/40 shadow-sm" : "border-[#e8e3da]"
        }`}
      >
        {stage.panel}
      </div>
    </article>
  );
}

/** Compact five-step cards for /platform home (tested export). */
export function JourneyStepsVisual() {
  return (
    <div className="mt-10 sm:mt-14">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-px bg-[#e8e3da] border border-[#e8e3da] rounded-xl overflow-hidden">
        {STAGES.map((step) => (
          <article key={step.n} className="bg-white p-6 sm:p-7 flex flex-col min-h-[168px]">
            <p className="text-[11px] tracking-[0.22em] uppercase text-[#9c7b8b] mb-3 tabular-nums">{step.n}</p>
            <h3 className="text-lg sm:text-xl font-light mb-2 text-[#161513]" style={SERIF}>
              {step.title}
            </h3>
            <p className="text-sm text-[#5c5854] leading-relaxed mt-auto">{step.copy}</p>
          </article>
        ))}
      </div>
      <p className="mt-6 text-center">
        <Link
          href="/platform/discover#product-journey"
          className="text-[11px] tracking-[0.14em] uppercase text-[var(--platform-primary)] underline underline-offset-4 hover:text-[var(--platform-accent)]"
        >
          Explore the interactive journey →
        </Link>
      </p>
    </div>
  );
}

/** Full scroll-sequenced journey for /platform/discover. */
export function ProductDataJourneyVisual() {
  const [ref, activeStep] = useScrollSteps(STAGES.length);
  const [manualStep, setManualStep] = useState(0);
  const reduced = useReducedMotion();
  const step = reduced ? manualStep : activeStep;

  return (
    <section id="product-journey" ref={ref as RefObject<HTMLElement>} className="scroll-mt-24">
      <div className="hidden xl:block relative mt-10">
        <div
          className="absolute top-[52px] left-[10%] right-[10%] h-px bg-[#e8e3da] -z-0"
          aria-hidden
        >
          <span
            className="block h-full bg-[var(--platform-accent)]/60 origin-left transition-transform duration-700 ease-out"
            style={{ transform: `scaleX(${(step + 1) / STAGES.length})` }}
          />
        </div>
        <div className="grid grid-cols-5 gap-4 relative z-10">
          {STAGES.map((_, i) => (
            <StagePanel key={STAGES[i].n} index={i} activeStep={step} reduced={reduced} />
          ))}
        </div>
      </div>

      <div className="xl:hidden mt-8 space-y-8">
        {STAGES.map((stage, i) => (
          <div key={stage.n}>
            {i > 0 ? (
              <div className="flex justify-center py-1 text-[var(--platform-accent)]" aria-hidden>
                ↓
              </div>
            ) : null}
            <button
              type="button"
              className="w-full text-left"
              onClick={() => setManualStep(i)}
              aria-expanded={step === i}
            >
              <StagePanel index={i} activeStep={step} reduced={reduced} />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap gap-2 justify-center">
        {MODULES.map((mod) => (
          <span
            key={mod}
            className="text-[10px] tracking-[0.1em] uppercase border border-[#e8e3da] bg-white px-3 py-2 text-[#5c5854]"
          >
            {mod}
          </span>
        ))}
      </div>
      <p className="mt-4 text-xs text-[#8a847c] text-center leading-relaxed max-w-2xl mx-auto">
        Governed data flows through the INTERTEXE workspace — Overview, Products, Issues, Benchmarking, Passports,
        Readiness and Regulatory.
      </p>
    </section>
  );
}
