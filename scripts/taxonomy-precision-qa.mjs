#!/usr/bin/env node
/**
 * 50-product precision sample per launch leaf; activate nodes ≥98% precision.
 * Usage: node --env-file=.env.development.local scripts/taxonomy-precision-qa.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SAMPLE = 50;
const THRESHOLD = 0.98;
const REGION = "us";

if (!url || !key) {
  console.error("SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

async function inferApparel(gt, cat, name) {
  const { data } = await sb.rpc("catalog_taxonomy_infer_apparel", {
    p_garment_type: gt,
    p_category: cat,
    p_name: name,
  });
  return data?.[0]?.slug ?? null;
}

async function inferFootwear(cat, name) {
  const { data } = await sb.rpc("catalog_taxonomy_infer_footwear", {
    p_category: cat,
    p_name: name,
  });
  return data?.[0]?.slug ?? null;
}

async function resolveSlug(department, inferred) {
  const { data, error } = await sb.rpc("catalog_taxonomy_resolve_assignment_slug", {
    p_department: department,
    p_inferred_slug: inferred,
  });
  if (error) return `${department}/all`;
  return typeof data === "string" ? data : `${department}/all`;
}

async function main() {
  const { data: nodes } = await sb
    .from("catalog_taxonomy_nodes")
    .select("slug, department, label, is_provisional")
    .eq("is_provisional", false)
    .not("slug", "like", "%/all");

  const launchLeaves = (nodes ?? []).sort((a, b) => a.slug.localeCompare(b.slug));
  const results = [];
  const activated = [];
  const withheld = [];

  for (const node of launchLeaves) {
    const dept = node.department;
    const table = dept === "shoes" ? "live_products_footwear" : "live_products_apparel";

    const { data: assignments } = await sb
      .from("product_taxonomy_assignments")
      .select("offer_id")
      .eq("taxonomy_version", "retail-v1")
      .eq("taxonomy_slug", node.slug)
      .eq("is_primary", true)
      .limit(SAMPLE);

    const offerIds = (assignments ?? []).map((a) => a.offer_id);
    if (offerIds.length === 0) {
      withheld.push({ slug: node.slug, reason: "zero_assignments", precision: 0, n: 0 });
      continue;
    }

    const { data: rows } = await sb
      .from(table)
      .select("id, garment_type, category, name")
      .eq("region", REGION)
      .in("id", offerIds);

    let correct = 0;
    for (const row of rows ?? []) {
      const inferred =
        dept === "shoes"
          ? await inferFootwear(row.category, row.name)
          : await inferApparel(row.garment_type, row.category, row.name);
      const resolved = await resolveSlug(dept, inferred);
      if (resolved === node.slug) correct++;
    }

    const n = rows?.length ?? 0;
    const precision = n > 0 ? correct / n : 0;
    const entry = {
      slug: node.slug,
      label: node.label,
      sampleSize: n,
      correct,
      precision: Math.round(precision * 10000) / 100,
      pass: n > 0 && precision >= THRESHOLD,
    };
    results.push(entry);

    if (entry.pass) {
      await sb.from("catalog_taxonomy_nodes").update({ is_active: true }).eq("slug", node.slug);
      activated.push(node.slug);
    } else {
      withheld.push({ slug: node.slug, precision: entry.precision, n: entry.n });
    }
  }

  const { data: unresolvedClothing } = await sb.rpc("catalog_taxonomy_unresolved_leaf_stats", {
    p_department: "clothing",
    p_region: REGION,
  });
  const { data: unresolvedShoes } = await sb.rpc("catalog_taxonomy_unresolved_leaf_stats", {
    p_department: "shoes",
    p_region: REGION,
  });

  console.log("\n=== Unresolved-leaf rate ===");
  console.table(unresolvedClothing);
  console.table(unresolvedShoes);

  console.log("\n=== Precision QA (≥98% activates) ===");
  console.table(results);

  console.log(`\nActivated (${activated.length}):`, activated.join(", ") || "(none)");
  console.log(`Withheld (${withheld.length}):`);
  console.table(withheld);

  const report = {
    generatedAt: new Date().toISOString(),
    region: REGION,
    threshold: THRESHOLD,
    sampleSize: SAMPLE,
    unresolved: { clothing: unresolvedClothing?.[0], shoes: unresolvedShoes?.[0] },
    results,
    activated,
    withheld,
  };
  writeFileSync("scripts/taxonomy-precision-report.json", JSON.stringify(report, null, 2));
  console.log("\nWrote scripts/taxonomy-precision-report.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
