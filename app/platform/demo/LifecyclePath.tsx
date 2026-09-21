"use client";

import { useId } from "react";
import { LIFECYCLE_STAGES } from "./lifecycle-data";

/** Desktop center path + mobile left rail. Progress 0..1 fills to active stage. */
export function LifecyclePath({
  progress,
  reducedMotion,
}: {
  progress: number;
  reducedMotion: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const desktopId = `plc-desk-${uid}`;
  const mobileId = `plc-mob-${uid}`;

  // Vertical gently curved path through 7 nodes (viewBox 0 0 40 700)
  const desktopD =
    "M20 18 C 20 70, 28 95, 20 140 C 12 185, 20 210, 20 255 C 20 300, 28 325, 20 370 C 12 415, 20 440, 20 485 C 20 530, 28 555, 20 600 C 12 645, 20 670, 20 682";
  const mobileD = "M12 12 L12 688";

  const clamped = Math.min(1, Math.max(0, progress));

  return (
    <>
      <svg
        className="plc-path plc-path--desktop"
        viewBox="0 0 40 700"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path className="plc-path-track" d={desktopD} />
        <path
          className="plc-path-active"
          d={desktopD}
          pathLength={1}
          style={
            reducedMotion
              ? { strokeDasharray: 1, strokeDashoffset: 1 - clamped }
              : {
                  strokeDasharray: 1,
                  strokeDashoffset: 1 - clamped,
                  transition: "stroke-dashoffset 0.85s cubic-bezier(0.4, 0, 0.2, 1)",
                }
          }
        />
        {LIFECYCLE_STAGES.map((_, i) => {
          const y = 18 + (i * (682 - 18)) / (LIFECYCLE_STAGES.length - 1);
          const lit = clamped >= (i + 0.35) / LIFECYCLE_STAGES.length;
          return (
            <circle
              key={i}
              className={`plc-path-node${lit ? " is-lit" : ""}`}
              cx="20"
              cy={y}
              r="4.5"
            />
          );
        })}
        <defs>
          <linearGradient id={desktopId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--plc-accent)" />
            <stop offset="100%" stopColor="var(--plc-accent-deep)" />
          </linearGradient>
        </defs>
      </svg>

      <svg
        className="plc-path plc-path--mobile"
        viewBox="0 0 24 700"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path className="plc-path-track" d={mobileD} />
        <path
          className="plc-path-active"
          d={mobileD}
          pathLength={1}
          style={
            reducedMotion
              ? { strokeDasharray: 1, strokeDashoffset: 1 - clamped }
              : {
                  strokeDasharray: 1,
                  strokeDashoffset: 1 - clamped,
                  transition: "stroke-dashoffset 0.85s cubic-bezier(0.4, 0, 0.2, 1)",
                }
          }
        />
        {LIFECYCLE_STAGES.map((_, i) => {
          const y = 12 + (i * (688 - 12)) / (LIFECYCLE_STAGES.length - 1);
          const lit = clamped >= (i + 0.35) / LIFECYCLE_STAGES.length;
          return <circle key={i} className={`plc-path-node${lit ? " is-lit" : ""}`} cx="12" cy={y} r="4" />;
        })}
        <defs>
          <linearGradient id={mobileId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--plc-accent)" />
            <stop offset="100%" stopColor="var(--plc-accent-deep)" />
          </linearGradient>
        </defs>
      </svg>
    </>
  );
}
