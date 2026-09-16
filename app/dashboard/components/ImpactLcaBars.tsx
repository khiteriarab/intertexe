import type { ImpactLifecycleSegment } from "../../../lib/enterprise/product-impact-scores";

type LcaBarSegment = Pick<ImpactLifecycleSegment, "label" | "sharePct" | "color"> & {
  stage: string;
  climateKg?: number;
};

export function ImpactLcaBars({
  segments,
  unit = "kgCO₂e",
}: {
  segments: LcaBarSegment[];
  unit?: string;
}) {
  const maxShare = Math.max(...segments.map((segment) => segment.sharePct), 1);

  return (
    <ul className="ent-lca-bars" aria-label="Lifecycle impact breakdown">
      {segments.map((segment) => (
        <li key={segment.stage} className="ent-lca-row">
          <span className="ent-lca-label">{segment.label}</span>
          <span className="ent-lca-track">
            <span
              className="ent-lca-fill"
              style={{ width: `${(segment.sharePct / maxShare) * 100}%`, background: segment.color }}
            />
          </span>
          <span className="ent-lca-value">
            <strong>{segment.sharePct}%</strong>
            {segment.climateKg != null && unit !== "share" ? (
              <span>
                {segment.climateKg} {unit}
              </span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
