const { Pool } = require("pg");
const OpenAI = require("openai");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const openai = new OpenAI();

const NATURAL_FIBERS = [
  "linen", "flax", "cotton", "silk", "wool", "cashmere", "alpaca", "mohair",
  "hemp", "jute", "ramie",
];
const SEMI_NATURAL = [
  "lyocell", "tencel", "modal", "viscose", "rayon", "cupro", "bamboo",
  "acetate",
];

function parseComposition(raw) {
  if (!raw) return { composition: "Unknown", naturalFiberPercent: 0 };
  const cleaned = raw.replace(/\s+/g, " ").trim();
  const percentMatches = cleaned.match(/(\d+)%\s*([a-zA-Z\s]+)/g);
  if (!percentMatches) {
    const lower = cleaned.toLowerCase();
    const isNatural = [...NATURAL_FIBERS, ...SEMI_NATURAL].some(f => lower.includes(f));
    return { composition: cleaned, naturalFiberPercent: isNatural ? 80 : 20 };
  }
  let naturalTotal = 0;
  for (const match of percentMatches) {
    const m = match.match(/(\d+)%\s*(.+)/);
    if (!m) continue;
    const pct = parseInt(m[1]);
    const fiber = m[2].trim().toLowerCase().replace(/[,;]/g, "").trim();
    const isNatural = NATURAL_FIBERS.some(f => fiber.includes(f));
    const isSemi = SEMI_NATURAL.some(f => fiber.includes(f));
    if (fiber.includes("wood pulp")) naturalTotal += pct;
    else if (fiber.includes("flax")) naturalTotal += pct;
    else if (isNatural || isSemi) naturalTotal += pct;
  }
  return { composition: cleaned, naturalFiberPercent: Math.min(naturalTotal, 100) };
}

function categorizeProduct(title, tags = []) {
  const t = title.toLowerCase();
  const allTags = tags.join(" ").toLowerCase();
  if (t.includes("dress") || allTags.includes("dress")) return "dresses";
  if (t.includes("skirt")) return "dresses";
  if (t.includes("sweater") || t.includes("knit") || t.includes("cardigan") || t.includes("pullover") || t.includes("jumper"))
    return "knitwear";
  if (t.includes("top") || t.includes("shirt") || t.includes("blouse") || t.includes("tee") || t.includes("t-shirt") || t.includes("tank") || t.includes("camisole"))
    return "tops";
  if (t.includes("jacket") || t.includes("coat") || t.includes("blazer") || t.includes("vest"))
    return "outerwear";
  if (t.includes("pant") || t.includes("trouser") || t.includes("jean") || t.includes("short"))
    return "bottoms";
  return "tops";
}

async function fetchShopifyProducts(baseUrl, collectionSlug, limit = 250) {
  const allProducts = [];
  let page = 1;
  while (true) {
    const url = `${baseUrl}/collections/${collectionSlug}/products.json?limit=${Math.min(limit, 250)}&page=${page}`;
    console.log(`  Fetching page ${page}: ${url}`);
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
      });
      if (!res.ok) break;
      const data = await res.json();
      if (!data.products?.length) break;
      allProducts.push(...data.products);
      if (data.products.length < 250) break;
      page++;
    } catch (e) {
      console.log(`  Error fetching page ${page}:`, e.message);
      break;
    }
  }
  return allProducts;
}

async function fetchShopifyAllProducts(baseUrl, limit = 250) {
  const allProducts = [];
  let page = 1;
  while (true) {
    const url = `${baseUrl}/products.json?limit=${Math.min(limit, 250)}&page=${page}`;
    console.log(`  Fetching all products page ${page}`);
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
      });
      if (!res.ok) break;
      const data = await res.json();
      if (!data.products?.length) break;
      allProducts.push(...data.products);
      if (data.products.length < 250) break;
      page++;
    } catch (e) {
      break;
    }
  }
  return allProducts;
}

function extractKhaiteComposition(product) {
  const materialOption = product.options?.find(
    (o) => o.name?.toLowerCase() === "material"
  );
  if (materialOption?.values?.[0]) {
    const raw = materialOption.values[0]
      .replace(/(\d+)%/g, "$1% ")
      .replace(/\s+/g, " ")
      .trim();
    return raw;
  }
  return null;
}

async function extractCompositionWithAI(title, bodyHtml) {
  if (!bodyHtml) return null;
  const text = bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (text.length < 10) return null;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            'You extract fabric composition from fashion product descriptions. Return ONLY the composition in format like "100% Silk" or "70% Cotton, 30% Linen" or "95% Viscose, 5% Elastane". If the description mentions specific fabrics (e.g., "jersey", "satin", "crepe", "denim") but no percentages, infer the likely composition. If you truly cannot determine ANY fabric information, return "UNKNOWN". Be concise — just the composition string, nothing else.',
        },
        {
          role: "user",
          content: `Product: ${title}\nDescription: ${text.substring(0, 500)}`,
        },
      ],
      max_tokens: 60,
      temperature: 0.1,
    });
    const result = response.choices[0]?.message?.content?.trim();
    if (result && result !== "UNKNOWN") return result;
  } catch (e) {
    console.log(`  AI extraction failed for ${title}:`, e.message);
  }
  return null;
}

async function scrapeKhaite() {
  console.log("\n═══ KHAITE ═══");
  const brandSlug = "khaite";
  const brandName = "Khaite";
  const baseUrl = "https://www.khaite.com";
  const products = [];

  for (const collection of ["dresses", "tops", "knitwear"]) {
    console.log(`\n  Collection: ${collection}`);
    const items = await fetchShopifyProducts(baseUrl, collection);
    console.log(`  Found ${items.length} items`);

    for (const item of items) {
      const rawComp = extractKhaiteComposition(item);
      if (!rawComp) {
        console.log(`  SKIP ${item.title}: no material option`);
        continue;
      }

      const { composition, naturalFiberPercent } = parseComposition(rawComp);

      if (naturalFiberPercent < 50) {
        console.log(`  SKIP ${item.title}: ${composition} (${naturalFiberPercent}%)`);
        continue;
      }

      const variant = item.variants?.[0];
      const image = item.images?.[0];
      const category = categorizeProduct(item.title, item.tags?.split?.(", ") || []);

      products.push({
        brandSlug,
        brandName,
        name: item.title,
        productId: variant?.sku || `khaite-${item.handle}`,
        url: `${baseUrl}/products/${item.handle}`,
        imageUrl: image?.src || "",
        price: variant?.price ? `$${parseFloat(variant.price).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "",
        composition,
        naturalFiberPercent,
        category,
      });
      console.log(`  ✓ ${item.title}: ${composition} (${naturalFiberPercent}%)`);
    }
  }

  console.log(`\n  Khaite total qualifying: ${products.length}`);
  return products;
}

function inferCompositionFromDescription(title, bodyHtml) {
  const text = (bodyHtml || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").toLowerCase().trim();
  const full = (title + " " + text).toLowerCase();

  const percentMatch = text.match(/(\d+%\s*\w[\w\s,/]+(?:\d+%\s*\w[\w\s,/]+)*)/);
  if (percentMatch) return percentMatch[1].trim();

  const FABRIC_MAP = {
    "100% silk": ["silk charmeuse", "silk crepe", "pure silk", "silk camisole", "silk blouse", "silk dress", "silk top"],
    "100% Linen": ["100% linen", "pure linen", "linen fabrication"],
    "100% Cotton": ["100% cotton", "pure cotton", "organic cotton", "cotton poplin", "cotton shirting", "cotton canvas"],
    "100% Cashmere": ["100% cashmere", "pure cashmere", "cashmere knit"],
    "100% Wool": ["100% wool", "pure wool", "virgin wool"],
    "95% Cotton, 5% Elastane": ["denim", "stretch denim", "cotton denim", "raw denim"],
    "80% Cotton, 20% Polyester": ["fleece", "french terry", "terry", "sweatshirt", "hoodie", "crew sweatshirt"],
    "100% Cotton": ["jersey", "cotton jersey", "cotton tee", "t-shirt", "tee"],
    "70% Wool, 30% Cashmere": ["wool-cashmere", "wool cashmere"],
    "90% Viscose, 10% Silk": ["satin", "silk-satin blend"],
    "100% Viscose": ["viscose", "rayon"],
    "50% Wool, 50% Alpaca": ["alpaca blend", "alpaca wool"],
    "100% Leather": ["leather"],
  };

  for (const [comp, keywords] of Object.entries(FABRIC_MAP)) {
    for (const kw of keywords) {
      if (full.includes(kw)) return comp;
    }
  }

  if (full.includes("silk")) return "100% Silk";
  if (full.includes("linen")) return "100% Linen";
  if (full.includes("cashmere")) return "100% Cashmere";
  if (full.includes("wool") && full.includes("cashmere")) return "70% Wool, 30% Cashmere";
  if (full.includes("wool")) return "100% Wool";
  if (full.includes("cotton")) return "100% Cotton";
  if (full.includes("knit") || full.includes("sweater") || full.includes("cardigan")) return "80% Wool, 20% Nylon";

  return null;
}

async function scrapeAnineBing() {
  console.log("\n═══ ANINE BING ═══");
  const brandSlug = "anine-bing";
  const brandName = "Anine Bing";
  const baseUrl = "https://www.aninebing.com";
  const products = [];

  const allItems = await fetchShopifyAllProducts(baseUrl);
  console.log(`  Total products fetched: ${allItems.length}`);

  const clothingTypes = ["DRESSES", "TOPS", "KNITS", "KNITWEAR", "SWEATERS", "SHIRTS", "BLOUSES", "T-SHIRTS", "TANKS"];
  const clothing = allItems.filter(
    (p) => clothingTypes.includes(p.product_type?.toUpperCase()) ||
      (p.tags && clothingTypes.some(t => (Array.isArray(p.tags) ? p.tags.join(" ") : String(p.tags)).toUpperCase().includes(t)))
  );
  console.log(`  Clothing items: ${clothing.length}`);

  for (const item of clothing) {
    const rawComp = inferCompositionFromDescription(item.title, item.body_html);
    if (!rawComp) {
      console.log(`  SKIP ${item.title}: could not infer composition`);
      continue;
    }

    const { composition, naturalFiberPercent } = parseComposition(rawComp);

    if (naturalFiberPercent < 50) {
      console.log(`  SKIP ${item.title}: ${composition} (${naturalFiberPercent}%)`);
      continue;
    }

    const variant = item.variants?.[0];
    const image = item.images?.[0];
    const tags = Array.isArray(item.tags) ? item.tags : (typeof item.tags === "string" ? item.tags.split(", ") : []);
    const category = categorizeProduct(item.title, tags);

    products.push({
      brandSlug,
      brandName,
      name: item.title,
      productId: variant?.sku || `ab-${item.handle}`,
      url: `${baseUrl}/products/${item.handle}`,
      imageUrl: image?.src || "",
      price: variant?.price ? `$${parseFloat(variant.price).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "",
      composition,
      naturalFiberPercent,
      category,
    });
    console.log(`  ✓ ${item.title}: ${composition} (${naturalFiberPercent}%)`);
  }

  console.log(`\n  Anine Bing total qualifying: ${products.length}`);
  return products;
}

async function insertProducts(products) {
  const client = await pool.connect();
  let inserted = 0;
  let skipped = 0;

  for (const p of products) {
    try {
      await client.query(
        `INSERT INTO products (brand_slug, brand_name, name, product_id, url, image_url, price, composition, natural_fiber_percent, category)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (product_id) DO UPDATE SET
           composition = EXCLUDED.composition,
           natural_fiber_percent = EXCLUDED.natural_fiber_percent,
           image_url = EXCLUDED.image_url,
           price = EXCLUDED.price`,
        [p.brandSlug, p.brandName, p.name, p.productId, p.url, p.imageUrl, p.price, p.composition, p.naturalFiberPercent, p.category]
      );
      inserted++;
    } catch (e) {
      console.log(`  Error inserting ${p.name}:`, e.message);
      skipped++;
    }
  }

  client.release();
  console.log(`\n  Inserted/updated: ${inserted}, Skipped: ${skipped}`);
  return inserted;
}

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║  INTERTEXE Product Scraper               ║");
  console.log("╚══════════════════════════════════════════╝");

  const args = process.argv.slice(2);
  const brandFilter = args[0]?.toLowerCase();

  let allProducts = [];

  if (!brandFilter || brandFilter === "khaite") {
    const khaiteProducts = await scrapeKhaite();
    allProducts.push(...khaiteProducts);
  }

  if (!brandFilter || brandFilter === "anine-bing") {
    const abProducts = await scrapeAnineBing();
    allProducts.push(...abProducts);
  }

  if (allProducts.length > 0) {
    console.log("\n═══ INSERTING INTO DATABASE ═══");
    await insertProducts(allProducts);
  }

  const { rows } = await pool.query(
    "SELECT brand_name, COUNT(*)::int as count FROM products WHERE approved='yes' GROUP BY brand_name ORDER BY brand_name"
  );
  console.log("\n═══ DATABASE SUMMARY ═══");
  let total = 0;
  rows.forEach((r) => {
    console.log(`  ${r.brand_name}: ${r.count} products`);
    total += r.count;
  });
  console.log(`  TOTAL: ${total} products`);

  await pool.end();
  console.log("\nDone!");
}

main().catch((e) => {
  console.error("Fatal error:", e);
  pool.end();
  process.exit(1);
});
