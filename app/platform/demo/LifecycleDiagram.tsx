"use client";

import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import { SERIF } from "../platform-ui";
import {
  LIFECYCLE_PATH_D,
  LIFECYCLE_STAGES,
  LIFECYCLE_TRAVEL_MS,
  LIFECYCLE_VIEW,
  type LifecycleStage,
} from "./lifecycle-data";

function labelStyle(stage: LifecycleStage): CSSProperties {
  const { x, y, label } = stage.anchor;
  const base: CSSProperties = { left: x, top: y };
  if (label === "above") return { ...base, transform: "translate(-50%, calc(-100% - 18px))" };
  if (label === "below") return { ...base, transform: "translate(-50%, 18px)" };
  if (label === "right") return { ...base, transform: "translate(16px, -50%)", textAlign: "left" };
  return { ...base, transform: "translate(calc(-100% - 16px), -50%)", textAlign: "right" };
}

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
  const active = LIFECYCLE_STAGES[activeIndex];

  return (
    <div className="plc-diagram" style={{ aspectRatio: `${width} / ${height}` }}>
      <svg className="plc-diagram-svg" viewBox={`0 0 ${width} ${height}`} aria-hidden>
        <path className="plc-path-base" d={LIFECYCLE_PATH_D} fill="none" />
        {reducedMotion ? (
          <path
            className="plc-path-accent"
            d={LIFECYCLE_PATH_D}
            fill="none"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - clamped}
          />
        ) : (
          <motion.path
            className="plc-path-accent"
            d={LIFECYCLE_PATH_D}
            fill="none"
            pathLength={1}
            initial={false}
            animate={{ pathLength: clamped }}
            transition={{ duration: LIFECYCLE_TRAVEL_MS / 1000, ease: [0.4, 0, 0.2, 1] }}
          />
        )}

        <text className="plc-watermark" x={width / 2} y={height / 2 + 8} textAnchor="middle">
          INTERTEXE
        </text>

        <g className="plc-ambient">
          <circle cx="880" cy="145" r="18" fill="none" strokeWidth="1" />
          <circle cx="896" cy="160" r="11" fill="none" strokeWidth="1" />
          <circle cx="200" cy="470" r="16" fill="none" strokeWidth="1" />
        </g>

        {LIFECYCLE_STAGES.map((stage, i) => {
          const lit = clamped >= i / Math.max(1, LIFECYCLE_STAGES.length - 1) - 0.001;
          const isActive = i === activeIndex;
          return (
            <circle
              key={stage.id}
              className={`plc-dot${lit ? " is-lit" : ""}${isActive ? " is-active" : ""}`}
              cx={stage.anchor.x}
              cy={stage.anchor.y}
              r={isActive ? 6 : 3.5}
            />
          );
        })}
      </svg>

      <div className="plc-labels">
        {LIFECYCLE_STAGES.map((stage, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={stage.id}
              type="button"
              className={`plc-label plc-label--${stage.anchor.label}${isActive ? " is-active" : ""}`}
              style={labelStyle(stage)}
              onClick={() => onSelect(index)}
              aria-current={isActive ? "step" : undefined}
            >
              <span className="plc-label-num">{stage.number}</span>
              <span className="plc-label-title" style={SERIF}>
                {stage.title}
              </span>
              <span className="plc-label-short">{stage.shortDescription}</span>
            </button>
          );
        })}
      </div>

      <div className="plc-dot-hits">
        {LIFECYCLE_STAGES.map((stage, index) => (
          <button
            key={`hit-${stage.id}`}
            type="button"
            className="plc-dot-hit"
            style={{ left: stage.anchor.x, top: stage.anchor.y }}
            onClick={() => onSelect(index)}
            aria-label={stage.title}
          />
        ))}
      </div>

      <span className="sr-only">Current stage: {active.title}</span>
    </div>
  );
}
