"use client";

import { SERIF } from "../../platform-ui";
import "./lifecycle-wireframe.css";

const STAGES = [
  { n: "01", t: "Source & Make", d: "Materials · Suppliers · Manufacturing", x: 9.3, y: 26.9, side: "above", on: true },
  { n: "02", t: "Clean & Connect", d: "One trusted product record", x: 31.4, y: 26.9, side: "above", on: true },
  { n: "03", t: "Trace & Prove", d: "Claims linked to evidence", x: 53.4, y: 26.9, side: "above", on: true },
  { n: "04", t: "Check & Prepare", d: "Compliance and DPP readiness", x: 78.0, y: 26.9, side: "above", on: false },
  { n: "05", t: "Passport & Publish", d: "Governed identity distributed", x: 78.0, y: 74.1, side: "below", on: false },
  { n: "06", t: "Use & Learn", d: "Intelligence from every channel", x: 45.8, y: 74.1, side: "below", on: false },
  { n: "07", t: "Repair & Recirculate", d: "Beyond the first sale", x: 15.3, y: 74.1, side: "below", on: false },
] as const;

/**
 * Design wireframe only — three moments.
 * Not production. No morph. No central record card.
 */
export function LifecycleComposeWireframe() {
  return (
    <div className="lcv2-wire">
      <p className="lcv2-banner">
        Wireframe v2 · serpentine atlas · compact bridge · sticky walkthrough · production untouched · Motion:
        framer-motion
      </p>

      <div className="lcv2-wrap">
        {/* ═══════════════ A. MAP ═══════════════ */}
        <p className="lcv2-section-tag">A · Lifecycle map · 1180×540</p>
        <header>
          <p className="lcv2-eyebrow">Product lifecycle</p>
          <h1 className="lcv2-h1" style={SERIF}>
            From material to next life.
          </h1>
          <p className="lcv2-lede">
            INTERTEXE connects the information behind a product from sourcing and manufacturing through product
            data, traceability, compliance and Digital Product Passports, then keeps that record useful through
            use, repair, resale and end-of-life.
          </p>
        </header>

        <div className="lcv2-map" aria-label="Process atlas wireframe">
          <svg className="lcv2-map-svg" viewBox="0 0 1180 540" aria-hidden>
            {/* Serpentine: L→R top, down, R→L bottom */}
            <path
              className="lcv2-path-base"
              d="M 110 145 L 370 145 L 630 145 L 920 145 L 920 400 L 540 400 L 180 400
                 C 120 400, 95 370, 115 340 C 135 310, 175 320, 180 360"
            />
            <path
              className="lcv2-path-active"
              d="M 110 145 L 370 145 L 630 145"
              pathLength={1}
            />
            {/* Exit stub toward transition (continues below canvas) */}
            <path className="lcv2-path-exit" d="M 180 400 L 180 520 L 180 540" />

            {/* 01 micro: converging strands */}
            <g className="lcv2-micro">
              <path d="M 55 95 L 110 145" />
              <path d="M 70 70 L 110 145" />
              <path d="M 40 120 L 110 145" />
              <text className="lcv2-micro-t" x="28" y="68">
                Materials
              </text>
              <text className="lcv2-micro-t" x="8" y="118">
                Suppliers
              </text>
              <text className="lcv2-micro-t" x="22" y="148">
                Manufacturing
              </text>
            </g>

            {/* 02 micro: irregular → aligned */}
            <g className="lcv2-micro">
              <path d="M 330 118 L 350 128" />
              <path d="M 338 112 L 355 126" />
              <path d="M 325 130 L 348 133" />
              <path d="M 390 118 L 410 118" />
              <path d="M 390 124 L 410 124" />
              <path d="M 390 130 L 410 130" />
              <path d="M 390 136 L 410 136" />
            </g>

            {/* 03 micro: evidence nodes */}
            <g className="lcv2-micro">
              <circle cx="600" cy="105" r="3" fill="#c4a574" stroke="none" />
              <circle cx="645" cy="98" r="3" fill="#c4a574" stroke="none" />
              <circle cx="670" cy="112" r="3" fill="#c4a574" stroke="none" />
              <path d="M 600 105 L 630 145" />
              <path d="M 645 98 L 630 145" />
              <path d="M 670 112 L 630 145" />
            </g>

            {/* 04 micro: status ticks */}
            <g className="lcv2-micro">
              <path d="M 945 130 L 955 140 L 970 120" />
              <path d="M 945 155 L 955 165" opacity="0.35" />
              <path d="M 945 175 L 955 185 L 968 168" />
            </g>

            {/* 05 micro: branch outputs */}
            <g className="lcv2-micro">
              <path d="M 920 400 L 960 360" />
              <path d="M 920 400 L 980 390" />
              <path d="M 920 400 L 975 430" />
              <path d="M 920 400 L 955 455" />
              <text className="lcv2-micro-t" x="962" y="355">
                QR
              </text>
              <text className="lcv2-micro-t" x="984" y="388">
                WEB
              </text>
              <text className="lcv2-micro-t" x="978" y="438">
                API
              </text>
              <text className="lcv2-micro-t" x="958" y="470">
                RETAIL
              </text>
            </g>

            {/* 06 micro: inbound signals */}
            <g className="lcv2-micro">
              <circle cx="500" cy="360" r="2.2" fill="#c4a574" stroke="none" />
              <circle cx="560" cy="350" r="2.2" fill="#c4a574" stroke="none" />
              <circle cx="585" cy="375" r="2.2" fill="#c4a574" stroke="none" />
              <path d="M 500 360 L 540 400" />
              <path d="M 560 350 L 540 400" />
              <path d="M 585 375 L 540 400" />
            </g>

            {/* 07 micro: end-loop labels */}
            <g className="lcv2-micro">
              <text className="lcv2-micro-t" x="70" y="330">
                Repair
              </text>
              <text className="lcv2-micro-t" x="55" y="360">
                Resale
              </text>
              <text className="lcv2-micro-t" x="85" y="390">
                Reuse
              </text>
            </g>

            {[
              [110, 145, true],
              [370, 145, true],
              [630, 145, true],
              [920, 145, false],
              [920, 400, false],
              [540, 400, false],
              [180, 400, false],
            ].map(([x, y, on], i) => (
              <circle
                key={i}
                className={`lcv2-anchor${on ? " is-on" : ""}`}
                cx={x as number}
                cy={y as number}
                r={on && i === 2 ? 5 : 3.5}
              />
            ))}
          </svg>

          {STAGES.map((s) => (
            <div
              key={s.n}
              className={`lcv2-lab lcv2-lab--${s.side}${s.on ? " is-on" : ""}`}
              style={{ left: `${s.x}%`, top: `${s.y}%` }}
            >
              <span className="lcv2-lab-n">{s.n}</span>
              <span className="lcv2-lab-t" style={SERIF}>
                {s.t}
              </span>
              <span className="lcv2-lab-d">{s.d}</span>
            </div>
          ))}

          <span className="lcv2-map-dims">1180 × 540 · L→R · down · R→L</span>
        </div>

        {/* ═══════════════ B. TRANSITION ═══════════════ */}
        <div style={{ maxWidth: 1180, margin: "0 auto", paddingTop: "0.75rem" }}>
          <p className="lcv2-section-tag">B · Transition · ~260px · no cards · no morph</p>
        </div>

        <div className="lcv2-bridge" aria-label="Map to walkthrough transition">
          <div className="lcv2-bridge-rail" aria-hidden />
          <div className="lcv2-bridge-copy">
            <p className="lcv2-eyebrow">Follow the record</p>
            <h2 className="lcv2-bridge-h" style={SERIF}>
              See the record evolve.
            </h2>
            <p className="lcv2-bridge-p">
              Follow one product from fragmented source data to a governed record, live Digital Product Passport and
              measurable product intelligence.
            </p>
          </div>
          <p className="lcv2-bridge-note">
            Same gold line continues from map exit (stage 07) → mid marker → left walkthrough rail. No screenshot
            here. No abstract/real comparison.
          </p>
        </div>

        {/* ═══════════════ C. WALKTHROUGH ═══════════════ */}
        <div className="lcv2-walk">
          <p className="lcv2-section-tag">C · Walkthrough · 280px rail + sticky 16:10 · NORMALIZE example</p>

          <div className="lcv2-walk-grid">
            <nav className="lcv2-walk-rail" aria-label="Software stages">
              <ol>
                {[
                  ["01", "Source", false],
                  ["02", "Normalize", true],
                  ["03", "Validate", false],
                  ["04", "Publish", false],
                  ["05", "Activate", false],
                  ["06", "Measure", false],
                ].map(([n, t, on]) => (
                  <li key={n as string} className={on ? "is-on" : undefined}>
                    <span className="lcv2-walk-n">{n}</span>
                    <span className="lcv2-walk-t">{t}</span>
                  </li>
                ))}
              </ol>
            </nav>

            <div className="lcv2-stage" aria-label="Normalize stage presentation example">
              <div className="lcv2-stage-inner">
                <img src="/platform/demo-normalize.png" alt="Normalize screenshot focus example" />
              </div>
              <div className="lcv2-highlight" aria-hidden />
              <div className="lcv2-cursor" aria-hidden />
              <div className="lcv2-anno">Normalized value</div>
              <span className="lcv2-stage-meta">Sticky · top nav+32 · transform focus · 1 cursor</span>
            </div>
          </div>
        </div>

        <pre className="lcv2-ascii">{`PAGE RHYTHM
────────────────────────────
FROM MATERIAL TO NEXT LIFE
[ process atlas 1180×540 ]
  01──02──03──04
               │
  07──06──05───┘  (+ end-loop)
               │
               ●  FOLLOW THE RECORD
               │  See the record evolve.
               │
  01 Source    │  ┌─────────────────────────┐
  02 Normalize │  │  sticky real screenshot │
  03 Validate  │  │  FIXED FRAME 16:10      │
  04 Publish   │  └─────────────────────────┘
  05 Activate  │
  06 Measure   │

Motion: import from "framer-motion" (not motion/react)
Rejected: oval · central card · morph · dual preview · full-bleed bridge`}</pre>
      </div>
    </div>
  );
}
