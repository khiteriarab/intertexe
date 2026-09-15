import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveBenchmarkSegmentSelection } from "./benchmark-segments";
import { loadOrgCompositionBenchmark, type PeerComparisonRow } from "./composition-benchmark";
import { loadConversionIndexByCohort, type ConversionCohortBundle } from "./conversion-cohorts";
import { loadDecisionIntelligence, type DecisionInsight } from "./decision-intelligence";
import { loadOrgSuppliers } from "./module-queries";
import { loadOrgOverview } from "./queries";
import { loadCatalogTraceabilitySummary } from "./traceability";
import {
  PLATFORM_BENCHMARK_PEERS,
  PLATFORM_CONVERSION_COHORTS,
  PLATFORM_LIVE_CATALOG,
} from "./platform-showcase";

export type IntelligenceDataStatus = "loading" | "available" | "unavailable" | "preview";

export type PlatformIntelligenceBrief = {
  headline: string;
  summary: string;
  generatedAt: string | null;
  metrics: Array<{ label: string; value: string; tone?: "positive" | "negative" | "neutral" }>;
};

export type PlatformRecommendation = {
  id: string;
  action: string;
  context: string;
  impact: "high" | "medium" | "low";
  confidencePct: number;
  href?: string;
};

export type PlatformForecastPoint = {
  label: string;
  linenIndex: number;
  polyesterIndex: number;
  isForecast: boolean;
};

export type PlatformBenchmarkMetric = {
  metric: string;
  brandValue: string;
  peerMedian: string;
  brandPct: number;
  peerPct: number;
};

export type PlatformBenchmarkModule = {
  metrics: PlatformBenchmarkMetric[];
  catalogReadinessPct: number;
  catalogReadyCount: number;
  catalogTotalCount: number;
};

export type PlatformConfidence = {
  scorePct: number;
  peerSetLabel: string;
  catalogSize: number;
  evidenceCoveragePct: number;
};

export type PlatformEvidenceSource = {
  id: string;
  label: string;
  kind: "catalog" | "benchmark" | "regulatory" | "traceability" | "consumer" | "supplier";
};

export type PlatformIntelligenceLayer = {
  status: IntelligenceDataStatus;
  source: "customer_zero_preview" | "org_live" | "unavailable";
  intelligenceBrief: PlatformIntelligenceBrief | null;
  recommendations: PlatformRecommendation[];
  forecast: PlatformForecastPoint[];
  benchmark: PlatformBenchmarkModule | null;
  confidence: PlatformConfidence | null;
  evidenceSources: PlatformEvidenceSource[];
  suggestedQueries: string[];
};

function parsePct(value: string): number {
  const n = parseFloat(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function buildPreviewForecastSeries(): PlatformForecastPoint[] {
  const months = ["Now", "+6m", "+12m", "+18m", "+24m"];
  return months.map((label, index) => {
    const linenBase = 100;
    const polyBase = 100;
    const linenGrowth = index * 3.6;
    const polyDecline = index * 6;
    return {
      label,
      linenIndex: Math.round(linenBase + linenGrowth),
      polyesterIndex: Math.round(polyBase - polyDecline),
      isForecast: index > 0,
    };
  });
}

function buildPreviewRecommendations(): PlatformRecommendation[] {
  const linen = PLATFORM_CONVERSION_COHORTS.find((row) => /linen/i.test(row.cohort));
  const poly = PLATFORM_CONVERSION_COHORTS.find((row) => /synthetic|poly/i.test(row.cohort));

  return [
    {
      id: "linen-allocation",
      action: "Increase linen allocation in dresses",
      context: linen?.signal || "Rising demand and strong brand fit",
      impact: "high",
      confidencePct: 87,
      href: "/platform/demo#benchmark",
    },
    {
      id: "supplier-evidence",
      action: "Resolve supplier evidence gaps",
      context: "Suppliers missing material documentation in governed catalog",
      impact: "high",
      confidencePct: 82,
      href: "/platform/demo",
    },
    {
      id: "polyester-review",
      action: "Review polyester-heavy premium tops",
      context: poly?.signal || "Declining demand and higher regulatory risk",
      impact: "medium",
      confidencePct: 76,
      href: "/platform/demo#benchmark",
    },
  ];
}

function naturalPositionLabel(
  naturalShare: number | null,
  peerRow: PeerComparisonRow | undefined
): { label: string; tone: "positive" | "negative" | "neutral" } {
  if (naturalShare == null) return { label: "Unknown", tone: "neutral" };
  if (peerRow?.status === "ok" && peerRow.delta != null) {
    if (peerRow.delta >= 8) return { label: "Strong", tone: "positive" };
    if (peerRow.delta <= -8) return { label: "Weak", tone: "negative" };
  }
  if (naturalShare >= 55) return { label: "Strong", tone: "positive" };
  if (naturalShare <= 35) return { label: "Weak", tone: "negative" };
  return { label: "Average", tone: "neutral" };
}

function mapDecisionToRecommendation(insight: DecisionInsight): PlatformRecommendation {
  const confidencePct =
    insight.priority === "high" ? 88 : insight.priority === "medium" ? 78 : 68;
  return {
    id: insight.id,
    action: insight.action,
    context: insight.body,
    impact: insight.priority,
    confidencePct,
    href: insight.href,
  };
}

function buildBenchmarkModule(
  peerRows: PeerComparisonRow[],
  stats: Awaited<ReturnType<typeof loadOrgCompositionBenchmark>>["stats"],
  overview: Awaited<ReturnType<typeof loadOrgOverview>>
): PlatformBenchmarkModule | null {
  if (stats.productCount === 0) return null;

  const metrics: PlatformBenchmarkMetric[] = peerRows
    .filter((row) => row.status === "ok" && row.yours != null && row.peerMedian != null)
    .slice(0, 4)
    .map((row) => ({
      metric: row.label,
      brandValue: `${row.yours}%`,
      peerMedian: `${row.peerMedian}%`,
      brandPct: row.yours!,
      peerPct: row.peerMedian!,
    }));

  if (!metrics.length) {
    const fallback = [
      stats.naturalFiberShare != null
        ? {
            metric: "Natural fiber share",
            brandValue: `${stats.naturalFiberShare}%`,
            peerMedian: "—",
            brandPct: stats.naturalFiberShare,
            peerPct: stats.naturalFiberShare,
          }
        : null,
      stats.compositionCoveragePct != null
        ? {
            metric: "Composition complete",
            brandValue: `${stats.compositionCoveragePct}%`,
            peerMedian: "—",
            brandPct: stats.compositionCoveragePct,
            peerPct: stats.compositionCoveragePct,
          }
        : null,
    ].filter(Boolean) as PlatformBenchmarkMetric[];
    if (!fallback.length) return null;
    metrics.push(...fallback);
  }

  const catalogTotal = stats.productCount;
  const catalogReady = overview.readyCount + overview.publishedCount;
  const catalogReadinessPct =
    stats.passportReadyPct ?? (catalogTotal > 0 ? Math.round((catalogReady / catalogTotal) * 100) : 0);

  return {
    metrics,
    catalogReadinessPct,
    catalogReadyCount: catalogReady,
    catalogTotalCount: catalogTotal,
  };
}

function buildForecastFromCohorts(cohorts: ConversionCohortBundle): PlatformForecastPoint[] {
  const natural =
    cohorts.rows.find((row) => row.cohortKey === "silk_fine_naturals")?.index ??
    cohorts.rows.find((row) => row.tone === "up")?.index ??
    0;
  const synthetic =
    cohorts.rows.find((row) => row.cohortKey === "recycled_synthetics")?.index ??
    cohorts.rows.find((row) => row.tone === "down")?.index ??
    0;

  const labels = ["Now", "+6m", "+12m", "+18m", "+24m"];
  return labels.map((label, index) => {
    const naturalStep = natural >= 0 ? natural * 0.12 : natural * 0.08;
    const syntheticStep = synthetic <= 0 ? synthetic * 0.1 : synthetic * 0.06;
    return {
      label,
      linenIndex: Math.round(100 + natural + naturalStep * index),
      polyesterIndex: Math.round(100 + synthetic - Math.abs(syntheticStep) * index),
      isForecast: index > 0,
    };
  });
}

function buildLiveBrief(input: {
  stats: Awaited<ReturnType<typeof loadOrgCompositionBenchmark>>["stats"];
  peerRows: PeerComparisonRow[];
  cohorts: ConversionCohortBundle;
  traceSummary: Awaited<ReturnType<typeof loadCatalogTraceabilitySummary>>;
  overview: Awaited<ReturnType<typeof loadOrgOverview>>;
  supplierGapPct: number | null;
}): PlatformIntelligenceBrief {
  const { stats, peerRows, cohorts, traceSummary, overview, supplierGapPct } = input;
  const naturalPeer = peerRows.find((row) => row.metricKey === "natural_fiber_share");
  const position = naturalPositionLabel(stats.naturalFiberShare, naturalPeer);
  const topCohort = [...cohorts.rows]
    .filter((row) => row.index != null && row.status === "ok")
    .sort((a, b) => (b.index ?? 0) - (a.index ?? 0))[0];
  const linenShare = stats.fiberShares.linen;

  let headline = "Your catalog intelligence is ready.";
  if (topCohort && (topCohort.index ?? 0) >= 8) {
    headline = `${topCohort.label} demand is rising — review where your catalog can capture it.`;
  } else if (position.label === "Strong") {
    headline = "Strong natural-fiber position — focus on evidence gaps before scaling.";
  } else if (overview.issueCount > 0) {
    headline = "Resolve open data issues to unlock passport-ready growth.";
  } else if (traceSummary.avgCompletenessPct < 50) {
    headline = "Traceability gaps limit compliance readiness — prioritize upstream tiers.";
  }

  const summaryParts: string[] = [];
  if (stats.productCount > 0) {
    summaryParts.push(
      `Your workspace tracks ${stats.productCount.toLocaleString()} active products with ${stats.compositionCoveragePct ?? 0}% composition coverage.`
    );
  }
  if (topCohort?.signal) {
    summaryParts.push(`${topCohort.label}: ${topCohort.signal.toLowerCase()}.`);
  }
  if (linenShare != null && linenShare >= 8) {
    summaryParts.push(`Linen represents ${linenShare}% of recorded fiber share in your assortment.`);
  }
  if (supplierGapPct != null && supplierGapPct > 0) {
    summaryParts.push(`${supplierGapPct}% of supplier-linked products still lack verified evidence.`);
  }
  if (overview.issueCount > 0) {
    summaryParts.push(`${overview.issueCount} open issue(s) may block publish-ready passports.`);
  }

  const demandMetric = topCohort?.index != null ? `${topCohort.index >= 0 ? "+" : ""}${topCohort.index}%` : "—";
  const demandTone: "positive" | "negative" | "neutral" =
    topCohort?.tone === "up" ? "positive" : topCohort?.tone === "down" ? "negative" : "neutral";

  return {
    headline,
    summary: summaryParts.join(" ") || "Import products and connect supplier evidence to generate live intelligence.",
    generatedAt: new Date().toISOString(),
    metrics: [
      { label: topCohort?.label || "Material demand", value: demandMetric, tone: demandTone },
      {
        label: "Suppliers missing evidence",
        value: supplierGapPct != null ? `${supplierGapPct}%` : "—",
        tone: supplierGapPct != null && supplierGapPct >= 20 ? "negative" : "neutral",
      },
      { label: "Natural-fiber position", value: position.label, tone: position.tone },
    ],
  };
}

function buildEvidenceSources(input: {
  hasComposition: boolean;
  hasBenchmark: boolean;
  hasCohorts: boolean;
  hasTraceability: boolean;
  hasSuppliers: boolean;
  hasIssues: boolean;
}): PlatformEvidenceSource[] {
  const sources: PlatformEvidenceSource[] = [
    { id: "catalog", label: "Organization product catalog", kind: "catalog" },
  ];
  if (input.hasComposition) {
    sources.push({ id: "composition", label: "Normalized composition fields", kind: "catalog" });
  }
  if (input.hasBenchmark) {
    sources.push({ id: "benchmark", label: "Governed peer benchmark dataset", kind: "benchmark" });
  }
  if (input.hasCohorts) {
    sources.push({ id: "conversion", label: "Conversion cohort signals", kind: "consumer" });
  }
  if (input.hasTraceability) {
    sources.push({ id: "traceability", label: "Supply-chain traceability nodes", kind: "traceability" });
  }
  if (input.hasSuppliers) {
    sources.push({ id: "supplier", label: "Supplier evidence requests", kind: "supplier" });
  }
  if (input.hasIssues) {
    sources.push({ id: "regulatory", label: "Regulatory readiness and issues", kind: "regulatory" });
  }
  return sources;
}

function buildSuggestedQueries(input: {
  stats: Awaited<ReturnType<typeof loadOrgCompositionBenchmark>>["stats"];
  cohorts: ConversionCohortBundle;
  overview: Awaited<ReturnType<typeof loadOrgOverview>>;
}): string[] {
  const queries: string[] = [];
  const topFiber = input.stats.fiberRows[0];
  if (topFiber) {
    queries.push(`Which categories rely most on ${topFiber.label.toLowerCase()}?`);
  }
  const rising = input.cohorts.rows.find((row) => row.tone === "up");
  if (rising) {
    queries.push(`Where can we expand ${rising.label.toLowerCase()} based on demand signals?`);
  }
  if (input.overview.issueCount > 0) {
    queries.push("Which products have blocking issues before publish?");
  }
  if (input.overview.missingCount > 0) {
    queries.push("Which suppliers lack evidence for open requests?");
  }
  queries.push("Show me lower-impact alternatives to polyester in my catalog");
  return queries.slice(0, 3);
}

function emptyLayer(): PlatformIntelligenceLayer {
  return {
    status: "unavailable",
    source: "unavailable",
    intelligenceBrief: null,
    recommendations: [],
    forecast: [],
    benchmark: null,
    confidence: null,
    evidenceSources: [],
    suggestedQueries: [],
  };
}

/** Marketing preview assembled from Customer Zero governed showcase data — not generative AI output. */
export function getPlatformIntelligencePreview(): PlatformIntelligenceLayer {
  const linenCohort = PLATFORM_CONVERSION_COHORTS.find((row) => /linen/i.test(row.cohort));
  const linenDemand = linenCohort?.index?.replace("+", "") || "18";

  const benchmarkMetrics: PlatformBenchmarkMetric[] = PLATFORM_BENCHMARK_PEERS.map(([metric, brand, peer]) => ({
    metric,
    brandValue: brand,
    peerMedian: peer,
    brandPct: parsePct(brand),
    peerPct: parsePct(peer),
  }));

  const catalogTotal = 2000;
  const catalogReady = Math.round((PLATFORM_LIVE_CATALOG.passportReadyPct / 100) * catalogTotal);

  return {
    status: "preview",
    source: "customer_zero_preview",
    intelligenceBrief: {
      headline: "Linen demand is rising — and you’re well positioned.",
      summary:
        "Consumer demand for linen is up across your key markets. Your catalog shows a strong natural-fiber position, but supplier evidence gaps remain before you can fully unlock growth and reduce compliance risk.",
      generatedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      metrics: [
        { label: "Linen demand", value: `+${linenDemand}%`, tone: "positive" },
        { label: "Suppliers missing evidence", value: "28%", tone: "negative" },
        { label: "Natural-fiber position", value: "Strong", tone: "neutral" },
      ],
    },
    recommendations: buildPreviewRecommendations(),
    forecast: buildPreviewForecastSeries(),
    benchmark: {
      metrics: benchmarkMetrics,
      catalogReadinessPct: PLATFORM_LIVE_CATALOG.passportReadyPct,
      catalogReadyCount: catalogReady,
      catalogTotalCount: catalogTotal,
    },
    confidence: {
      scorePct: 87,
      peerSetLabel: "12 comparable brands",
      catalogSize: catalogTotal,
      evidenceCoveragePct: 78,
    },
    evidenceSources: [
      { id: "catalog", label: "Customer Zero catalog", kind: "catalog" },
      { id: "benchmark", label: "Governed peer benchmark dataset", kind: "benchmark" },
      { id: "conversion", label: "Conversion cohort signals", kind: "consumer" },
      { id: "regulatory", label: "Regulatory readiness fields", kind: "regulatory" },
      { id: "traceability", label: "Supply-chain traceability nodes", kind: "traceability" },
      { id: "supplier", label: "Supplier evidence requests", kind: "supplier" },
    ],
    suggestedQueries: [
      "What materials are trending for spring 2027?",
      "Which suppliers lack evidence?",
      "Show me lower-impact alternatives to polyester",
    ],
  };
}

/** Live org intelligence assembled from governed catalog, benchmark, traceability, and decision loaders. */
export async function loadPlatformIntelligenceForOrg(
  client: SupabaseClient,
  organizationId: string,
  slug: string,
  plan: string
): Promise<PlatformIntelligenceLayer> {
  if (!client) return emptyLayer();

  const selection = resolveBenchmarkSegmentSelection({});
  const [composition, decisions, traceSummary, overview, cohorts, suppliersData] = await Promise.all([
    loadOrgCompositionBenchmark(client, organizationId, plan),
    loadDecisionIntelligence(client, organizationId, slug),
    loadCatalogTraceabilitySummary(client, organizationId),
    loadOrgOverview(client, organizationId),
    loadConversionIndexByCohort(client, selection),
    loadOrgSuppliers(client, organizationId),
  ]);

  if (!overview.backendLinked || overview.productCount === 0) {
    return emptyLayer();
  }

  const supplierProducts = suppliersData.suppliers.filter((row) => row.productCount > 0);
  const supplierGapPct =
    supplierProducts.length > 0
      ? Math.round(
          (supplierProducts.filter((row) => row.outstandingCount > 0).length / supplierProducts.length) * 100
        )
      : traceSummary.productCount > 0
        ? Math.max(0, 100 - traceSummary.supplierEvidencePct)
        : null;

  const brief = buildLiveBrief({
    stats: composition.stats,
    peerRows: composition.peerRows,
    cohorts,
    traceSummary,
    overview,
    supplierGapPct,
  });

  const recommendations = decisions.slice(0, 5).map(mapDecisionToRecommendation);
  const benchmark = buildBenchmarkModule(composition.peerRows, composition.stats, overview);
  const forecast = buildForecastFromCohorts(cohorts);

  const governedPeerCount = composition.peerRows.filter((row) => row.status === "ok").length;
  const cohortCount = cohorts.rows.filter((row) => row.status === "ok").length;
  const evidenceCoveragePct = Math.round(
    ((composition.stats.compositionCoveragePct ?? 0) +
      traceSummary.avgCompletenessPct +
      Math.max(0, 100 - Math.min(100, (overview.issueCount / Math.max(overview.productCount, 1)) * 100))) /
      3
  );
  const scorePct = Math.min(
    95,
    Math.round(evidenceCoveragePct * 0.7 + (composition.stats.passportReadyPct ?? 0) * 0.3)
  );

  const peerSample = composition.peerRows.find((row) => row.sampleSize)?.sampleSize;
  const peerSetLabel = governedPeerCount
    ? `${composition.segmentLabel} · ${composition.marketLabel}${peerSample ? ` · n=${peerSample}` : ""}`
    : `${composition.segmentLabel} · ${composition.marketLabel}`;

  return {
    status: "available",
    source: "org_live",
    intelligenceBrief: brief,
    recommendations,
    forecast,
    benchmark,
    confidence: {
      scorePct,
      peerSetLabel,
      catalogSize: overview.productCount,
      evidenceCoveragePct,
    },
    evidenceSources: buildEvidenceSources({
      hasComposition: (composition.stats.compositionCoveragePct ?? 0) > 0,
      hasBenchmark: governedPeerCount > 0,
      hasCohorts: cohortCount > 0,
      hasTraceability: traceSummary.avgCompletenessPct > 0,
      hasSuppliers: suppliersData.summary.total > 0,
      hasIssues: overview.issueCount > 0 || overview.missingCount > 0,
    }),
    suggestedQueries: buildSuggestedQueries({ stats: composition.stats, cohorts, overview }),
  };
}
