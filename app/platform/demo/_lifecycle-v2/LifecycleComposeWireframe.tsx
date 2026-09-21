"use client";

import { SERIF } from "../../platform-ui";
import "./lifecycle-wireframe.css";

/** Static design wireframe — proportions + typography only. Not production. */
export function LifecycleComposeWireframe() {
  return (
    <div className="lcv2-wire">
      <p className="lcv2-wire-banner">
        Wireframe review · /platform/demo/lifecycle-wireframe · not live · production untouched
      </p>

      <div className="lcv2-wire-wrap">
        <header>
          <p className="lcv2-wire-eyebrow">Product lifecycle</p>
          <h1 className="lcv2-wire-headline" style={SERIF}>
            From material to next life.
          </h1>
          <p className="lcv2-wire-lede">
            INTERTEXE connects the information behind a product from sourcing and manufacturing through product
            data, traceability, compliance and Digital Product Passports, then keeps that record useful through
            use, repair, resale and end-of-life.
          </p>
        </header>

        {/* 1320 × 660 map canvas */}
        <div className="lcv2-wire-canvas" aria-label="Lifecycle map composition wireframe">
          <svg className="lcv2-wire-svg" viewBox="0 0 1320 660" aria-hidden>
            {/* Route — horseshoe open loop */}
            <path
              className="lcv2-wire-path-base"
              d="M 160 128 C 280 90, 380 90, 470 92 C 620 95, 860 100, 980 138 C 1080 170, 1160 230, 1140 310 C 1120 400, 1080 480, 980 530 C 820 580, 640 585, 520 568 C 360 545, 250 510, 190 470"
            />
            <path
              className="lcv2-wire-path-active"
              pathLength={1}
              d="M 160 128 C 280 90, 380 90, 470 92 C 620 95, 860 100, 980 138 C 1080 170, 1160 230, 1140 310 C 1120 400, 1080 480, 980 530 C 820 580, 640 585, 520 568 C 360 545, 250 510, 190 470"
            />
            {/* Continuation stub into bridge */}
            <path className="lcv2-wire-stub" d="M 190 470 C 280 520, 520 620, 660 640 L 660 660" />

            {/* Micro-signals (stage 03 Trace & Prove — sample active) */}
            <g className="lcv2-wire-micro">
              <circle cx="560" cy="210" r="3.5" fill="#c4a574" stroke="none" />
              <circle cx="780" cy="200" r="3.5" fill="#c4a574" stroke="none" />
              <circle cx="820" cy="360" r="3.5" fill="#c4a574" stroke="none" />
              <path d="M 560 210 L 620 260" />
              <path d="M 780 200 L 720 255" />
              <path d="M 820 360 L 740 330" />
              <text className="lcv2-wire-micro-label" x="530" y="198">
                Evidence
              </text>
              <text className="lcv2-wire-micro-label" x="792" y="190">
                Custody
              </text>
            </g>

            {/* Anchors */}
            {[
              [160, 128, true],
              [470, 92, true],
              [980, 138, true],
              [1140, 310, false],
              [980, 530, false],
              [520, 568, false],
              [190, 470, false],
            ].map(([x, y, lit], i) => (
              <circle
                key={i}
                className={`lcv2-wire-anchor${lit ? " is-lit" : ""}`}
                cx={x as number}
                cy={y as number}
                r={lit && i === 2 ? 5.5 : 3.5}
              />
            ))}
          </svg>

          {/* Stage labels */}
          <div
            className="lcv2-wire-label"
            style={{ left: "12.1%", top: "19.4%", transform: "translate(-50%, calc(-100% - 1.1rem))" }}
          >
            <span className="lcv2-wire-label-num">01</span>
            <span className="lcv2-wire-label-title" style={SERIF}>
              Source & Make
            </span>
            <span className="lcv2-wire-label-desc">Materials · suppliers · make</span>
          </div>
          <div
            className="lcv2-wire-label"
            style={{ left: "35.6%", top: "13.9%", transform: "translate(-50%, calc(-100% - 1.1rem))" }}
          >
            <span className="lcv2-wire-label-num">02</span>
            <span className="lcv2-wire-label-title" style={SERIF}>
              Clean & Connect
            </span>
            <span className="lcv2-wire-label-desc">One trusted record</span>
          </div>
          <div
            className="lcv2-wire-label"
            style={{ left: "74.2%", top: "20.9%", transform: "translate(-50%, calc(-100% - 1.1rem))" }}
          >
            <span className="lcv2-wire-label-num">03</span>
            <span className="lcv2-wire-label-title" style={SERIF}>
              Trace & Prove
            </span>
            <span className="lcv2-wire-label-desc">Claims linked to evidence</span>
          </div>
          <div
            className="lcv2-wire-label"
            style={{ left: "86.4%", top: "47%", transform: "translate(1.5rem, -50%)", textAlign: "left" }}
          >
            <span className="lcv2-wire-label-num">04</span>
            <span className="lcv2-wire-label-title" style={SERIF}>
              Check & Prepare
            </span>
            <span className="lcv2-wire-label-desc">Ready for DPP</span>
          </div>
          <div
            className="lcv2-wire-label"
            style={{ left: "74.2%", top: "80.3%", transform: "translate(-50%, 1.1rem)" }}
          >
            <span className="lcv2-wire-label-num">05</span>
            <span className="lcv2-wire-label-title" style={SERIF}>
              Passport & Publish
            </span>
            <span className="lcv2-wire-label-desc">Governed identity published</span>
          </div>
          <div
            className="lcv2-wire-label"
            style={{ left: "39.4%", top: "86.1%", transform: "translate(-50%, 1.1rem)" }}
          >
            <span className="lcv2-wire-label-num">06</span>
            <span className="lcv2-wire-label-title" style={SERIF}>
              Use & Learn
            </span>
            <span className="lcv2-wire-label-desc">Intelligence from use</span>
          </div>
          <div
            className="lcv2-wire-label"
            style={{ left: "14.4%", top: "71.2%", transform: "translate(-50%, 1.1rem)" }}
          >
            <span className="lcv2-wire-label-num">07</span>
            <span className="lcv2-wire-label-title" style={SERIF}>
              Repair & Recirculate
            </span>
            <span className="lcv2-wire-label-desc">Beyond first sale</span>
          </div>

          {/* Central product record */}
          <aside className="lcv2-wire-record" aria-label="Persistent product record">
            <p className="lcv2-wire-record-mark">TX · Product record</p>
            <div className="lcv2-wire-record-sil">Silhouette</div>
            <h2 className="lcv2-wire-record-title" style={SERIF}>
              Silk Midi Skirt
            </h2>
            <p className="lcv2-wire-record-meta">ITX-4102 · 96% Silk · 4% Elastane</p>
            <p className="lcv2-wire-record-meta">Italy · Supplier evidence linked</p>
          </aside>
        </div>

        {/* Single detail region */}
        <div className="lcv2-wire-detail">
          <p className="lcv2-wire-detail-kicker">03</p>
          <h2 className="lcv2-wire-detail-title" style={SERIF}>
            Trace & Prove
          </h2>
          <p className="lcv2-wire-detail-copy">
            Connect product and material claims to evidence across the supply chain.
          </p>
          <ul className="lcv2-wire-terms">
            <li>Traceability</li>
            <li>Chain of Custody</li>
            <li>Provenance</li>
            <li>Supplier Evidence</li>
          </ul>
        </div>

        {/* Bridge */}
        <section className="lcv2-wire-bridge" aria-label="Map to software bridge">
          <div className="lcv2-wire-bridge-line" aria-hidden />
          <div className="lcv2-wire-bridge-copy">
            <p className="lcv2-wire-eyebrow">Follow the record</p>
            <h2 className="lcv2-wire-follow-h" style={SERIF}>
              Now see how one product moves through INTERTEXE.
            </h2>
          </div>
          <div className="lcv2-wire-bridge-frames">
            <div className="lcv2-wire-bridge-card">
              <p>Abstract record (from map)</p>
              <div className="lcv2-wire-bridge-ghost">
                Silk Midi Skirt
                <br />
                scales + descends
              </div>
            </div>
            <div className="lcv2-wire-bridge-card">
              <p>Real software frame</p>
              <div className="lcv2-wire-bridge-ghost" style={{ padding: 0, overflow: "hidden" }}>
                <img src="/platform/demo-source.png" alt="" />
              </div>
            </div>
          </div>
        </section>

        {/* Walkthrough skeleton */}
        <section className="lcv2-wire-follow" aria-label="Software walkthrough skeleton">
          <header className="lcv2-wire-follow-intro">
            <p className="lcv2-wire-eyebrow">Follow the record</p>
            <h2 className="lcv2-wire-follow-h" style={SERIF}>
              See the record evolve.
            </h2>
            <p className="lcv2-wire-lede" style={{ marginBottom: 0 }}>
              Follow one product from fragmented source data to a governed record, live Digital Product Passport,
              and measurable product intelligence.
            </p>
          </header>

          <div className="lcv2-wire-follow-grid">
            <nav className="lcv2-wire-rail" aria-label="Software stages">
              <ol>
                {[
                  ["01", "Source"],
                  ["02", "Normalize"],
                  ["03", "Validate"],
                  ["04", "Publish"],
                  ["05", "Activate"],
                  ["06", "Measure"],
                ].map(([num, title], i) => (
                  <li key={num} className={i === 0 ? "is-active" : undefined}>
                    <span className="lcv2-wire-rail-num">{num}</span>
                    <span className="lcv2-wire-rail-title">{title}</span>
                  </li>
                ))}
              </ol>
            </nav>

            <div className="lcv2-wire-stage">
              <img src="/platform/demo-source.png" alt="Source stage screenshot" />
              <span className="lcv2-wire-stage-cap">Sticky frame · 16:10 · real screenshot</span>
            </div>
          </div>

          <aside className="lcv2-wire-notes">
            <strong>Wireframe notes.</strong> Dashed border = map canvas bounds (1320×660). Gold dashed stub =
            continuation into the walkthrough rail. Central object is the persistent Silk Midi Skirt record — not a
            dashboard. Full motion, micro-signals per stage, and scroll bridge are specified in{" "}
            <code>docs/demo-lifecycle-compose-spec.md</code>. Production map/walkthrough are untouched until this
            composition is approved.
          </aside>
        </section>
      </div>
    </div>
  );
}
