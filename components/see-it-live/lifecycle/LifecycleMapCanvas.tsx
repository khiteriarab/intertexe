"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  LIFECYCLE_PATH_D,
  LIFECYCLE_STAGES,
  RECORD_STATES,
  type LifecycleStageId,
} from "./lifecycle-data";
import { CentralProductRecord } from "./CentralProductRecord";
import { LifecycleStageAnchor } from "./LifecycleStageAnchor";
import { StageMicroVisual } from "./StageMicroVisual";
import styles from "./lifecycle.module.css";

/** Soft placement of micro-visuals near their stages (percent). */
const MICRO_SLOTS: { id: LifecycleStageId; x: number; y: number }[] = [
  { id: "source", x: 4, y: 58 },
  { id: "clean", x: 18, y: 62 },
  { id: "trace", x: 34, y: 64 },
  { id: "prepare", x: 52, y: 66 },
  { id: "publish", x: 70, y: 58 },
  { id: "learn", x: 82, y: 66 },
  { id: "recirculate", x: 88, y: 78 },
];

export function LifecycleMapCanvas({
  activeIndex,
  onSelect,
}: {
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  const reducedMotion = useReducedMotion();
  const state = RECORD_STATES[activeIndex] ?? RECORD_STATES[0];

  return (
    <div className={styles.mapCanvas} role="region" aria-label="Product lifecycle system map">
      <svg className={styles.mapSvg} viewBox="0 0 1000 420" preserveAspectRatio="xMidYMid meet" aria-hidden>
        <defs>
          <linearGradient id="plc-path-fade" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d8d2c8" stopOpacity="0.35" />
            <stop offset="45%" stopColor="#c4a574" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#d8d2c8" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        <path
          d={LIFECYCLE_PATH_D}
          fill="none"
          stroke="url(#plc-path-fade)"
          strokeWidth="1.15"
          strokeLinecap="round"
        />

        {!reducedMotion ? (
          <motion.path
            d={LIFECYCLE_PATH_D}
            fill="none"
            stroke="#c4a574"
            strokeWidth="1.35"
            strokeLinecap="round"
            strokeDasharray="10 14"
            initial={{ strokeDashoffset: 0 }}
            animate={{ strokeDashoffset: -120 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            style={{ opacity: 0.55 }}
          />
        ) : null}

        {LIFECYCLE_STAGES.map((stage, index) => {
          const px = (stage.x / 100) * 1000;
          const py = (stage.y / 100) * 420;
          const on = index === activeIndex;
          return (
            <g key={stage.id}>
              <circle cx={px} cy={py} r={on ? 5.5 : 3.5} fill={on ? "#c4a574" : "#fcfbf8"} stroke={on ? "#c4a574" : "#d8d2c8"} strokeWidth="1.25" />
            </g>
          );
        })}
      </svg>

      {LIFECYCLE_STAGES.map((stage, index) => (
        <LifecycleStageAnchor
          key={stage.id}
          stage={stage}
          active={index === activeIndex}
          onSelect={() => onSelect(index)}
        />
      ))}

      <div className={styles.recordSlot}>
        <CentralProductRecord state={state} />
      </div>

      {MICRO_SLOTS.map((slot) => (
        <div
          key={slot.id}
          className={styles.microSlot}
          style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
        >
          <StageMicroVisual
            kind={slot.id}
            active={LIFECYCLE_STAGES[activeIndex]?.id === slot.id}
          />
        </div>
      ))}
    </div>
  );
}
