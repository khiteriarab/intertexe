import type { PlatformOverview } from "../../../lib/enterprise/platform-overview";

export function PlatformOperatingModel({ model }: { model: PlatformOverview["operatingModel"] }) {
  return (
    <div className="ent-operating-model">
      <p className="ent-journey-eyebrow mb-3">Operating model</p>
      <ol className="ent-operating-stages">
        {model.map((stage, index) => (
          <li key={stage.stage} className={`ent-operating-stage ent-operating-stage--${stage.status}`}>
            {index > 0 ? <span className="ent-operating-arrow" aria-hidden>→</span> : null}
            <span className="ent-operating-label">{stage.label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
