import type { ProductGovernanceScore } from "../../../lib/enterprise/governance-score";

export function GovernanceScorePanel({ score }: { score: ProductGovernanceScore }) {
  return (
    <div className="ent-governance-panel">
      <p className="ent-journey-eyebrow mb-4">Data governance · transparent dimensions</p>
      <ul className="ent-governance-grid">
        {score.dimensions.map((dim) => (
          <li key={dim.key} className={`ent-governance-dim ent-governance-dim--${dim.status}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-[var(--ent-ink-soft)]">{dim.label}</span>
              <span className="text-sm tabular-nums text-[var(--ent-ink)]">
                {dim.score != null ? `${dim.score}%` : "—"}
              </span>
            </div>
            <div className="ent-governance-bar mt-2" aria-hidden>
              <span style={{ width: `${dim.score ?? 0}%` }} />
            </div>
            <p className="text-xs text-[var(--ent-muted)] mt-2">{dim.detail}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
