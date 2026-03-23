const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const AFFILIATE_ID = '*8b0zWDyXo0';
const MID = '50739';
const BRAND_NAME = 'Fleur du Mal';
const BRAND_SLUG = 'fleur-du-mal';

const NATURAL_FIBERS = ['cotton', 'silk', 'wool', 'linen', 'flax', 'cashmere', 'mohair', 'alpaca', 'hemp', 'ramie', 'jute', 'merino', 'angora', 'camel', 'yak'];
const SYNTHETIC_FIBERS = ['polyester', 'nylon', 'polyamide', 'acrylic', 'elastane', 'spandex', 'lycra', 'metallic', 'viscose', 'rayon', 'modal', 'lyocell', 'tencel', 'cupro', 'acetate', 'triacetate', 'rubber', 'polyurethane'];

const CLOTHING_TYPES = new Set([
  'Dresses', 'Tops', 'Skirts', 'pants', 'Shorts', 'Coat',
  'Jumpsuits', 'Bodysuits', 'Camis & Tanks', 'Robes', 'Slips', 'PJs'
]);

function fetchPage(page) {
  return new Promise((resolve, reject) => {
    https.get('https://www.fleurdumal.com/products.json?limit=250&page=' + page, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { resolve({ products: [] }); }
      });
    }).on('error', reject);
  });
}

function parseComposition(html) {
  if (!html) return { composition: null, pct: null };

  const detailsMatch = html.match(/<!-- details -->(.*?)<!-- end details -->/s);
  const raw = detailsMatch ? detailsMatch[1] : html;
  const text = raw.replace(/<[^>]+>/g, '\n').replace(/&amp;/g, '&').replace(/&#39;/g, "'");

  const sections = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const LABEL_RE = /^(body|shell|outer|combo|contrast|trim|panel|lining|gusset|elastic|rib|filling|pocket|sleeves|collar|hood|insert|waistband)\s*:\s*/i;

  for (const line of lines) {
    const labelMatch = line.match(LABEL_RE);
    if (labelMatch) {
      let label = labelMatch[1].toLowerCase();
      if (label === 'shell' || label === 'outer') label = 'body';
      const fiberStr = line.replace(LABEL_RE, '');
      const fibers = parseFiberGroup(fiberStr);
      if (fibers.length > 0) sections.push({ label, fibers });
    } else {
      const fibers = parseFiberGroup(line);
      if (fibers.length > 0 && sections.length === 0) {
        sections.push({ label: 'body', fibers });
      }
    }
  }

  if (sections.length === 0) return { composition: null, pct: null };

  const PART_WEIGHTS = {
    'body': 0.70, 'combo': 0.15, 'contrast': 0.10, 'trim': 0.05,
    'panel': 0.10, 'lining': 0.15, 'gusset': 0.05,
    'elastic': 0.03, 'rib': 0.05, 'filling': 0.10,
    'pocket': 0.03, 'sleeves': 0.15, 'collar': 0.03,
    'hood': 0.05, 'insert': 0.05, 'waistband': 0.05,
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

function categorize(type, title) {
  const t = (type || '').toLowerCase();
  const n = (title || '').toLowerCase();
  if (t.includes('dress') || n.includes('dress')) return 'dresses';
  if (t.includes('skirt') || n.includes('skirt')) return 'bottoms';
  if (t.includes('pant') || n.includes('pant') || n.includes('trouser')) return 'bottoms';
  if (t.includes('short') || n.includes('short')) return 'bottoms';
  if (t.includes('top') || t.includes('cami') || n.includes('cami') || n.includes('tank')) return 'tops';
  if (t.includes('bodysuit') || n.includes('bodysuit')) return 'tops';
  if (t.includes('coat') || t.includes('jacket') || n.includes('coat') || n.includes('jacket')) return 'outerwear';
  if (t.includes('jumpsuit') || n.includes('jumpsuit') || n.includes('catsuit')) return 'dresses';
  if (t.includes('robe') || n.includes('robe')) return 'dresses';
  if (t.includes('slip') || n.includes('slip dress')) return 'dresses';
  if (t.includes('pj') || n.includes('pajama')) return 'tops';
  return null;
}

function buildAffiliateUrl(productHandle) {
  const productUrl = encodeURIComponent('https://www.fleurdumal.com/products/' + productHandle);
  return `https://click.linksynergy.com/link?id=${AFFILIATE_ID}&offerid=${MID}.&type=15&murl=${productUrl}`;
}

async function run() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log('INTERTEXE — Fleur du Mal Rakuten Feed Ingestion');
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Started: ${new Date().toISOString()}\n`);

  let allProducts = [];
  let page = 1;
  while (true) {
    const data = await fetchPage(page);
    if (!data.products || data.products.length === 0) break;
    allProducts = allProducts.concat(data.products);
    console.log(`Fetched page ${page}: ${data.products.length} products`);
    page++;
    await new Promise(r => setTimeout(r, 500));
  }
  console.log(`Total Shopify products: ${allProducts.length}\n`);

  const { data: existing } = await supabase
    .from('products')
    .select('product_id')
    .eq('brand_slug', BRAND_SLUG);
  const existingIds = new Set((existing || []).map(p => p.product_id));
  console.log(`Already in DB: ${existingIds.size}`);

  const qualifying = [];
  const seenHandles = new Set();
  let skippedType = 0, skippedFiber = 0, noComp = 0, alreadyExists = 0, duplicates = 0;

  for (const p of allProducts) {
    if (!CLOTHING_TYPES.has(p.product_type)) { skippedType++; continue; }

    const cat = categorize(p.product_type, p.title);
    if (!cat) { skippedType++; continue; }

    const handle = p.handle;
    if (seenHandles.has(handle)) { duplicates++; continue; }
    seenHandles.add(handle);

    if (existingIds.has(handle)) { alreadyExists++; continue; }

    const { composition, pct } = parseComposition(p.body_html);
    if (!composition || pct === null) { noComp++; continue; }
    if (pct < 95) { skippedFiber++; continue; }

    const variant = p.variants?.[0];
    const price = variant ? '$' + parseFloat(variant.price).toFixed(2) : null;
    const image = p.images?.[0]?.src || null;

    qualifying.push({
      name: p.title,
      brand_name: BRAND_NAME,
      brand_slug: BRAND_SLUG,
      product_id: handle,
      price,
      url: buildAffiliateUrl(handle),
      image_url: image,
      composition,
      natural_fiber_percent: pct,
      category: cat,
    });
  }

  console.log(`\nResults:`);
  console.log(`  Skipped (wrong type): ${skippedType}`);
  console.log(`  Skipped (no composition): ${noComp}`);
  console.log(`  Skipped (<95% natural): ${skippedFiber}`);
  console.log(`  Duplicates: ${duplicates}`);
  console.log(`  Already in DB: ${alreadyExists}`);
  console.log(`  Qualifying products: ${qualifying.length}`);

  const byCat = {};
  qualifying.forEach(q => { byCat[q.category] = (byCat[q.category] || 0) + 1; });
  console.log(`\nBy category:`);
  Object.entries(byCat).forEach(([c, n]) => console.log(`  ${c}: ${n}`));

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
