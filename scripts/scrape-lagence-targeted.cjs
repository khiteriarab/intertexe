const fs = require('fs');
const https = require('https');
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const AFFILIATE_ID = '*8b0zWDyXo0';
const MID = '42841';
const BRAND_NAME = "L'AGENCE";
const BRAND_SLUG = 'l-agence';
const MIN_NATURAL_PCT = 85;
const DELAY_MS = 8000;
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '12');
const PROG_FILE = '/tmp/lagence-comp-progress.json';
const FEED_FILE = '/tmp/feed-42841.txt';

const NATURAL = ['cotton','silk','wool','linen','flax','cashmere','mohair','alpaca','hemp','ramie','merino','angora'];
const SYNTHETIC = ['polyester','nylon','acrylic','spandex','elastane','lycra','viscose','rayon','modal','lyocell','tencel','acetate','polyamide','cupro','polyurethane','rubber'];
const KNOWN = [...NATURAL, ...SYNTHETIC];

const TARGET_MATERIALS = ['silk','cotton','linen','cashmere','wool','merino','denim','tweed','poplin','corduroy','twill'];

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchPage(res.headers.location).then(resolve).catch(reject);
      }
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function parseComp(text) {
  if (!text) return null;
  const matches = [...text.matchAll(/(\d+)%\s*([A-Za-z\s]+?)(?=\s*\d+%|\s*$|[\.\,\;\n]|Made|Care|Dry|Machine|Hand|Do not|Import|in Los|in the|in Italy|in China|Lining)/gi)];
  if (!matches.length) return null;
  const fibers = [];
  let total = 0;
  for (const m of matches) {
    const pct = parseInt(m[1]);
    if (pct > 100 || pct < 1) continue;
    let name = m[2].trim().toLowerCase();
    if (name === 'organic cotton') name = 'cotton';
    if (!name || !KNOWN.includes(name)) continue;
    fibers.push({ name, pct }); total += pct;
  }
  if (!fibers.length || total < 80) return null;
  const natPct = fibers.filter(f => NATURAL.includes(f.name)).reduce((s,f) => s+f.pct, 0);
  return { composition: fibers.map(f => f.pct+'% '+f.name).join(', '), naturalPct: Math.round((natPct/total)*100) };
}

function extractFromHtml(html) {
  const compIdx = html.indexOf('Composition');
  if (compIdx > -1) {
    const section = html.substring(compIdx, compIdx+300).replace(/<[^>]*>/g,' ').replace(/&[a-z]+;/g,' ').replace(/\s+/g,' ');
    const comp = parseComp(section);
    if (comp) return comp;
  }
  const fm = [...html.matchAll(/(\d+)%\s*(cotton|silk|wool|linen|cashmere|polyester|nylon|spandex|elastane|viscose|rayon|modal|lyocell|mohair|alpaca|hemp|acrylic|polyamide|flax|merino|cupro|tencel|acetate)/gi)];
  if (fm.length > 0) return parseComp(fm.map(m=>m[0]).join(', '));
  return null;
}

function mapCategory(feedCat, name) {
  const c = (feedCat||'').toLowerCase(); const n = (name||'').toLowerCase();
  if (c.includes('dress') || n.includes('dress') || n.includes('gown')) return 'dresses';
  if (n.includes('jumpsuit') || n.includes('romper')) return 'dresses';
  if (c.includes('pants') || c.includes('jeans') || n.includes('pant') || n.includes('jean') || n.includes('trouser')) return 'bottoms';
  if (c.includes('shorts') || n.includes('short')) return 'bottoms';
  if (c.includes('skirt') || n.includes('skirt')) return 'bottoms';
  if (c.includes('outerwear') || n.includes('jacket') || n.includes('coat') || n.includes('blazer') || n.includes('trench') || n.includes('shacket')) return 'outerwear';
  if (n.includes('sweater') || n.includes('cardigan') || n.includes('pullover')) return 'knitwear';
  return 'tops';
}

function cleanName(name) {
  return name.replace(/^L'AGENCE\s+/i, '').replace(/\s+In\s+/i, ' - ').replace(/\s+/g, ' ').trim();
}

async function main() {
  const allProducts = JSON.parse(fs.readFileSync('/tmp/lagence-shopify-products.json', 'utf8'));
  const handleToMaterial = new Map();
  for (const p of allProducts) {
    const tags = typeof p.tags === 'string' ? p.tags.split(',') : (p.tags||[]);
    const matTag = tags.find(t => t.trim().startsWith('material:'));
    if (matTag) handleToMaterial.set(p.handle, matTag.trim().replace('material:','').trim());
  }

  const lines = fs.readFileSync(FEED_FILE, 'utf8').split('\n').slice(1).filter(l => l.trim());
  const seenUrls = new Set();
  const items = [];

  for (const line of lines) {
    const cols = line.split('|');
    if (cols.length < 34 || cols[33] !== 'female' || cols[22] !== 'in-stock') continue;
    if (!(cols[4] || '').toLowerCase().startsWith('clothing')) continue;
    const mm = cols[5].match(/murl=([^&]+)/);
    if (!mm) continue;
    const url = decodeURIComponent(mm[1]).split('?')[0];
    if (seenUrls.has(url)) continue;
    seenUrls.add(url);

    const handle = url.split('/products/')[1];
    const material = handleToMaterial.get(handle) || '';

    if (!TARGET_MATERIALS.includes(material.toLowerCase())) continue;

    items.push({
      feedId: cols[0], rawName: (cols[1]||'').trim(), feedCat: (cols[4]||'').trim(),
      murlEncoded: mm[1], imageUrl: (cols[6]||'').trim(), price: (cols[13]||'').trim(),
      url, desc: (cols[9]||'').replace(/•/g, ' '), material,
    });
  }

  let progress = {};
  if (fs.existsSync(PROG_FILE)) progress = JSON.parse(fs.readFileSync(PROG_FILE, 'utf8'));

  for (const item of items) {
    if (progress[item.url]) continue;
    const comp = parseComp(item.desc);
    if (comp) progress[item.url] = comp;
  }

  const toScrape = items.filter(i => !progress[i.url]);
  const batch = toScrape.slice(0, BATCH_SIZE);

  console.log(`Targeted items: ${items.length} | Done: ${items.filter(i => progress[i.url]).length} | This batch: ${batch.length}`);

  let found = 0, rateLimited = 0;
  for (let i = 0; i < batch.length; i++) {
    const item = batch[i];
    try {
      const r = await fetchPage(item.url);
      if (r.status === 200) {
        const comp = extractFromHtml(r.body);
        progress[item.url] = comp || { noComp: true };
        if (comp) { found++; console.log(`  ${item.rawName.substring(0,55)} -> ${comp.composition} (${comp.naturalPct}%)`); }
      } else if (r.status === 429) {
        rateLimited++;
        await new Promise(r => setTimeout(r, 30000));
        const r2 = await fetchPage(item.url);
        if (r2.status === 200) {
          const comp = extractFromHtml(r2.body);
          progress[item.url] = comp || { noComp: true };
          if (comp) found++;
        } else { progress[item.url] = { noComp: true, status: r2.status }; }
      } else {
        progress[item.url] = { noComp: true, status: r.status };
      }
    } catch(e) {
      progress[item.url] = { noComp: true, error: e.message };
    }
    if (i < batch.length-1) await new Promise(r => setTimeout(r, DELAY_MS));
  }

  fs.writeFileSync(PROG_FILE, JSON.stringify(progress));

  const targetDone = items.filter(i => progress[i.url]).length;
  const qualifying = items.filter(i => {
    const p = progress[i.url];
    return p && !p.noComp && p.naturalPct >= MIN_NATURAL_PCT;
  });

  console.log(`\nBatch done. Found: ${found} | 429s: ${rateLimited}`);
  console.log(`Target progress: ${targetDone}/${items.length}`);
  console.log(`Qualifying (>=${MIN_NATURAL_PCT}%): ${qualifying.length}`);
  console.log(`Remaining targeted: ${items.length - targetDone}`);

  if (qualifying.length > 0) {
    let inserted = 0, updated = 0, errs = 0;
    for (const item of qualifying) {
      const comp = progress[item.url];
      const name = cleanName(item.rawName);
      const category = mapCategory(item.feedCat, name);
      const price = parseFloat(item.price);
      if (!price || price <= 0) continue;

      const record = {
        brand_slug: BRAND_SLUG, brand_name: BRAND_NAME, name,
        product_id: item.feedId,
        url: 'https://click.linksynergy.com/deeplink?id='+AFFILIATE_ID+'&mid='+MID+'&murl='+item.murlEncoded,
        image_url: item.imageUrl, price: '$'+price.toFixed(2),
        composition: comp.composition, natural_fiber_percent: comp.naturalPct,
        category, is_sale: false,
      };

      const { data: existing } = await sb.from('products').select('id').eq('brand_slug', BRAND_SLUG).eq('product_id', item.feedId).limit(1);
      if (existing && existing.length > 0) {
        const { error } = await sb.from('products').update({
          name: record.name, url: record.url, image_url: record.image_url,
          price: record.price, composition: record.composition,
          natural_fiber_percent: record.natural_fiber_percent, category: record.category,
        }).eq('id', existing[0].id);
        if (error) errs++; else updated++;
      } else {
        const { data: byName } = await sb.from('products').select('id').eq('brand_slug', BRAND_SLUG).eq('name', name).limit(1);
        if (byName && byName.length > 0) {
          const { error } = await sb.from('products').update({
            product_id: record.product_id, url: record.url, image_url: record.image_url,
            price: record.price, composition: record.composition,
            natural_fiber_percent: record.natural_fiber_percent, category: record.category,
          }).eq('id', byName[0].id);
          if (error) errs++; else updated++;
        } else {
          const { error } = await sb.from('products').insert(record);
          if (error) { errs++; console.error('Insert err:', error.message, name); } else inserted++;
        }
      }
    }
    console.log(`DB: Inserted ${inserted}, Updated ${updated}, Errors ${errs}`);
  }
}

main().catch(e => console.error('Fatal:', e.message));
