"use client";

import { useEffect, useState } from "react";
import { PrimaryLink, SecondaryLink, SERIF } from "./platform-ui";
import { getEnterpriseLoginUrl } from "../../lib/platform-urls";

const INSIGHTS = [
  {
    id: "resolve",
    pill: "Resolving composition…",
    brand: "Supplier feed · ERP · PLM",
    name: "Wide-leg linen trouser",
    detail: "98% Cotton / 2% Elastane vs 100% Cotton — conflict flagged",
    tone: "amber" as const,
  },
  {
    id: "benchmark",
    pill: "Benchmarking material mix…",
    brand: "Peer segment · Ready-to-wear",
    name: "Silk-blend midi dress",
    detail: "Natural fiber share +11% vs governed peer median",
    tone: "teal" as const,
  },
  {
    id: "passport",
    pill: "Passport ready",
    brand: "Digital Product Passport",
    name: "Cashmere crew knit",
    detail: "QR linked · 12 required fields complete",
    tone: "green" as const,
  },
  {
    id: "publish",
    pill: "Publishing to channels…",
    brand: "Ecommerce · QR · Brand site",
    name: "Wool tailored blazer",
    detail: "One governed record → passport, PDP, and compliance fields",
    tone: "slate" as const,
  },
] as const;

const PILL_TONE: Record<(typeof INSIGHTS)[number]["tone"], string> = {
  amber: "bg-[#f5efe6] text-[#7a5c2e] border-[#e8dcc8]",
  teal: "bg-[#e8f0ef] text-[#2c4a3e] border-[#cdded9]",
  green: "bg-[#eaf2ea] text-[#2d5a34] border-[#cfe0cf]",
  slate: "bg-[var(--platform-highlight)] text-[var(--platform-primary)] border-[var(--platform-border)]",
};

const TRUST_MARKS = [
  "Digital Product Passport",
  "EU Textile Strategy",
  "AGEC compliance",
  "Material transparency",
] as const;

const HERO_TABS = [
  { id: "trace", label: "Trace" },
  { id: "measure", label: "Measure" },
  { id: "govern", label: "Govern" },
  { id: "publish", label: "Publish" },
] as const;

function InsightCard({ insight, index, activeIndex }: { insight: (typeof INSIGHTS)[number]; index: number; activeIndex: number }) {
  return (
    <div
      className={`platform-hero-card transition-opacity duration-500 ${
        index === activeIndex ? "opacity-100" : "opacity-0 pointer-events-none absolute inset-0"
      }`}
      role="status"
      aria-live={index === activeIndex ? "polite" : "off"}
      aria-hidden={index !== activeIndex}
    >
      <div className="rounded-2xl border border-[var(--platform-border)] bg-white/97 backdrop-blur-md shadow-[0_24px_60px_rgba(22,21,19,0.12)] px-4 py-3.5 sm:px-5 sm:py-4 text-left lg:px-6 lg:py-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--platform-accent-soft)] text-[10px] font-medium text-[var(--platform-primary)]">
            TX
          </span>
          <div className="min-w-0 flex-1">
            <p
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] tracking-[0.08em] uppercase mb-2 ${PILL_TONE[insight.tone]}`}
            >
              {insight.pill}
            </p>
            <p className="text-[9px] tracking-[0.14em] uppercase text-[var(--platform-quiet)] mb-0.5">{insight.brand}</p>
            <p className="text-sm lg:text-[15px] font-medium text-[var(--platform-ink)] truncate">{insight.name}</p>
            <p className="text-[12px] lg:text-[13px] text-[var(--platform-muted)] leading-snug mt-0.5">{insight.detail}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PlatformHero() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const signIn = getEnterpriseLoginUrl();

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % INSIGHTS.length);
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
        {HERO_TABS.map((tab, i) => {
          const selected = i === index;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
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

  return (
    <section className="itx-abstract-section itx-abstract-motif relative overflow-hidden bg-[var(--platform-bg)] text-[var(--platform-ink)]">
      {/* Mobile + tablet: centered stack (unchanged feel) */}
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
            <PrimaryLink href="/platform/request?intent=snapshot&cta=hero">Request a demo</PrimaryLink>
            <SecondaryLink href={signIn}>Sign in</SecondaryLink>
          </div>
          <HeroTabs className="mb-2" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 md:px-8 pb-6 sm:pb-10 pt-8 sm:pt-12">
          <div className="relative mx-auto max-w-[980px]">
            <img
              src="/platform/hero-workspace-desktop.png"
              alt="INTERTEXE enterprise workspace — illustrative sample catalog"
              width={1920}
              height={1080}
              className="w-full rounded-2xl border border-[var(--platform-border)]/80 shadow-[0_40px_100px_rgba(22,21,19,0.08)]"
            />
            <div className="absolute left-1/2 top-[38%] sm:top-[42%] z-20 w-[min(92%,340px)] -translate-x-1/2">
              <InsightCard insight={INSIGHTS[index]!} index={index} activeIndex={index} />
            </div>
            <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
              {INSIGHTS.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  aria-label={`Show insight ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === index ? "w-6 bg-[var(--platform-accent)]" : "w-1.5 bg-[var(--platform-accent)]/25"
                  }`}
                />
              ))}
            </div>
          </div>
          <p className="mt-6 text-center text-xs text-[var(--platform-quiet)] leading-relaxed max-w-2xl mx-auto">
            Illustrative workspace · sample catalog, not a live customer.
          </p>
        </div>
      </div>

      {/* Desktop: Phia-style split — copy left, editorial product stage right */}
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
              <PrimaryLink href="/platform/request?intent=snapshot&cta=hero">Request a demo</PrimaryLink>
              <SecondaryLink href={signIn}>Sign in</SecondaryLink>
            </div>
            <HeroTabs className="mb-10" />
            <dl className="grid grid-cols-3 gap-6 pt-8 border-t border-[var(--platform-border)]/80 max-w-lg">
              {[
                { label: "Govern", value: "One product record" },
                { label: "Deliver", value: "Hosted · API · white label" },
                { label: "Demonstrate", value: "Scan QR in 30 seconds" },
              ].map((stat) => (
                <div key={stat.label}>
                  <dt className="text-[9px] tracking-[0.16em] uppercase text-[var(--platform-quiet)] mb-1">{stat.label}</dt>
                  <dd className="text-[13px] text-[var(--platform-ink)] leading-snug">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative min-h-[520px] xl:min-h-[580px]">
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-8 rounded-[2rem] bg-gradient-to-br from-[#f0ebe4]/60 via-transparent to-[#e8f0ef]/40"
            />
            <img
              src="/platform/hero-workspace-desktop.png"
              alt="INTERTEXE enterprise workspace — illustrative sample catalog"
              width={1920}
              height={1080}
              className="relative z-10 w-full rounded-2xl border border-[var(--platform-border)]/70 shadow-[0_48px_120px_rgba(22,21,19,0.10)]"
            />
            <img
              src="/platform/hero-silk-dress.png"
              alt=""
              aria-hidden
              width={400}
              height={600}
              className="absolute -left-6 xl:-left-10 bottom-8 z-20 w-[28%] max-w-[200px] object-contain drop-shadow-[0_32px_64px_rgba(22,21,19,0.18)]"
              style={{
                WebkitMaskImage: "radial-gradient(ellipse 80% 88% at 50% 50%, #000 50%, transparent 82%)",
                maskImage: "radial-gradient(ellipse 80% 88% at 50% 50%, #000 50%, transparent 82%)",
              }}
            />
            <div className="absolute z-30 left-[8%] xl:left-[6%] bottom-[14%] w-[min(340px,42%)]">
              <div className="relative min-h-[120px]">
                {INSIGHTS.map((item, i) => (
                  <InsightCard key={item.id} insight={item} index={i} activeIndex={index} />
                ))}
              </div>
              <div className="flex gap-1.5 mt-4">
                {INSIGHTS.map((item, i) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-label={`Show insight ${i + 1}`}
                    onClick={() => setIndex(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === index ? "w-6 bg-[var(--platform-accent)]" : "w-1.5 bg-[var(--platform-accent)]/25 hover:bg-[var(--platform-accent)]/45"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        <p className="max-w-[1280px] mx-auto px-8 xl:px-12 pb-6 text-xs text-[var(--platform-quiet)]">
          Illustrative workspace · sample catalog, not a live customer. Insight card cycles through composition resolution,
          benchmarking, and passport readiness.
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
