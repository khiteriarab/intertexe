const { createClient } = require('@supabase/supabase-js');
const Client = require('ftp');
const zlib = require('zlib');
const { Transform } = require('stream');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const AFFILIATE_ID = '*8b0zWDyXo0';
const MID = '50745';

const FTP_HOST = 'aftp.linksynergy.com';
const FTP_USER = 'rkp_4668007';
const FTP_FILE = '50745_4668007_mp_template.txt.gz';

const TARGET_BRANDS = new Map([
  ['Theory', 'theory'],
  ['Vince', 'vince'],
  ['rag & bone', 'rag-and-bone'],
  ["L'Agence", 'l-agence'],
  ['Johnny Was', 'johnny-was'],
  ['Ramy Brook', 'ramy-brook'],
  ['Nation LTD', 'nation-ltd'],
  ["JOE'S Jeans", 'joes-jeans'],
  ['Free People', 'free-people'],
  ['BOSS', 'boss'],
  ['Trina Turk', 'trina-turk'],
  ['ALEXIA ADMOR', 'alexia-admor'],
  ['belle & bloom', 'belle-and-bloom'],
  ['PHILIPP PLEIN', 'philipp-plein'],
  ['Rails', 'rails'],
  ['Sanctuary', 'sanctuary'],
  ['A.L.C.', 'a-l-c'],
  ['ASTR', 'astr'],
  ['Lafayette 148 New York', 'lafayette-148'],
  ['Bella Dahl', 'bella-dahl'],
  ['CeCe', 'cece'],
  ['Lilla P', 'lilla-p'],
  ['Amanda Uprichard', 'amanda-uprichard'],
  ['Cleobella', 'cleobella'],
  ['Marie Oliver', 'marie-oliver'],
  ['PJ Salvage', 'pj-salvage'],
  ['Paige', 'paige'],
  ['Nicole Miller', 'nicole-miller'],
  ['Splendid', 'splendid'],
  ['SOMETHING NAVY', 'something-navy'],
  ['Hutch', 'hutch'],
  ['FRAME', 'frame'],
  ['Anne Klein', 'anne-klein'],
  ['heartloom', 'heartloom'],
  ['HALE BOB', 'hale-bob'],
  ['PISTOLA', 'pistola'],
  ['Nic + Zoe', 'nic-and-zoe'],
  ['NYDJ', 'nydj'],
  ['J.McLaughlin', 'j-mclaughlin'],
  ['ELAN', 'elan'],
]);

const BRAND_DESCRIPTIONS = {
  'theory': 'New York luxury brand known for refined wardrobe staples in premium natural fabrics. Specializes in precisely tailored wool, cashmere, and cotton pieces.',
  'vince': 'California-based luxury essentials brand celebrated for sumptuous cashmere, cotton, and wool knits. Clean lines and understated elegance.',
  'rag-and-bone': 'New York fashion house combining British heritage with downtown sensibility. Premium denim, wool, and cotton pieces with impeccable construction.',
  'l-agence': 'Los Angeles luxury brand crafting refined French-inspired ready-to-wear. Known for silk blouses, cotton denim, and sophisticated tailoring.',
  'johnny-was': 'Bohemian luxury brand with richly embroidered silk and cotton pieces. Artisan-inspired prints and globally-influenced designs.',
  'ramy-brook': 'New York contemporary brand specializing in silk and cotton pieces with effortless femininity. Vibrant prints and flattering silhouettes.',
  'nation-ltd': 'Los Angeles basics brand focused on ultra-soft cotton and modal essentials. Relaxed luxury in superior natural fabrics.',
  'joes-jeans': 'Premium denim brand crafting jeans and sportswear in superior cotton fabrics. Known for exceptional fit and finish.',
  'free-people': 'Bohemian lifestyle brand offering free-spirited designs in cotton, linen, and natural blends. Layered, textural, and effortlessly cool.',
  'boss': 'German luxury fashion house known for impeccable tailoring in fine wool, cotton, and cashmere.',
  'trina-turk': 'California designer known for bold prints and vibrant colors in silk and cotton. Resort-ready luxury with optimistic energy.',
  'alexia-admor': 'Contemporary fashion brand creating refined dresses and separates in quality fabrics.',
  'belle-and-bloom': 'Australian fashion brand specializing in wool coats and natural-fiber outerwear.',
  'philipp-plein': 'Swiss luxury fashion house known for bold, statement-making designs in premium materials.',
  'rails': 'Los Angeles brand known for effortlessly cool plaid shirts, linen, and cotton staples.',
  'sanctuary': 'Fashion-forward brand creating versatile, modern wardrobe essentials in natural fabrics.',
  'a-l-c': 'New York designer brand by Andrea Lieberman, known for clean modern silhouettes in silk and cotton.',
  'astr': 'Contemporary brand with trend-forward dresses and tops in natural fabrics.',
  'lafayette-148': 'New York luxury brand specializing in refined craftsmanship with premium wool, silk, and cotton.',
  'bella-dahl': 'Los Angeles brand known for ultra-soft cotton and linen pieces with a lived-in feel.',
  'cece': 'Feminine fashion brand creating polished dresses and tops with delicate details.',
  'lilla-p': 'Premium basics brand crafting understated luxe in Pima cotton and natural fibers.',
  'amanda-uprichard': 'New York designer specializing in silk dresses and modern evening wear.',
  'cleobella': 'Bali-inspired luxury brand with artisan-crafted cotton and linen pieces.',
  'marie-oliver': 'Resort-ready brand creating bold prints in silk and cotton with a modern edge.',
  'pj-salvage': 'Luxury loungewear brand specializing in ultra-soft cotton and modal sleepwear.',
  'paige': 'Premium denim brand with expertly crafted jeans and sportswear in superior cotton.',
  'nicole-miller': 'New York fashion icon known for bold prints and sophisticated designs in silk and cotton.',
  'splendid': 'Los Angeles brand crafting everyday luxury in superior cotton and modal fabrics.',
  'something-navy': 'Modern fashion brand by Arielle Charnas, offering polished everyday pieces in natural fabrics.',
  'hutch': 'Contemporary brand creating statement dresses and bold prints in quality fabrics.',
  'frame': 'Los Angeles-Paris luxury brand known for premium denim and modern wardrobe staples.',
  'anne-klein': 'Heritage fashion house offering polished professional wear in fine fabrics.',
  'heartloom': 'Modern romantic brand with feminine silhouettes in cotton, linen, and silk.',
  'hale-bob': 'Global luxury brand known for vibrant prints and resort wear in silk and jersey.',
  'pistola': 'Los Angeles denim brand crafting modern, sustainable jeans in premium cotton.',
  'nic-and-zoe': 'Modern knitwear brand creating effortless, textured pieces in natural fibers.',
  'nydj': 'Premium denim brand with innovative fit technology in superior cotton fabrics.',
  'j-mclaughlin': 'American heritage brand with timeless prints in fine cotton, wool, and cashmere.',
  'elan': 'Resort and beach lifestyle brand with flowing silhouettes in cotton and linen.',
};

const NATURAL_FIBERS = ['cotton', 'silk', 'wool', 'linen', 'flax', 'cashmere', 'mohair', 'alpaca', 'hemp', 'ramie', 'jute', 'merino', 'angora', 'camel', 'yak', 'pima', 'supima', 'virgin wool'];

function isWomensClothing(item) {
  const gender = (item.gender || '').toLowerCase();
  if (gender && gender !== 'female' && gender !== 'unisex' && gender !== 'women') return false;
  const cat = item.category || '';
  return cat.startsWith('Clothing');
}

function mapCategory(cat) {
  const c = (cat || '').toLowerCase();
  if (c.includes('dress')) return 'dresses';
  if (c.includes('shirts') || c.includes('tops') || c.includes('blouse') || c.includes('sweater')) return 'tops';
  if (c.includes('pants') || c.includes('jeans')) return 'bottoms';
  if (c.includes('shorts')) return 'bottoms';
  if (c.includes('skirt')) return 'bottoms';
  if (c.includes('outerwear') || c.includes('coat') || c.includes('jacket') || c.includes('vest')) return 'outerwear';
  if (c.includes('jumpsuit') || c.includes('romper') || c.includes('one-piece')) return 'dresses';
  if (c.includes('swimwear') || c.includes('swim')) return 'swimwear';
  if (c.includes('suit')) return 'outerwear';
  if (c.includes('knit')) return 'knitwear';
  if (c.includes('lingerie') || c.includes('intimate') || c.includes('bra') || c.includes('underwear')) return 'lingerie';
  if (c.includes('sleepwear') || c.includes('lounge') || c.includes('pajama')) return 'loungewear';
  return 'tops';
}

function extractComposition(desc) {
  if (!desc) return { composition: null, pct: null };

  let text = desc.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');

  const LABELS = 'Body|Shell|Outer|Combo\\s*\\d*|Contrast|Trim|Panel|Lining|Gusset|Elastic|Rib|Filling|Pocket|Sleeves|Collar|Hood|Insert|Waistband|Lace|Cup|Strap|Band|Wire|Frame|Self|Fabric|Main';
  text = text.replace(new RegExp('(' + LABELS + ')\\s*:', 'gi'), '\n$1:');

  const sections = [];
  const sectionLines = text.split('\n').filter(l => l.trim());

  for (const line of sectionLines) {
    const labelMatch = line.match(new RegExp('^(' + LABELS + ')\\s*:\\s*', 'i'));
    if (labelMatch) {
      let label = labelMatch[1].toLowerCase().replace(/\s*\d+$/, '');
      if (['shell', 'outer', 'self', 'fabric', 'main'].includes(label)) label = 'body';
      const fiberStr = line.replace(labelMatch[0], '');
      const fibers = parseFiberGroup(fiberStr);
      if (fibers.length > 0) sections.push({ label, fibers });
    }
  }

  if (sections.length === 0) {
    const fibers = parseFiberGroup(text);
    if (fibers.length > 0) sections.push({ label: 'body', fibers });
  }

  if (sections.length === 0) return { composition: null, pct: null };

  const hasBody = sections.some(s => s.label === 'body');
  if (!hasBody) return { composition: null, pct: null };

  const PART_WEIGHTS = {
    'body': 0.70, 'combo': 0.15, 'contrast': 0.10, 'trim': 0.05,
    'panel': 0.10, 'lining': 0.15, 'gusset': 0.05,
    'elastic': 0.03, 'rib': 0.05, 'filling': 0.10,
    'pocket': 0.03, 'sleeves': 0.15, 'collar': 0.03,
    'hood': 0.05, 'insert': 0.05, 'waistband': 0.05,
    'lace': 0.20, 'cup': 0.15, 'strap': 0.05,
    'band': 0.05, 'wire': 0.02, 'frame': 0.05,
  };

  const compParts = sections.map(s => {
    const label = s.label === 'body' && sections.length === 1 ? '' : s.label.charAt(0).toUpperCase() + s.label.slice(1) + ': ';
    return label + s.fibers.map(f => f.pct + '% ' + f.name).join(', ');
  });
  const composition = compParts.join(' | ');

  let totalWeight = 0, naturalWeighted = 0;
  for (const s of sections) {
    const weight = s.label === 'body' && sections.length === 1 ? 1.0 : (PART_WEIGHTS[s.label] || 0.05);
    totalWeight += weight;
    const partNatural = s.fibers
      .filter(f => NATURAL_FIBERS.some(nf => f.name.toLowerCase().includes(nf)))
      .reduce((sum, f) => sum + f.pct, 0);
    naturalWeighted += (partNatural / 100) * weight;
  }
  let pct = totalWeight > 0 ? Math.round((naturalWeighted / totalWeight) * 100) : null;
  if (pct !== null && pct > 100) pct = 100;

  return { composition, pct };
}

function parseFiberGroup(str) {
  const cleaned = str
    .replace(/[,&]/g, ' ')
    .replace(/hand wash.*/i, '')
    .replace(/machine wash.*/i, '')
    .replace(/dry clean.*/i, '')
    .replace(/do not.*/i, '')
    .replace(/turn garment.*/i, '')
    .replace(/this is a delicate.*/i, '')
    .replace(/imported.*/i, '')
    .replace(/made in.*/i, '')
    .trim();

  const matches = [...cleaned.matchAll(/(\d+)\s*%\s*([A-Za-z][A-Za-z\s-]*?)(?=\s+\d+\s*%|$)/g)];
  const fibers = [];
  let runningTotal = 0;
  for (const m of matches) {
    const pct = parseInt(m[1]);
    let name = m[2].trim();
    if (pct <= 0 || name.length >= 30) continue;
    if (name.toLowerCase() === 'spandex') name = 'Elastane';
    if (name.toLowerCase() === 'rayon') name = 'Viscose';
    name = name.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    if (runningTotal >= 100) break;
    fibers.push({ pct, name });
    runningTotal += pct;
  }
  return fibers;
}

function buildAffiliateUrl(feedUrl) {
  const filled = feedUrl
    .replace('<LSN EID>', AFFILIATE_ID)
    .replace('<LSN OID>', MID);
  const murlMatch = filled.match(/murl=([^&]+)/);
  if (murlMatch) {
    return 'https://click.linksynergy.com/deeplink?id=' + AFFILIATE_ID + '&mid=' + MID + '&murl=' + murlMatch[1];
  }
  return filled;
}

function getProductSlug(item, brandSlug) {
  const murlMatch = item.affiliateUrl.match(/murl=([^&]+)/);
  if (murlMatch) {
    const url = decodeURIComponent(murlMatch[1]);
    const handleMatch = url.match(/\/products\/([^?&#]+)/);
    if (handleMatch) return handleMatch[1];
  }
  return brandSlug + '-' + (item.sku || item.id);
}

async function run() {
  const isDryRun = process.argv.includes('--dry-run');
  const singleBrand = process.argv.find(a => a.startsWith('--brand='));
  const targetBrandFilter = singleBrand ? singleBrand.split('=')[1] : null;

  console.log('INTERTEXE — Marketplace MID 50745 Feed Ingestion');
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
  if (targetBrandFilter) console.log(`Filtering to brand: ${targetBrandFilter}`);
  console.log(`Target brands: ${TARGET_BRANDS.size}`);
  console.log(`Started: ${new Date().toISOString()}\n`);

  console.log('Connecting to Rakuten FTP and streaming feed...');

  const brandItems = new Map();
  for (const [name, slug] of TARGET_BRANDS) {
    if (targetBrandFilter && slug !== targetBrandFilter) continue;
    brandItems.set(name, []);
  }

  let totalLines = 0;
  let matchedLines = 0;

  await new Promise((resolve, reject) => {
    const c = new Client();
    c.on('ready', () => {
      console.log('Connected. Downloading feed...');
      c.get(FTP_FILE, (err, stream) => {
        if (err) { c.end(); reject(err); return; }

        const gunzip = zlib.createGunzip();
        let partial = '';

        const liner = new Transform({
          transform(chunk, enc, cb) {
            partial += chunk.toString();
            const lines = partial.split('\n');
            partial = lines.pop();
            for (const line of lines) {
              if (!line.trim() || line.startsWith('HDR')) continue;
              totalLines++;
              const f = line.split('|');
              if (f.length < 34) continue;
              const brand = f[16] || '';
              if (!brandItems.has(brand)) continue;
              matchedLines++;

              const salePrice = parseFloat(f[12]) || 0;
              const retailPrice = parseFloat(f[13]) || 0;
              const discountAmt = parseFloat(f[10]) || 0;

              brandItems.get(brand).push({
                id: f[0],
                name: f[1],
                sku: f[2],
                googleCategory: f[3],
                category: f[4],
                affiliateUrl: f[5],
                imageUrl: f[6],
                shortDesc: f[8],
                longDesc: f[9],
                discountAmount: discountAmt,
                salePrice: salePrice,
                retailPrice: retailPrice,
                brand: brand,
                currency: f[25] || 'USD',
                merchantCategory: f[29],
                size: f[30],
                color: f[32],
                gender: f[33],
              });
            }
            if (totalLines % 100000 === 0) {
              process.stdout.write(`  ${totalLines} lines scanned, ${matchedLines} matched...\r`);
            }
            cb();
          },
          flush(cb) {
            console.log(`\nFeed scan complete: ${totalLines} lines, ${matchedLines} matching target brands`);
            cb();
            c.end();
            resolve();
          }
        });

        stream.pipe(gunzip).pipe(liner);
        gunzip.on('error', (e) => { console.error('Decompress error:', e.message); c.end(); reject(e); });
      });
    });
    c.on('error', reject);
    c.connect({ host: FTP_HOST, user: FTP_USER, password: process.env.RAKUTEN_FTP_PASSWORD, connTimeout: 30000, pasvTimeout: 30000 });
  });

  let totalInserted = 0;
  let totalQualifying = 0;
  let totalSaleItems = 0;
  const brandSummary = [];

  for (const [brandName, slug] of TARGET_BRANDS) {
    if (targetBrandFilter && slug !== targetBrandFilter) continue;
    const items = brandItems.get(brandName);
    if (!items || items.length === 0) {
      console.log(`\n--- ${brandName} (${slug}) --- SKIPPED (no items)`);
      continue;
    }

    console.log(`\n--- ${brandName} (${slug}) ---`);
    console.log(`  Raw items: ${items.length}`);

    const womens = items.filter(isWomensClothing);
    console.log(`  Women's clothing: ${womens.length}`);

    const uniqueProducts = new Map();
    for (const item of womens) {
      const prodSlug = getProductSlug(item, slug);
      if (!uniqueProducts.has(prodSlug)) {
        uniqueProducts.set(prodSlug, item);
      }
    }
    console.log(`  Unique products: ${uniqueProducts.size}`);

    const { data: existing } = await supabase
      .from('products')
      .select('product_id')
      .eq('brand_slug', slug);
    const existingIds = new Set((existing || []).map(p => p.product_id));

    const qualifying = [];
    let noComp = 0, belowThreshold = 0, alreadyExists = 0;

    for (const [prodSlug, item] of uniqueProducts) {
      if (existingIds.has(prodSlug)) { alreadyExists++; continue; }

      const desc = item.longDesc || item.shortDesc;
      const { composition, pct } = extractComposition(desc);
      if (!composition || pct === null) { noComp++; continue; }
      if (pct < 95) { belowThreshold++; continue; }

      const category = mapCategory(item.category);
      const affiliateUrl = buildAffiliateUrl(item.affiliateUrl);

      const currentPrice = item.salePrice > 0 ? item.salePrice : item.retailPrice;
      const originalPrice = item.retailPrice > 0 ? item.retailPrice : currentPrice;
      const isSale = item.discountAmount > 0 || (originalPrice > currentPrice && currentPrice > 0);

      const priceStr = `$${currentPrice.toFixed(2)}`;
      const originalPriceStr = isSale && originalPrice > currentPrice ? `$${originalPrice.toFixed(2)}` : null;

      let cleanName = item.name;
      cleanName = cleanName.replace(new RegExp('^' + brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s+', 'i'), '');

      const product = {
        name: cleanName,
        brand_name: brandName,
        brand_slug: slug,
        product_id: prodSlug,
        price: priceStr,
        url: affiliateUrl,
        image_url: item.imageUrl,
        composition,
        natural_fiber_percent: pct,
        category,
        is_sale: isSale,
      };

      if (originalPriceStr) {
        product.original_price = originalPriceStr;
      }

      qualifying.push(product);
      if (isSale) totalSaleItems++;
    }

    console.log(`  No composition: ${noComp}`);
    console.log(`  Below 95%: ${belowThreshold}`);
    console.log(`  Already in DB: ${alreadyExists}`);
    console.log(`  Qualifying: ${qualifying.length} (${qualifying.filter(q => q.is_sale).length} on sale)`);
    totalQualifying += qualifying.length;

    if (qualifying.length > 0) {
      const byCat = {};
      qualifying.forEach(q => { byCat[q.category] = (byCat[q.category] || 0) + 1; });
      console.log(`  Categories: ${Object.entries(byCat).map(([c, n]) => `${c}(${n})`).join(', ')}`);

      if (qualifying.length <= 10) {
        qualifying.forEach((q, i) => console.log(`    ${i + 1}. ${q.name} | ${q.category} | ${q.price}${q.original_price ? ' (was ' + q.original_price + ')' : ''} | ${q.composition} | ${q.natural_fiber_percent}%`));
      } else {
        qualifying.slice(0, 5).forEach((q, i) => console.log(`    ${i + 1}. ${q.name} | ${q.category} | ${q.price}${q.original_price ? ' (was ' + q.original_price + ')' : ''} | ${q.natural_fiber_percent}%`));
        console.log(`    ... and ${qualifying.length - 5} more`);
      }

      brandSummary.push({ brand: brandName, slug, count: qualifying.length, sale: qualifying.filter(q => q.is_sale).length });
    }

    if (!isDryRun && qualifying.length > 0) {
      const BATCH_SIZE = 50;
      let inserted = 0;
      for (let i = 0; i < qualifying.length; i += BATCH_SIZE) {
        const batch = qualifying.slice(i, i + BATCH_SIZE);
        const { data, error } = await supabase
          .from('products')
          .upsert(batch, { onConflict: 'product_id' })
          .select('id');
        if (error) {
          console.error(`  Insert error at batch ${i}: ${error.message}`);
        } else {
          inserted += data.length;
        }
      }
      totalInserted += inserted;
      console.log(`  Inserted: ${inserted}`);

      const { data: designerExists } = await supabase
        .from('designers')
        .select('id')
        .eq('slug', slug)
        .limit(1);

      if (!designerExists || designerExists.length === 0) {
        const { error: dErr } = await supabase
          .from('designers')
          .insert({
            name: brandName,
            slug: slug,
            description: BRAND_DESCRIPTIONS[slug] || `${brandName} — verified natural-fiber fashion brand.`,
            website: `https://www.${slug.replace(/-/g, '')}.com`,
          });
        if (dErr) console.error(`  Designer insert error: ${dErr.message}`);
        else console.log(`  Designer entry created`);
      }
    }
  }

  console.log(`\n========== SUMMARY ==========`);
  console.log(`Total qualifying products: ${totalQualifying}`);
  console.log(`Total on sale: ${totalSaleItems}`);
  if (!isDryRun) console.log(`Total inserted: ${totalInserted}`);
  if (brandSummary.length > 0) {
    console.log(`\nBrand breakdown:`);
    brandSummary.sort((a, b) => b.count - a.count).forEach(b => {
      console.log(`  ${b.brand}: ${b.count} products (${b.sale} on sale)`);
    });
  }
  console.log(`\nCompleted: ${new Date().toISOString()}`);
}

run().catch(e => console.error('Fatal:', e.message));
