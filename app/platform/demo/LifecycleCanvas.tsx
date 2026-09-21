"use client";

import { LIFECYCLE_CANVAS, LIFECYCLE_STAGES } from "./lifecycle-data";
import { LifecycleDetailPanel } from "./LifecycleDetailPanel";
import { LifecycleMarker } from "./LifecycleMarker";
import { LifecycleRibbon } from "./LifecycleRibbon";

export function LifecycleCanvas({
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
  const stage = LIFECYCLE_STAGES[activeIndex];

  return (
    <div
      className="plc-canvas"
      style={{ aspectRatio: `${LIFECYCLE_CANVAS.width} / ${LIFECYCLE_CANVAS.height}` }}
    >
      <LifecycleRibbon drawProgress={drawProgress} reducedMotion={reducedMotion} />

      <div className="plc-markers">
        {LIFECYCLE_STAGES.map((s, index) => (
          <LifecycleMarker
            key={s.id}
            stage={s}
            active={index === activeIndex}
            onSelect={() => onSelect(index)}
          />
        ))}
      </div>

      <div className="plc-detail-slot">
        <LifecycleDetailPanel stage={stage} reducedMotion={reducedMotion} />
      </div>
    </div>
  );
}
