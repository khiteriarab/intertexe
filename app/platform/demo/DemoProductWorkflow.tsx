"use client";

import { useState, type ReactNode } from "react";
import { DEMO_FEATURED } from "../../../lib/material-intelligence/demo-featured";
import { SERIF } from "../platform-ui";

export const FLOW_STEPS = [
  {
    id: "source",
    num: "01",
    title: "Source",
    headline: "Fragmented inputs, one product.",
    copy: "Ingest product data from PLM, ERP, suppliers, or your existing systems — preserved as submitted.",
  },
  {
    id: "normalize",
    num: "02",
    title: "Normalize",
    headline: "Messy strings become structured intelligence.",
    copy: "Clean, enrich, and standardize key product attributes and material composition without overwriting source strings.",
  },
  {
    id: "validate",
    num: "03",
    title: "Validate",
    headline: "Issues surfaced, never hidden.",
    copy: "Flag missing data, ensure compliance, and add verified evidence before anything reaches the consumer.",
  },
  {
    id: "publish",
    num: "04",
    title: "Publish",
    headline: "Publish once. Power every channel.",
    copy: "Turn approved product data into a digital product passport for your website, app, QR code, and partner channels.",
  },
  {
    id: "activate",
    num: "05",
    title: "Activate",
    headline: "Power every channel.",
    copy: "Hosted passport, white-label domain, headless API — the same record powers your website, app, and resale partners.",
  },
  {
    id: "measure",
    num: "06",
    title: "Measure",
    headline: "Track, benchmark, improve.",
    copy: "Compare fiber mix, composition quality, passport performance, and market readiness against governed peer datasets over time.",
  },
] as const;

export type FlowStepId = (typeof FLOW_STEPS)[number]["id"];

function StepIcon({ id }: { id: FlowStepId }) {
  const cls = "h-4 w-4";
  if (id === "source") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <ellipse cx="12" cy="6" rx="8" ry="3" />
        <path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
      </svg>
    );
  }
  if (id === "normalize") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path d="M12 3 14.5 8.5 20 9l-4 3.5L17 18l-5-3-5 3 1-5.5L4 9l5.5-.5L12 3Z" />
      </svg>
    );
  }
  if (id === "validate") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
        <path d="m9 14 2 2 4-4" />
      </svg>
    );
  }
  if (id === "publish") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path d="M12 3 20 7v10l-8 4-8-4V7l8-4Z" />
      </svg>
    );
  }
  if (id === "activate") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <path d="M11 18h2" />
      </svg>
    );
  }
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />
    </svg>
  );
}

function WorkflowPanel({
  step,
  children,
}: {
  step: (typeof FLOW_STEPS)[number];
  children: ReactNode;
}) {
  return (
    <article
      id={`workflow-${step.id}`}
      className="demo-workflow-panel scroll-mt-32"
      data-workflow-step={step.id}
    >
      <div className="demo-workflow-panel-inner">
        <p className="demo-workflow-panel-meta">
          {step.num} · {step.title}
        </p>
        <h3 className="demo-workflow-panel-title" style={SERIF}>
          {step.headline}
        </h3>
        <p className="demo-workflow-panel-copy">{step.copy}</p>
        <div className="demo-workflow-panel-visual">{children}</div>
      </div>
    </article>
  );
}

export function DemoProductWorkflow() {
  const [activeStep, setActiveStep] = useState<FlowStepId>("source");

  return (
    <section id="journey" className="demo-workflow-chart scroll-mt-24 border-y border-[var(--platform-border)]/70">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 pt-12 sm:pt-14 lg:pt-16 pb-6">
        <p className="text-[10px] tracking-[0.24em] uppercase text-[var(--platform-quiet)] mb-3">Follow the record</p>
        <h2 className="text-[1.75rem] sm:text-[2.35rem] font-light max-w-2xl leading-[1.12] mb-3" style={SERIF}>
          One product. A complete lifecycle.
        </h2>
        <p className="text-[15px] text-[var(--platform-muted)] font-light max-w-xl">
          Select a stage to inspect the {DEMO_FEATURED.name} record — from messy inputs to the passport your
          customer scans.
        </p>
      </div>

      <div className="demo-workflow-layout max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 pb-12 sm:pb-16 lg:pb-20">
        <nav className="demo-workflow-rail" aria-label="Product workflow steps">
          <ol className="demo-workflow-rail-list">
            {FLOW_STEPS.map((step, index) => {
              const active = activeStep === step.id;
              return (
                <li key={step.id} className="demo-workflow-rail-item">
                  <button
                    type="button"
                    onClick={() => setActiveStep(step.id)}
                    aria-current={active ? "step" : undefined}
                    className={`demo-workflow-rail-btn ${active ? "is-active" : ""}`}
                  >
                    <span className="demo-workflow-rail-icon" aria-hidden>
                      <StepIcon id={step.id} />
                    </span>
                    <span className="demo-workflow-rail-text">
                      <span className="demo-workflow-rail-num">{step.num}</span>
                      <span className="demo-workflow-rail-title">{step.title}</span>
                    </span>
                  </button>
                  {index < FLOW_STEPS.length - 1 ? (
                    <span className="demo-workflow-rail-connector" aria-hidden />
                  ) : null}
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="demo-workflow-panels">
          {activeStep === "source" ? (
          <WorkflowPanel step={FLOW_STEPS[0]}>
            <img
              src="/platform/demo-source.png"
              alt="Fragmented inputs from PLM, ERP, spreadsheet, supplier file, and retailer feed converging into one INTERTEXE product record"
              width={1672}
              height={941}
              className="w-full rounded-xl border border-[var(--platform-border)]"
            />
          </WorkflowPanel>
          ) : null}

          {activeStep === "normalize" ? (
          <WorkflowPanel step={FLOW_STEPS[1]}>
            <img
              src="/platform/demo-normalize.png"
              alt="INTERTEXE issues workspace resolving a composition conflict — current approved vs incoming source with normalized-record recommendation"
              width={1672}
              height={941}
              className="w-full rounded-xl border border-[var(--platform-border)]"
            />
          </WorkflowPanel>
          ) : null}

          {activeStep === "validate" ? (
          <WorkflowPanel step={FLOW_STEPS[2]}>
            <img
              src="/platform/demo-validate.png"
              alt="INTERTEXE product workspace with key indicators — traceability, compliance, recyclability, and environmental impact for a ready-to-publish record"
              width={1600}
              height={900}
              className="w-full rounded-xl border border-[var(--platform-border)]"
            />
          </WorkflowPanel>
          ) : null}

          {activeStep === "publish" ? (
          <WorkflowPanel step={FLOW_STEPS[3]}>
            <img
              src="/platform/demo-publish.png"
              alt="Publish once — digital product passport powering web, QR, mobile app, API, and retail channels"
              width={1672}
              height={941}
              className="w-full rounded-xl border border-[var(--platform-border)]"
            />
          </WorkflowPanel>
          ) : null}

          {activeStep === "activate" ? (
          <WorkflowPanel step={FLOW_STEPS[4]}>
            <img
              src="/platform/demo-activate.png"
              alt="INTERTEXE product record with preview QR and full source-to-next-life lifecycle — publish to activate across channels"
              width={1600}
              height={900}
              className="w-full rounded-xl border border-[var(--platform-border)]"
            />
          </WorkflowPanel>
          ) : null}

          {activeStep === "measure" ? (
          <WorkflowPanel step={FLOW_STEPS[5]}>
            <img
              src="/platform/demo-measure.png"
              alt="Material Benchmark dashboard — governed record coverage, peer medians, consumer signals, and passport performance"
              width={1672}
              height={941}
              className="w-full rounded-xl border border-[var(--platform-border)]"
            />
          </WorkflowPanel>
          ) : null}
        </div>
      </div>
    </section>
  );
}
