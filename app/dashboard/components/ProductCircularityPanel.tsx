import type { ProductJourney } from "../../../lib/enterprise/product-journey";

export function ProductCircularityPanel({
  journey,
  composition,
  resaleReady,
}: {
  journey: ProductJourney;
  composition: string | null;
  resaleReady: string;
}) {
  const nextLife = journey.nodes.filter((node) =>
    /own|resale|next|end|circular/i.test(`${node.stage} ${node.label} ${node.id}`)
  );
  const rows = nextLife.length ? nextLife : journey.nodes.slice(-3);

  return (
    <section className="ent-circularity-panel">
      <div className="ent-product-metric-rail">
        <div>
          <p className="ent-product-metric-label">Resale readiness</p>
          <p className="ent-product-metric-value">{resaleReady}</p>
        </div>
        <div>
          <p className="ent-product-metric-label">Material</p>
          <p className="ent-product-metric-value ent-product-metric-value--text">
            {composition || "Not recorded"}
          </p>
        </div>
        <div>
          <p className="ent-product-metric-label">Passport</p>
          <p className="ent-product-metric-value ent-product-metric-value--text">
            {journey.isPublished ? "Live" : "Not published"}
          </p>
        </div>
      </div>
      <ol className="ent-circularity-steps">
        {rows.map((node) => (
          <li key={node.id} className={`ent-circularity-step ent-circularity-step--${node.status}`}>
            <p className="ent-circularity-step-stage">{node.stage}</p>
            <p className="ent-circularity-step-label">{node.label}</p>
            <p className="ent-circularity-step-detail">{node.detail}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
