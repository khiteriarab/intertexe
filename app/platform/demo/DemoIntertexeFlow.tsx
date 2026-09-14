"use client";

import { SERIF } from "../platform-ui";

const FLOW_STEPS = [
  { id: "source", num: "01", title: "Source", copy: "Ingest product data from PLM, ERP, suppliers, or your existing systems." },
  { id: "normalize", num: "02", title: "Normalize", copy: "Clean, enrich, and standardize key product attributes and material composition." },
  { id: "validate", num: "03", title: "Validate", copy: "Flag missing data, ensure compliance, and add verified evidence." },
  { id: "publish", num: "04", title: "Publish", copy: "Create a digital product passport, ready for consumer and partner channels." },
  { id: "activate", num: "05", title: "Activate", copy: "Power your website, app, resale partners, and sustainability reporting." },
  { id: "measure", num: "06", title: "Measure", copy: "Track performance, benchmark, and improve over time." },
] as const;

function scrollToWorkflow(id: string) {
  document.getElementById(`workflow-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function DemoIntertexeFlow() {
  return (
    <section id="flow" className="demo-editorial-flow scroll-mt-24 border-y border-[var(--platform-border)]/70">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-12 sm:py-16 lg:py-20">
        <h2 className="text-[1.75rem] sm:text-[2rem] font-light mb-3" style={SERIF}>
          The INTERTEXE Flow
        </h2>
        <p className="text-[15px] text-[var(--platform-muted)] font-light max-w-xl mb-10 lg:mb-12">
          One product. A complete lifecycle — from source data to the passport your customer scans.{" "}
          <button type="button" onClick={() => scrollToWorkflow("source")} className="demo-workflow-jump-link">
            Follow the record ↓
          </button>
        </p>
        <div className="demo-editorial-flow-grid">
          {FLOW_STEPS.map((step, index) => (
            <button
              key={step.title}
              type="button"
              onClick={() => scrollToWorkflow(step.id)}
              className="demo-editorial-flow-step demo-editorial-flow-step--interactive"
            >
              {index > 0 ? <span className="demo-editorial-flow-arrow" aria-hidden>→</span> : null}
              <p className="demo-editorial-flow-num">{step.num}</p>
              <p className="demo-editorial-flow-title">{step.title}</p>
              <p className="demo-editorial-flow-copy">{step.copy}</p>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
