"use client";

import { useEffect, useState } from "react";
import { DiscoverLink, SERIF } from "./platform-ui";
import { PlatformHeroLifecycleVisual } from "./PlatformHeroLifecycleVisual";

type HeroStage = {
  id: string;
  label: string;
  micro: string;
  title: string;
  copy: string;
  points: string[];
  href: string;
};

const HERO_STAGES: HeroStage[] = [
  {
    id: "create",
    label: "Create",
    micro: "Input",
    title: "Capture and structure product data",
    copy: "Bring together product identity, composition, supplier inputs, specifications, and manufacturing details into one structured foundation.",
    points: ["Product identity", "Materials & composition", "Supplier + factory data", "Source files & specifications"],
    href: "/brands/demo#create",
  },
  {
    id: "verify",
    label: "Verify",
    micro: "Validation",
    title: "Find gaps before they become risk",
    copy: "Identify missing composition, incomplete traceability, unsupported claims, and supplier evidence gaps across the product record.",
    points: ["Missing composition", "Supplier evidence gaps", "Unsupported claims", "Incomplete manufacturing details"],
    href: "/brands/demo#verify",
  },
  {
    id: "comply",
    label: "Comply",
    micro: "Compliance",
    title: "Prepare products for trust and regulation",
    copy: "Turn approved product data into a governed record ready for Digital Product Passports, regulatory requirements, and controlled transparency.",
    points: ["Digital Product Passport ready", "Traceability structure", "Regulatory requirements", "Approved evidence layer"],
    href: "/brands/demo#comply",
  },
  {
    id: "distribute",
    label: "Distribute",
    micro: "Delivery",
    title: "One record, every channel",
    copy: "Publish product data through hosted passports, branded experiences, or API so every channel works from the same governed source.",
    points: ["Hosted passport", "Brand domain", "Headless API", "One record, every channel"],
    href: "/brands/demo#distribute",
  },
  {
    id: "extend",
    label: "Extend",
    micro: "Circularity",
    title: "Support the product after the sale",
    copy: "Power scan-based care, repair, resale, transfer, and circular next-life experiences from the same product record.",
    points: ["Composition & origin", "Care & aftercare", "Repair guidance", "Resale & transfer"],
    href: "/brands/demo#extend",
  },
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

  const activeStage = HERO_STAGES[index] ?? HERO_STAGES[0];

  return (
    <section className="itx-abstract-section itx-abstract-motif relative overflow-hidden bg-[var(--platform-bg)] text-[var(--platform-ink)]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 pt-14 sm:pt-20 lg:pt-16 xl:pt-20 pb-8 lg:pb-10">
        <div className="mb-8 lg:mb-10">
          <div role="tablist" aria-label="Product lifecycle stages" className="platform-hero-tab-row">
            {HERO_STAGES.map((tab, i) => {
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
                  className={`platform-hero-tab ${selected ? "is-active" : ""}`}
                >
                  <span className="platform-hero-tab-index">{i + 1}</span>
                  <span className="platform-hero-tab-label">{tab.label}</span>
                  <span className="platform-hero-tab-micro">{tab.micro}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:grid lg:grid-cols-[minmax(0,42%)_minmax(0,58%)] lg:gap-12 xl:gap-16 lg:items-center">
          <div className="text-center lg:text-left lg:pr-4 xl:pr-8 mb-10 lg:mb-0">
            <p className="text-[10px] sm:text-[11px] tracking-[0.28em] uppercase text-[var(--platform-quiet)] mb-3">
              {activeStage.micro}
            </p>
            <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--platform-accent)] mb-4">{activeStage.label}</p>
            <h1
              className="text-[2rem] sm:text-[2.75rem] md:text-[3.25rem] lg:text-[2.85rem] xl:text-[3.35rem] font-light leading-[1.08] tracking-[-0.02em] max-w-4xl mx-auto lg:mx-0 mb-5"
              style={SERIF}
            >
              {activeStage.title}
            </h1>
            <p className="mx-auto lg:mx-0 max-w-xl lg:max-w-md text-[16px] sm:text-[17px] font-light leading-relaxed text-[var(--platform-muted)] mb-6">
              {activeStage.copy}
            </p>
            <ul className="space-y-2.5 mb-8 text-left max-w-md mx-auto lg:mx-0">
              {activeStage.points.map((point) => (
                <li key={point} className="flex items-start gap-2 text-sm text-[var(--platform-ink)]">
                  <span className="text-[var(--platform-accent)] mt-0.5 shrink-0" aria-hidden>
                    →
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-center lg:justify-start">
              <DiscoverLink href={activeStage.href}>Discover</DiscoverLink>
            </div>
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
