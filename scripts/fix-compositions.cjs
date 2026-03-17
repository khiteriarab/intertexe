const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// French to English fabric mapping
const FABRIC_MAP = {
  'coton': 'Cotton', 'cotton': 'Cotton',
  'soie': 'Silk', 'silk': 'Silk',
  'laine': 'Wool', 'wool': 'Wool',
  'lin': 'Linen', 'linen': 'Linen',
  'cachemire': 'Cashmere', 'cashmere': 'Cashmere',
  'cuir': 'Leather', 'leather': 'Leather',
  'polyester': 'Polyester',
  'polyamide': 'Polyamide', 'nylon': 'Nylon',
  'viscose': 'Viscose',
  'élasthanne': 'Elastane', 'elasthanne': 'Elastane', 'elastane': 'Elastane', 'spandex': 'Elastane',
  'modal': 'Modal',
  'lyocell': 'Lyocell', 'tencel': 'Lyocell',
  'cupro': 'Cupro',
  'acétate': 'Acetate', 'acetate': 'Acetate',
  'acrylique': 'Acrylic', 'acrylic': 'Acrylic',
  'mohair': 'Mohair',
  'alpaga': 'Alpaca', 'alpaca': 'Alpaca',
};

const NATURAL_FIBERS = new Set(['Cotton', 'Silk', 'Wool', 'Linen', 'Cashmere', 'Leather', 'Mohair', 'Alpaca']);

function parseComposition(bodyHtml, tags) {
  const text = bodyHtml.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').trim();
  
  // Look for percentage patterns like "100% Coton" or "68% Soie, 32% Coton"
  // French pattern: "XX% Fabric" or "XX % Fabric"  
  const pctPattern = /(\d+)\s*%\s*([a-zéèêëàâîïôùûüç]+)/gi;
  const matches = [];
  let m;
  while ((m = pctPattern.exec(text)) !== null) {
    const pct = parseInt(m[1]);
    const fabricRaw = m[2].toLowerCase().trim();
    const fabricEn = FABRIC_MAP[fabricRaw];
    if (fabricEn && pct > 0 && pct <= 100) {
      matches.push({ pct, fabric: fabricEn });
    }
  }
  
  if (matches.length > 0) {
    // Deduplicate and sort by percentage
    const seen = new Set();
    const unique = matches.filter(m => {
      const key = m.fabric + m.pct;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a, b) => b.pct - a.pct);
    
    const composition = unique.map(m => m.pct + '% ' + m.fabric).join(', ');
    const naturalPct = unique.reduce((s, m) => s + (NATURAL_FIBERS.has(m.fabric) ? m.pct : 0), 0);
    return { composition, naturalPct };
  }
  
  // Look for tags with material info
  const tagStr = typeof tags === 'string' ? tags : '';
  const materialTags = tagStr.split(',').filter(t => t.trim().startsWith('mat_'));
  if (materialTags.length > 0) {
    // Tags like mat_cotton:Cotton, mat_silk:Silk
    const fabrics = materialTags.map(t => {
      const parts = t.trim().split(':');
      const fabricRaw = (parts[1] || parts[0].replace('mat_', '')).toLowerCase().trim();
      return FABRIC_MAP[fabricRaw] || fabricRaw;
    });
    if (fabrics.length > 0) {
      return { composition: fabrics.join(', '), naturalPct: null }; // Can't determine % from tags
    }
  }
  
  // Look for phrases like "en jersey de coton" or "en soie"
  for (const [fr, en] of Object.entries(FABRIC_MAP)) {
    if (fr.length < 3) continue; // skip short matches
    const regex = new RegExp('\\b(en|de|100%)\\s+' + fr.replace(/[éèêë]/g, '[éèêëe]') + '\\b', 'i');
    if (regex.test(text)) {
      return { composition: '100% ' + en, naturalPct: NATURAL_FIBERS.has(en) ? 100 : 0 };
    }
  }
  
  return null;
}

async function main() {
  const { data, error } = await sb.from('products').select('id, name, url, composition, natural_fiber_percent')
    .eq('brand_slug', 'isabel-marant');
  
  if (error) { console.error(error); return; }
  console.log('Total products:', data.length);
  
  let checked = 0, updated = 0, failed = 0, unchanged = 0;
  const errors = [];
  const changes = [];
  
  const BATCH_SIZE = 5;
  const DELAY = 400;
  
  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE);
    
    await Promise.all(batch.map(async (p) => {
      try {
        const murlMatch = p.url.match(/murl=([^&]+)/);
        if (!murlMatch) { failed++; return; }
        const actualUrl = decodeURIComponent(murlMatch[1]);
        const handle = actualUrl.split('/products/')[1]?.split('?')[0];
        if (!handle) { failed++; return; }
        
        const res = await fetch('https://isabelmarant.com/products/' + handle + '.json', {
          headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
          signal: AbortSignal.timeout(10000)
        });
        
        if (res.status !== 200) { failed++; return; }
        
        const json = await res.json();
        const body = json.product?.body_html || '';
        const tags = json.product?.tags || '';
        
        const result = parseComposition(body, tags);
        checked++;
        
        if (result && result.composition) {
          const oldComp = p.composition;
          const newComp = result.composition;
          
          if (oldComp !== newComp) {
            const updateData = { composition: newComp };
            if (result.naturalPct !== null) {
              updateData.natural_fiber_percent = result.naturalPct;
            }
            await sb.from('products').update(updateData).eq('id', p.id);
            changes.push({ name: p.name, old: oldComp, new: newComp, pct: result.naturalPct });
            updated++;
          } else {
            unchanged++;
          }
        } else {
          unchanged++;
        }
      } catch(e) {
        failed++;
      }
    }));
    
    if ((i + BATCH_SIZE) % 50 < BATCH_SIZE) {
      console.log('Progress:', Math.min(i + BATCH_SIZE, data.length) + '/' + data.length, 
        '| checked:', checked, '| updated:', updated, '| failed:', failed);
    }
    
    await new Promise(r => setTimeout(r, DELAY));
  }
  
  console.log('\n=== RESULTS ===');
  console.log('Checked:', checked);
  console.log('Updated:', updated);
  console.log('Unchanged:', unchanged);
  console.log('Failed to fetch:', failed);
  
  if (changes.length > 0) {
    console.log('\n=== CHANGES (first 50) ===');
    changes.slice(0, 50).forEach(c => {
      console.log('  ' + c.name + ': "' + c.old + '" -> "' + c.new + '" (' + c.pct + '%)');
    });
    if (changes.length > 50) console.log('  ... and ' + (changes.length - 50) + ' more');
  }
}

main().catch(console.error);
