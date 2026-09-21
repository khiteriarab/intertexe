"use client";

import type { LifecycleVisualType } from "./lifecycle-data";

export function LifecycleMicroVisual({ type, active }: { type: LifecycleVisualType; active: boolean }) {
  return (
    <div className={`plc-micro plc-micro--${type}${active ? " is-active" : ""}`} aria-hidden>
      {type === "converge" ? (
        <>
          <span className="plc-micro-chip">Materials</span>
          <span className="plc-micro-chip">Suppliers</span>
          <span className="plc-micro-chip">Make</span>
          <span className="plc-micro-line" />
          <span className="plc-micro-record">
            <em>TX</em> Record
          </span>
        </>
      ) : null}

      {type === "normalize" ? (
        <>
          <span className="plc-micro-messy">PLM · ERP · sheet</span>
          <span className="plc-micro-arrow">→</span>
          <span className="plc-micro-record">
            <em>TX</em> Master
          </span>
        </>
      ) : null}

      {type === "trace" ? (
        <>
          <span className="plc-micro-node">Supplier</span>
          <span className="plc-micro-node is-ready">Evidence</span>
          <span className="plc-micro-node">Mill</span>
          <span className="plc-micro-hub">Provenance</span>
        </>
      ) : null}

      {type === "checklist" ? (
        <ul className="plc-micro-checks">
          <li className="is-ready">ESPR</li>
          <li className="is-ready">Composition</li>
          <li className="is-warn">Evidence</li>
          <li className="is-ready">DPP</li>
        </ul>
      ) : null}

      {type === "publish" ? (
        <>
          <span className="plc-micro-record">Record</span>
          <span className="plc-micro-arrow">→</span>
          <span className="plc-micro-passport">
            Passport
            <span>QR · Web · API</span>
          </span>
        </>
      ) : null}

      {type === "signals" ? (
        <>
          <span className="plc-micro-passport is-compact">Passport</span>
          <span className="plc-micro-chip is-soft">Analytics</span>
          <span className="plc-micro-chip is-soft">Benchmark</span>
        </>
      ) : null}

      {type === "loop" ? (
        <div className="plc-micro-loop">
          {["Care", "Repair", "Resale", "Reuse", "EOL"].map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
