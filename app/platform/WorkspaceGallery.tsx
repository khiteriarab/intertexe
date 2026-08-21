"use client";

import { useState, type ReactNode } from "react";

export type WorkspaceFrame = {
  id: string;
  label: string;
  caption?: string;
  children: ReactNode;
};

export function WorkspaceGallery({ frames }: { frames: WorkspaceFrame[] }) {
  const [activeId, setActiveId] = useState(frames[0]?.id ?? "");
  const current = frames.find((frame) => frame.id === activeId) ?? frames[0];

  if (!current) return null;

  return (
    <div>
      <div
        role="tablist"
        aria-label="Workspace preview"
        className="flex justify-center gap-1 sm:gap-2 overflow-x-auto pb-6 mb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {frames.map((frame) => {
          const selected = frame.id === current.id;
          return (
            <button
              key={frame.id}
              type="button"
              role="tab"
              aria-selected={selected}
              id={`workspace-tab-${frame.id}`}
              aria-controls={`workspace-panel-${frame.id}`}
              onClick={() => setActiveId(frame.id)}
              className={`shrink-0 text-[11px] sm:text-[13px] tracking-[0.06em] px-3 sm:px-4 py-2 min-h-[44px] border-b ${
                selected ? "border-[#152238] text-[#152238]" : "border-transparent text-[#8a847c]"
              }`}
            >
              {frame.label}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`workspace-panel-${current.id}`}
        aria-labelledby={`workspace-tab-${current.id}`}
      >
        {current.children}
        {current.caption ? (
          <p className="mt-3 text-xs text-[#8a847c] leading-relaxed text-center">{current.caption}</p>
        ) : null}
      </div>
    </div>
  );
}
