const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const AFFILIATE_ID = '*8b0zWDyXo0';
const MID = '42623';
const NATURAL = ['cotton','silk','wool','linen','flax','cashmere','mohair','alpaca','hemp','ramie','merino','angora'];
const KNOWN_FIBERS = [...NATURAL,'polyester','nylon','acrylic','spandex','elastane','lycra','viscose','rayon','modal','lyocell','tencel','acetate','polyamide','cupro'];

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
  if (t.includes('dress') || n.includes('dress')) return 'dresses';
  if (t.includes('pant') || t.includes('jogger') || n.includes('pant') || n.includes('jogger') || n.includes('legging')) return 'bottoms';
  if (t.includes('short') || n.includes('short')) return 'bottoms';
  if (t.includes('skirt') || n.includes('skirt')) return 'bottoms';
  if (t.includes('jacket') || t.includes('coat') || n.includes('jacket') || n.includes('coat')) return 'outerwear';
  if (t.includes('sweater') || t.includes('cardigan') || n.includes('sweater') || n.includes('cardigan')) return 'knitwear';
  if (t.includes('jumpsuit') || t.includes('romper') || n.includes('jumpsuit') || n.includes('romper')) return 'dresses';
  if (t.includes('swim') || n.includes('swim') || n.includes('bikini')) return 'swimwear';
  if (t.includes('lounge') || t.includes('pajama') || t.includes('sleep') || n.includes('pajama') || n.includes('robe')) return 'loungewear';
  return 'tops';
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const lines = fs.readFileSync('/tmp/feed-42623.txt', 'utf8').split('\n').slice(1).filter(l => l.trim());
  console.log('Feed lines:', lines.length);

  const uniqueProducts = new Map();
  for (const line of lines) {
    const cols = line.split('|');
    if (cols.length < 10) continue;

    const name = (cols[1] || '').trim();
    const affiliateUrl = (cols[5] || '').trim();
    const imageUrl = (cols[6] || '').trim();
    const salePrice = parseFloat(cols[12] || '0');
    const retailPrice = parseFloat(cols[13] || '0');
    const discountAmount = parseFloat(cols[10] || '0');
    const feedCategory = (cols[4] || '').trim();
    const gender = (cols[33] || '').trim();

    const murlMatch = affiliateUrl.match(/murl=([^&]+)/);
    if (!murlMatch) continue;
    let baseUrl;
    try { baseUrl = decodeURIComponent(murlMatch[1]).split('?')[0]; } catch { continue; }
    if (uniqueProducts.has(baseUrl)) continue;

    if (gender && !['female', 'unisex', 'women', ''].includes(gender.toLowerCase())) continue;
    const catLower = feedCategory.toLowerCase();
    if (catLower.includes('infant') || catLower.includes('toddler') || catLower.includes('baby')) continue;
    if (catLower.includes('shoes') || catLower.includes('jewelry') || catLower.includes('candle') || catLower.includes('bedding') || catLower.includes('decor') || catLower.includes('tote') || catLower.includes('notebook') || catLower.includes('hat') || catLower.includes('belt') || catLower.includes('socks') || catLower.includes('cap') || catLower.includes('pillow') || catLower.includes('bracelet') || catLower.includes('earring') || catLower.includes('necklace') || catLower.includes('ring')) continue;
    if (!catLower.includes('clothing')) continue;

    uniqueProducts.set(baseUrl, { name, affiliateUrl, imageUrl, salePrice, retailPrice, discountAmount, feedCategory, baseUrl });
  }

  console.log('Unique women clothing products:', uniqueProducts.size);

  const products = [];
  let scraped = 0, errors = 0, noComp = 0, below = 0;
  const entries = [...uniqueProducts.entries()];

  for (let i = 0; i < entries.length; i += 5) {
    const batch = entries.slice(i, i + 5);
    await Promise.allSettled(batch.map(async ([baseUrl, item]) => {
      try {
        const r = await fetch(baseUrl + '.json', {
          headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
        });
        if (!r.ok) { errors++; return; }
        const j = await r.json();
        const p = j.product;
        const body = (p.body_html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
        scraped++;

        const comp = parseComp(body);
        if (!comp) { noComp++; return; }
        if (comp.pct < 95) { below++; return; }

        let cleanName = (p.title || item.name).replace(/^Splendid\s*[-–—]?\s*/i, '');
        const cat = mapCategory(p.product_type, cleanName);
        const slug = 'splendid-' + baseUrl.split('/').pop();

        const murlMatch = item.affiliateUrl.match(/murl=([^&]+)/);
        const affUrl = murlMatch
          ? 'https://click.linksynergy.com/deeplink?id=' + AFFILIATE_ID + '&mid=' + MID + '&murl=' + murlMatch[1]
          : item.affiliateUrl;

        const price = item.salePrice > 0 ? item.salePrice : item.retailPrice;
        const origPrice = item.retailPrice > 0 ? item.retailPrice : price;
        const isSale = item.discountAmount > 0 || (origPrice > price && price > 0);

        products.push({
          name: cleanName,
          brand_name: 'Splendid',
          brand_slug: 'splendid',
          product_id: slug,
          price: '$' + price.toFixed(2),
          original_price: isSale && origPrice > price ? '$' + origPrice.toFixed(2) : null,
          url: affUrl,
          image_url: p.images?.[0]?.src || item.imageUrl || null,
          composition: comp.composition,
          natural_fiber_percent: comp.pct,
          category: cat,
          is_sale: isSale,
        });
      } catch { errors++; }
    }));

    if ((i + 5) % 50 === 0 || i + 5 >= entries.length) {
      process.stdout.write('\r' + Math.min(i + 5, entries.length) + '/' + entries.length + ' — ' + products.length + ' qualifying');
    }
    await sleep(200);
  }

  console.log('\n\nResults: scraped=' + scraped + ' errors=' + errors + ' noComp=' + noComp + ' below95=' + below + ' qualifying=' + products.length);

  if (products.length === 0) { console.log('No products to insert'); return; }

  const byCat = {};
  products.forEach(p => { byCat[p.category] = (byCat[p.category] || 0) + 1; });
  console.log('Categories:', JSON.stringify(byCat));

  products.slice(0, 8).forEach((p, i) => {
    console.log((i + 1) + '. ' + p.name.substring(0, 50) + ' | ' + p.category + ' | ' + p.price + ' | ' + p.composition);
    console.log('   Affiliate: ' + p.url.substring(0, 100));
  });

  await sb.from('products').delete().eq('brand_slug', 'splendid');
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
