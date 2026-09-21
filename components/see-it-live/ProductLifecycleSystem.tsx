"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SERIF } from "../../app/platform/platform-ui";
import styles from "./ProductLifecycleSystem.module.css";

type StageId = "source" | "clean" | "trace" | "prepare" | "publish" | "learn" | "recirculate";

type LifecycleStage = {
  id: StageId;
  number: string;
  title: string;
  short: string;
  description: string;
  terms: string[];
};

type RecordState = {
  composition: string;
  sourceData: string;
  evidence: string;
  traceability: string;
  compliance: string;
  passport: string;
  readiness: number;
  optionalInsight?: string;
  optionalLifecycleState?: string;
};

const STAGES: LifecycleStage[] = [
  {
    id: "source",
    number: "01",
    title: "Source & Make",
    short: "Materials · suppliers · manufacturing",
    description: "Capture how the product begins across materials, suppliers, components and manufacturing.",
    terms: ["Raw Materials", "Suppliers", "Manufacturing", "Supply Chain Tiers"],
  },
  {
    id: "clean",
    number: "02",
    title: "Clean & Connect",
    short: "One trusted product record",
    description:
      "Bring fragmented product information together, standardize it and connect it to one trusted product record.",
    terms: ["PLM / PIM / ERP", "Data Normalization", "Material Composition", "Product Master Data"],
  },
  {
    id: "trace",
    number: "03",
    title: "Trace & Prove",
    short: "Claims linked to evidence",
    description: "Connect product and material claims to evidence across the supply chain.",
    terms: ["Traceability", "Chain of Custody", "Provenance", "Supplier Evidence"],
  },
  {
    id: "prepare",
    number: "04",
    title: "Check & Prepare",
    short: "Compliance + DPP readiness",
    description:
      "Identify missing information and prepare the product for sustainability, regulatory and Digital Product Passport requirements.",
    terms: ["ESPR", "Compliance", "DPP Readiness", "Audit Evidence"],
  },
  {
    id: "publish",
    number: "05",
    title: "Passport & Publish",
    short: "Governed identity distributed",
    description:
      "Turn the verified product record into a Digital Product Passport and distribute governed information through connected channels.",
    terms: ["Digital Product Passport", "Unique Product ID", "QR / NFC", "Interoperability"],
  },
  {
    id: "learn",
    number: "06",
    title: "Use & Learn",
    short: "Intelligence from every channel",
    description:
      "Use the same product intelligence across consumer experiences, retail and analytics and learn from the data it generates.",
    terms: ["Consumer Experience", "Analytics", "Material Benchmark", "Supplier Performance"],
  },
  {
    id: "recirculate",
    number: "07",
    title: "Repair & Recirculate",
    short: "Beyond the first sale",
    description:
      "Keep the product record useful beyond the first sale through care, repair, resale, reuse and end-of-life.",
    terms: ["Care & Repair", "Resale", "Reuse", "End of Life"],
  },
];

/** Stage-driven nucleus state — content evolves; card shell stays fixed. */
const RECORD_STATES: RecordState[] = [
  {
    composition: "Incoming values",
    sourceData: "Connecting",
    evidence: "Pending",
    traceability: "Incomplete",
    compliance: "Review",
    passport: "Draft",
    readiness: 26,
  },
  {
    composition: "96% Silk · 4% Elastane",
    sourceData: "Connected",
    evidence: "Pending",
    traceability: "Incomplete",
    compliance: "Review",
    passport: "Draft",
    readiness: 46,
  },
  {
    composition: "96% Silk · 4% Elastane",
    sourceData: "Connected",
    evidence: "Linked",
    traceability: "Verified",
    compliance: "Review",
    passport: "Draft",
    readiness: 67,
  },
  {
    composition: "96% Silk · 4% Elastane",
    sourceData: "Connected",
    evidence: "Linked",
    traceability: "Verified",
    compliance: "Ready",
    passport: "Draft",
    readiness: 86,
  },
  {
    composition: "96% Silk · 4% Elastane",
    sourceData: "Connected",
    evidence: "Linked",
    traceability: "Verified",
    compliance: "Ready",
    passport: "Published",
    readiness: 94,
  },
  {
    composition: "96% Silk · 4% Elastane",
    sourceData: "Connected",
    evidence: "Linked",
    traceability: "Verified",
    compliance: "Ready",
    passport: "Published",
    readiness: 94,
    optionalInsight: "Benchmark signal received",
  },
  {
    composition: "96% Silk · 4% Elastane",
    sourceData: "Connected",
    evidence: "Linked",
    traceability: "Verified",
    compliance: "Ready",
    passport: "Published",
    readiness: 94,
    optionalInsight: "Benchmark signal received",
    optionalLifecycleState: "Next-life record active",
  },
];

const GOOD_STATUSES = new Set(["Connected", "Linked", "Verified", "Ready", "Published"]);

const FIELD_MOTION = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -3 },
  transition: { duration: 0.28 },
};

const DWELL_MS = 2200;
const RESUME_MS = 6000;

function StageLabel({
  stage,
  active,
  onClick,
}: {
  stage: LifecycleStage;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${styles.stageLabel} ${active ? styles.stageLabelActive : ""}`}
      aria-current={active ? "step" : undefined}
    >
      <span className={styles.stageNumber}>{stage.number}</span>
      <span className={styles.stageTitle} style={SERIF}>
        {stage.title}
      </span>
      <span className={styles.stageShort}>{stage.short}</span>
    </button>
  );
}

function AnimatedValue({ value, className }: { value: string; className?: string }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span key={value} className={className} {...FIELD_MOTION}>
        {value}
      </motion.span>
    </AnimatePresence>
  );
}

function SourceStack({ active, settled }: { active: boolean; settled: boolean }) {
  const sources = [
    ["PLM", "Style + BOM"],
    ["ERP", "Supplier + PO"],
    ["SUPPLIER", "Evidence"],
    ["CSV", "Composition"],
  ];
  const lit = active || settled;

  return (
    <div className={styles.sourceStack}>
      {sources.map(([type, value], index) => (
        <motion.div
          key={type}
          className={`${styles.sourceRow} ${active ? styles.sourceRowActive : ""}`}
          animate={
            lit
              ? { x: 0, opacity: 1 }
              : { x: index % 2 === 0 ? -4 : 4, opacity: 0.62 }
          }
          transition={{ duration: 0.38, delay: active ? index * 0.075 : 0 }}
        >
          <span className={styles.sourceType}>{type}</span>
          <span className={styles.sourceValue}>{value}</span>
          <span className={styles.sourceArrow} aria-hidden>
            →
          </span>
        </motion.div>
      ))}
    </div>
  );
}

function NormalizeVisual({ active, resolved }: { active: boolean; resolved: boolean }) {
  const messy = ["Silk 96%", "96 silk", "SILK:96", "96% Seide"];
  const clean = resolved;

  return (
    <div className={styles.normalizeVisual}>
      <div className={styles.messyColumn}>
        {messy.map((item, index) => (
          <motion.span
            key={item}
            className={styles.messyItem}
            animate={
              clean
                ? { x: 10, opacity: 0.22 }
                : { x: index % 2 === 0 ? -3 : 4, opacity: 0.72 }
            }
            transition={{ duration: 0.42, delay: active ? index * 0.04 : 0 }}
          >
            {item}
          </motion.span>
        ))}
      </div>

      <motion.div
        className={styles.normalizeArrow}
        animate={{ opacity: clean ? 1 : 0.35, scaleX: clean ? 1 : 0.7 }}
        transition={{ duration: 0.35 }}
      >
        →
      </motion.div>

      <motion.div
        className={`${styles.cleanValue} ${clean ? styles.cleanValueActive : ""}`}
        animate={{
          borderColor: clean ? "rgba(201,169,98,.55)" : "rgba(23,25,23,.12)",
          backgroundColor: clean ? "rgba(196,165,116,.08)" : "#ffffff",
        }}
        transition={{ duration: 0.35 }}
      >
        <span>COMPOSITION</span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.strong key={clean ? "clean" : "pending"} {...FIELD_MOTION}>
            {clean ? "96% Silk · 4% Elastane" : "Awaiting normalize"}
          </motion.strong>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function StatusCell({ label, value }: { label: string; value: string }) {
  const good = GOOD_STATUSES.has(value);
  return (
    <div className={styles.statusCell}>
      <span className={styles.statusLabel}>{label}</span>
      <div className={styles.statusValueRow}>
        <span className={`${styles.statusDot} ${good ? styles.statusDotGood : ""}`} aria-hidden />
        <AnimatedValue value={value} className={good ? styles.statusGood : styles.statusPending} />
      </div>
    </div>
  );
}

function GovernedRecord({
  activeStage,
  onHoverChange,
}: {
  activeStage: number;
  onHoverChange: (hovered: boolean) => void;
}) {
  const state = RECORD_STATES[activeStage] ?? RECORD_STATES[0];
  const published = state.passport === "Published";

  return (
    <div
      className={styles.record}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
    >
      <div className={styles.recordHeader}>
        <div className={styles.recordHeaderCopy}>
          <span className={styles.recordEyebrow}>GOVERNED PRODUCT RECORD</span>
          <h3 className={styles.recordName}>Silk Midi Skirt</h3>
          <div className={styles.recordMeta}>
            <span className={styles.recordId}>ITX-4102</span>
            <span className={styles.recordDivider} aria-hidden>
              ·
            </span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={`${state.readiness}-${published}`}
                className={published ? styles.recordLive : styles.recordBuilding}
                {...FIELD_MOTION}
              >
                {published ? "Live" : "Building"}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
        <div className={styles.recordHeaderStat}>
          <span>READINESS</span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.strong key={state.readiness} {...FIELD_MOTION}>
              {state.readiness}%
            </motion.strong>
          </AnimatePresence>
        </div>
      </div>

      <div className={styles.recordBody}>
        <div className={styles.recordComposition}>
          <span>MATERIAL COMPOSITION</span>
          <AnimatedValue value={state.composition} className={styles.recordCompositionValue} />
        </div>

        <div className={styles.recordStatuses}>
          <StatusCell label="SOURCE DATA" value={state.sourceData} />
          <StatusCell label="EVIDENCE" value={state.evidence} />
          <StatusCell label="TRACEABILITY" value={state.traceability} />
          <StatusCell label="COMPLIANCE" value={state.compliance} />
          <StatusCell label="PASSPORT" value={state.passport} />
          <div className={styles.statusCell}>
            <span className={styles.statusLabel}>SYSTEM</span>
            <div className={styles.statusValueRow}>
              <span
                className={`${styles.statusDot} ${published ? styles.statusDotGood : ""}`}
                aria-hidden
              />
              <AnimatedValue
                value={published ? "Published" : "Assembling"}
                className={published ? styles.statusGood : styles.statusPending}
              />
            </div>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {state.optionalInsight ? (
            <motion.div
              key="insight"
              className={styles.recordInsight}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <span>INTELLIGENCE</span>
              <strong>{state.optionalInsight}</strong>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {state.optionalLifecycleState ? (
            <motion.div
              key="lifecycle"
              className={styles.recordLifecycle}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <span>LIFECYCLE</span>
              <strong>{state.optionalLifecycleState}</strong>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className={styles.readinessBlock}>
          <div className={styles.readinessHeader}>
            <span>RECORD READINESS</span>
            <strong>{state.readiness}%</strong>
          </div>
          <div className={styles.readinessTrack}>
            <motion.div
              className={styles.readinessFill}
              animate={{ width: `${state.readiness}%` }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function EvidenceLayer({ active, resolved }: { active: boolean; resolved: boolean }) {
  const items = ["Supplier declaration", "Origin evidence", "Chain of custody"];
  const lit = active || resolved;

  return (
    <div className={styles.evidenceLayer}>
      <svg className={styles.evidenceLines} viewBox="0 0 120 140" aria-hidden="true">
        {items.map((_, index) => (
          <motion.path
            key={index}
            d={`M18 ${28 + index * 42} H118`}
            fill="none"
            stroke={lit ? "rgba(201,169,98,.7)" : "rgba(23,25,23,.12)"}
            strokeWidth="1"
            initial={false}
            animate={{ pathLength: lit ? 1 : 0.35, opacity: lit ? 1 : 0.45 }}
            transition={{ duration: 0.65, delay: active ? index * 0.07 : 0 }}
          />
        ))}
      </svg>
      {items.map((label, index) => (
        <motion.div
          key={label}
          className={`${styles.evidenceItem} ${lit ? styles.evidenceItemActive : ""}`}
          animate={{ opacity: lit ? 1 : 0.58, x: lit ? 0 : -4 }}
          transition={{ duration: 0.35, delay: active ? index * 0.07 : 0 }}
        >
          <span className={styles.evidenceDot} />
          {label}
        </motion.div>
      ))}
    </div>
  );
}

function ReadinessLayer({ active, resolved }: { active: boolean; resolved: boolean }) {
  const checks = ["Required fields", "Evidence", "Traceability", "DPP readiness"];
  const lit = active || resolved;

  return (
    <div className={styles.readinessLayer}>
      {checks.map((check, index) => (
        <motion.div
          key={check}
          className={styles.readinessCheck}
          animate={{ opacity: lit ? 1 : 0.58 }}
          transition={{ delay: active ? index * 0.08 : 0, duration: 0.3 }}
        >
          <motion.span
            className={styles.readinessMark}
            animate={{
              backgroundColor: lit ? "#c9a962" : "transparent",
              borderColor: lit ? "#c9a962" : "rgba(23,25,23,.22)",
            }}
            transition={{ duration: 0.28, delay: active ? index * 0.08 : 0 }}
          >
            {lit ? "✓" : ""}
          </motion.span>
          {check}
        </motion.div>
      ))}
    </div>
  );
}

function PublishingNetwork({ active, resolved }: { active: boolean; resolved: boolean }) {
  const outputs = ["DPP", "QR / NFC", "WEB", "API", "RETAIL"];
  const lit = active || resolved;

  return (
    <div className={styles.publishNetwork}>
      <div className={`${styles.publishCore} ${lit ? styles.publishCoreActive : ""}`}>
        <span>PRODUCT</span>
        <strong>ITX-4102</strong>
      </div>

      <svg className={styles.publishLines} viewBox="0 0 260 210" preserveAspectRatio="none" aria-hidden="true">
        {[
          "M70 105 C115 105 120 24 192 24",
          "M70 105 C125 105 130 64 214 64",
          "M70 105 C130 105 150 105 225 105",
          "M70 105 C125 105 130 148 214 148",
          "M70 105 C115 105 120 190 192 190",
        ].map((d, index) => (
          <motion.path
            key={d}
            d={d}
            fill="none"
            stroke={lit ? "rgba(201,169,98,.78)" : "rgba(23,25,23,.12)"}
            strokeWidth="1.25"
            initial={false}
            animate={{ pathLength: lit ? 1 : 0.38, opacity: lit ? 1 : 0.4 }}
            transition={{ duration: 0.72, delay: active ? index * 0.055 : 0 }}
          />
        ))}
      </svg>

      <div className={styles.publishOutputs}>
        {outputs.map((item, index) => (
          <motion.div
            key={item}
            className={`${styles.publishEndpoint} ${lit ? styles.publishEndpointActive : ""}`}
            animate={{ opacity: lit ? 1 : 0.55, x: lit ? 0 : 4 }}
            transition={{ delay: active ? 0.2 + index * 0.05 : 0, duration: 0.32 }}
          >
            {item}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function IntelligenceVisual({ active, resolved }: { active: boolean; resolved: boolean }) {
  const lit = active || resolved;

  return (
    <div className={styles.intelligenceVisual}>
      <div className={styles.metricTop}>
        <span>MATERIAL BENCHMARK</span>
        <strong>Higher than peer median</strong>
      </div>

      <div className={styles.benchmarkTrack}>
        <motion.div
          className={styles.benchmarkFill}
          animate={{ width: lit ? "76%" : "48%" }}
          transition={{ duration: 0.65 }}
        />
        <span className={styles.peerMedian} title="Peer median" />
        <motion.span
          className={styles.goldMarker}
          animate={{ left: lit ? "76%" : "48%", opacity: lit ? 1 : 0.45 }}
          transition={{ duration: 0.65 }}
        />
      </div>

      <div className={styles.signalRows}>
        {[
          ["Passport activity", 68, 30],
          ["Supplier readiness", 83, 40],
          ["Record quality", 91, 52],
        ].map(([label, on, off], index) => (
          <span key={label as string}>
            {label}
            <motion.i
              animate={{ width: lit ? `${on}%` : `${off}%` }}
              transition={{ duration: 0.55, delay: active ? index * 0.05 : 0 }}
            />
          </span>
        ))}
      </div>

      <div className={styles.returnSignals} aria-hidden>
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className={styles.returnDot}
            animate={
              active
                ? { x: [-18, 0], opacity: [0, 1, 0.35] }
                : { x: 0, opacity: resolved ? 0.45 : 0.2 }
            }
            transition={
              active
                ? { duration: 1.1, delay: i * 0.18, repeat: Infinity, repeatDelay: 0.6 }
                : { duration: 0.3 }
            }
          />
        ))}
        <span className={styles.returnLabel}>← signal in</span>
      </div>
    </div>
  );
}

function CircularVisual({ active, resolved }: { active: boolean; resolved: boolean }) {
  const lit = active || resolved;

  return (
    <div className={styles.circularVisual}>
      <svg viewBox="0 0 210 210" className={styles.circularSvg} aria-hidden="true">
        <circle cx="105" cy="105" r="72" fill="none" stroke="rgba(23,25,23,.08)" strokeWidth="1" />
        <motion.path
          d="M105 26 C160 26 184 64 184 105 C184 160 151 183 105 183 C56 183 27 151 27 106 C27 70 47 43 77 32"
          fill="none"
          stroke={lit ? "rgba(201,169,98,.85)" : "rgba(23,25,23,.16)"}
          strokeWidth="1.5"
          strokeLinecap="round"
          initial={false}
          animate={{ pathLength: lit ? 1 : 0.68 }}
          transition={{ duration: 0.9 }}
        />
        <motion.path
          d="M76 32 L88 31 L82 42"
          fill="none"
          stroke={lit ? "rgba(201,169,98,.85)" : "rgba(23,25,23,.16)"}
          strokeWidth="1.5"
          animate={{ opacity: lit ? 1 : 0.5 }}
        />
      </svg>

      <span className={styles.circularRepair}>CARE + REPAIR</span>
      <span className={styles.circularResale}>RESALE</span>
      <span className={styles.circularReuse}>REUSE</span>
      <span className={styles.circularEnd}>END OF LIFE</span>

      <div className={`${styles.circularCenter} ${lit ? styles.circularCenterActive : ""}`}>
        <span>ITX-4102</span>
        <strong>{lit ? "Lifecycle active" : "Identity persists"}</strong>
      </div>
    </div>
  );
}

export default function ProductLifecycleSystem() {
  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [recordHovered, setRecordHovered] = useState(false);
  const activeStage = STAGES[activeIndex];
  const autoplayPaused = paused || recordHovered;

  useEffect(() => {
    if (reducedMotion || autoplayPaused) return;
    const timer = window.setInterval(() => {
      setActiveIndex((value) => (value + 1) % STAGES.length);
    }, DWELL_MS);
    return () => window.clearInterval(timer);
  }, [reducedMotion, autoplayPaused]);

  const selectStage = (index: number) => {
    setActiveIndex(index);
    setPaused(true);
    window.setTimeout(() => setPaused(false), RESUME_MS);
  };

  return (
    <section className={styles.lifecycleSection} aria-labelledby="product-lifecycle-heading">
      <header className={styles.intro}>
        <span className={styles.eyebrow}>PRODUCT LIFECYCLE</span>
        <h2 id="product-lifecycle-heading" style={SERIF}>
          From material
          <br />
          to next life.
        </h2>
        <p>
          INTERTEXE connects product information from sourcing through compliance and Digital Product Passports —
          then keeps the same governed record useful through use, repair, resale and end-of-life.
        </p>
      </header>

      <div className={styles.systemCanvas}>
        <div className={styles.progressStrip} aria-hidden="true">
          <span className={styles.progressIndex}>
            {STAGES[activeIndex].number} / 07
          </span>
          <div className={styles.progressSegments}>
            {STAGES.map((stage, index) => (
              <span
                key={stage.id}
                className={`${styles.progressSeg} ${index <= activeIndex ? styles.progressSegOn : ""}`}
              />
            ))}
          </div>
        </div>

        <div className={styles.systemMap}>
          <section className={styles.buildZone}>
            <div className={styles.zoneHeader}>
              <StageLabel stage={STAGES[0]} active={activeIndex === 0} onClick={() => selectStage(0)} />
            </div>
            <SourceStack active={activeIndex === 0} settled={activeIndex > 0} />
            <div className={styles.flowConnector}>
              <motion.span
                animate={{
                  scaleY: activeIndex >= 1 ? 1 : 0.35,
                  opacity: activeIndex >= 1 ? 1 : 0.4,
                }}
                transition={{ duration: 0.4 }}
              />
            </div>
            <div className={styles.normalizeBlock}>
              <StageLabel stage={STAGES[1]} active={activeIndex === 1} onClick={() => selectStage(1)} />
              <NormalizeVisual active={activeIndex === 1} resolved={activeIndex >= 1} />
            </div>
          </section>

          <section className={styles.trustZone}>
            <div className={styles.trustHeader}>
              <StageLabel stage={STAGES[2]} active={activeIndex === 2} onClick={() => selectStage(2)} />
              <StageLabel stage={STAGES[3]} active={activeIndex === 3} onClick={() => selectStage(3)} />
            </div>
            <div className={styles.recordEnvironment}>
              <EvidenceLayer active={activeIndex === 2} resolved={activeIndex >= 2} />
              <GovernedRecord activeStage={activeIndex} onHoverChange={setRecordHovered} />
              <ReadinessLayer active={activeIndex === 3} resolved={activeIndex >= 3} />
            </div>
          </section>

          <section className={styles.useZone}>
            <div className={styles.publishSection}>
              <StageLabel stage={STAGES[4]} active={activeIndex === 4} onClick={() => selectStage(4)} />
              <PublishingNetwork active={activeIndex === 4} resolved={activeIndex >= 4} />
            </div>
            <div className={styles.useBottom}>
              <div className={styles.learnSection}>
                <StageLabel stage={STAGES[5]} active={activeIndex === 5} onClick={() => selectStage(5)} />
                <IntelligenceVisual active={activeIndex === 5} resolved={activeIndex >= 5} />
              </div>
              <div className={styles.circularSection}>
                <StageLabel stage={STAGES[6]} active={activeIndex === 6} onClick={() => selectStage(6)} />
                <CircularVisual active={activeIndex === 6} resolved={activeIndex >= 6} />
              </div>
            </div>
          </section>
        </div>

        <div className={styles.storyStrip}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStage.id}
              className={styles.storyContent}
              initial={reducedMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, y: -4 }}
              transition={{ duration: 0.26 }}
            >
              <div className={styles.storyTitle}>
                <span>{activeStage.number}</span>
                <h3 style={SERIF}>{activeStage.title}</h3>
              </div>
              <p>{activeStage.description}</p>
              <div className={styles.storyTerms}>
                {activeStage.terms.map((term) => (
                  <span key={term}>{term}</span>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className={styles.followTransition}>
        <div className={styles.followRail} aria-hidden>
          <motion.span
            className={styles.followPulse}
            animate={reducedMotion ? undefined : { y: [0, 88], opacity: [0, 1, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <div className={styles.followCopy}>
          <span className={styles.eyebrow}>FOLLOW THE RECORD</span>
          <h3 style={SERIF}>See the record evolve.</h3>
          <p>One product. Six states. From source data to live product intelligence.</p>
        </div>
      </div>
    </section>
  );
}
