"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

const BRAND = "INTERTEXE";
/** ms between each letter */
const TYPE_MS = 95;
/** pause after full word before exit */
const HOLD_MS = 1100;
const EXIT_MS = 650;

/**
 * Brand intro — INTERTEXE types out in Playfair Display bold over the editorial cover.
 * Photography stays primary; plays every time someone opens /khiteri.
 */
export function KhiteriIntroMotion() {
  const prefersReducedMotion = useReducedMotion();
  const [show, setShow] = useState(false);
  const [typed, setTyped] = useState("");
  const [doneTyping, setDoneTyping] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion) return;
    setShow(true);
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
