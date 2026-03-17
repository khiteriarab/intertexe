const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const FABRIC_MAP = {
  'coton': 'Cotton', 'cotton': 'Cotton',
  'coton biologique': 'Cotton', 'organic cotton': 'Cotton',
  'soie': 'Silk', 'silk': 'Silk',
  'laine': 'Wool', 'wool': 'Wool',
  'lin': 'Linen', 'linen': 'Linen',
  'cachemire': 'Cashmere', 'cashmere': 'Cashmere',
  'cuir': 'Leather', 'leather': 'Leather',
  'cuir d\'agneau': 'Leather',
  'polyester': 'Polyester',
  'polyamide': 'Polyamide', 'nylon': 'Nylon',
  'viscose': 'Viscose',
  'elasthanne': 'Elastane', 'élasthanne': 'Elastane', 'elastane': 'Elastane', 'spandex': 'Elastane',
  'modal': 'Modal',
  'lyocell': 'Lyocell', 'tencel': 'Lyocell',
  'cupro': 'Cupro',
  'acetate': 'Acetate', 'acétate': 'Acetate',
  'acrylique': 'Acrylic', 'acrylic': 'Acrylic',
  'mohair': 'Mohair',
  'alpaga': 'Alpaca', 'alpaca': 'Alpaca',
};

const NATURAL_FIBERS = new Set(['Cotton', 'Silk', 'Wool', 'Linen', 'Cashmere', 'Leather', 'Mohair', 'Alpaca']);

function parseComposition(bodyHtml) {
  const text = bodyHtml.replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
  
  // The composition on Isabel Marant pages is AFTER the "Référence :" line
  // Format: 
  //   Référence : XXXXXX PRODUCT_NAME
  //   
  //   100% Coton biologique
  //   or
  //   68% Soie, 32% Coton
  
  const refIndex = text.indexOf('rence');
  let compositionSection = '';
  
  if (refIndex !== -1) {
    // Get everything after the reference line
    compositionSection = text.substring(refIndex);
    // Skip past the reference number line
    const lines = compositionSection.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    // Skip the reference line itself, look at subsequent lines
    const afterRef = lines.slice(1);
    compositionSection = afterRef.join(' ');
  }
  
  // Parse percentage + fabric from the composition section (AFTER reference)
  if (compositionSection) {
    const pctPattern = /(\d+)\s*%\s*([a-zéèêëàâîïôùûüç' ]+?)(?=\s*(?:\d+\s*%|$|,|\.))/gi;
    const matches = [];
    let m;
    while ((m = pctPattern.exec(compositionSection)) !== null) {
      const pct = parseInt(m[1]);
      let fabricRaw = m[2].toLowerCase().trim();
      // Try multi-word first, then single word
      let fabricEn = FABRIC_MAP[fabricRaw];
      if (!fabricEn) {
        // Try first word only
        const firstWord = fabricRaw.split(/\s+/)[0];
        fabricEn = FABRIC_MAP[firstWord];
      }
      if (fabricEn && pct > 0 && pct <= 100) {
        matches.push({ pct, fabric: fabricEn });
      }
    }
    
    if (matches.length > 0) {
      const seen = new Set();
      const unique = matches.filter(m => {
        const key = m.fabric;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).sort((a, b) => b.pct - a.pct);
      
      const composition = unique.map(m => m.pct + '% ' + m.fabric).join(', ');
      const naturalPct = unique.reduce((s, m) => s + (NATURAL_FIBERS.has(m.fabric) ? m.pct : 0), 0);
      return { composition, naturalPct };
    }
  }
  
  // Fallback: check if "100% Cuir" or "Cuir" appears specifically as the material
  // But ONLY in the composition section (after Référence), NOT in descriptions like "étiquette en cuir"
  if (compositionSection) {
    for (const [fr, en] of Object.entries(FABRIC_MAP)) {
      if (fr.length < 3) continue;
      // Must be a standalone composition line, not part of a description
      const regex = new RegExp('(?:^|\\s)(?:100%\\s*)?' + fr.replace(/[éèêë]/g, '[éèêëe]').replace(/'/g, "'?") + '(?:\\s|$|,)', 'i');
      if (regex.test(compositionSection)) {
        const natural = NATURAL_FIBERS.has(en) ? 100 : 0;
        return { composition: '100% ' + en, naturalPct: natural };
      }
    }
  }
  
  return null;
}

async function main() {
  const { data, error } = await sb.from('products').select('id, name, url, composition, natural_fiber_percent')
    .eq('brand_slug', 'isabel-marant');
  
  if (error) { console.error(error); return; }
  console.log('Total products:', data.length);
  
  let checked = 0, updated = 0, failed = 0, noComp = 0;
  const changes = [];
  const failures = [];
  
  for (let i = 0; i < data.length; i += 5) {
    const batch = data.slice(i, i + 5);
    
    await Promise.all(batch.map(async (p) => {
      try {
        const murlMatch = p.url.match(/murl=([^&]+)/);
        if (!murlMatch) { failed++; failures.push(p.name + ' (no murl)'); return; }
        const actualUrl = decodeURIComponent(murlMatch[1]);
        const handle = actualUrl.split('/products/')[1]?.split('?')[0];
        if (!handle) { failed++; failures.push(p.name + ' (no handle)'); return; }
        
        const res = await fetch('https://isabelmarant.com/products/' + handle + '.json', {
          headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
          signal: AbortSignal.timeout(10000)
        });
        
        if (res.status !== 200) { failed++; failures.push(p.name + ' (HTTP ' + res.status + ')'); return; }
        
        const json = await res.json();
        const body = json.product?.body_html || '';
        
        const result = parseComposition(body);
        checked++;
        
        if (result && result.composition) {
          if (p.composition !== result.composition || p.natural_fiber_percent !== result.naturalPct) {
            await sb.from('products').update({ 
              composition: result.composition, 
              natural_fiber_percent: result.naturalPct 
            }).eq('id', p.id);
            changes.push({ name: p.name, old: p.composition, new: result.composition, oldPct: p.natural_fiber_percent, newPct: result.naturalPct });
            updated++;
          }
        } else {
          noComp++;
        }
      } catch(e) {
        failed++;
        failures.push(p.name + ' (' + e.message + ')');
      }
    }));
    
    if ((i + 5) % 50 < 5) {
      console.log('Progress:', Math.min(i + 5, data.length) + '/' + data.length, 
        '| updated:', updated, '| failed:', failed, '| no comp found:', noComp);
    }
    
    await new Promise(r => setTimeout(r, 400));
  }
  
  console.log('\n=== RESULTS ===');
  console.log('Checked:', checked, '| Updated:', updated, '| No comp found:', noComp, '| Failed:', failed);
  
  if (changes.length > 0) {
    console.log('\n=== KEY CHANGES ===');
    // Show the most important changes (wrong fabric type, not just adding %)
    const important = changes.filter(c => {
      const oldFabric = c.old.replace(/\d+%\s*/g, '').trim();
      const newFabric = c.new.replace(/\d+%\s*/g, '').trim();
      return oldFabric !== newFabric;
    });
    console.log('Fabric type changes:', important.length);
    important.forEach(c => {
      console.log('  ' + c.name + ': "' + c.old + '" -> "' + c.new + '"');
    });
    
    const minor = changes.filter(c => {
      const oldFabric = c.old.replace(/\d+%\s*/g, '').trim();
      const newFabric = c.new.replace(/\d+%\s*/g, '').trim();
      return oldFabric === newFabric;
    });
    console.log('\nMinor changes (same fabric, adjusted %):', minor.length);
  }
  
  if (failures.length > 0) {
    console.log('\n=== FAILURES ===');
    failures.forEach(f => console.log('  ' + f));
  }
}

main().catch(console.error);
