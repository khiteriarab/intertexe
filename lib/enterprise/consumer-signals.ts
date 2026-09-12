import type { SupabaseClient } from "@supabase/supabase-js";
import { parseCompositionText } from "../material-intelligence/composition";
import { formatCompositionDisplay } from "./display-format";
import { loadConsumerIntelligenceAggregate } from "./consumer-intelligence";

export type SignalProduct = {
  id: string;
  name: string;
  sku: string | null;
  styleCode: string | null;
  category: string | null;
  collection: string | null;
  composition: string | null;
  compositionDisplay: string | null;
  naturalPct: number | null;
  primaryFiber: string | null;
  fibers: Array<{ code: string; label: string; percentage: number | null }>;
  containsPolyester: boolean;
  aboveNaturalThreshold: boolean;
  passportState: string | null;
  imageUrl: string | null;
};

export type ConsumerInsight = {
  id: string;
  tone: "opportunity" | "watch" | "proof";
  eyebrow: string;
  headline: string;
  body: string;
  metricLabel: string;
  metricValue: string;
  source: "governed_aggregate" | "catalog_derived";
  sampleSize: number | null;
  hrefHint: "products" | "benchmarking" | "workflows";
  relatedProductIds: string[];
};

export type CategoryAffinity = {
  category: string;
  productCount: number;
  topFiber: string | null;
  naturalShare: number | null;
};

export type ConsumerLayerPillar = {
  id: string;
  title: string;
  body: string;
  status: "live" | "partial" | "building";
  metric: string | null;
};

export type ConsumerSignalsBundle = {
  products: SignalProduct[];
  insights: ConsumerInsight[];
  affinities: CategoryAffinity[];
  pillars: ConsumerLayerPillar[];
  summary: {
    productCount: number;
    withComposition: number;
    naturalDominantCount: number;
    polyesterCount: number;
    avgNaturalPct: number | null;
    opportunityScore: number | null;
  };
};

const NATURAL_THRESHOLD = 90;

function opportunityScore(input: {
  avgNaturalPct: number | null;
  naturalDominantShare: number | null;
  compositionCoverage: number | null;
  polyesterShare: number | null;
}): number | null {
  const parts = [
    input.avgNaturalPct,
    input.naturalDominantShare,
    input.compositionCoverage,
    input.polyesterShare == null ? null : Math.max(0, 100 - input.polyesterShare * 2),
  ].filter((n): n is number => n != null);
  if (!parts.length) return null;
  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
}

export async function loadConsumerSignals(
  client: SupabaseClient,
  organizationId: string,
  options?: { limit?: number; imageBySku?: Record<string, string>; pilotImages?: PilotImageMaps }
): Promise<ConsumerSignalsBundle> {
  const limit = options?.limit ?? 10;
  const pilotImages = options?.pilotImages || { bySku: options?.imageBySku || {}, byStyle: {} };

  const { data: productRows } = await client
    .from("products")
    .select("id, name, sku, style_code, category, collection, passport_state, last_updated_at")
    .eq("organization_id", organizationId)
    .eq("lifecycle", "active")
    .order("last_updated_at", { ascending: false })
    .limit(40);

  const candidates = productRows || [];
  const ids = candidates.map((p) => p.id);
  const compositions = new Map<string, string>();

  if (ids.length) {
    const { data: fields } = await client
      .from("normalized_fields")
      .select("product_id, normalized_value")
      .eq("organization_id", organizationId)
      .eq("field_key", "composition")
      .in("product_id", ids);
    for (const field of fields || []) {
      if (field.product_id && field.normalized_value) {
        compositions.set(field.product_id, String(field.normalized_value));
      }
    }
  }

  const ranked = [...candidates].sort((a, b) => {
    const aLive = String(a.style_code || "").startsWith("ITX-LIVE") ? 1 : 0;
    const bLive = String(b.style_code || "").startsWith("ITX-LIVE") ? 1 : 0;
    if (aLive !== bLive) return bLive - aLive;
    const aComp = compositions.has(a.id) ? 1 : 0;
    const bComp = compositions.has(b.id) ? 1 : 0;
    return bComp - aComp;
  });

  const products: SignalProduct[] = ranked.slice(0, limit).map((row) => {
    const raw = compositions.get(row.id) || null;
    const parsed = parseCompositionText(raw);
    const naturalPct = parsed.natural_fiber_percentage;
    const fibers = parsed.components.map((c) => ({
      code: c.fiber_code,
      label: c.fiber_name,
      percentage: c.percentage,
    }));
    const containsPolyester = fibers.some((f) => f.code.includes("polyester"));
    return {
      id: row.id,
      name: row.name,
      sku: row.sku,
      styleCode: row.style_code,
      category: row.category,
      collection: row.collection,
      composition: raw,
      compositionDisplay: raw ? formatCompositionDisplay(raw) : null,
      naturalPct,
      primaryFiber: parsed.primary_fiber,
      fibers,
      containsPolyester,
      aboveNaturalThreshold: naturalPct != null && naturalPct >= NATURAL_THRESHOLD,
      passportState: row.passport_state,
      imageUrl: resolvePilotProductImage(row.sku, row.style_code, pilotImages),
    };
  });

  const withComposition = products.filter((p) => p.composition);
  const naturalDominant = products.filter((p) => p.aboveNaturalThreshold);
  const polyesterProducts = products.filter((p) => p.containsPolyester);
  const naturalValues = products.map((p) => p.naturalPct).filter((n): n is number => n != null);
  const avgNaturalPct = naturalValues.length
    ? Math.round((naturalValues.reduce((a, b) => a + b, 0) / naturalValues.length) * 10) / 10
    : null;

  const categoryMap = new Map<string, SignalProduct[]>();
  for (const product of products) {
    const key = product.category || "Uncategorized";
    const list = categoryMap.get(key) || [];
    list.push(product);
    categoryMap.set(key, list);
  }

  const affinities: CategoryAffinity[] = [...categoryMap.entries()]
    .map(([category, rows]) => {
      const fiberCounts = new Map<string, number>();
      const naturals: number[] = [];
      for (const row of rows) {
        if (row.primaryFiber) fiberCounts.set(row.primaryFiber, (fiberCounts.get(row.primaryFiber) || 0) + 1);
        if (row.naturalPct != null) naturals.push(row.naturalPct);
      }
      const topFiber =
        [...fiberCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]?.replace(/_/g, " ") || null;
      return {
        category,
        productCount: rows.length,
        topFiber,
        naturalShare: naturals.length
          ? Math.round((naturals.reduce((a, b) => a + b, 0) / naturals.length) * 10) / 10
          : null,
      };
    })
    .sort((a, b) => b.productCount - a.productCount);

  const insights: ConsumerInsight[] = [];

  const linenAgg = await loadConsumerIntelligenceAggregate(client, "category_linen_preference");
  const naturalAgg = await loadConsumerIntelligenceAggregate(client, "natural_fiber_save_affinity");
  const polyAgg = await loadConsumerIntelligenceAggregate(client, "polyester_alternative_pressure");

  const linenProducts = products.filter((p) => p.fibers.some((f) => f.code.includes("linen")));
  if (linenAgg.status === "ok") {
    const payload = linenAgg.payload || {};
    insights.push({
      id: "linen-category",
      tone: "opportunity",
      eyebrow: "Category preference",
      headline: String(payload.headline || "Consumers searching your category disproportionately select linen"),
      body: String(
        payload.narrative ||
          "Governed market assortment shows linen appearing more often in adjacent categories than baseline apparel."
      ),
      metricLabel: "Market linen density",
      metricValue: payload.value != null ? `${payload.value}%` : "—",
      source: "governed_aggregate",
      sampleSize: linenAgg.sampleSize,
      hrefHint: "products",
      relatedProductIds: linenProducts.map((p) => p.id),
    });
  } else if (linenProducts.length) {
    insights.push({
      id: "linen-catalog",
      tone: "opportunity",
      eyebrow: "Catalog signal",
      headline: "Your assortment already leans into linen where it matters",
      body: `${linenProducts.length} of ${products.length} sampled products list linen. Keep these SKUs visible while governed demand cohorts finish publishing.`,
      metricLabel: "Linen SKUs",
      metricValue: String(linenProducts.length),
      source: "catalog_derived",
      sampleSize: products.length,
      hrefHint: "products",
      relatedProductIds: linenProducts.map((p) => p.id),
    });
  }

  if (naturalAgg.status === "ok") {
    const payload = naturalAgg.payload || {};
    insights.push({
      id: "natural-saves",
      tone: "proof",
      eyebrow: "Natural fiber affinity",
      headline: String(payload.headline || "Products above 90% natural fiber composition receive more saves"),
      body: String(
        payload.narrative ||
          "High-natural composition aligns with the discoverable market shoppers already browse."
      ),
      metricLabel: "Market ≥90% natural",
      metricValue: payload.value != null ? `${payload.value}%` : "—",
      source: "governed_aggregate",
      sampleSize: naturalAgg.sampleSize,
      hrefHint: "benchmarking",
      relatedProductIds: naturalDominant.map((p) => p.id),
    });
  } else if (naturalDominant.length) {
    insights.push({
      id: "natural-catalog",
      tone: "proof",
      eyebrow: "Catalog signal",
      headline: `Products above ${NATURAL_THRESHOLD}% natural fiber lead your sample`,
      body: `${naturalDominant.length} of ${products.length} products clear the ${NATURAL_THRESHOLD}% natural threshold — the same bar INTERTEXE uses for high-natural affinity.`,
      metricLabel: `≥${NATURAL_THRESHOLD}% natural`,
      metricValue: `${naturalDominant.length}/${products.length}`,
      source: "catalog_derived",
      sampleSize: products.length,
      hrefHint: "benchmarking",
      relatedProductIds: naturalDominant.map((p) => p.id),
    });
  }

  if (polyAgg.status === "ok") {
    const payload = polyAgg.payload || {};
    insights.push({
      id: "polyester-alts",
      tone: "watch",
      eyebrow: "Alternative seeking",
      headline: String(payload.headline || "Shoppers frequently seek alternatives after encountering polyester"),
      body: String(
        payload.narrative ||
          "Polyester is scarce in the discoverable mix, so blends sit next to abundant natural-fiber alternatives."
      ),
      metricLabel: "Market polyester share",
      metricValue: payload.value != null ? `${payload.value}%` : "—",
      source: "governed_aggregate",
      sampleSize: polyAgg.sampleSize,
      hrefHint: "workflows",
      relatedProductIds: polyesterProducts.map((p) => p.id),
    });
  } else if (polyesterProducts.length) {
    insights.push({
      id: "polyester-catalog",
      tone: "watch",
      eyebrow: "Catalog signal",
      headline: "Polyester blends are the minority in your sample",
      body: `${polyesterProducts.length} products contain polyester. Review whether natural-fiber alternatives should be linked in passport or merchandising workflows.`,
      metricLabel: "Polyester SKUs",
      metricValue: String(polyesterProducts.length),
      source: "catalog_derived",
      sampleSize: products.length,
      hrefHint: "workflows",
      relatedProductIds: polyesterProducts.map((p) => p.id),
    });
  }

  const compositionCoverage =
    products.length > 0 ? Math.round((withComposition.length / products.length) * 1000) / 10 : null;
  const naturalDominantShare =
    products.length > 0 ? Math.round((naturalDominant.length / products.length) * 1000) / 10 : null;
  const polyesterShare =
    products.length > 0 ? Math.round((polyesterProducts.length / products.length) * 1000) / 10 : null;

  const uniqueBrands = new Set(products.map((p) => p.collection).filter(Boolean));
  const uniqueCategories = new Set(products.map((p) => p.category).filter(Boolean));
  const governedInsightCount = insights.filter((i) => i.source === "governed_aggregate").length;
  const discoveryAgg = await loadConsumerIntelligenceAggregate(client, "category_discovery_breadth");

  const pillars: ConsumerLayerPillar[] = [
    {
      id: "material_preference",
      title: "Material preference signals",
      body: "Fiber tilt, natural share, and alternative-seeking pressure from governed assortments — not guessed competitor data.",
      status: governedInsightCount >= 2 ? "live" : insights.length ? "partial" : "building",
      metric: governedInsightCount ? `${governedInsightCount} governed signals` : `${insights.length} catalog signals`,
    },
    {
      id: "product_discovery",
      title: "Product discovery data",
      body: "Category concentration and market breadth show where shoppers encounter your materials in the discoverable mix.",
      status: discoveryAgg.status === "ok" ? "live" : uniqueCategories.size >= 3 ? "partial" : "building",
      metric:
        discoveryAgg.status === "ok"
          ? `${discoveryAgg.payload?.value ?? "—"} categories active`
          : `${uniqueCategories.size} categories in sample`,
    },
    {
      id: "user_behavior",
      title: "Direct user behavior",
      body: "Scan and save cohorts feed approved aggregates only. INTERTEXE never attaches shopper identity to your brand org.",
      status: governedInsightCount ? "partial" : "building",
      metric: governedInsightCount ? `n≥${insights[0]?.sampleSize ?? 50} cohorts` : "Awaiting cohort publish",
    },
    {
      id: "cultural_relevance",
      title: "Cultural relevance",
      body: "Market assortment reflects how natural fibers and category codes show up in culture-facing retail discovery.",
      status: uniqueCategories.size >= 4 ? "partial" : "building",
      metric: `${uniqueCategories.size} category codes`,
    },
    {
      id: "brand_recognition",
      title: "Brand recognition context",
      body: "Live catalog brands anchor how material intelligence reads against recognizable labels in the INTERTEXE market graph.",
      status: uniqueBrands.size >= 5 ? "partial" : "building",
      metric: `${uniqueBrands.size} brands in pilot`,
    },
    {
      id: "intelligence_lab",
      title: "Intelligence testing ground",
      body: "Every live SKU runs through ontology parsing, normalization, and passport readiness — your compliance stack validates on real material truth.",
      status: withComposition.length === products.length && products.length >= 5 ? "live" : "partial",
      metric: `${withComposition.length}/${products.length} parsed compositions`,
    },
  ];

  return {
    products,
    insights,
    affinities,
    pillars,
    summary: {
      productCount: products.length,
      withComposition: withComposition.length,
      naturalDominantCount: naturalDominant.length,
      polyesterCount: polyesterProducts.length,
      avgNaturalPct,
      opportunityScore: opportunityScore({
        avgNaturalPct,
        naturalDominantShare,
        compositionCoverage,
        polyesterShare,
      }),
    },
  };
}

export type PilotImageMaps = {
  bySku: Record<string, string>;
  byStyle: Record<string, string>;
};

export function pilotImageMaps(
  rows: Array<{ sku?: string; style?: string; image_url?: string | null }>
): PilotImageMaps {
  const bySku: Record<string, string> = {};
  const byStyle: Record<string, string> = {};
  for (const row of rows) {
    if (!row.image_url) continue;
    if (row.sku) bySku[row.sku] = row.image_url;
    if (row.style) byStyle[row.style] = row.image_url;
  }
  return { bySku, byStyle };
}

/** @deprecated Use pilotImageMaps + resolvePilotProductImage for style_code fallback. */
export function imageMapFromLiveFixture(
  rows: Array<{ sku?: string; image_url?: string | null }>
): Record<string, string> {
  return pilotImageMaps(rows).bySku;
}

export function resolvePilotProductImage(
  sku: string | null | undefined,
  styleCode: string | null | undefined,
  maps: PilotImageMaps
): string | null {
  if (sku && maps.bySku[sku]) return maps.bySku[sku];
  if (styleCode && maps.byStyle[styleCode]) return maps.byStyle[styleCode];
  return null;
}
