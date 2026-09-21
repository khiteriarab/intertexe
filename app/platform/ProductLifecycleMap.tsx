"use client";

import { useEffect, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";

import styles from "./ProductLifecycleMap.module.css";

type StageId =
  | "source"
  | "clean"
  | "trace"
  | "prepare"
  | "publish"
  | "learn"
  | "recirculate";

type Stage = {
  id: StageId;
  number: string;
  title: string;
  descriptor: string;
};

const STAGES: Stage[] = [
  {
    id: "source",
    number: "01",
    title: "Source & Make",
    descriptor: "Materials · suppliers · manufacturing",
  },
  {
    id: "clean",
    number: "02",
    title: "Clean & Connect",
    descriptor: "One trusted product record",
  },
  {
    id: "trace",
    number: "03",
    title: "Trace & Prove",
    descriptor: "Claims linked to evidence",
  },
  {
    id: "prepare",
    number: "04",
    title: "Check & Prepare",
    descriptor: "Compliance + DPP readiness",
  },
  {
    id: "publish",
    number: "05",
    title: "Passport & Publish",
    descriptor: "Governed identity distributed",
  },
  {
    id: "learn",
    number: "06",
    title: "Use & Learn",
    descriptor: "Intelligence from every channel",
  },
  {
    id: "recirculate",
    number: "07",
    title: "Repair & Recirculate",
    descriptor: "Useful beyond the first sale",
  },
];

const RECORD_STATES = [
  {
    composition: "Incoming values",
    evidence: "Pending",
    traceability: "Incomplete",
    compliance: "Review",
    passport: "Draft",
    readiness: 24,
    signal: null as string | null,
    lifecycle: null as string | null,
  },
  {
    composition: "96% Silk · 4% Elastane",
    evidence: "Pending",
    traceability: "Incomplete",
    compliance: "Review",
    passport: "Draft",
    readiness: 46,
    signal: null,
    lifecycle: null,
  },
  {
    composition: "96% Silk · 4% Elastane",
    evidence: "Linked",
    traceability: "Verified",
    compliance: "Review",
    passport: "Draft",
    readiness: 67,
    signal: null,
    lifecycle: null,
  },
  {
    composition: "96% Silk · 4% Elastane",
    evidence: "Linked",
    traceability: "Verified",
    compliance: "Ready",
    passport: "Draft",
    readiness: 86,
    signal: null,
    lifecycle: null,
  },
  {
    composition: "96% Silk · 4% Elastane",
    evidence: "Linked",
    traceability: "Verified",
    compliance: "Ready",
    passport: "Published",
    readiness: 94,
    signal: null,
    lifecycle: null,
  },
  {
    composition: "96% Silk · 4% Elastane",
    evidence: "Linked",
    traceability: "Verified",
    compliance: "Ready",
    passport: "Published",
    readiness: 94,
    signal: "Benchmark signal received",
    lifecycle: null,
  },
  {
    composition: "96% Silk · 4% Elastane",
    evidence: "Linked",
    traceability: "Verified",
    compliance: "Ready",
    passport: "Published",
    readiness: 94,
    signal: "Benchmark signal received",
    lifecycle: "Next-life record active",
  },
];

function StageLabel({
  stage,
  active,
  onClick,
}: {
  stage: Stage;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.stageLabel} ${active ? styles.stageActive : ""}`}
      onClick={onClick}
    >
      <span className={styles.stageNumber}>{stage.number}</span>
      <span className={styles.stageTitle}>{stage.title}</span>
      <span className={styles.stageDescriptor}>{stage.descriptor}</span>
    </button>
  );
}

function Sources({ active }: { active: boolean }) {
  const sources = [
    ["PLM", "Style + BOM"],
    ["ERP", "Supplier + PO"],
    ["SUPPLIER", "Evidence"],
    ["CSV", "Composition"],
  ];

  return (
    <div className={styles.sourceVisual}>
      {sources.map(([type, value], index) => (
        <motion.div
          key={type}
          className={styles.sourceRow}
          animate={{
            x: active ? 8 : 0,
            opacity: active ? 1 : 0.56,
          }}
          transition={{
            duration: 0.42,
            delay: active ? index * 0.07 : 0,
          }}
        >
          <span>{type}</span>
          <strong>{value}</strong>
          <i />
        </motion.div>
      ))}
    </div>
  );
}

function Normalization({ active }: { active: boolean }) {
  const strings = ["Silk 96", "96 silk", "SILK:96%", "96% Seide"];

  return (
    <div className={styles.normalization}>
      <div className={styles.rawStrings}>
        {strings.map((value, index) => (
          <motion.span
            key={value}
            animate={{
              opacity: active ? 0.24 : 0.72,
              x: active ? 15 : index % 2 === 0 ? -4 : 3,
            }}
            transition={{ duration: 0.5 }}
          >
            {value}
          </motion.span>
        ))}
      </div>

      <motion.div
        className={styles.normalizeLine}
        animate={{
          scaleX: active ? 1 : 0.4,
          opacity: active ? 1 : 0.35,
        }}
      />

      <motion.div
        className={styles.normalizedValue}
        animate={{
          opacity: active ? 1 : 0.55,
          borderColor: active ? "rgba(201,169,98,.85)" : "rgba(255,255,255,.15)",
        }}
      >
        <span>MATERIAL COMPOSITION</span>
        <strong>96% Silk · 4% Elastane</strong>
      </motion.div>
    </div>
  );
}

function EvidenceNetwork({ active }: { active: boolean }) {
  const evidence = ["Supplier declaration", "Origin evidence", "Chain of custody"];

  return (
    <div className={styles.evidenceNetwork}>
      {evidence.map((item, index) => (
        <motion.div
          key={item}
          className={styles.evidenceNode}
          animate={{
            opacity: active ? 1 : 0.42,
            x: active ? 0 : -8,
          }}
          transition={{
            delay: active ? index * 0.08 : 0,
          }}
        >
          <i />
          <span>{item}</span>
          <motion.b
            animate={{
              scaleX: active ? 1 : 0.25,
            }}
          />
        </motion.div>
      ))}
    </div>
  );
}

function ComplianceStack({ active }: { active: boolean }) {
  const checks = ["Required fields", "Evidence", "Traceability", "DPP readiness"];

  return (
    <div className={styles.complianceStack}>
      {checks.map((item, index) => (
        <motion.div
          key={item}
          animate={{
            opacity: active ? 1 : 0.48,
          }}
          transition={{
            delay: active ? index * 0.07 : 0,
          }}
        >
          <motion.span
            animate={{
              backgroundColor: active ? "#c9a962" : "rgba(255,255,255,.06)",
              borderColor: active ? "#c9a962" : "rgba(255,255,255,.16)",
            }}
          >
            {active ? "✓" : ""}
          </motion.span>
          {item}
        </motion.div>
      ))}
    </div>
  );
}

function ProductRecord({ stageIndex }: { stageIndex: number }) {
  const state = RECORD_STATES[stageIndex];

  const fields = [
    ["Evidence", state.evidence],
    ["Traceability", state.traceability],
    ["Compliance", state.compliance],
    ["Passport", state.passport],
  ];

  return (
    <div className={styles.productRecord}>
      <div className={styles.recordTop}>
        <div>
          <span>GOVERNED PRODUCT RECORD</span>
          <h3>Silk Midi Skirt</h3>
          <small>ITX-4102</small>
        </div>

        <div className={styles.recordScore}>
          <strong>{state.readiness}%</strong>
          <span>READY</span>
        </div>
      </div>

      <div className={styles.compositionRow}>
        <span>MATERIAL COMPOSITION</span>
        <AnimatePresence mode="wait">
          <motion.strong
            key={state.composition}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
          >
            {state.composition}
          </motion.strong>
        </AnimatePresence>
      </div>

      <div className={styles.recordGrid}>
        {fields.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <AnimatePresence mode="wait">
              <motion.strong
                key={value}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.24 }}
              >
                {value}
              </motion.strong>
            </AnimatePresence>
          </div>
        ))}
      </div>

      {(state.signal || state.lifecycle) && (
        <div className={styles.dynamicRows}>
          <AnimatePresence>
            {state.signal && (
              <motion.div
                key="signal"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <span>INTELLIGENCE</span>
                <strong>{state.signal}</strong>
              </motion.div>
            )}

            {state.lifecycle && (
              <motion.div
                key="lifecycle"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <span>NEXT LIFE</span>
                <strong>{state.lifecycle}</strong>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <div className={styles.readiness}>
        <div>
          <span>Record readiness</span>
          <strong>{state.readiness}%</strong>
        </div>
        <div className={styles.readinessTrack}>
          <motion.div
            animate={{
              width: `${state.readiness}%`,
            }}
            transition={{
              type: "spring",
              stiffness: 65,
              damping: 18,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function PublishNetwork({ active }: { active: boolean }) {
  const endpoints = ["DPP", "QR / NFC", "WEB", "API", "RETAIL"];

  const paths = [
    "M20 100 C80 100 100 18 190 18",
    "M20 100 C85 100 110 58 218 58",
    "M20 100 C110 100 150 100 230 100",
    "M20 100 C85 100 110 142 218 142",
    "M20 100 C80 100 100 182 190 182",
  ];

  return (
    <div className={styles.publishNetwork}>
      <svg viewBox="0 0 250 200" preserveAspectRatio="none">
        {paths.map((path, index) => (
          <motion.path
            key={path}
            d={path}
            fill="none"
            stroke={active ? "rgba(201,169,98,.9)" : "rgba(255,255,255,.13)"}
            strokeWidth="1.2"
            initial={false}
            animate={{
              pathLength: active ? 1 : 0.35,
              opacity: active ? 1 : 0.45,
            }}
            transition={{
              duration: 0.7,
              delay: active ? index * 0.06 : 0,
            }}
          />
        ))}
      </svg>

      <div className={styles.publishEndpoints}>
        {endpoints.map((item, index) => (
          <motion.span
            key={item}
            animate={{
              opacity: active ? 1 : 0.5,
              x: active ? 0 : 5,
            }}
            transition={{
              delay: active ? index * 0.06 : 0,
            }}
          >
            {item}
          </motion.span>
        ))}
      </div>
    </div>
  );
}

function Intelligence({ active }: { active: boolean }) {
  return (
    <div className={styles.intelligence}>
      <div className={styles.benchmarkTitle}>
        <span>MATERIAL BENCHMARK</span>
        <strong>Higher than peer median</strong>
      </div>

      <div className={styles.benchmark}>
        <motion.div
          animate={{
            width: active ? "76%" : "41%",
          }}
        />
        <i />
      </div>

      <div className={styles.signalBars}>
        {[64, 84, 92].map((width, index) => (
          <span key={index}>
            <motion.i
              animate={{
                width: active ? `${width}%` : `${width * 0.45}%`,
              }}
            />
          </span>
        ))}
      </div>

      <div className={styles.returnSignals}>
        {[0, 1, 2].map((index) => (
          <motion.i
            key={index}
            animate={
              active
                ? {
                    x: [42, 0],
                    opacity: [0, 1, 0],
                  }
                : {
                    opacity: 0,
                  }
            }
            transition={{
              duration: 1.5,
              delay: index * 0.35,
              repeat: active ? Infinity : 0,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function Circularity({ active }: { active: boolean }) {
  return (
    <div className={styles.circularity}>
      <svg viewBox="0 0 220 220">
        <motion.path
          d="M110 27 C165 27 193 67 193 111 C193 161 157 191 110 191 C59 191 27 157 27 110 C27 72 49 45 78 33"
          fill="none"
          stroke={active ? "rgba(201,169,98,.95)" : "rgba(255,255,255,.14)"}
          strokeWidth="1.4"
          strokeLinecap="round"
          animate={{
            pathLength: active ? 1 : 0.58,
          }}
          transition={{ duration: 1 }}
        />

        <motion.path
          d="M78 33 L92 31 L85 44"
          fill="none"
          stroke={active ? "rgba(201,169,98,.95)" : "rgba(255,255,255,.14)"}
          strokeWidth="1.4"
        />
      </svg>

      <span className={styles.care}>CARE + REPAIR</span>
      <span className={styles.resale}>RESALE</span>
      <span className={styles.reuse}>REUSE</span>
      <span className={styles.endLife}>END OF LIFE</span>

      <div className={styles.circularCenter}>
        <span>NEXT LIFE</span>
        <strong>Identity continues</strong>
      </div>
    </div>
  );
}

export default function ProductLifecycleMap() {
  const reducedMotion = useReducedMotion();

  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (reducedMotion || paused) return;

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % STAGES.length);
    }, 2800);

    return () => window.clearInterval(interval);
  }, [reducedMotion, paused]);

  const chooseStage = (index: number) => {
    setActiveIndex(index);
    setPaused(true);

    window.setTimeout(() => {
      setPaused(false);
    }, 6000);
  };

  return (
    <section className={styles.section}>
      <div className={styles.intro}>
        <div>
          <span className={styles.eyebrow}>PRODUCT LIFECYCLE</span>
          <h2>
            From material
            <br />
            to next life.
          </h2>
        </div>

        <div className={styles.introRight}>
          <p>
            INTERTEXE connects fragmented product information from sourcing and manufacturing through
            product data, traceability, compliance and Digital Product Passports — then keeps that
            governed record useful through use, repair, resale and end-of-life.
          </p>

          <div className={styles.introActions}>
            <a href="/brands/see-it-live">SEE A LIVE PRODUCT →</a>
            <a href="/brands/solutions">Explore how teams use it</a>
          </div>
        </div>
      </div>

      <div
        className={styles.systemCanvas}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className={styles.progressTop}>
          <span>
            {String(activeIndex + 1).padStart(2, "0")}
            {" / "}
            {String(STAGES.length).padStart(2, "0")}
          </span>

          <div>
            {STAGES.map((stage, index) => (
              <motion.i
                key={stage.id}
                animate={{
                  backgroundColor: index <= activeIndex ? "#c9a962" : "rgba(255,255,255,.14)",
                }}
              />
            ))}
          </div>
        </div>

        <div className={styles.mapGrid}>
          <div className={styles.leftSystem}>
            <StageLabel stage={STAGES[0]} active={activeIndex === 0} onClick={() => chooseStage(0)} />
            <Sources active={activeIndex === 0} />

            <div className={styles.normalizationSection}>
              <StageLabel stage={STAGES[1]} active={activeIndex === 1} onClick={() => chooseStage(1)} />
              <Normalization active={activeIndex === 1} />
            </div>
          </div>

          <div className={styles.centerSystem}>
            <div className={styles.centerLabels}>
              <StageLabel stage={STAGES[2]} active={activeIndex === 2} onClick={() => chooseStage(2)} />
              <StageLabel stage={STAGES[3]} active={activeIndex === 3} onClick={() => chooseStage(3)} />
            </div>

            <div className={styles.recordEnvironment}>
              <EvidenceNetwork active={activeIndex === 2} />
              <ProductRecord stageIndex={activeIndex} />
              <ComplianceStack active={activeIndex === 3} />
            </div>
          </div>

          <div className={styles.rightSystem}>
            <div className={styles.publishSystem}>
              <StageLabel stage={STAGES[4]} active={activeIndex === 4} onClick={() => chooseStage(4)} />
              <PublishNetwork active={activeIndex === 4} />
            </div>

            <div className={styles.rightBottom}>
              <div>
                <StageLabel stage={STAGES[5]} active={activeIndex === 5} onClick={() => chooseStage(5)} />
                <Intelligence active={activeIndex === 5} />
              </div>

              <div>
                <StageLabel stage={STAGES[6]} active={activeIndex === 6} onClick={() => chooseStage(6)} />
                <Circularity active={activeIndex === 6} />
              </div>
            </div>
          </div>
        </div>

        <div className={styles.activeCaption}>
          <AnimatePresence mode="wait">
            <motion.div
              key={STAGES[activeIndex].id}
              initial={reducedMotion ? false : { opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
            >
              <span>{STAGES[activeIndex].number}</span>
              <strong>{STAGES[activeIndex].title}</strong>
              <p>{STAGES[activeIndex].descriptor}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
