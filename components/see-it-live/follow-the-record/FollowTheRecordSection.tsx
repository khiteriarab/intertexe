"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SERIF } from "../../../app/platform/platform-ui";
import { FOLLOW_HEADER, FOLLOW_STAGES, type FollowStageId } from "./follow-the-record-data";
import styles from "./FollowTheRecordSection.module.css";

/** Short scroll triggers — states, not full-page slides. */
const STAGE_VH = 52;
const ease = [0.22, 1, 0.36, 1] as const;

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

function StageVisual({ stageId }: { stageId: FollowStageId }) {
  const reducedMotion = useReducedMotion();
  const active = FOLLOW_STAGES.find((item) => item.id === stageId) ?? FOLLOW_STAGES[0];

  return (
    <div className={styles.visualShell} aria-live="polite">
      <div className={styles.visualGlow} aria-hidden />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={active.id}
          className={styles.visualFrame}
          initial={reducedMotion ? false : { opacity: 0, y: 16, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reducedMotion ? undefined : { opacity: 0, y: -12, scale: 0.99 }}
          transition={{ duration: 0.55, ease }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- original demo stage PNGs */}
          <img
            src={active.image}
            alt={active.alt}
            width={1672}
            height={941}
            decoding="async"
            fetchPriority="high"
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function StageCopy({ stageId }: { stageId: FollowStageId }) {
  const reducedMotion = useReducedMotion();
  const stage = FOLLOW_STAGES.find((item) => item.id === stageId) ?? FOLLOW_STAGES[0];

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={stage.id}
        className={styles.stageCopy}
        initial={reducedMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
        transition={{ duration: 0.45, ease }}
        aria-live="polite"
      >
        <p className={styles.stageMeta}>
          {stage.number} {stage.label}
        </p>
        <h3 className={styles.stageHeadline} style={SERIF}>
          {stage.headline}
        </h3>
        <p className={styles.stageBody}>{stage.body}</p>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * See It Live — Attio-style sticky scrollytelling.
 * Short scroll triggers swap one pinned visual; left rail stays fixed.
 */
export function FollowTheRecordSection() {
  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
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
              <StageCopy stageId={stage.id} />
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
        {FOLLOW_STAGES.map((item) => (
          <article key={item.id} className={styles.mobileStage} id={`journey-${item.id}`}>
            <p className={styles.stageMeta}>
              {item.number} {item.label}
            </p>
            <h3 className={styles.stageHeadline} style={SERIF}>
              {item.headline}
            </h3>
            <p className={styles.stageBody}>{item.body}</p>
            <div className={styles.mobileVisual}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.image} alt={item.alt} width={1672} height={941} decoding="async" />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default FollowTheRecordSection;
