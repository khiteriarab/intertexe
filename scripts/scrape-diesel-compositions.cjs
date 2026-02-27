const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const NATURAL_FIBERS = ['cotton', 'wool', 'silk', 'linen', 'flax', 'cashmere', 'mohair', 'alpaca', 'hemp', 'ramie', 'jute', 'leather', 'tencel', 'lyocell', 'modal'];

function parseComposition(raw) {
  if (!raw) return { composition: null, pct: null };
  // e.g. "99%Cotton 1%Elastane-Spandex" or "100%Cotton" or "54%Viscose-Rayon 46%Acetate"
  const parts = raw.match(/(\d+)%\s*([A-Za-z\-\s]+)/g);
  if (!parts || parts.length === 0) return { composition: raw, pct: null };
  
  let naturalPct = 0;
  const cleanParts = [];
  for (const part of parts) {
    const m = part.match(/(\d+)%\s*(.+)/);
    if (!m) continue;
    const pct = parseInt(m[1]);
    let fiber = m[2].trim().replace(/-/g, ' ').replace(/\s+/g, ' ');
    // Normalize
    if (fiber.toLowerCase().includes('spandex')) fiber = 'Elastane';
    if (fiber.toLowerCase().includes('rayon')) fiber = 'Viscose';
    
    cleanParts.push(pct + '% ' + fiber);
    if (NATURAL_FIBERS.some(nf => fiber.toLowerCase().includes(nf))) {
      naturalPct += pct;
    }
  }
  
  return { composition: cleanParts.join(', '), pct: naturalPct };
}

async function scrapeProduct(url) {
  try {
    const res = await fetch(url, { 
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10000)
    });
    if (res.status !== 200) return null;
    const html = await res.text();
    
    // Extract composition from the page
    const compMatch = html.match(/Composition:\s*([^<\n]+)/i);
    if (compMatch) {
      return compMatch[1].trim();
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function run() {
  const { data: products } = await supabase.from('products').select('id, name, url').eq('brand_slug', 'diesel');
  console.log('Total products:', products.length);
  
  let scraped = 0, failed = 0, updated = 0;
  const BATCH = 10; // concurrent requests
  
  for (let i = 0; i < products.length; i += BATCH) {
    const batch = products.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(async (p) => {
      const murlMatch = p.url.match(/murl=([^&]+)/);
      const actualUrl = murlMatch ? decodeURIComponent(murlMatch[1]) : null;
      if (!actualUrl) return { id: p.id, comp: null };
      
      const rawComp = await scrapeProduct(actualUrl);
      return { id: p.id, rawComp, name: p.name };
    }));
    
    for (const r of results) {
      if (r.rawComp) {
        const { composition, pct } = parseComposition(r.rawComp);
        if (composition) {
          const { error } = await supabase.from('products').update({ 
            composition, 
            natural_fiber_percent: pct 
          }).eq('id', r.id);
          if (!error) updated++;
          scraped++;
        }
      } else {
        failed++;
      }
    }
    
    if ((i + BATCH) % 50 === 0 || i + BATCH >= products.length) {
      console.log(`Progress: ${Math.min(i + BATCH, products.length)}/${products.length} | scraped: ${scraped} | failed: ${failed} | updated: ${updated}`);
    }
    
    // Small delay to be polite
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('\nDone! Scraped:', scraped, 'Failed:', failed, 'Updated:', updated);
  
  // Show stats
  const { data: stats } = await supabase.from('products').select('natural_fiber_percent').eq('brand_slug', 'diesel').not('natural_fiber_percent', 'is', null);
  if (stats && stats.length > 0) {
    const avg = stats.reduce((sum, p) => sum + (p.natural_fiber_percent || 0), 0) / stats.length;
    console.log('Average natural fiber %:', avg.toFixed(1));
    const below50 = stats.filter(p => p.natural_fiber_percent < 50).length;
    console.log('Products below 50%:', below50);
    const above80 = stats.filter(p => p.natural_fiber_percent >= 80).length;
    console.log('Products above 80%:', above80);
  }
}

run().catch(e => console.error('Fatal:', e.message));
