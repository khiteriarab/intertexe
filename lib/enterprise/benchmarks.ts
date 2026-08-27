import { getEnterpriseServiceClient } from "./client";

export type BenchmarkQuery = {
  metricKey: string;
  category?: string | null;
  market?: string | null;
  plan?: string | null;
};

export type BenchmarkResult =
  | { status: "ok"; value: number; sampleSize: number; methodology: string }
  | { status: "insufficient"; reason: "Insufficient benchmark data" };

type DatasetRow = {
  status: string;
  sample_size: number | null;
  min_sample_size: number;
  provenance: string | null;
  aggregation_rules: string | null;
  median: number | null;
};

const INSUFFICIENT: BenchmarkResult = { status: "insufficient", reason: "Insufficient benchmark data" };

/** Reads only approved aggregate datasets. Never query customer organization tables here. */
export function evaluateBenchmarkDataset(row: DatasetRow | null): BenchmarkResult {
  if (!row || row.status !== "approved") {
    return INSUFFICIENT;
  }
  const sample = row.sample_size ?? 0;
  if (sample < row.min_sample_size || row.median == null) {
    return INSUFFICIENT;
  }
  return {
    status: "ok",
    value: Number(row.median),
    sampleSize: sample,
    methodology: [row.provenance, row.aggregation_rules].filter(Boolean).join(" · "),
  };
}

export async function loadGovernedBenchmark(query: BenchmarkQuery): Promise<BenchmarkResult> {
  const supabase = getEnterpriseServiceClient();
  if (!supabase) return INSUFFICIENT;

  let request = supabase
    .from("benchmark_datasets")
    .select("id, status, sample_size, min_sample_size, provenance, aggregation_rules, category, market")
    .eq("status", "approved");
  if (query.category) request = request.eq("category", query.category);
  if (query.market) request = request.eq("market", query.market);

  const { data: datasets, error } = await request.limit(20);
  if (error || !datasets?.length) return INSUFFICIENT;

  const dataset = datasets[0];
  if (query.plan) {
    const { count } = await supabase
      .from("benchmark_permissions")
      .select("id", { count: "exact", head: true })
      .eq("dataset_id", dataset.id);
    if ((count || 0) > 0) {
      const { data: perm } = await supabase
        .from("benchmark_permissions")
        .select("id")
        .eq("dataset_id", dataset.id)
        .eq("plan", query.plan)
        .maybeSingle();
      if (!perm) return INSUFFICIENT;
    }
  }

  const { data: metric } = await supabase
    .from("benchmark_metrics")
    .select("median")
    .eq("dataset_id", dataset.id)
    .eq("metric_key", query.metricKey)
    .maybeSingle();

  return evaluateBenchmarkDataset({
    status: dataset.status,
    sample_size: dataset.sample_size,
    min_sample_size: dataset.min_sample_size ?? 5,
    provenance: dataset.provenance,
    aggregation_rules: dataset.aggregation_rules,
    median: metric?.median ?? null,
  });
}
