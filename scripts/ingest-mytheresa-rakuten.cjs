const { createClient } = require("@supabase/supabase-js");
const Client = require("ftp");
const zlib = require("zlib");
const { Transform } = require("stream");

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FTP_HOST = process.env.RAKUTEN_FTP_HOST || "aftp.linksynergy.com";
const FTP_USER = process.env.RAKUTEN_FTP_USER || "rkp_4668007";
const FTP_PASSWORD = process.env.RAKUTEN_FTP_PASSWORD;
const AFFILIATE_ID = process.env.RAKUTEN_AFFILIATE_ID || "*8b0zWDyXo0";
const MIN_NATURAL_PERCENT = parseInt(process.env.MIN_NATURAL_PERCENT || "95", 10);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

if (!FTP_PASSWORD) {
  console.error("Missing RAKUTEN_FTP_PASSWORD");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const MARKETS = {
  "us-ca": {
    mid: "43172",
    label: "US/CA",
    productPrefix: "mytheresa-us-ca",
    currencyFallback: "USD",
  },
  "eu-uk-me": {
    mid: "35663",
    label: "EU/UK/ME",
    productPrefix: "mytheresa-eu-uk-me",
    currencyFallback: "EUR",
  },
};

const NATURAL_FIBERS = [
  "cotton", "silk", "wool", "linen", "flax", "cashmere", "mohair", "alpaca",
  "hemp", "ramie", "jute", "merino", "angora", "camel", "yak", "pima",
  "supima", "virgin wool", "lambswool",
];

const KNOWN_FIBERS = [
  ...NATURAL_FIBERS,
  "polyester", "nylon", "acrylic", "spandex", "elastane", "lycra",
  "viscose", "rayon", "modal", "lyocell", "tencel", "acetate", "polyamide",
  "polypropylene", "rubber", "polyurethane", "cupro", "triacetate",
  "metallic", "lurex", "down", "feather", "leather", "suede",
];

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function isKnownFiber(name) {
  const lower = name.toLowerCase().trim();
  return KNOWN_FIBERS.some(f => lower === f || lower === `${f}s`);
}

function titleCaseFiber(name) {
  if (name.toLowerCase() === "spandex") return "Elastane";
  if (name.toLowerCase() === "rayon") return "Viscose";
  return name
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function parseFiberGroup(str) {
  const cleaned = String(str || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/[,/&]/g, " ")
    .replace(/\b(hand|machine)\s+wash.*/i, "")
    .replace(/\bdry\s+clean.*/i, "")
    .replace(/\bimported.*/i, "")
    .replace(/\bmade\s+in.*/i, "")
    .replace(/\s+/g, " ")
    .trim();

  const matches = [...cleaned.matchAll(/(\d+)\s*%\s*([A-Za-z][A-Za-z\s-]*?)(?=\s+\d+\s*%|$)/g)];
  const fibers = [];
  let runningTotal = 0;

  for (const match of matches) {
    const pct = parseInt(match[1], 10);
    let name = match[2].trim();
    if (pct <= 0 || name.length > 40) continue;

    const words = name.split(/\s+/);
    const validWords = words.filter(w => isKnownFiber(w) || isKnownFiber(w.replace(/s$/, "")));
    if (validWords.length === 0 && !isKnownFiber(name)) continue;

    name = titleCaseFiber(validWords.length ? validWords.join(" ") : name);
    if (runningTotal >= 100) break;
    fibers.push({ pct, name });
    runningTotal += pct;
  }

  return fibers;
}

function extractComposition(desc) {
  if (!desc) return { composition: null, pct: null };

  let text = String(desc)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const labels = "Body|Shell|Outer|Self|Fabric|Main|Material|Composition|Combo\\s*\\d*|Contrast|Trim|Panel|Lining|Gusset|Elastic|Rib|Filling|Pocket|Sleeves|Collar|Hood|Insert|Waistband|Lace|Cup|Strap|Band";
  text = text.replace(new RegExp(`(${labels})\\s*:`, "gi"), "\n$1:");

  const sections = [];
  for (const line of text.split("\n").filter(Boolean)) {
    const labelMatch = line.match(new RegExp(`^(${labels})\\s*:\\s*`, "i"));
    if (!labelMatch) continue;
    let label = labelMatch[1].toLowerCase().replace(/\s*\d+$/, "");
    if (["shell", "outer", "self", "fabric", "main", "material", "composition"].includes(label)) label = "body";
    const fibers = parseFiberGroup(line.replace(labelMatch[0], ""));
    if (fibers.length > 0) sections.push({ label, fibers });
  }

  if (sections.length === 0) {
    const fibers = parseFiberGroup(text);
    if (fibers.length > 0) sections.push({ label: "body", fibers });
  }

  if (sections.length === 0 || !sections.some(s => s.label === "body")) {
    return { composition: null, pct: null };
  }

  const partWeights = {
    body: 0.70, combo: 0.15, contrast: 0.10, trim: 0.05, panel: 0.10,
    lining: 0.15, gusset: 0.05, elastic: 0.03, rib: 0.05, filling: 0.10,
    pocket: 0.03, sleeves: 0.15, collar: 0.03, hood: 0.05, insert: 0.05,
    waistband: 0.05, lace: 0.20, cup: 0.15, strap: 0.05, band: 0.05,
  };

  const composition = sections.map(section => {
    const label = section.label === "body" && sections.length === 1
      ? ""
      : `${section.label.charAt(0).toUpperCase()}${section.label.slice(1)}: `;
    return label + section.fibers.map(f => `${f.pct}% ${f.name}`).join(", ");
  }).join(" | ");

  let totalWeight = 0;
  let naturalWeighted = 0;
  for (const section of sections) {
    const weight = section.label === "body" && sections.length === 1 ? 1.0 : (partWeights[section.label] || 0.05);
    totalWeight += weight;
    const naturalTotal = section.fibers
      .filter(f => NATURAL_FIBERS.some(nf => f.name.toLowerCase().includes(nf)))
      .reduce((sum, f) => sum + f.pct, 0);
    naturalWeighted += (naturalTotal / 100) * weight;
  }

  const pct = totalWeight > 0 ? Math.min(100, Math.round((naturalWeighted / totalWeight) * 100)) : null;
  return { composition, pct };
}

function isWomensClothing(item) {
  const gender = (item.gender || "").toLowerCase();
  const text = `${item.name} ${item.googleCategory} ${item.category} ${item.merchantCategory}`.toLowerCase();
  if (gender && !["female", "women", "woman", "unisex"].includes(gender)) return false;
  if (/\b(men|mens|men's|boy|boys|kid|kids|baby)\b/.test(text) && !/\bboyfriend\b/.test(text)) return false;
  if (/\b(shoe|sneaker|sandal|boot|bag|wallet|jewelry|jewellery|earring|necklace|bracelet|watch|sunglasses|perfume|fragrance|beauty|home)\b/.test(text)) return false;
  return /\b(clothing|apparel|dress|top|shirt|blouse|skirt|pant|trouser|jean|short|sweater|cardigan|knit|jacket|coat|blazer|vest|jumpsuit|romper)\b/.test(text);
}

function mapCategory(item) {
  const text = `${item.name} ${item.category} ${item.googleCategory} ${item.merchantCategory}`.toLowerCase();
  if (/\bskirt/.test(text)) return "skirts";
  if (/\bdress|gown|jumpsuit|romper/.test(text)) return "dresses";
  if (/\bsweater|cardigan|knit|pullover|jumper/.test(text)) return "knitwear";
  if (/\bjacket|coat|blazer|vest|trench|parka|cape/.test(text)) return "outerwear";
  if (/\bpant|trouser|jean|short|denim|legging/.test(text)) return "bottoms";
  if (/\bswim|bikini|one-piece/.test(text)) return "swimwear";
  if (/\blingerie|bra|underwear|brief/.test(text)) return "lingerie";
  return "tops";
}

function formatPrice(value, currency) {
  const amount = parseFloat(value);
  if (!Number.isFinite(amount) || amount <= 0) return "";
  const symbol = currency === "GBP" ? "£" : currency === "EUR" ? "€" : "$";
  return `${symbol}${amount.toFixed(2)}`;
}

function buildAffiliateUrl(feedUrl, mid) {
  const filled = String(feedUrl || "")
    .replace("<LSN EID>", AFFILIATE_ID)
    .replace("<LSN OID>", mid);
  const murlMatch = filled.match(/murl=([^&]+)/);
  if (murlMatch) {
    return `https://click.linksynergy.com/deeplink?id=${AFFILIATE_ID}&mid=${mid}&murl=${murlMatch[1]}`;
  }
  return filled;
}

function productKey(item, market) {
  const urlMatch = String(item.affiliateUrl || "").match(/murl=([^&]+)/);
  if (urlMatch) {
    try {
      const url = decodeURIComponent(urlMatch[1]);
      const clean = url.replace(/[?#].*$/, "").replace(/\/$/, "");
      const slug = clean.split("/").filter(Boolean).pop();
      if (slug) return `${market.productPrefix}-${slug}`;
    } catch {}
  }
  return `${market.productPrefix}-${slugify(item.brand)}-${slugify(item.sku || item.id || item.name)}`;
}

function parseLine(line) {
  const f = line.split("|");
  if (f.length < 34) return null;
  return {
    id: f[0],
    name: f[1],
    sku: f[2],
    googleCategory: f[3],
    category: f[4],
    affiliateUrl: f[5],
    imageUrl: f[6],
    shortDesc: f[8],
    longDesc: f[9],
    discountAmount: parseFloat(f[10]) || 0,
    salePrice: parseFloat(f[12]) || 0,
    retailPrice: parseFloat(f[13]) || 0,
    brand: f[16] || "",
    currency: f[25] || "",
    merchantCategory: f[29],
    size: f[30],
    color: f[32],
    gender: f[33],
  };
}

function connectFtp() {
  return new Promise((resolve, reject) => {
    const client = new Client();
    client.on("ready", () => resolve(client));
    client.on("error", reject);
    client.connect({
      host: FTP_HOST,
      user: FTP_USER,
      password: FTP_PASSWORD,
      connTimeout: 30000,
      pasvTimeout: 30000,
    });
  });
}

async function resolveFeedFile(client, market) {
  const explicit = process.env[`RAKUTEN_FTP_FILE_${market.mid}`] || process.env.RAKUTEN_FTP_FILE;
  if (explicit) return explicit;

  const list = await new Promise((resolve, reject) => {
    client.list((err, files) => err ? reject(err) : resolve(files || []));
  });
  const names = list.map(f => f.name);
  const match = names.find(name => name.includes(market.mid) && /\.txt\.gz$/i.test(name))
    || names.find(name => name.includes(market.mid));
  if (!match) {
    throw new Error(`No FTP feed file found for MID ${market.mid}. Set RAKUTEN_FTP_FILE_${market.mid} explicitly.`);
  }
  return match;
}

async function streamMarketFeed(marketKey, market, options) {
  const client = await connectFtp();
  try {
    const fileName = await resolveFeedFile(client, market);
    console.log(`\n${market.label}: downloading ${fileName}`);

    const products = new Map();
    let totalLines = 0;
    let womensLines = 0;
    let noBrand = 0;
    let noComposition = 0;
    let belowThreshold = 0;

    await new Promise((resolve, reject) => {
      client.get(fileName, (err, stream) => {
        if (err) return reject(err);

        const gunzip = fileName.endsWith(".gz") ? zlib.createGunzip() : new Transform({
          transform(chunk, enc, cb) { cb(null, chunk); },
        });
        let partial = "";

        const liner = new Transform({
          transform(chunk, enc, cb) {
            partial += chunk.toString();
            const lines = partial.split("\n");
            partial = lines.pop();

            for (const rawLine of lines) {
              const line = rawLine.trim();
              if (!line || line.startsWith("HDR")) continue;
              totalLines++;
              if (options.limit && totalLines > options.limit) continue;

              const item = parseLine(line);
              if (!item) continue;
              if (!item.brand) { noBrand++; continue; }
              if (!isWomensClothing(item)) continue;
              womensLines++;

              const desc = item.longDesc || item.shortDesc;
              const { composition, pct } = extractComposition(desc);
              if (!composition || pct === null) { noComposition++; continue; }
              if (pct < MIN_NATURAL_PERCENT) { belowThreshold++; continue; }

              const key = productKey(item, market);
              if (products.has(key)) continue;

              const currentPrice = item.salePrice > 0 ? item.salePrice : item.retailPrice;
              const originalPrice = item.retailPrice > 0 ? item.retailPrice : currentPrice;
              const currency = item.currency || market.currencyFallback;
              const price = formatPrice(currentPrice, currency);
              if (!price || !item.imageUrl || !item.affiliateUrl) continue;

              const isSale = item.discountAmount > 0 || (originalPrice > currentPrice && currentPrice > 0);
              const brandSlug = slugify(item.brand);
              let cleanName = item.name.replace(new RegExp(`^${item.brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+`, "i"), "");
              cleanName = cleanName.replace(/\s+/g, " ").trim();

              const product = {
                name: cleanName.substring(0, 300),
                brand_name: item.brand,
                brand_slug: brandSlug,
                product_id: key,
                price,
                url: buildAffiliateUrl(item.affiliateUrl, market.mid),
                image_url: item.imageUrl,
                composition: composition.substring(0, 300),
                natural_fiber_percent: pct,
                category: mapCategory(item),
                is_sale: isSale,
                approved: "yes",
              };

              const originalPriceText = isSale && originalPrice > currentPrice ? formatPrice(originalPrice, currency) : "";
              if (originalPriceText) product.original_price = originalPriceText;
              products.set(key, product);
            }

            if (totalLines % 100000 === 0) {
              process.stdout.write(`  ${market.label}: ${totalLines} rows scanned, ${products.size} qualifying\r`);
            }
            cb();
          },
          flush(cb) {
            cb();
            resolve();
          },
        });

        stream.on("error", reject);
        gunzip.on("error", reject);
        stream.pipe(gunzip).pipe(liner);
      });
    });

    const rows = [...products.values()];
    const brands = new Map();
    for (const row of rows) {
      if (!brands.has(row.brand_slug)) brands.set(row.brand_slug, row.brand_name);
    }

    console.log(`  Rows scanned: ${totalLines}`);
    console.log(`  Women's clothing rows: ${womensLines}`);
    console.log(`  Missing brand: ${noBrand}`);
    console.log(`  No parseable composition: ${noComposition}`);
    console.log(`  Below ${MIN_NATURAL_PERCENT}% natural fiber: ${belowThreshold}`);
    console.log(`  Qualifying unique products: ${rows.length}`);
    console.log(`  Designer brands represented: ${brands.size}`);

    const byCategory = {};
    for (const row of rows) byCategory[row.category] = (byCategory[row.category] || 0) + 1;
    console.log(`  Categories: ${Object.entries(byCategory).map(([c, n]) => `${c}(${n})`).join(", ") || "none"}`);

    if (options.dryRun) {
      rows.slice(0, 10).forEach((p, i) => {
        console.log(`    ${i + 1}. [${market.label}] ${p.brand_name} — ${p.name} | ${p.price} | ${p.category} | ${p.natural_fiber_percent}%`);
      });
      return { products: rows.length, brands: brands.size, inserted: 0 };
    }

    let inserted = 0;
    const batchSize = 50;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const { data, error } = await supabase
        .from("products")
        .upsert(batch, { onConflict: "product_id" })
        .select("id");
      if (error) {
        console.error(`  Product upsert error at ${i}: ${error.message}`);
      } else {
        inserted += data.length;
      }
    }

    const brandStats = new Map();
    for (const row of rows) {
      const current = brandStats.get(row.brand_slug) || {
        name: row.brand_name,
        count: 0,
        fiberTotal: 0,
      };
      current.count += 1;
      current.fiberTotal += row.natural_fiber_percent || 0;
      brandStats.set(row.brand_slug, current);
    }

    const designerRows = [...brandStats.entries()].map(([slug, stats]) => ({
      name: stats.name,
      slug,
      status: "active",
      natural_fiber_percent: Math.round(stats.fiberTotal / stats.count),
      description: `${stats.name} pieces selected from Mytheresa's ${market.label} designer assortment for INTERTEXE natural-fiber standards.`,
      website: "https://www.mytheresa.com/",
    }));

    const { data: existingDesigners, error: existingDesignerError } = await supabase
      .from("designers")
      .select("slug, description, website")
      .in("slug", designerRows.map(d => d.slug));
    if (existingDesignerError) console.error(`  Designer lookup error: ${existingDesignerError.message}`);

    const existingBySlug = new Map((existingDesigners || []).map(d => [d.slug, d]));
    const existingSlugs = new Set(existingBySlug.keys());
    const newDesigners = designerRows.filter(d => !existingSlugs.has(d.slug));
    const existingDesignerUpdates = designerRows.filter(d => existingSlugs.has(d.slug));

    let insertedDesigners = 0;
    for (let i = 0; i < newDesigners.length; i += batchSize) {
      const { data, error } = await supabase
        .from("designers")
        .insert(newDesigners.slice(i, i + batchSize))
        .select("id");
      if (error) console.error(`  Designer insert error at ${i}: ${error.message}`);
      else insertedDesigners += data.length;
    }

    let updatedDesigners = 0;
    for (const designer of existingDesignerUpdates) {
      const existing = existingBySlug.get(designer.slug) || {};
      const update = {
        status: "active",
        natural_fiber_percent: designer.natural_fiber_percent,
      };
      if (!existing.description) update.description = designer.description;
      if (!existing.website) update.website = designer.website;

      const { error } = await supabase
        .from("designers")
        .update(update)
        .eq("slug", designer.slug);
      if (error) console.error(`  Designer update error for ${designer.slug}: ${error.message}`);
      else updatedDesigners++;
    }

    console.log(`  Upserted products: ${inserted}`);
    console.log(`  Inserted designers: ${insertedDesigners}; updated existing designers: ${updatedDesigners}`);
    return { products: rows.length, brands: brands.size, inserted };
  } finally {
    client.end();
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const limitArg = process.argv.find(arg => arg.startsWith("--limit="));
  const marketArg = process.argv.find(arg => arg.startsWith("--market="));
  const options = {
    dryRun,
    limit: limitArg ? parseInt(limitArg.split("=")[1], 10) : 0,
  };

  const selectedMarkets = marketArg
    ? marketArg.split("=")[1].split(",").map(m => m.trim()).filter(Boolean)
    : Object.keys(MARKETS);

  console.log("INTERTEXE — Mytheresa Rakuten Feed Ingestion");
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  console.log(`Minimum natural fiber: ${MIN_NATURAL_PERCENT}%`);
  console.log(`Markets: ${selectedMarkets.join(", ")}`);
  console.log(`Started: ${new Date().toISOString()}`);

  const summary = {};
  for (const key of selectedMarkets) {
    if (!MARKETS[key]) throw new Error(`Unknown market "${key}". Use one of: ${Object.keys(MARKETS).join(", ")}`);
    summary[key] = await streamMarketFeed(key, MARKETS[key], options);
  }

  console.log("\n========== SUMMARY ==========");
  for (const [key, result] of Object.entries(summary)) {
    console.log(`${key}: ${result.products} qualifying products, ${result.brands} designers, ${result.inserted} upserted`);
  }
  console.log(`Completed: ${new Date().toISOString()}`);
}

main().catch(err => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
