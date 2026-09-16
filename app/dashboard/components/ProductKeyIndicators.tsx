import type { ProductKeyIndicator } from "../../../lib/enterprise/product-key-indicators";

export function ProductKeyIndicators({ indicators }: { indicators: ProductKeyIndicator[] }) {
  return (
    <section className="ent-key-indicators" aria-label="Key indicators">
      <h3 className="ent-key-indicators-title">Key indicators</h3>
      <ul className="ent-key-indicators-grid">
        {indicators.map((indicator) => (
          <li key={indicator.key} className="ent-key-indicator">
            <p className="ent-key-indicator-label" title={indicator.detail || undefined}>
              {indicator.label}
            </p>
            <p className="ent-key-indicator-score">
              <span className="ent-key-indicator-value">{indicator.value}</span>
              <span className="ent-key-indicator-max">/{indicator.max}</span>
            </p>
            <div className="ent-key-indicator-dots" aria-hidden>
              {Array.from({ length: indicator.max }).map((_, index) => (
                <span
                  key={index}
                  className={`ent-key-indicator-dot ${index < indicator.value ? "is-filled" : ""}`}
                />
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
