"use client";

import { motion } from "framer-motion";
import { SERIF } from "../platform-ui";
import type { LifecycleStage } from "./lifecycle-data";
import { LifecycleMicroVisual } from "./LifecycleMicroVisual";
import { LifecycleTerms } from "./LifecycleTerms";

export type NodePhase = "inactive" | "approaching" | "active";

export function LifecycleNode({
  stage,
  phase,
  layout,
  onSelect,
  reducedMotion,
}: {
  stage: LifecycleStage;
  phase: NodePhase;
  layout: "map" | "stack";
  onSelect: () => void;
  reducedMotion: boolean;
}) {
  const active = phase === "active";
  const approaching = phase === "approaching";

  const positionStyle =
    layout === "map"
      ? ({
          left: `${stage.map.x}%`,
          top: `${stage.map.y}%`,
        } as const)
      : undefined;

  return (
    <div className={`plc-node-slot plc-node-slot--${layout}`} style={positionStyle}>
      <motion.article
        className={`plc-node plc-node--${layout} is-${phase}`}
        data-stage={stage.id}
        animate={
          reducedMotion
            ? undefined
            : {
                scale: active ? 1.18 : approaching ? 1.06 : 1,
                opacity: active ? 1 : approaching ? 0.9 : 0.58,
              }
        }
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
      >
        <button
          type="button"
          className="plc-node-hit"
          onClick={onSelect}
          aria-current={active ? "step" : undefined}
        >
          <header className="plc-node-head">
            <span className="plc-node-num">{stage.number}</span>
            <h3 className="plc-node-title" style={SERIF}>
              {stage.title}
            </h3>
          </header>
          <p className="plc-node-short">{stage.shortDescription}</p>
        </button>

        <div className={`plc-node-detail${active ? " is-open" : approaching ? " is-peek" : ""}`}>
          <p className="plc-node-desc">{stage.description}</p>
          <LifecycleMicroVisual type={stage.visualType} active={active} />
          <LifecycleTerms terms={stage.terms} visible={active} />
        </div>
      </motion.article>
    </div>
  );
}
