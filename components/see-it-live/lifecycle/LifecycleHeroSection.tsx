"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useReducedMotion } from "framer-motion";
import { SERIF } from "../../../app/platform/platform-ui";
import { marketingPath } from "../../../lib/enterprise-marketing/paths";
import { DWELL_MS, LIFECYCLE_STAGES, RESUME_MS } from "./lifecycle-data";
import { LifecycleMapCanvas } from "./LifecycleMapCanvas";
import { RecordTransitionBridge } from "./RecordTransitionBridge";
import styles from "./lifecycle.module.css";

export function LifecycleHeroSection() {
  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (reducedMotion || paused) return;
    const timer = window.setInterval(() => {
      setActiveIndex((value) => (value + 1) % LIFECYCLE_STAGES.length);
    }, DWELL_MS);
    return () => window.clearInterval(timer);
  }, [reducedMotion, paused]);

  const selectStage = (index: number) => {
    setActiveIndex(index);
    setPaused(true);
    window.setTimeout(() => setPaused(false), RESUME_MS);
  };

  return (
    <section className={styles.section} aria-labelledby="lifecycle-hero-heading">
      <div className={styles.intro}>
        <p className={styles.eyebrow}>Product lifecycle</p>
        <h2 id="lifecycle-hero-heading" className={styles.headline} style={SERIF}>
          From material
          <br />
          to next life.
        </h2>
        <p className={styles.lede}>
          INTERTEXE connects fragmented product information from sourcing and manufacturing through product data,
          traceability, compliance, and Digital Product Passports — then keeps that governed record useful through
          use, repair, resale, and end-of-life.
        </p>
        <div className={styles.ctaRow}>
          <Link href="#follow-the-record" className={styles.ctaPrimary}>
            See a live product
            <span aria-hidden>→</span>
          </Link>
          <Link href={marketingPath("solutions")} className={styles.ctaSecondary}>
            Or explore how teams use it
          </Link>
        </div>
      </div>

      <LifecycleMapCanvas activeIndex={activeIndex} onSelect={selectStage} />

      <div id="follow-the-record">
        <RecordTransitionBridge />
      </div>
    </section>
  );
}
