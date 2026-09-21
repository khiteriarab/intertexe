"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ENT_NAV_GROUP_ICONS, ENT_NAV_ITEM_ICONS } from "../../dashboard/components/EnterpriseNavIcons";
import { SERIF } from "../platform-ui";
import { SOLUTIONS, type SolutionCard } from "./solutions-data";

const SOLUTION_ICONS = {
  ...ENT_NAV_ITEM_ICONS,
  ...ENT_NAV_GROUP_ICONS,
} as const;

const ease = [0.22, 1, 0.36, 1] as const;

function SolutionCardBlock({
  card,
  size = "standard",
  onExplore,
}: {
  card: SolutionCard;
  size?: "feature" | "standard";
  onExplore: (card: SolutionCard) => void;
}) {
  const Icon = SOLUTION_ICONS[card.icon];
  return (
    <button
      type="button"
      className={`solution-card solution-card--${size}`}
      onClick={() => onExplore(card)}
    >
      <span className="solution-card-icon" aria-hidden>
        <Icon />
      </span>
      <p className="solution-card-label">{card.label}</p>
      <h3 className="solution-card-title" style={SERIF}>
        {card.title}
      </h3>
      <p className="solution-card-copy">{card.description}</p>
      <ul className="solution-card-tags">
        {card.tags.map((tag) => (
          <li key={tag}>{tag}</li>
        ))}
      </ul>
      <span className="solution-card-cta">
        Explore solution
        <span className="solution-card-arrow" aria-hidden>
          →
        </span>
      </span>
    </button>
  );
}

function SolutionDetailPanel({
  card,
  onClose,
}: {
  card: SolutionCard;
  onClose: () => void;
}) {
  const titleId = useId();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <motion.div
      className="solution-panel-root"
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reducedMotion ? undefined : { opacity: 0 }}
      transition={{ duration: 0.28 }}
    >
      <button type="button" className="solution-panel-backdrop" aria-label="Close solution detail" onClick={onClose} />
      <motion.div
        className="solution-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={reducedMotion ? false : { opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reducedMotion ? undefined : { opacity: 0, y: 12, scale: 0.985 }}
        transition={{ duration: 0.38, ease }}
      >
        <button type="button" className="solution-panel-close" onClick={onClose} aria-label="Close">
          <span aria-hidden>×</span>
        </button>

        <div className="solution-panel-grid">
          <div className="solution-panel-copy">
            <p className="solution-panel-eyebrow">{card.label}</p>
            <h2 id={titleId} className="solution-panel-title" style={SERIF}>
              {card.title}
            </h2>
            <p className="solution-panel-proposition">{card.proposition}</p>
            {card.detail.map((paragraph) => (
              <p key={paragraph.slice(0, 48)} className="solution-panel-body">
                {paragraph}
              </p>
            ))}

            <div className="solution-panel-block">
              <h3 className="solution-panel-block-title">What you get</h3>
              <ul className="solution-panel-list">
                {card.get.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="solution-panel-block">
              <h3 className="solution-panel-block-title">Why it matters</h3>
              <p className="solution-panel-body solution-panel-body--tight">{card.why}</p>
            </div>

            <div className="solution-panel-actions">
              <Link href={card.cta.href} className="solutions-cta-primary" onClick={onClose}>
                {card.cta.label}
                <span aria-hidden>→</span>
              </Link>
              {card.cta.href.includes("/demo") ? (
                <Link
                  href="/brands/request?intent=demo&cta=solutions_explore"
                  className="solutions-cta-secondary"
                  onClick={onClose}
                >
                  Request a demo
                </Link>
              ) : (
                <Link href="/brands/demo" className="solutions-cta-secondary" onClick={onClose}>
                  See it live
                </Link>
              )}
            </div>
          </div>

          <div className="solution-panel-visual">
            <Image
              src={card.visual}
              alt={card.visualAlt}
              width={960}
              height={720}
              className="solution-panel-image"
              sizes="(max-width: 899px) 90vw, 42vw"
              unoptimized
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/** Existing asymmetric Solutions grid + explore detail panel. Card visuals unchanged. */
export function SolutionsExploreGrid() {
  const [active, setActive] = useState<SolutionCard | null>(null);
  const [feature, traceability, environmental, ...rest] = SOLUTIONS;

  return (
    <>
      <div className="solutions-grid solutions-grid--lead">
        <SolutionCardBlock card={feature} size="feature" onExplore={setActive} />
        <div className="solutions-grid-stack">
          <SolutionCardBlock card={traceability} onExplore={setActive} />
          <SolutionCardBlock card={environmental} onExplore={setActive} />
        </div>
      </div>

      <div className="solutions-grid solutions-grid--rest">
        {rest.map((card) => (
          <SolutionCardBlock key={card.key} card={card} onExplore={setActive} />
        ))}
      </div>

      <AnimatePresence>
        {active ? <SolutionDetailPanel key={active.key} card={active} onClose={() => setActive(null)} /> : null}
      </AnimatePresence>
    </>
  );
}
