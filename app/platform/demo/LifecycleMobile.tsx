"use client";

import { LIFECYCLE_STAGES } from "./lifecycle-data";
import { LifecycleDetailPanel } from "./LifecycleDetailPanel";
import { SERIF } from "../platform-ui";

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
  const n = LIFECYCLE_STAGES.length;
  const fill = `${drawProgress * 100}%`;

  return (
    <div className="plc-mobile" role="list">
      <div className="plc-mobile-rail" aria-hidden>
        <div
          className="plc-mobile-rail-fill"
          style={{
            height: fill,
            transition: reducedMotion ? undefined : "height 1.05s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </div>

      {LIFECYCLE_STAGES.map((stage, index) => {
        const active = index === activeIndex;
        return (
          <div key={stage.id} className={`plc-mobile-row${active ? " is-active" : ""}`} role="listitem">
            <button type="button" className="plc-mobile-marker" onClick={() => onSelect(index)}>
              <span className="plc-marker-num">{stage.number}</span>
              <span className="plc-marker-title" style={SERIF}>
                {stage.title}
              </span>
              <span className="plc-marker-short">{stage.shortDescription}</span>
            </button>
            {active ? (
              <div className="plc-mobile-detail">
                <LifecycleDetailPanel stage={stage} reducedMotion={reducedMotion} />
              </div>
            ) : null}
            {/* keep rail length proportional */}
            <span className="sr-only">
              Stage {index + 1} of {n}
            </span>
          </div>
        );
      })}
    </div>
  );
}
