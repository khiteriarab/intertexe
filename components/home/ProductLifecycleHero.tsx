"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { SERIF } from "../../app/platform/platform-ui";
import styles from "./ProductLifecycleHero.module.css";

export const lifecycleStages = [
  {
    id: "01",
    title: "Source & Make",
    subtitle: "Materials, suppliers, manufacturing",
    cues: ["Style + BOM", "Supplier + PO"],
    // SVG node positions in viewBox 720×560
    x: 118,
    y: 118,
  },
  {
    id: "02",
    title: "Clean & Connect",
    subtitle: "One trusted product record",
    cues: ["Composition"],
    x: 360,
    y: 72,
  },
  {
    id: "03",
    title: "Trace & Prove",
    subtitle: "Claims linked to evidence",
    cues: ["Evidence"],
    x: 586,
    y: 132,
  },
  {
    id: "04",
    title: "Check & Prepare",
    subtitle: "Compliance + DPP readiness",
    cues: ["Readiness"],
    x: 628,
    y: 318,
  },
  {
    id: "05",
    title: "Passport & Publish",
    subtitle: "Governed identity distributed",
    cues: ["DPP", "QR / NFC"],
    x: 520,
    y: 468,
  },
  {
    id: "06",
    title: "Use & Learn",
    subtitle: "Intelligence from every channel",
    cues: ["Signals"],
    x: 248,
    y: 478,
  },
  {
    id: "07",
    title: "Repair & Recirculate",
    subtitle: "Beyond first sale",
    cues: ["Care", "Resale", "Reuse"],
    x: 96,
    y: 320,
  },
] as const;

type Stage = (typeof lifecycleStages)[number];

/** Soft cubic path through stage centers — journey spine, not a flowchart. */
function journeyPath(stages: readonly Stage[]) {
  const pts = stages.map((s) => ({ x: s.x, y: s.y }));
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const mx = (prev.x + curr.x) / 2;
    const my = (prev.y + curr.y) / 2;
    // Pull mid control slightly toward canvas center for an orbital feel
    const cx = mx + (360 - mx) * 0.18;
    const cy = my + (280 - my) * 0.18;
    d += ` Q ${cx} ${cy} ${curr.x} ${curr.y}`;
  }
  return d;
}

function MicroMotif({ stageId, active }: { stageId: string; active: boolean }) {
  const accent = active ? "var(--plh-gold)" : "rgba(23,25,23,0.28)";
  switch (stageId) {
    case "01":
      return (
        <svg className={styles.motif} viewBox="0 0 28 18" aria-hidden>
          {[0, 6, 12].map((y) => (
            <rect key={y} x="2" y={y} width="24" height="3.5" rx="0.5" fill={accent} opacity={0.55 + y * 0.04} />
          ))}
        </svg>
      );
    case "02":
      return (
        <svg className={styles.motif} viewBox="0 0 28 18" aria-hidden>
          <rect x="1" y="3" width="11" height="12" rx="1" fill="none" stroke={accent} strokeWidth="1" />
          <rect x="16" y="3" width="11" height="12" rx="1" fill="none" stroke={accent} strokeWidth="1" />
          <path d="M12 9h4" stroke={accent} strokeWidth="1" />
        </svg>
      );
    case "03":
      return (
        <svg className={styles.motif} viewBox="0 0 28 18" aria-hidden>
          <circle cx="6" cy="9" r="2.2" fill={accent} />
          <circle cx="22" cy="9" r="2.2" fill={accent} />
          <path d="M8.5 9h11" stroke={accent} strokeWidth="1" strokeDasharray="2 2" />
        </svg>
      );
    case "04":
      return (
        <svg className={styles.motif} viewBox="0 0 28 18" aria-hidden>
          {[4, 10, 16].map((x, i) => (
            <g key={x}>
              <rect x={x} y="4" width="5" height="10" rx="0.8" fill="none" stroke={accent} strokeWidth="1" />
              {i < 2 ? <path d={`M${x + 1.2} 9.2l1.4 1.4 2.4-3`} fill="none" stroke={accent} strokeWidth="1" /> : null}
            </g>
          ))}
        </svg>
      );
    case "05":
      return (
        <svg className={styles.motif} viewBox="0 0 28 18" aria-hidden>
          <rect x="3" y="2" width="14" height="14" rx="1" fill="none" stroke={accent} strokeWidth="1" />
          <rect x="6" y="5" width="4" height="4" fill={accent} opacity="0.7" />
          <circle cx="23" cy="9" r="3.5" fill="none" stroke={accent} strokeWidth="1" />
        </svg>
      );
    case "06":
      return (
        <svg className={styles.motif} viewBox="0 0 28 18" aria-hidden>
          {[6, 11, 16, 21].map((x, i) => (
            <rect key={x} x={x} y={14 - (i + 1) * 2.4} width="2.4" height={(i + 1) * 2.4} fill={accent} opacity={0.45 + i * 0.12} />
          ))}
        </svg>
      );
    default:
      return (
        <svg className={styles.motif} viewBox="0 0 28 18" aria-hidden>
          <circle cx="14" cy="9" r="6.5" fill="none" stroke={accent} strokeWidth="1" />
          <path d="M14 4.5a4.5 4.5 0 0 1 0 9" fill="none" stroke={accent} strokeWidth="1" />
          <path d="M16.5 3.8l1.6-.2-.4 1.6" fill="none" stroke={accent} strokeWidth="1" />
        </svg>
      );
  }
}

/**
 * Homepage product-lifecycle explainer — editorial copy + refined SVG system map.
 * Light canvas only; does not compete with the dark visual section below.
 */
export function ProductLifecycleHero() {
  const reducedMotion = useReducedMotion();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const pathD = journeyPath(lifecycleStages);

  useEffect(() => {
    if (reducedMotion || paused) return;
    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % lifecycleStages.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, [reducedMotion, paused]);

  return (
    <section
      className={styles.section}
      id="product-lifecycle"
      aria-labelledby="product-lifecycle-heading"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className={styles.shell}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>Product lifecycle</p>
          <h2 id="product-lifecycle-heading" className={styles.headline} style={SERIF}>
            From material
            <br />
            to next life.
          </h2>
          <p className={styles.body}>
            INTERTEXE connects fragmented product information from sourcing and manufacturing through product data,
            traceability, compliance, and Digital Product Passports — then keeps that governed record useful through
            use, repair, resale, and end-of-life.
          </p>
          <div className={styles.actions}>
            <Link href="/brands/demo" className={styles.primaryCta}>
              See a live product
              <span aria-hidden>→</span>
            </Link>
            <Link href="/brands/solutions" className={styles.secondaryCta}>
              Explore how teams use it
            </Link>
          </div>
        </div>

        <div className={styles.mapPane} role="img" aria-label="INTERTEXE product lifecycle from source to next life">
          <div className={styles.mapFrame}>
            <svg className={styles.mapSvg} viewBox="0 0 720 560" fill="none" aria-hidden>
              {/* Soft orbital ellipse — structure without boxes */}
              <ellipse
                cx="360"
                cy="278"
                rx="248"
                ry="188"
                className={styles.orbitRing}
              />
              <ellipse
                cx="360"
                cy="278"
                rx="168"
                ry="122"
                className={styles.orbitRingInner}
              />

              {/* Journey spine */}
              <path d={pathD} className={styles.journeyBase} />
              <path
                d={pathD}
                className={styles.journeyActive}
                style={{
                  // Approximate segment highlight via dash animation keyed to active
                  strokeDashoffset: reducedMotion ? 0 : active * -72,
                }}
              />

              {/* Spokes from record center to each stage */}
              {lifecycleStages.map((stage, index) => (
                <line
                  key={`spoke-${stage.id}`}
                  x1="360"
                  y1="278"
                  x2={stage.x}
                  y2={stage.y}
                  className={index === active ? styles.spokeActive : styles.spoke}
                />
              ))}

              {/* Stage nodes */}
              {lifecycleStages.map((stage, index) => (
                <g key={`node-${stage.id}`}>
                  <circle
                    cx={stage.x}
                    cy={stage.y}
                    r={index === active ? 7 : 5}
                    className={index === active ? styles.nodeActive : styles.node}
                  />
                  <circle
                    cx={stage.x}
                    cy={stage.y}
                    r="2"
                    className={index === active ? styles.nodeCoreActive : styles.nodeCore}
                  />
                </g>
              ))}
            </svg>

            {/* Central governed record — refined anchor, not a dashboard */}
            <div className={styles.record}>
              <p className={styles.recordKicker}>Governed product record</p>
              <p className={styles.recordTitle} style={SERIF}>
                Silk Midi Skirt
              </p>
              <p className={styles.recordSku}>ITX-4102</p>
              <div className={styles.recordRule} />
              <p className={styles.recordField}>
                <span>Composition</span>
                <strong>96% Silk · 4% Elastane</strong>
              </p>
              <ul className={styles.recordStatus}>
                <li>
                  <i />
                  Ready
                </li>
                <li>
                  <i />
                  Verified
                </li>
                <li>
                  <i />
                  Published
                </li>
              </ul>
            </div>

            {/* Stage labels around the map */}
            {lifecycleStages.map((stage, index) => (
              <button
                key={stage.id}
                type="button"
                className={`${styles.stage} ${styles[`stage${stage.id}`]} ${index === active ? styles.stageActive : ""}`}
                onClick={() => setActive(index)}
                aria-pressed={index === active}
              >
                <span className={styles.stageId}>{stage.id}</span>
                <span className={styles.stageTitle}>{stage.title}</span>
                <span className={styles.stageSubtitle}>{stage.subtitle}</span>
                <span className={styles.stageMotif}>
                  <MicroMotif stageId={stage.id} active={index === active} />
                </span>
                <span className={styles.stageCues}>
                  {stage.cues.map((cue) => (
                    <em key={cue}>{cue}</em>
                  ))}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default ProductLifecycleHero;
