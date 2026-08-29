#!/usr/bin/env node
/**
 * Sale footwear by retailer/brand — find non-Mytheresa partners with markdown shoes.
 * Usage: node --env-file=.env.development.local scripts/sale-footwear-partners-audit.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

function parsePrice(raw) {
  if (raw == null || raw === "") return null;
  const n = Number(String(raw).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function onSale(row) {
  if (row.is_sale === true) return true;
  const price = parsePrice(row.price);
  const orig = parsePrice(row.original_price);
  return orig != null && price != null && orig > price;
}

async function auditView(region) {
  const { data, error } = await sb
    .from("live_products_footwear")
    .select("brand_name, brand_slug, product_id, name, price, original_price, is_sale, region")
    .eq("region", region)
    .limit(50000);
  if (error) throw error;

  const sale = (data ?? []).filter(onSale);
  const byBrand = new Map();
  for (const row of sale) {
    const brand = row.brand_name || row.brand_slug || "unknown";
    const isMytheresa =
      String(row.product_id || "").includes("mytheresa") ||
      String(row.brand_slug || "").includes("mytheresa");
    const bucket = byBrand.get(brand) ?? { total: 0, mytheresa: 0, other: 0, samples: [] };
    bucket.total += 1;
    if (isMytheresa) bucket.mytheresa += 1;
    else {
      bucket.other += 1;
      if (bucket.samples.length < 3) {
        bucket.samples.push({
          product_id: row.product_id,
          name: row.name,
          price: row.price,
          original_price: row.original_price,
          is_sale: row.is_sale,
        });
      }
    }
    byBrand.set(brand, bucket);
  }

  const partners = [...byBrand.entries()]
    .filter(([, v]) => v.other > 0)
    .sort((a, b) => b[1].other - a[1].other);

  return {
    region,
    totalFootwear: data?.length ?? 0,
    saleOffers: sale.length,
    mytheresaSale: sale.filter(
      (r) =>
        String(r.product_id || "").includes("mytheresa") ||
        String(r.brand_slug || "").includes("mytheresa")
    ).length,
    otherPartnerBrands: partners.length,
    topOtherPartners: partners.slice(0, 25).map(([brand, v]) => ({
      brand,
      saleCount: v.other,
      samples: v.samples,
    })),
  };
}

async function auditProductsFeedSource() {
  const { data, error } = await sb
    .from("products")
    .select("feed_source, brand_name, product_id, price, original_price, is_sale, region, category")
    .eq("is_displayable", true)
    .or("category.ilike.%footwear%,category.ilike.%shoe%")
    .limit(30000);
  if (error) throw error;

  const sale = (data ?? []).filter(onSale);
  const bySource = new Map();
  for (const row of sale) {
    const src = row.feed_source || "unknown";
    bySource.set(src, (bySource.get(src) ?? 0) + 1);
  }
  return {
    displayableFootwearRows: data?.length ?? 0,
    onSaleRows: sale.length,
    byFeedSource: Object.fromEntries([...bySource.entries()].sort((a, b) => b[1] - a[1])),
  };
}

const regions = ["us", "eu", "uk"];
const viewAudits = [];
for (const region of regions) {
  try {
    viewAudits.push(await auditView(region));
  } catch (e) {
    viewAudits.push({ region, error: String(e.message || e) });
  }
}

let productsAudit = {};
try {
  productsAudit = await auditProductsFeedSource();
} catch (e) {
  productsAudit = { error: String(e.message || e) };
}

console.log(JSON.stringify({ viewAudits, productsAudit }, null, 2));
