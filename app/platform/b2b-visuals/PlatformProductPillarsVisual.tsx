"use client";

import Link from "next/link";
import { useState } from "react";

type StepId =
  | "create"
  | "verify"
  | "comply"
  | "distribute"
  | "extend"
  | "analyze"
  | "recommend"
  | "act";

type JourneyStep = {
  id: StepId;
  phase: "govern" | "intelligence";
  index: number;
  label: string;
  hint: string;
  detail: string;
  cta: string;
  href: string;
};

const STEPS: JourneyStep[] = [
  {
    id: "create",
    phase: "govern",
    index: 1,
    label: "Create",
    hint: "Structure product data",
    detail:
      "Bring together materials, suppliers, manufacturing, and source files into one structured product record.",
    cta: "Explore product intelligence",
    href: "/platform/demo",
  },
  {
    id: "verify",
    phase: "govern",
    index: 2,
    label: "Verify",
    hint: "Find gaps early",
    detail: "Surface missing composition, incomplete traceability, and supplier evidence gaps before they become risk.",
    cta: "Explore product intelligence",
    href: "/platform/demo",
  },
  {
    id: "comply",
    phase: "govern",
    index: 3,
    label: "Comply",
    hint: "Prepare for regulation",
    detail:
      "Substantiate claims, trace manufacturing, and prepare product data for Digital Product Passports and evolving regulation.",
    cta: "Explore traceability",
    href: "/platform/demo",
  },
  {
    id: "distribute",
    phase: "govern",
    index: 4,
    label: "Distribute",
    hint: "One record, every channel",
    detail: "Publish through hosted passports, branded domains, or headless API — the same governed record everywhere.",
    cta: "Explore the lifecycle",
    href: "/platform/demo",
  },
  {
    id: "extend",
    phase: "govern",
    index: 5,
    label: "Extend",
    hint: "After the sale",
    detail: "Power care, repair, resale, transfer, and next-life pathways from the same product record.",
    cta: "Explore the lifecycle",
    href: "/platform/demo",
  },
  {
    id: "analyze",
    phase: "intelligence",
    index: 6,
    label: "Analyze",
    hint: "See what matters",
    detail: "INTERTEXE AI reads your governed catalog to surface patterns, risks, and opportunities.",
    cta: "See it in action",
    href: "/platform/demo",
  },
  {
    id: "recommend",
    phase: "intelligence",
    index: 7,
    label: "Recommend",
    hint: "Prioritize action",
    detail: "Get ranked recommendations with confidence scores linked to evidence in your workspace.",
    cta: "See it in action",
    href: "/platform/demo",
  },
  {
    id: "act",
    phase: "intelligence",
    index: 8,
    label: "Act",
    hint: "Execute with proof",
    detail: "Move from insight to action — allocation, sourcing, compliance fixes — without leaving the governed record.",
    cta: "See it in action",
    href: "/platform/demo",
  },
];

function StepIcon({ id }: { id: StepId }) {
  const cls = "h-5 w-5";
  switch (id) {
    case "create":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <ellipse cx="12" cy="6" rx="7" ry="3" />
          <path d="M5 6v4c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
          <path d="M5 10v4c0 1.7 3.1 3 7 3s7-1.3 7-3v-4" />
        </svg>
      );
    case "verify":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <path d="M12 9v4M12 17h.01" />
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        </svg>
      );
    case "comply":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <path d="M12 2l7 4v6c0 5-3.5 9-7 10-3.5-1-7-5-7-10V6l7-4z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    case "distribute":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <path d="M9 8h6M9 12h6M9 16h4" />
        </svg>
      );
    case "extend":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <path d="M4 12a8 8 0 0 1 13.5-5.7M20 12a8 8 0 0 1-13.5 5.7" />
          <path d="M17 3h3v3M7 21H4v-3" />
        </svg>
      );
    case "analyze":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />
        </svg>
      );
    case "recommend":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      );
    case "act":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M10 8l6 4-6 4V8z" />
        </svg>
      );
  }
}

function JourneyNode({ step, flipped, onToggle }: { step: JourneyStep; flipped: boolean; onToggle: () => void }) {
  return (
    <div className="platform-journey-node-wrap">
      <button
        type="button"
        className={`platform-journey-node ${flipped ? "is-flipped" : ""}`}
        aria-pressed={flipped}
        onClick={onToggle}
      >
        <span className="platform-journey-node-inner">
          <span className="platform-journey-node-face platform-journey-node-front">
            <span className="platform-journey-node-icon" aria-hidden>
              <StepIcon id={step.id} />
            </span>
            <span className="platform-journey-node-index">{String(step.index).padStart(2, "0")}</span>
            <span className="platform-journey-node-label">{step.label}</span>
            <span className="platform-journey-node-hint">{step.hint}</span>
            <span className="platform-journey-node-more">Learn more</span>
          </span>
          <span className="platform-journey-node-face platform-journey-node-back">
            <span className="platform-journey-node-back-label">{step.label}</span>
            <p className="platform-journey-node-detail">{step.detail}</p>
            <Link href={step.href} className="platform-journey-node-cta" onClick={(e) => e.stopPropagation()}>
              {step.cta} →
            </Link>
          </span>
        </span>
      </button>
    </div>
  );
}

export function PlatformProductPillarsVisual() {
  const [flippedId, setFlippedId] = useState<StepId | null>(null);

  return (
    <div className="platform-journey-map">
      <div className="platform-journey-map-scroll" tabIndex={0} aria-label="Product lifecycle journey map">
        <div className="platform-journey-map-rail" aria-hidden />
        <div className="platform-journey-map-track">
          {STEPS.map((step, i) => (
            <div key={step.id} className={`platform-journey-segment platform-journey-segment--${step.phase}`}>
              {i === 5 ? (
                <div className="platform-journey-bridge-node" aria-hidden>
                  <span className="platform-journey-bridge-dot" />
                  <span className="platform-journey-bridge-text">Trusted record</span>
                </div>
              ) : null}
              <JourneyNode
                step={step}
                flipped={flippedId === step.id}
                onToggle={() => setFlippedId((current) => (current === step.id ? null : step.id))}
              />
              {i < STEPS.length - 1 ? (
                <span className="platform-journey-connector" aria-hidden>
                  <span className="platform-journey-connector-line" />
                  <span className="platform-journey-connector-arrow">→</span>
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="platform-journey-map-legend">
        <span>Govern the record</span>
        <span className="platform-journey-map-legend-divider" aria-hidden>·</span>
        <span>Intelligence layer</span>
      </div>
      <p className="platform-journey-map-hint">Scroll the map · tap a step to learn more</p>
    </div>
  );
}
