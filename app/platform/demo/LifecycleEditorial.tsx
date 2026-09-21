"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { SERIF } from "../platform-ui";
import type { LifecycleStage, LifecycleVisualType } from "./lifecycle-data";

function AbstractGeo({ type, active }: { type: LifecycleVisualType; active: boolean }) {
  return (
    <svg
      className={`plc-geo plc-geo--${type}${active ? " is-active" : ""}`}
      viewBox="0 0 72 48"
      aria-hidden
    >
      {type === "converge" ? (
        <>
          <path d="M6 10 H28 M6 24 H28 M6 38 H28" />
          <path d="M28 10 L48 24 M28 24 L48 24 M28 38 L48 24" />
          <circle cx="56" cy="24" r="7" />
        </>
      ) : null}
      {type === "normalize" ? (
        <>
          <path d="M8 12 H40" strokeDasharray="2 3" />
          <path d="M10 24 H38" strokeDasharray="2 3" />
          <path d="M12 36 H36" strokeDasharray="2 3" />
          <path d="M44 24 H52" />
          <rect x="52" y="14" width="14" height="20" rx="1" />
        </>
      ) : null}
      {type === "trace" ? (
        <>
          <circle cx="14" cy="12" r="4" />
          <circle cx="14" cy="36" r="4" />
          <circle cx="36" cy="24" r="4" className="is-fill" />
          <circle cx="58" cy="24" r="7" />
          <path d="M18 14 L32 22 M18 34 L32 26 M40 24 H51" />
        </>
      ) : null}
      {type === "checklist" ? (
        <>
          <circle cx="36" cy="24" r="16" />
          <circle cx="36" cy="24" r="9" />
          <path d="M28 24 l5 5 10-12" />
        </>
      ) : null}
      {type === "publish" ? (
        <>
          <rect x="8" y="14" width="18" height="20" rx="1" />
          <path d="M26 24 H34" />
          <circle cx="44" cy="14" r="3" />
          <circle cx="56" cy="24" r="3" />
          <circle cx="44" cy="34" r="3" />
          <path d="M34 24 L41 14 M34 24 L53 24 M34 24 L41 34" />
        </>
      ) : null}
      {type === "signals" ? (
        <>
          <circle cx="36" cy="24" r="8" />
          <path d="M10 12 L28 20 M10 36 L28 28 M44 20 L62 12 M44 28 L62 36" />
          <circle cx="8" cy="12" r="2.5" className="is-fill" />
          <circle cx="8" cy="36" r="2.5" className="is-fill" />
          <circle cx="64" cy="12" r="2.5" className="is-fill" />
          <circle cx="64" cy="36" r="2.5" className="is-fill" />
        </>
      ) : null}
      {type === "loop" ? (
        <>
          <circle cx="36" cy="24" r="14" />
          <circle cx="36" cy="24" r="4" className="is-fill" />
          <path d="M36 8 v-4 M50 24 h4 M36 40 v4 M22 24 h-4" />
        </>
      ) : null}
    </svg>
  );
}

export function LifecycleEditorial({
  stage,
  reducedMotion,
}: {
  stage: LifecycleStage;
  reducedMotion: boolean;
}) {
  return (
    <div className="plc-editorial" aria-live="polite">
      <AnimatePresence mode="wait">
        <motion.div
          key={stage.id}
          className="plc-editorial-inner"
          initial={reducedMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? undefined : { opacity: 0, y: -4 }}
          transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="plc-editorial-copy">
            <p className="plc-editorial-kicker">
              {stage.number}
              <span aria-hidden> · </span>
              Active
            </p>
            <h2 className="plc-editorial-title" style={SERIF}>
              {stage.title}
            </h2>
            <p className="plc-editorial-body">{stage.description}</p>
            <ul className="plc-editorial-terms">
              {stage.terms.map((term, i) => (
                <li key={term.label}>
                  {i > 0 ? <span className="plc-editorial-sep" aria-hidden>·</span> : null}
                  {term.href ? (
                    <Link href={term.href} className="plc-editorial-term is-link">
                      {term.label}
                    </Link>
                  ) : (
                    <span className="plc-editorial-term">{term.label}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <AbstractGeo type={stage.visualType} active />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
