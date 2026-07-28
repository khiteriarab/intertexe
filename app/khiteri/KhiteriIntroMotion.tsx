"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

/** Bump when intro choreography changes so returning visitors see it once. */
const INTRO_SEEN_KEY = "intertexe_khiteri_intro_seen_v5";
const BRAND = "INTERTEXE";
/** ms between each letter */
const TYPE_MS = 95;
/** pause after full word before exit */
const HOLD_MS = 1100;
const EXIT_MS = 650;

/**
 * Brand intro — INTERTEXE types out in Playfair Display bold over the editorial cover.
 * Photography stays primary; plays once per visitor (or ?intro=1).
 */
export function KhiteriIntroMotion() {
  const prefersReducedMotion = useReducedMotion();
  const [show, setShow] = useState(false);
  const [typed, setTyped] = useState("");
  const [doneTyping, setDoneTyping] = useState(false);

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

  useEffect(() => {
    if (!show) return;
    let i = 0;
    setTyped("");
    setDoneTyping(false);
    const id = window.setInterval(() => {
      i += 1;
      setTyped(BRAND.slice(0, i));
      if (i >= BRAND.length) {
        window.clearInterval(id);
        setDoneTyping(true);
      }
    }, TYPE_MS);
    return () => window.clearInterval(id);
  }, [show]);

  useEffect(() => {
    if (!show || !doneTyping) return;
    const t = window.setTimeout(() => setShow(false), HOLD_MS);
    return () => window.clearTimeout(t);
  }, [show, doneTyping]);

  if (prefersReducedMotion) return null;

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          className="khiteri-intro"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: EXIT_MS / 1000, ease: [0.22, 1, 0.36, 1] } }}
          aria-hidden
        >
          <div className="khiteri-intro__veil" />

          <div className="khiteri-intro__brand">
            <p className="khiteri-intro__typewriter" aria-label="INTERTEXE">
              <span className="khiteri-intro__typed">{typed}</span>
              <span
                className={`khiteri-intro__caret${doneTyping ? " khiteri-intro__caret--done" : ""}`}
              />
            </p>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
