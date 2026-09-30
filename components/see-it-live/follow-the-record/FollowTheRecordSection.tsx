"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useReducedMotion } from "framer-motion";
import { SERIF } from "../../../app/platform/platform-ui";
import { FOLLOW_HEADER, FOLLOW_STAGES, type FollowStageId } from "./follow-the-record-data";
import styles from "./FollowTheRecordSection.module.css";

/** Short scroll triggers — states, not full-page slides. */
const STAGE_VH = 48;

function StageRail({
  activeIndex,
  onSelect,
}: {
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <nav className={styles.rail} aria-label="Follow the record stages">
      <ol className={styles.railList}>
        {FOLLOW_STAGES.map((stage, index) => {
          const active = index === activeIndex;
          return (
            <li key={stage.id}>
              <button
                type="button"
                className={`${styles.railBtn}${active ? ` ${styles.railBtnActive}` : ""}`}
                onClick={() => onSelect(index)}
                aria-current={active ? "step" : undefined}
              >
                <span className={styles.railAccent} aria-hidden />
                <span className={styles.railNum}>{stage.number}</span>
                <span className={styles.railLabel}>{stage.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function StageVisual({ stageId }: { stageId: FollowStageId; active?: boolean }) {
  const stage = FOLLOW_STAGES.find((item) => item.id === stageId) ?? FOLLOW_STAGES[0];

  return (
    <div className={styles.visualShell} aria-live="polite">
      <div key={stage.id} className={styles.visualFrame}>
        <div className={styles.stageVisual}>
          {/* eslint-disable-next-line @next/next/no-img-element -- original demo stage PNGs */}
          <img
            className={styles.stageBaseImage}
            src={stage.image}
            alt={stage.alt}
            width={1448}
            height={1086}
            decoding="async"
            fetchPriority="high"
          />
        </div>
      </div>
    </div>
  );
}

function StageCopy({ stageId }: { stageId: FollowStageId }) {
  const stage = FOLLOW_STAGES.find((item) => item.id === stageId) ?? FOLLOW_STAGES[0];

  return (
    <div key={stage.id} className={styles.stageCopy} aria-live="polite">
      <p className={styles.stageMeta}>
        {stage.number} {stage.label}
      </p>
      <h3 className={styles.stageHeadline} style={SERIF}>
        {stage.headline}
      </h3>
      <p className={styles.stageBody}>{stage.body}</p>
    </div>
  );
}

function MobileStageVisual({ stageId }: { stageId: FollowStageId }) {
  const stage = FOLLOW_STAGES.find((item) => item.id === stageId) ?? FOLLOW_STAGES[0];

  return (
    <div className={styles.mobileVisual}>
      <div className={styles.stageVisual}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={styles.stageBaseImage}
          src={stage.image}
          alt={stage.alt}
          width={1448}
          height={1086}
          decoding="async"
        />
      </div>
    </div>
  );
}

function MobileStageTabs({
  activeId,
  onSelect,
}: {
  activeId: FollowStageId;
  onSelect: (id: FollowStageId) => void;
}) {
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = listRef.current;
    if (!root) return;
    const btn = root.querySelector<HTMLButtonElement>(`[data-stage="${activeId}"]`);
    btn?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [activeId]);

  return (
    <nav className={styles.mobileTabs} aria-label="Follow the record stages" ref={listRef}>
      {FOLLOW_STAGES.map((stage) => {
        const active = stage.id === activeId;
        return (
          <button
            key={stage.id}
            type="button"
            data-stage={stage.id}
            className={`${styles.mobileTab}${active ? ` ${styles.mobileTabActive}` : ""}`}
            onClick={() => onSelect(stage.id)}
            aria-current={active ? "step" : undefined}
          >
            {stage.label}
          </button>
        );
      })}
    </nav>
  );
}

/**
 * See It Live — Attio-style sticky scrollytelling.
 * Short scroll triggers swap one pinned visual; left rail stays fixed.
 * Motion overlays animate story beats on SOURCE / NORMALIZE (first pass).
 */
export function FollowTheRecordSection() {
  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [mobileActiveId, setMobileActiveId] = useState<FollowStageId>("source");
  const pinRef = useRef<HTMLDivElement | null>(null);
  const stage = FOLLOW_STAGES[activeIndex] ?? FOLLOW_STAGES[0];

  useEffect(() => {
    const pin = pinRef.current;
    if (!pin) return;

    const update = () => {
      const rect = pin.getBoundingClientRect();
      const scrollable = pin.offsetHeight - window.innerHeight;
      if (scrollable <= 0) {
        setActiveIndex(0);
        return;
      }
      const scrolled = Math.min(Math.max(-rect.top, 0), scrollable);
      const progress = scrolled / scrollable;
      const next = Math.min(FOLLOW_STAGES.length - 1, Math.floor(progress * FOLLOW_STAGES.length + 0.001));
      setActiveIndex(next);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  function goToStep(index: number) {
    const pin = pinRef.current;
    if (!pin) {
      setActiveIndex(index);
      return;
    }
    const scrollable = pin.offsetHeight - window.innerHeight;
    const pinTop = pin.getBoundingClientRect().top + window.scrollY;
    const target = pinTop + (scrollable * (index + 0.45)) / FOLLOW_STAGES.length;
    window.scrollTo({ top: target, behavior: reducedMotion ? "auto" : "smooth" });
  }

  function goToMobileStage(id: FollowStageId) {
    setMobileActiveId(id);
    document.getElementById(`journey-${id}`)?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  }

  useEffect(() => {
    const nodes = FOLLOW_STAGES.map((s) => document.getElementById(`journey-${s.id}`)).filter(
      (n): n is HTMLElement => Boolean(n),
    );
    if (nodes.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const id = visible?.target.id.replace("journey-", "") as FollowStageId | undefined;
        if (id && FOLLOW_STAGES.some((s) => s.id === id)) setMobileActiveId(id);
      },
      { threshold: [0.35, 0.55], rootMargin: "-20% 0px -40% 0px" },
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);

  return (
    <section id="journey" className={`${styles.section} scroll-mt-24`} aria-labelledby="follow-record-heading">
      <div
        className={styles.pin}
        ref={pinRef}
        style={{ "--ftr-steps": FOLLOW_STAGES.length, "--ftr-stage-vh": `${STAGE_VH}vh` } as CSSProperties}
      >
        <div className={styles.sticky}>
          <div className={styles.strip}>
            <div className={styles.left}>
              <header className={styles.intro}>
                <p className={styles.eyebrow}>{FOLLOW_HEADER.eyebrow}</p>
                <h2 id="follow-record-heading" className={styles.headline} style={SERIF}>
                  {FOLLOW_HEADER.headline}
                </h2>
                <p className={styles.lede}>{FOLLOW_HEADER.lede}</p>
                <Link href={FOLLOW_HEADER.primaryCta.href} className={styles.primaryCta}>
                  {FOLLOW_HEADER.primaryCta.label}
                  <span aria-hidden>→</span>
                </Link>
              </header>
              <StageRail activeIndex={activeIndex} onSelect={goToStep} />
            </div>

            <div className={styles.right}>
              <StageVisual stageId={stage.id} />
              {/* Stage headlines are baked into the PNGs — keep live text for screen readers only. */}
              <div className={styles.stageCopyDesktop}>
                <StageCopy stageId={stage.id} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.mobileStack}>
        <header className={styles.intro}>
          <p className={styles.eyebrow}>{FOLLOW_HEADER.eyebrow}</p>
          <h2 className={styles.headline} style={SERIF}>
            {FOLLOW_HEADER.headline}
          </h2>
          <p className={styles.lede}>{FOLLOW_HEADER.lede}</p>
          <Link href={FOLLOW_HEADER.primaryCta.href} className={styles.primaryCta}>
            {FOLLOW_HEADER.primaryCta.label}
            <span aria-hidden>→</span>
          </Link>
        </header>

        <div className={styles.mobileTabsSticky}>
          <MobileStageTabs activeId={mobileActiveId} onSelect={goToMobileStage} />
        </div>

        {FOLLOW_STAGES.map((item) => (
          <article key={item.id} className={styles.mobileStage} id={`journey-${item.id}`}>
            <p className={styles.stageMeta}>
              {item.number} · {item.label}
            </p>
            <h3 className={styles.mobileStageHeadline} style={SERIF}>
              {item.headline}
            </h3>
            <p className={styles.mobileStageBody}>{item.body}</p>
            <MobileStageVisual stageId={item.id} />
          </article>
        ))}
      </div>
    </section>
  );
}

export default FollowTheRecordSection;
