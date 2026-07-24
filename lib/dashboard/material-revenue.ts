import { getServerSupabase } from "../supabase-service-client";

export type MaterialRevenueRow = {
  material: string;
  matchedTx: number;
  sales: number;
  commission: number;
  matchRateNote: string;
};

/**
 * Join affiliate transactions → products by product_id / sku, then roll up by
 * shop_material_family. Name-based fiber inference is a fallback only.
 */
export async function fetchMaterialRevenue(
  workspaceId: string,
  days = 30
): Promise<{
  rows: MaterialRevenueRow[];
  unmatchedCommission: number;
  matchedCommission: number;
  revenueConnected: boolean;
}> {
  const supabase = getServerSupabase();
  if (!supabase) {
    return {
      rows: [],
      unmatchedCommission: 0,
      matchedCommission: 0,
      revenueConnected: false,
    };
  }

  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data: txs, error } = await supabase
    .from("hq_affiliate_transactions")
    .select("product_id, sku, product_name, sales_amount, commission_amount, status, raw, external_transaction_id")
    .eq("workspace_id", workspaceId)
    .gte("transaction_date", since)
    .neq("status", "demo")
    .limit(2000);

  if (error) {
    return {
      rows: [],
      unmatchedCommission: 0,
      matchedCommission: 0,
      revenueConnected: false,
    };
  }
  if (!txs?.length) {
    const { count } = await supabase
      .from("hq_affiliate_transactions")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .neq("status", "demo");
    return {
      rows: [],
      unmatchedCommission: 0,
      matchedCommission: 0,
      revenueConnected: (count || 0) > 0,
    };
  }

  const verifiedTxs = txs.filter(
    (t: any) =>
      t.status !== "demo" &&
      !t.raw?.is_demo &&
      !String(t.external_transaction_id || "").startsWith("TX-")
  );
  if (!verifiedTxs.length) {
    return {
      rows: [],
      unmatchedCommission: 0,
      matchedCommission: 0,
      revenueConnected: false,
    };
  }

  const productIds = [...new Set(verifiedTxs.map((t) => t.product_id).filter(Boolean).map(String))].slice(
    0,
    200
  );
  const skus = [...new Set(verifiedTxs.map((t) => t.sku).filter(Boolean).map(String))].slice(0, 200);

  const materialByKey = new Map<string, string>();

  if (productIds.length) {
    const { data: byId } = await supabase
      .from("products")
      .select("id, sku, shop_material_family, composition")
      .in("id", productIds)
      .limit(300);
    for (const p of byId || []) {
      const mat = normalizeMaterial(p.shop_material_family) || inferMaterial(p.composition);
      if (!mat) continue;
      if (p.id) materialByKey.set(String(p.id), mat);
      if (p.sku) materialByKey.set(String(p.sku), mat);
    }
  }

  if (skus.length) {
    const { data: bySku } = await supabase
      .from("products")
      .select("id, sku, shop_material_family, composition")
      .in("sku", skus)
      .limit(300);
    for (const p of bySku || []) {
      const mat = normalizeMaterial(p.shop_material_family) || inferMaterial(p.composition);
      if (!mat) continue;
      if (p.id) materialByKey.set(String(p.id), mat);
      if (p.sku) materialByKey.set(String(p.sku), mat);
    }
  }

  const byMat = new Map<string, { matchedTx: number; sales: number; commission: number }>();
  let unmatchedCommission = 0;
  let matchedCommission = 0;

  for (const t of verifiedTxs) {
    const key =
      (t.product_id && materialByKey.get(String(t.product_id))) ||
      (t.sku && materialByKey.get(String(t.sku))) ||
      inferMaterial(t.product_name) ||
      null;
    const commission = Number(t.commission_amount || 0);
    const sales = Number(t.sales_amount || 0);
    if (!key) {
      unmatchedCommission += commission;
      continue;
    }
    matchedCommission += commission;
    const cur = byMat.get(key) || { matchedTx: 0, sales: 0, commission: 0 };
    cur.matchedTx += 1;
    cur.sales += sales;
    cur.commission += commission;
    byMat.set(key, cur);
  }

  const rows = [...byMat.entries()]
    .map(([material, v]) => ({
      material: material.charAt(0).toUpperCase() + material.slice(1),
      ...v,
      matchRateNote: "Matched via product_id/sku → catalog material family",
    }))
    .sort((a, b) => b.commission - a.commission);

  return {
    rows,
    unmatchedCommission,
    matchedCommission,
    revenueConnected: true,
  };
}

function normalizeMaterial(v: string | null | undefined): string | null {
  if (!v?.trim()) return null;
  const t = v.trim().toLowerCase();
  if (t === "leather_suede") return "leather";
  return t;
}

function inferMaterial(text: string | null | undefined): string | null {
  if (!text) return null;
  const t = text.toLowerCase();
  for (const m of ["silk", "linen", "cashmere", "wool", "cotton", "leather", "suede", "hemp"]) {
    if (t.includes(m)) return m === "suede" ? "leather" : m;
  }
  return null;
}
