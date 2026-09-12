"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CARD_TONE_CLASS,
  PLATFORM_SCROLL_STAGES,
  type PlatformScrollStage,
} from "./platform-scroll-stages";
import { SERIF } from "./platform-ui";

function RecordDial({
  stage,
  index,
  total,
  compact = false,
}: {
  stage: PlatformScrollStage;
  index: number;
  total: number;
  compact?: boolean;
}) {
  const progress = ((index + 1) / total) * 100;
  const size = compact ? "w-[260px] sm:w-[300px]" : "w-[320px] xl:w-[360px]";

  return (
    <div className={`relative ${size} aspect-square mx-auto`}>
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
        <div className="absolute inset-0 bg-gradient-to-t from-[#161513]/55 via-transparent to-transparent" />
      </div>

      <div
        key={stage.id}
        className="platform-hero-card absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(88%,280px)] z-20"
      >
        <div className="rounded-full bg-white/95 backdrop-blur-md border border-[var(--platform-border)] shadow-[0_20px_50px_rgba(22,21,19,0.14)] px-5 py-4 sm:px-6 sm:py-5 text-center">
          <p
            className={`${compact ? "text-[2rem]" : "text-[2.5rem] xl:text-[2.85rem]"} font-light leading-none text-[var(--platform-ink)]`}
            style={SERIF}
          >
            {stage.dial.value}
          </p>
          <p className="text-[10px] tracking-[0.2em] uppercase text-[var(--platform-quiet)] mt-1">{stage.dial.unit}</p>
          <p className="text-[11px] sm:text-[12px] text-[var(--platform-muted)] mt-2 leading-snug">{stage.dial.label}</p>
        </div>
      </div>

      <div
        key={`${stage.id}-card`}
        className={`platform-hero-card absolute left-1/2 -translate-x-1/2 w-[min(92%,300px)] z-30 ${
          compact ? "bottom-0 translate-y-[78%]" : "-bottom-2 translate-y-full"
        }`}
      >
        <div className="rounded-2xl border border-[var(--platform-border)] bg-white/97 backdrop-blur-md shadow-[0_24px_60px_rgba(22,21,19,0.12)] px-4 py-3.5 sm:px-5 sm:py-4 text-left">
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
      className={`flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
    >
      {PLATFORM_SCROLL_STAGES.map((item) => {
        const selected = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
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
    <div key={stage.id} className="platform-hero-card">
      <p className="text-[10px] tracking-[0.24em] uppercase text-[var(--platform-quiet)] mb-3">{stage.kicker}</p>
      <h2
        className="text-[1.85rem] sm:text-[2.35rem] font-light leading-[1.1] tracking-[-0.02em] text-[var(--platform-ink)] mb-4"
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
      <p className="text-[15px] text-[var(--platform-muted)] font-light leading-relaxed mb-5">{stage.copy}</p>
      <ul className="space-y-2.5 mb-6">
        {stage.points.map((point) => (
          <li key={point} className="flex items-start gap-2.5 text-sm text-[var(--platform-muted)]">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--platform-accent)]" aria-hidden />
            {point}
          </li>
        ))}
      </ul>
      <Link
        href="/platform/demo"
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
    const nodes = PLATFORM_SCROLL_STAGES.map(({ id }) =>
      document.getElementById(`platform-scroll-${id}`)
    ).filter(Boolean) as HTMLElement[];
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) {
          setActiveId(visible.target.id.replace("platform-scroll-", ""));
        }
      },
      { rootMargin: "-35% 0px -35% 0px", threshold: [0, 0.35, 0.6] }
    );

    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="bg-[var(--platform-bg)] border-y border-[var(--platform-border)]/60">
      {/* Mobile + tablet: tabbed dial (Fairly Made pattern) */}
      <div className="lg:hidden max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-14 sm:py-16">
        <p className="text-[10px] tracking-[0.28em] uppercase text-[var(--platform-quiet)] mb-3 text-center">
          Platform capabilities
        </p>
        <p className="text-center text-sm text-[var(--platform-muted)] max-w-md mx-auto mb-8">
          Tap each stage to see how one governed record moves from sources to passport.
        </p>
        <StageTabs activeId={activeId} onSelect={setActiveId} className="justify-center mb-10 px-1" />
        <div className="mb-12 pt-2 pb-28">
          <RecordDial stage={stage} index={activeIndex} total={PLATFORM_SCROLL_STAGES.length} compact />
        </div>
        <StageDetail stage={stage} />
      </div>

      {/* Desktop: Phia-style scroll showcase */}
      <div className="hidden lg:block max-w-[1280px] mx-auto px-8 xl:px-12 py-16 xl:py-20">
        <p className="text-[10px] tracking-[0.28em] uppercase text-[var(--platform-quiet)] mb-4 text-center">
          Platform capabilities
        </p>
        <p className="text-center text-sm text-[var(--platform-muted)] max-w-xl mx-auto mb-16 xl:mb-20">
          Scroll to see how one governed record moves from connected sources to published passport — the center dial
          updates with each stage.
        </p>

        <div className="grid grid-cols-[minmax(0,1fr)_400px_minmax(0,1fr)] xl:grid-cols-[minmax(0,1fr)_440px_minmax(0,1fr)] gap-10 xl:gap-14">
          <div className="relative">
            {PLATFORM_SCROLL_STAGES.map((item) => {
              const selected = item.id === activeId;
              return (
                <div
                  key={item.id}
                  id={`platform-scroll-${item.id}`}
                  className="min-h-[88vh] flex items-center scroll-mt-28"
                >
                  <div
                    className={`max-w-md transition-opacity duration-500 ${selected ? "opacity-100" : "opacity-35"}`}
                  >
                    <p className="text-[10px] tracking-[0.24em] uppercase text-[var(--platform-quiet)] mb-4">
                      {item.kicker}
                    </p>
                    <h2
                      className="text-[2.75rem] xl:text-[3.25rem] font-light leading-[1.08] tracking-[-0.02em] text-[var(--platform-ink)]"
                      style={SERIF}
                    >
                      {item.headline}
                      {item.headlineEmphasis ? (
                        <>
                          <br />
                          <em className="not-italic italic text-[var(--platform-accent)]">{item.headlineEmphasis}</em>
                        </>
                      ) : null}
                    </h2>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="sticky top-24 self-start h-[calc(100vh-6rem)] flex items-center justify-center pb-24">
            <RecordDial stage={stage} index={activeIndex} total={PLATFORM_SCROLL_STAGES.length} />
          </div>

          <div className="sticky top-24 self-start pt-[30vh]">
            <StageDetail stage={stage} />
            <div className="mt-16 flex flex-col gap-2">
              {PLATFORM_SCROLL_STAGES.map((item, i) => (
                <a
                  key={item.id}
                  href={`#platform-scroll-${item.id}`}
                  className={`text-[11px] tracking-[0.12em] uppercase py-1 transition-colors ${
                    item.id === activeId
                      ? "text-[var(--platform-ink)]"
                      : "text-[var(--platform-quiet)] hover:text-[var(--platform-muted)]"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")} {item.kicker}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
