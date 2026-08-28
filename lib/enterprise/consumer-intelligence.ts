import type { SupabaseClient } from "@supabase/supabase-js";

export type ConsumerIntelligenceResult =
  | {
      status: "ok";
      metricKey: string;
      sampleSize: number;
      methodologyVersion: string;
      privacyClassification: string;
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
export async function loadConsumerIntelligenceAggregate(
  client: SupabaseClient,
  metricKey: string
): Promise<ConsumerIntelligenceResult> {
  const { data, error } = await client
    .from("consumer_intelligence_aggregates")
    .select(
      "metric_key, sample_size, min_cohort_size, methodology_version, privacy_classification, status"
    )
    .eq("metric_key", metricKey)
    .eq("status", "approved")
    .in("privacy_classification", ["aggregate_enterprise", "aggregate_internal"])
    .limit(1)
    .maybeSingle();
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
  };
}
