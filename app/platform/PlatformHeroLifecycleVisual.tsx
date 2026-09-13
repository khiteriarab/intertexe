"use client";

type HeroHotspot = {
  id: string;
  lifecycleX: number;
  lifecycleY: number;
  targetX: number;
  targetY: number;
  curve: number;
  callout: string;
};

/**
 * Overlay coordinates tuned to hero-lifecycle-experience.jpg (1024×768).
 * The image is cropped to the right-hand visual in CSS — these x values sit in that crop.
 */
export const HERO_LIFECYCLE_HOTSPOTS: HeroHotspot[] = [
  {
    id: "trace",
    lifecycleX: 12,
    lifecycleY: 84,
    targetX: 30,
    targetY: 40,
    curve: -14,
    callout: "Scan — a physical product connects to a digital record.",
  },
  {
    id: "measure",
    lifecycleX: 28,
    lifecycleY: 84,
    targetX: 52,
    targetY: 28,
    curve: -10,
    callout: "Material impact — benchmark fiber mix and CO₂e against peers.",
  },
  {
    id: "govern",
    lifecycleX: 44,
    lifecycleY: 84,
    targetX: 58,
    targetY: 36,
    curve: -8,
    callout: "Governed record — one product record, conflicts surfaced, never overwritten.",
  },
  {
    id: "publish",
    lifecycleX: 62,
    lifecycleY: 84,
    targetX: 86,
    targetY: 46,
    curve: 12,
    callout: "A digital passport — trusted product information in your customer's hands.",
  },
  {
    id: "next-life",
    lifecycleX: 80,
    lifecycleY: 84,
    targetX: 84,
    targetY: 60,
    curve: 8,
    callout: "Next life — resale, ownership transfer, and circular insights.",
  },
];

function arrowPath(fromX: number, fromY: number, toX: number, toY: number, curve: number) {
  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2 + curve;
  return `M ${fromX} ${fromY} Q ${midX} ${midY} ${toX} ${toY}`;
}

export function PlatformHeroLifecycleVisual({
  stageIndex,
  className = "",
}: {
  stageIndex: number;
  className?: string;
}) {
  const hotspot = HERO_LIFECYCLE_HOTSPOTS[stageIndex] ?? HERO_LIFECYCLE_HOTSPOTS[0];

  return (
    <div className={`platform-hero-lifecycle ${className}`}>
      <div className="platform-hero-lifecycle-frame">
        <img
          src="/platform/hero-lifecycle-experience.jpg"
          alt="INTERTEXE lifecycle — scan a hangtag, govern product data in the workspace, publish a digital passport"
          width={1024}
          height={768}
          className="platform-hero-lifecycle-image"
          loading="eager"
          decoding="async"
        />

        <svg
          className="platform-hero-lifecycle-svg"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
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

          <circle
            cx={hotspot.lifecycleX}
            cy={hotspot.lifecycleY}
            r="2.8"
            className="platform-hero-lifecycle-node"
          />
          <circle cx={hotspot.targetX} cy={hotspot.targetY} r="1.6" className="platform-hero-lifecycle-target" />
          <path
            d={arrowPath(hotspot.lifecycleX, hotspot.lifecycleY, hotspot.targetX, hotspot.targetY, hotspot.curve)}
            className="platform-hero-lifecycle-arrow"
            markerEnd="url(#platform-hero-arrowhead)"
          />
        </svg>

        <div
          className="platform-hero-lifecycle-highlight"
          style={{
            left: `${hotspot.lifecycleX}%`,
            top: `${hotspot.lifecycleY}%`,
          }}
          aria-hidden
        />
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {hotspot.callout}
      </p>
    </div>
  );
}
