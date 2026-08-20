"use client";

import { useState, type ReactNode } from "react";
import { Frame } from "./platform-ui";

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
    <>
      <div className="lg:hidden">
        <div
          role="tablist"
          aria-label="Workspace preview"
          className="flex gap-2 overflow-x-auto pb-4 -mx-4 px-4 mb-1 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                className={`snap-start shrink-0 text-[10px] tracking-[0.12em] uppercase px-3 py-2 min-h-[40px] border ${
                  selected
                    ? "bg-[#1d4734] text-white border-[#1d4734]"
                    : "bg-transparent text-[#6f6a63] border-[#e8e3da]"
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
          <Frame label={current.label} caption={current.caption}>
            {current.children}
          </Frame>
        </div>
      </div>
      <div className="hidden lg:grid lg:grid-cols-2 gap-6">
        {frames.map((frame) => (
          <Frame key={frame.id} label={frame.label} caption={frame.caption}>
            {frame.children}
          </Frame>
        ))}
      </div>
    </>
  );
}
