"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { FollowStageId } from "./follow-the-record-data";
import styles from "./FollowTheRecordSection.module.css";

const ease = [0.22, 1, 0.36, 1] as const;

const SOURCE_CARDS = [
  { id: "plm", label: "PLM", detail: "92% silk, 8% elastane", delay: 0.15 },
  { id: "erp", label: "ERP", detail: "SKU · Silk Midi Skirt", delay: 0.45 },
  { id: "sheet", label: "Spreadsheet", detail: "XLS · composition", delay: 0.75 },
  { id: "supplier", label: "Supplier file", detail: "PDF · mill cert", delay: 1.05 },
  { id: "retail", label: "Retailer feed", detail: "CSV · attributes", delay: 1.35 },
] as const;

const NORMALIZE_PROMPT = "Normalize composition for Silk Midi Skirt";
const CHAR_MS = 45;

type OverlayProps = {
  active: boolean;
  /** When true, play immediately once (mobile IO). Desktop plays when stage becomes active. */
  autoPlay?: boolean;
};

function useStagePlay(active: boolean, reducedMotion: boolean | null) {
  const [playKey, setPlayKey] = useState(0);
  useEffect(() => {
    if (!active) return;
    setPlayKey((k) => k + 1);
  }, [active]);
  return { playKey, instant: Boolean(reducedMotion) };
}

/** SOURCE — highlight inputs → draw connectors → brighten record → status. */
export function SourceOverlay({ active }: OverlayProps) {
  const reducedMotion = useReducedMotion();
  const { playKey, instant } = useStagePlay(active, reducedMotion);
  if (!active) return null;

  const statusMotion = instant
    ? { initial: false as const, animate: { opacity: 1, y: 0 } }
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.45, delay: 2.7, ease },
      };

  return (
    <div key={playKey} className={`${styles.overlay} ${styles.overlaySource}`} aria-hidden>
      <div className={styles.sourceCards}>
        {SOURCE_CARDS.map((card) => (
          <motion.div
            key={card.id}
            className={styles.sourceCard}
            {...(instant
              ? { initial: false as const, animate: { opacity: 1, y: 0 } }
              : {
                  initial: { opacity: 0, y: 12 },
                  animate: { opacity: 1, y: 0 },
                  transition: { duration: 0.4, delay: card.delay, ease },
                })}
          >
            <span className={styles.sourceCardLabel}>{card.label}</span>
            <span className={styles.sourceCardDetail}>{card.detail}</span>
          </motion.div>
        ))}
      </div>

      <svg className={styles.sourceLines} viewBox="0 0 100 100" preserveAspectRatio="none">
        {SOURCE_CARDS.map((card, i) => {
          const y = 18 + i * 14;
          return (
            <motion.path
              key={card.id}
              d={`M 28 ${y} C 48 ${y}, 58 50, 72 52`}
              fill="none"
              stroke="rgba(201,169,98,0.55)"
              strokeWidth="0.45"
              strokeLinecap="round"
              initial={instant ? false : { pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={
                instant
                  ? { duration: 0 }
                  : { duration: 0.7, delay: 1.55 + i * 0.12, ease }
              }
            />
          );
        })}
      </svg>

      <motion.div
        className={styles.sourceRecordPulse}
        initial={instant ? false : { opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={instant ? { duration: 0 } : { duration: 0.55, delay: 2.35, ease }}
      />

      <motion.p className={styles.overlayStatus} {...statusMotion}>
        Sources connected
      </motion.p>
    </div>
  );
}

/** NORMALIZE — type command → raw → structured → status chips. */
export function NormalizeOverlay({ active }: OverlayProps) {
  const reducedMotion = useReducedMotion();
  const { playKey, instant } = useStagePlay(active, reducedMotion);
  const [typed, setTyped] = useState(instant ? NORMALIZE_PROMPT : "");
  const [phase, setPhase] = useState<"type" | "raw" | "structured" | "done">(
    instant ? "done" : "type",
  );

  useEffect(() => {
    if (!active) return;
    if (instant) {
      setTyped(NORMALIZE_PROMPT);
      setPhase("done");
      return;
    }

    setTyped("");
    setPhase("type");
    let i = 0;
    const typeTimer = window.setInterval(() => {
      i += 1;
      setTyped(NORMALIZE_PROMPT.slice(0, i));
      if (i >= NORMALIZE_PROMPT.length) {
        window.clearInterval(typeTimer);
        window.setTimeout(() => setPhase("raw"), 280);
        window.setTimeout(() => setPhase("structured"), 1100);
        window.setTimeout(() => setPhase("done"), 2000);
      }
    }, CHAR_MS);

    return () => window.clearInterval(typeTimer);
  }, [active, playKey, instant]);

  if (!active) return null;

  const showRaw = phase === "raw" || phase === "structured" || phase === "done";
  const showStructured = phase === "structured" || phase === "done";
  const showStatus = phase === "done";

  return (
    <div key={playKey} className={`${styles.overlay} ${styles.overlayNormalize}`} aria-hidden>
      <div className={styles.normalizePanel}>
        <p className={styles.normalizePromptLabel}>INTERTEXE</p>
        <div className={styles.normalizeInput}>
          <span className={styles.normalizeTyped}>{typed}</span>
          {phase === "type" ? <span className={styles.normalizeCursor} /> : null}
        </div>

        {showRaw ? (
          <motion.div
            className={styles.normalizeBlock}
            initial={instant ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: showStructured ? 0.45 : 1, y: 0 }}
            transition={{ duration: 0.35, ease }}
          >
            <p className={styles.normalizeBlockLabel}>Raw input</p>
            <p className={styles.normalizeRaw}>92 SE 8 EA</p>
            <p className={styles.normalizeRaw}>96 silk 4 elastane</p>
          </motion.div>
        ) : null}

        {showStructured ? (
          <motion.div
            className={styles.normalizeBlock}
            initial={instant ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease }}
          >
            <p className={styles.normalizeBlockLabel}>Structured</p>
            <p className={styles.normalizeClean}>92% Silk · 8% Elastane</p>
            <p className={styles.normalizeClean}>96% Silk · 4% Elastane</p>
          </motion.div>
        ) : null}

        {showStatus ? (
          <div className={styles.normalizeStatuses}>
            {["Structured", "Standardized", "Source preserved"].map((label, index) => (
              <motion.span
                key={label}
                className={styles.normalizeChip}
                initial={instant ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: instant ? 0 : index * 0.22, ease }}
              >
                {label}
              </motion.span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function StageInteractiveOverlay({
  stageId,
  active,
}: {
  stageId: FollowStageId;
  active: boolean;
}) {
  if (stageId === "source") return <SourceOverlay active={active} />;
  if (stageId === "normalize") return <NormalizeOverlay active={active} />;
  return null;
}
