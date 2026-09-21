"use client";

import { LIFECYCLE_STAGES } from "./lifecycle-data";
import { LifecycleNode, type NodePhase } from "./LifecycleNode";
import { LifecyclePath } from "./LifecyclePath";

export function LifecycleMap({
  activeIndex,
  onSelect,
  reducedMotion,
}: {
  activeIndex: number;
  onSelect: (index: number) => void;
  reducedMotion: boolean;
}) {
  return (
    <>
      <div className="plc-map" role="list" aria-label="INTERTEXE product lifecycle map">
        <LifecyclePath activeIndex={activeIndex} reducedMotion={reducedMotion} />
        {LIFECYCLE_STAGES.map((stage, index) => {
          let phase: NodePhase = "inactive";
          if (index === activeIndex) phase = "active";
          else if (index === (activeIndex + 1) % LIFECYCLE_STAGES.length) phase = "approaching";

          return (
            <LifecycleNode
              key={stage.id}
              stage={stage}
              phase={phase}
              layout="map"
              reducedMotion={reducedMotion}
              onSelect={() => onSelect(index)}
            />
          );
        })}
      </div>

      <div className="plc-stack" role="list" aria-label="INTERTEXE product lifecycle">
        <div className="plc-stack-rail" aria-hidden>
          <div
            className="plc-stack-rail-fill"
            style={{
              height: `${((activeIndex + 1) / LIFECYCLE_STAGES.length) * 100}%`,
              transition: reducedMotion ? undefined : "height 0.85s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        </div>
        {LIFECYCLE_STAGES.map((stage, index) => {
          const phase: NodePhase =
            index === activeIndex
              ? "active"
              : index === (activeIndex + 1) % LIFECYCLE_STAGES.length
                ? "approaching"
                : "inactive";
          return (
            <LifecycleNode
              key={stage.id}
              stage={stage}
              phase={phase}
              layout="stack"
              reducedMotion={reducedMotion}
              onSelect={() => onSelect(index)}
            />
          );
        })}
      </div>
    </>
  );
}
