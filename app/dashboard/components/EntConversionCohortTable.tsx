import type { ConversionCohortBundle } from "../../../lib/enterprise/conversion-cohorts";
import { EntVisualPanel } from "./EnterpriseModuleUi";

function formatIndex(index: number | null): string {
  if (index == null) return "—";
  return `${index > 0 ? "+" : ""}${index}`;
}

export function EntConversionCohortTable({ bundle }: { bundle: ConversionCohortBundle }) {
  const governedRows = bundle.rows.filter((row) => row.status === "ok");

  return (
    <EntVisualPanel
      tone="petrol"
      title="Conversion by material cohort"
      subtitle={`${bundle.segmentLabel} · ${bundle.marketLabel} · governed consumer signals`}
    >
      <ul className="space-y-0 divide-y divide-[var(--ent-line)]">
        {bundle.rows.map((row) => (
          <li key={row.cohortKey} className="py-4 first:pt-0 last:pb-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-[var(--ent-ink)]">{row.label}</p>
                <p className="text-xs text-[var(--ent-muted)] mt-1 leading-relaxed">{row.signal}</p>
                {row.sampleSize != null ? (
                  <p className="text-[11px] text-[var(--ent-muted-light)] mt-1">n={row.sampleSize.toLocaleString()}</p>
                ) : null}
              </div>
              <span
                className={`ent-display text-xl tabular-nums shrink-0 ${
                  row.tone === "up"
                    ? "text-[var(--ent-forest)]"
                    : row.tone === "down"
                      ? "text-[var(--ent-raspberry)]"
                      : "text-[var(--ent-muted-light)]"
                }`}
              >
                {formatIndex(row.index)}
              </span>
            </div>
          </li>
        ))}
      </ul>
      {governedRows.length === 0 ? (
        <p className="text-xs text-[var(--ent-muted-light)] mt-4 leading-relaxed">
          Conversion cohorts appear when approved aggregates meet the minimum sample threshold for this segment and
          market.
        </p>
      ) : null}
      {bundle.methodology ? (
        <p className="text-[11px] text-[var(--ent-muted-light)] mt-4">Methodology: {bundle.methodology}</p>
      ) : null}
    </EntVisualPanel>
  );
}
