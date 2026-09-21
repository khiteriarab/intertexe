"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FOLLOW_STAGES, type FollowStageId } from "./follow-the-record-data";
import styles from "./FollowTheRecordSection.module.css";

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * Right-side sticky canvas — uses the original stage PNGs
 * (demo-source / normalize / validate / publish / activate / measure).
 */
export function StickyDemoCanvas({ stage }: { stage: FollowStageId }) {
  const reducedMotion = useReducedMotion();
  const active = FOLLOW_STAGES.find((item) => item.id === stage) ?? FOLLOW_STAGES[0];

  return (
    <div className={styles.canvas} aria-live="polite">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={active.id}
          className={styles.canvasStage}
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: 0.32, ease }}
        >
          <div className={styles.stageVisual}>
            {/* eslint-disable-next-line @next/next/no-img-element -- original demo stage assets */}
            <img
              src={active.image}
              alt={active.alt}
              width={1672}
              height={941}
              decoding="async"
              fetchPriority="high"
            />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
