"use client";

import Link from "next/link";
import { useState } from "react";
import { SERIF } from "../../../app/platform/platform-ui";
import { LIFECYCLE_STAGES, type LifecycleStage } from "./lifecycle-stages";
import styles from "./LifecycleOverviewSection.module.css";

/** Hub geometry in viewBox 720×560 — stage node centers for connectors. */
const NODE_POINTS: Record<string, { x: number; y: number }> = {
  source: { x: 118, y: 118 },
  clean: { x: 360, y: 78 },
  trace: { x: 590, y: 128 },
  prepare: { x: 628, y: 280 },
  publish: { x: 560, y: 460 },
  learn: { x: 280, y: 488 },
  recirculate: { x: 110, y: 360 },
};

const HUB = { x: 360, y: 278 };

function StageMotif({ stage, active }: { stage: LifecycleStage; active: boolean }) {
  const stroke = active ? "var(--lov-gold)" : "rgba(23,25,23,0.35)";
  const fill = active ? "var(--lov-gold)" : "rgba(23,25,23,0.45)";

  switch (stage.visualType) {
    case "source":
      return (
        <svg className={styles.motif} viewBox="0 0 48 20" aria-hidden>
          {[4, 10, 16].map((y, i) => (
            <g key={y}>
              <line x1="0" y1={y} x2="28" y2={y} stroke={stroke} strokeWidth="1" />
              <circle cx="30" cy={y} r="1.6" fill={i === 1 ? "var(--lov-gold)" : fill} />
            </g>
          ))}
        </svg>
      );
    case "clean":
      return (
        <svg className={styles.motif} viewBox="0 0 48 20" aria-hidden>
          {[2, 7, 12, 17].map((y, i) => (
            <line
              key={y}
              x1={i % 2 === 0 ? 0 : 4}
              y1={y}
              x2={20}
              y2={10}
              stroke={stroke}
              strokeWidth="1"
              opacity={0.55 + i * 0.08}
            />
          ))}
          <rect x="22" y="4" width="22" height="12" rx="1.5" fill="none" stroke={stroke} strokeWidth="1" />
        </svg>
      );
    case "trace":
      return (
        <svg className={styles.motif} viewBox="0 0 48 20" aria-hidden>
          <circle cx="8" cy="10" r="2.2" fill={fill} />
          <circle cx="24" cy="10" r="2.2" fill={fill} />
          <circle cx="40" cy="10" r="2.2" fill={active ? "var(--lov-gold)" : fill} />
          <path d="M10 10h12M26 10h12" stroke={stroke} strokeWidth="1" strokeDasharray="2 2" />
        </svg>
      );
    case "prepare":
      return (
        <svg className={styles.motif} viewBox="0 0 48 20" aria-hidden>
          {["I", "R", "✓"].map((label, i) => (
            <g key={label}>
              <rect
                x={4 + i * 15}
                y="3"
                width="12"
                height="14"
                rx="2"
                fill={i === 2 && active ? "rgba(201,169,98,0.18)" : "none"}
                stroke={i === 2 ? "var(--lov-gold)" : stroke}
                strokeWidth="1"
              />
              <text x={10 + i * 15} y="13" fontSize="7" textAnchor="middle" fill={i === 2 ? "var(--lov-gold)" : stroke}>
                {label}
              </text>
            </g>
          ))}
        </svg>
      );
    case "publish":
      return (
        <svg className={styles.motif} viewBox="0 0 48 20" aria-hidden>
          <circle cx="8" cy="10" r="2" fill={fill} />
          {["QR", "Web", "API"].map((label, i) => (
            <g key={label}>
              <path d={`M10 10 Q ${20 + i * 2} ${4 + i * 6} ${30 + i * 5} ${4 + i * 6}`} fill="none" stroke={stroke} strokeWidth="1" />
              <text x={32 + i * 5} y={6 + i * 6} fontSize="5.5" fill={stroke}>
                {label}
              </text>
            </g>
          ))}
        </svg>
      );
    case "learn":
      return (
        <svg className={styles.motif} viewBox="0 0 48 20" aria-hidden>
          {[8, 14, 20, 26].map((x, i) => (
            <rect key={x} x={x} y={16 - (i + 1) * 2.8} width="3" height={(i + 1) * 2.8} fill={fill} opacity={0.4 + i * 0.15} />
          ))}
          <path d="M34 14 C40 14 44 10 46 6" fill="none" stroke={active ? "var(--lov-gold)" : stroke} strokeWidth="1" markerEnd="" />
          <circle cx="46" cy="6" r="1.8" fill={active ? "var(--lov-gold)" : fill} />
        </svg>
      );
    default:
      return (
        <svg className={styles.motif} viewBox="0 0 48 20" aria-hidden>
          <path
            d="M10 10 A12 8 0 1 1 34 10"
            fill="none"
            stroke={active ? "var(--lov-gold)" : stroke}
            strokeWidth="1.15"
            strokeLinecap="round"
          />
          <path d="M32 6l3 3-4 1" fill="none" stroke={active ? "var(--lov-gold)" : stroke} strokeWidth="1" />
          <text x="0" y="18" fontSize="5" fill={stroke}>
            Repair · Resale
          </text>
        </svg>
      );
  }
}

/**
 * Homepage lifecycle overview — all seven INTERTEXE stages around one governed record.
 * Left editorial copy; right premium SVG hub map. Not a three-bucket summary.
 */
export function LifecycleOverviewSection() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = LIFECYCLE_STAGES.find((s) => s.id === activeId) ?? null;

  return (
    <section className={styles.section} id="product-lifecycle" aria-labelledby="lifecycle-overview-heading">
      <div className={styles.shell}>
        <header className={styles.intro}>
          <div className={styles.introCopy}>
            <p className={styles.eyebrow}>Product lifecycle</p>
            <h2 id="lifecycle-overview-heading" className={styles.headline} style={SERIF}>
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

          <div className={styles.introAside}>
            <Link href="/brands/demo" className={styles.seeItLive}>
              See it live
              <span aria-hidden>→</span>
            </Link>
          </div>
        </header>

        <div className={styles.mapBlock}>
          <div
            className={styles.mapFrame}
            role="img"
            aria-label="INTERTEXE seven-stage product lifecycle around a governed product record"
          >
            <svg className={styles.mapSvg} viewBox="0 0 720 560" fill="none" aria-hidden>
              <ellipse cx={HUB.x} cy={HUB.y} rx="210" ry="158" className={styles.orbit} />
              <ellipse cx={HUB.x} cy={HUB.y} rx="140" ry="102" className={styles.orbitInner} />

              {LIFECYCLE_STAGES.map((stage) => {
                const pt = NODE_POINTS[stage.id];
                const isActive = activeId === stage.id;
                return (
                  <g key={`spoke-${stage.id}`}>
                    <line
                      x1={HUB.x}
                      y1={HUB.y}
                      x2={pt.x}
                      y2={pt.y}
                      className={isActive ? styles.spokeActive : styles.spoke}
                    />
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isActive ? 6.5 : 4.5}
                      className={isActive ? styles.nodeActive : styles.node}
                    />
                    <circle cx={pt.x} cy={pt.y} r="1.8" className={isActive ? styles.nodeCoreActive : styles.nodeCore} />
                  </g>
                );
              })}

              {/* Soft journey path through stages */}
              <path
                d={`M ${NODE_POINTS.source.x} ${NODE_POINTS.source.y}
                    Q 220 70 ${NODE_POINTS.clean.x} ${NODE_POINTS.clean.y}
                    Q 500 70 ${NODE_POINTS.trace.x} ${NODE_POINTS.trace.y}
                    Q 650 200 ${NODE_POINTS.prepare.x} ${NODE_POINTS.prepare.y}
                    Q 640 400 ${NODE_POINTS.publish.x} ${NODE_POINTS.publish.y}
                    Q 400 520 ${NODE_POINTS.learn.x} ${NODE_POINTS.learn.y}
                    Q 160 480 ${NODE_POINTS.recirculate.x} ${NODE_POINTS.recirculate.y}`}
                className={styles.journey}
              />
            </svg>

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
                  Linked
                </li>
                <li>
                  <i />
                  Verified
                </li>
                <li>
                  <i />
                  Ready
                </li>
                <li>
                  <i />
                  Published
                </li>
              </ul>
            </div>

            {LIFECYCLE_STAGES.map((stage) => {
              const isActive = activeId === stage.id;
              const pos = stage.position;
              return (
                <button
                  key={stage.id}
                  type="button"
                  className={`${styles.stage} ${isActive ? styles.stageActive : ""}`}
                  style={{
                    top: pos.top,
                    left: pos.left,
                    right: pos.right,
                    bottom: pos.bottom,
                    textAlign: pos.textAlign,
                    transform: pos.textAlign === "center" ? "translateX(-50%)" : undefined,
                  }}
                  onMouseEnter={() => setActiveId(stage.id)}
                  onMouseLeave={() => setActiveId(null)}
                  onFocus={() => setActiveId(stage.id)}
                  onBlur={() => setActiveId(null)}
                  aria-describedby={`lifecycle-stage-desc-${stage.id}`}
                >
                  <span className={styles.stageNum}>{stage.number}</span>
                  <span className={styles.stageTitle}>{stage.title}</span>
                  <span className={styles.stageSubtitle}>{stage.subtitle}</span>
                  <span className={styles.stageMotif}>
                    <StageMotif stage={stage} active={isActive} />
                  </span>
                  <span className={styles.stageChips}>
                    {stage.chips.slice(0, 3).map((chip) => (
                      <em key={chip}>{chip}</em>
                    ))}
                  </span>
                  <span id={`lifecycle-stage-desc-${stage.id}`} className={styles.srOnly}>
                    {stage.description}
                  </span>
                </button>
              );
            })}
          </div>

          <div className={styles.activePanel} aria-live="polite">
            {active ? (
              <>
                <p className={styles.activeMeta}>
                  {active.number} · {active.title}
                </p>
                <p className={styles.activeDesc}>{active.description}</p>
              </>
            ) : (
              <>
                <p className={styles.activeMeta}>Follow the record</p>
                <p className={styles.activeDesc}>
                  See how one product moves from fragmented inputs to a governed record and beyond — seven stages, one
                  system.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Mobile stacked stages — preserve all seven */}
        <ol className={styles.mobileList}>
          {LIFECYCLE_STAGES.map((stage) => (
            <li key={stage.id} className={styles.mobileItem}>
              <p className={styles.mobileNum}>{stage.number}</p>
              <div>
                <h3 className={styles.mobileTitle}>{stage.title}</h3>
                <p className={styles.mobileSubtitle}>{stage.subtitle}</p>
                <p className={styles.mobileDesc}>{stage.description}</p>
                <ul className={styles.mobileChips}>
                  {stage.chips.map((chip) => (
                    <li key={chip}>{chip}</li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export default LifecycleOverviewSection;
