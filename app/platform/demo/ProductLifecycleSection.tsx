"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { SERIF } from "../platform-ui";
import {
  LIFECYCLE_DWELL_MS,
  LIFECYCLE_RESUME_MS,
  LIFECYCLE_STAGES,
  LIFECYCLE_TRAVEL_MS,
  progressForStage,
} from "./lifecycle-data";
import { LifecycleDiagram } from "./LifecycleDiagram";
import { LifecycleEditorial } from "./LifecycleEditorial";
import { LifecycleMobile } from "./LifecycleMobile";
import "./lifecycle.css";

type Phase = "dwell" | "travel";

export function ProductLifecycleSection() {
  const reducedMotion = useReducedMotion() ?? false;
  const [activeIndex, setActiveIndex] = useState(0);
  const [drawProgress, setDrawProgress] = useState(0);
  const [phase, setPhase] = useState<Phase>("dwell");
  const pauseUntil = useRef(0);
  const timers = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  }, []);

  const goTo = useCallback(
    (index: number, opts?: { manual?: boolean; travel?: boolean }) => {
      clearTimers();
      const next = ((index % LIFECYCLE_STAGES.length) + LIFECYCLE_STAGES.length) % LIFECYCLE_STAGES.length;

      if (opts?.manual) {
        pauseUntil.current = Date.now() + LIFECYCLE_RESUME_MS;
        setPhase("dwell");
        setActiveIndex(next);
        setDrawProgress(progressForStage(next));
        return;
      }

      if (opts?.travel && !reducedMotion) {
        setPhase("travel");
        setDrawProgress(progressForStage(next));
        schedule(() => {
          setActiveIndex(next);
          setPhase("dwell");
        }, LIFECYCLE_TRAVEL_MS);
        return;
      }

      setPhase("dwell");
      setActiveIndex(next);
      setDrawProgress(progressForStage(next));
    },
    [clearTimers, reducedMotion, schedule],
  );

  useEffect(() => {
    setDrawProgress(progressForStage(0));
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    if (phase !== "dwell") return;

    const tick = () => {
      if (Date.now() < pauseUntil.current) {
        schedule(tick, 350);
        return;
      }
      const next = (activeIndex + 1) % LIFECYCLE_STAGES.length;
      if (next === 0) {
        setPhase("travel");
        setDrawProgress(0);
        schedule(() => goTo(0, { travel: true }), 200);
        return;
      }
      goTo(next, { travel: true });
    };

    schedule(tick, LIFECYCLE_DWELL_MS);
    return clearTimers;
  }, [activeIndex, phase, reducedMotion, goTo, schedule, clearTimers]);

  useEffect(() => {
    if (!reducedMotion) return;
    const id = window.setInterval(() => {
      if (Date.now() < pauseUntil.current) return;
      setActiveIndex((i) => {
        const next = (i + 1) % LIFECYCLE_STAGES.length;
        setDrawProgress(progressForStage(next));
        return next;
      });
    }, LIFECYCLE_DWELL_MS + LIFECYCLE_TRAVEL_MS);
    return () => window.clearInterval(id);
  }, [reducedMotion]);

  const stage = LIFECYCLE_STAGES[activeIndex];

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
              Or explore how teams use it
            </Link>
          </div>
        </header>

        <div className="plc-desktop">
          <LifecycleDiagram
            activeIndex={activeIndex}
            drawProgress={drawProgress}
            reducedMotion={reducedMotion}
            onSelect={(i) => goTo(i, { manual: true })}
          />
          <LifecycleEditorial stage={stage} reducedMotion={reducedMotion} />
        </div>

        <LifecycleMobile
          activeIndex={activeIndex}
          drawProgress={drawProgress}
          reducedMotion={reducedMotion}
          onSelect={(i) => goTo(i, { manual: true })}
        />
      </div>
    </section>
  );
}
