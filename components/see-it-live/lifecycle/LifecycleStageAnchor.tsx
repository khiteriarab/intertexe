"use client";

import { motion } from "framer-motion";
import type { LifecycleStage } from "./lifecycle-data";
import styles from "./lifecycle.module.css";

export function LifecycleStageAnchor({
  stage,
  active,
  onSelect,
}: {
  stage: LifecycleStage;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.anchor} ${active ? styles.anchorActive : ""}`}
      style={{ left: `${stage.x}%`, top: `${stage.y}%` }}
      onClick={onSelect}
      aria-current={active ? "step" : undefined}
    >
      <span className={styles.anchorNode} aria-hidden>
        <motion.span
          className={styles.anchorPulse}
          animate={active ? { scale: [1, 1.55, 1], opacity: [0.45, 0, 0.45] } : { scale: 1, opacity: 0 }}
          transition={active ? { duration: 2.2, repeat: Infinity, ease: "easeOut" } : { duration: 0.2 }}
        />
      </span>
      <span className={styles.anchorCopy}>
        <span className={styles.anchorNum}>{stage.number}</span>
        <span className={styles.anchorTitle}>{stage.title}</span>
        <span className={styles.anchorShort}>{stage.short}</span>
      </span>
    </button>
  );
}
