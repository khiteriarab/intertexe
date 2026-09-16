"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type {
  PlatformBenchmarkModule,
  PlatformConfidence,
  PlatformForecastPoint,
  PlatformIntelligenceBrief,
  PlatformIntelligenceLayer,
  PlatformRecommendation,
} from "../../../lib/enterprise/platform-intelligence";

function formatRelativeTime(iso: string | null): string | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60000) return "Generated just now";
  const mins = Math.round(ms / 60000);
  return `Generated ${mins} min ago`;
}

function impactLabel(impact: PlatformRecommendation["impact"]): string {
  return `${impact.charAt(0).toUpperCase()}${impact.slice(1)} impact`;
}

export function EntIntelligenceBriefCard({ brief }: { brief: PlatformIntelligenceBrief | null }) {
  if (!brief) {
    return (
      <article className="ent-intel-card ent-intel-card--brief">
        <p className="ent-intel-unavailable">
          Intelligence brief unavailable — import products to generate live insights from your catalog.
        </p>
      </article>
    );
  }

  const generated = formatRelativeTime(brief.generatedAt);

  const primaryMetric = brief.metrics[0];
  const secondaryMetrics = brief.metrics.slice(1);

  return (
    <article className="ent-intel-card ent-intel-card--brief">
      <header className="ent-intel-card-head">
        <div>
          <p className="ent-section-eyebrow">INTERTEXE Intelligence Brief</p>
          {generated ? <p className="text-[11px] text-[var(--ent-muted-light)] mt-1">{generated}</p> : null}
        </div>
      </header>
      <div className="ent-insight-card mt-2">
        <p className="ent-insight-statement">{brief.headline}</p>
        <p className="ent-insight-why">{brief.summary}</p>
        <div className="ent-insight-meta">
          {primaryMetric ? (
            <span className={`ent-insight-pill ${primaryMetric.tone === "positive" ? "ent-insight-pill--positive" : ""}`}>
              {primaryMetric.value} {primaryMetric.label.toLowerCase()}
            </span>
          ) : null}
          <span className="ent-insight-pill ent-insight-pill--high">High confidence</span>
        </div>
        {secondaryMetrics.length ? (
          <dl className="ent-intel-metrics mt-4">
            {secondaryMetrics.map((metric) => (
              <div key={metric.label}>
                <dt className="sr-only">{metric.label}</dt>
                <dd className="ent-intel-metric-value">{metric.value}</dd>
                <dd className="ent-intel-metric-label">{metric.label}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        <Link href="#" className="ent-insight-action" onClick={(e) => e.preventDefault()}>
          Review assortment →
        </Link>
      </div>
    </article>
  );
}

export function EntRecommendedActionsCard({ recommendations }: { recommendations: PlatformRecommendation[] }) {
  if (!recommendations.length) {
    return (
      <article className="ent-intel-card ent-intel-card--actions">
        <p className="ent-intel-card-label">Recommended actions</p>
        <p className="ent-intel-unavailable">No ranked recommendations yet — resolve catalog gaps to surface actions.</p>
      </article>
    );
  }

  return (
    <article className="ent-intel-card ent-intel-card--actions">
      <header className="ent-intel-card-head">
        <p className="ent-intel-card-label">Recommended actions</p>
        <span className="text-[10px] tracking-[0.12em] uppercase px-2 py-1 rounded-full bg-[var(--ent-surface-muted)] text-[var(--ent-muted)]">
          {recommendations.length} opportunities
        </span>
      </header>
      <ul className="m-0 p-0 list-none">
        {recommendations.map((row) => {
          const content = (
            <div className="ent-insight-card">
              <p className="ent-insight-statement">{row.action}</p>
              <p className="ent-insight-why">{row.context}</p>
              <div className="ent-insight-meta">
                <span className="ent-insight-pill ent-insight-pill--positive">{impactLabel(row.impact)}</span>
                <span className="ent-insight-pill ent-insight-pill--high">{row.confidencePct}% confidence</span>
              </div>
              {row.href ? (
                <Link href={row.href} className="ent-insight-action">
                  Review assortment →
                </Link>
              ) : null}
            </div>
          );
          return (
            <li key={row.id} className="py-3 border-b border-[var(--ent-border-subtle)] last:border-0">
              {content}
            </li>
          );
        })}
      </ul>
    </article>
  );
}

export function EntMaterialBenchmarkModule({
  benchmark,
  benchmarkHref,
}: {
  benchmark: PlatformBenchmarkModule | null;
  benchmarkHref: string;
}) {
  if (!benchmark) {
    return (
      <article className="ent-intel-card ent-intel-card--benchmark">
        <p className="ent-intel-unavailable text-white/70">Benchmark data unavailable.</p>
      </article>
    );
  }

  return (
    <article className="ent-intel-card ent-intel-card--benchmark">
      <header className="ent-intel-card-head">
        <p className="ent-intel-card-label">Material Benchmark</p>
        <Link href={benchmarkHref} className="text-[10px] tracking-[0.1em] uppercase text-white/55 hover:text-white/85">
          View full →
        </Link>
      </header>
      <p className="text-[10px] tracking-[0.14em] uppercase text-white/45 mb-3">Your brand vs peer median</p>
      <ul className="m-0 p-0 list-none">
        {benchmark.metrics.map((row) => (
          <li key={row.metric} className="ent-intel-peer-bar">
            <div className="ent-intel-peer-bar-label">
              <span>{row.metric}</span>
              <span className="tabular-nums text-white/50">
                {row.brandValue} / {row.peerMedian}
              </span>
            </div>
            <div className="ent-intel-peer-track">
              <span className="ent-intel-peer-fill-peer" style={{ width: `${Math.min(row.peerPct, 100)}%` }} />
              <span className="ent-intel-peer-fill-brand" style={{ width: `${Math.min(row.brandPct, 100)}%` }} />
            </div>
          </li>
        ))}
      </ul>
      <div className="ent-intel-readiness-ring">
        <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden>
          <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="5" />
          <circle
            cx="26"
            cy="26"
            r="22"
            fill="none"
            stroke="rgba(196,165,116,0.85)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${(benchmark.catalogReadinessPct / 100) * 138} 138`}
            transform="rotate(-90 26 26)"
          />
        </svg>
        <div>
          <p className="ent-intel-readiness-value">{benchmark.catalogReadinessPct}%</p>
          <p className="text-[11px] text-white/55 leading-snug">
            Catalog readiness
            <br />
            {benchmark.catalogReadyCount.toLocaleString()} of {benchmark.catalogTotalCount.toLocaleString()} ready
          </p>
        </div>
      </div>
    </article>
  );
}

function EntForecastChart({ points }: { points: PlatformForecastPoint[] }) {
  const { linenPath, polyPath, observedSplitX } = useMemo(() => {
    if (!points.length) return { linenPath: "", polyPath: "", observedSplitX: 0 };
    const width = 320;
    const height = 120;
    const pad = 12;
    const maxIndex = Math.max(...points.flatMap((p) => [p.linenIndex, p.polyesterIndex]), 120);
    const minIndex = Math.min(...points.flatMap((p) => [p.linenIndex, p.polyesterIndex]), 70);
    const xStep = (width - pad * 2) / Math.max(points.length - 1, 1);

    const toPoint = (index: number, value: number) => {
      const x = pad + index * xStep;
      const y = height - pad - ((value - minIndex) / Math.max(maxIndex - minIndex, 1)) * (height - pad * 2);
      return `${x},${y}`;
    };

    const linen = points.map((p, i) => toPoint(i, p.linenIndex)).join(" ");
    const poly = points.map((p, i) => toPoint(i, p.polyesterIndex)).join(" ");
    const firstForecast = points.findIndex((p) => p.isForecast);
    const splitX = firstForecast > 0 ? pad + (firstForecast - 0.5) * xStep : width;

    return { linenPath: linen, polyPath: poly, observedSplitX: splitX };
  }, [points]);

  if (!points.length) {
    return <p className="ent-intel-unavailable">Forecast unavailable.</p>;
  }

  return (
    <svg viewBox="0 0 320 120" className="ent-intel-forecast-chart" role="img" aria-label="Material demand forecast">
      <line x1={observedSplitX} y1="8" x2={observedSplitX} y2="112" stroke="rgba(20,20,20,0.08)" strokeDasharray="4 4" />
      <polyline fill="none" stroke="#9a948c" strokeWidth="2" points={polyPath} />
      <polyline fill="none" stroke="var(--ent-petrol)" strokeWidth="2.5" points={linenPath} />
      {points.map((point, index) => (
        <text
          key={point.label}
          x={12 + index * ((320 - 24) / Math.max(points.length - 1, 1))}
          y="118"
          fontSize="9"
          fill="var(--ent-muted-light)"
          textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}
        >
          {point.label}
        </text>
      ))}
    </svg>
  );
}

export function EntDemandForecastCard({ forecast }: { forecast: PlatformForecastPoint[] }) {
  const last = forecast[forecast.length - 1];
  const linenDelta = last ? last.linenIndex - forecast[0]!.linenIndex : 0;
  const polyDelta = last ? last.polyesterIndex - forecast[0]!.polyesterIndex : 0;

  return (
    <article className="ent-intel-card ent-intel-card--forecast">
      <header className="ent-intel-card-head">
        <div>
          <p className="ent-intel-card-label">Demand forecast</p>
          <p className="text-[11px] text-[var(--ent-muted-light)] mt-0.5">Next 24 months · indexed to today</p>
        </div>
      </header>
      <EntForecastChart points={forecast} />
      <div className="ent-intel-forecast-legend">
        <span className="linen">
          Naturals: {linenDelta >= 0 ? "rising" : "declining"} {linenDelta >= 0 ? "+" : ""}
          {linenDelta}%
        </span>
        <span className="poly">
          Synthetics: {polyDelta <= 0 ? "declining" : "rising"} {polyDelta > 0 ? "+" : ""}
          {polyDelta}%
        </span>
        <span>Solid = observed · dashed boundary = forecast</span>
      </div>
    </article>
  );
}

export function EntAskIntertexeCard({
  suggestedQueries,
  searchHref,
}: {
  suggestedQueries: string[];
  searchHref: string;
}) {
  const [query, setQuery] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (!q) return;
    window.location.href = `${searchHref}?q=${encodeURIComponent(q)}`;
  }

  return (
    <article className="ent-intel-card ent-intel-card--ask">
      <header>
        <p className="ent-intel-card-label">Ask INTERTEXE</p>
        <p className="text-sm text-[var(--ent-muted)] mt-1">Your AI material expert</p>
      </header>
      <form onSubmit={handleSubmit} className="ent-intel-ask-input-wrap">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask a question about your materials…"
          className="ent-intel-ask-input"
          aria-label="Ask INTERTEXE a question"
        />
        <button type="submit" className="ent-intel-ask-submit" aria-label="Submit question">
          →
        </button>
      </form>
      {suggestedQueries.length ? (
        <div className="ent-intel-prompts">
          {suggestedQueries.map((prompt) => (
            <button key={prompt} type="button" className="ent-intel-prompt" onClick={() => setQuery(prompt)}>
              {prompt}
            </button>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function EntEvidenceConfidenceCard({
  confidence,
  evidenceSources,
  evidenceHref,
}: {
  confidence: PlatformConfidence | null;
  evidenceSources: PlatformIntelligenceLayer["evidenceSources"];
  evidenceHref: string;
}) {
  if (!confidence) {
    return (
      <article className="ent-intel-card ent-intel-card--evidence">
        <p className="ent-intel-unavailable">Evidence and confidence metrics unavailable.</p>
      </article>
    );
  }

  return (
    <article className="ent-intel-card ent-intel-card--evidence">
      <header className="ent-intel-card-head">
        <p className="ent-intel-card-label">Evidence + Confidence</p>
        <span aria-hidden className="text-[var(--ent-petrol)]">
          ◎
        </span>
      </header>
      <dl className="ent-intel-evidence-list">
        <div className="ent-intel-evidence-row">
          <dt>Confidence score</dt>
          <dd className="tabular-nums font-medium ent-serif">{confidence.scorePct}%</dd>
        </div>
        <div className="ent-intel-evidence-row">
          <dt>Peer set</dt>
          <dd>{confidence.peerSetLabel}</dd>
        </div>
        <div className="ent-intel-evidence-row">
          <dt>Catalog size</dt>
          <dd>{confidence.catalogSize.toLocaleString()} products</dd>
        </div>
        <div className="ent-intel-evidence-row">
          <dt>Evidence coverage</dt>
          <dd>{confidence.evidenceCoveragePct}%</dd>
        </div>
      </dl>
      {evidenceSources.length ? (
        <p className="text-[11px] text-[var(--ent-muted-light)] mt-3 leading-relaxed">
          Sources: {evidenceSources.map((s) => s.label).join(" · ")}
        </p>
      ) : null}
      <Link href={evidenceHref} className="ent-link-subtle inline-block mt-4 text-sm">
        View evidence →
      </Link>
    </article>
  );
}
