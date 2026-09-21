"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { DEMO_FEATURED } from "../../../lib/material-intelligence/demo-featured";
import { SERIF } from "../platform-ui";

export const FLOW_STEPS = [
  {
    id: "source",
    num: "01",
    title: "Source",
    headline: "Fragmented inputs, one product.",
    copy: "Ingest product data from PLM, ERP, suppliers, or your existing systems — preserved as submitted.",
    image: "/platform/demo-source.png",
    alt: "Fragmented inputs from PLM, ERP, spreadsheet, supplier file, and retailer feed converging into one INTERTEXE product record",
  },
  {
    id: "normalize",
    num: "02",
    title: "Normalize",
    headline: "Messy strings become structured intelligence.",
    copy: "Clean, enrich, and standardize key product attributes and material composition without overwriting source strings.",
    image: "/platform/demo-normalize.png",
    alt: "INTERTEXE issues workspace resolving a composition conflict — current approved vs incoming source",
  },
  {
    id: "validate",
    num: "03",
    title: "Validate",
    headline: "Issues surfaced, never hidden.",
    copy: "Flag missing data, ensure compliance, and add verified evidence before anything reaches the consumer.",
    image: "/platform/demo-validate.png",
    alt: "INTERTEXE product workspace with key indicators for a ready-to-publish record",
  },
  {
    id: "publish",
    num: "04",
    title: "Publish",
    headline: "Publish once. Power every channel.",
    copy: "Turn approved product data into a digital product passport for your website, app, QR code, and partner channels.",
    image: "/platform/demo-publish.png",
    alt: "Publish once — digital product passport powering web, QR, mobile app, API, and retail channels",
  },
  {
    id: "activate",
    num: "05",
    title: "Activate",
    headline: "Power every channel.",
    copy: "Hosted passport, white-label domain, headless API — the same record powers your website, app, and resale partners.",
    image: "/platform/demo-activate.png",
    alt: "INTERTEXE product record with preview QR and full source-to-next-life lifecycle",
  },
  {
    id: "measure",
    num: "06",
    title: "Measure",
    headline: "Track, benchmark, improve.",
    copy: "Compare fiber mix, composition quality, passport performance, and market readiness against governed peer datasets over time.",
    image: "/platform/demo-measure.png",
    alt: "Material Benchmark dashboard — governed record coverage, peer medians, and passport performance",
  },
] as const;

export type FlowStepId = (typeof FLOW_STEPS)[number]["id"];

/**
 * Follow the Record — pinned Attio scroll:
 * left rail + dominant right visual stay fixed until Source→Measure finishes, then the page continues.
 */
export function DemoProductWorkflow() {
  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const pinRef = useRef<HTMLDivElement | null>(null);
  const step = FLOW_STEPS[activeIndex] ?? FLOW_STEPS[0];

  useEffect(() => {
    const pin = pinRef.current;
    if (!pin) return;

    const update = () => {
      const rect = pin.getBoundingClientRect();
      const scrollable = pin.offsetHeight - window.innerHeight;
      if (scrollable <= 0) {
        setActiveIndex(0);
        return;
      }
      const scrolled = Math.min(Math.max(-rect.top, 0), scrollable);
      const progress = scrolled / scrollable;
      const next = Math.min(FLOW_STEPS.length - 1, Math.floor(progress * FLOW_STEPS.length + 0.001));
      setActiveIndex(next);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  function goToStep(index: number) {
    const pin = pinRef.current;
    if (!pin) {
      setActiveIndex(index);
      return;
    }
    const scrollable = pin.offsetHeight - window.innerHeight;
    const pinTop = pin.getBoundingClientRect().top + window.scrollY;
    const target = pinTop + (scrollable * (index + 0.5)) / FLOW_STEPS.length;
    window.scrollTo({ top: target, behavior: reducedMotion ? "auto" : "smooth" });
  }

  return (
    <section id="journey" className="demo-flow scroll-mt-24">
      <div className="demo-flow-intro">
        <p className="demo-flow-eyebrow">Follow the record</p>
        <h2 className="demo-flow-heading" style={SERIF}>
          Six ways teams work the record.
        </h2>
        <p className="demo-flow-lede">
          Scroll through how teams work the {DEMO_FEATURED.name} — from messy inputs to the passport your customer
          scans. Or jump to any stage.
        </p>
      </div>

      <div
        className="demo-flow-pin"
        ref={pinRef}
        style={{ "--flow-steps": FLOW_STEPS.length } as CSSProperties}
      >
        <div className="demo-flow-sticky">
          <div className="demo-flow-layout">
            <nav className="demo-flow-rail" aria-label="Product workflow steps">
              <ol className="demo-flow-rail-list">
                {FLOW_STEPS.map((item, index) => {
                  const active = index === activeIndex;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={`demo-flow-rail-btn${active ? " is-active" : ""}`}
                        onClick={() => goToStep(index)}
                        aria-current={active ? "step" : undefined}
                      >
                        <span className="demo-flow-rail-indicator" aria-hidden />
                        <span className="demo-flow-rail-label">
                          <span className="demo-flow-rail-num">{item.num}</span>
                          {item.title}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>

            <div className="demo-flow-stage" aria-live="polite">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={step.id}
                  className="demo-flow-stage-inner"
                  initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="demo-flow-visual">
                    <img
                      src={step.image}
                      alt={step.alt}
                      width={1672}
                      height={941}
                      decoding="async"
                      fetchPriority="high"
                    />
                  </div>
                  <div className="demo-flow-copy">
                    <p className="demo-flow-meta">
                      {step.num} · {step.title}
                    </p>
                    <h3 className="demo-flow-title" style={SERIF}>
                      {step.headline}
                    </h3>
                    <p className="demo-flow-body">{step.copy}</p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
