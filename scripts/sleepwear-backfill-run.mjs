#!/usr/bin/env node
/**
 * Batched sleepwear backfill via PostgREST (avoids mgmt API timeouts on wide scans).
 */
import { createClient } from "@supabase/supabase-js";

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = process.env.SUPABASE_PROJECT_REF || "burrylupizvggupsryuj";

const SLEEP_OR =
  "name.ilike.%pajama%,name.ilike.%pyjama%,name.ilike.%nightgown%,name.ilike.%nightdress%,name.ilike.%sleepshirt%,name.ilike.%sleep shirt%,name.ilike.%sleep set%,name.ilike.%nightwear%,name.ilike.%nightshirt%";

function chunks(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function fetchSleepProductIds() {
  const ids = new Set();
  for (const region of ["us", "eu"]) {
    let from = 0;
    const page = 1000;
    for (;;) {
      const { data, error } = await sb
        .from("products")
        .select("id")
        .eq("is_displayable", true)
        .eq("region", region)
        .or(SLEEP_OR)
        .range(from, from + page - 1);
      if (error) throw error;
      for (const row of data || []) ids.add(row.id);
      if (!data || data.length < page) break;
      from += page;
    }
  }
  return [...ids];
}

async function fixClassification(ids) {
  let total = 0;
  for (const batch of chunks(ids, 200)) {
    const { data, error } = await sb
      .from("product_offer_classification")
      .update({ garment_type: "sleepwear", classified_at: new Date().toISOString() })
      .in("offer_id", batch)
      .in("garment_type", ["shirts", "tops_blouses", "knitwear", "other_apparel", "needs_review"])
      .select("offer_id");
    if (error) throw error;
    total += data?.length || 0;
  }
  console.log(`classification fixed: ${total}`);
}

async function reassignTaxonomy(ids) {
  let total = 0;
  for (const batch of chunks(ids, 200)) {
    const { data, error } = await sb
      .from("product_taxonomy_assignments")
      .update({
        taxonomy_slug: "clothing/sleepwear",
        source: "guarded_rule",
        confidence: 86,
        updated_at: new Date().toISOString(),
      })
      .in("offer_id", batch)
      .eq("taxonomy_version", "retail-v1")
      .eq("is_primary", true)
      .in("taxonomy_slug", [
        "clothing/shirts",
        "clothing/tops",
        "clothing/blouses",
        "clothing/t-shirts",
        "clothing/tanks-and-camisoles",
      ])
      .select("offer_id");
    if (error) throw error;
    total += data?.length || 0;
  }
  console.log(`taxonomy reassigned: ${total}`);
}

async function insertMissingTaxonomy(ids) {
  let total = 0;
  for (const batch of chunks(ids, 100)) {
    const { data: existing } = await sb
      .from("product_taxonomy_assignments")
      .select("offer_id")
      .in("offer_id", batch)
      .eq("taxonomy_version", "retail-v1")
      .eq("is_primary", true);
    const have = new Set((existing || []).map((r) => r.offer_id));
    const missing = batch.filter((id) => !have.has(id));
    if (!missing.length) continue;
    const rows = missing.map((id) => ({
      offer_id: id,
      taxonomy_slug: "clothing/sleepwear",
      is_primary: true,
      source: "guarded_rule",
      confidence: 86,
      taxonomy_version: "retail-v1",
    }));
    const { data, error } = await sb
      .from("product_taxonomy_assignments")
      .upsert(rows, { onConflict: "offer_id,taxonomy_slug" })
      .select("offer_id");
    if (error) throw error;
    total += data?.length || 0;
  }
  console.log(`taxonomy inserted: ${total}`);
}

async function refreshMatView() {
  console.log("Refreshing live_products_apparel_mat...");
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: "REFRESH MATERIALIZED VIEW public.live_products_apparel_mat;" }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`MV refresh failed ${res.status}: ${text.slice(0, 300)}`);
  console.log("MV refresh OK");
}

async function verify() {
  const { data: browse } = await sb.rpc("catalog_taxonomy_browse_page", {
    p_region: "us",
    p_taxonomy_slug: "clothing/sleepwear",
    p_limit: 3,
    p_offset: 0,
  });
  console.log("sleepwear browse total:", browse?.total);

  const { data: node } = await sb
    .from("catalog_taxonomy_nodes")
    .select("label,is_active")
    .eq("slug", "clothing/sleepwear")
    .single();
  console.log("node:", node);

  const id = "1e2aa096-d5f4-4aef-8564-2deb5677788d";
  const [{ data: live }, { data: cls }] = await Promise.all([
    sb.from("live_products_apparel").select("garment_type,name").eq("id", id).maybeSingle(),
    sb.from("product_offer_classification").select("garment_type").eq("offer_id", id).maybeSingle(),
  ]);
  console.log("Asceno sample:", live?.name, "live gt:", live?.garment_type, "class:", cls?.garment_type);

  const { count: liveSleep } = await sb
    .from("live_products_apparel")
    .select("id", { count: "exact", head: true })
    .eq("region", "us")
    .eq("garment_type", "sleepwear");
  console.log("live US sleepwear count:", liveSleep);
}

const ids = await fetchSleepProductIds();
console.log(`sleep keyword product ids: ${ids.length}`);
await fixClassification(ids);
await reassignTaxonomy(ids);
await insertMissingTaxonomy(ids);
await refreshMatView();
await verify();
