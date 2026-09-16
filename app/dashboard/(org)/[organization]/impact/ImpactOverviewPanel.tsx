import Link from "next/link";
import type { OrgImpactOverview } from "../../../../../lib/sustainability/types";

export function ImpactOverviewPanel({ overview, base }: { overview: OrgImpactOverview; base: string }) {
  return (
    <div className="space-y-8">
      <div className="ent-metrics-row">
        <article className="ent-card ent-card-primary">
          <p className="ent-section-eyebrow">Product footprint</p>
          <p className="ent-card-metric">
            {overview.productFootprint
              ? `${overview.productFootprint.value} ${overview.productFootprint.unit}`
              : "—"}
          </p>
          <p className="text-sm text-[var(--ent-muted)] mt-2">Catalog average · cradle-to-gate</p>
        </article>
        <article className="ent-card ent-card-secondary">
          <p className="text-xs text-[var(--ent-muted-light)]">Environmental score</p>
          <p className="ent-kpi-value mt-2">
            {overview.environmentalScore
              ? `${overview.environmentalScore.value} ${overview.environmentalScore.unit}`
              : "—"}
          </p>
          <p className="text-sm text-[var(--ent-muted)] mt-1">
            {overview.environmentalScore?.label || "No regulatory score ingested"}
          </p>
        </article>
        <article className="ent-card ent-card-secondary">
          <p className="text-xs text-[var(--ent-muted-light)]">Primary-data coverage</p>
          <p className="ent-kpi-value mt-2">
            {overview.primaryDataCoveragePct != null ? `${overview.primaryDataCoveragePct}%` : "—"}
          </p>
          <p className="text-sm text-[var(--ent-muted)] mt-1">Measured share across assessments</p>
        </article>
        <article className="ent-card ent-card-secondary">
          <p className="text-xs text-[var(--ent-muted-light)]">Evidence status</p>
          <p className="ent-kpi-value mt-2">
            {overview.evidenceStatus.required
              ? `${overview.evidenceStatus.verified} of ${overview.evidenceStatus.required}`
              : "—"}
          </p>
          <p className="text-sm text-[var(--ent-muted)] mt-1">Required records verified</p>
        </article>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="ent-card ent-card-primary">
          <p className="ent-section-eyebrow">Impact hotspots</p>
          <h2 className="ent-section-title mt-1">Where impact concentrates</h2>
          {overview.hotspots.length ? (
            <ul className="mt-6 space-y-3">
              {overview.hotspots.map((hotspot) => (
                <li key={hotspot.stage} className="flex items-center justify-between gap-4">
                  <span className="text-sm text-[var(--ent-ink)]">{hotspot.stage}</span>
                  <span className="text-sm tabular-nums text-[var(--ent-muted)]">{hotspot.sharePct}%</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--ent-muted)] mt-4">Connect a sustainability provider to surface hotspots.</p>
          )}
        </section>

        <section className="ent-card ent-card-dark ent-card-primary">
          <p className="ent-section-eyebrow">Methodology</p>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-white/55">Source</dt>
              <dd className="text-white/90 text-right">{overview.sourceAttribution || "Not connected"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/55">Methodology</dt>
              <dd className="text-white/90 text-right">{overview.methodology || "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/55">Version</dt>
              <dd className="text-white/90 text-right">{overview.methodologyVersion || "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/55">Last calculated</dt>
              <dd className="text-white/90 text-right">
                {overview.lastCalculatedAt ? new Date(overview.lastCalculatedAt).toLocaleDateString() : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/55">Measured / estimated</dt>
              <dd className="text-white/90 text-right">
                {overview.measuredShare != null ? `${overview.measuredShare}% / ${overview.estimatedShare}%` : "—"}
              </dd>
            </div>
          </dl>
          <Link href={`${base}/integrations`} className="ent-insight-action mt-6 text-white/80 hover:text-white">
            Manage integrations →
          </Link>
        </section>
      </div>

      <p className="text-xs text-[var(--ent-muted-light)]">
        INTERTEXE Traceability Score measures supply chain completeness — separate from environmental impact scores above.
      </p>
    </div>
  );
}
