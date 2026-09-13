"use client";

import { useEffect, useState } from "react";
import { PrimaryLink, SecondaryLink, SERIF } from "./platform-ui";
import { PlatformHeroLifecycleVisual } from "./PlatformHeroLifecycleVisual";

type HeroStage = {
  id: string;
  label: string;
};

const HERO_STAGES: HeroStage[] = [
  { id: "trace", label: "Trace" },
  { id: "measure", label: "Measure" },
  { id: "govern", label: "Govern" },
  { id: "publish", label: "Publish" },
  { id: "next-life", label: "Next life" },
];

const TRUST_MARKS = [
  "Digital Product Passport",
  "EU Textile Strategy",
  "AGEC compliance",
  "Material transparency",
] as const;

export function PlatformHero() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % HERO_STAGES.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [paused]);

  function selectTab(tabIndex: number) {
    setIndex(tabIndex);
    setPaused(true);
    window.setTimeout(() => setPaused(false), 12000);
  }

  function HeroTabs({ className = "" }: { className?: string }) {
    const primaryTabs = HERO_STAGES.slice(0, 4);
    const nextLifeTab = HERO_STAGES[4];

    return (
      <div className={`platform-hero-tabs ${className}`}>
        <div
          role="tablist"
          aria-label="Platform journey"
          className="flex flex-wrap gap-2 justify-center lg:justify-start"
        >
          {primaryTabs.map((tab, i) => {
            const selected = i === index;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`platform-hero-panel-${tab.id}`}
                id={`platform-hero-tab-${tab.id}`}
                onClick={() => selectTab(i)}
                className={`px-4 py-2 min-h-[40px] text-[11px] tracking-[0.14em] uppercase rounded-full border transition-colors ${
                  selected
                    ? "bg-[var(--platform-accent-soft)] text-[var(--platform-primary)] border-[var(--platform-accent-muted)]"
                    : "bg-white/80 text-[var(--platform-muted)] border-[var(--platform-border)] hover:text-[var(--platform-ink)]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        {nextLifeTab ? (
          <div className="mt-2 flex justify-center lg:justify-start">
            <button
              type="button"
              role="tab"
              aria-selected={index === 4}
              aria-controls={`platform-hero-panel-${nextLifeTab.id}`}
              id={`platform-hero-tab-${nextLifeTab.id}`}
              onClick={() => selectTab(4)}
              className={`px-4 py-2 min-h-[40px] text-[11px] tracking-[0.14em] uppercase rounded-full border transition-colors ${
                index === 4
                  ? "bg-[var(--platform-accent-soft)] text-[var(--platform-primary)] border-[var(--platform-accent-muted)]"
                  : "bg-white/80 text-[var(--platform-muted)] border-[var(--platform-border)] hover:text-[var(--platform-ink)]"
              }`}
            >
              {nextLifeTab.label}
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  const activeStage = HERO_STAGES[index] ?? HERO_STAGES[0];

  return (
    <section className="itx-abstract-section itx-abstract-motif relative overflow-hidden bg-[var(--platform-bg)] text-[var(--platform-ink)]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 pt-14 sm:pt-20 lg:pt-16 xl:pt-20 pb-8 lg:pb-10">
        <div className="lg:grid lg:grid-cols-[minmax(0,42%)_minmax(0,58%)] lg:gap-12 xl:gap-16 lg:items-center">
          <div className="text-center lg:text-left lg:pr-4 xl:pr-8 mb-10 lg:mb-0">
            <p className="text-[10px] sm:text-[11px] tracking-[0.28em] uppercase text-[var(--platform-quiet)] mb-6 lg:mb-8">
              INTERTEXE FOR BRANDS
            </p>
            <h1
              className="text-[2.35rem] sm:text-[3.25rem] md:text-[3.75rem] lg:text-[3.25rem] xl:text-[4rem] font-light leading-[1.06] lg:leading-[1.04] tracking-[-0.02em] max-w-4xl mx-auto lg:mx-0 mb-5 lg:mb-6"
              style={SERIF}
            >
              Turn governed product data into the{" "}
              <em className="not-italic italic text-[var(--platform-accent)]">experience</em>
              <span className="hidden lg:inline">
                <br />
              </span>
              <span className="lg:hidden"> </span>
              your customer sees.
            </h1>
            <p className="mx-auto lg:mx-0 max-w-xl lg:max-w-md text-[16px] sm:text-[17px] lg:text-[17px] xl:text-[18px] font-light leading-relaxed text-[var(--platform-muted)] mb-8 lg:mb-10">
              INTERTEXE connects fashion brands, product data, and consumers across the lifecycle of a garment — from
              raw material to the moment someone scans the QR on the hangtag.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-6 lg:mb-8">
              <PrimaryLink href="/platform/request?intent=snapshot&cta=hero">Start with 10 products</PrimaryLink>
              <SecondaryLink href="/platform/demo">See it live</SecondaryLink>
            </div>
            <HeroTabs />
          </div>

          <div
            id={`platform-hero-panel-${activeStage.id}`}
            role="tabpanel"
            aria-labelledby={`platform-hero-tab-${activeStage.id}`}
            className="relative"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-6 lg:-inset-8 rounded-[2rem] bg-gradient-to-br from-[#f0ebe4]/60 via-transparent to-[#e8f0ef]/40"
            />
            <PlatformHeroLifecycleVisual stageIndex={index} className="relative z-10" />
          </div>
        </div>
      </div>

      <div className="platform-abstract-band border-t border-[var(--platform-border)]/70 py-5 sm:py-6 lg:py-7">
        <div className="relative max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
          <ul className="flex flex-wrap items-center justify-center lg:justify-between gap-x-8 gap-y-3">
            {TRUST_MARKS.map((mark) => (
              <li
                key={mark}
                className="text-[10px] sm:text-[11px] lg:text-[12px] tracking-[0.22em] uppercase text-[var(--platform-muted)] whitespace-nowrap"
                style={SERIF}
              >
                {mark}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
