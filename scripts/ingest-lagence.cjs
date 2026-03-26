const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const AFFILIATE_ID = '*8b0zWDyXo0';
const MID = '42841';
const BRAND_NAME = "L'AGENCE";
const BRAND_SLUG = 'l-agence';
const MIN_NATURAL_PCT = 90;

const NATURAL = ['cotton','silk','wool','linen','flax','cashmere','mohair','alpaca','hemp','ramie','merino','angora','virgin wool','pima','supima','organic cotton'];
const SYNTHETIC = ['polyester','nylon','acrylic','spandex','elastane','lycra','viscose','rayon','modal','lyocell','tencel','acetate','polyamide','cupro','polypropylene','rubber','polyurethane'];
const KNOWN_FIBERS = [...NATURAL, ...SYNTHETIC];

const FABRIC_WORDS = /\b(charmeuse|crepe|chiffon|satin|twill|jersey|georgette|organza|voile|blend|fabric|material|shell|lining|body|suiting|shirting|poplin|flannel|gabardine|stretch|woven|knit|mesh|felt|velour|piqué|denim|chambray|sateen|fleece|french terry|rib|interlock|dobby|jacquard|boucle|pointelle|gauze|broadcloth|oxford|lawn|batiste|faille|taffeta|tulle|net|camisole|upper|binding)\b/gi;

function cleanFiberName(name) {
  return name.replace(FABRIC_WORDS, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function isKnownFiber(n) { return KNOWN_FIBERS.includes(n); }

function parseComp(text) {
  if (!text) return null;
  const clean = text.replace(/•/g, ' ').replace(/\n/g, ' ');
  const matches = [...clean.matchAll(/(\d+)%\s*([A-Za-z\s]+?)(?=\s*\d+%|\s*$|[•\.\,\;\;\-\)])/gi)];
  if (matches.length === 0) return null;
  const fibers = [];
  let total = 0;
  for (const m of matches) {
    const pct = parseInt(m[1]);
    let name = cleanFiberName(m[2]);
    if (name === 'organic cotton') name = 'cotton';
    if (name === 'kid') continue;
    if (!name || !isKnownFiber(name)) continue;
    fibers.push({ name, pct });
    total += pct;
  }
  if (fibers.length === 0 || total < 90) return null;
  const natPct = fibers.filter(f => NATURAL.includes(f.name)).reduce((s, f) => s + f.pct, 0);
  const compStr = fibers.map(f => `${f.pct}% ${f.name}`).join(', ');
  return { composition: compStr, naturalPct: Math.round((natPct / total) * 100) };
}

function mapCategory(feedCat, name) {
  const c = (feedCat || '').toLowerCase();
  const n = (name || '').toLowerCase();
  if (c.includes('dress') || n.includes('dress')) return 'dresses';
  if (c.includes('pants') || c.includes('jeans') || n.includes('pant') || n.includes('jean') || n.includes('trouser')) return 'bottoms';
  if (c.includes('shorts') || n.includes('short')) return 'bottoms';
  if (c.includes('skirt') || n.includes('skirt')) return 'bottoms';
  if (c.includes('outerwear') || n.includes('jacket') || n.includes('coat') || n.includes('blazer') || n.includes('trench')) return 'outerwear';
  if (n.includes('jumpsuit') || n.includes('romper')) return 'dresses';
  if (n.includes('sweater') || n.includes('cardigan') || n.includes('pullover') || n.includes('knit')) return 'knitwear';
  if (c.includes('shirts') || c.includes('tops') || n.includes('top') || n.includes('blouse') || n.includes('cami') || n.includes('shirt') || n.includes('tee') || n.includes('tank')) return 'tops';
  return 'tops';
}

function cleanName(name) {
  return name
    .replace(/^L'AGENCE\s+/i, '')
    .replace(/\s+In\s+/i, ' - ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getProductUrl(affiliateUrl) {
  const murlMatch = affiliateUrl.match(/murl=([^&]+)/);
  if (!murlMatch) return null;
  const decoded = decodeURIComponent(murlMatch[1]);
  return decoded;
}

function buildAffiliateUrl(affiliateUrl) {
  const murlMatch = affiliateUrl.match(/murl=([^&]+)/);
  if (!murlMatch) return affiliateUrl;
  return 'https://click.linksynergy.com/deeplink?id=' + AFFILIATE_ID + '&mid=' + MID + '&murl=' + murlMatch[1];
}

function isWomensClothing(row) {
  if (row.gender !== 'female') return false;
  const cat = row.feedCat.toLowerCase();
  if (cat.includes('accessories') || cat.includes('shoes') || cat.includes('bags') || cat.includes('jewelry') || cat.includes('belt') || cat.includes('scarf') || cat.includes('hat') || cat.includes('glove') || cat.includes('socks')) return false;
  return cat.startsWith('clothing');
}

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchPage(res.headers.location).then(resolve).catch(reject);
      }
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve(body));
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function scrapeComposition(url) {
  try {
    const jsonUrl = url.split('?')[0] + '.json';
    const body = await fetchPage(jsonUrl);
    const data = JSON.parse(body);
    const product = data.product;
    if (!product) return null;
    const bodyHtml = product.body_html || '';
    const comp = parseComp(bodyHtml);
    if (comp) return comp;
    const tags = product.tags || [];
    for (const tag of tags) {
      const comp2 = parseComp(tag);
      if (comp2) return comp2;
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function main() {
  const feedFile = '/tmp/feed-42841.txt';
  if (!fs.existsSync(feedFile)) {
    console.error('Feed file not found:', feedFile);
    return;
  }

  const lines = fs.readFileSync(feedFile, 'utf8').split('\n');
  const dataLines = lines.slice(1).filter(l => l.trim());
  console.log(`Feed: ${dataLines.length} lines`);

  const items = [];
  const seenUrls = new Set();

  for (const line of dataLines) {
    const cols = line.split('|');
    if (cols.length < 34) continue;

    const row = {
      feedId: cols[0],
      rawName: (cols[1] || '').trim(),
      feedCat: (cols[4] || '').trim(),
      affiliateUrl: (cols[5] || '').trim(),
      imageUrl: (cols[6] || '').trim(),
      description: (cols[9] || '').trim(),
      price: (cols[13] || '').trim(),
      stockStatus: (cols[22] || '').trim(),
      material: (cols[31] || '').trim(),
      color: (cols[32] || '').trim(),
      gender: (cols[33] || '').trim(),
    };

    if (!isWomensClothing(row)) continue;
    if (row.stockStatus !== 'in-stock') continue;
    if (!row.imageUrl) continue;

    const productUrl = getProductUrl(row.affiliateUrl);
    if (!productUrl) continue;
    const baseUrl = productUrl.split('?')[0];
    if (seenUrls.has(baseUrl)) continue;
    seenUrls.add(baseUrl);

    const descComp = parseComp(row.description);
    if (descComp && descComp.naturalPct >= MIN_NATURAL_PCT) {
      items.push({ ...row, productUrl, composition: descComp.composition, naturalPct: descComp.naturalPct });
    }
  }

  console.log(`Unique women's clothing items with qualifying composition: ${items.length}`);

  const qualifying = items.filter(i => i.naturalPct && i.naturalPct >= MIN_NATURAL_PCT);
  console.log(`Qualifying (>=${MIN_NATURAL_PCT}% natural): ${qualifying.length}`);

  let inserted = 0, updated = 0, errors = 0;
  for (const item of qualifying) {
    const name = cleanName(item.rawName);
    const category = mapCategory(item.feedCat, name);
    const affiliateUrl = buildAffiliateUrl(item.affiliateUrl);
    const price = parseFloat(item.price);
    if (!price || price <= 0) continue;

    const record = {
      brand_slug: BRAND_SLUG,
      brand_name: BRAND_NAME,
      name,
      product_id: item.feedId,
      url: affiliateUrl,
      image_url: item.imageUrl,
      price: '$' + price.toFixed(2),
      composition: item.composition,
      natural_fiber_percent: item.naturalPct,
      category,
      is_sale: false,
    };

    const { data: existing } = await sb.from('products').select('id').eq('brand_slug', BRAND_SLUG).eq('product_id', item.feedId).limit(1);
    if (existing && existing.length > 0) {
      const { error } = await sb.from('products').update({
        name: record.name,
        url: record.url,
        image_url: record.image_url,
        price: record.price,
        composition: record.composition,
        natural_fiber_percent: record.natural_fiber_percent,
      }).eq('id', existing[0].id);
      if (error) { errors++; } else { updated++; }
    } else {
      const { error } = await sb.from('products').insert(record);
      if (error) { errors++; console.error('Insert error:', error.message, '—', name); } else { inserted++; }
    }
  }

  console.log(`\nDone! Inserted: ${inserted}, Updated: ${updated}, Errors: ${errors}`);

  const { data: designerExists } = await sb.from('designers').select('id').eq('slug', BRAND_SLUG).limit(1);
  if (!designerExists || designerExists.length === 0) {
    const { error } = await sb.from('designers').insert({
      name: BRAND_NAME,
      slug: BRAND_SLUG,
      description: "L'AGENCE is a Los Angeles-based luxury fashion house known for impeccable tailoring, French-inspired sophistication, and effortlessly chic wardrobe staples. Founded by Jeff and Margaret Rudes, the brand specializes in blazers, denim, silk blouses, and refined ready-to-wear — all crafted with exceptional fabrics and a focus on fit.",
      website: 'https://www.lagence.com',
      natural_fiber_percent: 85,
    });
    if (error) console.error('Designer insert error:', error.message);
    else console.log('Created designer record for L\'AGENCE');
  } else {
    const { error } = await sb.from('designers').update({
      description: "L'AGENCE is a Los Angeles-based luxury fashion house known for impeccable tailoring, French-inspired sophistication, and effortlessly chic wardrobe staples. Founded by Jeff and Margaret Rudes, the brand specializes in blazers, denim, silk blouses, and refined ready-to-wear — all crafted with exceptional fabrics and a focus on fit.",
      website: 'https://www.lagence.com',
      natural_fiber_percent: 85,
    }).eq('id', designerExists[0].id);
    if (error) console.error('Designer update error:', error.message);
    else console.log('Updated designer record for L\'AGENCE');
  }
}

main().catch(e => console.error('Fatal:', e.message));
