#!/usr/bin/env node
/**
 * Automated heuristic cross-check — SECONDARY QA only, NOT manual review.
 * Primary sign-off uses scripts/taxonomy-card-review.mjs (distinct-card queue).
 *
 * Usage: node --env-file=.env.development.local scripts/taxonomy-heuristic-check.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const REGION = "us";
const SAMPLE_CAP = 50;
const UNRESOLVED_FOOTWEAR_SAMPLE = 100;

if (!url || !key) {
  console.error("SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

const norm = (s) => String(s ?? "").toLowerCase().trim();

/** Independent validators — garment_type + category + name, separate from infer RPC. */
const APPAREL_RULES = {
  "clothing/dresses": (r) =>
    norm(r.garment_type) === "dresses" ||
    (/\bdress\b|\bgown\b/.test(norm(r.name)) && !/jumpsuit|romper|shirt/i.test(norm(r.name))),
  "clothing/bridal-dresses": (r) =>
    APPAREL_RULES["clothing/dresses"](r) && /bridal|wedding|bride/i.test(norm(r.name)),
  "clothing/shirts": (r) =>
    norm(r.garment_type) === "shirts" ||
    (/\bshirt\b/.test(norm(r.name)) && !/t-shirt|shirtdress|blouse/i.test(norm(r.name + r.category))),
  "clothing/blouses": (r) => /blouse/i.test(norm(r.name + r.category)),
  "clothing/t-shirts": (r) =>
    /t-shirt| tee |graphic tee|crew neck tee|v-neck tee/i.test(norm(r.name + r.category)),
  "clothing/tanks-and-camisoles": (r) =>
    /tank|camisole|cami\b/i.test(norm(r.name + r.category)) && !/dress/i.test(norm(r.name)),
  "clothing/trousers": (r) =>
    norm(r.garment_type) === "pants_trousers" &&
    /trouser|\bpant/i.test(norm(r.name + r.category)) &&
    !/jean|denim/i.test(norm(r.name + r.category)),
  "clothing/jeans": (r) =>
    /jean|denim/i.test(norm(r.name + r.category)) && norm(r.garment_type) === "pants_trousers",
  "clothing/skirts": (r) => norm(r.garment_type) === "skirts" || /\bskirt\b/.test(norm(r.name)),
  "clothing/shorts": (r) => norm(r.garment_type) === "shorts" || /\bshorts\b/.test(norm(r.name)),
  "clothing/knitwear": (r) =>
    ["knitwear", "sweaters_cardigans"].includes(norm(r.garment_type)) ||
    /sweater|cardigan|knit\b/i.test(norm(r.name)),
  "clothing/coats": (r) => norm(r.garment_type) === "coats" || /\bcoat\b/.test(norm(r.name)),
  "clothing/jackets": (r) =>
    ["jackets_blazers"].includes(norm(r.garment_type)) ||
    /jacket|blazer/i.test(norm(r.name + r.category)),
  "clothing/swimwear": (r) =>
    norm(r.garment_type) === "swim_resortwear" || /swim|bikini/i.test(norm(r.name + r.category)),
  "clothing/matching-sets": (r) => /matching set|co-ord|coord|two piece/i.test(norm(r.name + r.category)),
};

const FOOTWEAR_RULES = {
  "shoes/sneakers": (r) => /sneaker|trainer|runner/i.test(norm(r.name)) && !/ballet runner/i.test(norm(r.name)),
  "shoes/loafers": (r) => /loafer|penny/i.test(norm(r.name)),
  "shoes/mary-janes": (r) => /mary[\s-]?jane/i.test(norm(r.name)),
  "shoes/boots": (r) => /\bboots?\b|bootie/i.test(norm(r.name)) && !/bootcut|sneaker/i.test(norm(r.name)),
  "shoes/ankle-boots": (r) => /ankle boot|bootie|ankle-boot/i.test(norm(r.name)),
  "shoes/pumps": (r) => /\bpump|stiletto/i.test(norm(r.name)),
  "shoes/heeled-sandals": (r) => /sandal/i.test(norm(r.name)) && /heel|heeled|wedge|\d+\s*mm/i.test(norm(r.name)),
  "shoes/sandals": (r) => /sandal|slide|flip flop/i.test(norm(r.name)) && !FOOTWEAR_RULES["shoes/heeled-sandals"](r),
  "shoes/mules": (r) => /\bmule/i.test(norm(r.name)),
};

const PARENT_CHILDREN = {
  "clothing/tops": ["clothing/tops", "clothing/blouses", "clothing/t-shirts"],
  "shoes/flat-shoes": ["shoes/loafers", "shoes/mary-janes"],
  "shoes/heels": ["shoes/pumps", "shoes/heeled-sandals"],
  "shoes/boots": ["shoes/boots", "shoes/ankle-boots"],
};

async function browseCards(dept, slug) {
  const rpc =
    dept === "shoes" ? "catalog_footwear_taxonomy_browse_page" : "catalog_taxonomy_browse_page";
  const base =
    dept === "shoes"
      ? {
          p_region: REGION,
          p_taxonomy_slug: slug,
          p_color: null,
          p_brand_slug: null,
          p_search: null,
          p_min_price: null,
          p_max_price: null,
          p_sort: "newest",
          p_limit: 500,
          p_offset: 0,
        }
      : {
          p_region: REGION,
          p_taxonomy_slug: slug,
          p_material_family: null,
          p_material_subtype: null,
          p_fabric_construction: null,
          p_min_nfp: null,
          p_color: null,
          p_brand_slug: null,
          p_search: null,
          p_min_price: null,
          p_max_price: null,
          p_sort: "newest",
          p_limit: 500,
          p_offset: 0,
        };
  const { data, error } = await sb.rpc(rpc, base);
  if (error) throw new Error(`${slug}: ${error.message}`);
  return { total: Number(data?.total) || 0, products: data?.products ?? [] };
}

function validateRow(slug, dept, row, assignmentSlug, descendantSlugs) {
  const parentLeaves = PARENT_CHILDREN[slug];
  if (parentLeaves) {
    return parentLeaves.includes(assignmentSlug);
  }
  if (descendantSlugs?.length > 1) {
    return descendantSlugs.includes(assignmentSlug);
  }
  const rules = dept === "shoes" ? FOOTWEAR_RULES : APPAREL_RULES;
  const fn = rules[slug];
  if (!fn) return assignmentSlug === slug;
  return fn(row);
}

async function filterSlugs(slug) {
  if (slug.endsWith("/all")) return null;
  const { data, error } = await sb.rpc("catalog_taxonomy_active_descendant_slugs", {
    p_slug: slug,
  });
  if (error) throw error;
  return data ?? [];
}

async function sampleOffersForSlug(slug, dept, uniqueCards, browseProducts) {
  const table = dept === "shoes" ? "live_products_footwear" : "live_products_apparel";
  const reviewAll = uniqueCards < SAMPLE_CAP;
  const slugs = await filterSlugs(slug);
  if (!slugs?.length) return { samples: [], descendantSlugs: [] };

  let offerIds = [];
  if (reviewAll && browseProducts.length > 0) {
    offerIds = browseProducts.map((p) => p.id);
  } else {
    const { data: assignments } = await sb
      .from("product_taxonomy_assignments")
      .select("offer_id")
      .eq("taxonomy_version", "retail-v1")
      .eq("is_primary", true)
      .in("taxonomy_slug", slugs);
    const pool = (assignments ?? []).map((a) => a.offer_id);
    const shuffled = pool.sort(() => Math.random() - 0.5);
    offerIds = shuffled.slice(0, Math.min(SAMPLE_CAP, shuffled.length));
  }

  if (offerIds.length === 0) return { samples: [], descendantSlugs: slugs };

  const { data: rows } = await sb.from(table).select("*").eq("region", REGION).in("id", offerIds);
  const { data: assigns } = await sb
    .from("product_taxonomy_assignments")
    .select("offer_id, taxonomy_slug")
    .eq("taxonomy_version", "retail-v1")
    .eq("is_primary", true)
    .in("offer_id", offerIds);
  const assignMap = Object.fromEntries((assigns ?? []).map((a) => [a.offer_id, a.taxonomy_slug]));

  return { samples: (rows ?? []).map((r) => ({ row: r, assignment: assignMap[r.id] })), descendantSlugs: slugs };
}

async function auditNode(node) {
  const dept = node.department;
  const slug = node.slug;
  if (slug.endsWith("/all")) return null;

  const { total, products } = await browseCards(dept, slug);
  const { samples, descendantSlugs } = await sampleOffersForSlug(slug, dept, total, products);

  let errors = [];
  let correct = 0;
  for (const { row, assignment } of samples) {
    const ok = validateRow(slug, dept, row, assignment, descendantSlugs);
    if (ok) correct++;
    else
      errors.push({
        offerId: row.id,
        name: row.name?.slice(0, 60),
        garmentType: row.garment_type,
        category: row.category,
        assigned: assignment,
        reason: "independent_heuristic_mismatch",
      });
  }

  const reviewed = samples.length;
  const precision = reviewed > 0 ? correct / reviewed : null;

  return {
    slug,
    label: node.label,
    isParent: Boolean(PARENT_CHILDREN[slug]) || (descendantSlugs?.length ?? 0) > 1,
    uniqueCardCount: total,
    sampleSize: reviewed,
    reviewedCount: reviewed,
    correctCount: correct,
    errorCount: errors.length,
    precisionPct: precision != null ? Math.round(precision * 10000) / 100 : null,
    reviewMode: total < SAMPLE_CAP ? "full_catalog_under_50" : `random_${SAMPLE_CAP}`,
    errors: errors.slice(0, 10),
  };
}

async function auditUnresolvedFootwear() {
  const { data: rootOffers } = await sb
    .from("product_taxonomy_assignments")
    .select("offer_id")
    .eq("taxonomy_version", "retail-v1")
    .eq("is_primary", true)
    .eq("taxonomy_slug", "shoes/all");

  const ids = (rootOffers ?? []).map((r) => r.offer_id);
  const shuffled = ids.sort(() => Math.random() - 0.5);

  const rows = [];
  for (let i = 0; i < shuffled.length && rows.length < UNRESOLVED_FOOTWEAR_SAMPLE; i += 50) {
    const chunk = shuffled.slice(i, i + 50);
    const { data } = await sb
      .from("live_products_footwear")
      .select("id, name, category")
      .eq("region", REGION)
      .in("id", chunk);
    rows.push(...(data ?? []));
  }
  const sample = rows.slice(0, UNRESOLVED_FOOTWEAR_SAMPLE);

  const errors = [];
  for (const r of sample) {
    const nam = norm(r.name);
    const matched = Object.entries(FOOTWEAR_RULES).some(([, fn]) => fn(r));
    if (matched) {
      errors.push({
        offerId: r.id,
        name: r.name?.slice(0, 60),
        category: r.category,
        reason: "root_only_but_heuristic_matches_launch_leaf",
      });
    }
  }

  return {
    poolSize: ids.length,
    sampleSize: sample.length,
    reviewedCount: sample.length,
    errorCount: errors.length,
    errors: errors.slice(0, 15),
  };
}

async function verifyParentUnion(parentSlug, childSlugs, dept) {
  const parent = await browseCards(dept, parentSlug);
  const childTotals = [];
  for (const c of childSlugs) {
    const ch = await browseCards(dept, c);
    childTotals.push({ slug: c, cards: ch.total });
  }
  const sumChildren = childTotals.reduce((s, c) => s + c.cards, 0);
  return {
    parentSlug,
    parentCards: parent.total,
    childSumRaw: sumChildren,
    childBreakdown: childTotals,
    note: "parentCards should be <= childSumRaw; equality when no cross-listing",
  };
}

async function main() {
  console.log("=== Automated heuristic cross-check (secondary — NOT manual review) ===\n");
  console.log(
    "Primary QA: scripts/taxonomy-card-review.mjs — distinct cards with reviewerDecision pending.\n"
  );

  const { data: nodes } = await sb
    .from("catalog_taxonomy_nodes")
    .select("slug, department, label, is_active")
    .eq("is_active", true)
    .order("slug");

  const audits = [];
  for (const node of nodes ?? []) {
    if (node.slug.endsWith("/all")) continue;
    process.stderr.write(`Auditing ${node.slug}…\n`);
    audits.push(await auditNode(node));
  }

  const parentChecks = [
    await verifyParentUnion("clothing/tops", PARENT_CHILDREN["clothing/tops"], "clothing"),
    await verifyParentUnion("shoes/flat-shoes", PARENT_CHILDREN["shoes/flat-shoes"], "shoes"),
    await verifyParentUnion("shoes/heels", PARENT_CHILDREN["shoes/heels"], "shoes"),
  ];

  const unresolvedFootwear = await auditUnresolvedFootwear();

  console.log("\n=== Per active node ===");
  console.table(
    audits.map((a) => ({
      slug: a.slug,
      uniqueCards: a.uniqueCardCount,
      sampleSize: a.sampleSize,
      reviewed: a.reviewedCount,
      errors: a.errorCount,
      precisionPct: a.precisionPct,
      mode: a.reviewMode,
    }))
  );

  console.log("\n=== Parent dedup union ===");
  console.table(parentChecks);

  console.log("\n=== Unresolved footwear (100 random) ===");
  console.log(unresolvedFootwear);

  const report = {
    generatedAt: new Date().toISOString(),
    methodology:
      "Automated garment_type/category/name heuristics — secondary cross-check only, NOT manual review",
    primaryReviewArtifact: "scripts/taxonomy-card-review-report.json",
    region: REGION,
    nodeAudits: audits,
    parentUnionChecks: parentChecks,
    unresolvedFootwearAudit: unresolvedFootwear,
  };
  writeFileSync("scripts/taxonomy-independent-audit-report.json", JSON.stringify(report, null, 2));
  console.log("\nWrote scripts/taxonomy-independent-audit-report.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
