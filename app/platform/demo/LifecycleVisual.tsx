"use client";

import type { LifecycleStageId } from "./lifecycle-data";

function MiniCard({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "source" | "ready" | "warn" | "accent";
}) {
  return <div className={`plc-ui-card plc-ui-card--${tone}`}>{label}</div>;
}

function RecordCard({ title = "Product record", subtitle }: { title?: string; subtitle?: string }) {
  return (
    <div className="plc-ui-record">
      <span className="plc-ui-mark" aria-hidden>
        TX
      </span>
      <div>
        <p className="plc-ui-record-title">{title}</p>
        {subtitle ? <p className="plc-ui-record-sub">{subtitle}</p> : null}
      </div>
    </div>
  );
}

export function LifecycleVisual({ stageId, active }: { stageId: LifecycleStageId; active: boolean }) {
  return (
    <div className={`plc-visual${active ? " is-active" : ""}`} data-stage={stageId} aria-hidden={!active}>
      {stageId === "source-make" ? (
        <div className="plc-visual-scene plc-visual-converge">
          <div className="plc-visual-inputs">
            <MiniCard label="Raw materials" tone="source" />
            <MiniCard label="Suppliers" tone="source" />
            <MiniCard label="Manufacturing" tone="source" />
          </div>
          <div className="plc-visual-lines" />
          <RecordCard title="Product record" subtitle="New identity" />
        </div>
      ) : null}

      {stageId === "clean-connect" ? (
        <div className="plc-visual-scene plc-visual-normalize">
          <div className="plc-visual-messy">
            <span>PLM · silk 100%</span>
            <span>ERP · SKU?</span>
            <span>sheet · fiber mix</span>
          </div>
          <div className="plc-visual-arrow">→</div>
          <RecordCard title="Governed record" subtitle="Normalized · linked" />
        </div>
      ) : null}

      {stageId === "trace-prove" ? (
        <div className="plc-visual-scene plc-visual-graph">
          <div className="plc-visual-nodes">
            <MiniCard label="Supplier A" />
            <MiniCard label="Evidence" tone="ready" />
            <MiniCard label="Mill B" />
          </div>
          <div className="plc-visual-hub">
            <RecordCard title="Provenance" subtitle="Claims ↔ evidence" />
          </div>
        </div>
      ) : null}

      {stageId === "check-prepare" ? (
        <div className="plc-visual-scene plc-visual-checklist">
          <ul>
            <li className="is-ready">ESPR fields</li>
            <li className="is-ready">Composition validated</li>
            <li className="is-warn">Evidence gap</li>
            <li className="is-ready">DPP readiness</li>
          </ul>
        </div>
      ) : null}

      {stageId === "passport-publish" ? (
        <div className="plc-visual-scene plc-visual-publish">
          <RecordCard title="Verified record" />
          <div className="plc-visual-arrow">→</div>
          <div className="plc-ui-passport">
            <p>Digital Product Passport</p>
            <div className="plc-visual-channels">
              <span>QR</span>
              <span>Web</span>
              <span>API</span>
            </div>
          </div>
        </div>
      ) : null}

      {stageId === "use-learn" ? (
        <div className="plc-visual-scene plc-visual-signals">
          <div className="plc-ui-passport plc-ui-passport--compact">
            <p>Live passport</p>
          </div>
          <div className="plc-visual-signal-list">
            <MiniCard label="Engagement" tone="accent" />
            <MiniCard label="Benchmark" tone="accent" />
            <MiniCard label="Supplier score" tone="accent" />
          </div>
        </div>
      ) : null}

      {stageId === "repair-recirculate" ? (
        <div className="plc-visual-scene plc-visual-loop">
          {["Care", "Repair", "Resale", "Reuse", "End of life"].map((label) => (
            <span key={label} className="plc-loop-node">
              {label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
