"use client";

import { useState, type ReactNode } from "react";
import { Body, DiscoverLink, PrimaryLink, SERIF, SoftwareStage } from "./platform-ui";

export type StoryTabId = "understand" | "compare" | "act" | "engage";

export type StoryTab = {
  id: StoryTabId;
  label: string;
  eyebrow: string;
  title: string;
  copy: string;
  more?: string[];
  caption?: string;
  points: string[];
  href: string;
  cta: string;
};

export function StoryTabs({
  tabs,
  panels,
}: {
  tabs: StoryTab[];
  panels: Record<StoryTabId, ReactNode>;
}) {
  const [active, setActive] = useState<StoryTabId>(tabs[0]?.id ?? "understand");
  const current = tabs.find((tab) => tab.id === active) ?? tabs[0];

  if (!current) return null;

  return (
    <div>
      <div
        role="tablist"
        aria-label="Understand, compare, act, engage"
        className="flex justify-center gap-2 sm:gap-8 overflow-x-auto pb-6 mb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab) => {
          const selected = tab.id === current.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              id={`story-tab-${tab.id}`}
              aria-controls={`story-panel-${tab.id}`}
              onClick={() => setActive(tab.id)}
              className={`shrink-0 text-[12px] sm:text-sm tracking-[0.08em] uppercase px-2 py-2 min-h-[44px] border-b ${
                selected ? "border-[#152238] text-[#152238]" : "border-transparent text-[#8a847c]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`story-panel-${current.id}`}
        aria-labelledby={`story-tab-${current.id}`}
        className="grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-10 items-start itx-understand-copy"
        key={current.id}
      >
        <div>
          <p className="text-[10px] tracking-[0.18em] uppercase text-[#9c7b8b] mb-4">{current.eyebrow}</p>
          <h3 className="text-2xl sm:text-3xl font-light mb-4" style={SERIF}>
            {current.title}
          </h3>
          <Body className="mb-4">{current.copy}</Body>
          {current.more?.map((paragraph) => (
            <p key={paragraph} className="text-[15px] text-[#5c5854] font-light leading-relaxed mb-4">
              {paragraph}
            </p>
          ))}
          {current.caption ? (
            <p className="text-[10px] tracking-[0.14em] uppercase text-[#8a847c] mb-4">{current.caption}</p>
          ) : null}
          <ul className="space-y-3 mb-8">
            {current.points.map((point) => (
              <li key={point} className="flex items-start gap-2 text-sm text-[#161513]">
                <span className="text-[#152238] mt-0.5 shrink-0" aria-hidden="true">
                  →
                </span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
          {current.cta === "Discover" ? (
            <DiscoverLink href={current.href}>Discover</DiscoverLink>
          ) : (
            <PrimaryLink href={current.href}>{current.cta}</PrimaryLink>
          )}
        </div>
        <SoftwareStage title={current.title}>{panels[current.id]}</SoftwareStage>
      </div>
    </div>
  );
}
