"use client";

import { useEffect, useState } from "react";
import {
  PLATFORM_CASE_STUDY,
  PLATFORM_LIVE_CATALOG,
  PLATFORM_PRODUCT_SHORT_NAME,
} from "../../lib/enterprise/platform-showcase";
import { PrimaryLink, SecondaryLink, SERIF } from "./platform-ui";

const HERO_WORKSPACE = {
  src: "/platform/hero-workspace-desktop.png",
  alt: "INTERTEXE workspace — Silk Midi Dress · Dress 8721 · sample workspace",
};

type HeroStage = {
  id: string;
  label: string;
  pill: string;
  brand: string;
  name: string;
  detail: string;
  tone: "amber" | "teal" | "green" | "slate" | "rose";
};

const HERO_STAGES: HeroStage[] = [
  {
    id: "trace",
    label: "Trace",
    pill: "Tracing supply chain",
    brand: "Supplier feed · ERP · PLM",
    name: PLATFORM_PRODUCT_SHORT_NAME,
    detail: `${PLATFORM_CASE_STUDY.composition} · European flax · Portugal assembly`,
    tone: "amber",
  },
  {
    id: "measure",
    label: "Measure",
    pill: "Benchmarking material mix",
    brand: "Peer segment · Shirts",
    name: PLATFORM_CASE_STUDY.productName,
    detail: `${PLATFORM_LIVE_CATALOG.avgNaturalFiberPct}% natural fiber · Customer Zero catalog`,
    tone: "teal",
  },
  {
    id: "govern",
    label: "Govern",
    pill: "Governed record ready",
    brand: "Issues · Approval workflow",
    name: PLATFORM_CASE_STUDY.styleCode,
    detail: `${PLATFORM_LIVE_CATALOG.completeMaterialPct}% fields complete · conflicts surfaced, never overwritten`,
    tone: "green",
  },
  {
    id: "publish",
    label: "Publish",
    pill: "Passport published",
    brand: "Digital Product Passport",
    name: PLATFORM_PRODUCT_SHORT_NAME,
    detail: `${PLATFORM_CASE_STUDY.styleCode} · scan QR to open live passport`,
    tone: "slate",
  },
  {
    id: "next-life",
    label: "Next life",
    pill: "Next life ready",
    brand: "Resale · Ownership transfer",
    name: PLATFORM_CASE_STUDY.styleCode,
    detail: "Sell on eBay, Vinted, or Poshmark · integrity-gated",
    tone: "rose",
  },
];

const PILL_TONE: Record<HeroStage["tone"], string> = {
  amber: "bg-[#f5efe6] text-[#7a5c2e] border-[#e8dcc8]",
  teal: "bg-[#e8f0ef] text-[#2c4a3e] border-[#cdded9]",
  green: "bg-[#eaf2ea] text-[#2d5a34] border-[#cfe0cf]",
  slate: "bg-[var(--platform-highlight)] text-[var(--platform-primary)] border-[var(--platform-border)]",
  rose: "bg-[#f5ece8] text-[#6b3a2e] border-[#e8d4cc]",
};

const TRUST_MARKS = [
  "Digital Product Passport",
  "EU Textile Strategy",
  "AGEC compliance",
  "Material transparency",
] as const;

function InsightCard({ stage, visible }: { stage: HeroStage; visible: boolean }) {
  return (
    <div
      className={`platform-hero-insight transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none absolute inset-0"
      }`}
      role="status"
      aria-live={visible ? "polite" : "off"}
      aria-hidden={!visible}
    >
      <div className="rounded-2xl border border-[var(--platform-border)] bg-white/97 backdrop-blur-md shadow-[0_24px_60px_rgba(22,21,19,0.12)] px-4 py-3.5 sm:px-5 sm:py-4 text-left">
        <div className="flex items-start justify-between gap-3 mb-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--platform-accent-soft)] text-[10px] font-medium text-[var(--platform-primary)]">
            TX
          </span>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[9px] tracking-[0.1em] uppercase ${PILL_TONE[stage.tone]}`}
          >
            {stage.pill}
          </span>
        </div>
        <p className="text-[9px] tracking-[0.14em] uppercase text-[var(--platform-quiet)] mb-1">{stage.brand}</p>
        <p className="text-sm lg:text-[15px] font-medium text-[var(--platform-ink)]">{stage.name}</p>
        <p className="text-[12px] lg:text-[13px] text-[var(--platform-muted)] leading-snug mt-0.5">{stage.detail}</p>
      </div>
    </div>
  );
}

function HeroStageVisual({ stageIndex, className = "" }: { stageIndex: number; className?: string }) {
  return (
    <div className={`platform-hero-visual relative ${className}`}>
      <img
        src={HERO_WORKSPACE.src}
        alt={HERO_WORKSPACE.alt}
        width={1920}
        height={1080}
        className="w-full rounded-2xl border border-[var(--platform-border)]/80 shadow-[0_40px_100px_rgba(22,21,19,0.08)]"
      />
      <img
        src={PLATFORM_CASE_STUDY.imageUrl}
        alt={PLATFORM_CASE_STUDY.productName}
        width={400}
        height={600}
        className="platform-hero-product-cutout absolute z-20 object-contain drop-shadow-[0_32px_64px_rgba(22,21,19,0.18)]"
        style={{
          WebkitMaskImage: "radial-gradient(ellipse 80% 88% at 50% 50%, #000 52%, transparent 84%)",
          maskImage: "radial-gradient(ellipse 80% 88% at 50% 50%, #000 52%, transparent 84%)",
        }}
      />
      <div className="platform-hero-insight-stack absolute z-30">
        <div className="relative min-h-[132px]">
          {HERO_STAGES.map((item, i) => (
            <InsightCard key={item.id} stage={item} visible={i === stageIndex} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function PlatformHero() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % HERO_STAGES.length);
    }, 3800);
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
      {/* Mobile + tablet */}
      <div className="lg:hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pt-14 sm:pt-20 md:pt-24 text-center">
          <p className="text-[10px] sm:text-[11px] tracking-[0.28em] uppercase text-[var(--platform-quiet)] mb-6">
            INTERTEXE FOR BRANDS
          </p>
          <h1
            className="text-[2.35rem] sm:text-[3.25rem] md:text-[3.75rem] font-light leading-[1.06] tracking-[-0.02em] max-w-4xl mx-auto mb-5"
            style={SERIF}
          >
            Turn governed product data into the{" "}
            <em className="not-italic italic text-[var(--platform-accent)]">experience</em> your customer sees.
          </h1>
          <p className="mx-auto max-w-xl text-[16px] sm:text-[17px] font-light leading-relaxed text-[var(--platform-muted)] mb-8">
            INTERTEXE connects fashion brands, product data, and consumers across the lifecycle of a garment — from
            raw material to the moment someone scans the QR on the hangtag.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
            <PrimaryLink href="/platform/request?intent=snapshot&cta=hero">Start with 10 products</PrimaryLink>
            <SecondaryLink href="/platform/demo">See it live</SecondaryLink>
          </div>
          <HeroTabs className="mb-2" />
        </div>

        <div
          id={`platform-hero-panel-${activeStage.id}`}
          role="tabpanel"
          aria-labelledby={`platform-hero-tab-${activeStage.id}`}
          className="relative max-w-6xl mx-auto px-4 sm:px-6 md:px-8 pb-6 sm:pb-10 pt-8 sm:pt-12"
        >
          <HeroStageVisual stageIndex={index} className="mx-auto max-w-[980px]" />
        </div>
      </div>

      {/* Desktop — matches editorial mock: copy left, fixed workspace + floating card right */}
      <div className="hidden lg:block">
        <div className="max-w-[1280px] mx-auto px-8 xl:px-12 pt-16 xl:pt-20 pb-10 min-h-[min(88vh,920px)] grid grid-cols-[minmax(0,42%)_minmax(0,58%)] gap-12 xl:gap-16 items-center">
          <div className="pr-4 xl:pr-8">
            <p className="text-[11px] tracking-[0.32em] uppercase text-[var(--platform-quiet)] mb-8">
              INTERTEXE FOR BRANDS
            </p>
            <h1
              className="text-[3.25rem] xl:text-[4rem] font-light leading-[1.04] tracking-[-0.025em] mb-6"
              style={SERIF}
            >
              Turn governed product data into the{" "}
              <em className="not-italic italic text-[var(--platform-accent)]">experience</em>
              <br />
              your customer sees.
            </h1>
            <p className="text-[17px] xl:text-[18px] font-light leading-relaxed text-[var(--platform-muted)] max-w-md mb-10">
              INTERTEXE connects fashion brands, product data, and consumers across the lifecycle of a garment — from
              raw material to the moment someone scans the QR on the hangtag.
            </p>
            <div className="flex flex-wrap gap-3 mb-8">
              <PrimaryLink href="/platform/request?intent=snapshot&cta=hero">Start with 10 products</PrimaryLink>
              <SecondaryLink href="/platform/demo">See it live</SecondaryLink>
            </div>
            <HeroTabs className="mb-10" />
            <dl className="grid grid-cols-3 gap-6 pt-8 border-t border-[var(--platform-border)]/80 max-w-lg">
              {[
                { label: "Govern", value: "One product record" },
                { label: "Deliver", value: "Hosted · API · white label" },
                { label: "Verify", value: "Preview before go-live" },
              ].map((stat) => (
                <div key={stat.label}>
                  <dt className="text-[9px] tracking-[0.16em] uppercase text-[var(--platform-quiet)] mb-1">{stat.label}</dt>
                  <dd className="text-[13px] text-[var(--platform-ink)] leading-snug">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div
            id={`platform-hero-panel-${activeStage.id}`}
            role="tabpanel"
            aria-labelledby={`platform-hero-tab-${activeStage.id}`}
            className="relative min-h-[520px] xl:min-h-[580px]"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-8 rounded-[2rem] bg-gradient-to-br from-[#f0ebe4]/60 via-transparent to-[#e8f0ef]/40"
            />
            <HeroStageVisual stageIndex={index} className="relative z-10" />
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
