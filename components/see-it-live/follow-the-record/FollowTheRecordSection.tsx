"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useReducedMotion } from "framer-motion";
import { SERIF } from "../../../app/platform/platform-ui";
import { FOLLOW_HEADER, FOLLOW_STAGES, type FollowStageId } from "./follow-the-record-data";
import { StickyDemoCanvas } from "./StickyDemoCanvas";
import styles from "./FollowTheRecordSection.module.css";

const STAGE_VH = 85;

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

/**
 * See It Live — Attio-style strip-flow walkthrough.
 * Left narrative + stage rail; right sticky evolving product record.
 * Homepage lifecycle is a separate section.
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

              <div className={styles.activeCopy} aria-live="polite">
                <p className={styles.activeMeta}>
                  {stage.number} {stage.label}
                </p>
                <h3 className={styles.activeHeadline} style={SERIF}>
                  {stage.headline}
                </h3>
                <p className={styles.activeBody}>{stage.body}</p>
              </div>
            </div>

            <div className={styles.divider} aria-hidden />

            <div className={styles.right}>
              <StickyDemoCanvas stage={stage.id as FollowStageId} />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile stacked stages — shown only under 900px via CSS */}
      <div className={styles.mobileStack}>
        <header className={styles.intro}>
          <p className={styles.eyebrow}>{FOLLOW_HEADER.eyebrow}</p>
          <h2 className={styles.headline} style={SERIF}>
            {FOLLOW_HEADER.headline}
          </h2>
          <p className={styles.lede}>{FOLLOW_HEADER.lede}</p>
        </header>
        {FOLLOW_STAGES.map((item) => (
          <article key={item.id} className={styles.mobileStage} id={`journey-${item.id}`}>
            <p className={styles.activeMeta}>
              {item.number} {item.label}
            </p>
            <h3 className={styles.activeHeadline} style={SERIF}>
              {item.headline}
            </h3>
            <p className={styles.activeBody}>{item.body}</p>
            <div className={styles.mobileCanvas}>
              <StickyDemoCanvas stage={item.id} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default FollowTheRecordSection;
