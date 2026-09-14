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

function buildForecastSeries(): PlatformForecastPoint[] {
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
    forecast: buildForecastSeries(),
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

/** Placeholder for authenticated org intelligence — returns unavailable until services are wired. */
export async function loadPlatformIntelligenceForOrg(): Promise<PlatformIntelligenceLayer> {
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
