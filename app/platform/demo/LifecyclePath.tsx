"use client";

import { LIFECYCLE_CONNECTORS, LIFECYCLE_STAGES } from "./lifecycle-data";

/**
 * Layer of SVG connectors for the desktop system map.
 * progress 0..1 fills the continuous path through all segments.
 * approachingIndex lights segments up to that connection.
 */
export function LifecyclePath({
  activeIndex,
  reducedMotion,
}: {
  activeIndex: number;
  reducedMotion: boolean;
}) {
  return (
    <svg className="plc-map-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      {LIFECYCLE_CONNECTORS.map((conn, i) => {
        const reached = activeIndex > conn.fromIndex;
        const approaching = activeIndex === conn.toIndex;
        const lit = reached || approaching;
        const fill = reducedMotion
          ? lit
            ? 1
            : 0
          : activeIndex <= conn.fromIndex
            ? 0
            : activeIndex >= conn.toIndex
              ? 1
              : 0.55;

        return (
          <g key={conn.id}>
            <path className="plc-map-track" d={conn.d} pathLength={1} />
            <path
              className={`plc-map-active${lit ? " is-lit" : ""}`}
              d={conn.d}
              pathLength={1}
              style={{
                strokeDasharray: 1,
                strokeDashoffset: 1 - fill,
                transition: reducedMotion
                  ? undefined
                  : "stroke-dashoffset 0.9s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease",
              }}
            />
          </g>
        );
      })}

      {LIFECYCLE_STAGES.map((stage, i) => {
        const lit = i <= activeIndex;
        return (
          <circle
            key={stage.id}
            className={`plc-map-joint${lit ? " is-lit" : ""}`}
            cx={stage.map.x}
            cy={stage.map.y}
            r="0.9"
          />
        );
      })}
    </svg>
  );
}
