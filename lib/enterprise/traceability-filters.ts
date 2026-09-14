import type { SupabaseClient } from "@supabase/supabase-js";

const SUPPLY_CHAIN_STAGE_DEFS = [
  { id: "raw_material", tier: 4, kind: "tier" as const },
  { id: "processing", tier: 3, kind: "tier" as const },
  { id: "fabric_mill", tier: 2, kind: "tier" as const },
  { id: "garment_assembly", tier: 1, kind: "tier" as const },
  { id: "product", tier: 0, kind: "product" as const },
  { id: "passport", tier: -1, kind: "passport" as const },
];

export type TraceabilityPeriod = "12m" | "90d" | "30d" | "all";

export function parseTraceabilityPeriod(value?: string | null): TraceabilityPeriod {
  if (value === "90d" || value === "30d" || value === "all") return value;
  return "12m";
}

export function priorPeriodCutoff(period: TraceabilityPeriod): Date | null {
  const current = periodCutoff(period);
  if (!current) return null;
  const now = Date.now();
  const day = 86400000;
  if (period === "30d") return new Date(now - 60 * day);
  if (period === "90d") return new Date(now - 180 * day);
  if (period === "12m") return new Date(now - 730 * day);
  return null;
}

export function periodCutoff(period: TraceabilityPeriod): Date | null {
  const now = Date.now();
  const day = 86400000;
  if (period === "30d") return new Date(now - 30 * day);
  if (period === "90d") return new Date(now - 90 * day);
  if (period === "12m") return new Date(now - 365 * day);
  return null;
}

function normalizeCountryCode(value: string | null | undefined): string | null {
  if (!value) return null;
  const raw = String(value).trim();
  if (raw.length === 2) return raw.toUpperCase();
  const lower = raw.toLowerCase();
  const aliases: Record<string, string> = {
    portugal: "PT",
    italy: "IT",
    turkey: "TR",
    india: "IN",
    spain: "ES",
    france: "FR",
    germany: "DE",
    china: "CN",
  };
  return aliases[lower] || null;
}

function tierKnown(
  productNodes: Array<{ tier: number; country_code?: string | null; facility_name?: string | null }>,
  tier: number,
  hasTier1Origin: boolean
): boolean {
  if (tier === 1) {
    return hasTier1Origin || productNodes.some((n) => n.tier === 1 && (n.country_code || n.facility_name));
  }
  return productNodes.some((n) => n.tier === tier && (n.country_code || n.facility_name));
}

export function productHasSupplyChainStage(
  stageId: string,
  productNodes: Array<{ tier: number; country_code?: string | null; facility_name?: string | null }>,
  hasTier1Origin: boolean,
  hasPassport: boolean,
  knownTierCount: number,
  completenessPct: number
): boolean {
  const stage = SUPPLY_CHAIN_STAGE_DEFS.find((s) => s.id === stageId);
  if (!stage) return false;
  if (stage.kind === "passport") return hasPassport;
  if (stage.kind === "product") return knownTierCount >= 2 || completenessPct >= 25;
  if (stage.tier === 1) return tierKnown(productNodes, 1, hasTier1Origin);
  if (stage.tier > 1) return tierKnown(productNodes, stage.tier, false);
  return false;
}

export function productMissingStages(
  productNodes: Array<{ tier: number; country_code?: string | null; facility_name?: string | null }>,
  hasTier1Origin: boolean,
  hasPassport: boolean,
  knownTierCount: number,
  completenessPct: number
): string[] {
  return SUPPLY_CHAIN_STAGE_DEFS.filter(
    (stage) =>
      !productHasSupplyChainStage(
        stage.id,
        productNodes,
        hasTier1Origin,
        hasPassport,
        knownTierCount,
        completenessPct
      )
  ).map((stage) => stage.id);
}

type TraceabilityContext = {
  nodesByProduct: Map<string, Array<{ tier: number; country_code?: string | null; facility_name?: string | null }>>;
  originByProduct: Map<string, string>;
  passportProducts: Set<string>;
};

async function loadTraceabilityContext(
  client: SupabaseClient,
  organizationId: string
): Promise<TraceabilityContext> {
  const [{ data: nodes }, { data: originFields }, { data: passports }] = await Promise.all([
    client
      .from("supply_chain_nodes")
      .select("product_id, tier, country_code, facility_name")
      .eq("organization_id", organizationId),
    client
      .from("normalized_fields")
      .select("product_id, field_key, normalized_value")
      .eq("organization_id", organizationId)
      .in("field_key", ["manufacturing_country", "country_of_origin"]),
    client.from("passports").select("product_id, state").eq("organization_id", organizationId),
  ]);

  const nodesByProduct = new Map<string, NonNullable<typeof nodes>>();
  for (const node of nodes || []) {
    const list = nodesByProduct.get(node.product_id) || [];
    list.push(node);
    nodesByProduct.set(node.product_id, list);
  }
  const originByProduct = new Map<string, string>();
  for (const field of originFields || []) {
    if (field.product_id && field.normalized_value) {
      originByProduct.set(field.product_id, String(field.normalized_value));
    }
  }
  const passportProducts = new Set((passports || []).map((p) => p.product_id).filter(Boolean) as string[]);

  return { nodesByProduct, originByProduct, passportProducts };
}

function productCountryCodes(
  productId: string,
  ctx: TraceabilityContext
): string[] {
  const productNodes = ctx.nodesByProduct.get(productId) || [];
  const codes: string[] = [];
  for (const tier of [4, 3, 2, 1]) {
    const node = productNodes.find((n) => n.tier === tier && n.country_code);
    const code = normalizeCountryCode(node?.country_code);
    if (code && !codes.includes(code)) codes.push(code);
  }
  if (codes.length === 0 && ctx.originByProduct.has(productId)) {
    const code = normalizeCountryCode(ctx.originByProduct.get(productId));
    if (code) codes.push(code);
  }
  return codes;
}

function productMetrics(
  productId: string,
  passportState: string | null | undefined,
  ctx: TraceabilityContext
) {
  const productNodes = ctx.nodesByProduct.get(productId) || [];
  const hasTier1Origin = ctx.originByProduct.has(productId);
  const knownTiers = new Set<number>();
  if (tierKnown(productNodes, 1, hasTier1Origin)) knownTiers.add(1);
  for (const n of productNodes) {
    if (n.country_code || n.facility_name) knownTiers.add(n.tier);
  }
  const completenessPct = Math.round((knownTiers.size / 4) * 100);
  const hasPassport =
    ctx.passportProducts.has(productId) ||
    ["published", "ready", "update_required"].includes(String(passportState || ""));
  return { productNodes, hasTier1Origin, knownTiers, completenessPct, hasPassport };
}

/** Products missing a supply-chain stage (focus) or matching an origin country code. */
export async function resolveTraceabilityFilterProductIds(
  client: SupabaseClient,
  organizationId: string,
  filters: { focus?: string; origin?: string }
): Promise<string[]> {
  const focus = filters.focus?.trim();
  const origin = filters.origin?.trim().toUpperCase();
  if (!focus && !origin) return [];

  const [{ data: products }, ctx] = await Promise.all([
    client
      .from("products")
      .select("id, passport_state")
      .eq("organization_id", organizationId)
      .eq("lifecycle", "active"),
    loadTraceabilityContext(client, organizationId),
  ]);

  const ids: string[] = [];
  for (const product of products || []) {
    if (origin) {
      const codes = productCountryCodes(product.id, ctx);
      if (!codes.includes(origin)) continue;
    }
    if (focus) {
      const metrics = productMetrics(product.id, product.passport_state, ctx);
      if (
        productHasSupplyChainStage(
          focus,
          metrics.productNodes,
          metrics.hasTier1Origin,
          metrics.hasPassport,
          metrics.knownTiers.size,
          metrics.completenessPct
        )
      ) {
        continue;
      }
    }
    ids.push(product.id);
  }
  return ids;
}

export function computeMissingStagesForProduct(
  productId: string,
  passportState: string | null | undefined,
  ctx: TraceabilityContext
): string[] {
  const metrics = productMetrics(productId, passportState, ctx);
  return productMissingStages(
    metrics.productNodes,
    metrics.hasTier1Origin,
    metrics.hasPassport,
    metrics.knownTiers.size,
    metrics.completenessPct
  );
}

export { loadTraceabilityContext, productCountryCodes, productMetrics, normalizeCountryCode, tierKnown };
