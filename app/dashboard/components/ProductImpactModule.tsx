"use client";

import { useMemo, useState } from "react";
import type { ProductImpactScores } from "../../../lib/enterprise/product-impact-scores";
import {
  DEFAULT_SIMULATION_INPUTS,
  simulateProductImpactScores,
  type ImpactSimulationInputs,
} from "../../../lib/enterprise/product-impact-scores";

export function ProductImpactModule({
  scores,
  enableSimulation = true,
}: {
  scores: ProductImpactScores;
  enableSimulation?: boolean;
}) {
  const [mode, setMode] = useState<"consultation" | "simulation">("consultation");
  const [sim, setSim] = useState<ImpactSimulationInputs>(DEFAULT_SIMULATION_INPUTS);
  const active = useMemo(
    () => (mode === "simulation" ? simulateProductImpactScores(scores, sim) : scores),
    [mode, scores, sim]
  );

  return (
    <div className="ent-impact-module">
      <div className="ent-impact-module-toolbar">
        <div>
          <p className="ent-journey-eyebrow">Environmental impact</p>
          <p className="text-sm text-[var(--ent-muted)] mt-1">{active.methodology}</p>
        </div>
        {enableSimulation ? (
          <div className="ent-impact-mode-toggle" role="group" aria-label="Impact mode">
            <button
              type="button"
              className={mode === "consultation" ? "is-active" : ""}
              onClick={() => setMode("consultation")}
            >
              Consultation
            </button>
            <button
              type="button"
              className={mode === "simulation" ? "is-active" : ""}
              onClick={() => setMode("simulation")}
            >
              Simulation
            </button>
          </div>
        ) : null}
      </div>

      <div className="ent-impact-module-scores">
        <ScoreCard
          label="Climate change"
          value={`${active.climateKgCo2e} ${active.climateUnit}`}
          meta={active.methodology}
        />
        <ScoreCard
          label="PEF Single Score"
          value={`${active.pefSingleScore.toLocaleString()} ${active.pefUnit}`}
          meta={active.methodology}
        />
        <ScoreCard
          label="French Environmental Cost"
          value={`${active.frenchEnvironmentalCost.toLocaleString()} ${active.frenchUnit}`}
          meta={
            active.frenchPer100g != null ? `${active.frenchPer100g} pts / 100g` : active.methodology
          }
        />
      </div>

      <section className="ent-impact-breakdown">
        <div className="ent-impact-breakdown-head">
          <h3 className="ent-impact-breakdown-title">Impact breakdown</h3>
          <p className="text-xs text-[var(--ent-muted)]">What is driving the score</p>
        </div>
        <div className="ent-impact-stack" aria-label="Lifecycle impact breakdown">
          {active.segments.map((segment) => (
            <div
              key={segment.stage}
              className="ent-impact-stack-segment"
              style={{ width: `${segment.sharePct}%`, background: segment.color }}
              title={`${segment.label}: ${segment.sharePct}%`}
            />
          ))}
        </div>
        <ul className="ent-impact-stack-legend">
          {active.segments.map((segment) => (
            <li key={segment.stage}>
              <span className="ent-impact-stack-swatch" style={{ background: segment.color }} />
              <span>{segment.label}</span>
              <span className="ent-impact-stack-pct">{segment.sharePct}%</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="ent-impact-module-insights">
        <div>
          <p className="ent-journey-eyebrow">Largest impact driver</p>
          <p className="ent-impact-driver">
            {active.largestDriver.label}
            <span> · {active.largestDriver.sharePct}%</span>
          </p>
          <ul className="ent-impact-insight-list">
            {active.insights.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="ent-journey-eyebrow">Improvement opportunities</p>
          <ul className="ent-impact-insight-list">
            {active.recommendations.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="ent-impact-confidence">
            Confidence · {active.confidence} — {active.confidenceNote}
          </p>
        </div>
      </div>

      {enableSimulation && mode === "simulation" ? (
        <div className="ent-impact-sim">
          <p className="ent-journey-eyebrow mb-3">Test a change</p>
          <div className="ent-impact-sim-grid">
            <SimSelect
              label="Material composition"
              value={sim.materialComposition}
              onChange={(materialComposition) => setSim((s) => ({ ...s, materialComposition }))}
              options={[
                { value: "current", label: "Current composition" },
                { value: "lower_impact_fiber", label: "Lower-impact fiber" },
                { value: "recycled_blend", label: "Recycled blend" },
              ]}
            />
            <SimSelect
              label="Supplier"
              value={sim.supplier}
              onChange={(supplier) => setSim((s) => ({ ...s, supplier }))}
              options={[
                { value: "current", label: "Current supplier" },
                { value: "verified_nearshore", label: "Verified nearshore" },
                { value: "unverified", label: "Unverified alternate" },
              ]}
            />
            <SimSelect
              label="Manufacturing location"
              value={sim.manufacturingLocation}
              onChange={(manufacturingLocation) => setSim((s) => ({ ...s, manufacturingLocation }))}
              options={[
                { value: "current", label: "Current location" },
                { value: "eu", label: "EU manufacturing" },
                { value: "asia", label: "Asia manufacturing" },
              ]}
            />
            <SimSelect
              label="Transport"
              value={sim.transport}
              onChange={(transport) => setSim((s) => ({ ...s, transport }))}
              options={[
                { value: "current", label: "Current transport" },
                { value: "sea", label: "Sea freight" },
                { value: "rail", label: "Rail" },
                { value: "air", label: "Air freight" },
              ]}
            />
            <SimSelect
              label="Packaging"
              value={sim.packaging}
              onChange={(packaging) => setSim((s) => ({ ...s, packaging }))}
              options={[
                { value: "current", label: "Current packaging" },
                { value: "reduced", label: "Reduced packaging" },
                { value: "recycled", label: "Recycled packaging" },
              ]}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ScoreCard({ label, value, meta }: { label: string; value: string; meta: string }) {
  return (
    <article className="ent-impact-score-card">
      <p className="ent-impact-score-label">{label}</p>
      <p className="ent-impact-score-value">{value}</p>
      <p className="ent-impact-score-meta">{meta}</p>
    </article>
  );
}

function SimSelect<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <label className="ent-impact-sim-field">
      <span>{label}</span>
      <select className="ent-select" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
