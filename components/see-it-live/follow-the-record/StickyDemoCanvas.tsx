"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import type { ReactNode } from "react";
import {
  ACTIVATE_TAGS,
  EVIDENCE_NODES,
  MEASURE_SIGNALS,
  MESSY_STRINGS,
  PRODUCT_RECORD,
  PUBLISH_CHANNELS,
  SOURCE_INPUTS,
  type FollowStageId,
} from "./follow-the-record-data";
import styles from "./FollowTheRecordSection.module.css";

const ease = [0.22, 1, 0.36, 1] as const;

function RecordStatus({ stage }: { stage: FollowStageId }) {
  const map: Record<FollowStageId, { label: string; tone: "draft" | "clean" | "ready" | "live" | "learn" }> = {
    source: { label: "Ingesting", tone: "draft" },
    normalize: { label: "Structured", tone: "clean" },
    validate: { label: "Verified", tone: "ready" },
    publish: { label: "Published", tone: "live" },
    activate: { label: "Live touchpoint", tone: "live" },
    measure: { label: "Learning", tone: "learn" },
  };
  const status = map[stage];
  return <span className={`${styles.status} ${styles[`status_${status.tone}`]}`}>{status.label}</span>;
}

function ProductRecordFrame({ stage }: { stage: FollowStageId }) {
  return (
    <div className={styles.record} data-stage={stage}>
      <div className={styles.recordTop}>
        <span className={styles.recordEyebrow}>Governed record</span>
        <RecordStatus stage={stage} />
      </div>
      <div className={styles.recordBody}>
        <div className={styles.recordThumb}>
          <Image src={PRODUCT_RECORD.image} alt="" width={72} height={90} unoptimized />
        </div>
        <div className={styles.recordMeta}>
          <p className={styles.recordName}>{PRODUCT_RECORD.name}</p>
          <p className={styles.recordSku}>{PRODUCT_RECORD.sku}</p>
          <p className={styles.recordComp}>{PRODUCT_RECORD.composition}</p>
          <p className={styles.recordOrigin}>{PRODUCT_RECORD.origin}</p>
        </div>
      </div>
    </div>
  );
}

function SourceLayer() {
  return (
    <div className={styles.layer}>
      <div className={styles.sourceCluster}>
        {SOURCE_INPUTS.map((input, i) => (
          <motion.div
            key={input.id}
            className={styles.inputChip}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, duration: 0.35, ease }}
          >
            <span className={styles.inputLabel}>{input.label}</span>
            <span className={styles.inputDetail}>{input.detail}</span>
            <span className={styles.inputKind}>{input.kind}</span>
          </motion.div>
        ))}
      </div>
      <svg className={styles.connectors} viewBox="0 0 180 320" aria-hidden>
        {SOURCE_INPUTS.map((_, i) => {
          const y = 28 + i * 58;
          return (
            <path
              key={i}
              d={`M 8 ${y} C 70 ${y}, 110 160, 172 160`}
              fill="none"
              stroke={i === 1 ? "var(--ftr-gold)" : "var(--ftr-line-strong)"}
              strokeWidth="1"
              opacity={i === 1 ? 0.95 : 0.55}
            />
          );
        })}
      </svg>
      <div className={styles.layerRecord}>
        <ProductRecordFrame stage="source" />
      </div>
    </div>
  );
}

function NormalizeLayer() {
  return (
    <div className={styles.layer}>
      <div className={styles.messyCluster}>
        {MESSY_STRINGS.map((value, i) => (
          <motion.span
            key={value}
            className={styles.messyChip}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 0.55 + i * 0.08, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3, ease }}
          >
            {value}
          </motion.span>
        ))}
      </div>
      <svg className={styles.normalizeArrow} viewBox="0 0 120 40" aria-hidden>
        <path d="M8 20 H90" stroke="var(--ftr-gold)" strokeWidth="1" fill="none" />
        <path d="M84 14 l10 6 -10 6" stroke="var(--ftr-gold)" strokeWidth="1" fill="none" />
      </svg>
      <div className={styles.layerRecord}>
        <ProductRecordFrame stage="normalize" />
        <motion.p
          className={styles.normalizedValue}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.35, ease }}
        >
          {PRODUCT_RECORD.composition}
        </motion.p>
      </div>
    </div>
  );
}

function ValidateLayer() {
  return (
    <div className={`${styles.layer} ${styles.layerSplit}`}>
      <div className={styles.layerRecord}>
        <ProductRecordFrame stage="validate" />
      </div>
      <div className={styles.evidenceCluster}>
        {EVIDENCE_NODES.map((node, i) => (
          <motion.div
            key={node.id}
            className={styles.evidenceNode}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06, duration: 0.35, ease }}
          >
            <span className={styles.evidenceLabel}>{node.label}</span>
            <span className={styles.evidenceState}>
              <span className={styles.evidenceFrom}>{node.from}</span>
              <span aria-hidden>→</span>
              <span className={styles.evidenceTo}>{node.to}</span>
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function PublishLayer() {
  return (
    <div className={styles.layer}>
      <div className={styles.layerRecord}>
        <ProductRecordFrame stage="publish" />
      </div>
      <svg className={styles.publishBranches} viewBox="0 0 200 280" aria-hidden>
        {PUBLISH_CHANNELS.map((_, i) => {
          const y = 40 + i * 60;
          return (
            <path
              key={i}
              d={`M 8 140 C 70 140, 100 ${y}, 168 ${y}`}
              fill="none"
              stroke={i === 1 ? "var(--ftr-gold)" : "var(--ftr-line-strong)"}
              strokeWidth="1"
            />
          );
        })}
      </svg>
      <div className={styles.channelCluster}>
        {PUBLISH_CHANNELS.map((channel, i) => (
          <motion.span
            key={channel}
            className={styles.channelChip}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3, ease }}
          >
            {channel}
          </motion.span>
        ))}
      </div>
    </div>
  );
}

function ActivateLayer() {
  return (
    <div className={`${styles.layer} ${styles.layerSplit}`}>
      <div className={styles.layerRecord}>
        <ProductRecordFrame stage="activate" />
      </div>
      <motion.div
        className={styles.passportPreview}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease }}
      >
        <p className={styles.passportEyebrow}>Digital Product Passport</p>
        <p className={styles.passportName}>{PRODUCT_RECORD.name}</p>
        <div className={styles.qrBlock} aria-hidden>
          <span />
          <span />
          <span />
          <span />
        </div>
        <ul className={styles.activateTags}>
          {ACTIVATE_TAGS.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      </motion.div>
    </div>
  );
}

function MeasureLayer() {
  return (
    <div className={styles.layer}>
      <div className={styles.signalCluster}>
        {MEASURE_SIGNALS.map((signal, i) => (
          <motion.div
            key={signal}
            className={styles.signalChip}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3, ease }}
          >
            {signal}
          </motion.div>
        ))}
        <div className={styles.benchmark} aria-hidden>
          {[0.35, 0.55, 0.7, 0.92].map((h, i) => (
            <span key={i} style={{ height: `${h * 100}%` }} className={i === 3 ? styles.barAccent : undefined} />
          ))}
        </div>
      </div>
      <svg className={styles.measureReturn} viewBox="0 0 160 240" aria-hidden>
        {MEASURE_SIGNALS.map((_, i) => {
          const y = 50 + i * 55;
          return (
            <path
              key={i}
              d={`M 150 ${y} C 100 ${y}, 70 120, 10 120`}
              fill="none"
              stroke={i === 1 ? "var(--ftr-gold)" : "var(--ftr-line-strong)"}
              strokeWidth="1"
              strokeDasharray={i === 0 ? "3 3" : undefined}
            />
          );
        })}
      </svg>
      <div className={styles.layerRecord}>
        <ProductRecordFrame stage="measure" />
      </div>
    </div>
  );
}

const LAYERS: Record<FollowStageId, () => ReactNode> = {
  source: SourceLayer,
  normalize: NormalizeLayer,
  validate: ValidateLayer,
  publish: PublishLayer,
  activate: ActivateLayer,
  measure: MeasureLayer,
};

export function StickyDemoCanvas({ stage }: { stage: FollowStageId }) {
  const reducedMotion = useReducedMotion();
  const Layer = LAYERS[stage];

  return (
    <div className={styles.canvas} aria-live="polite">
      <div className={styles.canvasGrid} aria-hidden />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={stage}
          className={styles.canvasStage}
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease }}
        >
          <Layer />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
