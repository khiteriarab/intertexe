"use client";

import { useState, type ReactNode } from "react";
import { PlatformGraphic } from "./PlatformGraphic";
import { WorkspaceHeroPreview } from "./WorkspaceHeroPreview";
import {
  BenchmarkPreview,
  IssuesPreview,
  NormalizePreview,
  PassportPreview,
  RegulatoryPreview,
} from "./workspace-previews";
import { PLATFORM_GRAPHICS } from "../../lib/platform-graphics";
import { LIVING_SYSTEM, RETAIN, DISCOVER_STORY } from "./living-system";

export type WorkspaceFrame = {
  id: string;
  label: string;
  lead: string;
  caption?: string;
  children: ReactNode;
};

export function workspaceFrames(): WorkspaceFrame[] {
  return [
    {
      id: "overview",
      label: "Overview",
      lead: "Catalog metrics, material mix, peers and issues on one sample record.",
      caption: "Illustrative example. Counts are not a live customer catalog.",
      children: PLATFORM_GRAPHICS.heroWorkspace.ready ? (
        <PlatformGraphic slot="heroWorkspace" />
      ) : (
        <WorkspaceHeroPreview className="mt-0" caption="" />
      ),
    },
    {
      id: "intelligence",
      label: "Material intelligence",
      lead: "Normalize messy source strings without overwriting the original.",
      caption: "Normalization preserves the original source string.",
      children: PLATFORM_GRAPHICS.understandNormalize.ready ? (
        <PlatformGraphic slot="understandNormalize" />
      ) : (
        <NormalizePreview className="mb-0" caption="" />
      ),
    },
    {
      id: "issues",
      label: "Issues",
      lead: "Conflicts, missing fields and invalid totals become an inbox — not another spreadsheet.",
      children: PLATFORM_GRAPHICS.understandIssues.ready ? (
        <PlatformGraphic slot="understandIssues" />
      ) : (
        <IssuesPreview className="mb-0" caption="" />
      ),
    },
    {
      id: "benchmark",
      label: "Benchmark",
      lead: "See natural vs synthetic share and completeness against an appropriate peer group.",
      caption: "Illustrative example · Individual customer data is never exposed.",
      children: PLATFORM_GRAPHICS.compareBenchmark.ready ? (
        <PlatformGraphic slot="compareBenchmark" />
      ) : (
        <BenchmarkPreview className="mb-0" caption="" />
      ),
    },
    {
      id: "studio",
      label: "Passport studio",
      lead: "Publish from the same record. Consumers do not need the INTERTEXE app.",
      children: PLATFORM_GRAPHICS.actPassport.ready ? (
        <PlatformGraphic slot="actPassport" />
      ) : (
        <PassportPreview className="mb-0" caption="" />
      ),
    },
    {
      id: "monitor",
      label: "Regulatory monitor",
      lead: "Tracked requirement changes and preparation status — not legal certification.",
      caption: "Tracked requirements and preparation status — not certification.",
      children: <RegulatoryPreview className="mb-0" caption="" />,
    },
  ];
}

export const WORKSPACE_NEEDS = [
  {
    title: "See what is actually in the catalog",
    copy: "Overview shows products, completeness, material mix and what still needs attention.",
  },
  {
    title: "Turn messy files into material intelligence",
    copy: "Excel, CSV and PLM exports become structured fiber records. Original source strings stay on the row.",
  },
  {
    title: "Fix conflicts and missing data",
    copy: "The Issues inbox lists composition conflicts, invalid totals and gaps. Unknown stays unknown.",
  },
  {
    title: "Compare, publish, and watch requirements",
    copy: "Benchmark peers, prepare Digital Product Passports, and see which products a requirement change actually touches.",
  },
] as const;

export function WorkspaceGallery({
  frames,
  activeId,
  onActiveIdChange,
}: {
  frames: WorkspaceFrame[];
  activeId?: string;
  onActiveIdChange?: (id: string) => void;
}) {
  const [internalId, setInternalId] = useState(frames[0]?.id ?? "");
  const active = activeId ?? internalId;
  const current = frames.find((frame) => frame.id === active) ?? frames[0];

  if (!current) return null;

  const select = (id: string) => {
    onActiveIdChange?.(id);
    if (activeId === undefined) setInternalId(id);
  };

  return (
    <SoftwareStage title={current.label} copy={current.lead}>
      <div
        role="tablist"
        aria-label="Workspace preview"
        className="flex gap-2 overflow-x-auto pb-4 mb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
              aria-controls={`workspace-panel-${current.id}`}
              onClick={() => select(frame.id)}
              className={`shrink-0 text-[12px] sm:text-[13px] px-3 py-2 min-h-[40px] rounded-md ${
                selected ? "bg-[#152238] text-white" : "bg-white/70 text-[#152238] hover:bg-white"
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
      </div>
      {current.caption ? (
        <p className="mt-4 text-xs text-[#5c5854] leading-relaxed">{current.caption}</p>
      ) : null}
    </SoftwareStage>
  );
}

function NeedIcon({ index }: { index: number }) {
  const common = {
    width: 28,
    height: 28,
    fill: "none",
    stroke: "#152238",
    strokeWidth: 1.5,
    "aria-hidden": true as const,
  };
  if (index === 0) {
    return (
      <svg {...common} viewBox="0 0 28 28">
        <rect x="3" y="5" width="22" height="16" rx="2" />
        <path d="M7 17l4-5 3 3 4-6 3 8" />
      </svg>
    );
  }
  if (index === 1) {
    return (
      <svg {...common} viewBox="0 0 28 28">
        <path d="M6 20V8h10l6 6v6H6z" />
        <path d="M16 8v6h6" />
      </svg>
    );
  }
  if (index === 2) {
    return (
      <svg {...common} viewBox="0 0 28 28">
        <circle cx="14" cy="14" r="9" />
        <path d="M14 10v5" />
        <circle cx="14" cy="18.5" r="0.8" fill="#152238" stroke="none" />
      </svg>
    );
  }
  return (
    <svg {...common} viewBox="0 0 28 28">
      <circle cx="14" cy="14" r="9" />
      <circle cx="14" cy="14" r="4" />
      <path d="M14 5v3M14 20v3M5 14h3M20 14h3" />
    </svg>
  );
}

export function DiscoverWorkspace() {
  const frames = workspaceFrames();
  const [storyId, setStoryId] = useState<(typeof DISCOVER_STORY)[number]["id"]>("compare");
  const [frameId, setFrameId] = useState(DISCOVER_STORY[0].frameId);
  const story = DISCOVER_STORY.find((item) => item.id === storyId) ?? DISCOVER_STORY[0];

  const selectStory = (id: (typeof DISCOVER_STORY)[number]["id"]) => {
    const next = DISCOVER_STORY.find((item) => item.id === id) ?? DISCOVER_STORY[0];
    setStoryId(next.id);
    setFrameId(next.frameId);
  };

  return (
    <div className="bg-gradient-to-br from-[#dce7f2] via-[#f7f5f1] to-[#e8eef4]">
      <section className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 pt-12 sm:pt-16 md:pt-20 pb-10">
        <p className="text-[10px] sm:text-[11px] tracking-[0.18em] uppercase text-[#6b8499] mb-5">
          Discover · /platform/discover
        </p>
        <h1
          className="text-[2.15rem] sm:text-5xl md:text-[3.2rem] font-light leading-[1.12] text-[#152238] max-w-3xl mb-5"
          style={SERIF}
        >
          One workspace for <em className="italic">material intelligence</em>.
        </h1>
        <p className="max-w-2xl text-[15px] sm:text-base text-[#5c5854] font-light leading-relaxed mb-8">
          Material Intelligence is live in the public demo. Overview, Issues, Benchmarking, Passport Studio and
          Regulatory Monitor are the workspace the Founding Pilot delivers into, and the platform now being built.
          Click a surface — a new INTERTEXE workspace mockup opens. Previews are illustrative, not a live customer
          catalog.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href="/platform/request?intent=snapshot&cta=discover"
            className="inline-flex items-center gap-2 rounded-md bg-[#152238] px-5 py-2.5 text-[13px] font-medium text-white min-h-[44px] hover:bg-[#0f1a2c] w-fit"
          >
            Book a demo
            <span aria-hidden="true">→</span>
          </a>
          <a
            href="/platform/demo"
            className="inline-flex items-center gap-2 text-[13px] font-medium text-[#152238] min-h-[44px]"
          >
            See the live demo
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 pb-10 sm:pb-16">
        <p className="text-[10px] tracking-[0.18em] uppercase text-[#9c7b8b] mb-4">{LIVING_SYSTEM.eyebrow}</p>
        <h2 className="text-[1.75rem] sm:text-3xl md:text-4xl font-light leading-[1.2] text-[#152238] max-w-3xl mb-4" style={SERIF}>
          {LIVING_SYSTEM.title}
        </h2>
        <p className="max-w-2xl text-[15px] text-[#5c5854] font-light leading-relaxed mb-8">{LIVING_SYSTEM.body}</p>

        <div className="rounded-2xl border border-[#d5dee8] bg-white px-5 py-8 sm:px-10 sm:py-10 shadow-[0_24px_60px_rgba(21,34,56,0.08)] mb-10">
          <div
            role="tablist"
            aria-label="Compare, act, engage"
            className="flex justify-center gap-2 sm:gap-10 overflow-x-auto mb-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {DISCOVER_STORY.map((item) => {
              const selected = item.id === story.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => selectStory(item.id)}
                  className={`shrink-0 min-h-[44px] px-2 sm:px-3 text-[12px] sm:text-sm tracking-[0.14em] uppercase border-b-2 ${
                    selected
                      ? "border-[#152238] text-[#152238]"
                      : "border-transparent text-[#8a847c] hover:text-[#152238]"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
          <h3 className="text-xl sm:text-2xl text-[#152238] mb-3" style={SERIF}>
            {story.title}
          </h3>
          <p className="text-[15px] text-[#5c5854] font-light leading-relaxed max-w-3xl mb-3">{story.copy}</p>
          <p className="text-xs text-[#8a847c] leading-relaxed mb-8">{story.note}</p>
          <p className="text-[10px] tracking-[0.18em] uppercase text-[#6b8499] mb-2">Functionalities</p>
          <p className="text-[10px] tracking-[0.14em] uppercase text-[#6b8499] mb-4">
            → The workspace mockup below follows this tab. Click a surface to change the INTERTEXE mockup.
          </p>
          <WorkspaceGallery frames={frames} activeId={frameId} onActiveIdChange={setFrameId} />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {RETAIN.map((item) => (
            <div key={item.id} className="border-t border-[#d5dee8] pt-5">
              <h3 className="mb-2 text-[#152238]" style={SERIF}>
                {item.title}
              </h3>
              <p className="text-sm text-[#5c5854] leading-relaxed">{item.copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 pb-10 sm:pb-16">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <p className="text-[10px] tracking-[0.18em] uppercase text-[#6b8499] mb-3">Needs</p>
            <h2 className="text-[1.75rem] sm:text-3xl font-light text-[#152238]" style={SERIF}>
              Different needs, <em className="italic">one workspace</em>.
            </h2>
          </div>
          <a
            href="/platform/request?intent=snapshot&cta=discover_needs"
            className="inline-flex items-center gap-2 rounded-md bg-[#152238] px-5 py-2.5 text-[13px] font-medium text-white min-h-[44px] hover:bg-[#0f1a2c] w-fit"
          >
            Book a demo
            <span aria-hidden="true">→</span>
          </a>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {WORKSPACE_NEEDS.map((item, index) => (
            <article
              key={item.title}
              className="rounded-2xl border border-[#d5dee8] bg-white p-5 sm:p-6 shadow-[0_12px_30px_rgba(21,34,56,0.04)]"
            >
              <NeedIcon index={index} />
              <h3 className="mt-4 text-[15px] font-medium text-[#152238] leading-snug">{item.title}</h3>
              <p className="mt-2 text-sm text-[#5c5854] font-light leading-relaxed">{item.copy}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
