const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const NATURAL_FIBERS = ['cotton', 'wool', 'silk', 'linen', 'flax', 'cashmere', 'mohair', 'alpaca', 'hemp', 'ramie', 'jute', 'leather', 'tencel', 'lyocell', 'modal', 'virgin wool', 'cowhide'];

const PART_WEIGHTS = {
  'outer': 0.60, 'shell': 0.60,
  'inner': 0.25, 'lining': 0.25,
  'filling': 0.10, 'contrast': 0.10,
  'rib': 0.05, 'elastic': 0.03,
  'embroidery yarn': 0.02, 'embroidery': 0.02,
  'coating': 0.05, 'pocket': 0.03,
  'trim': 0.03, 'sleeves': 0.20,
  'collar': 0.03, 'hood': 0.05, 'panel': 0.10,
  'insert': 0.05,
};

function parseFibers(str) {
  const matches = [...str.matchAll(/(\d+)%\s*([A-Za-z\-\s]+?)(?=\s*\d+%|$)/g)];
  return matches.map(m => {
    let name = m[2].trim().replace(/-/g, ' ').replace(/\s+/g, ' ');
    if (name.toLowerCase().includes('spandex')) name = 'Elastane';
    if (name.toLowerCase() === 'rayon') name = 'Viscose';
    name = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    return { pct: parseInt(m[1]), name: name.trim() };
  });
}

function parseFullComposition(raw) {
  if (!raw) return { composition: null, pct: null };
  const parts = [];
  const sections = raw.split(/,\s*/);
  let currentLabel = 'main';
  let currentFibers = [];
  const LABEL_RE = /^(Outer|Inner|Shell|Lining|Filling|Contrast|Rib|Elastic|Embroidery\s*Yarn|Embroidery|Coating|Pocket|Trim|Sleeves|Collar|Hood|Panel|Insert)\s+(.+)/i;
  for (const section of sections) {
    const trimmed = section.trim();
    const labelMatch = trimmed.match(LABEL_RE);
    if (labelMatch) {
      if (currentFibers.length > 0) parts.push({ label: currentLabel, fibers: currentFibers });
      currentLabel = labelMatch[1].toLowerCase().trim();
      currentFibers = parseFibers(labelMatch[2]);
    } else {
      const fibers = parseFibers(trimmed);
      if (fibers.length > 0) currentFibers = currentFibers.concat(fibers);
    }
  }
  if (currentFibers.length > 0) parts.push({ label: currentLabel, fibers: currentFibers });
  if (parts.length === 0) return { composition: raw, pct: null };

  const compParts = parts.map(part => {
    const label = part.label === 'main' ? '' : part.label.charAt(0).toUpperCase() + part.label.slice(1) + ': ';
    return label + part.fibers.map(f => f.pct + '% ' + f.name).join(', ');
  });
  const composition = compParts.join(' | ');

  let totalWeight = 0, naturalWeighted = 0;
  for (const part of parts) {
    const weight = part.label === 'main' ? (parts.length === 1 ? 1.0 : 0.65) : (PART_WEIGHTS[part.label] || 0.05);
    totalWeight += weight;
    const partNatural = part.fibers.filter(f => NATURAL_FIBERS.some(nf => f.name.toLowerCase().includes(nf))).reduce((sum, f) => sum + f.pct, 0);
    naturalWeighted += (partNatural / 100) * weight;
  }
  const pct = totalWeight > 0 ? Math.round((naturalWeighted / totalWeight) * 100) : null;
  return { composition, pct };
}

async function scrapeProductPage(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10000)
    });
    if (res.status !== 200) return null;
    const html = await res.text();

    let price = null;
    const jsonLd = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
    if (jsonLd) {
      try {
        const data = JSON.parse(jsonLd[1]);
        if (data.offers?.price) price = '$' + parseFloat(data.offers.price).toFixed(2);
      } catch(e) {}
    }
    if (!price) {
      const priceMatch = html.match(/"price":\s*"?([\d.]+)/);
      if (priceMatch) price = '$' + parseFloat(priceMatch[1]).toFixed(2);
    }

    let rawComp = null;
    const compMatch = html.match(/Composition:\s*([^\n<]+)/i);
    if (compMatch) rawComp = compMatch[1].trim();

    let imageUrl = null;
    if (jsonLd) {
      try {
        const data = JSON.parse(jsonLd[1]);
        if (data.image) imageUrl = Array.isArray(data.image) ? data.image[0] : data.image;
      } catch(e) {}
    }

    return { price, rawComp, imageUrl };
  } catch (e) { return null; }
}

function getActualUrl(affiliateUrl) {
  const murlMatch = affiliateUrl.match(/murl=([^&]+)/);
  return murlMatch ? decodeURIComponent(murlMatch[1]) : null;
}

async function syncBrand(brandSlug, brandName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Syncing ${brandName} (${brandSlug})...`);
  console.log('='.repeat(60));

  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, price, url, composition, natural_fiber_percent, image_url')
    .eq('brand_slug', brandSlug);

  if (error) {
    console.error(`Error fetching ${brandSlug} products:`, error.message);
    return;
  }

  console.log(`Found ${products.length} products in database`);

  let priceUpdated = 0, compUpdated = 0, removed = 0, failed = 0, unchanged = 0;
  const BATCH = 10;

  for (let i = 0; i < products.length; i += BATCH) {
    const batch = products.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(async (p) => {
      const actualUrl = getActualUrl(p.url);
      if (!actualUrl) return { id: p.id, data: null, name: p.name };
      const data = await scrapeProductPage(actualUrl);
      return { id: p.id, data, name: p.name, oldPrice: p.price, oldComp: p.composition };
    }));

    for (const r of results) {
      if (!r.data) {
        failed++;
        continue;
      }

      const updates = {};
      let changed = false;

      if (r.data.price && r.data.price !== r.oldPrice) {
        updates.price = r.data.price;
        changed = true;
        priceUpdated++;
      }

      if (r.data.rawComp) {
        const { composition, pct } = parseFullComposition(r.data.rawComp);
        if (composition && composition !== r.oldComp) {
          updates.composition = composition;
          updates.natural_fiber_percent = pct;
          changed = true;
          compUpdated++;
        }
      }

      if (changed) {
        await supabase.from('products').update(updates).eq('id', r.id);
      } else {
        unchanged++;
      }
    }

    if ((i + BATCH) % 50 === 0 || i + BATCH >= products.length) {
      console.log(`  Progress: ${Math.min(i + BATCH, products.length)}/${products.length} | prices: ${priceUpdated} | compositions: ${compUpdated} | same: ${unchanged} | failed: ${failed}`);
    }
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n${brandName} sync complete:`);
  console.log(`  Prices updated: ${priceUpdated}`);
  console.log(`  Compositions updated: ${compUpdated}`);
  console.log(`  Unchanged: ${unchanged}`);
  console.log(`  Failed to scrape: ${failed}`);

  return { priceUpdated, compUpdated, unchanged, failed, total: products.length };
}

async function run() {
  console.log('INTERTEXE Rakuten Feed Sync');
  console.log(`Started: ${new Date().toISOString()}\n`);

  const brands = [
    { slug: 'diesel', name: 'Diesel' },
    { slug: 'a-l-c-', name: 'A.L.C.' },
  ];

  const results = {};

  for (const brand of brands) {
    try {
      results[brand.slug] = await syncBrand(brand.slug, brand.name);
    } catch (e) {
      console.error(`Error syncing ${brand.name}:`, e.message);
      results[brand.slug] = { error: e.message };
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('SYNC SUMMARY');
  console.log('='.repeat(60));
  for (const [slug, r] of Object.entries(results)) {
    if (r.error) {
      console.log(`  ${slug}: ERROR - ${r.error}`);
    } else {
      console.log(`  ${slug}: ${r.total} products | ${r.priceUpdated} price updates | ${r.compUpdated} comp updates | ${r.failed} failed`);
    }
  }
  console.log(`\nCompleted: ${new Date().toISOString()}`);
}

run().catch(e => console.error('Fatal:', e.message));
