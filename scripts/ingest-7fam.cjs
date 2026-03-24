const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const AFFILIATE_ID = '*8b0zWDyXo0';
const MID = '36145';
const NATURAL = ['cotton','silk','wool','linen','flax','cashmere','mohair','alpaca','hemp','ramie','merino','angora'];
const KNOWN_FIBERS = [...NATURAL,'polyester','nylon','acrylic','spandex','elastane','lycra','viscose','rayon','modal','lyocell','tencel','acetate','polyamide','cupro','elastomultieste','leather','suede'];

function isKnownFiber(n) { return KNOWN_FIBERS.includes(n.toLowerCase().trim()); }

function parseComp(text) {
  if (!text) return null;
  const matches = [...text.matchAll(/(\d+)%\s*([A-Za-z]+)/g)];
  if (matches.length === 0) return null;
  const fibers = [];
  let total = 0;
  for (const m of matches) {
    const pct = parseInt(m[1]);
    let name = m[2].trim();
    if (pct <= 0 || !isKnownFiber(name)) continue;
    if (name.toLowerCase() === 'spandex') name = 'Elastane';
    if (name.toLowerCase() === 'rayon') name = 'Viscose';
    if (name.toLowerCase() === 'elastomultieste') name = 'Elastane';
    name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    if (total >= 100) break;
    fibers.push({ pct, name });
    total += pct;
  }
  if (fibers.length === 0) return null;
  const comp = fibers.map(f => f.pct + '% ' + f.name).join(', ');
  const natPct = fibers.filter(f => NATURAL.some(n => f.name.toLowerCase().includes(n))).reduce((s,f) => s + f.pct, 0);
  return { composition: comp, pct: Math.min(natPct, 100) };
}

function mapCategory(type, name) {
  const t = (type||'').toLowerCase(); const n = (name||'').toLowerCase();
  if (t === 'jeans' || t === 'denim') return 'denim';
  if (t.includes('dress') || n.includes('dress')) return 'dresses';
  if (t.includes('short') || n.includes('short')) return 'bottoms';
  if (t.includes('jacket') || t.includes('blazer') || n.includes('jacket') || n.includes('trucker')) return 'outerwear';
  if (t.includes('sweater') || n.includes('sweater')) return 'knitwear';
  if (t.includes('shirt') || t.includes('top') || t.includes('tee') || n.includes('shirt') || n.includes('top') || n.includes('tee')) return 'tops';
  if (n.includes('pant') || n.includes('trouser') || n.includes('jogger') || n.includes('chino')) return 'bottoms';
  return 'denim';
}

async function scrapeProduct(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!r.ok) return null;
    const html = await r.text();

    const compMatch = html.match(/fabric-composition='([^']+)'/);
    const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
    const typeMatch = html.match(/"product_type"[:\s]*"([^"]+)"/);
    const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
    const isMens = html.includes("age_group::Mens") && !html.includes("age_group::Womens");

    return {
      composition: compMatch ? compMatch[1] : null,
      title: titleMatch ? titleMatch[1].split('|')[0].split(' - ')[0].trim() : null,
      type: typeMatch ? typeMatch[1] : null,
      image: imageMatch ? imageMatch[1] : null,
      isMens,
    };
  } catch { return null; }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const items = JSON.parse(fs.readFileSync('/tmp/7fam-womens.json', 'utf8'));
  console.log('Total items:', items.length);

  const products = [];
  let scraped = 0, errors = 0, noComp = 0, below = 0, mens = 0;

  for (let i = 0; i < items.length; i += 5) {
    const batch = items.slice(i, i + 5);
    const results = await Promise.allSettled(batch.map(async (item) => {
      const result = await scrapeProduct(item.baseUrl);
      if (!result) { errors++; return; }
      scraped++;
      if (result.isMens) { mens++; return; }

      const comp = parseComp(result.composition);
      if (!comp) { noComp++; return; }
      if (comp.pct < 95) { below++; return; }

      const title = result.title || item.name;
      let cleanName = title.replace(/^7 For All Mankind\s*[-–—]?\s*/i, '');
      const cat = mapCategory(result.type, cleanName);
      const slug = '7-for-all-mankind-' + item.baseUrl.split('/').pop();

      const murlMatch = item.affiliateUrl.match(/murl=([^&]+)/);
      const affUrl = murlMatch
        ? 'https://click.linksynergy.com/deeplink?id=' + AFFILIATE_ID + '&mid=' + MID + '&murl=' + murlMatch[1]
        : item.affiliateUrl;

      const price = item.salePrice > 0 ? item.salePrice : item.retailPrice;
      const origPrice = item.retailPrice > 0 ? item.retailPrice : price;
      const isSale = item.discountAmount > 0 || (origPrice > price && price > 0);

      products.push({
        name: cleanName,
        brand_name: '7 For All Mankind',
        brand_slug: '7-for-all-mankind',
        product_id: slug,
        price: '$' + price.toFixed(2),
        original_price: isSale && origPrice > price ? '$' + origPrice.toFixed(2) : null,
        url: affUrl,
        image_url: result.image || item.imageUrl || null,
        composition: comp.composition,
        natural_fiber_percent: comp.pct,
        category: cat,
        is_sale: isSale,
      });
    }));

    if ((i + 5) % 50 === 0 || i + 5 >= items.length) {
      process.stdout.write('\r' + Math.min(i + 5, items.length) + '/' + items.length + ' — ' + products.length + ' qualifying');
    }
    await sleep(250);
    if (global.gc) global.gc();
  }

  console.log('\n\nResults: scraped=' + scraped + ' errors=' + errors + ' mens=' + mens + ' noComp=' + noComp + ' below95=' + below + ' qualifying=' + products.length);

  if (products.length === 0) { console.log('No products to insert'); return; }

  const byCat = {};
  products.forEach(p => { byCat[p.category] = (byCat[p.category] || 0) + 1; });
  console.log('Categories:', JSON.stringify(byCat));

  products.slice(0, 10).forEach((p, i) => {
    console.log((i + 1) + '. ' + p.name.substring(0, 50) + ' | ' + p.category + ' | ' + p.price + ' | ' + p.composition);
    console.log('   Affiliate: ' + p.url.substring(0, 100));
  });

  await sb.from('products').delete().eq('brand_slug', '7-for-all-mankind');
  let inserted = 0;
  for (let i = 0; i < products.length; i += 100) {
    const b = products.slice(i, i + 100);
    const { error } = await sb.from('products').insert(b);
    if (error) console.error('Insert error:', error.message);
    else inserted += b.length;
  }
  console.log('Inserted:', inserted);

  const { count } = await sb.from('products').select('*', { count: 'exact', head: true });
  console.log('Total products:', count);
}

main().catch(e => console.error('Fatal:', e.message));
