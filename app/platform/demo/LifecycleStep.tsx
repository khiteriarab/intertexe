"use client";

import { SERIF } from "../platform-ui";
import type { LifecycleStage } from "./lifecycle-data";
import { LifecycleChips } from "./LifecycleChips";
import { LifecycleVisual } from "./LifecycleVisual";

export function LifecycleStep({
  stage,
  index,
  active,
  onSelect,
}: {
  stage: LifecycleStage;
  index: number;
  active: boolean;
  onSelect: () => void;
}) {
  const odd = index % 2 === 0;

  return (
    <article
      className={`plc-step${odd ? " is-odd" : " is-even"}${active ? " is-active" : ""}`}
      data-stage={stage.id}
    >
      <button type="button" className="plc-step-hit" onClick={onSelect} aria-current={active ? "step" : undefined}>
        <span className="sr-only">Show {stage.title}</span>
      </button>

      <div className="plc-step-copy">
        <p className="plc-step-kicker">
          {String(index + 1).padStart(2, "0")}
        </p>
        <h3 className="plc-step-title" style={SERIF}>
          {stage.title}
        </h3>
        <p className="plc-step-body">{stage.copy}</p>
        <LifecycleChips chips={stage.chips} active={active} />
        <p className={`plc-step-status${active ? " is-visible" : ""}`}>{stage.statusLine}</p>
      </div>

      <div className="plc-step-node" aria-hidden>
        <span className={`plc-step-dot${active ? " is-active" : ""}`} />
      </div>

      <div className="plc-step-visual">
        <LifecycleVisual stageId={stage.id} active={active} />
      </div>
    </article>
  );
}
