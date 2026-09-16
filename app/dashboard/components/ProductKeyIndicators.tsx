import type { ProductKeyIndicator } from "../../../lib/enterprise/product-key-indicators";

export function ProductKeyIndicators({ indicators }: { indicators: ProductKeyIndicator[] }) {
  return (
    <section className="ent-key-indicators" aria-label="Key indicators">
      <h3 className="ent-key-indicators-title">Key indicators</h3>
      <ul className="ent-key-indicators-grid">
        {indicators.map((indicator) => (
          <li key={indicator.key} className="ent-key-indicator">
            <div className="ent-key-indicator-head">
              <span className="ent-key-indicator-label">{indicator.label}</span>
              <span className="ent-key-indicator-score">
                {indicator.value} / {indicator.max}
              </span>
            </div>
            <div className="ent-key-indicator-dots" aria-hidden>
              {Array.from({ length: indicator.max }).map((_, index) => (
                <span
                  key={index}
                  className={`ent-key-indicator-dot ${index < indicator.value ? "is-filled" : ""}`}
                />
              ))}
            </div>
            {indicator.detail ? <p className="ent-key-indicator-detail">{indicator.detail}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
