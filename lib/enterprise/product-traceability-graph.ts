import type { ProductTraceability, TraceabilityTierRow } from "./traceability";

export type TraceGraphNodeKind =
  | "raw_material"
  | "processing"
  | "supplier"
  | "manufacturing"
  | "product";

export type TraceGraphNodeStatus = "verified" | "incomplete" | "product";

export type TraceGraphNode = {
  id: string;
  kind: TraceGraphNodeKind;
  label: string;
  role: string;
  status: TraceGraphNodeStatus;
  tier: number | null;
  facility: string | null;
  country: string | null;
  supplierName: string | null;
  evidenceStatus: string | null;
  confidence: number | null;
  verificationLabel: string;
};

export type TraceGraphEdge = {
  id: string;
  fromId: string;
  toId: string;
  verified: boolean;
};

export type ProductTraceabilityGraph = {
  nodes: TraceGraphNode[];
  edges: TraceGraphEdge[];
  completenessPct: number;
  knownTierCount: number;
  warnings: string[];
};

const TIER_KIND: Record<number, TraceGraphNodeKind> = {
  4: "raw_material",
  3: "processing",
  2: "supplier",
  1: "manufacturing",
};

function nodeStatus(tier: TraceabilityTierRow): TraceGraphNodeStatus {
  return tier.status === "known" ? "verified" : "incomplete";
}

function verificationLabel(tier: TraceabilityTierRow): string {
  if (tier.status === "known") {
    if (tier.evidenceStatus) return `Verified · ${tier.evidenceStatus}`;
    return "Recorded · evidence pending";
  }
  if (tier.status === "unknown") return "Unknown · not verified";
  return "Not provided · incomplete";
}

/**
 * Vertical supply-chain graph: upstream (Tier 4) at top → finished product at bottom.
 */
export function buildProductTraceabilityGraph(
  traceability: ProductTraceability,
  productName?: string | null
): ProductTraceabilityGraph {
  const byTier = new Map(traceability.tiers.map((t) => [t.tier, t]));
  const orderedTiers = [4, 3, 2, 1]
    .map((tier) => byTier.get(tier))
    .filter((t): t is TraceabilityTierRow => Boolean(t));

  const nodes: TraceGraphNode[] = orderedTiers.map((tier) => ({
    id: tier.nodeId || `tier-${tier.tier}`,
    kind: TIER_KIND[tier.tier] || "supplier",
    label:
      tier.status === "known"
        ? tier.facility || tier.supplierName || tier.label
        : tier.label,
    role: tier.role,
    status: nodeStatus(tier),
    tier: tier.tier,
    facility: tier.facility,
    country: tier.country,
    supplierName: tier.supplierName,
    evidenceStatus: tier.evidenceStatus,
    confidence: tier.confidence,
    verificationLabel: verificationLabel(tier),
  }));

  const productId = `product-${traceability.productId}`;
  nodes.push({
    id: productId,
    kind: "product",
    label: productName?.trim() || "Finished product",
    role: "Approved product record",
    status: "product",
    tier: null,
    facility: null,
    country: null,
    supplierName: null,
    evidenceStatus: null,
    confidence: null,
    verificationLabel: "Product identity",
  });

  const edges: TraceGraphEdge[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const from = nodes[i];
    const to = nodes[i + 1];
    edges.push({
      id: `${from.id}->${to.id}`,
      fromId: from.id,
      toId: to.id,
      verified: from.status === "verified" && (to.status === "verified" || to.status === "product"),
    });
  }

  return {
    nodes,
    edges,
    completenessPct: traceability.completenessPct,
    knownTierCount: traceability.knownTierCount,
    warnings: traceability.warnings,
  };
}
