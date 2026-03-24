const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const AFFILIATE_ID = '*8b0zWDyXo0';

const BRAND_CONFIGS = {
  '42623': { brandName: 'Splendid', slug: 'splendid', mid: '42623', file: '/tmp/feed-42623.txt', domain: 'splendid.com' },
  '36145': { brandName: '7 For All Mankind', slug: '7-for-all-mankind', mid: '36145', file: '/tmp/feed-36145.txt', domain: '7forallmankind.com' },
};

const NATURAL_FIBERS = ['cotton', 'silk', 'wool', 'linen', 'flax', 'cashmere', 'mohair', 'alpaca', 'hemp', 'ramie', 'jute', 'merino', 'angora', 'camel', 'yak', 'pima', 'supima', 'virgin wool', 'sea island cotton', 'organic cotton'];
const SYNTHETIC_FIBERS = ['polyester', 'nylon', 'acrylic', 'spandex', 'elastane', 'lycra', 'viscose', 'rayon', 'modal', 'lyocell', 'acetate', 'polyamide', 'polypropylene', 'rubber', 'polyurethane', 'tencel'];

function mapCategory(shopifyType, feedCat, name) {
  const t = (shopifyType || '').toLowerCase();
  const c = (feedCat || '').toLowerCase();
  const n = (name || '').toLowerCase();
  if (t === 'jeans' || t === 'denim') return 'denim';
  if (t.includes('dress') || c.includes('dress') || n.includes('dress')) return 'dresses';
  if (t.includes('pant') || t.includes('jean') || c.includes('pants') || c.includes('jeans') || n.includes('jeans') || n.includes('trouser') || n.includes('chino')) return 'denim';
  if (t.includes('short') || c.includes('shorts') || n.includes('short')) return 'bottoms';
  if (t.includes('skirt') || c.includes('skirt') || n.includes('skirt')) return 'bottoms';
  if (t.includes('jacket') || t.includes('coat') || t.includes('blazer') || t.includes('trench') || c.includes('outerwear') || n.includes('jacket') || n.includes('coat') || n.includes('blazer')) return 'outerwear';
  if (t.includes('jumpsuit') || t.includes('romper') || n.includes('jumpsuit') || n.includes('romper')) return 'dresses';
  if (t.includes('sweater') || t.includes('knit') || t.includes('cardigan') || n.includes('sweater') || n.includes('cardigan') || n.includes('pullover')) return 'knitwear';
  if (t.includes('shirt') || t.includes('top') || t.includes('blouse') || t.includes('tee') || t.includes('tank') || c.includes('shirts') || c.includes('tops')) return 'tops';
  if (n.includes('top') || n.includes('tee') || n.includes('shirt') || n.includes('blouse') || n.includes('cami') || n.includes('tank') || n.includes('camp shirt')) return 'tops';
  if (t.includes('swim') || c.includes('swim') || n.includes('swim') || n.includes('bikini')) return 'swimwear';
  if (t.includes('lounge') || t.includes('pajama') || t.includes('sleep') || c.includes('lounge') || c.includes('pajama')) return 'loungewear';
  if (n.includes('jogger') && !n.includes('jean')) return 'bottoms';
  return 'tops';
}

const KNOWN_FIBERS = [
  'cotton', 'silk', 'wool', 'linen', 'flax', 'cashmere', 'mohair', 'alpaca',
  'hemp', 'ramie', 'jute', 'merino', 'angora', 'camel', 'yak', 'pima',
  'supima', 'virgin wool', 'organic cotton', 'sea island cotton',
  'polyester', 'nylon', 'acrylic', 'spandex', 'elastane', 'lycra',
  'viscose', 'rayon', 'modal', 'lyocell', 'tencel', 'acetate', 'polyamide',
  'polypropylene', 'rubber', 'polyurethane', 'cupro', 'triacetate',
  'metallic', 'lurex', 'down', 'feather', 'leather', 'suede',
];

function isKnownFiber(name) {
  const lower = name.toLowerCase().trim();
  return KNOWN_FIBERS.some(f => lower === f || lower === f + 's');
}

function parseFiberGroup(str) {
  const cleaned = str
    .replace(/[,&]/g, ' ')
    .replace(/hand wash.*/i, '')
    .replace(/machine wash.*/i, '')
    .replace(/dry clean.*/i, '')
    .replace(/do not.*/i, '')
    .replace(/imported.*/i, '')
    .replace(/made in.*/i, '')
    .trim();

  const matches = [...cleaned.matchAll(/(\d+)\s*%\s*([A-Za-z][A-Za-z\s-]*?)(?=\s+\d+\s*%|$)/g)];
  const fibers = [];
  let runningTotal = 0;
  for (const m of matches) {
    const pct = parseInt(m[1]);
    let name = m[2].trim();
    if (pct <= 0 || name.length >= 30) continue;
    const firstWord = name.split(/\s+/)[0].toLowerCase();
    if (!isKnownFiber(firstWord) && !isKnownFiber(name)) continue;
    if (name.toLowerCase() === 'spandex') name = 'Elastane';
    if (name.toLowerCase() === 'rayon') name = 'Viscose';
    name = name.split(/\s+/).filter(w => isKnownFiber(w) || isKnownFiber(w.replace(/s$/, ''))).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    if (!name) continue;
    if (runningTotal >= 100) break;
    fibers.push({ pct, name });
    runningTotal += pct;
  }
  return fibers;
}

function parseComposition(text) {
  if (!text || text.trim().length < 3) return { composition: null, pct: null };

  text = text
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[""'']/g, '"')
    .trim();

  const LABELS = 'Body|Shell|Outer|Combo\\s*\\d*|Contrast|Trim|Panel|Lining|Gusset|Elastic|Rib|Filling|Pocket|Sleeves|Collar|Hood|Insert|Waistband|Lace|Cup|Strap|Band|Wire|Frame|Self|Fabric|Main';
  text = text.replace(new RegExp('(' + LABELS + ')\\s*:', 'gi'), '\n$1:');

  const sections = [];
  const sectionLines = text.split('\n').filter(l => l.trim());

  for (const line of sectionLines) {
    const labelMatch = line.match(new RegExp('^(' + LABELS + ')\\s*:\\s*', 'i'));
    if (labelMatch) {
      let label = labelMatch[1].toLowerCase().replace(/\s*\d+$/, '');
      if (['shell', 'outer', 'self', 'fabric', 'main'].includes(label)) label = 'body';
      const fiberStr = line.replace(labelMatch[0], '');
      const fibers = parseFiberGroup(fiberStr);
      if (fibers.length > 0) sections.push({ label, fibers });
    }
  }

  if (sections.length === 0) {
    const fibers = parseFiberGroup(text);
    if (fibers.length > 0) sections.push({ label: 'body', fibers });
  }

  if (sections.length === 0) return { composition: null, pct: null };

  const hasBody = sections.some(s => s.label === 'body');
  if (!hasBody) return { composition: null, pct: null };

  const PART_WEIGHTS = {
    'body': 0.70, 'combo': 0.15, 'contrast': 0.10, 'trim': 0.05,
    'panel': 0.10, 'lining': 0.15, 'gusset': 0.05,
    'elastic': 0.03, 'rib': 0.05, 'filling': 0.10,
    'pocket': 0.03, 'sleeves': 0.15, 'collar': 0.03,
    'hood': 0.05, 'insert': 0.05, 'waistband': 0.05,
    'lace': 0.20, 'cup': 0.15, 'strap': 0.05,
    'band': 0.05, 'wire': 0.02, 'frame': 0.05,
  };

  const compParts = sections.map(s => {
    const label = s.label === 'body' && sections.length === 1 ? '' : s.label.charAt(0).toUpperCase() + s.label.slice(1) + ': ';
    return label + s.fibers.map(f => f.pct + '% ' + f.name).join(', ');
  });
  const composition = compParts.join(' | ');

  let totalWeight = 0, naturalWeighted = 0;
  for (const s of sections) {
    const weight = s.label === 'body' && sections.length === 1 ? 1.0 : (PART_WEIGHTS[s.label] || 0.05);
    totalWeight += weight;
    const partNatural = s.fibers
      .filter(f => NATURAL_FIBERS.some(nf => f.name.toLowerCase().includes(nf)))
      .reduce((sum, f) => sum + f.pct, 0);
    naturalWeighted += (partNatural / 100) * weight;
  }
  let pct = totalWeight > 0 ? Math.round((naturalWeighted / totalWeight) * 100) : null;
  if (pct !== null && pct > 100) pct = 100;

  return { composition, pct };
}

function isWomensProduct(tags) {
  const tagStr = (typeof tags === 'string' ? tags : (Array.isArray(tags) ? tags.join(', ') : '')).toLowerCase();
  if (tagStr.includes('age_group::mens') || tagStr.includes('age_group::kids') || tagStr.includes('age_group::boys') || tagStr.includes('age_group::girls')) {
    if (!tagStr.includes('age_group::womens') && !tagStr.includes('age_group::unisex')) return false;
  }
  return true;
}

function isWomensClothingFromFeed(item) {
  const gender = (item.gender || '').toLowerCase();
  if (gender && gender !== 'female' && gender !== 'unisex' && gender !== 'women') return false;
  const cat = (item.category || '').toLowerCase();
  const name = (item.name || '').toLowerCase();
  const mensTerms = ["men's", "mens ", " men ", "for men", "man's", " male", "boy's", "boys "];
  for (const term of mensTerms) {
    if (cat.includes(term) || name.includes(term)) return false;
  }
  const nonClothing = ['shoes', 'bags', 'jewelry', 'fragrance', 'beauty', 'home', 'pet', 'kids', 'baby', 'gift card', 'sunglasses', 'watch', 'wallet', 'candle', 'bedding', 'pillow', 'decor', 'notebook', 'tote', 'cap', 'hat'];
  for (const term of nonClothing) {
    if (cat.toLowerCase().includes(term) || name.includes(term)) return false;
  }
  if (cat.includes('infant') || cat.includes('toddler') || cat.includes('baby')) return false;
  return true;
}

function getProductSlug(baseUrl, brandSlug) {
  try {
    const urlPath = new URL(baseUrl).pathname;
    const parts = urlPath.split('/').filter(Boolean);
    const last = parts[parts.length - 1];
    if (last) return brandSlug + '-' + last;
  } catch {}
  return brandSlug + '-' + Date.now();
}

function buildAffiliateUrl(feedUrl, mid) {
  const murlMatch = feedUrl.match(/murl=([^&]+)/);
  if (murlMatch) {
    return 'https://click.linksynergy.com/deeplink?id=' + AFFILIATE_ID + '&mid=' + mid + '&murl=' + murlMatch[1];
  }
  return feedUrl
    .replace('<LSN EID>', AFFILIATE_ID)
    .replace('<LSN OID>', mid);
}

async function scrapeShopifyProduct(url) {
  try {
    const r = await fetch(url + '.json', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
    });
    if (!r.ok) return null;
    const j = await r.json();
    const p = j.product;
    const body = (p.body_html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    return {
      title: p.title,
      body,
      product_type: p.product_type || '',
      tags: typeof p.tags === 'string' ? p.tags : (Array.isArray(p.tags) ? p.tags.join(', ') : ''),
      image: p.images?.[0]?.src || p.image?.src || null,
    };
  } catch {
    return null;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function ingestBrand(midKey) {
  const config = BRAND_CONFIGS[midKey];
  if (!config) {
    console.error('Unknown MID:', midKey);
    return;
  }

  console.log(`\n=== Ingesting ${config.brandName} (MID ${config.mid}) ===`);

  if (!fs.existsSync(config.file)) {
    console.error('Feed file not found:', config.file);
    return;
  }

  const lines = fs.readFileSync(config.file, 'utf8').split('\n');
  const dataLines = lines.slice(1).filter(l => l.trim());
  console.log(`Feed: ${dataLines.length} lines`);

  const uniqueProducts = new Map();
  for (const line of dataLines) {
    const cols = line.split('|');
    if (cols.length < 10) continue;

    const name = (cols[1] || '').trim();
    const affiliateUrl = (cols[5] || '').trim();
    const imageUrl = (cols[6] || '').trim();
    const salePrice = parseFloat(cols[12] || '0');
    const retailPrice = parseFloat(cols[13] || '0');
    const discountAmount = parseFloat(cols[10] || '0');
    const feedCategory = (cols[4] || '').trim();
    const gender = (cols[33] || '').trim();

    const murlMatch = affiliateUrl.match(/murl=([^&]+)/);
    if (!murlMatch) continue;
    let baseUrl;
    try { baseUrl = decodeURIComponent(murlMatch[1]).split('?')[0]; } catch { continue; }

    if (uniqueProducts.has(baseUrl)) continue;

    const item = { name, affiliateUrl, imageUrl, salePrice, retailPrice, discountAmount, feedCategory, gender, baseUrl };
    if (!isWomensClothingFromFeed(item)) continue;

    uniqueProducts.set(baseUrl, item);
  }

  console.log(`Unique women's products from feed: ${uniqueProducts.size}`);

  let scraped = 0, scrapeErrors = 0, noComp = 0, belowThreshold = 0, qualifying = 0;
  const products = [];
  const total = uniqueProducts.size;

  const entries = [...uniqueProducts.entries()];
  const CONCURRENCY = 5;
  const DELAY_BETWEEN_BATCHES = 500;

  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    const batch = entries.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async ([baseUrl, item]) => {
        const shopify = await scrapeShopifyProduct(baseUrl);
        if (!shopify) {
          scrapeErrors++;
          return;
        }
        scraped++;

        if (!isWomensProduct(shopify.tags)) return;

        const compText = shopify.body;
        const { composition, pct } = parseComposition(compText);

        if (!composition || pct === null) { noComp++; return; }
        if (pct < 95) { belowThreshold++; return; }

        const category = mapCategory(shopify.product_type, item.feedCategory, item.name);
        const affiliateUrl = buildAffiliateUrl(item.affiliateUrl, config.mid);

        const currentPrice = item.salePrice > 0 ? item.salePrice : item.retailPrice;
        const originalPrice = item.retailPrice > 0 ? item.retailPrice : currentPrice;
        const isSale = item.discountAmount > 0 || (originalPrice > currentPrice && currentPrice > 0);

        const priceStr = `$${currentPrice.toFixed(2)}`;
        const originalPriceStr = isSale && originalPrice > currentPrice ? `$${originalPrice.toFixed(2)}` : null;

        let cleanName = shopify.title || item.name;
        cleanName = cleanName.replace(new RegExp('^' + config.brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[-–—]?\\s*', 'i'), '');

        const prodSlug = getProductSlug(baseUrl, config.slug);
        const imgUrl = shopify.image || item.imageUrl || null;

        const product = {
          name: cleanName,
          brand_name: config.brandName,
          brand_slug: config.slug,
          product_id: prodSlug,
          price: priceStr,
          url: affiliateUrl,
          image_url: imgUrl,
          composition,
          natural_fiber_percent: pct,
          category,
          is_sale: isSale,
        };

        if (originalPriceStr) product.original_price = originalPriceStr;

        products.push(product);
        qualifying++;
      })
    );

    if ((i + CONCURRENCY) % 50 === 0 || i + CONCURRENCY >= entries.length) {
      const pctDone = Math.round(((i + CONCURRENCY) / total) * 100);
      process.stdout.write(`\rScraping: ${Math.min(i + CONCURRENCY, total)}/${total} (${pctDone}%) — ${qualifying} qualifying`);
    }

    if (i + CONCURRENCY < entries.length) {
      await sleep(DELAY_BETWEEN_BATCHES);
    }
  }

  console.log(`\n\nScraping results:`);
  console.log(`  Scraped: ${scraped}, Errors: ${scrapeErrors}`);
  console.log(`  No composition: ${noComp}`);
  console.log(`  Below 95%: ${belowThreshold}`);
  console.log(`  Qualifying: ${qualifying}`);

  if (products.length === 0) {
    console.log('No qualifying products to insert.');
    return;
  }

  const byCat = {};
  products.forEach(p => { byCat[p.category] = (byCat[p.category] || 0) + 1; });
  console.log(`  Categories: ${Object.entries(byCat).map(([c, n]) => `${c}(${n})`).join(', ')}`);

  const saleCount = products.filter(p => p.is_sale).length;
  console.log(`  On sale: ${saleCount}`);

  products.slice(0, 10).forEach((p, i) => {
    console.log(`    ${i + 1}. ${p.name} | ${p.category} | ${p.price}${p.original_price ? ' (was ' + p.original_price + ')' : ''} | ${p.natural_fiber_percent}% | ${p.composition.substring(0, 60)}`);
  });

  console.log(`\nDeleting existing ${config.brandName} products...`);
  const { count: deleted } = await supabase.from('products').delete({ count: 'exact' }).eq('brand_slug', config.slug);
  console.log(`  Deleted: ${deleted || 0}`);

  const BATCH = 200;
  let inserted = 0;
  for (let i = 0; i < products.length; i += BATCH) {
    const batch = products.slice(i, i + BATCH);
    const { error } = await supabase.from('products').insert(batch);
    if (error) {
      console.error(`  Batch ${Math.floor(i / BATCH) + 1} error:`, error.message);
    } else {
      inserted += batch.length;
    }
  }
  console.log(`  Inserted: ${inserted} products`);

  const { data: existing } = await supabase.from('designers').select('id').eq('slug', config.slug);
  if (!existing || existing.length === 0) {
    await supabase.from('designers').insert({
      name: config.brandName,
      slug: config.slug,
      status: 'active',
      natural_fiber_percent: 95,
    });
    console.log(`  Created designer: ${config.brandName}`);
  }

  console.log(`\nDone! ${config.brandName}: ${inserted} products ingested.`);
}

async function main() {
  const mids = process.argv.slice(2);
  if (mids.length === 0) {
    console.log('Usage: node scripts/ingest-single-brand.cjs <MID> [MID...]');
    console.log('Available MIDs:', Object.entries(BRAND_CONFIGS).map(([k, v]) => `${k} (${v.brandName})`).join(', '));
    return;
  }
  for (const mid of mids) {
    await ingestBrand(mid);
  }
}

main().catch(e => console.error('Fatal:', e.message));
