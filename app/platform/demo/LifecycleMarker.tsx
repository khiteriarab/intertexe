"use client";

import { SERIF } from "../platform-ui";
import type { LifecycleStage } from "./lifecycle-data";

export function LifecycleMarker({
  stage,
  active,
  onSelect,
}: {
  stage: LifecycleStage;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`plc-marker${active ? " is-active" : ""}`}
      style={{ left: stage.point.x, top: stage.point.y }}
      onClick={onSelect}
      aria-current={active ? "step" : undefined}
    >
      <span className="plc-marker-num">{stage.number}</span>
      <span className="plc-marker-title" style={SERIF}>
        {stage.title}
      </span>
      <span className="plc-marker-short">{stage.shortDescription}</span>
    </button>
  );
}
