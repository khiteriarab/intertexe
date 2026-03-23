const { createClient } = require('@supabase/supabase-js');
const Client = require('ftp');
const zlib = require('zlib');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const AFFILIATE_ID = '*8b0zWDyXo0';
const MID = '50739';
const BRAND_NAME = 'Fleur du Mal';
const BRAND_SLUG = 'fleur-du-mal';

const FTP_HOST = 'aftp.linksynergy.com';
const FTP_USER = 'rkp_4668007';
const FTP_FILE = '50739_4668007_mp_template.txt.gz';

const NATURAL_FIBERS = ['cotton', 'silk', 'wool', 'linen', 'flax', 'cashmere', 'mohair', 'alpaca', 'hemp', 'ramie', 'jute', 'merino', 'angora', 'camel', 'yak', 'pima', 'supima', 'virgin wool'];
const SYNTHETIC_FIBERS = ['polyester', 'nylon', 'polyamide', 'acrylic', 'elastane', 'spandex', 'lycra', 'metallic', 'viscose', 'rayon', 'modal', 'lyocell', 'tencel', 'cupro', 'acetate', 'triacetate', 'rubber', 'polyurethane'];

const ALLOWED_TOP_CATS = [
  'Clothing',
  'Camis & Tanks',
  'Lingerie',
  'Swim',
];

function downloadFeed() {
  return new Promise((resolve, reject) => {
    const c = new Client();
    c.on('ready', () => {
      console.log('Connected to Rakuten FTP');
      c.get(FTP_FILE, (err, stream) => {
        if (err) { c.end(); return reject(err); }
        const chunks = [];
        stream.on('data', chunk => chunks.push(chunk));
        stream.on('end', () => {
          const gz = Buffer.concat(chunks);
          console.log('Downloaded:', gz.length, 'bytes');
          const data = zlib.gunzipSync(gz).toString('utf8');
          console.log('Uncompressed:', data.length, 'chars');
          c.end();
          resolve(data);
        });
      });
    });
    c.on('error', reject);
    c.connect({
      host: FTP_HOST,
      user: FTP_USER,
      password: process.env.RAKUTEN_FTP_PASSWORD,
      connTimeout: 15000
    });
  });
}

function parseFeedLine(line) {
  const f = line.split('|');
  if (f.length < 34) return null;
  return {
    id: f[0],
    name: f[1],
    sku: f[2],
    category: f[3],
    affiliateUrl: f[5],
    imageUrl: f[6],
    shortDesc: f[8],
    longDesc: f[9],
    price: f[13],
    brand: f[16] || f[20],
    currency: f[25],
    merchantCategory: f[29],
    size: f[30],
    color: f[32],
    gender: f[33],
  };
}

function isWomensProduct(item) {
  const gender = (item.gender || '').toLowerCase();
  if (gender && gender !== 'female' && gender !== 'unisex') return false;
  const mc = item.merchantCategory || '';
  const topCat = mc.split(' > ')[0];
  return ALLOWED_TOP_CATS.some(c => topCat.startsWith(c));
}

function mapCategory(mc) {
  const cat = mc.toLowerCase();
  const topCat = cat.split(' > ')[0].trim();
  if (topCat === 'lingerie') return 'lingerie';
  if (topCat === 'swim') return 'swimwear';
  if (topCat === 'camis & tanks') return 'tops';
  if (cat.includes('dress')) return 'dresses';
  if (cat.includes('top') || cat.includes('cami') || cat.includes('tank')) return 'tops';
  if (cat.includes('skirt')) return 'bottoms';
  if (cat.includes('pant') || cat.includes('short')) return 'bottoms';
  if (cat.includes('coat') || cat.includes('kimono')) return 'outerwear';
  if (cat.includes('jumpsuit')) return 'dresses';
  if (cat.includes('robe') || cat.includes('pj')) return 'dresses';
  if (cat.includes('bustier')) return 'tops';
  return 'tops';
}

function extractComposition(desc) {
  if (!desc) return { composition: null, pct: null };

  let text = desc.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/\s+/g, ' ');

  const LABELS = 'Body|Shell|Outer|Combo\\s*\\d*|Contrast|Trim|Panel|Lining|Gusset|Elastic|Rib|Filling|Pocket|Sleeves|Collar|Hood|Insert|Waistband|Lace|Cup|Strap|Band|Wire|Frame';
  text = text.replace(new RegExp('(' + LABELS + ')\\s*:', 'gi'), '\n$1:');

  const sections = [];
  const sectionLines = text.split('\n').filter(l => l.trim());

  for (const line of sectionLines) {
    const labelMatch = line.match(new RegExp('^(' + LABELS + ')\\s*:\\s*', 'i'));
    if (labelMatch) {
      let label = labelMatch[1].toLowerCase().replace(/\s*\d+$/, '');
      if (label === 'shell' || label === 'outer') label = 'body';
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
  const pct = totalWeight > 0 ? Math.round((naturalWeighted / totalWeight) * 100) : null;

  return { composition, pct };
}

function parseFiberGroup(str) {
  const cleaned = str
    .replace(/[,&]/g, ' ')
    .replace(/hand wash.*/i, '')
    .replace(/machine wash.*/i, '')
    .replace(/dry clean.*/i, '')
    .replace(/do not.*/i, '')
    .replace(/turn garment.*/i, '')
    .replace(/this is a delicate.*/i, '')
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
    if (name.toLowerCase() === 'spandex') name = 'Elastane';
    if (name.toLowerCase() === 'rayon') name = 'Viscose';
    name = name.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    if (runningTotal >= 100) break;
    fibers.push({ pct, name });
    runningTotal += pct;
  }
  return fibers;
}

function buildAffiliateUrl(feedUrl) {
  return feedUrl
    .replace('<LSN EID>', AFFILIATE_ID)
    .replace('<LSN OID>', MID);
}

function getProductSlug(item) {
  const murlMatch = item.affiliateUrl.match(/murl=([^&]+)/);
  if (murlMatch) {
    const url = decodeURIComponent(murlMatch[1]);
    const handleMatch = url.match(/\/products\/([^?&#]+)/);
    if (handleMatch) return handleMatch[1];
  }
  return item.sku || item.id;
}

async function run() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log('INTERTEXE — Fleur du Mal Rakuten Feed Ingestion');
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Source: Rakuten FTP (MID ${MID})`);
  console.log(`Started: ${new Date().toISOString()}\n`);

  const feedData = await downloadFeed();
  const lines = feedData.split('\n').filter(l => l.trim() && !l.startsWith('HDR'));
  console.log(`Feed lines: ${lines.length}`);

  const items = lines.map(parseFeedLine).filter(Boolean);
  console.log(`Parsed items: ${items.length}`);

  const womensClothing = items.filter(isWomensProduct);
  console.log(`Women's products (with size variants): ${womensClothing.length}`);

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
    .select('product_id')
    .eq('brand_slug', BRAND_SLUG);
  const existingIds = new Set((existing || []).map(p => p.product_id));
  console.log(`Already in DB: ${existingIds.size}`);

  const qualifying = [];
  let skippedFiber = 0, noComp = 0, alreadyExists = 0;

  for (const [slug, item] of uniqueProducts) {
    if (existingIds.has(slug)) { alreadyExists++; continue; }

    const desc = item.longDesc || item.shortDesc;
    const { composition, pct } = extractComposition(desc);
    if (!composition || pct === null) { noComp++; continue; }
    if (pct < 95) { skippedFiber++; continue; }

    const category = mapCategory(item.merchantCategory);
    const price = item.currency === 'USD' ? `$${parseFloat(item.price).toFixed(2)}` : `${parseFloat(item.price).toFixed(2)}`;
    const affiliateUrl = buildAffiliateUrl(item.affiliateUrl);

    qualifying.push({
      name: item.name.replace(/^Fleur du Mal\s+/i, ''),
      brand_name: BRAND_NAME,
      brand_slug: BRAND_SLUG,
      product_id: slug,
      price,
      url: affiliateUrl,
      image_url: item.imageUrl,
      composition,
      natural_fiber_percent: pct,
      category,
    });
  }

  console.log(`\nResults:`);
  console.log(`  No composition: ${noComp}`);
  console.log(`  Below 95% natural: ${skippedFiber}`);
  console.log(`  Already in DB: ${alreadyExists}`);
  console.log(`  Qualifying new products: ${qualifying.length}`);

  const byCat = {};
  qualifying.forEach(q => { byCat[q.category] = (byCat[q.category] || 0) + 1; });
  console.log(`\nBy category:`);
  Object.entries(byCat).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log(`  ${c}: ${n}`));

  console.log(`\nQualifying products:`);
  qualifying.forEach((q, i) => console.log(`  ${i + 1}. ${q.name} | ${q.category} | ${q.price} | ${q.composition} | ${q.natural_fiber_percent}%`));

  if (isDryRun) {
    console.log('\n[DRY RUN] No database changes made.');
    return;
  }

  if (qualifying.length === 0) {
    console.log('\nNo new products to insert.');
    return;
  }

  const BATCH_SIZE = 50;
  let inserted = 0, errors = 0;
  for (let i = 0; i < qualifying.length; i += BATCH_SIZE) {
    const batch = qualifying.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from('products')
      .upsert(batch, { onConflict: 'product_id' })
      .select('id');
    if (error) {
      console.error(`Insert error at batch ${i}: ${error.message}`);
      errors++;
    } else {
      inserted += data.length;
    }
  }
  console.log(`\nInserted/updated: ${inserted} products`);
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
        description: 'New York-based luxury brand founded by Jennifer Zuccarini, known for elevated lingerie-inspired fashion. Specializes in silk, cotton, and lace pieces that blur the line between intimate wear and ready-to-wear.',
        website: 'https://www.fleurdumal.com',
      });
    if (dErr) console.error('Designer insert error:', dErr.message);
    else console.log('Designer entry created');
  } else {
    console.log('Designer already exists');
  }

  console.log(`\nCompleted: ${new Date().toISOString()}`);
}

run().catch(e => console.error('Fatal:', e.message));
