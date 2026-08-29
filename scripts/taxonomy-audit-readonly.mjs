/**
 * Read-only consumer catalog taxonomy audit.
 * Uses HQ Supabase only (burrylupizvggupsryuj) — never obelisk-core.
 */
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";

const CONSUMER_REF = "burrylupizvggupsryuj";
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url?.includes(CONSUMER_REF) || !key) {
  console.error("Refusing: consumer SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });
const region = "us";

async function count(table, build) {
  let q = sb.from(table).select("id", { count: "exact", head: true }).eq("region", region);
  if (build) q = build(q);
  const { count: n, error } = await q;
  if (error) return { count: null, error: error.message };
  return { count: n ?? 0 };
}

async function sample(table, cols, build, limit = 25) {
  let q = sb.from(table).select(cols).eq("region", region).limit(limit);
  if (build) q = build(q);
  const { data, error } = await q;
  if (error) return { rows: [], error: error.message };
  return { rows: data || [] };
}

async function rpc(name, params) {
  const { data, error } = await sb.rpc(name, params);
  return { data, error: error?.message ?? null };
}

function ilikeOr(fields, tokens) {
  const parts = [];
  for (const f of fields) {
    for (const t of tokens) {
      parts.push(`${f}.ilike.%${t}%`);
    }
  }
  return parts.join(",");
}

const GARMENT_TYPES = [
  "dresses", "tops_blouses", "shirts", "t_shirts", "tanks", "camisoles", "bodysuits",
  "knitwear", "sweaters_cardigans", "pants_trousers", "shorts", "coats", "jackets_blazers",
  "skirts", "swim_resortwear", "matching_sets", "jumpsuits", "lingerie", "other_apparel",
  "needs_review", "shoes", "bags", "handbags", "scarves_wraps",
];

async function main() {
  const out = { generatedAt: new Date().toISOString(), consumerRef: CONSUMER_REF };

  // Schema sample
  const { rows: apparelSample } = await sample("live_products_apparel", "*", null, 1);
  out.apparelColumns = apparelSample[0] ? Object.keys(apparelSample[0]).sort() : [];

  const { rows: footwearSample } = await sample("live_products_footwear", "*", null, 1);
  out.footwearColumns = footwearSample[0] ? Object.keys(footwearSample[0]).sort() : [];

  // Classification summary view
  const { data: classSummary, error: csErr } = await sb.from("catalog_classification_summary").select("*").maybeSingle();
  out.catalogClassificationSummary = classSummary ?? { error: csErr?.message };

  // Platform stats
  const { data: platformStats } = await sb.from("platform_stats_cache").select("*").eq("id", "main").maybeSingle();
  out.platformStats = platformStats;

  // Totals
  out.totals = {
    apparel: (await count("live_products_apparel")).count,
    footwear: (await count("live_products_footwear")).count,
    footwearRpc: (await rpc("footwear_catalog_count", { p_region: region })).data,
  };

  // Garment type distribution (indexed counts)
  out.garmentTypeCounts = {};
  for (const gt of GARMENT_TYPES) {
    const r = await count("live_products_apparel", (q) => q.eq("garment_type", gt));
    if (r.count) out.garmentTypeCounts[gt] = r.count;
  }
  const nullGt = await count("live_products_apparel", (q) => q.is("garment_type", null));
  out.garmentTypeCounts["(null)"] = nullGt.count;

  // Coverage metrics
  const totalApparel = out.totals.apparel || 1;
  const withGarment = totalApparel - (nullGt.count || 0);
  const withCategory = (await count("live_products_apparel", (q) => q.not("category", "is", null))).count;
  const emptyCategory = (await count("live_products_apparel", (q) => q.or("category.is.null,category.eq."))).count;

  out.coverage = {
    totalApparel,
    withGarmentType: withGarment,
    withGarmentTypePct: Math.round((withGarment / totalApparel) * 1000) / 10,
    withCategory,
    withCategoryPct: Math.round(((withCategory || 0) / totalApparel) * 1000) / 10,
    emptyCategory,
  };

  // Classification table coverage
  const { count: classifiedOffers } = await sb
    .from("product_offer_classification")
    .select("offer_id", { count: "exact", head: true });
  out.classifiedOffers = classifiedOffers;

  // Target category probes — clothing
  const clothingTargets = {
    "all-clothing": { build: null },
    dresses: { build: (q) => q.eq("garment_type", "dresses") },
    "bridal-dresses": {
      build: (q) =>
        q.eq("garment_type", "dresses").or(
          ilikeOr(["name", "category"], ["bridal", "wedding", "bride"])
        ),
    },
    tops: { build: (q) => q.in("garment_type", ["tops_blouses", "shirts", "t_shirts", "tanks", "camisoles", "bodysuits", "crop_tops", "knit_tops"]) },
    blouses: { build: (q) => q.or(ilikeOr(["name", "category"], ["blouse"])) },
    "tanks-camisoles": { build: (q) => q.or(ilikeOr(["name", "category"], ["tank", "camisole", "cami"])) },
    "matching-sets": { build: (q) => q.eq("garment_type", "matching_sets") },
    trousers: { build: (q) => q.eq("garment_type", "pants_trousers").not("name", "ilike", "%jean%").not("category", "ilike", "%jean%") },
    jeans: { build: (q) => q.or(ilikeOr(["name", "category"], ["jean", "denim"])) },
    skirts: { build: (q) => q.eq("garment_type", "skirts") },
    shorts: { build: (q) => q.eq("garment_type", "shorts") },
    "beachwear-swimwear": { build: (q) => q.eq("garment_type", "swim_resortwear") },
    knitwear: { build: (q) => q.in("garment_type", ["knitwear", "sweaters_cardigans"]) },
    coats: { build: (q) => q.eq("garment_type", "coats") },
    jackets: { build: (q) => q.eq("garment_type", "jackets_blazers") },
  };

  out.clothingTargets = {};
  for (const [slug, spec] of Object.entries(clothingTargets)) {
    const c = await count("live_products_apparel", spec.build);
    const titles = await sample("live_products_apparel", "name,category,garment_type", spec.build, 20);
    out.clothingTargets[slug] = {
      count: c.count,
      pctOfApparel: Math.round(((c.count || 0) / totalApparel) * 1000) / 10,
      sampleTitles: titles.rows.map((r) => r.name),
      sampleCategories: [...new Set(titles.rows.map((r) => r.category).filter(Boolean))].slice(0, 8),
      garmentTypes: [...new Set(titles.rows.map((r) => r.garment_type).filter(Boolean))],
      error: c.error || titles.error,
    };
  }

  // Shoe targets — keyword on footwear MV (mirrors production)
  const shoeTargets = {
    "all-shoes": { tokens: [] },
    "ballet-flats": { tokens: ["ballet", "ballerina"] },
    loafers: { tokens: ["loafer", "moccasin"] },
    "mary-janes": { tokens: ["mary jane"] },
    "flat-shoes": { tokens: ["flat", "ballet", "ballerina", "loafer", "mary jane"] },
    sneakers: { tokens: ["sneaker", "trainer"] },
    boots: { tokens: ["boot", "bootie"] },
    "ankle-boots": { tokens: ["ankle boot", "bootie"] },
    heels: { tokens: ["heel", "stiletto"] },
    pumps: { tokens: ["pump"] },
    sandals: { tokens: ["sandal", "slide"] },
    mules: { tokens: ["mule"] },
  };

  const totalFootwear = out.totals.footwear || 1;
  out.shoeTargets = {};
  for (const [slug, spec] of Object.entries(shoeTargets)) {
    const build =
      spec.tokens.length === 0
        ? null
        : (q) => q.or(ilikeOr(["name", "category"], spec.tokens));
    const c = await count("live_products_footwear", build);
    const titles = await sample("live_products_footwear", "name,category,garment_type,composition", build, 20);
    out.shoeTargets[slug] = {
      count: c.count,
      pctOfFootwear: Math.round(((c.count || 0) / totalFootwear) * 1000) / 10,
      sampleTitles: titles.rows.map((r) => r.name),
      sampleCategories: [...new Set(titles.rows.map((r) => r.category).filter(Boolean))].slice(0, 8),
      error: c.error || titles.error,
    };
  }

  // Ambiguity probes
  const ambiguity = {
    bootcutJeansInBoots: await count("live_products_footwear", (q) =>
      q.or(ilikeOr(["name", "category"], ["boot"])).or(ilikeOr(["name", "category"], ["jean", "denim", "bootcut"]))
    ),
    bootcutJeansFalsePositive: await sample(
      "live_products_footwear",
      "name,category",
      (q) => q.or(ilikeOr(["name"], ["bootcut"])),
      10
    ),
    tankDressInCamisoles: await count("live_products_apparel", (q) =>
      q.or(ilikeOr(["name"], ["tank dress"])).or(ilikeOr(["name", "category"], ["camisole", "tank"]))
    ),
    tankDressSamples: await sample("live_products_apparel", "name,category,garment_type", (q) =>
      q.ilike("name", "%tank%dress%"), 10),
    dressTrousersInDresses: await count("live_products_apparel", (q) =>
      q.or(ilikeOr(["name"], ["dress trouser", "dress pant"]))
    ),
    pumpNonFootwear: await count("live_products_apparel", (q) => q.or(ilikeOr(["name", "category"], ["pump"]))),
    pumpFootwear: await count("live_products_footwear", (q) => q.or(ilikeOr(["name", "category"], ["pump"]))),
  };
  out.ambiguity = {
    bootcutInFootwearBootQuery: ambiguity.bootcutJeansInBoots.count,
    bootcutSamples: ambiguity.bootcutJeansFalsePositive.rows,
    tankDressCamisoleOverlap: ambiguity.tankDressInCamisoles.count,
    tankDressSamples: ambiguity.tankDressSamples.rows,
    dressTrousersCount: ambiguity.dressTrousersInDresses.count,
    pumpInApparel: ambiguity.pumpNonFootwear.count,
    pumpInFootwear: ambiguity.pumpFootwear.count,
  };

  // High-volume garment types not in target taxonomy
  out.highVolumeGarmentTypes = Object.entries(out.garmentTypeCounts)
    .filter(([k, v]) => v > 500 && !["dresses", "tops_blouses", "shirts", "pants_trousers", "skirts", "knitwear", "sweaters_cardigans", "coats", "jackets_blazers", "shorts", "swim_resortwear", "matching_sets"].includes(k))
    .sort((a, b) => b[1] - a[1]);

  // Raw category top samples (paginated aggregate — capped)
  const rawCat = {};
  for (let offset = 0; offset < 15000; offset += 1000) {
    const { data } = await sb.from("live_products_apparel").select("category").range(offset, offset + 999);
    if (!data?.length) break;
    for (const r of data) {
      const k = (r.category || "(null)").slice(0, 60);
      rawCat[k] = (rawCat[k] || 0) + 1;
    }
    if (data.length < 1000) break;
  }
  out.rawCategoryTop30 = Object.entries(rawCat).sort((a, b) => b[1] - a[1]).slice(0, 30);

  // Verify surfaces exist
  const surfaces = ["live_products", "live_products_apparel", "live_products_footwear", "homepage_feed_items", "editorial_collection_products"];
  out.surfaceExists = {};
  for (const s of surfaces) {
    const r = await count(s);
    out.surfaceExists[s] = r.error ? { error: r.error } : { count: r.count };
  }

  const outPath = "scripts/taxonomy-audit-output.json";
  writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log("Wrote", outPath);
  console.log(JSON.stringify({
    totals: out.totals,
    coverage: out.coverage,
    garmentTypes: out.garmentTypeCounts,
    clothingCounts: Object.fromEntries(Object.entries(out.clothingTargets).map(([k,v]) => [k, v.count])),
    shoeCounts: Object.fromEntries(Object.entries(out.shoeTargets).map(([k,v]) => [k, v.count])),
  }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
