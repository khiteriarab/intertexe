import Link from "next/link";
import type { ProductKeyIndicator } from "../../../lib/enterprise/product-key-indicators";
import type { ProductImpactScores } from "../../../lib/enterprise/product-impact-scores";
import type { ProductTraceability } from "../../../lib/enterprise/traceability";
import { ProductInformationPanel, type ProductInfo } from "./ProductInformationPanel";
import { ProductKeyIndicators } from "./ProductKeyIndicators";
import { ProductTraceabilityGraph } from "./ProductTraceabilityGraph";
import { ImpactLcaBars } from "./ImpactLcaBars";

export function ProductOverviewBoard({
  basePath,
  productName,
  info,
  indicators,
  composition,
  provenanceCount,
  supplierRequestCount,
  openIssueCount,
  traceability,
  impactScores,
  evidenceConfidence,
  dppReadiness,
  resaleReadiness,
}: {
  basePath: string;
  productName: string;
  info: ProductInfo;
  indicators: ProductKeyIndicator[];
  composition: string | null;
  provenanceCount: number;
  supplierRequestCount: number;
  openIssueCount: number;
  traceability: ProductTraceability;
  impactScores: ProductImpactScores;
  evidenceConfidence: string;
  dppReadiness: string;
  resaleReadiness: string;
}) {
  return (
    <div className="ent-overview-board">
      <div className="ent-product-metric-rail" aria-label="Product intelligence">
        <div>
          <p className="ent-product-metric-label">Traceability score</p>
          <p className="ent-product-metric-value">{traceability.completenessPct}%</p>
        </div>
        <div>
          <p className="ent-product-metric-label">Evidence confidence</p>
          <p className="ent-product-metric-value ent-product-metric-value--text">{evidenceConfidence}</p>
        </div>
        <div>
          <p className="ent-product-metric-label">DPP readiness</p>
          <p className="ent-product-metric-value">{dppReadiness}</p>
        </div>
        <div>
          <p className="ent-product-metric-label">PEF Single Score</p>
          <p className="ent-product-metric-value">
            {impactScores.pefSingleScore.toLocaleString()}
            <small>{impactScores.pefUnit}</small>
          </p>
        </div>
        <div>
          <p className="ent-product-metric-label">French Environmental Cost</p>
          <p className="ent-product-metric-value">{impactScores.frenchEnvironmentalCost.toLocaleString()}</p>
        </div>
        <div>
          <p className="ent-product-metric-label">Climate impact</p>
          <p className="ent-product-metric-value">
            {impactScores.climateKgCo2e}
            <small>{impactScores.climateUnit}</small>
          </p>
        </div>
        <div>
          <p className="ent-product-metric-label">Resale readiness</p>
          <p className="ent-product-metric-value ent-product-metric-value--text">{resaleReadiness}</p>
        </div>
      </div>

      <ProductKeyIndicators indicators={indicators} />

      <div className="ent-overview-split">
        <section className="ent-overview-viz">
          <div className="ent-overview-section-head">
            <div>
              <p className="ent-section-eyebrow">Traceability</p>
              <h3 className="ent-overview-section-title">
                {traceability.completenessPct}% complete · {traceability.knownTierCount}/4 tiers
              </h3>
            </div>
            <Link href={`${basePath}?tab=traceability`} className="ent-overview-explore">
              Explore details →
            </Link>
          </div>
          <div className="ent-overview-trace-embed">
            <ProductTraceabilityGraph traceability={traceability} productName={productName} compact />
          </div>
        </section>

        <section className="ent-overview-viz">
          <div className="ent-overview-section-head">
            <div>
              <p className="ent-section-eyebrow">Environmental impact</p>
              <h3 className="ent-overview-section-title">{impactScores.methodology}</h3>
            </div>
            <Link href={`${basePath}?tab=impact`} className="ent-overview-explore">
              Explore details →
            </Link>
          </div>
          <ImpactLcaBars segments={impactScores.segments} />
        </section>
      </div>

      <section className="ent-overview-meta">
        <ProductInformationPanel info={info} />
        <p className="ent-overview-materials-value">{composition || "Composition not recorded yet."}</p>
        <div className="ent-overview-quick-links">
          <Link href={`${basePath}?tab=traceability`} className="ent-overview-chip">
            Materials & evidence
            <span>{provenanceCount + supplierRequestCount}</span>
          </Link>
          <Link href={`${basePath}?tab=compliance`} className="ent-overview-chip">
            Open issues
            <span>{openIssueCount}</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
