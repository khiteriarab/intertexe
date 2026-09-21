"use client";

import { motion } from "framer-motion";
import type { LifecycleStageId } from "./lifecycle-data";
import styles from "./lifecycle.module.css";

export function StageMicroVisual({
  kind,
  active,
}: {
  kind: LifecycleStageId;
  active: boolean;
}) {
  const opacity = active ? 1 : 0.42;

  if (kind === "source") {
    return (
      <motion.div className={`${styles.micro} ${styles.microSource}`} animate={{ opacity }} transition={{ duration: 0.35 }}>
        {["Style + BOM", "Supplier + PO", "Composition", "Evidence"].map((row, i) => (
          <motion.span
            key={row}
            animate={active ? { x: 0, opacity: 1 } : { x: -4, opacity: 0.55 }}
            transition={{ delay: active ? i * 0.05 : 0, duration: 0.3 }}
          >
            {row}
          </motion.span>
        ))}
      </motion.div>
    );
  }

  if (kind === "clean") {
    return (
      <motion.div className={`${styles.micro} ${styles.microNormalize}`} animate={{ opacity }} transition={{ duration: 0.35 }}>
        <span className={styles.microMessy}>Silk 96% · 96 silk · SILK:96</span>
        <span className={styles.microArrow} aria-hidden>
          →
        </span>
        <span className={`${styles.microPill} ${active ? styles.microPillActive : ""}`}>96% Silk · 4% Elastane</span>
      </motion.div>
    );
  }

  if (kind === "trace") {
    return (
      <motion.div className={`${styles.micro} ${styles.microTrace}`} animate={{ opacity }} transition={{ duration: 0.35 }}>
        <svg viewBox="0 0 120 56" className={styles.microSvg} aria-hidden>
          <motion.circle cx="18" cy="28" r="3.5" fill={active ? "#c4a574" : "#d8d2c8"} />
          <motion.circle cx="60" cy="14" r="3.5" fill={active ? "#c4a574" : "#d8d2c8"} />
          <motion.circle cx="60" cy="42" r="3.5" fill={active ? "#c4a574" : "#d8d2c8"} />
          <motion.circle cx="102" cy="28" r="4" fill={active ? "#1f1f1c" : "#d8d2c8"} />
          <motion.path
            d="M22 28 H54 M64 16 L98 26 M64 40 L98 30"
            fill="none"
            stroke={active ? "rgba(196,165,116,.7)" : "#d8d2c8"}
            strokeWidth="1"
            strokeDasharray="3 3"
            animate={{ pathLength: active ? 1 : 0.4 }}
            transition={{ duration: 0.6 }}
          />
        </svg>
        <span>Claims · evidence · custody</span>
      </motion.div>
    );
  }

  if (kind === "prepare") {
    return (
      <motion.div className={`${styles.micro} ${styles.microPrepare}`} animate={{ opacity }} transition={{ duration: 0.35 }}>
        {["Fields", "Evidence", "DPP"].map((item, i) => (
          <span key={item} className={styles.microCheck}>
            <motion.i
              animate={{
                backgroundColor: active ? "#c4a574" : "transparent",
                borderColor: active ? "#c4a574" : "#d8d2c8",
              }}
              transition={{ delay: active ? i * 0.08 : 0, duration: 0.25 }}
            />
            {item}
          </span>
        ))}
      </motion.div>
    );
  }

  if (kind === "publish") {
    return (
      <motion.div className={`${styles.micro} ${styles.microPublish}`} animate={{ opacity }} transition={{ duration: 0.35 }}>
        <div className={styles.microId}>
          <span>DPP</span>
          <strong>ITX-4102</strong>
        </div>
        <div className={styles.microChannels}>
          {["QR", "WEB", "API"].map((ch, i) => (
            <motion.span
              key={ch}
              animate={{ opacity: active ? 1 : 0.45, x: active ? 0 : 3 }}
              transition={{ delay: active ? i * 0.06 : 0, duration: 0.3 }}
            >
              {ch}
            </motion.span>
          ))}
        </div>
      </motion.div>
    );
  }

  if (kind === "learn") {
    return (
      <motion.div className={`${styles.micro} ${styles.microLearn}`} animate={{ opacity }} transition={{ duration: 0.35 }}>
        <span className={styles.microLearnLabel}>Higher than peer median</span>
        <div className={styles.microChart}>
          <motion.span
            animate={{ width: active ? "78%" : "48%" }}
            transition={{ duration: 0.55 }}
          />
          <i />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div className={`${styles.micro} ${styles.microLoop}`} animate={{ opacity }} transition={{ duration: 0.35 }}>
      <svg viewBox="0 0 72 72" className={styles.microSvg} aria-hidden>
        <motion.circle
          cx="36"
          cy="36"
          r="22"
          fill="none"
          stroke={active ? "#c4a574" : "#d8d2c8"}
          strokeWidth="1.25"
          strokeDasharray="100"
          animate={{ strokeDashoffset: active ? 8 : 42 }}
          transition={{ duration: 0.8 }}
        />
        <circle cx="36" cy="36" r="3" fill={active ? "#1f1f1c" : "#d8d2c8"} />
      </svg>
      <span>Care · resale · reuse</span>
    </motion.div>
  );
}
