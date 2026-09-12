import Image from "next/image";
import Link from "next/link";
import type { ConsumerSignalsBundle } from "../../../lib/enterprise/consumer-signals";

const TONE_CLASS = {
  opportunity: "ent-signal-card-opportunity",
  watch: "ent-signal-card-watch",
  proof: "ent-signal-card-proof",
} as const;

export function EntConsumerSignals({
  base,
  signals,
}: {
  base: string;
  signals: ConsumerSignalsBundle;
}) {
  if (signals.summary.productCount === 0) return null;

  return (
    <section className="mb-12 md:mb-14">
      <div className="ent-signal-hero mb-8">
        <div className="relative z-[1] grid lg:grid-cols-[1.35fr_0.9fr] gap-8 items-end">
          <div>
            <p className="ent-section-eyebrow">Consumer signals</p>
            <h2 className="ent-signal-hero-title">What shoppers respond to in material reality</h2>
            <p className="text-sm text-[var(--ent-muted)] mt-3 max-w-2xl leading-relaxed">
              INTERTEXE is not pure B2B compliance — the consumer layer adds governed behavior, discovery context,
              cultural relevance, and material preference signals on top of passport readiness, without attaching shopper
              identity to your brand.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="ent-benchmark-stat">
              <p className="ent-benchmark-stat-value">{signals.summary.opportunityScore ?? "—"}</p>
              <p className="ent-benchmark-stat-label">Material opportunity</p>
            </div>
            <div className="ent-benchmark-stat">
              <p className="ent-benchmark-stat-value">{signals.summary.avgNaturalPct ?? "—"}%</p>
              <p className="ent-benchmark-stat-label">Avg natural fiber</p>
            </div>
            <div className="ent-benchmark-stat">
              <p className="ent-benchmark-stat-value">
                {signals.summary.naturalDominantCount}/{signals.summary.productCount}
              </p>
              <p className="ent-benchmark-stat-label">≥90% natural</p>
            </div>
            <div className="ent-benchmark-stat">
              <p className="ent-benchmark-stat-value">{signals.summary.polyesterCount}</p>
              <p className="ent-benchmark-stat-label">Polyester SKUs</p>
            </div>
          </div>
        </div>
      </div>

      {signals.insights.length ? (
        <div className="grid md:grid-cols-3 gap-4 md:gap-5 mb-8">
          {signals.insights.map((insight) => (
            <article key={insight.id} className={`ent-signal-card ${TONE_CLASS[insight.tone]}`}>
              <div className="flex items-center justify-between gap-3 mb-4">
                <p className="ent-section-eyebrow mb-0">{insight.eyebrow}</p>
                <span className="ent-signal-source">
                  {insight.source === "governed_aggregate" ? "Governed" : "Catalog"}
                </span>
              </div>
              <h3 className="ent-signal-card-title">{insight.headline}</h3>
              <p className="ent-signal-card-body">{insight.body}</p>
              <div className="ent-signal-metric">
                <span>{insight.metricLabel}</span>
                <strong>{insight.metricValue}</strong>
              </div>
              {insight.sampleSize != null ? (
                <p className="text-[11px] text-[var(--ent-muted-light)] mt-3">
                  Sample n={insight.sampleSize}
                  {insight.relatedProductIds.length
                    ? ` · ${insight.relatedProductIds.length} linked products`
                    : ""}
                </p>
              ) : null}
              <Link href={`${base}/${insight.hrefHint}`} className="ent-link-subtle mt-4 inline-flex">
                Act on this signal →
              </Link>
            </article>
          ))}
        </div>
      ) : null}

      {signals.pillars.length ? (
        <div className="mb-8">
          <p className="ent-section-eyebrow mb-3">Consumer layer</p>
          <h3 className="ent-widget-title mb-5">What pure compliance software cannot show you</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {signals.pillars.map((pillar) => (
              <article key={pillar.id} className="ent-signal-pillar">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h4 className="ent-signal-pillar-title">{pillar.title}</h4>
                  <span className={`ent-signal-pillar-status ent-signal-pillar-status-${pillar.status}`}>
                    {pillar.status}
                  </span>
                </div>
                <p className="ent-signal-pillar-body">{pillar.body}</p>
                {pillar.metric ? (
                  <p className="ent-signal-pillar-metric">{pillar.metric}</p>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid lg:grid-cols-[1.4fr_0.85fr] gap-5 mb-8">
        <div className="ent-widget-card ent-widget-card-elevated p-6 md:p-8">
          <p className="ent-section-eyebrow">Evidence strip</p>
          <h3 className="ent-widget-title">Ten live products powering the signal</h3>
          <p className="text-sm text-[var(--ent-muted)] mt-2 max-w-xl">
            Real compositions from INTERTEXE’s catalog, imported into your org so every dashboard module — products,
            passports, benchmarking — runs on the same material truth.
          </p>
          <ul className="ent-signal-product-grid mt-6">
            {signals.products.map((product) => (
              <li key={product.id} className="ent-signal-product">
                <Link href={`${base}/products/${product.id}`} className="ent-signal-product-link">
                  <span className="ent-signal-product-media">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt=""
                        fill
                        sizes="120px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="ent-signal-product-fallback">
                        {(product.primaryFiber || product.name).slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="ent-signal-product-name">{product.name}</span>
                    <span className="ent-signal-product-meta">
                      {product.collection ? `${product.collection} · ` : ""}
                      {product.category || "Apparel"}
                    </span>
                    <span className="ent-signal-product-comp">
                      {product.compositionDisplay || "Composition pending"}
                    </span>
                    <span className="ent-signal-fiber-row">
                      {product.naturalPct != null ? (
                        <span className="ent-signal-chip ent-signal-chip-natural">{product.naturalPct}% natural</span>
                      ) : null}
                      {product.containsPolyester ? (
                        <span className="ent-signal-chip ent-signal-chip-watch">Polyester</span>
                      ) : null}
                      {product.fibers.some((f) => f.code.includes("linen")) ? (
                        <span className="ent-signal-chip">Linen</span>
                      ) : null}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="ent-widget-card ent-widget-card-elevated p-6 md:p-8">
          <p className="ent-section-eyebrow">Category affinity</p>
          <h3 className="ent-widget-title">Where fibers concentrate</h3>
          <ul className="mt-6 space-y-3">
            {signals.affinities.map((row) => (
              <li key={row.category} className="ent-signal-affinity">
                <div>
                  <p className="font-semibold text-[var(--ent-ink)]">{row.category}</p>
                  <p className="text-xs text-[var(--ent-muted)] mt-0.5">
                    {row.productCount} products
                    {row.topFiber ? ` · top fiber ${row.topFiber}` : ""}
                  </p>
                </div>
                <p className="ent-display text-xl tabular-nums text-[var(--ent-ink)]">
                  {row.naturalShare != null ? `${row.naturalShare}%` : "—"}
                </p>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-[var(--ent-muted-light)] mt-6 leading-relaxed">
            Affinity is computed from your org catalog only. Peer and shopper medians stay in governed aggregate tables.
          </p>
        </div>
      </div>
    </section>
  );
}

export function EntConsumerSignalsTeaser({
  base,
  signals,
}: {
  base: string;
  signals: ConsumerSignalsBundle;
}) {
  if (signals.summary.productCount === 0) return null;
  const lead = signals.insights[0];

  return (
    <section className="mb-10 md:mb-12">
      <div className="ent-signal-teaser">
        <div className="relative z-[1] grid lg:grid-cols-[1.2fr_0.9fr] gap-8 items-center">
          <div>
            <p className="ent-section-eyebrow">Consumer signals</p>
            <h2 className="ent-benchmark-teaser-title">
              {lead?.headline || "Material reality meets shopper preference"}
            </h2>
            <p className="text-sm text-[var(--ent-muted)] mt-3 max-w-xl leading-relaxed">
              {lead?.body ||
                "See how natural fiber share, linen tilt, and polyester presence map onto governed consumer aggregates."}
            </p>
            <div className="flex flex-wrap gap-3 mt-6">
              {signals.products.slice(0, 5).map((product) => (
                <span key={product.id} className="ent-benchmark-fiber-chip">
                  {(product.primaryFiber || "fiber").replace(/_/g, " ")}
                  {product.naturalPct != null ? ` · ${product.naturalPct}%` : ""}
                </span>
              ))}
            </div>
            <Link
              href={`${base}/benchmarking`}
              className="inline-flex mt-8 items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold bg-white text-[var(--ent-charcoal)] hover:bg-[var(--ent-butter-soft)] transition-colors"
            >
              Open consumer signals →
            </Link>
          </div>
          <div className="ent-benchmark-teaser-panel">
            <p className="text-[10px] tracking-[0.14em] uppercase text-[var(--ent-muted-light)] mb-4">Pilot sample</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="ent-display text-3xl text-[var(--ent-ink)] tabular-nums">{signals.summary.productCount}</p>
                <p className="text-xs text-[var(--ent-muted-light)] mt-1">Live products</p>
              </div>
              <div>
                <p className="ent-display text-3xl text-[var(--ent-ink)] tabular-nums">
                  {signals.summary.opportunityScore ?? "—"}
                </p>
                <p className="text-xs text-[var(--ent-muted-light)] mt-1">Opportunity score</p>
              </div>
              <div>
                <p className="ent-display text-3xl text-[var(--ent-ink)] tabular-nums">
                  {signals.summary.avgNaturalPct ?? "—"}%
                </p>
                <p className="text-xs text-[var(--ent-muted-light)] mt-1">Avg natural</p>
              </div>
              <div>
                <p className="ent-display text-3xl text-[var(--ent-ink)] tabular-nums">{signals.insights.length}</p>
                <p className="text-xs text-[var(--ent-muted-light)] mt-1">Active insights</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
