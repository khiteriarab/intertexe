const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function scrapePrice(url) {
  try {
    const res = await fetch(url, { 
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(8000)
    });
    if (res.status !== 200) return null;
    const html = await res.text();
    
    const jsonLd = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
    if (jsonLd) {
      try {
        const data = JSON.parse(jsonLd[1]);
        if (data.offers?.price) return '$' + parseFloat(data.offers.price).toFixed(2);
      } catch(e) {}
    }
    
    const priceMatch = html.match(/"price":\s*"?([\d.]+)/);
    if (priceMatch) return '$' + parseFloat(priceMatch[1]).toFixed(2);
    
    return null;
  } catch (e) { return null; }
}

async function run() {
  const { data: products } = await supabase.from('products').select('id, name, price, url').eq('brand_slug', 'diesel');
  console.log('Total products:', products.length);
  
  let updated = 0, failed = 0, unchanged = 0;
  const BATCH = 15;
  
  for (let i = 0; i < products.length; i += BATCH) {
    const batch = products.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(async (p) => {
      const murlMatch = p.url.match(/murl=([^&]+)/);
      const actualUrl = murlMatch ? decodeURIComponent(murlMatch[1]) : null;
      if (!actualUrl) return { id: p.id, newPrice: null };
      const newPrice = await scrapePrice(actualUrl);
      return { id: p.id, oldPrice: p.price, newPrice, name: p.name };
    }));
    
    for (const r of results) {
      if (r.newPrice && r.newPrice !== r.oldPrice) {
        await supabase.from('products').update({ price: r.newPrice }).eq('id', r.id);
        updated++;
      } else if (r.newPrice) {
        unchanged++;
      } else {
        failed++;
      }
    }
    
    if ((i + BATCH) % 60 === 0 || i + BATCH >= products.length) {
      console.log(`Progress: ${Math.min(i + BATCH, products.length)}/${products.length} | updated: ${updated} | same: ${unchanged} | failed: ${failed}`);
    }
    await new Promise(r => setTimeout(r, 400));
  }
  
  console.log('\nDone! Updated:', updated, 'Unchanged:', unchanged, 'Failed:', failed);
  
  // Show some examples of price changes
  const { data: samples } = await supabase.from('products').select('name, price').eq('brand_slug', 'diesel').limit(10);
  console.log('\nSample prices:');
  samples.forEach(p => console.log(' ', p.price, '|', p.name.substring(0, 60)));
}

run().catch(e => console.error('Fatal:', e.message));
