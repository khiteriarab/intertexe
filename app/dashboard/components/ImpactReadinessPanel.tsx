import type { ImpactReadinessReport } from "../../../lib/enterprise/impact-readiness";

const STATUS_CLASS: Record<string, string> = {
  verified: "ent-impact-verified",
  declared: "ent-impact-declared",
  estimated: "ent-impact-estimated",
  missing: "ent-impact-missing",
  not_applicable: "ent-impact-na",
};

export function ImpactReadinessPanel({ report }: { report: ImpactReadinessReport }) {
  return (
    <div className="ent-impact-panel">
      <div className="ent-impact-header">
        <div>
          <p className="ent-journey-eyebrow">Impact readiness · LCA readiness</p>
          <p className={`ent-impact-level ent-impact-level--${report.level}`}>{report.level}</p>
          <p className="text-sm text-[var(--ent-muted)] mt-2 max-w-xl">{report.summary}</p>
        </div>
        <p className="text-xs text-[var(--ent-muted-light)] max-w-xs">{report.disclaimer}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mt-6">
        <div>
          <p className="ent-section-eyebrow mb-3">Prerequisites</p>
          <ul className="space-y-2">
            {report.prerequisites.map((item) => (
              <li key={item.label} className="ent-impact-prereq">
                <span className={item.met ? "text-[var(--ent-forest)]" : "text-[var(--ent-muted-light)]"}>
                  {item.met ? "✓" : "○"}
                </span>
                <span>
                  <span className="font-medium text-[var(--ent-ink-soft)]">{item.label}</span>
                  <span className="block text-xs text-[var(--ent-muted)]">{item.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="ent-section-eyebrow mb-3">Impact inputs</p>
          <ul className="space-y-2">
            {report.inputs.map((input) => (
              <li key={input.metricKey} className="ent-impact-metric">
                <div className="flex justify-between gap-3">
                  <span className="text-sm text-[var(--ent-ink-soft)]">{input.metricLabel}</span>
                  <span className={`text-[11px] uppercase tracking-wide ${STATUS_CLASS[input.dataStatus] || ""}`}>
                    {input.dataStatus.replaceAll("_", " ")}
                  </span>
                </div>
                {input.value != null ? (
                  <p className="text-sm text-[var(--ent-ink)] mt-1">
                    {input.value} {input.unit}
                  </p>
                ) : (
                  <p className="text-xs text-[var(--ent-muted-light)] mt-1">No value recorded</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
