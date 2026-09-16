import Link from "next/link";
import type { ProductKeyIndicator } from "../../../lib/enterprise/product-key-indicators";
import type { ProductImpactScores } from "../../../lib/enterprise/product-impact-scores";
import type { ProductTraceability } from "../../../lib/enterprise/traceability";
import { ProductInformationPanel, type ProductInfo } from "./ProductInformationPanel";
import { ProductKeyIndicators } from "./ProductKeyIndicators";
import { ProductTraceabilityGraph } from "./ProductTraceabilityGraph";

/**
 * Fairly Made–style overview: identity summary, materials, key indicators,
 * then compact Traceability + Impact teasers with links into deep tabs.
 */
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
}) {
  return (
    <div className="ent-overview-board">
      <div className="ent-overview-identity grid lg:grid-cols-2 gap-6 items-start">
        <div className="ent-overview-card">
          <ProductInformationPanel info={info} />
        </div>
        <div className="ent-overview-card">
          <ProductKeyIndicators indicators={indicators} />
        </div>
      </div>

      <section className="ent-overview-card ent-overview-materials">
        <div className="ent-overview-section-head">
          <div>
            <p className="ent-journey-eyebrow">Materials</p>
            <h3 className="ent-overview-section-title">
              Main materials{provenanceCount ? ` · ${provenanceCount}` : ""}
            </h3>
          </div>
          <Link href={`${basePath}?tab=materials`} className="ent-overview-explore">
            Explore materials →
          </Link>
        </div>
        <p className="ent-overview-materials-value">{composition || "Composition not recorded yet."}</p>
        <div className="ent-overview-quick-links">
          <Link href={`${basePath}?tab=suppliers`} className="ent-overview-chip">
            Suppliers & evidence
            <span>{supplierRequestCount}</span>
          </Link>
          <Link href={`${basePath}?tab=history`} className="ent-overview-chip">
            Open issues
            <span>{openIssueCount}</span>
          </Link>
        </div>
      </section>

      <div className="ent-overview-split grid lg:grid-cols-2 gap-6 items-start">
        <section className="ent-overview-card">
          <div className="ent-overview-section-head">
            <div>
              <p className="ent-journey-eyebrow">Traceability</p>
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

        <section className="ent-overview-card">
          <div className="ent-overview-section-head">
            <div>
              <p className="ent-journey-eyebrow">Impact breakdown</p>
              <h3 className="ent-overview-section-title">{impactScores.methodology}</h3>
            </div>
            <Link href={`${basePath}?tab=impact`} className="ent-overview-explore">
              Explore details →
            </Link>
          </div>

          <div className="ent-overview-impact-scores">
            <div>
              <p className="ent-overview-impact-label">Climate change</p>
              <p className="ent-overview-impact-value">
                {impactScores.climateKgCo2e} {impactScores.climateUnit}
              </p>
            </div>
            <div>
              <p className="ent-overview-impact-label">PEF Single Score</p>
              <p className="ent-overview-impact-value">
                {impactScores.pefSingleScore.toLocaleString()} {impactScores.pefUnit}
              </p>
            </div>
            <div>
              <p className="ent-overview-impact-label">French Environmental Cost</p>
              <p className="ent-overview-impact-value">
                {impactScores.frenchEnvironmentalCost.toLocaleString()}
              </p>
              <p className="ent-overview-impact-meta">{impactScores.frenchUnit}</p>
            </div>
          </div>

          <div className="ent-impact-stack ent-overview-impact-stack" aria-hidden>
            {impactScores.segments.map((segment) => (
              <div
                key={segment.stage}
                className="ent-impact-stack-segment"
                style={{ width: `${segment.sharePct}%`, background: segment.color }}
              />
            ))}
          </div>
          <ul className="ent-overview-impact-legend">
            {impactScores.segments.slice(0, 6).map((segment) => (
              <li key={segment.stage}>
                <span style={{ background: segment.color }} />
                {segment.label}
              </li>
            ))}
          </ul>
          <p className="ent-overview-impact-driver">
            Largest driver · {impactScores.largestDriver.label} ({impactScores.largestDriver.sharePct}%)
          </p>
        </section>
      </div>
    </div>
  );
}
