import type { SupabaseClient } from "@supabase/supabase-js";
import type { BenchmarkSegmentSelection } from "./benchmark-segments";

export type ConversionCohortRow = {
  cohortKey: string;
  label: string;
  index: number | null;
  tone: "up" | "down" | "neutral";
  signal: string;
  sampleSize: number | null;
  status: "ok" | "insufficient";
};

export type ConversionCohortBundle = {
  rows: ConversionCohortRow[];
  methodology: string | null;
  marketLabel: string;
  segmentLabel: string;
};

const MATERIAL_COHORTS: Array<{ key: string; label: string }> = [
  { key: "silk_fine_naturals", label: "Silk & fine naturals" },
  { key: "cotton_basics", label: "Cotton basics" },
  { key: "recycled_synthetics", label: "Recycled synthetics" },
  { key: "wool_outerwear", label: "Wool outerwear" },
];

function toneForIndex(index: number | null): "up" | "down" | "neutral" {
  if (index == null) return "neutral";
  if (index > 0) return "up";
  if (index < 0) return "down";
  return "neutral";
}

function signalForIndex(index: number | null, sampleSize: number | null, minSize: number): string {
  if (sampleSize != null && sampleSize < minSize) return "Insufficient peer sample";
  if (index == null) return "Insufficient peer sample";
  if (index >= 10) return "Outperforming peer median";
  if (index <= -8) return "Under index vs segment";
  if (index > 0) return "Above peer median";
  if (index < 0) return "Below peer median";
  return "In line with peer median";
}

function readIndex(payload: Record<string, unknown>): number | null {
  const raw = payload.index ?? payload.value;
  if (raw == null || raw === "") return null;
  const num = Number(raw);
  return Number.isFinite(num) ? Math.round(num * 10) / 10 : null;
}

/** Governed conversion index rows by material cohort for a market + peer segment. */
export async function loadConversionIndexByCohort(
  client: SupabaseClient,
  selection: BenchmarkSegmentSelection
): Promise<ConversionCohortBundle> {
  const { data, error } = await client
    .from("consumer_intelligence_aggregates")
    .select(
      "cohort, sample_size, min_cohort_size, methodology, payload, status, privacy_classification"
    )
    .eq("metric_key", "conversion_index")
    .eq("status", "approved")
    .eq("geography", selection.geography)
    .eq("category", selection.peerSegment)
    .in("privacy_classification", ["aggregate_enterprise", "aggregate_internal"])
    .in(
      "cohort",
      MATERIAL_COHORTS.map((row) => row.key)
    );

  if (error) {
    return {
      rows: MATERIAL_COHORTS.map((cohort) => ({
        cohortKey: cohort.key,
        label: cohort.label,
        index: null,
        tone: "neutral" as const,
        signal: "Insufficient peer sample",
        sampleSize: null,
        status: "insufficient" as const,
      })),
      methodology: null,
      marketLabel: selection.marketLabel,
      segmentLabel: selection.segmentLabel,
    };
  }

  const byCohort = new Map(
    (data || []).map((row) => [
      String(row.cohort || ""),
      {
        sampleSize: row.sample_size as number | null,
        minSize: (row.min_cohort_size as number | null) ?? 50,
        methodology: row.methodology as string | null,
        payload: (row.payload as Record<string, unknown>) || {},
      },
    ])
  );

  let methodology: string | null = null;
  const rows: ConversionCohortRow[] = MATERIAL_COHORTS.map((cohort) => {
    const hit = byCohort.get(cohort.key);
    if (!hit) {
      return {
        cohortKey: cohort.key,
        label: cohort.label,
        index: null,
        tone: "neutral",
        signal: "Insufficient peer sample",
        sampleSize: null,
        status: "insufficient",
      };
    }
    if (!methodology && hit.methodology) methodology = hit.methodology;
    const sampleSize = hit.sampleSize;
    const minSize = hit.minSize;
    const label = String(hit.payload.label || cohort.label);
    if (sampleSize != null && sampleSize < minSize) {
      return {
        cohortKey: cohort.key,
        label,
        index: null,
        tone: "neutral",
        signal: "Insufficient peer sample",
        sampleSize,
        status: "insufficient",
      };
    }
    const index = readIndex(hit.payload);
    return {
      cohortKey: cohort.key,
      label,
      index,
      tone: toneForIndex(index),
      signal: String(hit.payload.signal || signalForIndex(index, sampleSize, minSize)),
      sampleSize,
      status: index != null ? "ok" : "insufficient",
    };
  });

  return {
    rows,
    methodology,
    marketLabel: selection.marketLabel,
    segmentLabel: selection.segmentLabel,
  };
}

export async function loadCategoryConversionIndex(
  client: SupabaseClient,
  selection: BenchmarkSegmentSelection,
  category: string
): Promise<ConversionCohortRow[]> {
  const { data, error } = await client
    .from("consumer_intelligence_aggregates")
    .select("cohort, sample_size, min_cohort_size, payload")
    .eq("metric_key", "category_conversion_index")
    .eq("status", "approved")
    .eq("geography", selection.geography)
    .eq("category", category)
    .in("privacy_classification", ["aggregate_enterprise", "aggregate_internal"]);

  if (error || !data?.length) return [];

  return data
    .map((row) => {
      const payload = (row.payload as Record<string, unknown>) || {};
      const sampleSize = row.sample_size as number | null;
      const minSize = (row.min_cohort_size as number | null) ?? 50;
      const index = readIndex(payload);
      const label = String(payload.label || row.cohort || "Cohort");
      if (sampleSize != null && sampleSize < minSize) {
        return {
          cohortKey: String(row.cohort || label),
          label,
          index: null,
          tone: "neutral" as const,
          signal: "Insufficient peer sample",
          sampleSize,
          status: "insufficient" as const,
        };
      }
      return {
        cohortKey: String(row.cohort || label),
        label,
        index,
        tone: toneForIndex(index),
        signal: String(payload.signal || signalForIndex(index, sampleSize, minSize)),
        sampleSize,
        status: index != null ? ("ok" as const) : ("insufficient" as const),
      };
    })
    .sort((a, b) => Math.abs(b.index ?? 0) - Math.abs(a.index ?? 0));
}
