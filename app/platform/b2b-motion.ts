"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

/** Respect prefers-reduced-motion for B2B storytelling animations. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return reduced;
}

/** Fire once when element enters viewport — used for scroll sequencing. */
export function useInView(threshold = 0.25): [RefObject<HTMLElement | null>, boolean] {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, visible];
}

/** Step index advances while section is in view (journey sequencing). */
export function useScrollSteps(stepCount: number): [RefObject<HTMLElement | null>, number] {
  const ref = useRef<HTMLElement | null>(null);
  const [step, setStep] = useState(0);
  const reduced = useReducedMotion();

  const onScroll = useCallback(() => {
    const node = ref.current;
    if (!node || reduced) return;

    const rect = node.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    const progress = 1 - Math.min(1, Math.max(0, (rect.bottom - vh * 0.2) / (rect.height + vh * 0.4)));
    const next = Math.min(stepCount - 1, Math.floor(progress * stepCount));
    setStep(next);
  }, [reduced, stepCount]);

  useEffect(() => {
    if (reduced) {
      setStep(stepCount - 1);
      return;
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [onScroll, reduced, stepCount]);

  return [ref, step];
}
