#!/usr/bin/env node
/**
 * Audit designers directory vs displayable catalog brands.
 *
 * Derives the brand universe from products (is_displayable=true) — does not
 * hardcode a complete designer list. Optionally highlights known shoe slugs.
 *
 * Usage:
 *   node scripts/audit-designer-directory.mjs
 *
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * (loads .env.vercel.local / .env.local / ../.env).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

/** Optional highlight set — not a complete universe; only reported when present in catalog. */
const KNOWN_SHOE_SLUGS = [
  "manolo-blahnik",
  "roger-vivier",
  "golden-goose",
  "a-emery",
  "gianvito-rossi",
  "jimmy-choo",
  "aquazzura",
];

const SHOE_FIX_PRIORITY = ["manolo-blahnik", "roger-vivier", "golden-goose"];

const WORKERS = Number(process.env.AUDIT_WORKERS || 6);
const PAGE = 1000;

function loadEnv() {
  for (const f of [
    path.join(root, ".env.vercel.local"),
    path.join(root, ".env.local"),
    path.join(root, "../.env"),
  ]) {
    if (!fs.existsSync(f)) continue;
    for (const line of fs.readFileSync(f, "utf8").split("\n")) {
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!m) continue;
      let v = m[2].trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  }
}

loadEnv();

const url = (
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  ""
).replace(/^"|"$/g, "");
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").replace(/^"|"$/g, "");
if (!url || !key) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

function normalizeName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isShoeRow(row) {
  const cat = String(row.category || "").toLowerCase();
  const gt = String(row.garment_type || "").toLowerCase();
  return (
    gt === "shoes" ||
    gt === "footwear" ||
    /\bshoe|\bfootwear|\bsandal|\bboot|\bsneaker|\bheel|\bpump|\bloafer|\bmule/.test(
      cat
    ) ||
    /footwear/.test(cat)
  );
}

function mergeBrandMaps(target, source) {
  for (const [slug, info] of source) {
    const cur = target.get(slug);
    if (!cur) {
      target.set(slug, { ...info });
      continue;
    }
    cur.count += info.count;
    cur.shoe_count += info.shoe_count;
    if ((!cur.brand_name || cur.brand_name === slug) && info.brand_name) {
      cur.brand_name = info.brand_name;
    }
  }
}

async function fetchAllDesigners() {
  const rows = [];
  for (let offset = 0; offset < 100000; offset += 1000) {
    const { data, error } = await sb
      .from("designers")
      .select("slug, name, is_live")
      .range(offset, offset + 999);
    if (error) throw error;
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}

/**
 * UUID primary keys: split lexicographic space by first hex nibble so workers
 * can keyset-scan in parallel. Bounds must be valid UUID literals (Postgres
 * rejects bare hex prefixes like "6").
 */
function uuidPrefixRanges(workerCount) {
  const hex = "0123456789abcdef".split("");
  const n = Math.max(1, Math.min(workerCount, hex.length));
  const per = Math.ceil(hex.length / n);
  const pad = (h) => `${h}0000000-0000-0000-0000-000000000000`;
  const ranges = [];
  for (let i = 0; i < hex.length; i += per) {
    const start = hex[i];
    const endHex = hex[Math.min(hex.length - 1, i + per - 1)];
    const nextIdx = hex.indexOf(endHex) + 1;
    const next = nextIdx < hex.length ? hex[nextIdx] : null;
    ranges.push({
      label: next ? `${start}…${endHex}` : `${start}…f`,
      gte: pad(start),
      lt: next ? pad(next) : null,
    });
  }
  return ranges;
}

/**
 * Aggregate distinct brand_slug from displayable products + shoe flags.
 * Single keyset cursor (id ASC) — UUID range filters hit seq-scans on Supabase
 * so parallelism is counterproductive here. Pages of 500 rows keep per-request
 * latency under statement timeout.
 */
async function aggregateDisplayableBrands() {
  /** @type {Map<string, { slug: string, brand_name: string, count: number, shoe_count: number }>} */
  const bySlug = new Map();
  let scanned = 0;
  let lastId = null;
  const SMALL_PAGE = 500;
  const MAX_PAGES = 2000;
  let retries = 0;

  for (let page = 0; page < MAX_PAGES; page++) {
    let q = sb
      .from("products")
      .select("id, brand_slug, brand_name, category, garment_type")
      .eq("is_displayable", true)
      .not("brand_slug", "is", null)
      .order("id", { ascending: true })
      .limit(SMALL_PAGE);
    if (lastId != null) q = q.gt("id", lastId);

    const { data, error } = await q;
    if (error) {
      if (
        error.code === "57014" ||
        String(error.message || "").includes("timeout")
      ) {
        retries += 1;
        if (retries > 10) {
          console.error("[audit] too many timeouts — aborting scan");
          break;
        }
        console.error(
          `[audit] timeout on page ${page} (last_id=${lastId}), retrying…`
        );
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      throw error;
    }
    retries = 0;
    if (!data?.length) break;

    for (const row of data) {
      lastId = row.id;
      const slug = String(row.brand_slug || "")
        .trim()
        .toLowerCase();
      if (!slug) continue;
      const cur = bySlug.get(slug) || {
        slug,
        brand_name: String(row.brand_name || slug).trim(),
        count: 0,
        shoe_count: 0,
      };
      cur.count += 1;
      if (isShoeRow(row)) cur.shoe_count += 1;
      if ((!cur.brand_name || cur.brand_name === slug) && row.brand_name) {
        cur.brand_name = String(row.brand_name).trim();
      }
      bySlug.set(slug, cur);
    }

    scanned += data.length;
    if (page % 20 === 0) {
      console.error(
        `[audit] scanned ${scanned} displayable rows, ${bySlug.size} distinct brands…`
      );
    }
    if (data.length < SMALL_PAGE) break;
  }

  return { bySlug, scanned };
}

async function countDisplayableForSlug(slug) {
  const { count, error } = await sb
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("is_displayable", true)
    .eq("brand_slug", slug);
  if (error) {
    // Timed-out exact counts: fall back to a capped page length.
    const { data } = await sb
      .from("products")
      .select("id")
      .eq("is_displayable", true)
      .eq("brand_slug", slug)
      .limit(500);
    return data?.length || 0;
  }
  return count ?? 0;
}

async function countShoeDisplayableForSlug(slug) {
  const { count, error } = await sb
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("is_displayable", true)
    .eq("brand_slug", slug)
    .or(
      "garment_type.eq.shoes,garment_type.eq.footwear,category.ilike.%Footwear%,category.ilike.%shoe%"
    );
  if (error) return 0;
  return count ?? 0;
}

async function main() {
  console.error("[audit] loading designers…");
  const designers = await fetchAllDesigners();
  const designerBySlug = new Map();
  for (const d of designers) {
    const slug = String(d.slug || "")
      .trim()
      .toLowerCase();
    if (!slug) continue;
    designerBySlug.set(slug, {
      slug,
      name: d.name || slug,
      is_live: d.is_live === true,
    });
  }
  console.error(`[audit] ${designerBySlug.size} designer rows`);

  // Early priority shoe check (does not wait for full catalog scan).
  const earlySql = [];
  for (const slug of SHOE_FIX_PRIORITY) {
    const d = designerBySlug.get(slug);
    const displayable = await countDisplayableForSlug(slug);
    const shoeCount = displayable > 0 ? await countShoeDisplayableForSlug(slug) : 0;
    if (displayable > 0 && d?.is_live !== true) {
      if (!d) {
        earlySql.push(
          `-- ${slug}: has ${displayable} displayable products but no designers row`
        );
        earlySql.push(
          `INSERT INTO designers (name, slug, is_live) VALUES ('${slug}', '${slug}', true) ON CONFLICT (slug) DO UPDATE SET is_live = true;`
        );
      } else {
        earlySql.push(
          `-- ${slug}: is_live=false but ${displayable} displayable (${shoeCount} shoe-tagged)`
        );
        earlySql.push(
          `UPDATE designers SET is_live = true WHERE slug = '${slug}';`
        );
      }
    }
    console.error(
      `[audit] priority ${slug}: displayable=${displayable} shoe≈${shoeCount} in_directory=${Boolean(d)} is_live=${d?.is_live === true}`
    );
  }
  if (earlySql.length) {
    console.error("\n=== EARLY SQL FIX SUGGESTIONS (print only — not applied) ===");
    for (const line of earlySql) console.error(line);
    console.error("");
  }

  console.error("[audit] aggregating displayable brand_slugs…");
  const { bySlug: catalogBrands, scanned } = await aggregateDisplayableBrands();
  console.error(
    `[audit] done scan: ${scanned} rows, ${catalogBrands.size} distinct brands`
  );

  const missingFromDirectory = [];
  for (const [slug, info] of catalogBrands) {
    if (!designerBySlug.has(slug)) {
      missingFromDirectory.push({
        brand_slug: slug,
        brand_name: info.brand_name,
        displayable_count: info.count,
        shoe_count: info.shoe_count,
      });
    }
  }
  missingFromDirectory.sort((a, b) => b.displayable_count - a.displayable_count);

  const zeroCountLive = [];
  for (const [slug, d] of designerBySlug) {
    if (!d.is_live) continue;
    const count = catalogBrands.get(slug)?.count || 0;
    if (count === 0) {
      zeroCountLive.push({
        slug,
        name: d.name,
        is_live: true,
        displayable_count: 0,
      });
    }
  }
  zeroCountLive.sort((a, b) => a.slug.localeCompare(b.slug));

  const byNormName = new Map();
  for (const d of designerBySlug.values()) {
    const key = normalizeName(d.name);
    if (!key) continue;
    if (!byNormName.has(key)) byNormName.set(key, []);
    byNormName.get(key).push(d);
  }
  const duplicateNames = [];
  for (const [norm, rows] of byNormName) {
    const uniqueSlugs = [...new Set(rows.map((r) => r.slug))];
    if (uniqueSlugs.length < 2) continue;
    duplicateNames.push({
      normalized_name: norm,
      name_samples: [...new Set(rows.map((r) => r.name))],
      slugs: uniqueSlugs,
      is_live_flags: uniqueSlugs.map((s) => designerBySlug.get(s)?.is_live === true),
    });
  }
  duplicateNames.sort((a, b) => b.slugs.length - a.slugs.length);

  const shoeBrandsNotLive = [];
  for (const [slug, info] of catalogBrands) {
    if (info.shoe_count <= 0) continue;
    const d = designerBySlug.get(slug);
    if (d?.is_live === true) continue;
    shoeBrandsNotLive.push({
      brand_slug: slug,
      brand_name: info.brand_name,
      displayable_count: info.count,
      shoe_count: info.shoe_count,
      in_directory: Boolean(d),
      is_live: d?.is_live === true,
    });
  }
  shoeBrandsNotLive.sort((a, b) => b.shoe_count - a.shoe_count);

  const knownShoeHighlight = [];
  for (const slug of KNOWN_SHOE_SLUGS) {
    const info = catalogBrands.get(slug);
    const d = designerBySlug.get(slug);
    if (!info && !d) continue;
    knownShoeHighlight.push({
      brand_slug: slug,
      displayable_count: info?.count || 0,
      shoe_count: info?.shoe_count || 0,
      in_directory: Boolean(d),
      is_live: d?.is_live === true,
      name: d?.name || info?.brand_name || slug,
    });
  }

  const sqlFixSuggestions = [];
  for (const slug of SHOE_FIX_PRIORITY) {
    const info = catalogBrands.get(slug);
    const d = designerBySlug.get(slug);
    if (!info || info.count <= 0) continue;
    if (d?.is_live === true) continue;
    if (!d) {
      sqlFixSuggestions.push(
        `-- ${slug}: has ${info.count} displayable products but no designers row — insert then set live`
      );
      sqlFixSuggestions.push(
        `INSERT INTO designers (name, slug, is_live) VALUES ('${(info.brand_name || slug).replace(/'/g, "''")}', '${slug}', true) ON CONFLICT (slug) DO UPDATE SET is_live = true;`
      );
    } else {
      sqlFixSuggestions.push(
        `-- ${slug}: is_live=false but ${info.count} displayable products (${info.shoe_count} shoe-tagged)`
      );
      sqlFixSuggestions.push(
        `UPDATE designers SET is_live = true WHERE slug = '${slug}';`
      );
    }
  }

  const summary = {
    at: new Date().toISOString(),
    displayable_rows_scanned: scanned,
    distinct_catalog_brands: catalogBrands.size,
    designers_total: designerBySlug.size,
    designers_live: [...designerBySlug.values()].filter((d) => d.is_live).length,
    missing_from_directory_count: missingFromDirectory.length,
    missing_from_directory_top: missingFromDirectory.slice(0, 40),
    zero_count_live_designers_count: zeroCountLive.length,
    zero_count_live_designers: zeroCountLive.slice(0, 50),
    duplicate_names_count: duplicateNames.length,
    duplicate_names: duplicateNames.slice(0, 40),
    shoe_brands_with_products_not_live_count: shoeBrandsNotLive.length,
    shoe_brands_with_products_not_live_top: shoeBrandsNotLive.slice(0, 40),
    known_shoe_slug_highlight: knownShoeHighlight,
    sql_fix_suggestions: sqlFixSuggestions,
  };

  console.log(JSON.stringify(summary, null, 2));

  console.log("\n=== HUMAN SUMMARY ===");
  console.log(
    `Catalog: ${scanned} displayable rows → ${catalogBrands.size} distinct brand_slug`
  );
  console.log(
    `Designers table: ${designerBySlug.size} rows (${summary.designers_live} is_live=true)`
  );
  console.log(
    `Missing from directory: ${missingFromDirectory.length} catalog brands with no designers row`
  );
  if (missingFromDirectory.length) {
    for (const m of missingFromDirectory.slice(0, 15)) {
      console.log(
        `  - ${m.brand_slug} (${m.brand_name}): ${m.displayable_count} displayable` +
          (m.shoe_count ? `, ${m.shoe_count} shoe` : "")
      );
    }
    if (missingFromDirectory.length > 15) {
      console.log(`  … +${missingFromDirectory.length - 15} more`);
    }
  }
  console.log(
    `Zero-count live designers: ${zeroCountLive.length} (is_live=true, 0 displayable)`
  );
  if (zeroCountLive.length) {
    for (const z of zeroCountLive.slice(0, 15)) {
      console.log(`  - ${z.slug} (${z.name})`);
    }
    if (zeroCountLive.length > 15) {
      console.log(`  … +${zeroCountLive.length - 15} more`);
    }
  }
  console.log(`Duplicate designer names: ${duplicateNames.length}`);
  if (duplicateNames.length) {
    for (const dup of duplicateNames.slice(0, 10)) {
      console.log(`  - "${dup.normalized_name}" → ${dup.slugs.join(", ")}`);
    }
  }
  console.log(
    `Shoe-category brands with products but not live: ${shoeBrandsNotLive.length}`
  );
  if (shoeBrandsNotLive.length) {
    for (const s of shoeBrandsNotLive.slice(0, 15)) {
      console.log(
        `  - ${s.brand_slug}: ${s.shoe_count} shoe / ${s.displayable_count} displayable` +
          (s.in_directory ? " (directory is_live=false)" : " (missing from directory)")
      );
    }
  }
  if (knownShoeHighlight.length) {
    console.log("\nKnown shoe slug highlight (present in catalog and/or directory):");
    for (const k of knownShoeHighlight) {
      console.log(
        `  - ${k.brand_slug}: displayable=${k.displayable_count} shoe=${k.shoe_count}` +
          ` in_directory=${k.in_directory} is_live=${k.is_live}`
      );
    }
  }
  if (sqlFixSuggestions.length) {
    console.log("\n=== SQL FIX SUGGESTIONS (print only — not applied) ===");
    for (const line of sqlFixSuggestions) {
      console.log(line);
    }
  } else {
    console.log(
      "\nNo SQL fix suggestions for manolo-blahnik / roger-vivier / golden-goose" +
        " (either live, or no displayable products)."
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
