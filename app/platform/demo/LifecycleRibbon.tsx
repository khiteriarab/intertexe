"use client";

import { motion } from "framer-motion";
import {
  LIFECYCLE_CANVAS,
  LIFECYCLE_RIBBON_D,
  LIFECYCLE_STAGES,
  LIFECYCLE_TRAVEL_MS,
} from "./lifecycle-data";

/**
 * Single continuous ribbon. Base path is always visible.
 * Accent path draws to `drawProgress` (0 = start, 1 = full ribbon).
 * Segment progress: stage i active ≈ (i) / (n-1) at the node; travel animates toward next.
 */
export function LifecycleRibbon({
  drawProgress,
  reducedMotion,
}: {
  drawProgress: number;
  reducedMotion: boolean;
}) {
  const { width, height } = LIFECYCLE_CANVAS;
  const clamped = Math.min(1, Math.max(0, drawProgress));

  return (
    <svg
      className="plc-ribbon"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      aria-hidden
    >
      <path className="plc-ribbon-base" d={LIFECYCLE_RIBBON_D} fill="none" />
      {reducedMotion ? (
        <path
          className="plc-ribbon-accent"
          d={LIFECYCLE_RIBBON_D}
          fill="none"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - clamped}
        />
      ) : (
        <motion.path
          className="plc-ribbon-accent"
          d={LIFECYCLE_RIBBON_D}
          fill="none"
          pathLength={1}
          initial={false}
          animate={{ pathLength: clamped }}
          transition={{ duration: LIFECYCLE_TRAVEL_MS / 1000, ease: [0.4, 0, 0.2, 1] }}
        />
      )}

      {LIFECYCLE_STAGES.map((stage, i) => {
        const threshold = i / Math.max(1, LIFECYCLE_STAGES.length - 1);
        const lit = clamped >= threshold - 0.001;
        return (
          <circle
            key={stage.id}
            className={`plc-ribbon-joint${lit ? " is-lit" : ""}`}
            cx={stage.point.x}
            cy={stage.point.y}
            r={5}
          />
        );
      })}

      <text className="plc-ribbon-mark" x={width / 2} y={height / 2 - 8} textAnchor="middle">
        INTERTEXE
      </text>
    </svg>
  );
}

/** Progress along the ribbon at a given stage index (node centers). */
export function progressForStage(index: number): number {
  const n = LIFECYCLE_STAGES.length;
  if (n <= 1) return 1;
  return index / (n - 1);
}
