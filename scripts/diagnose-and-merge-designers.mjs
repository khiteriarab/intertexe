/**
 * Diagnose duplicate designers (by name) and merge brand_slug aliases in products + designers.
 * Also deactivates kids/children products and reports NFP stats for a brand probe (ALC).
 *
 * Usage: node scripts/diagnose-and-merge-designers.mjs [--apply]
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const parentEnv = resolve(root, "..", ".env");
const apply = process.argv.includes("--apply");

function loadEnv() {
  for (const p of [resolve(root, ".env.local"), resolve(root, ".env"), parentEnv]) {
    try {
      const raw = readFileSync(p, "utf8");
      for (const line of raw.split("\n")) {
        const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
        if (!m || process.env[m[1]]) continue;
        process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
      }
    } catch {
      /* ignore */
    }
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

function normalizeBrandName(name) {
  return (name || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function countBySlug(slug, region = "us") {
  const { count } = await supabase
    .from("live_products_apparel")
    .select("*", { count: "exact", head: true })
    .eq("brand_slug", slug)
    .eq("region", region);
  return count || 0;
}

async function countProductsSlug(slug) {
  const { count } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("brand_slug", slug)
    .eq("approved", "yes")
    .eq("is_active", true);
  return count || 0;
}

async function diagnoseALC() {
  console.log("\n=== ALC DIAGNOSIS ===");
  const { data: designers } = await supabase.from("designers").select("*").ilike("name", "%ALC%");
  console.log("ALC designer records:", JSON.stringify(designers, null, 2));

  const { data: slugs } = await supabase
    .from("live_products_apparel")
    .select("brand_slug, brand_name")
    .ilike("brand_name", "%ALC%")
    .eq("region", "us")
    .limit(500);

  const uniqueSlugs = [...new Set((slugs || []).map((p) => p.brand_slug).filter(Boolean))];
  console.log("ALC slugs in live_products_apparel:", uniqueSlugs);
  for (const slug of uniqueSlugs) {
    console.log(`  ${slug}: ${await countBySlug(slug)} live (us)`);
  }

  const { count: alcTotal } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .ilike("brand_name", "%ALC%")
    .eq("approved", "yes")
    .eq("is_active", true);

  const { count: alcNFP } = await supabase
    .from("live_products_apparel")
    .select("*", { count: "exact", head: true })
    .ilike("brand_name", "%ALC%")
    .eq("region", "us");

  console.log("ALC total approved active:", alcTotal);
  console.log("ALC passing NFP >= 80 (live):", alcNFP);
  console.log("ALC filtered out by NFP gate:", (alcTotal || 0) - (alcNFP || 0));
}

async function findDuplicateDesigners() {
  const { data: allDesigners } = await supabase.from("designers").select("name, slug").order("name");
  const byName = {};
  for (const d of allDesigners || []) {
    const key = normalizeBrandName(d.name);
    if (!key) continue;
    if (!byName[key]) byName[key] = [];
    byName[key].push(d);
  }
  return Object.entries(byName).filter(([, rows]) => rows.length > 1);
}

async function findDuplicateDirectorySlugs() {
  const { data: rows } = await supabase.rpc("catalog_brand_directory", { p_limit: 1200 });
  const byName = {};
  for (const r of rows || []) {
    const display = (r.brand_name || r.brand_slug || "").trim();
    const key = normalizeBrandName(display);
    if (!key) continue;
    if (!byName[key]) byName[key] = [];
    byName[key].push(r);
  }
  return Object.entries(byName).filter(([, slugs]) => slugs.length > 1);
}

async function mergeDesignerGroup(name, entries) {
  let canonical = entries[0];
  let maxCount = -1;
  const slugCounts = [];
  for (const d of entries) {
    const live = await countBySlug(d.slug);
    const products = await countProductsSlug(d.slug);
    const total = Math.max(live, products);
    slugCounts.push({ slug: d.slug, live, products, total });
    if (total > maxCount) {
      maxCount = total;
      canonical = d;
    }
  }
  console.log(`\nMerge "${name}" → canonical slug: ${canonical.slug}`);
  slugCounts.forEach((s) => console.log(`  ${s.slug}: live=${s.live} products=${s.products}`));

  if (!apply) return { canonical: canonical.slug, updated: 0, deleted: [] };

  let updated = 0;
  const deleted = [];
  for (const { slug } of slugCounts) {
    if (slug === canonical.slug) continue;
    const { data: moved, error: upErr } = await supabase
      .from("products")
      .update({ brand_slug: canonical.slug })
      .eq("brand_slug", slug)
      .select("id");
    if (upErr) {
      console.log(`  products update ${slug} failed:`, upErr.message);
      continue;
    }
    updated += moved?.length || 0;
    const { error: delErr } = await supabase.from("designers").delete().eq("slug", slug);
    if (!delErr) deleted.push(slug);
    else console.log(`  delete designer ${slug}:`, delErr.message);
  }
  return { canonical: canonical.slug, updated, deleted };
}

const KIDS_TERMS = [
  "kids",
  "children",
  "child",
  "baby",
  "infant",
  "toddler",
  "junior",
  " boys ",
  " girls ",
  "youth",
  "newborn",
  "little ones",
];

async function removeKidsProducts() {
  console.log("\n=== KIDS / CHILDREN REMOVAL ===");
  const foundIds = new Map();
  const byTerm = {};

  for (const term of KIDS_TERMS) {
    const pattern = term.trim();
    const { data } = await supabase
      .from("products")
      .select("id, name, brand_name, category")
      .or(`name.ilike.%${pattern}%,category.ilike.%${pattern}%`)
      .eq("approved", "yes")
      .eq("is_active", true)
      .limit(500);
    const hits = data || [];
    byTerm[pattern] = hits.length;
    for (const p of hits) foundIds.set(p.id, p);
  }

  const { data: miniHits } = await supabase
    .from("products")
    .select("id, name, brand_name, category")
    .ilike("name", "%mini%")
    .or("category.ilike.%kids%,category.ilike.%children%,category.ilike.%baby%,category.ilike.%junior%")
    .eq("approved", "yes")
    .eq("is_active", true)
    .limit(200);
  for (const p of miniHits || []) {
    const n = (p.name || "").toLowerCase();
    if (/\bmini\s+(me|dress|skirt|top)\b|kids|children|baby|junior|youth|toddler/.test(n)) {
      foundIds.set(p.id, p);
    }
  }

  console.log("By term:", byTerm);
  console.log("Unique kids candidates:", foundIds.size);

  if (apply && foundIds.size > 0) {
    const ids = [...foundIds.keys()];
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100);
      const { error } = await supabase
        .from("products")
        .update({
          is_active: false,
          approved: "no",
          display_excluded_reason: "non_womens_product",
        })
        .in("id", chunk);
      if (error) console.log("batch update error:", error.message);
    }
    console.log("Deactivated", ids.length, "products");
  }

  return { total: foundIds.size, byTerm };
}

async function main() {
  console.log(apply ? "MODE: APPLY" : "MODE: DRY RUN (pass --apply to write)");

  await diagnoseALC();

  const dupDesigners = await findDuplicateDesigners();
  console.log("\n=== DUPLICATE designers TABLE (by normalized name) ===");
  console.log("Count:", dupDesigners.length);
  dupDesigners.forEach(([name, rows]) => {
    console.log(`  ${name}: ${rows.map((r) => r.slug).join(", ")}`);
  });

  const dupDirectory = await findDuplicateDirectorySlugs();
  console.log("\n=== DUPLICATE catalog_brand_directory (by display name) ===");
  console.log("Count:", dupDirectory.length);
  dupDirectory.slice(0, 40).forEach(([name, rows]) => {
    console.log(
      `  ${name}: ${rows.map((r) => `${r.brand_slug}(${r.product_count})`).join(", ")}`
    );
  });
  if (dupDirectory.length > 40) console.log(`  ... and ${dupDirectory.length - 40} more`);

  const mergeTargets = dupDesigners.length ? dupDesigners : dupDirectory.map(([name, rows]) => [
    name,
    rows.map((r) => ({ name: r.brand_name, slug: r.brand_slug })),
  ]);

  let totalUpdated = 0;
  const allDeleted = [];
  for (const [name, entries] of mergeTargets) {
    const result = await mergeDesignerGroup(name, entries);
    totalUpdated += result.updated || 0;
    allDeleted.push(...(result.deleted || []));
  }

  const kids = await removeKidsProducts();

  console.log("\n=== SUMMARY ===");
  console.log("Products slug updates:", totalUpdated);
  console.log("Designer rows deleted:", allDeleted.length, allDeleted.join(", ") || "(none)");
  console.log("Kids products flagged:", kids.total);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
