import type { SupabaseClient } from "@supabase/supabase-js";
import { parseCompositionText, isNaturalFiber } from "../material-intelligence/composition";
import { loadGovernedBenchmark } from "./benchmarks";
import { loadOrgOverview } from "./queries";

export type FiberShareRow = {
  fiberCode: string;
  label: string;
  sharePct: number;
  productCount: number;
  color: string;
};

export type PeerComparisonRow = {
  metricKey: string;
  label: string;
  yours: number | null;
  peerMedian: number | null;
  delta: number | null;
  sampleSize: number | null;
  status: "ok" | "insufficient" | "no_catalog";
  methodology?: string;
};

const FIBER_COLORS: Record<string, string> = {
  cotton: "#d9cbb8",
  polyester: "#7d9bb8",
  viscose: "#9c7b8b",
  wool: "#c4a574",
  linen: "#b08968",
  silk: "#c9b8d4",
  polyamide: "#6b8f9c",
  elastane: "#a8b5c4",
  cashmere: "#c9b8a8",
  other: "#d4cdc4",
};

const PEER_METRICS: Array<{ key: string; label: string; compute: (stats: CatalogCompositionStats) => number | null }> = [
  { key: "natural_fiber_share", label: "Natural fiber share", compute: (s) => s.naturalFiberShare },
  { key: "synthetic_share", label: "Synthetic share", compute: (s) => s.syntheticShare },
  { key: "cotton_share", label: "Cotton assortment", compute: (s) => s.fiberShares.cotton ?? null },
  { key: "wool_share", label: "Wool assortment", compute: (s) => s.fiberShares.wool ?? null },
  { key: "linen_share", label: "Linen assortment", compute: (s) => s.fiberShares.linen ?? null },
  { key: "silk_share", label: "Silk assortment", compute: (s) => s.fiberShares.silk ?? null },
  { key: "material_data_complete", label: "Complete material data", compute: (s) => s.compositionCoveragePct },
  { key: "passport_ready_share", label: "Passport-ready share", compute: (s) => s.passportReadyPct },
];

export type CatalogCompositionStats = {
  productCount: number;
  withComposition: number;
  compositionCoveragePct: number | null;
  naturalFiberShare: number | null;
  syntheticShare: number | null;
  passportReadyPct: number | null;
  fiberShares: Record<string, number>;
  fiberRows: FiberShareRow[];
};

function colorForFiber(code: string): string {
  return FIBER_COLORS[code] || FIBER_COLORS.other;
}

function computeCatalogComposition(
  products: Array<{ id: string; passport_state?: string | null }>,
  compositions: Map<string, string>,
  overview: Awaited<ReturnType<typeof loadOrgOverview>>
): CatalogCompositionStats {
  const productCount = products.length;
  let withComposition = 0;
  const fiberWeight = new Map<string, { totalPct: number; count: number }>();

  for (const product of products) {
    const raw = compositions.get(product.id);
    if (!raw?.trim()) continue;
    withComposition += 1;
    const parsed = parseCompositionText(raw);
    for (const component of parsed.components) {
      if (component.percentage == null) continue;
      const bucket = fiberWeight.get(component.fiber_code) || { totalPct: 0, count: 0 };
      bucket.totalPct += component.percentage;
      bucket.count += 1;
      fiberWeight.set(component.fiber_code, bucket);
    }
  }

  const fiberShares: Record<string, number> = {};
  let naturalTotal = 0;
  let syntheticTotal = 0;
  let fiberDenominator = 0;

  for (const [code, bucket] of fiberWeight.entries()) {
    const avg = bucket.totalPct / bucket.count;
    fiberShares[code] = Math.round(avg * 10) / 10;
    fiberDenominator += avg;
    if (isNaturalFiber(code)) naturalTotal += avg;
    else syntheticTotal += avg;
  }

  const naturalFiberShare =
    fiberDenominator > 0 ? Math.round((naturalTotal / fiberDenominator) * 1000) / 10 : null;
  const syntheticShare =
    fiberDenominator > 0 ? Math.round((syntheticTotal / fiberDenominator) * 1000) / 10 : null;

  const fiberRows: FiberShareRow[] = Object.entries(fiberShares)
    .map(([fiberCode, sharePct]) => ({
      fiberCode,
      label: fiberCode.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      sharePct,
      productCount: fiberWeight.get(fiberCode)?.count || 0,
      color: colorForFiber(fiberCode),
    }))
    .sort((a, b) => b.sharePct - a.sharePct);

  const passportReady = overview.readyCount + overview.publishedCount;

  return {
    productCount,
    withComposition,
    compositionCoveragePct:
      productCount > 0 ? Math.round((withComposition / productCount) * 1000) / 10 : null,
    naturalFiberShare,
    syntheticShare,
    passportReadyPct: productCount > 0 ? Math.round((passportReady / productCount) * 1000) / 10 : null,
    fiberShares,
    fiberRows,
  };
}

export async function loadOrgCompositionBenchmark(
  client: SupabaseClient,
  organizationId: string,
  plan: string,
  market = "eu_fashion"
): Promise<{
  stats: CatalogCompositionStats;
  peerRows: PeerComparisonRow[];
  market: string;
}> {
  const [{ data: products }, overview] = await Promise.all([
    client
      .from("products")
      .select("id, passport_state")
      .eq("organization_id", organizationId)
      .eq("lifecycle", "active"),
    loadOrgOverview(client, organizationId),
  ]);

  const rows = products || [];
  const ids = rows.map((p) => p.id);
  const compositions = new Map<string, string>();

  if (ids.length) {
    const { data: fields } = await client
      .from("normalized_fields")
      .select("product_id, normalized_value")
      .eq("organization_id", organizationId)
      .eq("field_key", "composition")
      .in("product_id", ids);
    for (const field of fields || []) {
      if (field.product_id) compositions.set(field.product_id, String(field.normalized_value || ""));
    }
  }

  const stats = computeCatalogComposition(rows, compositions, overview);

  const peerRows: PeerComparisonRow[] = [];
  for (const metric of PEER_METRICS) {
    const yours = stats.productCount > 0 ? metric.compute(stats) : null;
    const governed = await loadGovernedBenchmark(client, {
      metricKey: metric.key,
      market,
      plan,
      category: "apparel",
    });
    if (governed.status === "ok") {
      peerRows.push({
        metricKey: metric.key,
        label: metric.label,
        yours,
        peerMedian: governed.value,
        delta: yours != null ? Math.round((yours - governed.value) * 10) / 10 : null,
        sampleSize: governed.sampleSize,
        status: "ok",
        methodology: governed.methodology,
      });
    } else {
      peerRows.push({
        metricKey: metric.key,
        label: metric.label,
        yours,
        peerMedian: null,
        delta: null,
        sampleSize: null,
        status: stats.productCount === 0 ? "no_catalog" : "insufficient",
      });
    }
  }

  return { stats, peerRows, market };
}
