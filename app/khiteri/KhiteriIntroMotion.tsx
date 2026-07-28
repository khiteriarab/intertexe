"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

/** Bump when intro choreography changes so returning visitors see it once. */
const INTRO_SEEN_KEY = "intertexe_khiteri_intro_seen_v4";

/**
 * Premium brand intro — transparent overlay over the editorial cover.
 * Photography stays the primary focus; INTERTEXE marks appear once, then exit.
 */
export function KhiteriIntroMotion() {
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
      tx: { delay: 0.15, duration: 0.7 },
      wordmark: { delay: 0.55, duration: 0.65 },
      tagline: { delay: 0.95, duration: 0.55 },
      holdMs: 2600,
      exitMs: 700,
    }),
    []
  );

  useEffect(() => {
    if (!show) return;
    const t = window.setTimeout(() => setShow(false), timings.holdMs);
    return () => window.clearTimeout(t);
  }, [show, timings.holdMs]);

  if (prefersReducedMotion) return null;

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          className="khiteri-intro"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: timings.exitMs / 1000, ease: [0.22, 1, 0.36, 1] } }}
          aria-hidden
        >
          {/* Soft vignette only — cover photography underneath remains fully visible. */}
          <div className="khiteri-intro__veil" />

          <div className="khiteri-intro__brand">
            <motion.img
              src="/khiteri/brand/tx-mark-white.png"
              alt=""
              className="khiteri-intro__tx"
              initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: timings.tx.duration, delay: timings.tx.delay, ease: [0.22, 1, 0.36, 1] }}
            />

            <motion.img
              src="/khiteri/brand/intertexe-horizontal-white.png"
              alt=""
              className="khiteri-intro__wordmark"
              initial={{ opacity: 0, y: 10, letterSpacing: "0.2em" }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: timings.wordmark.duration,
                delay: timings.wordmark.delay,
                ease: [0.22, 1, 0.36, 1],
              }}
            />

            <motion.p
              className="khiteri-intro__tagline"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 0.9, y: 0 }}
              transition={{
                duration: timings.tagline.duration,
                delay: timings.tagline.delay,
                ease: [0.22, 1, 0.36, 1],
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
