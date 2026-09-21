"use client";

import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import { SERIF } from "../platform-ui";
import {
  LIFECYCLE_PATH_D,
  LIFECYCLE_STAGES,
  LIFECYCLE_TRAVEL_MS,
  LIFECYCLE_VIEW,
  pointAtProgress,
  stageAnchor,
} from "./lifecycle-data";

export function LifecycleDiagram({
  activeIndex,
  drawProgress,
  reducedMotion,
  onSelect,
}: {
  activeIndex: number;
  drawProgress: number;
  reducedMotion: boolean;
  onSelect: (index: number) => void;
}) {
  const { width, height } = LIFECYCLE_VIEW;
  const clamped = Math.min(1, Math.max(0, drawProgress));
  const traveler = pointAtProgress(clamped);

  return (
    <div className="plc-track" style={{ aspectRatio: `${width} / ${height}` }}>
      <svg className="plc-track-svg" viewBox={`0 0 ${width} ${height}`} aria-hidden>
        <path className="plc-track-base" d={LIFECYCLE_PATH_D} fill="none" />
        {reducedMotion ? (
          <path
            className="plc-track-accent"
            d={LIFECYCLE_PATH_D}
            fill="none"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - clamped}
          />
        ) : (
          <motion.path
            className="plc-track-accent"
            d={LIFECYCLE_PATH_D}
            fill="none"
            pathLength={1}
            initial={false}
            animate={{ pathLength: clamped }}
            transition={{ duration: LIFECYCLE_TRAVEL_MS / 1000, ease: [0.4, 0, 0.2, 1] }}
          />
        )}

        {LIFECYCLE_STAGES.map((_, i) => {
          const { x, y } = stageAnchor(i);
          const lit = clamped >= i / Math.max(1, LIFECYCLE_STAGES.length - 1) - 0.001;
          const isActive = i === activeIndex;
          return (
            <circle
              key={LIFECYCLE_STAGES[i].id}
              className={`plc-anchor${lit ? " is-lit" : ""}${isActive ? " is-active" : ""}`}
              cx={x}
              cy={y}
              r={isActive ? 5.5 : 3.5}
            />
          );
        })}

        <motion.circle
          className="plc-traveler"
          r="5"
          initial={false}
          animate={{ cx: traveler.x, cy: traveler.y }}
          transition={
            reducedMotion
              ? { duration: 0 }
              : { duration: LIFECYCLE_TRAVEL_MS / 1000, ease: [0.4, 0, 0.2, 1] }
          }
        />
      </svg>

      <div className="plc-stages">
        {LIFECYCLE_STAGES.map((stage, index) => {
          const { x, y } = stageAnchor(index);
          const active = index === activeIndex;
          const style: CSSProperties = {
            left: `${(x / width) * 100}%`,
            top: `${(y / height) * 100}%`,
          };
          return (
            <button
              key={stage.id}
              type="button"
              className={`plc-stage plc-stage--${stage.labelSide}${active ? " is-active" : ""}`}
              style={style}
              onClick={() => onSelect(index)}
              aria-current={active ? "step" : undefined}
            >
              <span className="plc-stage-num">{stage.number}</span>
              <span className="plc-stage-title" style={SERIF}>
                {stage.title}
              </span>
              <span className="plc-stage-desc">{stage.shortDescription}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
