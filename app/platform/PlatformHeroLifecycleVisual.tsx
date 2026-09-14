"use client";

export const HERO_LIFECYCLE_STEPS = [
  {
    id: "raw-materials",
    label: "Raw Materials",
    detail: "Fiber origin & certifications",
    icon: "leaf" as const,
  },
  {
    id: "production",
    label: "Production",
    detail: "Mills, factories & processes",
    icon: "factory" as const,
  },
  {
    id: "product-data",
    label: "Product Data",
    detail: "Rich, governed product records",
    icon: "doc" as const,
  },
  {
    id: "compliance",
    label: "Compliance",
    detail: "Regulations, claims & traceability",
    icon: "shield" as const,
  },
  {
    id: "customer",
    label: "Customer Experience",
    detail: "Scan, digital passport, care",
    icon: "scan" as const,
  },
  {
    id: "resale",
    label: "Resale & Second Life",
    detail: "Recommerce & reuse",
    icon: "cycle" as const,
  },
  {
    id: "circular",
    label: "Circular Insights",
    detail: "Impact, reporting & what's next",
    icon: "insights" as const,
  },
] as const;

/** Tab index → lifecycle step index + composite highlight + screen reader callout */
const STAGE_VISUAL = [
  {
    stepIndex: 0,
    targetX: 18,
    targetY: 38,
    callout: "Scan — a physical product connects to a digital record.",
  },
  {
    stepIndex: 0,
    targetX: 52,
    targetY: 28,
    callout: "Material impact — benchmark fiber mix and CO₂e against peers.",
  },
  {
    stepIndex: 2,
    targetX: 56,
    targetY: 30,
    callout: "Governed record — one product record, conflicts surfaced, never overwritten.",
  },
  {
    stepIndex: 4,
    targetX: 84,
    targetY: 36,
    callout: "A digital passport — trusted product information in your customer's hands.",
  },
  {
    stepIndex: 5,
    targetX: 84,
    targetY: 42,
    callout: "Next life — resale, ownership transfer, and circular insights.",
  },
] as const;

const RAIL_Y = 84;

function stepCenterX(index: number) {
  const count = HERO_LIFECYCLE_STEPS.length;
  const pad = 6.5;
  return pad + (index / (count - 1)) * (100 - pad * 2);
}

function arrowPath(fromX: number, fromY: number, toX: number, toY: number, curve: number) {
  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2 + curve;
  return `M ${fromX} ${fromY} Q ${midX} ${midY} ${toX} ${toY}`;
}

function StepIcon({ icon }: { icon: (typeof HERO_LIFECYCLE_STEPS)[number]["icon"] }) {
  const cls = "h-[22px] w-[22px]";
  switch (icon) {
    case "leaf":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path d="M12 22c4-4 8-7.5 8-12a8 8 0 1 0-16 0c0 4.5 4 8 8 12Z" />
          <path d="M12 10v4" />
        </svg>
      );
    case "factory":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path d="M3 21V8l5-3 5 3v13" />
          <path d="M13 21V11l8-4v14" />
          <path d="M7 10h2M7 14h2M15 12h2M15 16h2" />
        </svg>
      );
    case "doc":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
          <rect x="9" y="3" width="6" height="4" rx="1" />
        </svg>
      );
    case "shield":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path d="M12 3 3 7v6c0 5 4.5 8 9 8s9-3 9-8V7l-9-4Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case "scan":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <rect x="5" y="2" width="14" height="20" rx="2" />
          <path d="M9 6h6M9 18h6" />
        </svg>
      );
    case "cycle":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path d="M7 7h10v10" />
          <path d="M7 17 17 7" />
        </svg>
      );
    default:
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />
        </svg>
      );
  }
}

export function PlatformHeroLifecycleVisual({
  stageIndex,
  className = "",
}: {
  stageIndex: number;
  className?: string;
}) {
  const visual = STAGE_VISUAL[stageIndex] ?? STAGE_VISUAL[0];
  const activeStepIndex = visual.stepIndex;
  const circleX = stepCenterX(activeStepIndex);
  const circleY = RAIL_Y;
  const curve = stageIndex === 3 ? 8 : stageIndex === 4 ? 6 : -10;

  return (
    <div className={`platform-hero-lifecycle ${className}`}>
      <div className="platform-hero-lifecycle-frame">
        <svg className="platform-hero-lifecycle-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          <defs>
            <marker
              id="platform-hero-arrowhead"
              markerWidth="6"
              markerHeight="6"
              refX="5"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L6,3 L0,6 Z" fill="var(--platform-accent)" />
            </marker>
          </defs>
          <path
            d={arrowPath(circleX, circleY, visual.targetX, visual.targetY, curve)}
            className="platform-hero-lifecycle-arrow"
            markerEnd="url(#platform-hero-arrowhead)"
          />
          <circle cx={visual.targetX} cy={visual.targetY} r="1.8" className="platform-hero-lifecycle-target" />
          <circle cx={circleX} cy={circleY} r="2.2" className="platform-hero-lifecycle-node" />
        </svg>

        <div className="platform-hero-lifecycle-composite">
          <img
            src="/platform/hero-lifecycle-composite.png"
            alt="Scan a hangtag, govern product data in the workspace, publish a digital passport"
            width={1600}
            height={900}
            className="platform-hero-lifecycle-composite-image"
            loading="eager"
            decoding="async"
          />
        </div>

        <div
          className="platform-hero-lifecycle-highlight"
          style={{ left: `${visual.targetX}%`, top: `${visual.targetY}%` }}
          aria-hidden
        />

        <div className="platform-hero-lifecycle-rail" aria-hidden={false}>
          <div className="platform-hero-lifecycle-rail-line" aria-hidden />
          <ol className="platform-hero-lifecycle-steps">
            {HERO_LIFECYCLE_STEPS.map((step, index) => {
              const active = index === activeStepIndex;
              return (
                <li
                  key={step.id}
                  className={`platform-hero-lifecycle-step ${active ? "is-active" : ""}`}
                  aria-current={active ? "step" : undefined}
                >
                  <span className="platform-hero-lifecycle-step-icon">
                    <StepIcon icon={step.icon} />
                  </span>
                  <span className="platform-hero-lifecycle-step-label">{step.label}</span>
                  <span className="platform-hero-lifecycle-step-detail">{step.detail}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {visual.callout}
      </p>
    </div>
  );
}
