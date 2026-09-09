import type { SupabaseClient } from "@supabase/supabase-js";

export type ConsumerIntelligenceResult =
  | {
      status: "ok";
      metricKey: string;
      sampleSize: number;
      methodologyVersion: string;
      privacyClassification: string;
      methodology: string | null;
      payload: Record<string, unknown>;
    }
  | { status: "insufficient"; reason: "Insufficient benchmark data" };

const INSUFFICIENT: ConsumerIntelligenceResult = {
  status: "insufficient",
  reason: "Insufficient benchmark data",
};

/**
 * One-way permitted aggregates only. Never query consumer HQ, never join
 * identifiable INTERTEXE consumer identities, never attach organization_id
 * of a brand to a person.
 */
export type ConsumerIntelligenceFilters = {
  geography?: string | null;
  category?: string | null;
  cohort?: string | null;
};

export async function loadConsumerIntelligenceAggregate(
  client: SupabaseClient,
  metricKey: string,
  filters: ConsumerIntelligenceFilters = {}
): Promise<ConsumerIntelligenceResult> {
  let request = client
    .from("consumer_intelligence_aggregates")
    .select(
      "metric_key, sample_size, min_cohort_size, methodology, methodology_version, privacy_classification, status, payload"
    )
    .eq("metric_key", metricKey)
    .eq("status", "approved")
    .in("privacy_classification", ["aggregate_enterprise", "aggregate_internal"]);
  if (filters.geography) request = request.eq("geography", filters.geography);
  if (filters.category) request = request.eq("category", filters.category);
  if (filters.cohort) request = request.eq("cohort", filters.cohort);

  const { data, error } = await request.order("calculated_at", { ascending: false }).limit(1).maybeSingle();
  if (error || !data) return INSUFFICIENT;
  const sample = data.sample_size ?? 0;
  const min = data.min_cohort_size ?? 50;
  if (sample < min) return INSUFFICIENT;
  return {
    status: "ok",
    metricKey: data.metric_key,
    sampleSize: sample,
    methodologyVersion: data.methodology_version || "unspecified",
    privacyClassification: data.privacy_classification,
    methodology: data.methodology || null,
    payload: (data.payload as Record<string, unknown>) || {},
  };
}
