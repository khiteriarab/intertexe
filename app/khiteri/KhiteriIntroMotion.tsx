"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

const INTRO_SEEN_KEY = "intertexe_khiteri_intro_seen_v3";

type Props = {
  coverSrc: string;
  coverAlt: string;
};

export function KhiteriIntroMotion({ coverSrc, coverAlt }: Props) {
  const prefersReducedMotion = useReducedMotion();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion) return;
    try {
      const force =
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("intro") === "1";
      if (!force && localStorage.getItem(INTRO_SEEN_KEY) === "1") return;
      setShow(true);
      if (!force) localStorage.setItem(INTRO_SEEN_KEY, "1");
    } catch {
      // ignore localStorage failures
    }
  }, [prefersReducedMotion]);

  const timings = useMemo(
    () => ({
      hero: { duration: 1.05 },
      tx: { delay: 0.25, duration: 0.55 },
      wordmark: { delay: 0.55, duration: 0.5 },
      tagline: { delay: 0.9, duration: 0.45 },
      hideAtMs: 2300,
    }),
    []
  );

  useEffect(() => {
    if (!show) return;
    const t = window.setTimeout(() => setShow(false), timings.hideAtMs);
    return () => window.clearTimeout(t);
  }, [show, timings.hideAtMs]);

  if (prefersReducedMotion) return null;

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          className="khiteri-intro"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.45, ease: "easeOut" } }}
        >
          <motion.img
            src={coverSrc}
            alt={coverAlt}
            className="khiteri-intro__hero"
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: timings.hero.duration, ease: [0.22, 1, 0.36, 1] }}
          />
          <div className="khiteri-intro__veil" aria-hidden />

          <div className="khiteri-intro__brand">
            <motion.img
              src="/khiteri/brand/tx-mark-white.png"
              alt="TX"
              className="khiteri-intro__tx"
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 0.92, y: 0, scale: 1 }}
              transition={{ duration: timings.tx.duration, delay: timings.tx.delay, ease: "easeOut" }}
            />

            <motion.img
              src="/khiteri/brand/intertexe-horizontal-white.png"
              alt="INTERTEXE"
              className="khiteri-intro__wordmark"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 0.95, y: 0 }}
              transition={{
                duration: timings.wordmark.duration,
                delay: timings.wordmark.delay,
                ease: "easeOut",
              }}
            />

            <motion.p
              className="khiteri-intro__tagline"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 0.88, y: 0 }}
              transition={{
                duration: timings.tagline.duration,
                delay: timings.tagline.delay,
                ease: "easeOut",
              }}
            >
              The Material Standard
            </motion.p>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
