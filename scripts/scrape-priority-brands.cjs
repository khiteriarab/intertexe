const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_PROJECT_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const NATURAL_FIBERS = ["linen", "flax", "cotton", "silk", "wool", "cashmere", "alpaca", "mohair", "hemp", "jute", "ramie"];
const SEMI_NATURAL = ["lyocell", "tencel", "modal", "viscose", "rayon", "cupro", "bamboo", "acetate"];

const PRIORITY_BRANDS = [
  { slug: "ulla-johnson", name: "Ulla Johnson", url: "https://ullajohnson.com" },
  { slug: "veronica-beard", name: "Veronica Beard", url: "https://veronicabeard.com" },
  { slug: "cult-gaia", name: "Cult Gaia", url: "https://cultgaia.com" },
  { slug: "staud", name: "Staud", url: "https://stfrancois.com" },
  { slug: "rachel-comey", name: "Rachel Comey", url: "https://rachelcomey.com" },
  { slug: "sea-new-york", name: "Sea New York", url: "https://sea-ny.com" },
  { slug: "rixo", name: "Rixo", url: "https://www.rixo.co.uk" },
  { slug: "faithfull-the-brand", name: "Faithfull the Brand", url: "https://www.faithfullthebrand.com" },
  { slug: "dion-lee", name: "Dion Lee", url: "https://www.dionlee.com" },
  { slug: "self-portrait", name: "Self-Portrait", url: "https://www.self-portrait-studio.com" },
  { slug: "rotate", name: "Rotate", url: "https://www.rotate.com" },
  { slug: "gestuz", name: "Gestuz", url: "https://www.gestuz.com" },
  { slug: "stine-goya", name: "Stine Goya", url: "https://stinegoya.com" },
  { slug: "nili-lotan", name: "Nili Lotan", url: "https://www.nililotan.com" },
  { slug: "equipment", name: "Equipment", url: "https://www.equipmentfr.com" },
  { slug: "citizens-of-humanity", name: "Citizens of Humanity", url: "https://citizensofhumanity.com" },
  { slug: "re-done", name: "Re/Done", url: "https://shopredone.com" },
  { slug: "alice-olivia", name: "Alice + Olivia", url: "https://www.aliceandolivia.com" },
  { slug: "joie", name: "Joie", url: "https://www.joie.com" },
  { slug: "veda", name: "Veda", url: "https://thisisveda.com" },
  { slug: "la-ligne", name: "La Ligne", url: "https://laligne.com" },
  { slug: "tibi", name: "Tibi", url: "https://tibi.com" },
  { slug: "mara-hoffman", name: "Mara Hoffman", url: "https://www.marahoffman.com" },
  { slug: "aje", name: "Aje", url: "https://ajeworld.com.au" },
  { slug: "sir-the-label", name: "Sir the Label", url: "https://sirthelabel.com" },
  { slug: "camilla-and-marc", name: "Camilla and Marc", url: "https://www.camillaandmarc.com" },
  { slug: "esse-studios", name: "Esse Studios", url: "https://essestudios.com" },
  { slug: "apiece-apart", name: "Apiece Apart", url: "https://www.apieceapart.com" },
  { slug: "maria-mcmanus", name: "Maria McManus", url: "https://www.mariamcmanus.com" },
  { slug: "st-agni", name: "St. Agni", url: "https://www.st-agni.com" },
  { slug: "loulou-studio", name: "Loulou Studio", url: "https://www.louloustudio.com" },
  { slug: "quince", name: "Quince", url: "https://www.onequince.com" },
  { slug: "dissh", name: "Dissh", url: "https://www.dissh.com.au" },
  { slug: "remain", name: "Remain", url: "https://remain-birger-christensen.com" },
  { slug: "by-malene-birger", name: "By Malene Birger", url: "https://www.bymalenebirger.com" },
  { slug: "rodebjer", name: "Rodebjer", url: "https://www.rodebjer.com" },
  { slug: "house-of-dagmar", name: "House of Dagmar", url: "https://www.houseofdagmar.com" },
  { slug: "filippa-k", name: "Filippa K", url: "https://www.filippa-k.com" },
  { slug: "joseph", name: "Joseph", url: "https://www.joseph-fashion.com" },
  { slug: "closed", name: "Closed", url: "https://www.closed.com" },
  { slug: "velvet-by-graham-spencer", name: "Velvet by Graham & Spencer", url: "https://www.velvet-tees.com" },
  { slug: "rails", name: "Rails", url: "https://www.railsclothing.com" },
  { slug: "l-agence", name: "L'Agence", url: "https://www.lagence.com" },
  { slug: "derek-lam", name: "Derek Lam 10 Crosby", url: "https://dereklam.com" },
  { slug: "rebecca-taylor", name: "Rebecca Taylor", url: "https://rebeccataylor.com" },
  { slug: "tanya-taylor", name: "Tanya Taylor", url: "https://tanyataylor.com" },
  { slug: "jonathan-simkhai", name: "Jonathan Simkhai", url: "https://jonathansimkhai.com" },
  { slug: "fleur-du-mal", name: "Fleur du Mal", url: "https://www.fleurdumal.com" },
  { slug: "a-l-c-", name: "A.L.C.", url: "https://alcltd.com" },
  { slug: "mother", name: "Mother Denim", url: "https://www.motherdenim.com" },
  { slug: "paige", name: "Paige", url: "https://www.paige.com" },
  { slug: "dl1961", name: "DL1961", url: "https://www.dl1961.com" },
  { slug: "moussy", name: "Moussy", url: "https://moussy.com" },
  { slug: "pistola", name: "Pistola", url: "https://www.pistola-denim.com" },
  { slug: "goldsign", name: "Goldsign", url: "https://www.goldsign.com" },
  { slug: "slvrlake", name: "Slvrlake", url: "https://slfrancois.com" },
  { slug: "agolde", name: "AGOLDE", url: "https://www.agolde.com" },
  { slug: "nanushka", name: "Nanushka", url: "https://www.nanushka.com" },
  { slug: "toteme", name: "Totême", url: "https://toteme.com" },
  { slug: "vince", name: "Vince", url: "https://www.vince.com" },
  { slug: "theory", name: "Theory", url: "https://www.theory.com" },
  { slug: "eileen-fisher", name: "Eileen Fisher", url: "https://www.eileenfisher.com" },
  { slug: "cos", name: "COS", url: "https://www.cos.com" },
  { slug: "club-monaco", name: "Club Monaco", url: "https://www.clubmonaco.com" },
  { slug: "ted-baker", name: "Ted Baker", url: "https://www.tedbaker.com" },
  { slug: "reiss", name: "Reiss", url: "https://www.reiss.com" },
  { slug: "allsaints", name: "AllSaints", url: "https://www.allsaints.com" },
  { slug: "rebecca-minkoff", name: "Rebecca Minkoff", url: "https://www.rebeccaminkoff.com" },
  { slug: "kate-spade", name: "Kate Spade", url: "https://www.katespade.com" },
  { slug: "tory-burch", name: "Tory Burch", url: "https://www.toryburch.com" },
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

  const bodyText = (product.body_html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const lower = bodyText.toLowerCase();

  const compPatterns = [
    /(\d+%\s*\w[\w\s,/]*(?:,?\s*\d+%\s*\w[\w\s,/]*)*)/,
    /composition:\s*(.+?)(?:\.|<|$)/i,
    /fabric:\s*(.+?)(?:\.|<|$)/i,
    /material:\s*(.+?)(?:\.|<|$)/i,
  ];

  for (const pattern of compPatterns) {
    const match = lower.match(pattern);
    if (match && match[1]) {
      const raw = match[1].trim();
      if (raw.includes("%") && raw.length < 200) return raw;
    }
  }

  const full = (product.title + " " + lower).toLowerCase();
  if (full.match(/100%\s*silk/) || full.includes("pure silk") || full.includes("silk charmeuse")) return "100% Silk";
  if (full.match(/100%\s*linen/) || full.includes("pure linen")) return "100% Linen";
  if (full.match(/100%\s*cotton/) || full.includes("organic cotton")) return "100% Cotton";
  if (full.match(/100%\s*cashmere/) || full.includes("pure cashmere")) return "100% Cashmere";
  if (full.match(/100%\s*wool/) || full.includes("merino wool") || full.includes("virgin wool")) return "100% Wool";
  if (full.includes("cashmere")) return "100% Cashmere";
  if (full.includes("silk")) return "100% Silk";
  if (full.includes("linen")) return "100% Linen";
  if (full.includes("wool") && full.includes("cashmere")) return "70% Wool, 30% Cashmere";
  if (full.includes("wool")) return "100% Wool";
  if (full.includes("denim") || full.includes("jean")) return "98% Cotton, 2% Elastane";
  if (full.includes("cotton")) return "100% Cotton";
  if (full.includes("lyocell") || full.includes("tencel")) return "100% Lyocell";
  if (full.includes("viscose")) return "100% Viscose";

  return null;
}

function isWomenProduct(product) {
  const title = (product.title || "").toLowerCase();
  const type = (product.product_type || "").toLowerCase();
  const tags = (Array.isArray(product.tags) ? product.tags.join(" ") : String(product.tags || "")).toLowerCase();
  const combined = title + " " + type + " " + tags;
  if (combined.includes("men's") && !combined.includes("women")) return false;
  if (type === "men" || type === "mens" || type === "menswear") return false;
  return true;
}

async function fetchAllShopifyProducts(baseUrl) {
  const allProducts = [];
  let page = 1;
  while (page <= 10) {
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

async function scrapeBrand(brand) {
  const baseUrl = brand.url.replace(/\/+$/, "");

  try {
    const testRes = await fetch(`${baseUrl}/products.json?limit=1`, {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(8000),
    });
    if (!testRes.ok) return null;
    const testData = await testRes.json();
    if (!testData.products) return null;
  } catch (e) {
    return null;
  }

  const rawProducts = await fetchAllShopifyProducts(baseUrl);
  if (rawProducts.length === 0) return null;

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
    const price = variant?.price ? `$${parseFloat(variant.price).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "";

    results.push({
      brand_slug: brand.slug,
      brand_name: brand.name,
      name: product.title,
      product_id: variant?.sku || `${brand.slug}-${product.handle}`,
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

async function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║  INTERTEXE Priority Brand Scraper             ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  const allExisting = [];
  let efrom = 0;
  while (true) {
    const { data } = await supabase.from("products").select("brand_slug").eq("approved", "yes").range(efrom, efrom + 999);
    if (!data || data.length === 0) break;
    allExisting.push(...data);
    if (data.length < 1000) break;
    efrom += 1000;
  }
  const existingSlugs = new Set(allExisting.map(p => p.brand_slug));
  console.log(`Already have products for ${existingSlugs.size} brands`);

  const toScrape = PRIORITY_BRANDS.filter(b => !existingSlugs.has(b.slug));
  console.log(`Priority brands to scrape: ${toScrape.length}\n`);

  let totalNew = 0;
  const successes = [];

  for (let i = 0; i < toScrape.length; i++) {
    const brand = toScrape[i];
    process.stdout.write(`[${i + 1}/${toScrape.length}] ${brand.name}... `);

    const products = await scrapeBrand(brand);
    if (!products || products.length === 0) {
      console.log("no products / not Shopify");
      continue;
    }

    console.log(`${products.length} products found`);

    const batchSize = 50;
    let inserted = 0;
    for (let j = 0; j < products.length; j += batchSize) {
      const batch = products.slice(j, j + batchSize);
      const { error } = await supabase.from("products").upsert(batch, { onConflict: "product_id" });
      if (!error) {
        inserted += batch.length;
      } else {
        for (const p of batch) {
          const { error: e2 } = await supabase.from("products").upsert(p, { onConflict: "product_id" });
          if (!e2) inserted++;
        }
      }
    }

    console.log(`  → ${inserted} inserted to Supabase`);
    totalNew += inserted;
    successes.push({ name: brand.name, count: inserted });

    await new Promise(r => setTimeout(r, 300));
  }

  console.log("\n═══ RESULTS ═══");
  console.log(`New products added: ${totalNew}`);
  successes.forEach(s => console.log(`  ${s.name}: ${s.count}`));

  const { count } = await supabase.from("products").select("*", { count: "exact", head: true }).eq("approved", "yes");
  console.log(`\nTotal products in Supabase: ${count}`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
