"use client";

import { SERIF } from "../platform-ui";
import { FLOW_STEPS, type FlowStepId } from "./DemoProductWorkflow";

export function DemoIntertexeFlow({
  activeStep,
  onSelectStep,
}: {
  activeStep: FlowStepId;
  onSelectStep: (id: FlowStepId) => void;
}) {
  function selectStep(id: FlowStepId) {
    onSelectStep(id);
    document.getElementById("journey")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section id="flow" className="demo-editorial-flow scroll-mt-24 border-y border-[var(--platform-border)]/70">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-12 sm:pt-16 lg:pt-20 pb-10 lg:pb-12">
        <h2 className="text-[1.75rem] sm:text-[2rem] font-light mb-3" style={SERIF}>
          The INTERTEXE Flow
        </h2>
        <p className="text-[15px] text-[var(--platform-muted)] font-light max-w-xl mb-10 lg:mb-12">
          One product. A complete lifecycle — from source data to the passport your customer scans. Select a stage
          to open its record.
        </p>
        <div className="demo-editorial-flow-grid" role="tablist" aria-label="INTERTEXE flow stages">
          {FLOW_STEPS.map((step, index) => {
            const selected = activeStep === step.id;
            return (
              <button
                key={step.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => selectStep(step.id)}
                className={`demo-editorial-flow-step demo-editorial-flow-step--interactive ${selected ? "is-active" : ""}`}
              >
                {index > 0 ? <span className="demo-editorial-flow-arrow" aria-hidden>→</span> : null}
                <p className="demo-editorial-flow-num">{step.num}</p>
                <p className="demo-editorial-flow-title">{step.title}</p>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
