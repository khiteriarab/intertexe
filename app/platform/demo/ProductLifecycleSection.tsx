"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { SERIF } from "../platform-ui";
import { LIFECYCLE_STAGES, LIFECYCLE_STEP_MS } from "./lifecycle-data";
import { LifecyclePath } from "./LifecyclePath";
import { LifecycleStep } from "./LifecycleStep";
import "./lifecycle.css";

export function ProductLifecycleSection() {
  const reducedMotion = useReducedMotion() ?? false;
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;
    const id = window.setInterval(() => {
      setActiveIndex((i) => (i + 1) % LIFECYCLE_STAGES.length);
    }, LIFECYCLE_STEP_MS);
    return () => window.clearInterval(id);
  }, [reducedMotion]);

  const progress = (activeIndex + 1) / LIFECYCLE_STAGES.length;

  return (
    <section id="hero" className="plc-section scroll-mt-24" aria-labelledby="plc-heading">
      <div className="plc-wrap">
        <header className="plc-intro">
          <p className="plc-eyebrow">Product lifecycle</p>
          <h1 id="plc-heading" className="plc-headline" style={SERIF}>
            From material to next life.
          </h1>
          <p className="plc-lede">
            INTERTEXE connects the information behind a product from sourcing and manufacturing through product
            data, traceability, compliance and Digital Product Passports, then keeps that record useful through
            use, repair, resale and end-of-life.
          </p>
          <div className="plc-intro-actions">
            <Link href="#passport" className="demo-editorial-btn-primary">
              See a live product →
            </Link>
            <Link href="#journey" className="demo-editorial-btn-text">
              Or explore the workflow
            </Link>
          </div>
        </header>

        <div className="plc-timeline" role="list">
          <div className="plc-path-slot">
            <LifecyclePath progress={progress} reducedMotion={reducedMotion} />
          </div>

          {LIFECYCLE_STAGES.map((stage, index) => (
            <LifecycleStep
              key={stage.id}
              stage={stage}
              index={index}
              active={activeIndex === index}
              onSelect={() => setActiveIndex(index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
