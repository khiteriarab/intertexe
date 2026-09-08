#!/usr/bin/env node
/**
 * Re-enrich existing hq_affiliate_transactions rows:
 * - normalize u1 ("null" → NULL)
 * - re-match catalog via SKU suffix / product_id
 *
 * Usage:
 *   node --import tsx scripts/backfill-affiliate-enrichment.ts
 *   node --import tsx scripts/backfill-affiliate-enrichment.ts --dry-run
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { enrichAffiliateRows } from "../lib/dashboard/revenue-enrichment.ts";
import type { ParsedAffiliateRow } from "../lib/dashboard/revenue.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2];
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

loadEnvFile(path.join(root, ".env.production.local"));
loadEnvFile(path.join(root, ".env.local"));

const dryRun = process.argv.includes("--dry-run");
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Supabase credentials missing");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const { data: ws } = await supabase
  .from("hq_workspaces")
  .select("id")
  .eq("slug", "intertexe")
  .maybeSingle();
if (!ws?.id) {
  console.error("intertexe workspace missing");
  process.exit(1);
}

const { data: rows, error } = await supabase
  .from("hq_affiliate_transactions")
  .select(
    "id, external_transaction_id, order_id, transaction_date, process_date, click_date, advertiser_id, advertiser_name, sku, product_name, product_id, quantity, sales_amount, commission_amount, currency, status, u1, raw"
  )
  .eq("workspace_id", ws.id)
  .neq("status", "demo")
  .order("transaction_date", { ascending: false })
  .limit(500);

if (error) {
  console.error(error.message);
  process.exit(1);
}

const parsed: ParsedAffiliateRow[] = (rows || []).map((r: any) => ({
  external_transaction_id: r.external_transaction_id,
  order_id: r.order_id,
  transaction_date: r.transaction_date,
  process_date: r.process_date,
  click_date: r.click_date,
  advertiser_id: r.advertiser_id,
  advertiser_name: r.advertiser_name,
  sku: r.raw?.rakuten_sku || r.sku,
  product_name: r.product_name,
  product_id: r.raw?.rakuten_product_id || r.product_id,
  quantity: r.quantity,
  sales_amount: r.sales_amount,
  commission_amount: r.commission_amount,
  currency: r.currency,
  status: r.status,
  u1: r.u1,
  raw: r.raw || {},
}));

const enriched = await enrichAffiliateRows(supabase, parsed);
let updated = 0;
let u1Fixed = 0;
let catalogMatched = 0;

for (let i = 0; i < (rows || []).length; i++) {
  const orig = rows![i] as any;
  const next = enriched[i];
  const patch: Record<string, unknown> = {};
  if (next.u1 !== orig.u1) {
    patch.u1 = next.u1;
    u1Fixed += 1;
  }
  if (next.sku !== orig.sku) patch.sku = next.sku;
  if (next.product_id !== orig.product_id) patch.product_id = next.product_id;
  if (JSON.stringify(next.raw) !== JSON.stringify(orig.raw || {})) {
    patch.raw = next.raw;
    if (next.raw?.catalog_uuid && !orig.raw?.catalog_uuid) catalogMatched += 1;
  }
  if (!Object.keys(patch).length) continue;
  updated += 1;
  if (dryRun) continue;
  const { error: upErr } = await supabase
    .from("hq_affiliate_transactions")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", orig.id);
  if (upErr) console.error(orig.external_transaction_id, upErr.message);
}

console.log(
  JSON.stringify(
    {
      dryRun,
      scanned: rows?.length || 0,
      updated,
      u1Fixed,
      newlyCatalogMatched: catalogMatched,
    },
    null,
    2
  )
);
