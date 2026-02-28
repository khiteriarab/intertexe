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
    if (name.toLowerCase().includes('viscose') && name.toLowerCase().includes('rayon')) name = 'Viscose';
    if (name.toLowerCase().includes('polyamide') && name.toLowerCase().includes('nylon')) name = 'Polyamide';
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
      if (currentFibers.length > 0) {
        parts.push({ label: currentLabel, fibers: currentFibers });
      }
      currentLabel = labelMatch[1].toLowerCase().trim();
      currentFibers = parseFibers(labelMatch[2]);
    } else {
      const fibers = parseFibers(trimmed);
      if (fibers.length > 0) {
        currentFibers = currentFibers.concat(fibers);
      }
    }
  }
  if (currentFibers.length > 0) {
    parts.push({ label: currentLabel, fibers: currentFibers });
  }
  
  if (parts.length === 0) return { composition: raw, pct: null };
  
  // Build clean composition string with | separators for multi-part
  const compParts = [];
  for (const part of parts) {
    const label = part.label === 'main' ? '' : part.label.charAt(0).toUpperCase() + part.label.slice(1) + ': ';
    const fiberStr = part.fibers.map(f => f.pct + '% ' + f.name).join(', ');
    compParts.push(label + fiberStr);
  }
  const composition = compParts.join(' | ');
  
  // Calculate weighted natural fiber %
  let totalWeight = 0;
  let naturalWeighted = 0;
  
  for (const part of parts) {
    const weight = part.label === 'main' ? 
      (parts.length === 1 ? 1.0 : 0.65) : 
      (PART_WEIGHTS[part.label] || 0.05);
    totalWeight += weight;
    
    const partNatural = part.fibers
      .filter(f => NATURAL_FIBERS.some(nf => f.name.toLowerCase().includes(nf)))
      .reduce((sum, f) => sum + f.pct, 0);
    naturalWeighted += (partNatural / 100) * weight;
  }
  
  const pct = totalWeight > 0 ? Math.round((naturalWeighted / totalWeight) * 100) : null;
  return { composition, pct };
}

async function scrapeProduct(url) {
  try {
    const res = await fetch(url, { 
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
      signal: AbortSignal.timeout(8000)
    });
    if (res.status !== 200) return null;
    const html = await res.text();
    const matches = [...html.matchAll(/Composition:\s*([^\n<]+)/gi)];
    return matches.length > 0 ? matches[0][1].trim() : null;
  } catch (e) { return null; }
}

async function run() {
  const { data: products } = await supabase.from('products').select('id, name, url').eq('brand_slug', 'diesel');
  console.log('Total products:', products.length);
  
  let scraped = 0, failed = 0, updated = 0;
  const BATCH = 15;
  
  for (let i = 0; i < products.length; i += BATCH) {
    const batch = products.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(async (p) => {
      const murlMatch = p.url.match(/murl=([^&]+)/);
      const actualUrl = murlMatch ? decodeURIComponent(murlMatch[1]) : null;
      if (!actualUrl) return { id: p.id, rawComp: null };
      const rawComp = await scrapeProduct(actualUrl);
      return { id: p.id, rawComp, name: p.name };
    }));
    
    for (const r of results) {
      if (r.rawComp) {
        const { composition, pct } = parseFullComposition(r.rawComp);
        if (composition) {
          await supabase.from('products').update({ composition, natural_fiber_percent: pct }).eq('id', r.id);
          updated++;
        }
        scraped++;
      } else {
        failed++;
      }
    }
    
    if ((i + BATCH) % 60 === 0 || i + BATCH >= products.length) {
      console.log(`Progress: ${Math.min(i + BATCH, products.length)}/${products.length} | scraped: ${scraped} | failed: ${failed}`);
    }
    await new Promise(r => setTimeout(r, 400));
  }
  
  console.log('\nDone! Updated:', updated, 'Failed:', failed);
  
  // Verify
  const { data: verify } = await supabase.from('products').select('name, composition, natural_fiber_percent').eq('brand_slug', 'diesel');
  
  // Show multi-part examples
  const multiPart = verify.filter(p => p.composition && p.composition.includes('|'));
  console.log('\nMulti-part compositions:', multiPart.length);
  multiPart.slice(0, 5).forEach(p => console.log(' ', p.name, '|', p.composition, '| Weighted:', p.natural_fiber_percent + '%'));
  
  // Show single-part examples
  const single = verify.filter(p => p.composition && !p.composition.includes('|'));
  console.log('\nSingle-part sample:');
  single.slice(0, 3).forEach(p => console.log(' ', p.name, '|', p.composition, '|', p.natural_fiber_percent + '%'));
  
  // Stats
  const withPct = verify.filter(p => p.natural_fiber_percent !== null);
  const avg = withPct.reduce((s, p) => s + p.natural_fiber_percent, 0) / withPct.length;
  console.log('\nAvg natural fiber %:', avg.toFixed(1));
  console.log('With data:', withPct.length, '/ Null:', verify.length - withPct.length);
  
  // Verify no totals > 100% in any single section
  let badCount = 0;
  for (const p of verify) {
    if (!p.composition) continue;
    const sections = p.composition.split(' | ');
    for (const s of sections) {
      const pcts = [...s.matchAll(/(\d+)%/g)].map(m => parseInt(m[1]));
      const total = pcts.reduce((sum, x) => sum + x, 0);
      if (total > 105) { badCount++; console.log('BAD SECTION:', s, 'total:', total); break; }
    }
  }
  console.log('Sections exceeding 100%:', badCount);
}

run().catch(e => console.error('Fatal:', e.message));
