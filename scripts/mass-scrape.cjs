const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_PROJECT_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const NATURAL_FIBERS = ["linen", "flax", "cotton", "silk", "wool", "cashmere", "alpaca", "mohair", "hemp", "jute", "ramie"];
const SEMI_NATURAL = ["lyocell", "tencel", "modal", "viscose", "rayon", "cupro", "bamboo", "acetate"];

const WOMEN_CLOTHING_TYPES = [
  "dresses", "dress", "tops", "top", "blouses", "blouse", "shirts", "shirt",
  "skirts", "skirt", "pants", "pant", "trousers", "knitwear", "knits",
  "sweaters", "sweater", "cardigans", "cardigan", "outerwear", "coats", "coat",
  "jackets", "jacket", "blazers", "blazer", "jeans", "denim", "shorts",
  "jumpsuits", "jumpsuit", "rompers", "bodysuits", "camisoles", "tanks",
  "t-shirts", "tees", "women", "womens", "woman", "clothing",
];

const MEN_ONLY_INDICATORS = [
  "menswear", "men's wear", "men's clothing", "for men", "male grooming",
  "men's suits", "neckties", "ties", "cufflinks",
];

const WOMEN_INDICATORS = [
  "womenswear", "women's", "womens", "for women", "ladies", "feminine",
  "dresses", "skirts", "blouses", "lingerie", "maternity",
];

const KNOWN_WOMEN_BRANDS = new Set([
  "khaite", "anine-bing", "reformation", "toteme", "nanushka", "frame",
  "vince", "theory", "sandro", "the-kooples", "agolde", "cos",
  "eileen-fisher", "equipment", "nili-lotan", "filippa-k", "joseph",
  "stella-mccartney", "chloe", "loewe", "bottega-veneta", "acne-studios",
  "max-mara", "arket", "everlane", "massimo-dutti", "zimmermann",
  "iro", "maje", "ba-sh", "sezane", "ganni", "isabel-marant", "jacquemus",
  "proenza-schouler", "rag-bone", "club-monaco", "reiss", "allsaints",
  "ted-baker", "zadig-voltaire", "citizens-of-humanity", "re-done",
  "the-row", "brunello-cucinelli", "loro-piana", "jil-sander", "lemaire",
  "ami-paris", "a-p-c-", "margaret-howell", "loulou-studio", "st-agni",
  "maria-mcmanus", "quince", "other-stories", "claudie-pierlot",
  "aritzia", "mango", "free-people", "anthropologie", "j-crew",
  "alice-olivia", "diane-von-furstenberg", "dvf", "rachel-comey",
  "ulla-johnson", "sea-new-york", "veronica-beard", "derek-lam",
  "tibi", "tory-burch", "kate-spade", "rebecca-taylor",
  "joie", "veda", "la-ligne", "staud", "rouje", "ba-sh",
  "aje", "camilla-and-marc", "sir-the-label", "esse-studios",
  "dissh", "faithfull-the-brand", "cult-gaia", "zimmermann",
  "dion-lee", "self-portrait", "rixo", "ganni", "rotate",
  "stine-goya", "gestuz", "remain", "by-malene-birger",
  "dagmar", "rodebjer", "hope-stockholm", "tiger-of-sweden",
  "house-of-dagmar", "whyred", "sandqvist",
]);

const KNOWN_MEN_ONLY = new Set([
  "brioni", "kiton", "cesare-attolini", "belvest", "isaia",
  "ring-jacket", "spier-and-mackay", "suitsupply", "suit-supply",
  "indochino", "bonobos", "todd-snyder", "buck-mason",
  "taylor-stitch", "billy-reid", "orlebar-brown",
]);

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
    if (fiber.includes("wood pulp") || fiber.includes("flax")) naturalTotal += pct;
    else if (NATURAL_FIBERS.some(f => fiber.includes(f))) naturalTotal += pct;
    else if (SEMI_NATURAL.some(f => fiber.includes(f))) naturalTotal += pct;
  }
  return { composition: cleaned, naturalFiberPercent: Math.min(naturalTotal, 100) };
}

function categorizeProduct(title, tags = [], productType = "") {
  const t = (title + " " + productType).toLowerCase();
  const allTags = (Array.isArray(tags) ? tags.join(" ") : String(tags || "")).toLowerCase();
  const combined = t + " " + allTags;
  if (combined.includes("dress") || combined.includes("skirt")) return "dresses";
  if (combined.includes("sweater") || combined.includes("knit") || combined.includes("cardigan") || combined.includes("pullover") || combined.includes("jumper")) return "knitwear";
  if (combined.includes("top") || combined.includes("shirt") || combined.includes("blouse") || combined.includes("tee") || combined.includes("t-shirt") || combined.includes("tank") || combined.includes("camisole") || combined.includes("bodysuit")) return "tops";
  if (combined.includes("jacket") || combined.includes("coat") || combined.includes("blazer") || combined.includes("vest") || combined.includes("trench") || combined.includes("parka")) return "outerwear";
  if (combined.includes("pant") || combined.includes("trouser") || combined.includes("jean") || combined.includes("short") || combined.includes("denim") || combined.includes("legging")) return "bottoms";
  if (combined.includes("jumpsuit") || combined.includes("romper")) return "dresses";
  return "tops";
}

function extractComposition(product) {
  const materialOption = product.options?.find(o =>
    ["material", "fabric", "composition", "fibre", "fiber"].includes(o.name?.toLowerCase())
  );
  if (materialOption?.values?.[0]) {
    const raw = materialOption.values[0].replace(/(\d+)%/g, "$1% ").replace(/\s+/g, " ").trim();
    if (raw.length > 3) return raw;
  }

  const bodyText = (product.body_html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").toLowerCase();

  const compPatterns = [
    /(\d+%\s*\w[\w\s,/]*(?:\d+%\s*\w[\w\s,/]*)*)/,
    /composition:\s*(.+?)(?:\.|<|$)/i,
    /fabric:\s*(.+?)(?:\.|<|$)/i,
    /material:\s*(.+?)(?:\.|<|$)/i,
    /made (?:of|from|in|with)\s+(\d+%[\w\s,%]+)/i,
  ];

  for (const pattern of compPatterns) {
    const match = bodyText.match(pattern);
    if (match && match[1]) {
      const raw = match[1].trim();
      if (raw.includes("%") && raw.length < 200) return raw;
    }
  }

  return inferFromKeywords(product.title, bodyText);
}

function inferFromKeywords(title, bodyText) {
  const full = (title + " " + bodyText).toLowerCase();

  if (full.match(/100%\s*silk/) || full.includes("pure silk")) return "100% Silk";
  if (full.match(/100%\s*linen/) || full.includes("pure linen")) return "100% Linen";
  if (full.match(/100%\s*cotton/) || full.includes("pure cotton") || full.includes("organic cotton")) return "100% Cotton";
  if (full.match(/100%\s*cashmere/) || full.includes("pure cashmere")) return "100% Cashmere";
  if (full.match(/100%\s*wool/) || full.includes("virgin wool") || full.includes("merino wool")) return "100% Wool";

  if (full.includes("silk charmeuse") || full.includes("silk crepe") || full.includes("silk satin")) return "100% Silk";
  if (full.includes("cashmere")) return "100% Cashmere";
  if (full.includes("silk")) return "100% Silk";
  if (full.includes("linen")) return "100% Linen";
  if (full.includes("wool") && full.includes("cashmere")) return "70% Wool, 30% Cashmere";
  if (full.includes("merino")) return "100% Merino Wool";
  if (full.includes("wool")) return "100% Wool";
  if (full.includes("denim") || full.includes("jean")) return "98% Cotton, 2% Elastane";
  if (full.includes("cotton jersey") || full.includes("cotton tee")) return "100% Cotton";
  if (full.includes("cotton")) return "100% Cotton";
  if (full.includes("poplin")) return "100% Cotton";
  if (full.includes("twill")) return "100% Cotton";
  if (full.includes("lyocell") || full.includes("tencel")) return "100% Lyocell";
  if (full.includes("viscose") || full.includes("rayon")) return "100% Viscose";

  return null;
}

function isWomenProduct(product) {
  const title = (product.title || "").toLowerCase();
  const type = (product.product_type || "").toLowerCase();
  const tags = (Array.isArray(product.tags) ? product.tags.join(" ") : String(product.tags || "")).toLowerCase();
  const combined = title + " " + type + " " + tags;

  if (combined.includes("men's") && !combined.includes("women")) return false;
  if (combined.includes("mens ") && !combined.includes("women")) return false;
  if (type === "men" || type === "mens" || type === "menswear") return false;
  if (tags.includes("mens-only") || tags.includes("men-only")) return false;

  const womenTypes = ["dresses", "dress", "skirts", "skirt", "blouses", "blouse", "lingerie",
    "women", "womens", "woman", "tops", "knitwear", "sweaters", "pants", "trousers",
    "outerwear", "coats", "jackets", "jeans", "denim", "shorts", "jumpsuits"];
  if (womenTypes.some(t => type.includes(t) || tags.includes(t))) return true;

  if (combined.includes("tie bar") || combined.includes("cufflink") || combined.includes("necktie")) return false;

  return true;
}

async function tryShopifyProducts(website, brandSlug) {
  const baseUrls = [];
  if (website) {
    let url = website.replace(/\/+$/, "");
    if (!url.startsWith("http")) url = "https://" + url;
    baseUrls.push(url);
  }

  for (const base of baseUrls) {
    try {
      const testUrl = `${base}/products.json?limit=1`;
      const res = await fetch(testUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.products && Array.isArray(data.products)) {
          return base;
        }
      }
    } catch (e) {}
  }
  return null;
}

async function fetchAllShopifyProducts(baseUrl) {
  const allProducts = [];
  let page = 1;
  const maxPages = 10;
  while (page <= maxPages) {
    try {
      const url = `${baseUrl}/products.json?limit=250&page=${page}`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
        signal: AbortSignal.timeout(15000),
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

async function processProducts(rawProducts, brandSlug, brandName, baseUrl) {
  const results = [];
  for (const product of rawProducts) {
    if (!isWomenProduct(product)) continue;

    const rawComp = extractComposition(product);
    if (!rawComp) continue;

    const { composition, naturalFiberPercent } = parseComposition(rawComp);
    if (naturalFiberPercent < 40) continue;

    const variant = product.variants?.[0];
    const image = product.images?.[0];
    if (!image?.src) continue;

    const tags = Array.isArray(product.tags) ? product.tags : (typeof product.tags === "string" ? product.tags.split(", ") : []);
    const category = categorizeProduct(product.title, tags, product.product_type);

    const price = variant?.price
      ? `$${parseFloat(variant.price).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
      : "";

    results.push({
      brand_slug: brandSlug,
      brand_name: brandName,
      name: product.title,
      product_id: variant?.sku || `${brandSlug}-${product.handle}`,
      url: `${baseUrl}/products/${product.handle}`,
      image_url: image.src,
      price,
      composition,
      natural_fiber_percent: naturalFiberPercent,
      category,
      approved: "yes",
    });
  }
  return results;
}

async function upsertToSupabase(products) {
  let inserted = 0;
  let errors = 0;
  const batchSize = 50;

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    const { error } = await supabase.from("products").upsert(batch, {
      onConflict: "product_id",
      ignoreDuplicates: false,
    });
    if (error) {
      for (const p of batch) {
        const { error: singleErr } = await supabase.from("products").upsert(p, {
          onConflict: "product_id",
          ignoreDuplicates: false,
        });
        if (singleErr) {
          errors++;
        } else {
          inserted++;
        }
      }
    } else {
      inserted += batch.length;
    }
  }
  return { inserted, errors };
}

const KNOWN_WEBSITES = {
  "khaite": "https://khaite.com",
  "anine-bing": "https://www.aninebing.com",
  "reformation": "https://www.thereformation.com",
  "toteme": "https://toteme.com",
  "nanushka": "https://www.nanushka.com",
  "frame": "https://frame-store.com",
  "vince": "https://www.vince.com",
  "sandro": "https://us.sandro-paris.com",
  "the-kooples": "https://www.thekooples.com",
  "agolde": "https://www.agolde.com",
  "cos": "https://www.cos.com",
  "eileen-fisher": "https://www.eileenfisher.com",
  "equipment": "https://www.equipmentfr.com",
  "nili-lotan": "https://www.nililotan.com",
  "filippa-k": "https://www.filippa-k.com",
  "joseph": "https://www.joseph-fashion.com",
  "citizens-of-humanity": "https://citizensofhumanity.com",
  "everlane": "https://www.everlane.com",
  "rag-bone": "https://www.rag-bone.com",
  "reiss": "https://www.reiss.com",
  "allsaints": "https://www.allsaints.com",
  "ted-baker": "https://www.tedbaker.com",
  "club-monaco": "https://www.clubmonaco.com",
  "theory": "https://www.theory.com",
  "zimmermann": "https://www.zimmermann.com",
  "iro": "https://www.iroparis.com",
  "maje": "https://us.maje.com",
  "proenza-schouler": "https://www.proenzaschouler.com",
  "alice-olivia": "https://www.aliceandolivia.com",
  "staud": "https://stfrancois.com",
  "ulla-johnson": "https://ullajohnson.com",
  "veronica-beard": "https://veronicabeard.com",
  "tibi": "https://tibi.com",
  "la-ligne": "https://lalightnyc.com",
  "rachel-comey": "https://rachelcomey.com",
  "sea-new-york": "https://sea-ny.com",
  "joie": "https://www.joie.com",
  "veda": "https://thisisveda.com",
  "rixo": "https://www.rixo.co.uk",
  "cult-gaia": "https://cultgaia.com",
  "stine-goya": "https://stinegoya.com",
  "rotate": "https://www.rotate.com",
  "gestuz": "https://www.gestuz.com",
  "by-malene-birger": "https://www.bymalenebirger.com",
  "rodebjer": "https://www.rodebjer.com",
  "tiger-of-sweden": "https://www.tigerofsweden.com",
  "self-portrait": "https://www.self-portrait-studio.com",
  "dion-lee": "https://www.dionlee.com",
  "faithfull-the-brand": "https://www.faithfullthebrand.com",
  "dissh": "https://www.dissh.com.au",
  "aje": "https://ajeworld.com.au",
  "sir-the-label": "https://sirthelabel.com",
  "camilla-and-marc": "https://www.camillaandmarc.com",
  "esse-studios": "https://essestudios.com",
  "rebecca-taylor": "https://rebeccataylor.com",
  "free-people": "https://www.freepeople.com",
  "aritzia": "https://www.aritzia.com",
  "quince": "https://www.onequince.com",
  "re-done": "https://shopredone.com",
  "st-agni": "https://www.st-agni.com",
  "loulou-studio": "https://www.louloustudio.com",
  "maria-mcmanus": "https://www.mariamcmanus.com",
  "remain": "https://remain-birger-christensen.com",
  "dagmar": "https://www.dagmar.se",
};

function guessWebsite(name, slug) {
  if (KNOWN_WEBSITES[slug]) return KNOWN_WEBSITES[slug];

  const lower = name.toLowerCase().trim();
  const cleaned = lower
    .replace(/[®™*#°&+]/g, "")
    .replace(/[''`]/g, "")
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9.-]/g, "");

  if (cleaned.length < 2) return null;
  return `https://www.${cleaned}.com`;
}

async function getAllBrands() {
  const all = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("designers")
      .select("id, name, slug, website")
      .order("name", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) { console.error("Error fetching brands:", error.message); break; }
    if (!data || data.length === 0) break;
    all.push(...data.map(d => ({
      ...d,
      website: d.website || guessWebsite(d.name, d.slug),
    })));
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

function classifyGender(brand) {
  const slug = brand.slug || "";
  const name = (brand.name || "").toLowerCase();

  if (KNOWN_MEN_ONLY.has(slug)) return "men";
  if (KNOWN_WOMEN_BRANDS.has(slug)) return "women";

  if (MEN_ONLY_INDICATORS.some(i => name.includes(i))) return "men";
  if (WOMEN_INDICATORS.some(i => name.includes(i))) return "women";

  return "unisex";
}

async function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║  INTERTEXE Mass Product Scraper              ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  const args = process.argv.slice(2);
  const mode = args[0] || "scrape";
  const maxBrands = parseInt(args[1]) || 100;

  const allBrands = await getAllBrands();
  console.log(`Total brands in database: ${allBrands.length}`);

  const women = allBrands.filter(b => classifyGender(b) !== "men");
  console.log(`Women's / Unisex brands: ${women.length}`);

  const { data: existingProducts } = await supabase
    .from("products")
    .select("brand_slug")
    .eq("approved", "yes");

  const existingBrandSlugs = new Set((existingProducts || []).map(p => p.brand_slug));
  console.log(`Brands already scraped: ${existingBrandSlugs.size}`);

  const toScrape = women
    .filter(b => !existingBrandSlugs.has(b.slug))
    .filter(b => b.website && b.website.length > 5);

  console.log(`Brands to attempt: ${Math.min(toScrape.length, maxBrands)} (of ${toScrape.length} candidates)\n`);

  let totalNew = 0;
  let shopifyFound = 0;
  let attempted = 0;
  const results = [];

  for (const brand of toScrape.slice(0, maxBrands)) {
    attempted++;
    const pct = ((attempted / Math.min(toScrape.length, maxBrands)) * 100).toFixed(0);
    process.stdout.write(`[${pct}%] ${brand.name} (${brand.website})... `);

    const shopifyUrl = await tryShopifyProducts(brand.website, brand.slug);
    if (!shopifyUrl) {
      console.log("not Shopify / blocked");
      continue;
    }

    shopifyFound++;
    console.log("Shopify detected!");

    try {
      const rawProducts = await fetchAllShopifyProducts(shopifyUrl);
      console.log(`  → ${rawProducts.length} raw products fetched`);

      if (rawProducts.length === 0) continue;

      const processed = await processProducts(rawProducts, brand.slug, brand.name, shopifyUrl);
      console.log(`  → ${processed.length} women's products with composition`);

      if (processed.length > 0) {
        const { inserted, errors } = await upsertToSupabase(processed);
        console.log(`  → ${inserted} inserted/updated, ${errors} errors`);
        totalNew += inserted;
        results.push({ brand: brand.name, slug: brand.slug, products: inserted });
      }
    } catch (e) {
      console.log(`  → Error: ${e.message}`);
    }

    await new Promise(r => setTimeout(r, 500));
  }

  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║  SCRAPING COMPLETE                            ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log(`Brands attempted: ${attempted}`);
  console.log(`Shopify stores found: ${shopifyFound}`);
  console.log(`New products added: ${totalNew}`);

  if (results.length > 0) {
    console.log("\nBrands with new products:");
    results.forEach(r => console.log(`  ${r.brand}: ${r.products} products`));
  }

  const { count } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("approved", "yes");
  console.log(`\nTotal products in Supabase: ${count}`);
}

main().catch(e => {
  console.error("Fatal error:", e);
  process.exit(1);
});
