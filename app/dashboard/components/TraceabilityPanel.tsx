import type { ProductTraceability } from "../../../lib/enterprise/traceability";

export function TraceabilityPanel({ traceability }: { traceability: ProductTraceability }) {
  return (
    <div className="ent-trace-panel">
      <div className="ent-trace-summary">
        <div>
          <p className="ent-journey-eyebrow">Traceability completeness</p>
          <p className="ent-trace-pct">{traceability.completenessPct}%</p>
          <p className="text-sm text-[var(--ent-muted)] mt-1">
            {traceability.knownTierCount} of 4 tiers known
          </p>
        </div>
        {traceability.warnings.length ? (
          <ul className="ent-trace-warnings">
            {traceability.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="ent-trace-flow">
        {traceability.tiers.map((tier, index) => (
          <div key={tier.tier} className="ent-trace-tier">
            {index > 0 ? <div className="ent-trace-connector" aria-hidden /> : null}
            <div className={`ent-trace-node ent-trace-node--${tier.status}`}>
              <p className="ent-trace-tier-label">{tier.label}</p>
              <p className="ent-trace-tier-role">{tier.role}</p>
              {tier.status === "known" ? (
                <>
                  {tier.country ? <p className="ent-trace-tier-meta">{tier.country}</p> : null}
                  {tier.facility ? <p className="ent-trace-tier-meta">{tier.facility}</p> : null}
                  {tier.supplierName ? <p className="ent-trace-tier-meta">{tier.supplierName}</p> : null}
                  {tier.evidenceStatus ? (
                    <p className="ent-trace-tier-evidence">Evidence · {tier.evidenceStatus}</p>
                  ) : null}
                </>
              ) : (
                <p className="ent-trace-tier-missing">
                  {tier.status === "unknown" ? "Unknown" : "Not provided"}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
