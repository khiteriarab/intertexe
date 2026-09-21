"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CARD_TONE_CLASS,
  PLATFORM_SCROLL_STAGES,
  type PlatformScrollStage,
} from "./platform-scroll-stages";
import { SERIF } from "./platform-ui";

function StageHeadline({ stage, className = "" }: { stage: PlatformScrollStage; className?: string }) {
  return (
    <h2
      className={`font-light leading-[1.08] tracking-[-0.02em] text-[var(--platform-ink)] ${className}`}
      style={SERIF}
    >
      {stage.headline}
      {stage.headlineEmphasis ? (
        <>
          {" "}
          <em className="not-italic italic text-[var(--platform-accent)]">{stage.headlineEmphasis}</em>
        </>
      ) : null}
    </h2>
  );
}

function RecordDial({
  stage,
  index,
  total,
}: {
  stage: PlatformScrollStage;
  index: number;
  total: number;
}) {
  const progress = ((index + 1) / total) * 100;

  return (
    <div className="platform-scroll-dial">
      <div className="platform-scroll-dial-ring relative w-full max-w-[320px] xl:max-w-[360px] aspect-square mx-auto">
        <svg viewBox="0 0 360 360" className="absolute inset-0 w-full h-full -rotate-90" aria-hidden>
          <circle cx="180" cy="180" r="158" fill="none" stroke="#e8e3da" strokeWidth="1.5" />
          <circle
            cx="180"
            cy="180"
            r="158"
            fill="none"
            stroke="var(--platform-primary)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={`${(progress / 100) * 993} 993`}
            className="transition-all duration-700 ease-out"
          />
        </svg>

        <div className="absolute inset-[18px] rounded-full overflow-hidden border border-[var(--platform-border)]/80 shadow-[0_40px_100px_rgba(22,21,19,0.10)] bg-[var(--platform-surface)]">
          {PLATFORM_SCROLL_STAGES.map((item, i) => (
            <img
              key={item.id}
              src={item.image}
              alt={item.imageAlt}
              width={720}
              height={720}
              className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-out ${
                i === index ? "opacity-100 scale-100" : "opacity-0 scale-[1.03]"
              }`}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-[#161513]/55 via-[#161513]/10 to-transparent" />
        </div>

        <div
          key={stage.id}
          className="platform-dial-card absolute left-1/2 top-[12%] -translate-x-1/2 w-[min(78%,220px)] z-20"
        >
          <div className="rounded-full bg-white/95 backdrop-blur-md border border-[var(--platform-border)] shadow-[0_16px_40px_rgba(22,21,19,0.12)] px-4 py-3 sm:px-5 sm:py-4 text-center">
            <p className="text-[1.85rem] sm:text-[2.15rem] xl:text-[2.4rem] font-light leading-none text-[var(--platform-ink)]" style={SERIF}>
              {stage.dial.value}
            </p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-[var(--platform-quiet)] mt-1">{stage.dial.unit}</p>
            <p className="text-[11px] sm:text-[12px] text-[var(--platform-muted)] mt-1.5 leading-snug">{stage.dial.label}</p>
          </div>
        </div>
      </div>

      <div key={`${stage.id}-card`} className="platform-scroll-dial-card platform-dial-card mt-4 sm:mt-5 max-w-[320px] xl:max-w-[360px] mx-auto">
        <div className="rounded-2xl border border-[var(--platform-border)] bg-white shadow-[0_24px_60px_rgba(22,21,19,0.12)] px-4 py-3.5 sm:px-5 sm:py-4 text-left">
          <p
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] tracking-[0.08em] uppercase mb-2 ${CARD_TONE_CLASS[stage.card.tone]}`}
          >
            {stage.kicker}
          </p>
          <p className="text-[9px] tracking-[0.14em] uppercase text-[var(--platform-quiet)] mb-0.5">{stage.card.eyebrow}</p>
          <p className="text-sm font-medium text-[var(--platform-ink)]">{stage.card.title}</p>
          <p className="text-[12px] text-[var(--platform-muted)] leading-snug mt-0.5">{stage.card.detail}</p>
        </div>
      </div>
    </div>
  );
}

function StageTabs({
  activeId,
  onSelect,
  className = "",
}: {
  activeId: string;
  onSelect: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label="Platform stages"
      className={`flex flex-wrap gap-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
    >
      {PLATFORM_SCROLL_STAGES.map((item) => {
        const selected = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`platform-stage-panel-${item.id}`}
            id={`platform-stage-tab-${item.id}`}
            onClick={() => onSelect(item.id)}
            className={`shrink-0 px-4 py-2.5 min-h-[44px] text-[11px] tracking-[0.14em] uppercase rounded-full border transition-colors ${
              selected
                ? "bg-[var(--platform-accent-soft)] text-[var(--platform-primary)] border-[var(--platform-accent-muted)]"
                : "bg-white text-[var(--platform-muted)] border-[var(--platform-border)] hover:text-[var(--platform-ink)]"
            }`}
          >
            {item.kicker}
          </button>
        );
      })}
    </div>
  );
}

function StageDetail({ stage }: { stage: PlatformScrollStage }) {
  return (
    <div key={stage.id}>
      <p className="text-[10px] tracking-[0.24em] uppercase text-[var(--platform-quiet)] mb-3">{stage.kicker}</p>
      <StageHeadline stage={stage} className="text-[1.85rem] sm:text-[2.35rem] lg:text-[2.5rem] xl:text-[3rem] mb-4 max-w-md" />
      <p className="text-[15px] text-[var(--platform-muted)] font-light leading-relaxed mb-5 max-w-lg">{stage.copy}</p>
      <ul className="space-y-2.5 mb-6">
        {stage.points.map((point) => (
          <li key={point} className="flex items-start gap-2.5 text-sm text-[var(--platform-muted)]">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--platform-accent)]" aria-hidden />
            {point}
          </li>
        ))}
      </ul>
      <Link
        href="/brands/demo"
        className="inline-flex items-center gap-2 rounded-full border border-[var(--platform-ink)]/20 px-5 py-3 text-[11px] tracking-[0.14em] uppercase text-[var(--platform-ink)] hover:bg-white transition-colors"
      >
        Explore in demo
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}

export function PlatformScrollShowcase() {
  const [activeId, setActiveId] = useState(PLATFORM_SCROLL_STAGES[0].id);
  const activeIndex = useMemo(
    () => PLATFORM_SCROLL_STAGES.findIndex((s) => s.id === activeId),
    [activeId]
  );
  const stage = PLATFORM_SCROLL_STAGES[activeIndex] ?? PLATFORM_SCROLL_STAGES[0];

  useEffect(() => {
    function onSelect(event: Event) {
      const id = (event as CustomEvent<{ id: string }>).detail?.id;
      if (id && PLATFORM_SCROLL_STAGES.some((item) => item.id === id)) {
        setActiveId(id);
      }
    }
    window.addEventListener("platform-select-stage", onSelect);
    return () => window.removeEventListener("platform-select-stage", onSelect);
  }, []);

  return (
    <section
      id="platform-journey"
      className="platform-scroll-showcase platform-abstract-band itx-abstract-motif border-y border-[var(--platform-border)]/60 scroll-mt-24"
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-12 sm:py-16 lg:py-20">
        <p className="text-[10px] tracking-[0.28em] uppercase text-[var(--platform-quiet)] mb-3 text-center lg:text-left">
          Platform capabilities
        </p>
        <p className="text-center lg:text-left text-sm text-[var(--platform-muted)] max-w-xl mb-8 lg:mb-10">
          Trace, Measure, Govern, Publish, and Next life — one Customer Zero linen shirt passport across every stage.
        </p>

        <StageTabs
          activeId={activeId}
          onSelect={setActiveId}
          className="justify-center lg:justify-start mb-8 lg:mb-10"
        />

        <div
          id={`platform-stage-panel-${stage.id}`}
          role="tabpanel"
          aria-labelledby={`platform-stage-tab-${stage.id}`}
          className="grid lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] xl:grid-cols-[minmax(0,1.05fr)_400px] gap-8 lg:gap-10 xl:gap-14 items-start"
        >
          <StageDetail stage={stage} />
          <RecordDial stage={stage} index={activeIndex} total={PLATFORM_SCROLL_STAGES.length} />
        </div>
      </div>
    </section>
  );
}
