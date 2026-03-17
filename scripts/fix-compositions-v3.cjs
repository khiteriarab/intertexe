const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const FABRIC_MAP = {
  'coton': 'Cotton', 'coton biologique': 'Cotton', 'cotton': 'Cotton',
  'soie': 'Silk', 'silk': 'Silk',
  'laine': 'Wool', 'laine vierge': 'Wool', 'wool': 'Wool',
  'lin': 'Linen', 'linen': 'Linen',
  'cachemire': 'Cashmere', 'cashmere': 'Cashmere',
  'cuir': 'Leather', 'leather': 'Leather', "cuir d'agneau": 'Leather', 'peau': 'Leather',
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

function parseFromMetafield(html) {
  // Extract the metafield composition span
  const metaMatch = html.match(/metafield-multi_line_text_field[^>]*>([^<]+)</);
  if (!metaMatch) return null;
  
  const compText = metaMatch[1].trim();
  
  // Parse "100% Coton biologique" or "68% Soie 32% Coton" etc.
  const parts = compText.split(/[\n,]+/).map(s => s.trim()).filter(s => s);
  const results = [];
  
  for (const part of parts) {
    const m = part.match(/(\d+)\s*%\s*(.+)/i);
    if (m) {
      const pct = parseInt(m[1]);
      const fabricRaw = m[2].trim().toLowerCase();
      // Try full phrase first, then first word
      let fabricEn = FABRIC_MAP[fabricRaw];
      if (!fabricEn) {
        // Try removing trailing words
        const words = fabricRaw.split(/\s+/);
        for (let i = words.length; i >= 1; i--) {
          fabricEn = FABRIC_MAP[words.slice(0, i).join(' ')];
          if (fabricEn) break;
        }
      }
      if (!fabricEn) fabricEn = fabricRaw.charAt(0).toUpperCase() + fabricRaw.slice(1);
      if (pct > 0 && pct <= 100) {
        results.push({ pct, fabric: fabricEn });
      }
    }
  }
  
  if (results.length === 0) {
    // Try without percentage: "Cuir d'agneau" alone
    const fabricRaw = compText.toLowerCase().trim();
    let fabricEn = FABRIC_MAP[fabricRaw];
    if (!fabricEn) {
      const words = fabricRaw.split(/\s+/);
      for (let i = words.length; i >= 1; i--) {
        fabricEn = FABRIC_MAP[words.slice(0, i).join(' ')];
        if (fabricEn) break;
      }
    }
    if (fabricEn) {
      results.push({ pct: 100, fabric: fabricEn });
    }
  }
  
  if (results.length === 0) return null;
  
  const composition = results.map(r => r.pct + '% ' + r.fabric).join(', ');
  const naturalPct = results.reduce((s, r) => s + (NATURAL_FIBERS.has(r.fabric) ? r.pct : 0), 0);
  return { composition, naturalPct, raw: compText };
}

async function main() {
  const { data } = await sb.from('products').select('id, name, url, composition, natural_fiber_percent')
    .eq('brand_slug', 'isabel-marant');
  
  console.log('Total:', data.length);
  let checked = 0, updated = 0, failed = 0, noMeta = 0;
  const changes = [];
  
  for (let i = 0; i < data.length; i += 3) {
    const batch = data.slice(i, i + 3);
    
    await Promise.all(batch.map(async (p) => {
      try {
        const murlMatch = p.url.match(/murl=([^&]+)/);
        if (!murlMatch) { failed++; return; }
        const actualUrl = decodeURIComponent(murlMatch[1]).split('?variant')[0];
        
        const res = await fetch(actualUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
          signal: AbortSignal.timeout(15000)
        });
        
        if (res.status !== 200) { failed++; return; }
        const html = await res.text();
        
        const result = parseFromMetafield(html);
        checked++;
        
        if (result) {
          if (p.composition !== result.composition || p.natural_fiber_percent !== result.naturalPct) {
            await sb.from('products').update({
              composition: result.composition,
              natural_fiber_percent: result.naturalPct
            }).eq('id', p.id);
            changes.push({ name: p.name, old: p.composition, new: result.composition, raw: result.raw });
            updated++;
          }
        } else {
          noMeta++;
        }
      } catch(e) {
        failed++;
      }
    }));
    
    if ((i + 3) % 60 < 3) {
      console.log(Math.min(i + 3, data.length) + '/' + data.length, '| updated:', updated, '| no meta:', noMeta, '| failed:', failed);
    }
    
    await new Promise(r => setTimeout(r, 600));
  }
  
  console.log('\n=== RESULTS ===');
  console.log('Checked:', checked, '| Updated:', updated, '| No metafield:', noMeta, '| Failed:', failed);
  
  // Show important changes (fabric type actually changed)
  const important = changes.filter(c => {
    const oldType = c.old.replace(/\d+%\s*/g, '').split(',')[0].trim();
    const newType = c.new.replace(/\d+%\s*/g, '').split(',')[0].trim();
    return oldType !== newType;
  });
  
  console.log('\n=== FABRIC TYPE CORRECTIONS (' + important.length + ') ===');
  important.forEach(c => console.log('  ' + c.name + ': "' + c.old + '" -> "' + c.new + '" (raw: ' + c.raw + ')'));
  
  console.log('\n=== ALL CHANGES (' + changes.length + ') ===');
  changes.slice(0, 30).forEach(c => console.log('  ' + c.name + ': "' + c.old + '" -> "' + c.new + '"'));
  if (changes.length > 30) console.log('  ... and ' + (changes.length - 30) + ' more');
}

main().catch(console.error);
