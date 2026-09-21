"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SERIF } from "../../../app/platform/platform-ui";
import { LIFECYCLE_STAGES } from "./lifecycle-stages";
import styles from "./LifecycleOverviewSection.module.css";

/**
 * Homepage lifecycle — Attio vertical graph:
 * left stage rail + dominant right visual, pinned until the last stage.
 * Radial hub map removed. Exact seven INTERTEXE stage wording.
 */
export function LifecycleOverviewSection() {
  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const pinRef = useRef<HTMLDivElement | null>(null);
  const step = LIFECYCLE_STAGES[activeIndex] ?? LIFECYCLE_STAGES[0];

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
      // How far we've scrolled through the pin (0 → 1)
      const scrolled = Math.min(Math.max(-rect.top, 0), scrollable);
      const progress = scrolled / scrollable;
      const next = Math.min(
        LIFECYCLE_STAGES.length - 1,
        Math.floor(progress * LIFECYCLE_STAGES.length + 0.001),
      );
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
    const target = pinTop + (scrollable * (index + 0.5)) / LIFECYCLE_STAGES.length;
    window.scrollTo({
      top: target,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }

  return (
    <section className={styles.section} id="product-lifecycle" aria-labelledby="lifecycle-overview-heading">
      <div className={styles.introShell}>
        <div className={styles.intro}>
          <div className={styles.introCopy}>
            <p className={styles.eyebrow}>Product lifecycle</p>
            <h2 id="lifecycle-overview-heading" className={styles.headline} style={SERIF}>
              From material
              <br />
              to next life.
            </h2>
            <p className={styles.body}>
              INTERTEXE connects fragmented product information from sourcing and manufacturing through product data,
              traceability, compliance, and Digital Product Passports — then keeps that governed record useful through
              use, repair, resale, and end-of-life.
            </p>
            <div className={styles.actions}>
              <Link href="/brands/demo" className={styles.primaryCta}>
                See a live product
                <span aria-hidden>→</span>
              </Link>
              <Link href="/brands/solutions" className={styles.secondaryCta}>
                Explore how teams use it
              </Link>
            </div>
          </div>
          <div className={styles.introAside}>
            <Link href="/brands/demo" className={styles.seeItLive}>
              See it live
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </div>

      <div
        className={styles.pin}
        ref={pinRef}
        style={{ "--lov-steps": LIFECYCLE_STAGES.length } as CSSProperties}
      >
        <div className={styles.sticky}>
          <div className={styles.layout}>
            <nav className={styles.rail} aria-label="Product lifecycle stages">
              <ol className={styles.railList}>
                {LIFECYCLE_STAGES.map((item, index) => {
                  const active = index === activeIndex;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={`${styles.railBtn}${active ? ` ${styles.railBtnActive}` : ""}`}
                        onClick={() => goToStep(index)}
                        aria-current={active ? "step" : undefined}
                      >
                        <span className={styles.railIndicator} aria-hidden />
                        <span className={styles.railLabel}>
                          <span className={styles.railNum}>{item.number}</span>
                          {item.title}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>

            <div className={styles.stage} aria-live="polite">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={step.id}
                  className={styles.stageInner}
                  initial={reducedMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reducedMotion ? undefined : { opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className={styles.visual}>
                    <div className={styles.visualCopy}>
                      <p className={styles.visualMeta}>
                        {step.number} · {step.title}
                      </p>
                      <h3 className={styles.visualTitle} style={SERIF}>
                        {step.subtitle}
                      </h3>
                      <p className={styles.visualBody}>{step.description}</p>
                      <ul className={styles.chips}>
                        {step.chips.map((chip) => (
                          <li key={chip}>{chip}</li>
                        ))}
                      </ul>
                    </div>
                    <div className={styles.visualMedia}>
                      <img
                        src={step.image}
                        alt={step.alt}
                        width={1672}
                        height={941}
                        decoding="async"
                        fetchPriority="high"
                      />
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default LifecycleOverviewSection;
