const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const AFFILIATE_ID = '*8b0zWDyXo0';
const MID = '49987';
const BRAND_NAME = 'Isabel Marant';
const BRAND_SLUG = 'isabel-marant';

const NATURAL_FIBERS = ['cotton', 'wool', 'silk', 'linen', 'flax', 'cashmere', 'mohair', 'alpaca', 'hemp', 'ramie', 'jute', 'merino', 'angora', 'camel', 'yak', 'pima', 'supima', 'virgin wool'];

const FR_TO_EN = {
  'coton': 'cotton', 'laine': 'wool', 'soie': 'silk', 'lin': 'linen',
  'cachemire': 'cashmere', 'cuir': 'leather', 'polyester': 'polyester',
  'viscose': 'viscose', 'elasthanne': 'elastane', 'polyamide': 'polyamide',
  'nylon': 'nylon', 'acrylique': 'acrylic', 'mohair': 'mohair',
  'alpaga': 'alpaca', 'chanvre': 'hemp', 'ramie': 'ramie',
  'lyocell': 'lyocell', 'modal': 'modal', 'tencel': 'tencel',
  'acetate': 'acetate', 'cupro': 'cupro', 'laine vierge': 'virgin wool',
  'laine mérinos': 'merino wool', 'denim': 'cotton',
};

const CLOTHING_CATS = [
  'Clothing~~Shirts & Tops',
  'Clothing~~Pants',
  'Clothing~~Dresses',
  'Clothing~~Outerwear~~Coats & Jackets',
  'Clothing~~Outerwear',
  'Clothing~~Outerwear~~Vests',
  'Clothing~~Skirts',
  'Clothing~~Shorts',
  'Clothing~~Skorts',
  'Clothing~~One-Pieces~~Jumpsuits & Rompers',
  'Clothing~~Swimwear',
  'Clothing~~Activewear',
  'Clothing',
];

function parseFeedLine(line) {
  const f = line.split('|');
  if (f.length < 30) return null;
  return {
    id: f[0],
    name: f[1],
    category: f[4],
    affiliateUrl: f[5],
    imageUrl: f[6],
    description: f[9],
    price: f[13],
    brand: f[16],
    currency: f[25],
    additionalImages: f[26],
    sku: f[28],
    color: f[32],
    gender: f[33],
  };
}

function isWomensClothing(item) {
  if (item.gender !== 'female') return false;
  if (item.category.includes('Accessories')) return false;
  if (item.category.includes('Underwear & Socks~~Socks')) return false;
  return CLOTHING_CATS.some(c => item.category.startsWith(c) || item.category === c);
}

function cleanName(name) {
  return name
    .replace(/ - Femme /i, ' ')
    .replace(/ - Taille \d+/i, '')
    .replace(/ - Isabel Marant$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getProductSlug(item) {
  const url = getActualUrl(item.affiliateUrl);
  if (url) {
    const match = url.match(/\/products\/([^?]+)/);
    if (match) return match[1].split('?')[0];
  }
  return item.sku || item.id;
}

function getActualUrl(affiliateUrl) {
  const murlMatch = affiliateUrl.match(/murl=([^&]+)/);
  return murlMatch ? decodeURIComponent(murlMatch[1]) : null;
}

function buildAffiliateUrl(feedUrl) {
  return feedUrl
    .replace('<LSN EID>', AFFILIATE_ID)
    .replace('<LSN OID>', `${MID}`);
}

function mapCategory(cat) {
  if (cat.includes('Dresses')) return 'dresses';
  if (cat.includes('Shirts & Tops')) return 'tops';
  if (cat.includes('Pants')) return 'pants';
  if (cat.includes('Outerwear') || cat.includes('Coats & Jackets') || cat.includes('Vests')) return 'outerwear';
  if (cat.includes('Skirts') || cat.includes('Skorts')) return 'skirts';
  if (cat.includes('Shorts')) return 'shorts';
  if (cat.includes('Jumpsuits') || cat.includes('One-Pieces')) return 'jumpsuits';
  if (cat.includes('Swimwear')) return 'swimwear';
  return 'clothing';
}

function extractCompositionFromDesc(desc) {
  if (!desc) return null;
  const compPatterns = [
    /(?:Composition|Matière)\s*:\s*([^\n]+)/i,
    /(\d+%\s*[A-Za-zÀ-ÿ\s]+(?:,\s*\d+%\s*[A-Za-zÀ-ÿ\s]+)*)/,
  ];
  for (const pat of compPatterns) {
    const match = desc.match(pat);
    if (match) return match[1].trim();
  }
  const frMaterials = ['coton', 'laine', 'soie', 'lin', 'cachemire', 'polyester', 'viscose', 'cuir', 'denim', 'jersey'];
  for (const mat of frMaterials) {
    const re = new RegExp(`en\\s+(${mat}[^.\\n]*)`, 'i');
    const m = desc.match(re);
    if (m) return m[1].trim();
  }
  return null;
}

async function scrapeComposition(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10000),
    });
    if (res.status !== 200) return null;
    const html = await res.text();

    let comp = null;
    const compMatch = html.match(/(?:Composition|Material)\s*:?\s*([^\n<]+)/i);
    if (compMatch) comp = compMatch[1].trim();

    if (!comp) {
      const pctMatch = html.match(/(\d+%\s*[A-Za-zÀ-ÿ\s]+(?:,\s*\d+%\s*[A-Za-zÀ-ÿ\s]+)*)/);
      if (pctMatch) comp = pctMatch[1].trim();
    }

    let price = null;
    const jsonLd = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
    if (jsonLd) {
      try {
        const data = JSON.parse(jsonLd[1]);
        const offers = data.offers || (Array.isArray(data) ? data[0]?.offers : null);
        if (offers) {
          const p = offers.price || (Array.isArray(offers) ? offers[0]?.price : null);
          const curr = offers.priceCurrency || (Array.isArray(offers) ? offers[0]?.priceCurrency : null);
          if (p) price = (curr === 'EUR' ? '€' : '$') + parseFloat(p).toFixed(2);
        }
      } catch(e) {}
    }

    return { composition: comp, price };
  } catch(e) { return null; }
}

function translateComposition(raw) {
  if (!raw) return { composition: null, pct: null };
  let translated = raw;
  for (const [fr, en] of Object.entries(FR_TO_EN)) {
    translated = translated.replace(new RegExp(fr, 'gi'), en);
  }

  const matches = [...translated.matchAll(/(\d+)%\s*([A-Za-z\s\-]+?)(?=\s*\d+%|,|$)/g)];
  if (matches.length > 0) {
    const fibers = matches.map(m => ({
      pct: parseInt(m[1]),
      name: m[2].trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
    }));
    const composition = fibers.map(f => `${f.pct}% ${f.name}`).join(', ');
    const naturalPct = fibers
      .filter(f => NATURAL_FIBERS.some(nf => f.name.toLowerCase().includes(nf)))
      .reduce((sum, f) => sum + f.pct, 0);
    return { composition, pct: naturalPct > 0 ? naturalPct : null };
  }

  const frMats = Object.keys(FR_TO_EN);
  for (const mat of frMats) {
    if (raw.toLowerCase().includes(mat)) {
      const enName = FR_TO_EN[mat];
      const isNatural = NATURAL_FIBERS.includes(enName);
      return {
        composition: enName.charAt(0).toUpperCase() + enName.slice(1),
        pct: isNatural ? 100 : 0
      };
    }
  }

  return { composition: translated, pct: null };
}

async function run() {
  console.log('INTERTEXE — Isabel Marant Rakuten Feed Ingestion');
  console.log(`Started: ${new Date().toISOString()}\n`);

  const feedData = fs.readFileSync('/tmp/isabel_marant_feed.txt', 'utf8');
  const lines = feedData.split('\n').filter(l => l && !l.startsWith('HDR'));
  console.log(`Feed lines: ${lines.length}`);

  const items = lines.map(parseFeedLine).filter(Boolean);
  const womensClothing = items.filter(isWomensClothing);
  console.log(`Women's clothing items (with size variants): ${womensClothing.length}`);

  const uniqueProducts = new Map();
  for (const item of womensClothing) {
    const slug = getProductSlug(item);
    if (!uniqueProducts.has(slug)) {
      uniqueProducts.set(slug, item);
    }
  }
  console.log(`Unique products (deduplicated): ${uniqueProducts.size}`);

  const { data: existing } = await supabase
    .from('products')
    .select('url')
    .eq('brand_slug', BRAND_SLUG);
  const existingUrls = new Set((existing || []).map(p => p.url));
  console.log(`Already in DB: ${existingUrls.size}`);

  const products = [];
  let scraped = 0, skipped = 0, noComp = 0;
  const entries = [...uniqueProducts.entries()];

  for (let i = 0; i < entries.length; i += 5) {
    const batch = entries.slice(i, i + 5);
    const results = await Promise.all(batch.map(async ([slug, item]) => {
      const affiliateUrl = buildAffiliateUrl(item.affiliateUrl);

      if (existingUrls.has(affiliateUrl)) {
        skipped++;
        return null;
      }

      const actualUrl = getActualUrl(item.affiliateUrl);
      let rawComp = extractCompositionFromDesc(item.description);
      let price = item.currency === 'EUR' ? `€${parseFloat(item.price).toFixed(2)}` : `$${parseFloat(item.price).toFixed(2)}`;

      if (!rawComp && actualUrl) {
        const scraped = await scrapeComposition(actualUrl.split('?variant')[0]);
        if (scraped) {
          if (scraped.composition) rawComp = scraped.composition;
          if (scraped.price) price = scraped.price;
        }
      }

      const { composition, pct } = translateComposition(rawComp);
      const name = cleanName(item.name);
      const category = mapCategory(item.category);

      return {
        name,
        brand_name: BRAND_NAME,
        brand_slug: BRAND_SLUG,
        product_id: slug,
        price,
        url: affiliateUrl,
        image_url: item.imageUrl,
        composition: composition || 'Composition not available',
        natural_fiber_percent: pct,
        category,
      };
    }));

    for (const p of results) {
      if (p) {
        products.push(p);
        if (p.composition === 'Composition not available') noComp++;
      }
    }

    if ((i + 5) % 50 === 0 || i + 5 >= entries.length) {
      console.log(`  Processed: ${Math.min(i + 5, entries.length)}/${entries.length} | products: ${products.length} | skipped: ${skipped} | no composition: ${noComp}`);
    }

    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\nReady to insert: ${products.length} products`);
  console.log(`  Skipped (already in DB): ${skipped}`);
  console.log(`  No composition: ${noComp}`);

  const BATCH_SIZE = 50;
  let inserted = 0, errors = 0;

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from('products')
      .insert(batch)
      .select('id');
    if (error) {
      console.error(`Insert error at batch ${i}: ${error.message}`);
      errors++;
    } else {
      inserted += data.length;
    }
  }

  console.log(`\nInserted: ${inserted} products`);
  if (errors > 0) console.log(`Insert errors: ${errors}`);

  const { data: designerExists } = await supabase
    .from('designers')
    .select('id')
    .eq('slug', BRAND_SLUG)
    .limit(1);

  if (!designerExists || designerExists.length === 0) {
    const { error: dErr } = await supabase
      .from('designers')
      .insert({
        name: BRAND_NAME,
        slug: BRAND_SLUG,
        description: 'French luxury fashion house founded by Isabel Marant in 1994, known for effortless Parisian chic with a bohemian edge. Renowned for premium natural materials including wool, cotton, silk, and leather.',
        quality_tier: 'excellent',
        website: 'https://isabelmarant.com',
        material_focus: ['Wool', 'Cotton', 'Silk', 'Leather', 'Linen'],
      });
    if (dErr) console.error('Designer insert error:', dErr.message);
    else console.log('Designer entry created');
  } else {
    console.log('Designer already exists');
  }

  console.log(`\nCompleted: ${new Date().toISOString()}`);
}

run().catch(e => console.error('Fatal:', e.message));
