"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

const INTRO_SEEN_KEY = "intertexe_khiteri_intro_seen_v2";

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
      if (localStorage.getItem(INTRO_SEEN_KEY) === "1") return;
      setShow(true);
      localStorage.setItem(INTRO_SEEN_KEY, "1");
    } catch {
      // ignore localStorage failures
    }
  }, [prefersReducedMotion]);

  const timings = useMemo(
    () => ({
      hero: { duration: 0.9 },
      tx: { delay: 0.2, duration: 0.5 },
      wordmark: { delay: 0.5, duration: 0.45 },
      tagline: { delay: 0.85, duration: 0.4 },
      hideAtMs: 2200,
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
          exit={{ opacity: 0, transition: { duration: 0.4, ease: "easeOut" } }}
        >
          <motion.img
            src={coverSrc}
            alt={coverAlt}
            className="khiteri-intro__hero"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: timings.hero.duration, ease: [0.22, 1, 0.36, 1] }}
          />
          <div className="khiteri-intro__veil" aria-hidden />

          <div className="khiteri-intro__brand">
            <motion.img
              src="/khiteri/brand/tx-mark.png"
              alt="TX"
              className="khiteri-intro__tx"
              initial={{ opacity: 0, y: 14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: timings.tx.duration, delay: timings.tx.delay, ease: "easeOut" }}
            />

            <motion.img
              src="/khiteri/brand/intertexe-horizontal.png"
              alt="INTERTEXE"
              className="khiteri-intro__wordmark"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: timings.wordmark.duration,
                delay: timings.wordmark.delay,
                ease: "easeOut",
              }}
            />

            <motion.p
              className="khiteri-intro__tagline"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
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
