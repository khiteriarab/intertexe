"use client";

import { useEffect, useState } from "react";
import {
  PLATFORM_CASE_STUDY,
  PLATFORM_LIVE_CATALOG,
  PLATFORM_PRODUCT_SHORT_NAME,
} from "../../lib/enterprise/platform-showcase";
import { PrimaryLink, SecondaryLink, SERIF } from "./platform-ui";
type HeroStage = {
  id: string;
  label: string;
  pill: string;
  brand: string;
  name: string;
  detail: string;
  tone: "amber" | "teal" | "green" | "slate" | "rose";
  heroImage: string;
  heroAlt: string;
  showProductCutout?: boolean;
};

const HERO_STAGES: HeroStage[] = [
  {
    id: "trace",
    label: "Trace",
    pill: "Tracing supply chain…",
    brand: "Supplier feed · ERP · PLM",
    name: PLATFORM_PRODUCT_SHORT_NAME,
    detail: `${PLATFORM_CASE_STUDY.composition} · European flax · Portugal assembly`,
    tone: "amber",
    heroImage: "/platform/hero-workspace-desktop.png",
    heroAlt: "INTERTEXE workspace connecting fragmented product sources",
    showProductCutout: true,
  },
  {
    id: "measure",
    label: "Measure",
    pill: "Benchmarking material mix…",
    brand: "Peer segment · Shirts",
    name: PLATFORM_CASE_STUDY.productName,
    detail: `${PLATFORM_LIVE_CATALOG.avgNaturalFiberPct}% natural fiber · Customer Zero catalog`,
    tone: "teal",
    heroImage: "/platform/compare-benchmark.png",
    heroAlt: "Material Benchmark — peer comparison and catalog readiness",
  },
  {
    id: "govern",
    label: "Govern",
    pill: "Governed record ready",
    brand: "Issues · Approval workflow",
    name: PLATFORM_CASE_STUDY.styleCode,
    detail: `${PLATFORM_LIVE_CATALOG.completeMaterialPct}% fields complete · conflicts surfaced, never overwritten`,
    tone: "green",
    heroImage: "/platform/understand-issues.png",
    heroAlt: "Issues inbox — composition conflicts and resolution workflow",
  },
  {
    id: "publish",
    label: "Publish",
    pill: "Passport published",
    brand: "Digital Product Passport",
    name: PLATFORM_PRODUCT_SHORT_NAME,
    detail: `${PLATFORM_CASE_STUDY.styleCode} · scan QR to open live passport`,
    tone: "slate",
    heroImage: "/platform/act-passport.png",
    heroAlt: "Publish passport — workspace, QR identity, and consumer preview",
    showProductCutout: true,
  },
  {
    id: "next-life",
    label: "Next life",
    pill: "Next life ready",
    brand: "Resale · Ownership transfer",
    name: PLATFORM_CASE_STUDY.styleCode,
    detail: "Sell on eBay, Vinted, or Poshmark · integrity-gated",
    tone: "rose",
    heroImage: "/platform/hero-workspace-desktop.png",
    heroAlt: "Resale and ownership after first sale",
    showProductCutout: true,
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
      className={`b2b-fade-in transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none absolute inset-0"
      }`}
      role="status"
      aria-live={visible ? "polite" : "off"}
      aria-hidden={!visible}
    >
      <div className="rounded-2xl border border-[var(--platform-border)] bg-white/97 backdrop-blur-md shadow-[0_24px_60px_rgba(22,21,19,0.12)] px-4 py-3.5 sm:px-5 sm:py-4 text-left lg:px-6 lg:py-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--platform-accent-soft)] text-[10px] font-medium text-[var(--platform-primary)]">
            TX
          </span>
          <div className="min-w-0 flex-1">
            <p
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] tracking-[0.08em] uppercase mb-2 ${PILL_TONE[stage.tone]}`}
            >
              {stage.pill}
            </p>
            <p className="text-[9px] tracking-[0.14em] uppercase text-[var(--platform-quiet)] mb-0.5">{stage.brand}</p>
            <p className="text-sm lg:text-[15px] font-medium text-[var(--platform-ink)] truncate">{stage.name}</p>
            <p className="text-[12px] lg:text-[13px] text-[var(--platform-muted)] leading-snug mt-0.5">{stage.detail}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroStageVisual({
  stageIndex,
  className = "",
}: {
  stageIndex: number;
  className?: string;
}) {
  const stage = HERO_STAGES[stageIndex] ?? HERO_STAGES[0];
  return (
    <div className={`relative ${className}`}>
      {HERO_STAGES.map((item, i) => (
        <img
          key={item.id}
          src={item.heroImage}
          alt={item.heroAlt}
          width={1920}
          height={1080}
          className={`w-full rounded-2xl border border-[var(--platform-border)]/80 shadow-[0_40px_100px_rgba(22,21,19,0.08)] transition-opacity duration-700 ${
            i === stageIndex ? "opacity-100 relative z-10" : "opacity-0 absolute inset-0 z-0"
          }`}
        />
      ))}
      {stage.showProductCutout ? (
        <img
          src={PLATFORM_CASE_STUDY.imageUrl}
          alt={PLATFORM_CASE_STUDY.productName}
          width={400}
          height={600}
          className="absolute -left-4 sm:-left-6 xl:-left-10 bottom-6 sm:bottom-8 z-20 w-[26%] sm:w-[28%] max-w-[200px] object-contain drop-shadow-[0_32px_64px_rgba(22,21,19,0.18)] transition-opacity duration-500"
          style={{
            WebkitMaskImage: "radial-gradient(ellipse 80% 88% at 50% 50%, #000 50%, transparent 82%)",
            maskImage: "radial-gradient(ellipse 80% 88% at 50% 50%, #000 50%, transparent 82%)",
          }}
        />
      ) : null}
      <div className="absolute z-30 left-1/2 sm:left-[8%] xl:left-[6%] top-[38%] sm:top-auto sm:bottom-[14%] w-[min(92%,340px)] sm:w-[min(340px,42%)] -translate-x-1/2 sm:translate-x-0">
        <div className="relative min-h-[120px]">
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
    return (
      <div
        role="tablist"
        aria-label="Platform journey"
        className={`flex flex-wrap gap-2 justify-center lg:justify-start ${className}`}
      >
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
            Product intelligence infrastructure for fashion — connect raw data, govern one record, publish passports,
            and deliver through hosted pages, your domain, or your existing app.
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
          <div className="flex justify-center gap-1.5 mt-6">
            {HERO_STAGES.map((item, i) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Show ${item.label}`}
                onClick={() => selectTab(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-6 bg-[var(--platform-accent)]" : "w-1.5 bg-[var(--platform-accent)]/25"
                }`}
              />
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-[var(--platform-quiet)] leading-relaxed max-w-2xl mx-auto">
            Customer Zero · {PLATFORM_CASE_STUDY.styleCode} · live passport at intertexe.com/p/{PLATFORM_CASE_STUDY.publicId}
          </p>
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden lg:block">
        <div className="max-w-[1280px] mx-auto px-8 xl:px-12 pt-16 xl:pt-20 pb-8 min-h-[min(88vh,920px)] grid grid-cols-[minmax(0,42%)_minmax(0,58%)] gap-12 xl:gap-16 items-center">
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
            <div className="relative z-20 flex gap-1.5 mt-4 pl-[6%]">
              {HERO_STAGES.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  aria-label={`Show ${item.label}`}
                  onClick={() => selectTab(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === index ? "w-6 bg-[var(--platform-accent)]" : "w-1.5 bg-[var(--platform-accent)]/25 hover:bg-[var(--platform-accent)]/45"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
        <p className="max-w-[1280px] mx-auto px-8 xl:px-12 pb-6 text-xs text-[var(--platform-quiet)]">
          Customer Zero · {PLATFORM_LIVE_CATALOG.productCount} live products · {PLATFORM_LIVE_CATALOG.publishedPassports}{" "}
          published passports · tap Trace, Measure, Govern, Publish, or Next life to preview each stage.
        </p>
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
