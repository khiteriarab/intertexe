const { createClient } = require("@supabase/supabase-js");
const https = require("https");
const http = require("http");
const zlib = require("zlib");
const { Transform } = require("stream");

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const AWIN_FEED_URL = process.env.AWIN_FEED_URL || "https://productdata.awin.com/datafeed/download/apikey/77fdd3b9a4137c13bf98d2808cffd12a/language/en/cid/97,98,142,144,146,129,595,539,147,149,613,626,135,163,159,161,170,137,171,548,174,183,178,179,175,172,623,139,614,189,194,141,205,198,206,203,208,199,204,201/hasEnhancedFeeds/0/columns/aw_deep_link,product_name,aw_product_id,merchant_product_id,merchant_image_url,description,merchant_category,search_price,merchant_name,merchant_id,category_name,category_id,aw_image_url,currency,store_price,delivery_cost,merchant_deep_link,language,last_updated,display_price,data_feed_id,brand_name,brand_id,colour,product_short_description,specifications,condition,product_model,model_number,dimensions,keywords,promotional_text,product_type,rrp_price,saving,savings_percent,base_price,base_price_amount,base_price_text,product_price_old,commission_group,merchant_product_category_path,merchant_product_second_category,merchant_product_third_category,merchant_thumb_url,large_image,alternate_image,aw_thumb_url,alternate_image_two,alternate_image_three,alternate_image_four,in_stock,stock_quantity,valid_from,valid_to,is_for_sale,web_offer,pre_order,stock_status,size_stock_status,size_stock_amount,delivery_restrictions,delivery_weight,warranty,terms_of_contract,delivery_time,ean,isbn,upc,mpn,parent_product_id,product_GTIN/format/csv/delimiter/%2C/compression/gzip/adultcontent/1/";

const NATURAL_FIBERS = ["cotton", "linen", "flax", "silk", "wool", "cashmere", "alpaca", "mohair", "hemp", "jute", "ramie", "merino", "angora", "camel", "yak", "pima", "supima"];
const SYNTHETIC_FIBERS = ["polyester", "nylon", "polyamide", "acrylic", "elastane", "spandex", "lycra", "metallic", "rubber", "polyurethane", "polypropylene", "viscose", "rayon", "modal", "lyocell", "tencel", "cupro", "acetate", "triacetate"];

const WOMEN_CLOTHING_KEYWORDS = [
  "dress", "dresses", "top", "tops", "blouse", "shirt", "skirt",
  "pant", "pants", "trouser", "trousers", "jean", "jeans", "denim",
  "sweater", "cardigan", "knit", "knitwear", "pullover", "jumper",
  "jacket", "coat", "blazer", "outerwear", "vest",
  "shorts", "camisole", "bodysuit", "tank", "tee", "t-shirt",
];

const EXCLUDE_KEYWORDS = [
  "men's", "mens ", "boy's", "boys ", "kid's", "kids ", "children",
  "baby ", "infant", "toddler", "pet ", "dog ", "cat ",
  "shoe", "boot", "sandal", "sneaker", "heel", "loafer", "slipper",
  "bag", "handbag", "purse", "wallet", "clutch", "tote",
  "watch", "jewelry", "jewellery", "necklace", "bracelet", "earring", "ring",
  "perfume", "fragrance", "makeup", "cosmetic", "skincare",
  "sunglasses", "glasses", "eyewear",
  "belt", "hat", "cap", "scarf", "glove", "sock", "underwear", "bra", "lingerie",
  "home", "furniture", "decor", "candle", "cushion", "bedding", "towel",
  "phone case", "tech", "electronic",
];

function calcNaturalPercent(text) {
  if (!text) return 0;
  const lower = text.toLowerCase();
  const parts = lower.split(/[,;\/]+/);
  let naturalTotal = 0;
  let totalParsed = 0;

  for (const part of parts) {
    const pctMatch = part.match(/([\d.]+)\s*%/);
    if (!pctMatch) continue;
    const pct = parseFloat(pctMatch[1]);
    totalParsed += pct;
    const isNatural = NATURAL_FIBERS.some(f => part.includes(f));
    const isSynthetic = SYNTHETIC_FIBERS.some(f => part.includes(f));
    if (isNatural && !isSynthetic) naturalTotal += pct;
  }

  if (totalParsed === 0) {
    const isNatural = NATURAL_FIBERS.some(f => lower.includes(f));
    const isSynthetic = SYNTHETIC_FIBERS.some(f => lower.includes(f));
    if (isNatural && !isSynthetic) return 100;
    return 0;
  }

  return Math.round(Math.min(naturalTotal, 100));
}

function extractComposition(description, specs, shortDesc) {
  const sources = [specs, description, shortDesc].filter(Boolean);
  for (const text of sources) {
    const lower = text.toLowerCase();
    const compMatch = lower.match(/(?:composition|material|fabric|made of|content)[:\s]*([^.]+)/i);
    if (compMatch) {
      const candidate = compMatch[1].trim();
      if (/\d+%/.test(candidate)) return candidate.substring(0, 200);
    }
    const pctMatch = lower.match(/(\d+%\s*[a-zA-Z\s]+(?:[,;\/]\s*\d+%\s*[a-zA-Z\s]+)*)/);
    if (pctMatch) {
      const candidate = pctMatch[1].trim();
      if (NATURAL_FIBERS.some(f => candidate.includes(f)) || SYNTHETIC_FIBERS.some(f => candidate.includes(f))) {
        return candidate.substring(0, 200);
      }
    }
  }
  return null;
}

function isWomensClothing(name, category, type, categoryPath) {
  const combined = `${name} ${category} ${type} ${categoryPath}`.toLowerCase();
  if (EXCLUDE_KEYWORDS.some(k => combined.includes(k))) return false;
  if (WOMEN_CLOTHING_KEYWORDS.some(k => combined.includes(k))) return true;
  if (/women|woman|ladies|lady/i.test(combined)) return true;
  return false;
}

function categorizeProduct(name, category, type) {
  const combined = `${name} ${category} ${type}`.toLowerCase();
  if (combined.includes("skirt")) return "bottoms";
  if (combined.includes("dress")) return "dresses";
  if (combined.includes("sweater") || combined.includes("knit") || combined.includes("cardigan") || combined.includes("pullover") || combined.includes("jumper")) return "knitwear";
  if (combined.includes("top") || combined.includes("shirt") || combined.includes("blouse") || combined.includes("tee") || combined.includes("t-shirt") || combined.includes("tank") || combined.includes("camisole") || combined.includes("bodysuit")) return "tops";
  if (combined.includes("jacket") || combined.includes("coat") || combined.includes("blazer") || combined.includes("vest") || combined.includes("trench") || combined.includes("parka")) return "outerwear";
  if (combined.includes("pant") || combined.includes("trouser") || combined.includes("jean") || combined.includes("short") || combined.includes("denim") || combined.includes("legging")) return "bottoms";
  return "tops";
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function parseCSVRow(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function fetchUrl(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith("https") ? https : http;
    proto.get(url, { timeout: 30000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (maxRedirects <= 0) return reject(new Error("Too many redirects"));
        return fetchUrl(res.headers.location, maxRedirects - 1).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      resolve(res);
    }).on("error", reject);
  });
}

async function main() {
  console.log("Downloading Awin feed...");
  const response = await fetchUrl(AWIN_FEED_URL);

  let stream = response;
  const contentEncoding = response.headers["content-encoding"];
  if (contentEncoding === "gzip" || AWIN_FEED_URL.includes("compression/gzip")) {
    stream = response.pipe(zlib.createGunzip());
  }

  let headers = null;
  let buffer = "";
  let totalRows = 0;
  let qualifyingProducts = [];
  let skippedNoComp = 0;
  let skippedLowFiber = 0;
  let skippedNotClothing = 0;
  let skippedOutOfStock = 0;

  const BATCH_SIZE = 50;

  await new Promise((resolve, reject) => {
    stream.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.trim()) continue;
        const fields = parseCSVRow(line);

        if (!headers) {
          headers = fields.map(h => h.trim().toLowerCase());
          console.log(`Feed columns: ${headers.length}`);
          console.log(`First 10: ${headers.slice(0, 10).join(", ")}`);
          continue;
        }

        totalRows++;
        const row = {};
        headers.forEach((h, i) => { row[h] = fields[i] || ""; });

        if (row.in_stock === "0" || row.is_for_sale === "0") {
          skippedOutOfStock++;
          continue;
        }

        const name = row.product_name || "";
        const brand = row.brand_name || row.merchant_name || "";
        const category = row.merchant_category || row.category_name || "";
        const type = row.product_type || "";
        const categoryPath = row.merchant_product_category_path || "";

        if (!isWomensClothing(name, category, type, categoryPath)) {
          skippedNotClothing++;
          continue;
        }

        const composition = extractComposition(row.description, row.specifications, row.product_short_description);
        if (!composition) {
          skippedNoComp++;
          continue;
        }

        const naturalPct = calcNaturalPercent(composition);
        if (naturalPct < 95) {
          skippedLowFiber++;
          continue;
        }

        const imageUrl = row.large_image || row.merchant_image_url || row.aw_image_url || "";
        const price = row.search_price || row.store_price || row.display_price || "";
        const url = row.aw_deep_link || row.merchant_deep_link || "";

        if (!imageUrl || !price || !url) continue;

        const productCategory = categorizeProduct(name, category, type);
        const brandSlug = slugify(brand);
        const formattedPrice = price.startsWith("$") ? price : `$${parseFloat(price).toFixed(2)}`;

        qualifyingProducts.push({
          brand_slug: brandSlug,
          brand_name: brand,
          name: name.substring(0, 300),
          product_id: row.aw_product_id || row.merchant_product_id || `awin-${Date.now()}-${totalRows}`,
          url,
          image_url: imageUrl,
          price: formattedPrice,
          composition: composition.substring(0, 300),
          natural_fiber_percent: naturalPct,
          category: productCategory,
        });
      }
    });

    stream.on("end", () => {
      if (buffer.trim() && headers) {
        const fields = parseCSVRow(buffer);
        totalRows++;
      }
      resolve();
    });

    stream.on("error", reject);
  });

  console.log(`\n=== FEED SUMMARY ===`);
  console.log(`Total rows parsed: ${totalRows}`);
  console.log(`Skipped (out of stock): ${skippedOutOfStock}`);
  console.log(`Skipped (not women's clothing): ${skippedNotClothing}`);
  console.log(`Skipped (no composition found): ${skippedNoComp}`);
  console.log(`Skipped (below 95% natural): ${skippedLowFiber}`);
  console.log(`Qualifying products: ${qualifyingProducts.length}`);

  if (qualifyingProducts.length === 0) {
    console.log("No qualifying products found. Exiting.");
    return;
  }

  console.log(`\nFirst 5 qualifying products:`);
  qualifyingProducts.slice(0, 5).forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.brand_name} — ${p.name} (${p.composition}, ${p.natural_fiber_percent}%, ${p.price})`);
  });

  const dryRun = process.argv.includes("--dry-run");
  if (dryRun) {
    console.log("\n--dry-run mode: not inserting into database.");
    console.log(`\nBrand distribution:`);
    const brands = {};
    qualifyingProducts.forEach(p => { brands[p.brand_name] = (brands[p.brand_name] || 0) + 1; });
    Object.entries(brands).sort((a, b) => b[1] - a[1]).slice(0, 20).forEach(([b, c]) => {
      console.log(`  ${b}: ${c}`);
    });
    return;
  }

  console.log(`\nInserting ${qualifyingProducts.length} products into Supabase...`);
  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < qualifyingProducts.length; i += BATCH_SIZE) {
    const batch = qualifyingProducts.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from("products")
      .upsert(batch, {
        onConflict: "product_id",
        ignoreDuplicates: false,
      });

    if (error) {
      console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, error.message);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }

    if ((i + BATCH_SIZE) % 500 === 0 || i + BATCH_SIZE >= qualifyingProducts.length) {
      console.log(`  Progress: ${Math.min(i + BATCH_SIZE, qualifyingProducts.length)}/${qualifyingProducts.length}`);
    }
  }

  console.log(`\n=== IMPORT COMPLETE ===`);
  console.log(`Inserted/updated: ${inserted}`);
  console.log(`Errors: ${errors}`);

  const brandSlugs = [...new Set(qualifyingProducts.map(p => p.brand_slug))];
  console.log(`\nChecking ${brandSlugs.length} brands in designers table...`);
  let newBrands = 0;
  for (const slug of brandSlugs) {
    const { data: existing } = await supabase
      .from("designers")
      .select("id")
      .eq("slug", slug)
      .limit(1);

    if (!existing || existing.length === 0) {
      const brandName = qualifyingProducts.find(p => p.brand_slug === slug)?.brand_name || slug;
      const { error } = await supabase
        .from("designers")
        .insert({ name: brandName, slug, status: "live" });
      if (!error) {
        newBrands++;
        console.log(`  Added brand: ${brandName} (${slug})`);
      }
    }
  }
  console.log(`New brands added: ${newBrands}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
