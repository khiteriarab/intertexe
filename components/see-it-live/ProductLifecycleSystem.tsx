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

function SourceStack({ active }: { active: boolean }) {
  const sources = [
    ["PLM", "Style + BOM"],
    ["ERP", "Supplier + PO"],
    ["XLS", "Composition"],
    ["PDF", "Evidence"],
  ];

  return (
    <div className={styles.sourceStack}>
      {sources.map(([type, value], index) => (
        <motion.div
          key={type}
          className={styles.sourceRow}
          animate={active ? { x: 0, opacity: 1 } : { x: index % 2 === 0 ? -5 : 5, opacity: 0.64 }}
          transition={{ duration: 0.45, delay: active ? index * 0.06 : 0 }}
        >
          <span className={styles.sourceType}>{type}</span>
          <span>{value}</span>
          <span className={styles.sourceArrow}>→</span>
        </motion.div>
      ))}
    </div>
  );
}

function NormalizeVisual({ active }: { active: boolean }) {
  const messy = ["Silk 96%", "96 silk", "SILK:96", "96% Seide"];

  return (
    <div className={styles.normalizeVisual}>
      <div className={styles.messyColumn}>
        {messy.map((item, index) => (
          <motion.span
            key={item}
            animate={active ? { x: 8, opacity: 0.28 } : { x: index % 2 === 0 ? -4 : 5, opacity: 0.7 }}
            transition={{ duration: 0.5 }}
          >
            {item}
          </motion.span>
        ))}
      </div>

      <motion.div
        className={styles.normalizeArrow}
        animate={{ opacity: active ? 1 : 0.35, scaleX: active ? 1 : 0.75 }}
      >
        →
      </motion.div>

      <motion.div
        className={styles.cleanValue}
        animate={{
          borderColor: active ? "rgba(196,165,116,.72)" : "rgba(25,25,22,.12)",
          backgroundColor: active ? "rgba(196,165,116,.08)" : "rgba(255,255,255,.48)",
        }}
      >
        <span>COMPOSITION</span>
        <strong>96% Silk · 4% Elastane</strong>
      </motion.div>
    </div>
  );
}

function GovernedRecord({ activeStage }: { activeStage: number }) {
  const evidence = activeStage >= 2;
  const ready = activeStage >= 3;
  const published = activeStage >= 4;
  const readiness = [24, 42, 61, 82, 94, 94, 94][activeStage];

  return (
    <motion.div className={styles.record} animate={{ y: activeStage === 3 ? -3 : 0 }} transition={{ duration: 0.4 }}>
      <div className={styles.recordHeader}>
        <div>
          <span className={styles.recordEyebrow}>GOVERNED PRODUCT RECORD</span>
          <h3 style={SERIF}>Silk Midi Skirt</h3>
          <span className={styles.recordId}>ITX-4102</span>
        </div>
        <div className={styles.productSilhouette}>
          <div />
        </div>
      </div>

      <div className={styles.recordComposition}>
        <span>MATERIAL COMPOSITION</span>
        <strong>{activeStage >= 1 ? "96% Silk · 4% Elastane" : "Incoming source values"}</strong>
      </div>

      <div className={styles.recordStatuses}>
        <div>
          <span>Evidence</span>
          <strong className={evidence ? styles.statusGood : ""}>{evidence ? "Linked" : "Pending"}</strong>
        </div>
        <div>
          <span>Traceability</span>
          <strong className={evidence ? styles.statusGood : ""}>{evidence ? "Verified" : "Incomplete"}</strong>
        </div>
        <div>
          <span>Compliance</span>
          <strong className={ready ? styles.statusGood : ""}>{ready ? "Ready" : "Review"}</strong>
        </div>
        <div>
          <span>Passport</span>
          <strong className={published ? styles.statusGood : ""}>{published ? "Published" : "Draft"}</strong>
        </div>
      </div>

      <div className={styles.readinessHeader}>
        <span>Record readiness</span>
        <strong>{readiness}%</strong>
      </div>

      <div className={styles.readinessTrack}>
        <motion.div
          className={styles.readinessFill}
          animate={{ width: `${readiness}%` }}
          transition={{ type: "spring", stiffness: 70, damping: 18 }}
        />
      </div>
    </motion.div>
  );
}

function EvidenceLayer({ active }: { active: boolean }) {
  return (
    <div className={styles.evidenceLayer}>
      <motion.div className={styles.evidenceItem} animate={{ opacity: active ? 1 : 0.42, x: active ? 0 : -5 }}>
        <span className={styles.evidenceDot} />
        Supplier declaration
      </motion.div>
      <motion.div
        className={styles.evidenceItem}
        animate={{ opacity: active ? 1 : 0.42, x: active ? 0 : -5 }}
        transition={{ delay: 0.08 }}
      >
        <span className={styles.evidenceDot} />
        Origin evidence
      </motion.div>
      <motion.div
        className={styles.evidenceItem}
        animate={{ opacity: active ? 1 : 0.42, x: active ? 0 : -5 }}
        transition={{ delay: 0.16 }}
      >
        <span className={styles.evidenceDot} />
        Chain of custody
      </motion.div>
    </div>
  );
}

function ReadinessLayer({ active }: { active: boolean }) {
  const checks = ["Required fields", "Evidence", "Traceability", "DPP readiness"];

  return (
    <div className={styles.readinessLayer}>
      {checks.map((check, index) => (
        <motion.div
          key={check}
          className={styles.readinessCheck}
          animate={{ opacity: active ? 1 : 0.5 }}
          transition={{ delay: active ? index * 0.08 : 0 }}
        >
          <motion.span
            animate={{
              backgroundColor: active && index < 4 ? "#c4a574" : "rgba(25,25,22,.10)",
              borderColor: active && index < 4 ? "#c4a574" : "rgba(25,25,22,.18)",
            }}
          >
            {active ? "✓" : ""}
          </motion.span>
          {check}
        </motion.div>
      ))}
    </div>
  );
}

function PublishingNetwork({ active }: { active: boolean }) {
  const outputs = ["DPP", "QR", "WEB", "API", "RETAIL"];

  return (
    <div className={styles.publishNetwork}>
      <div className={styles.publishCore}>
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
            stroke={active ? "rgba(196,165,116,.72)" : "rgba(25,25,22,.12)"}
            strokeWidth="1.4"
            initial={false}
            animate={{ pathLength: active ? 1 : 0.42, opacity: active ? 1 : 0.42 }}
            transition={{ duration: 0.7, delay: active ? index * 0.05 : 0 }}
          />
        ))}
      </svg>

      <div className={styles.publishOutputs}>
        {outputs.map((item, index) => (
          <motion.div
            key={item}
            animate={{ opacity: active ? 1 : 0.5, x: active ? 0 : 5 }}
            transition={{ delay: active ? index * 0.05 : 0 }}
          >
            {item}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function IntelligenceVisual({ active }: { active: boolean }) {
  return (
    <div className={styles.intelligenceVisual}>
      <div className={styles.metricTop}>
        <span>MATERIAL BENCHMARK</span>
        <strong>Higher than peer median</strong>
      </div>

      <div className={styles.benchmarkTrack}>
        <motion.div
          className={styles.benchmarkFill}
          animate={{ width: active ? "76%" : "48%" }}
          transition={{ duration: 0.7 }}
        />
        <span className={styles.peerMedian} />
      </div>

      <div className={styles.signalRows}>
        <span>
          Passport activity
          <motion.i animate={{ width: active ? "68%" : "30%" }} />
        </span>
        <span>
          Supplier readiness
          <motion.i animate={{ width: active ? "83%" : "40%" }} />
        </span>
        <span>
          Record quality
          <motion.i animate={{ width: active ? "91%" : "52%" }} />
        </span>
      </div>
    </div>
  );
}

function CircularVisual({ active }: { active: boolean }) {
  return (
    <div className={styles.circularVisual}>
      <svg viewBox="0 0 210 210" className={styles.circularSvg} aria-hidden="true">
        <motion.path
          d="M105 26 C160 26 184 64 184 105 C184 160 151 183 105 183 C56 183 27 151 27 106 C27 70 47 43 77 32"
          fill="none"
          stroke={active ? "rgba(196,165,116,.82)" : "rgba(25,25,22,.14)"}
          strokeWidth="1.8"
          strokeLinecap="round"
          animate={{ pathLength: active ? 1 : 0.72 }}
          transition={{ duration: 1 }}
        />
        <motion.path
          d="M76 32 L88 31 L82 42"
          fill="none"
          stroke={active ? "rgba(196,165,116,.82)" : "rgba(25,25,22,.14)"}
          strokeWidth="1.8"
        />
      </svg>

      <span className={styles.circularRepair}>CARE + REPAIR</span>
      <span className={styles.circularResale}>RESALE</span>
      <span className={styles.circularReuse}>REUSE</span>
      <span className={styles.circularEnd}>END OF LIFE</span>

      <div className={styles.circularCenter}>
        <span>NEXT LIFE</span>
        <strong>Product record continues</strong>
      </div>
    </div>
  );
}

export default function ProductLifecycleSystem() {
  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const activeStage = STAGES[activeIndex];

  useEffect(() => {
    if (reducedMotion || paused) return;
    const timer = window.setInterval(() => {
      setActiveIndex((value) => (value + 1) % STAGES.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [reducedMotion, paused]);

  const selectStage = (index: number) => {
    setActiveIndex(index);
    setPaused(true);
    window.setTimeout(() => setPaused(false), 6500);
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
          INTERTEXE connects the information behind a product from sourcing and manufacturing through product data,
          traceability, compliance and Digital Product Passports, then keeps that record useful through use, repair,
          resale and end-of-life.
        </p>
      </header>

      <div className={styles.systemMap}>
        <section className={styles.buildZone}>
          <div className={styles.zoneHeader}>
            <StageLabel stage={STAGES[0]} active={activeIndex === 0} onClick={() => selectStage(0)} />
          </div>
          <SourceStack active={activeIndex === 0} />
          <div className={styles.flowConnector}>
            <motion.span animate={{ scaleX: activeIndex >= 1 ? 1 : 0.35, opacity: activeIndex >= 1 ? 1 : 0.4 }} />
          </div>
          <div className={styles.normalizeBlock}>
            <StageLabel stage={STAGES[1]} active={activeIndex === 1} onClick={() => selectStage(1)} />
            <NormalizeVisual active={activeIndex === 1} />
          </div>
        </section>

        <section className={styles.trustZone}>
          <div className={styles.trustHeader}>
            <StageLabel stage={STAGES[2]} active={activeIndex === 2} onClick={() => selectStage(2)} />
            <StageLabel stage={STAGES[3]} active={activeIndex === 3} onClick={() => selectStage(3)} />
          </div>
          <div className={styles.recordEnvironment}>
            <EvidenceLayer active={activeIndex === 2} />
            <GovernedRecord activeStage={activeIndex} />
            <ReadinessLayer active={activeIndex === 3} />
          </div>
        </section>

        <section className={styles.useZone}>
          <div className={styles.publishSection}>
            <StageLabel stage={STAGES[4]} active={activeIndex === 4} onClick={() => selectStage(4)} />
            <PublishingNetwork active={activeIndex === 4} />
          </div>
          <div className={styles.useBottom}>
            <div className={styles.learnSection}>
              <StageLabel stage={STAGES[5]} active={activeIndex === 5} onClick={() => selectStage(5)} />
              <IntelligenceVisual active={activeIndex === 5} />
            </div>
            <div className={styles.circularSection}>
              <StageLabel stage={STAGES[6]} active={activeIndex === 6} onClick={() => selectStage(6)} />
              <CircularVisual active={activeIndex === 6} />
            </div>
          </div>
        </section>
      </div>

      <div className={styles.storyStrip}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStage.id}
            className={styles.storyContent}
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.28 }}
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

      <div className={styles.followTransition}>
        <div className={styles.followLine}>
          <motion.span
            animate={reducedMotion ? undefined : { y: [0, 70], opacity: [0, 1, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <div className={styles.followCopy}>
          <span className={styles.eyebrow}>FOLLOW THE RECORD</span>
          <h3 style={SERIF}>See the record evolve.</h3>
          <p>
            Follow one product from fragmented source data to a governed record, live Digital Product Passport and
            measurable product intelligence.
          </p>
        </div>
        <div className={styles.followLineBottom} />
      </div>
    </section>
  );
}
