"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { RecordState } from "./lifecycle-data";
import styles from "./lifecycle.module.css";

const GOOD = new Set(["Linked", "Verified", "Ready", "Published"]);

function Field({ label, value }: { label: string; value: string }) {
  const good = GOOD.has(value);
  return (
    <div className={styles.recordField}>
      <span className={styles.recordFieldLabel}>{label}</span>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={value}
          className={good ? styles.recordFieldGood : styles.recordFieldValue}
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -2 }}
          transition={{ duration: 0.28 }}
        >
          <i className={good ? styles.dotGold : styles.dotMute} aria-hidden />
          {value}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

export function CentralProductRecord({ state }: { state: RecordState }) {
  return (
    <article className={styles.record} aria-label="Governed product record">
      <header className={styles.recordHead}>
        <span className={styles.recordEyebrow}>Governed product record</span>
        <div className={styles.recordHeadRow}>
          <div>
            <h3 className={styles.recordName}>Silk Midi Skirt</h3>
            <p className={styles.recordId}>ITX-4102</p>
          </div>
          <div className={styles.recordScore}>
            <span>Readiness</span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.strong
                key={state.readiness}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                {state.readiness}%
              </motion.strong>
            </AnimatePresence>
          </div>
        </div>
      </header>

      <div className={styles.recordBody}>
        <div className={styles.recordComposition}>
          <span>Composition</span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.strong
              key={state.composition}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -2 }}
              transition={{ duration: 0.28 }}
            >
              {state.composition}
            </motion.strong>
          </AnimatePresence>
        </div>

        <div className={styles.recordGrid}>
          <Field label="Evidence" value={state.evidence} />
          <Field label="Traceability" value={state.traceability} />
          <Field label="Compliance" value={state.compliance} />
          <Field label="Passport" value={state.passport} />
        </div>

        <div className={styles.recordBar}>
          <motion.span
            animate={{ width: `${state.readiness}%` }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>
    </article>
  );
}
