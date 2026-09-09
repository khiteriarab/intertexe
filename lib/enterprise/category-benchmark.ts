import type { SupabaseClient } from "@supabase/supabase-js";
import type { BenchmarkSegmentSelection } from "./benchmark-segments";
import { loadCategoryConversionIndex, type ConversionCohortRow } from "./conversion-cohorts";

export type CategoryBenchmarkRow = {
  category: string;
  total: number;
  published: number;
  ready: number;
  incomplete: number;
  openIssues: number;
  conversionIndex: number | null;
  conversionStatus: "ok" | "insufficient";
  materialCohorts: ConversionCohortRow[];
};

export type CategoryBenchmarkBundle = {
  rows: CategoryBenchmarkRow[];
  selection: BenchmarkSegmentSelection;
};

type OrgCategoryRow = {
  category: string;
  total: number;
  published: number;
  ready: number;
  incomplete: number;
  openIssues: number;
};

function readCategoryIndex(payload: Record<string, unknown>): number | null {
  const raw = payload.index ?? payload.value;
  if (raw == null || raw === "") return null;
  const num = Number(raw);
  return Number.isFinite(num) ? Math.round(num * 10) / 10 : null;
}

/** Category passport stats plus governed conversion index and material cohort drill-down. */
export async function loadCategoryBenchmarkDrilldown(
  client: SupabaseClient,
  selection: BenchmarkSegmentSelection,
  categoryRows: OrgCategoryRow[]
): Promise<CategoryBenchmarkBundle> {
  const { data: categoryIndexes } = await client
    .from("consumer_intelligence_aggregates")
    .select("category, sample_size, min_cohort_size, payload")
    .eq("metric_key", "category_conversion_index")
    .eq("status", "approved")
    .eq("geography", selection.geography)
    .in("privacy_classification", ["aggregate_enterprise", "aggregate_internal"])
    .is("cohort", null);

  const indexByCategory = new Map<string, { index: number | null; status: "ok" | "insufficient" }>();
  for (const row of categoryIndexes || []) {
    const category = String(row.category || "").trim();
    if (!category) continue;
    const sampleSize = row.sample_size as number | null;
    const minSize = (row.min_cohort_size as number | null) ?? 50;
    const payload = (row.payload as Record<string, unknown>) || {};
    if (sampleSize != null && sampleSize < minSize) {
      indexByCategory.set(category, { index: null, status: "insufficient" });
      continue;
    }
    const index = readCategoryIndex(payload);
    indexByCategory.set(category, {
      index,
      status: index != null ? "ok" : "insufficient",
    });
  }

  const rows: CategoryBenchmarkRow[] = [];
  for (const row of categoryRows) {
    const normalizedCategory = row.category.trim();
    const lookupKey = normalizedCategory.toLowerCase();
    const governed =
      indexByCategory.get(normalizedCategory) ||
      indexByCategory.get(lookupKey) ||
      [...indexByCategory.entries()].find(([key]) => key.toLowerCase() === lookupKey)?.[1];

    const materialCohorts = await loadCategoryConversionIndex(client, selection, normalizedCategory);

    rows.push({
      category: normalizedCategory,
      total: row.total,
      published: row.published,
      ready: row.ready,
      incomplete: row.incomplete,
      openIssues: row.openIssues,
      conversionIndex: governed?.index ?? null,
      conversionStatus: governed?.status ?? "insufficient",
      materialCohorts,
    });
  }

  return { rows, selection };
}
