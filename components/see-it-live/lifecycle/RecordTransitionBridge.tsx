"use client";

import { motion, useReducedMotion } from "framer-motion";
import { SERIF } from "../../../app/platform/platform-ui";
import styles from "./lifecycle.module.css";

export function RecordTransitionBridge() {
  const reducedMotion = useReducedMotion();

  return (
    <div className={styles.bridge}>
      <div className={styles.bridgeRail} aria-hidden>
        <motion.span
          animate={reducedMotion ? undefined : { y: [0, 56], opacity: [0, 1, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      <div className={styles.bridgeCopy}>
        <p className={styles.bridgeEyebrow}>Follow the record</p>
        <h3 className={styles.bridgeTitle} style={SERIF}>
          See the record evolve.
        </h3>
        <p className={styles.bridgeLede}>
          One product. Six states. From source data to live product intelligence — then into the software itself.
        </p>
      </div>
    </div>
  );
}
