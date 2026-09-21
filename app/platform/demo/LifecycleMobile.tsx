"use client";

import { SERIF } from "../platform-ui";
import { LIFECYCLE_STAGES } from "./lifecycle-data";
import { LifecycleEditorial } from "./LifecycleEditorial";

export function LifecycleMobile({
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
  return (
    <div className="plc-mobile" role="list">
      <div className="plc-mobile-rail" aria-hidden>
        <div
          className="plc-mobile-rail-fill"
          style={{
            height: `${drawProgress * 100}%`,
            transition: reducedMotion ? undefined : "height 0.9s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </div>

      {LIFECYCLE_STAGES.map((stage, index) => {
        const active = index === activeIndex;
        return (
          <div key={stage.id} className={`plc-mobile-row${active ? " is-active" : ""}`} role="listitem">
            <button type="button" className="plc-mobile-stage" onClick={() => onSelect(index)}>
              <span className="plc-stage-num">{stage.number}</span>
              <span className="plc-stage-title" style={SERIF}>
                {stage.title}
              </span>
              <span className="plc-stage-desc">{stage.shortDescription}</span>
            </button>
            {active ? (
              <div className="plc-mobile-detail">
                <LifecycleEditorial stage={stage} reducedMotion={reducedMotion} />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
