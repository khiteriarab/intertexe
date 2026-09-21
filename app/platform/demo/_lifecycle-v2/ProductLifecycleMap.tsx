"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SERIF } from "../../platform-ui";
import "./product-lifecycle-map.css";

export type LifecycleStage = {
  id: string;
  number: string;
  title: string;
  descriptor: string;
  detail: string;
  terms: string[];
  x: number;
  y: number;
  align: "top" | "bottom" | "left" | "right";
  visual: "sources" | "normalize" | "evidence" | "readiness" | "publish" | "signals" | "circular";
};

export const lifecycleStages: LifecycleStage[] = [
  {
    id: "source",
    number: "01",
    title: "Source & Make",
    descriptor: "Materials · suppliers · manufacturing",
    detail: "Capture how the product begins across materials, suppliers, components and manufacturing.",
    terms: ["Raw Materials", "Suppliers", "Manufacturing", "Supply Chain Tiers"],
    x: 110,
    y: 125,
    align: "top",
    visual: "sources",
  },
  {
    id: "clean",
    number: "02",
    title: "Clean & Connect",
    descriptor: "One trusted product record",
    detail:
      "Bring fragmented product information together, standardize it and connect it to one trusted product record.",
    terms: ["PLM / PIM / ERP", "Data Normalization", "Material Composition", "Product Master Data"],
    x: 360,
    y: 125,
    align: "top",
    visual: "normalize",
  },
  {
    id: "trace",
    number: "03",
    title: "Trace & Prove",
    descriptor: "Claims linked to evidence",
    detail: "Connect product and material claims to evidence across the supply chain.",
    terms: ["Traceability", "Chain of Custody", "Provenance", "Supplier Evidence"],
    x: 610,
    y: 125,
    align: "top",
    visual: "evidence",
  },
  {
    id: "prepare",
    number: "04",
    title: "Check & Prepare",
    descriptor: "Compliance + DPP readiness",
    detail:
      "Identify missing information and prepare the product for sustainability, regulatory and Digital Product Passport requirements.",
    terms: ["ESPR", "Compliance", "DPP Readiness", "Audit Evidence"],
    x: 875,
    y: 245,
    align: "right",
    visual: "readiness",
  },
  {
    id: "publish",
    number: "05",
    title: "Passport & Publish",
    descriptor: "Governed identity distributed",
    detail:
      "Turn the verified product record into a Digital Product Passport and distribute governed information through connected channels.",
    terms: ["Digital Product Passport", "Unique Product ID", "QR / NFC", "Interoperability"],
    x: 760,
    y: 440,
    align: "bottom",
    visual: "publish",
  },
  {
    id: "learn",
    number: "06",
    title: "Use & Learn",
    descriptor: "Intelligence from every channel",
    detail:
      "Use the same product intelligence across consumer experiences, retail and analytics and learn from the data it generates.",
    terms: ["Consumer Experience", "Analytics", "Material Benchmark", "Supplier Performance"],
    x: 485,
    y: 440,
    align: "bottom",
    visual: "signals",
  },
  {
    id: "recirculate",
    number: "07",
    title: "Repair & Recirculate",
    descriptor: "Beyond the first sale",
    detail:
      "Keep the product record useful beyond the first sale through care, repair, resale, reuse and end-of-life.",
    terms: ["Care & Repair", "Resale", "Reuse", "End of Life"],
    x: 205,
    y: 440,
    align: "bottom",
    visual: "circular",
  },
];

/** Refined cubic segments — smooth serpentine, no hard elbows. */
export const stagePaths = [
  "M110 125 C190 125 270 125 360 125",
  "M360 125 C440 125 530 125 610 125",
  "M610 125 C720 125 850 145 875 245",
  "M875 245 C900 340 845 415 760 440",
  "M760 440 C675 440 575 440 485 440",
  "M485 440 C390 440 300 440 205 440",
];

function StageMicroVisual({ type, active }: { type: LifecycleStage["visual"]; active: boolean }) {
  const lineClass = active ? "plc-map-micro-line is-active" : "plc-map-micro-line";

  if (type === "sources") {
    return (
      <svg viewBox="0 0 92 54" className="plc-map-micro" aria-hidden>
        <path className={lineClass} d="M4 7 L43 27" />
        <path className={lineClass} d="M4 27 L43 27" />
        <path className={lineClass} d="M4 47 L43 27" />
        <circle className="plc-map-micro-dot" cx="4" cy="7" r="2.5" />
        <circle className="plc-map-micro-dot" cx="4" cy="27" r="2.5" />
        <circle className="plc-map-micro-dot" cx="4" cy="47" r="2.5" />
        <circle className={active ? "plc-map-micro-dot is-active" : "plc-map-micro-dot"} cx="43" cy="27" r="4" />
        <path className={lineClass} d="M47 27 L86 27" />
      </svg>
    );
  }

  if (type === "normalize") {
    return (
      <svg viewBox="0 0 92 54" className="plc-map-micro" aria-hidden>
        <path className={lineClass} d="M4 8 L30 8" />
        <path className={lineClass} d="M8 18 L38 18" />
        <path className={lineClass} d="M2 29 L34 29" />
        <path className={lineClass} d="M11 40 L29 40" />
        <path className={lineClass} d="M55 10 L88 10" />
        <path className={lineClass} d="M55 20 L88 20" />
        <path className={lineClass} d="M55 30 L88 30" />
        <path className={lineClass} d="M55 40 L88 40" />
        <path className={lineClass} d="M39 26 L50 26" />
      </svg>
    );
  }

  if (type === "evidence") {
    return (
      <svg viewBox="0 0 92 54" className="plc-map-micro" aria-hidden>
        <circle className="plc-map-micro-dot" cx="14" cy="12" r="3" />
        <circle className="plc-map-micro-dot" cx="14" cy="42" r="3" />
        <circle className="plc-map-micro-dot" cx="74" cy="12" r="3" />
        <circle className={active ? "plc-map-micro-dot is-active" : "plc-map-micro-dot"} cx="47" cy="27" r="5" />
        <path className={lineClass} d="M17 13 L43 25" />
        <path className={lineClass} d="M17 40 L43 29" />
        <path className={lineClass} d="M71 14 L51 24" />
      </svg>
    );
  }

  if (type === "readiness") {
    return (
      <div className="plc-map-readiness" aria-hidden>
        <span className={active ? "plc-map-check is-resolved" : "plc-map-check"}>01</span>
        <span className={active ? "plc-map-check is-resolved" : "plc-map-check"}>02</span>
        <span className="plc-map-check">03</span>
      </div>
    );
  }

  if (type === "publish") {
    return (
      <svg viewBox="0 0 110 58" className="plc-map-micro plc-map-micro--wide" aria-hidden>
        <circle className={active ? "plc-map-micro-dot is-active" : "plc-map-micro-dot"} cx="25" cy="29" r="5" />
        <path className={lineClass} d="M30 29 L61 29" />
        <path className={lineClass} d="M61 29 L84 8" />
        <path className={lineClass} d="M61 29 L98 22" />
        <path className={lineClass} d="M61 29 L98 38" />
        <path className={lineClass} d="M61 29 L84 51" />
        <text x="86" y="8" className="plc-map-micro-text">
          QR
        </text>
        <text x="100" y="22" className="plc-map-micro-text">
          WEB
        </text>
        <text x="100" y="39" className="plc-map-micro-text">
          API
        </text>
        <text x="85" y="56" className="plc-map-micro-text">
          RETAIL
        </text>
      </svg>
    );
  }

  if (type === "signals") {
    return (
      <svg viewBox="0 0 92 54" className="plc-map-micro" aria-hidden>
        <circle className="plc-map-micro-dot" cx="78" cy="8" r="2.5" />
        <circle className="plc-map-micro-dot" cx="84" cy="27" r="2.5" />
        <circle className="plc-map-micro-dot" cx="72" cy="45" r="2.5" />
        <path className={lineClass} d="M75 10 L42 25" />
        <path className={lineClass} d="M81 27 L42 27" />
        <path className={lineClass} d="M69 43 L42 30" />
        <circle className={active ? "plc-map-micro-dot is-active" : "plc-map-micro-dot"} cx="38" cy="27" r="4" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 92 54" className="plc-map-micro" aria-hidden>
      <path className={lineClass} d="M16 33 C18 8 59 4 74 22 C88 40 64 53 45 44" fill="none" />
      <path className={lineClass} d="M45 44 L51 35" />
      <path className={lineClass} d="M45 44 L56 46" />
      <text x="7" y="52" className="plc-map-micro-text">
        REPAIR
      </text>
      <text x="56" y="14" className="plc-map-micro-text">
        RESALE
      </text>
    </svg>
  );
}

function ProductRecord({ activeIndex }: { activeIndex: number }) {
  const readiness = Math.round(18 + (activeIndex / 6) * 78);

  return (
    <motion.div
      className="plc-map-record"
      animate={{
        borderColor: activeIndex >= 4 ? "rgba(196,165,116,.65)" : "rgba(38,38,34,.16)",
      }}
      transition={{ duration: 0.45 }}
    >
      <div className="plc-map-record-eyebrow">One product record</div>
      <div className="plc-map-record-top">
        <div className="plc-map-silhouette" aria-hidden />
        <div>
          <div className="plc-map-record-name" style={SERIF}>
            Silk Midi Skirt
          </div>
          <div className="plc-map-record-meta">ITX-4102</div>
        </div>
      </div>
      <div className="plc-map-record-rows">
        <div className="plc-map-record-row">
          <span>Composition</span>
          <strong>{activeIndex >= 1 ? "96% silk · 4% elastane" : "incoming…"}</strong>
        </div>
        <div className="plc-map-record-row">
          <span>Evidence</span>
          <strong>{activeIndex >= 2 ? "Linked" : "Pending"}</strong>
        </div>
        <div className="plc-map-record-row">
          <span>Readiness</span>
          <strong>{readiness}%</strong>
        </div>
        <div className="plc-map-record-row">
          <span>Passport</span>
          <strong>{activeIndex >= 4 ? "Published" : "Not yet"}</strong>
        </div>
      </div>
      <div className="plc-map-record-progress">
        <motion.div
          className="plc-map-record-progress-fill"
          animate={{ width: `${readiness}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </motion.div>
  );
}

/**
 * Polished desktop lifecycle map prototype.
 * Starter architecture: route + persistent record + stage micro-visuals + Follow the Record bridge.
 * Screenshot walkthrough animation layer intentionally deferred.
 */
export function ProductLifecycleMap() {
  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [manualPause, setManualPause] = useState(false);
  const activeStage = lifecycleStages[activeIndex];

  useEffect(() => {
    if (reducedMotion || manualPause) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % lifecycleStages.length);
    }, 2800);
    return () => window.clearInterval(timer);
  }, [reducedMotion, manualPause]);

  const handleStageClick = (index: number) => {
    setActiveIndex(index);
    setManualPause(true);
    window.setTimeout(() => setManualPause(false), 6000);
  };

  return (
    <section className="plc-map-section" aria-labelledby="plc-map-heading">
      <div className="plc-map-intro">
        <span className="plc-map-eyebrow">Product lifecycle</span>
        <h1 id="plc-map-heading" className="plc-map-headline" style={SERIF}>
          From material to next life.
        </h1>
        <p className="plc-map-lede">
          INTERTEXE connects the information behind a product from sourcing and manufacturing through product data,
          traceability, compliance and Digital Product Passports, then keeps that record useful through use, repair,
          resale and end-of-life.
        </p>
      </div>

      <div className="plc-map-canvas">
        <svg className="plc-map-route" viewBox="0 0 1000 560" preserveAspectRatio="xMidYMid meet" aria-hidden>
          {/* Completed segments stay gold */}
          {stagePaths.map((path, index) => {
            const completed = index < activeIndex - 1;
            const traveling = index === activeIndex - 1;
            return (
              <g key={path}>
                <path className="plc-map-route-base" d={path} />
                {completed ? <path className="plc-map-route-done" d={path} /> : null}
                {traveling && !reducedMotion ? (
                  <motion.path
                    key={`travel-${activeIndex}-${index}`}
                    className="plc-map-route-active"
                    d={path}
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                  />
                ) : null}
                {traveling && reducedMotion ? <path className="plc-map-route-done" d={path} /> : null}
              </g>
            );
          })}
          {lifecycleStages.map((stage, index) => (
            <circle
              key={stage.id}
              cx={stage.x}
              cy={stage.y}
              r={index === activeIndex ? 6 : 4}
              className={index <= activeIndex ? "plc-map-anchor is-on" : "plc-map-anchor"}
            />
          ))}
        </svg>

        <div className="plc-map-record-pos">
          <ProductRecord activeIndex={activeIndex} />
        </div>

        {lifecycleStages.map((stage, index) => {
          const active = index === activeIndex;
          return (
            <button
              key={stage.id}
              type="button"
              className={`plc-map-stage plc-map-stage--${stage.id}${active ? " is-active" : ""}`}
              onClick={() => handleStageClick(index)}
              aria-label={`View ${stage.title}`}
              aria-current={active ? "step" : undefined}
            >
              <span className="plc-map-stage-num">{stage.number}</span>
              <span className="plc-map-stage-title" style={SERIF}>
                {stage.title}
              </span>
              <span className="plc-map-stage-desc">{stage.descriptor}</span>
              <StageMicroVisual type={stage.visual} active={active} />
            </button>
          );
        })}
      </div>

      <div className="plc-map-detail">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStage.id}
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
          >
            <div className="plc-map-detail-top">
              <span>{activeStage.number}</span>
              <h2 className="plc-map-detail-title" style={SERIF}>
                {activeStage.title}
              </h2>
            </div>
            <p className="plc-map-detail-copy">{activeStage.detail}</p>
            <div className="plc-map-terms">
              {activeStage.terms.map((term) => (
                <span key={term}>{term}</span>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="plc-map-transition">
        <div className="plc-map-transition-line" aria-hidden>
          <span />
        </div>
        <div className="plc-map-transition-copy">
          <span className="plc-map-eyebrow">Follow the record</span>
          <h2 className="plc-map-transition-h" style={SERIF}>
            See the record evolve.
          </h2>
          <p>
            Follow one product from fragmented source data to a governed record, live Digital Product Passport and
            measurable product intelligence.
          </p>
        </div>
      </div>
    </section>
  );
}
