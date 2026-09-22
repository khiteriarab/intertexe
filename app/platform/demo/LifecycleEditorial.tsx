"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { SERIF } from "../platform-ui";
import type { LifecycleStage } from "./lifecycle-data";

export function LifecycleEditorial({
  stage,
  reducedMotion,
}: {
  stage: LifecycleStage;
  reducedMotion: boolean;
}) {
  return (
    <div className="plc-detail" aria-live="polite">
      <AnimatePresence mode="wait">
        <motion.div
          key={stage.id}
          className="plc-detail-inner"
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reducedMotion ? undefined : { opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
        >
          <p className="plc-detail-kicker">{stage.number}</p>
          <h2 className="plc-detail-title" style={SERIF}>
            {stage.title}
          </h2>
          <p className="plc-detail-copy">{stage.description}</p>
          <ul className="plc-detail-terms">
            {stage.terms.map((term, i) => (
              <li key={term.label}>
                {i > 0 ? <span className="plc-detail-sep" aria-hidden>·</span> : null}
                {term.href ? (
                  <Link href={term.href} className="plc-detail-term is-link">
                    {term.label}
                  </Link>
                ) : (
                  <span className="plc-detail-term">{term.label}</span>
                )}
              </li>
            ))}
          </ul>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
